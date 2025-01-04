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

export default function setupIPC(mainWindow: BrowserWindow) {
  const store = new Store<{
    twitchBotClient: TwitchClient;
    twitchBotAccessToken: AccessToken;
    twitchChannelClient: TwitchClient;
    twitchChannelAccessToken: AccessToken;
  }>();
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
