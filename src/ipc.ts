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
} from './types';
import { AccessToken } from '@twurple/auth';
import DDDice from './dddice';

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
      console.log(`username: ${status}, ${username}, ${message}`);
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
      console.log(`rooms: ${status}, ${rooms}, ${message}`);
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
      console.log(`themes: ${status}, ${themes}, ${message}`);
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
  twitch.onRedemption(async (event) => {
    console.log(
      `${event.userId}: ${event.rewardTitle}: ${event.rewardCost} points`,
    );
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

  ipcMain.handle('getVersion', app.getVersion);
}
