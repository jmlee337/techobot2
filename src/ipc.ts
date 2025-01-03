import { app, BrowserWindow, ipcMain } from 'electron';
import Store from 'electron-store';
import Twitch from './twitch';
import {
  TwitchCallbackServerStatus,
  TwitchChatClientStatus,
  TwitchSettings,
} from './types';
import { AccessToken } from '@twurple/auth';

export default function setupIPC(mainWindow: BrowserWindow) {
  const store = new Store<{
    twitchSettings: TwitchSettings;
    twitchAccessToken: AccessToken;
  }>();
  let twitchSettings = store.has('twitchSettings')
    ? store.get('twitchSettings')
    : { channel: '', clientId: '', clientSecret: '' };
  let twitchAccessToken = store.has('twitchAccessToken')
    ? store.get('twitchAccessToken')
    : null;

  let twitchCallbackServerStatus = TwitchCallbackServerStatus.STOPPED;
  let twitchCallbackServerPort = 0;
  let twitchChatClientStatus = TwitchChatClientStatus.DISCONNECTED;
  const twitch = new Twitch(
    twitchSettings,
    twitchAccessToken,
    (newTwitchAccessToken) => {
      twitchAccessToken = newTwitchAccessToken;
      store.set('twitchAccessToken', twitchAccessToken);
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
    (newTwitchChatClientStatus) => {
      twitchChatClientStatus = newTwitchChatClientStatus;
      mainWindow.webContents.send(
        'twitchChatClientStatus',
        twitchChatClientStatus,
      );
    },
  );
  twitch.startChatClient();

  ipcMain.removeAllListeners('getTwitchSettings');
  ipcMain.handle('getTwitchSettings', () => twitchSettings);
  ipcMain.removeAllListeners('setTwitchSettings');
  ipcMain.handle(
    'setTwitchSettings',
    (event, newTwitchSettings: TwitchSettings) => {
      twitchSettings = newTwitchSettings;
      store.set('twitchSettings', twitchSettings);
      twitch.setTwitchSettings(twitchSettings);
    },
  );

  ipcMain.removeAllListeners('getTwitchCallbackServerStatus');
  ipcMain.handle('getTwitchCallbackServerStatus', () => ({
    status: twitchCallbackServerStatus,
    port: twitchCallbackServerPort,
  }));

  ipcMain.removeAllListeners('getTwitchChatClientStatus');
  ipcMain.handle('getTwitchChatClientStatus', () => twitchChatClientStatus);

  ipcMain.removeAllListeners('startTwitchCallbackServer');
  ipcMain.handle('startTwitchCallbackServer', () =>
    twitch.startCallbackServer(),
  );
  ipcMain.removeAllListeners('stopTwitchCallbackServer');
  ipcMain.handle('stopTwitchCallbackServer', () => twitch.stopCallbackServer());

  ipcMain.handle('getVersion', app.getVersion);
}
