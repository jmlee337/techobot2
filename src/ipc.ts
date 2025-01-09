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
} from './types';
import { AccessToken } from '@twurple/auth';
import DDDice from './dddice';
import Greetings from './greetings';
import Chaos from './chaos';
import Tally from './tally';

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
    twitchBotClient: TwitchClient;
    twitchBotAccessToken: AccessToken;
    twitchChannelClient: TwitchClient;
    twitchChannelAccessToken: AccessToken;
  }>();

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
  ipcMain.handle('chaosCard', () => chaos.chaosCard());

  ipcMain.removeAllListeners('chaosPlus');
  ipcMain.handle('chaosPlus', () => chaos.chaosPlus());

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
  twitch.onCommand((lowerCommand, userId, userName) => {
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
      // daily chaos card
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

  app.on('will-quit', async (event) => {
    if (chaos.isOpen()) {
      event.preventDefault();
      await chaos.close();
    }
    if (twitch.isOpen()) {
      event.preventDefault();
      twitch.close();
    }
    if (event.defaultPrevented) {
      app.quit();
    }
  });
}
