import { app, BrowserWindow, ipcMain } from 'electron';
import Store from 'electron-store';
import Twitch from './twitch';
import {
  TwitchCallbackServerStatus,
  TwitchConnectionStatus,
  TwitchClient,
  TwitchConnection,
  ParsedRoll,
  DDDiceTheme,
  DDDiceRoom,
  DDDiceFetchStatus,
  ChaosStatus,
  StreamerbotStatus,
  QuestState,
  QuestSuggestion,
  RendererQuest,
} from './types';
import { AccessToken } from '@twurple/auth';
import DDDice from './dddice';
import Greetings from './greetings';
import Chaos from './chaos';
import Tally from './tally';
import Streamerbot from './streamerbot';
import Quests from './quests';

function parseRoll(roll: string): ParsedRoll {
  const rollLower = roll.toLowerCase();
  if (!rollLower.match(/^[0-9]?[0-9]?d[0-9]?[0-9]?[0-9]$/)) {
    throw new Error("I don't recognize that roll format...");
  }

  const i = rollLower.indexOf('d');
  const mult = i > 0 ? parseInt(rollLower.slice(0, i), 10) : 1;
  const type = rollLower.slice(i);
  if (
    type !== 'd4' &&
    type !== 'd6' &&
    type !== 'd8' &&
    type !== 'd10' &&
    type !== 'd12' &&
    type !== 'd20' &&
    type !== 'd100'
  ) {
    throw new Error("I don't recongize that die type...");
  }
  if (mult < 1 || mult > 10) {
    throw new Error("let's keep it from 1 to 10 dice!");
  }

  return {
    mult,
    type,
  };
}

