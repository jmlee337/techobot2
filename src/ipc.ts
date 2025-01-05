import { app, BrowserWindow, ipcMain } from 'electron';
import Store from 'electron-store';
import Twitch from './twitch';
import {
  TwitchCallbackServerStatus,
  TwitchConnectionStatus,
  TwitchClient,
  TwitchConnection,
} from './types';
import { AccessToken } from '@twurple/auth';
import DDDice from './dddice';

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
  const ddDice = new DDDice(ddDiceApiKey, ddDiceRoomSlug, ddDiceThemeId);

  ipcMain.removeAllListeners('getDDDiceApiKey');
  ipcMain.handle('getDDDiceApiKey', () => ddDiceApiKey);
  ipcMain.removeAllListeners('setDDDiceApiKey');
  ipcMain.handle('setDDDiceApiKey', async (event, newDDDiceApiKey: string) => {
    const lists = await ddDice.setApiKey(newDDDiceApiKey);
    store.set('ddDiceApiKey', newDDDiceApiKey);
    ddDiceApiKey = newDDDiceApiKey;
    return lists;
  });

  ipcMain.removeAllListeners('getDDDiceUsername');
  ipcMain.handle('getDDDiceUsername', () => ddDice.getUsername());

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

  ipcMain.removeAllListeners('getDDDiceRooms');
  ipcMain.handle('getDDDiceRooms', () => ddDice.getRooms());

  ipcMain.removeAllListeners('getDDDiceThemes');
  ipcMain.handle('getDDDiceThemes', () => ddDice.getThemes());

  ipcMain.removeAllListeners('ddDiceTestRoll');
  ipcMain.handle('ddDiceTestRoll', () => ddDice.testRoll());

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
      mainWindow.webContents.send('twitchBotStatus', twitchBotStatus, message);
    },
    (newTwitchEventPubSubStatus, message) => {
      twitchChannelStatus = newTwitchEventPubSubStatus;
      twitchChannelStatusMessage = message;
      mainWindow.webContents.send(
        'twitchChannelStatus',
        twitchChannelStatus,
        message,
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
  twitch.onRedemption((event) => {
    console.log(`${event.rewardTitle}: ${event.rewardCost} points`);
  });
  twitch.startChannel().then((success) => {
    if (success) {
      twitch.startBot();
    }
  });

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