export default function setupIPC(mainWindow: BrowserWindow) {
  const store = new Store<{
    ddDiceApiKey: string;
    ddDiceRoomSlug: string;
    ddDiceThemeId: string;
    streamerbotPort: number;
    streamerbotChaosCardsActionId: string;
    streamerbotQuestOpenActionId: string;
    twitchBotClient: TwitchClient;
    twitchBotAccessToken: AccessToken;
    twitchChannelClient: TwitchClient;
    twitchChannelAccessToken: AccessToken;
  }>();

  // quest
  const quests = new Quests();
  const current = quests.getCurrent();
  let questCurrentDesc = current?.desc ?? '';
  let questCurrentProgress = current?.progress ?? 0;
  const questCurrentCompletions = new Set(current?.completedUserIds ?? []);
  let questState = QuestState.CLOSED;
  let nextQuestSuggestionId = 1;
  const idToQuestSuggestionDesc = new Map<number, string>();
  const userIdToSuggestionId = new Map<string, number>();
  const getQuestSuggestions = (): QuestSuggestion[] => {
    const suggestionIdToVotes = new Map<number, number>();
    for (const suggestionId of userIdToSuggestionId.values()) {
      suggestionIdToVotes.set(
        suggestionId,
        (suggestionIdToVotes.get(suggestionId) ?? 0) + 1,
      );
    }

    const suggestions: { id: number; desc: string; votes: number }[] = [];
    for (const [id, desc] of idToQuestSuggestionDesc) {
      suggestions.push({
        id,
        desc,
        votes: suggestionIdToVotes.get(id) ?? 0,
      });
    }
    return suggestions;
  };

  ipcMain.removeAllListeners('getQuestState');
  ipcMain.handle('getQuestState', () => questState);
  ipcMain.removeAllListeners('setQuestState');
  ipcMain.handle('setQuestState', (event, newQuestState: QuestState) => {
    if (
      questState === QuestState.CLOSED &&
      newQuestState === QuestState.VOTING
    ) {
      return questState;
    }

    if (
      questState === QuestState.CLOSED &&
      newQuestState === QuestState.SUGGESTING
    ) {
      twitch.say(
        'New party quest suggestions are open! Use !questsuggest [your suggestion here]',
      );
    }
    if (
      questState === QuestState.SUGGESTING &&
      newQuestState === QuestState.VOTING
    ) {
      twitch.say(
        'Voting on party quest suggestions has started! Use !questvote [suggestion number]',
      );
    }
    if (
      questState === QuestState.VOTING &&
      newQuestState === QuestState.CLOSED
    ) {
      const suggestionIdToVotes = new Map<number, number>();
      for (const suggestionId of userIdToSuggestionId.values()) {
        suggestionIdToVotes.set(
          suggestionId,
          (suggestionIdToVotes.get(suggestionId) ?? 0) + 1,
        );
      }

      let winnerId = -1;
      let max = 0;
      for (const [suggestionId, votes] of suggestionIdToVotes) {
        if (votes > max) {
          winnerId = suggestionId;
          max = votes;
        }
      }
      const winnerDesc = idToQuestSuggestionDesc.get(winnerId);
      if (!winnerDesc) {
        throw new Error('no winner desc');
      }
      quests.push(winnerDesc);
      questCurrentDesc = winnerDesc;
      questCurrentProgress = 0;
      questCurrentCompletions.clear();
      mainWindow.webContents.send('questCurrent', {
        desc: questCurrentDesc,
        progress: 0,
        gold: 0,
      });
      twitch.say(`With ${max} votes, the next party quest is "${winnerDesc}"`);
    }
    if (newQuestState === QuestState.CLOSED) {
      nextQuestSuggestionId = 1;
      idToQuestSuggestionDesc.clear();
      userIdToSuggestionId.clear();
      mainWindow.webContents.send('questSuggestions', getQuestSuggestions());
    }
    questState = newQuestState;
    return questState;
  });

  ipcMain.removeAllListeners('getQuestCurrent');
  ipcMain.handle(
    'getQuestCurrent',
    (): RendererQuest => ({
      desc: questCurrentDesc,
      progress: questCurrentProgress,
      gold: questCurrentCompletions.size,
    }),
  );

  ipcMain.removeAllListeners('getQuestSuggestions');
  ipcMain.handle('getQuestSuggestions', getQuestSuggestions);

  ipcMain.removeAllListeners('deleteQuestSuggestion');
  ipcMain.handle('deleteQuestSuggestion', (event, id: number) => {
    idToQuestSuggestionDesc.delete(id);
    mainWindow.webContents.send('questSuggestions', getQuestSuggestions());
  });

  ipcMain.removeAllListeners('getQuestCurrentCompletions');
  ipcMain.handle('getQuestCurrentCompletions', () =>
    quests.getCurrentCompletions(),
  );

  ipcMain.removeAllListeners('getQuestLastCompletions');
  ipcMain.handle('getQuestLastCompletions', () => quests.getLastCompletions());

  ipcMain.removeAllListeners('getQuestAllGolds');
  ipcMain.handle('getQuestAllGolds', () => quests.getAllGolds());

  // streamerbot
  let streamerbotPort = store.get('streamerbotPort', 8080);
  let streamerbotChaosCardsActionId = store.get(
    'streamerbotChaosCardsActionId',
    '',
  );
  let streamerbotQuestOpenActionId = store.get(
    'streamerbotQuestOpenActionId',
    '',
  );
  let streamerbotStatus = StreamerbotStatus.DISCONNECTED;
  let streamerbotStatusMessage = '';
  let streamerbotActions: { id: string; name: string }[] = [];
  let streamerbotActionsError = '';
  const streamerbot = new Streamerbot(
    streamerbotPort,
    streamerbotChaosCardsActionId,
    streamerbotQuestOpenActionId,
    (newStreamerbotStatus, newStreamerbotStatusMessage) => {
      streamerbotStatus = newStreamerbotStatus;
      streamerbotStatusMessage = newStreamerbotStatusMessage;
      mainWindow.webContents.send(
        'streamerbotStatus',
        streamerbotStatus,
        streamerbotStatusMessage,
      );
    },
    (newStreamerbotActions) => {
      streamerbotActions = newStreamerbotActions;
      mainWindow.webContents.send('streamerbotActions', streamerbotActions);
    },
    (newStreamerbotActionsError) => {
      streamerbotActionsError = newStreamerbotActionsError;
      mainWindow.webContents.send(
        'streamerbotActionsError',
        streamerbotActionsError,
      );
    },
  );
  streamerbot.initialize();

  ipcMain.removeAllListeners('getStreamerbotStatus');
  ipcMain.handle('getStreamerbotStatus', () => ({
    status: streamerbotStatus,
    message: streamerbotStatusMessage,
  }));

  ipcMain.removeAllListeners('getStreamerbotActions');
  ipcMain.handle('getStreamerbotActions', () => streamerbotActions);

  ipcMain.removeAllListeners('getStreamerbotActionsError');
  ipcMain.handle('getStreamerbotActionsError', () => streamerbotActionsError);

  ipcMain.removeAllListeners('getStreamerbotPort');
  ipcMain.handle('getStreamerbotPort', () => streamerbotPort);
  ipcMain.removeAllListeners('streamerbotRetry');
  ipcMain.handle('streamerbotRetry', async (event, port: number) => {
    streamerbotPort = port;
    store.set('streamerbotPort', streamerbotPort);
    await streamerbot.retry(streamerbotPort);
  });

  ipcMain.removeAllListeners('getStreamerbotChaosCardsActionId');
  ipcMain.handle(
    'getStreamerbotChaosCardsActionId',
    () => streamerbotChaosCardsActionId,
  );
  ipcMain.removeAllListeners('setStreamerbotChaosCardsActionId');
  ipcMain.handle('setStreamerbotChaosCardsActionId', (event, id: string) => {
    streamerbotChaosCardsActionId = id;
    store.set('streamerbotChaosCardsActionId', streamerbotChaosCardsActionId);
    streamerbot.setChaosCardsActionId(streamerbotChaosCardsActionId);
  });

  ipcMain.removeAllListeners('getStreamerbotQuestOpenActionId');
  ipcMain.handle(
    'getStreamerbotQuestOpenActionId',
    () => streamerbotQuestOpenActionId,
  );
  ipcMain.removeAllListeners('setStreamerbotQuestOpenActionId');
  ipcMain.handle('setStreamerbotQuestOpenActionId', (event, id: string) => {
    streamerbotQuestOpenActionId = id;
    store.set('streamerbotQuestOpenActionId', streamerbotQuestOpenActionId);
    streamerbot.setQuestOpenActionId(streamerbotQuestOpenActionId);
  });

  // tally
  const tally = new Tally();
  ipcMain.removeAllListeners('getTallyAll');
  ipcMain.handle('getTallyAll', () => tally.getAll());

  ipcMain.removeAllListeners('getTallyHasPast');
  ipcMain.handle('getTallyHasPast', () => tally.hasPast());

  ipcMain.removeAllListeners('getTallyPast');
  ipcMain.handle('getTallyPast', () => tally.getPast());

  // chaos
  let chaosStatus = ChaosStatus.NONE;
  let chaosStatusMessage = '';
  const chaos = new Chaos((status, message) => {
    chaosStatus = status;
    chaosStatusMessage = message;
    mainWindow.webContents.send('chaosStatus', chaosStatus, chaosStatusMessage);
  });
  chaos.initialize();

  ipcMain.removeAllListeners('getChaosStatus');
  ipcMain.handle('getChaosStatus', () => ({
    status: chaosStatus,
    message: chaosStatusMessage,
  }));

  ipcMain.removeAllListeners('showChaosHtml');
  ipcMain.handle('showChaosHtml', () => chaos.showHtml());

  ipcMain.removeAllListeners('chaosCard');
  ipcMain.handle('chaosCard', async () => {
    const card = await chaos.chaosCard();
    streamerbot.doChaosCardsAction().catch(() => {
      // just catch
    });
    setTimeout(() => {
      twitch.say(`The card is ${card.name}: ${card.flavorText}`);
    }, 20000);
  });

  ipcMain.removeAllListeners('chaosPlus');
  ipcMain.handle('chaosPlus', async () => {
    const cards = await chaos.chaosPlus();
    streamerbot.doChaosCardsAction().catch(() => {
      // just catch
    });
    setTimeout(() => {
      twitch.say(`The first card is ${cards[0].name}: ${cards[0].flavorText}`);
    }, 20000);
    setTimeout(() => {
      twitch.say(`The second card is ${cards[1].name}: ${cards[1].flavorText}`);
    }, 25000);
    setTimeout(() => {
      twitch.say(`The third card is ${cards[2].name}: ${cards[2].flavorText}`);
    }, 30000);
  });

  // greetings
  const greetings = new Greetings();
  ipcMain.removeAllListeners('listGreetings');
  ipcMain.handle('listGreetings', () => greetings.listGreetings());

  ipcMain.removeAllListeners('setGreeting');
  ipcMain.handle(
    'setGreeting',
    (event, userId: string, userName: string, greeting: string) => {
      greetings.setGreeting(userId, userName, greeting);
    },
  );

  ipcMain.removeAllListeners('updateGreeting');
  ipcMain.handle(
    'updateGreeting',
    (event, userId: string, greeting: string) => {
      greetings.updateGreeting(userId, greeting);
    },
  );

  ipcMain.removeAllListeners('deleteGreeting');
  ipcMain.handle('deleteGreeting', (event, userId: string) => {
    greetings.deleteGreeting(userId);
  });

  // dddice
  let ddDiceApiKey = store.has('ddDiceApiKey') ? store.get('ddDiceApiKey') : '';
  let ddDiceRoomSlug = store.has('ddDiceRoomSlug')
    ? store.get('ddDiceRoomSlug')
    : '';
  let ddDiceThemeId = store.has('ddDiceThemeId')
    ? store.get('ddDiceThemeId')
    : '';
  let ddDiceUsername = '';
  let ddDiceUsernameStatus = DDDiceFetchStatus.NONE;
  let ddDiceUsernameStatusMessage = '';
  let ddDiceRooms: DDDiceRoom[] = [];
  let ddDiceRoomsStatus = DDDiceFetchStatus.NONE;
  let ddDiceRoomsStatusMessage = '';
  let ddDiceThemes: DDDiceTheme[] = [];
  let ddDiceThemesStatus = DDDiceFetchStatus.NONE;
  let ddDiceThemesStatusMessage = '';
  const ddDice = new DDDice(
    ddDiceApiKey,
    ddDiceRoomSlug,
    ddDiceThemeId,
    (status, username, message) => {
      ddDiceUsernameStatus = status;
      ddDiceUsername = username;
      ddDiceUsernameStatusMessage = message;
      mainWindow.webContents.send(
        'ddDiceUsername',
        ddDiceUsernameStatus,
        ddDiceUsername,
        ddDiceUsernameStatusMessage,
      );
    },
    (status, rooms, message) => {
      ddDiceRoomsStatus = status;
      ddDiceRooms = rooms;
      ddDiceRoomsStatusMessage = message;
      mainWindow.webContents.send(
        'ddDiceRooms',
        ddDiceRoomsStatus,
        ddDiceRooms,
        ddDiceRoomsStatusMessage,
      );
    },
    (status, themes, message) => {
      ddDiceThemesStatus = status;
      ddDiceThemes = themes;
      ddDiceThemesStatusMessage = message;
      mainWindow.webContents.send(
        'ddDiceThemes',
        ddDiceThemesStatus,
        ddDiceThemes,
        ddDiceThemesStatusMessage,
      );
    },
  );
  ddDice.initialize();

  ipcMain.removeAllListeners('getDDDiceApiKey');
  ipcMain.handle('getDDDiceApiKey', () => ddDiceApiKey);
  ipcMain.removeAllListeners('setDDDiceApiKey');
  ipcMain.handle('setDDDiceApiKey', async (event, newDDDiceApiKey: string) => {
    await ddDice.setApiKey(newDDDiceApiKey);
    store.set('ddDiceApiKey', newDDDiceApiKey);
    ddDiceApiKey = newDDDiceApiKey;
  });

  ipcMain.removeAllListeners('getDDDiceRoomSlug');
  ipcMain.handle('getDDDiceRoomSlug', () => ddDiceRoomSlug);
  ipcMain.removeAllListeners('setDDDiceRoomSlug');
  ipcMain.handle('setDDDiceRoomSlug', (event, newDDDiceRoomSlug: string) => {
    ddDice.setRoomSlug(newDDDiceRoomSlug);
    store.set('ddDiceRoomSlug', newDDDiceRoomSlug);
    ddDiceRoomSlug = newDDDiceRoomSlug;
  });

  ipcMain.removeAllListeners('getDDDiceThemeId');
  ipcMain.handle('getDDDiceThemeId', () => ddDiceThemeId);
  ipcMain.removeAllListeners('setDDDiceThemeId');
  ipcMain.handle('setDDDiceThemeId', (event, newDDDiceThemeId: string) => {
    ddDice.setThemeId(newDDDiceThemeId);
    store.set('ddDiceThemeId', newDDDiceThemeId);
    ddDiceThemeId = newDDDiceThemeId;
  });

  ipcMain.removeAllListeners('getDDDiceUsername');
  ipcMain.handle('getDDDiceUsername', () => ({
    status: ddDiceUsernameStatus,
    username: ddDiceUsername,
    message: ddDiceUsernameStatusMessage,
  }));

  ipcMain.removeAllListeners('getDDDiceRooms');
  ipcMain.handle('getDDDiceRooms', () => ({
    status: ddDiceRoomsStatus,
    rooms: ddDiceRooms,
    message: ddDiceRoomsStatusMessage,
  }));

  ipcMain.removeAllListeners('getDDDiceThemes');
  ipcMain.handle('getDDDiceThemes', () => ({
    status: ddDiceThemesStatus,
    themes: ddDiceThemes,
    message: ddDiceThemesStatusMessage,
  }));

  ipcMain.removeAllListeners('ddDiceRoll');
  ipcMain.handle('ddDiceRoll', (event, roll: string) =>
    ddDice.roll(parseRoll(roll)),
  );

  // twitch
  let twitchBotClient = store.has('twitchBotClient')
    ? store.get('twitchBotClient')
    : { clientId: '', clientSecret: '' };
  let twitchBotAccessToken = store.has('twitchBotAccessToken')
    ? store.get('twitchBotAccessToken')
    : null;
  let twitchChannelClient = store.has('twitchChannelClient')
    ? store.get('twitchChannelClient')
    : { clientId: '', clientSecret: '' };
  let twitchChannelAccessToken = store.has('twitchChannelAccessToken')
    ? store.get('twitchChannelAccessToken')
    : null;

  let twitchCallbackServerStatus = TwitchCallbackServerStatus.STOPPED;
  let twitchCallbackServerPort = 0;
  let twitchBotStatus = TwitchConnectionStatus.DISCONNECTED;
  let twitchBotStatusMessage = '';
  let twitchChannelStatus = TwitchConnectionStatus.DISCONNECTED;
  let twitchChannelStatusMessage = '';
  let twitchBotUserName = '';
  let twitchChannel = '';
  const twitch = new Twitch(
    twitchBotClient,
    twitchBotAccessToken,
    twitchChannelClient,
    twitchChannelAccessToken,
    (newTwitchBotAccessToken) => {
      twitchBotAccessToken = newTwitchBotAccessToken;
      store.set('twitchBotAccessToken', twitchBotAccessToken);
    },
    (newTwitchChannelAccessToken) => {
      twitchChannelAccessToken = newTwitchChannelAccessToken;
      store.set('twitchChannelAccessToken', twitchChannelAccessToken);
    },
    (newTwitchCallbackServerStatus, newTwitchCallbackServerPort) => {
      twitchCallbackServerStatus = newTwitchCallbackServerStatus;
      twitchCallbackServerPort = newTwitchCallbackServerPort;
      mainWindow.webContents.send(
        'twitchCallbackServerStatus',
        twitchCallbackServerStatus,
        twitchCallbackServerPort,
      );
    },
    (newTwitchChatClientStatus, message) => {
      twitchBotStatus = newTwitchChatClientStatus;
      twitchBotStatusMessage = message;
      mainWindow.webContents.send(
        'twitchBotStatus',
        twitchBotStatus,
        twitchBotStatusMessage,
      );
    },
    (newTwitchEventPubSubStatus, message) => {
      twitchChannelStatus = newTwitchEventPubSubStatus;
      twitchChannelStatusMessage = message;
      mainWindow.webContents.send(
        'twitchChannelStatus',
        twitchChannelStatus,
        twitchChannelStatusMessage,
      );
    },
    (newTwitchBotUserName) => {
      twitchBotUserName = newTwitchBotUserName;
      mainWindow.webContents.send('twitchBotUserName', twitchChannel);
    },
    (newTwitchChannel) => {
      twitchChannel = newTwitchChannel;
      mainWindow.webContents.send('twitchChannel', twitchChannel);
    },
  );
  twitch.onCommand((command, userId, userName) => {
    const lowerCommand = command.toLowerCase();
    if (lowerCommand === 'tally') {
      if (twitch.isModerator(userId)) {
        twitch.say(
          `Sorry @${userName}, mods are not elligilbe for the tally rally`,
        );
        return;
      }

      const points = tally.getPointsForUserId(userId);
      if (points === 0) {
        twitch.say(
          `@${userName} has not redeemed any qualifying channel rewards this month`,
        );
      } else {
        twitch.say(
          `@${userName} has redeemed ${points} points worth of qualifying channel rewards this month`,
        );
      }
    } else if (lowerCommand === 'tallytop') {
      const tops = tally.getTop();
      if (tops.length > 0) {
        twitch.say(
          `The tally rally leaders this month: ${tops.map(({ userName, points }) => `${userName} (${points})`).join(', ')}`,
        );
      } else {
        twitch.say('There are no tally rally leaders this month yet!');
      }
    } else if (lowerCommand === 'tallylast') {
      const tops = tally.getLastTop();
      if (tops.length > 0) {
        twitch.say(
          `The tally rally winners last month: ${tops.map(({ userName, points }) => `${userName} (${points})`).join(', ')}`,
        );
      } else {
        twitch.say('There were no tally rally winners last month!');
      }
    } else if (lowerCommand === 'tallyrules') {
      twitch.say(
        'Channel rewards worth 100 points or more qualify! Top 3 become VIPs for the next month!',
      );
    } else if (lowerCommand.startsWith('questsuggest')) {
      if (questState === QuestState.SUGGESTING) {
        idToQuestSuggestionDesc.set(nextQuestSuggestionId, command.slice(13));
        nextQuestSuggestionId++;
        mainWindow.webContents.send('questSuggestions', getQuestSuggestions());
      } else {
        twitch.say(
          `Sorry @${userName}, party quest suggestions are not open right now`,
        );
      }
    } else if (lowerCommand.startsWith('questvote')) {
      if (questState === QuestState.VOTING) {
        const arg = command.slice(10);
        const suggestionId = parseInt(arg, 10);
        if (idToQuestSuggestionDesc.has(suggestionId)) {
          userIdToSuggestionId.set(userId, suggestionId);
          mainWindow.webContents.send(
            'questSuggestions',
            getQuestSuggestions(),
          );
        } else {
          twitch.say(
            `Sorry @${userName}, number ${arg} does not correspond to any suggested quest`,
          );
        }
      } else {
        twitch.say(
          `Sorry @${userName}, party quest voting is not open right now`,
        );
      }
    } else if (lowerCommand === 'quest') {
      if (questCurrentDesc && questState === QuestState.CLOSED) {
        const progress =
          questCurrentProgress > 0
            ? ` (group progress: ${questCurrentProgress})`
            : '';
        twitch.say(
          `${questCurrentDesc}, gold: ${questCurrentCompletions.size}${progress}`,
        );
      }
    } else if (lowerCommand.startsWith('questcomplete')) {
      if (questState === QuestState.CLOSED && questCurrentDesc) {
        let progress = 0;
        if (command.length > 14) {
          const arg = parseInt(command.slice(14), 10);
          if (Number.isInteger(arg) && arg > 0) {
            progress = arg;
          }
        }
        try {
          quests.complete(userId, userName, progress);
          questCurrentProgress += progress;
          questCurrentCompletions.add(userId);
          mainWindow.webContents.send('questCurrent', {
            desc: questCurrentDesc,
            progress: questCurrentProgress,
            gold: questCurrentCompletions.size,
          });
          twitch.say(`@${userName} completed the quest!`);
        } catch {
          // just catch
        }
      } else {
        twitch.say(`Sorry @${userName}, there is no party quest yet`);
      }
    } else if (lowerCommand === 'questlast') {
      const last = quests.getLast();
      if (last) {
        const progress =
          last.progress > 0 ? ` (group progress: ${last.progress})` : '';
        twitch.say(
          `Last party quest: ${last.desc}, gold: ${last.completedUserIds.length}${progress}`,
        );
      }
    } else if (lowerCommand === 'questgoldtotal') {
      const gold = quests.getGoldTotal();
      twitch.say(`We have earned ${gold} gold total across all quests!`);
    } else if (lowerCommand === 'questgold') {
      const gold = quests.getGold(userId);
      twitch.say(`@${userName} has earned ${gold} gold total for the party!`);
    }
  });
  twitch.onRedemption(async (event) => {
    console.log(
      `${event.rewardId}: ${event.rewardTitle}: ${event.rewardCost} points`,
    );
    if (event.rewardCost >= 100 && !twitch.isModerator(event.userId)) {
      tally.addPoints(event.userId, event.userName, event.rewardCost);
    }
    if (event.rewardId === 'b4073735-6948-474f-9d1c-c68798794d31') {
      try {
        const parsedRoll = parseRoll(event.input);
        try {
          await ddDice.roll(parsedRoll);
          twitch.say(
            `@${event.userName} rolled ${parsedRoll.mult}${parsedRoll.type}!`,
          );
        } catch (e: unknown) {
          twitch.say(`Rolling error!: ${e instanceof Error ? e.message : e}`);
        }
      } catch (e: unknown) {
        if (e instanceof Error) {
          twitch.say(`Sorry @${event.userName}, ${e.message}`);
        }
      }
    } else if (event.rewardId === '6122c2f8-f553-40bc-b58b-22beabf295a8') {
      greetings.setGreeting(event.userId, event.userName, event.input);
      twitch.say(`@${event.userName} added a welcome message!`);
    } else if (event.rewardId === '0404b4be-9ed9-4cb9-afcf-6923c1564c7c') {
      try {
        const card = await chaos.chaosCard();
        streamerbot.doChaosCardsAction().catch(() => {
          // just catch
        });
        setTimeout(() => {
          twitch.say(
            `@${event.userName} drew ${card.name}: ${card.flavorText}`,
          );
        }, 20000);
      } catch (e: unknown) {
        twitch.say(`Chaos card error!: ${e instanceof Error ? e.message : e}`);
      }
    }
  });
  twitch.onSeen((userId) => {
    const greeting = greetings.getGreeting(userId);
    if (greeting) {
      twitch.say(`@${greeting.userName} ${greeting.greeting}`);
    }
  });
  twitch.initialize();

  ipcMain.removeAllListeners('getTwitchBotClient');
  ipcMain.handle('getTwitchBotClient', () => twitchBotClient);
  ipcMain.removeAllListeners('setTwitchBotClient');
  ipcMain.handle(
    'setTwitchBotClient',
    (event, newTwitchBotClient: TwitchClient) => {
      twitchBotClient = newTwitchBotClient;
      store.set('twitchBotClient', twitchBotClient);
      twitch.setTwitchClient(TwitchConnection.BOT, twitchBotClient);
    },
  );

  ipcMain.removeAllListeners('getTwitchChannelClient');
  ipcMain.handle('getTwitchChannelClient', () => twitchChannelClient);
  ipcMain.removeAllListeners('setTwitchChannelClient');
  ipcMain.handle(
    'setTwitchChannelClient',
    (event, newTwitchChannelClient: TwitchClient) => {
      twitchChannelClient = newTwitchChannelClient;
      store.set('twitchChannelClient', twitchChannelClient);
      twitch.setTwitchClient(TwitchConnection.CHANNEL, twitchChannelClient);
    },
  );

  ipcMain.removeAllListeners('getTwitchCallbackServerStatus');
  ipcMain.handle('getTwitchCallbackServerStatus', () => ({
    status: twitchCallbackServerStatus,
    port: twitchCallbackServerPort,
  }));

  ipcMain.removeAllListeners('getTwitchBotStatus');
  ipcMain.handle('getTwitchBotStatus', () => ({
    status: twitchBotStatus,
    message: twitchBotStatusMessage,
  }));

  ipcMain.removeAllListeners('getTwitchChannelStatus');
  ipcMain.handle('getTwitchChannelStatus', () => ({
    status: twitchChannelStatus,
    message: twitchChannelStatusMessage,
  }));

  ipcMain.removeAllListeners('getTwitchBotUserName');
  ipcMain.handle('getTwitchBotUserName', () => twitchBotUserName);

  ipcMain.removeAllListeners('getTwitchChannel');
  ipcMain.handle('getTwitchChannel', () => twitchChannel);

  ipcMain.removeAllListeners('startTwitchCallbackServer');
  ipcMain.handle(
    'startTwitchCallbackServer',
    (event, twitchConnection: TwitchConnection) =>
      twitch.startCallbackServer(twitchConnection),
  );
  ipcMain.removeAllListeners('stopTwitchCallbackServer');
  ipcMain.handle('stopTwitchCallbackServer', () => twitch.stopCallbackServer());

  ipcMain.removeAllListeners('getTwichUserId');
  ipcMain.handle('getTwitchUserId', (event, userName: string) =>
    twitch.getUserId(userName),
  );

  ipcMain.removeAllListeners('getTwitchChatters');
  ipcMain.handle('getTwitchChatters', () => twitch.getChatters());

  ipcMain.handle('getVersion', app.getVersion);
}
