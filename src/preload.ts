import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import {
  TwitchCallbackServerStatus,
  TwitchClient,
  TwitchConnection,
  TwitchConnectionStatus,
} from './types';

const electronHandler = {
  getTwitchBotClient: (): Promise<TwitchClient> =>
    ipcRenderer.invoke('getTwitchBotClient'),
  setTwitchBotClient: (twitchClient: TwitchClient): Promise<void> =>
    ipcRenderer.invoke('setTwitchBotClient', twitchClient),
  getTwitchChannelClient: (): Promise<TwitchClient> =>
    ipcRenderer.invoke('getTwitchChannelClient'),
  setTwitchChannelClient: (twitchClient: TwitchClient): Promise<void> =>
    ipcRenderer.invoke('setTwitchChannelClient', twitchClient),
  getTwitchCallbackServerStatus: (): Promise<{
    status: TwitchCallbackServerStatus;
    port: number;
  }> => ipcRenderer.invoke('getTwitchCallbackServerStatus'),
  getTwitchBotStatus: (): Promise<{
    status: TwitchConnectionStatus;
    message: string;
  }> => ipcRenderer.invoke('getTwitchBotStatus'),
  getTwitchChannelStatus: (): Promise<{
    status: TwitchConnectionStatus;
    message: string;
  }> => ipcRenderer.invoke('getTwitchChannelStatus'),
  getTwitchBotUserName: (): Promise<string> =>
    ipcRenderer.invoke('getTwitchBotUserName'),
  getTwitchChannel: (): Promise<string> =>
    ipcRenderer.invoke('getTwitchChannel'),
  startTwitchCallbackServer: (
    twitchConnection: TwitchConnection,
  ): Promise<void> =>
    ipcRenderer.invoke('startTwitchCallbackServer', twitchConnection),
  stopTwitchCallbackServer: (): Promise<void> =>
    ipcRenderer.invoke('stopTwitchCallbackServer'),
  onTwitchCallbackServerStatus: (
    callback: (
      event: IpcRendererEvent,
      twitchCallbackServerStatus: TwitchCallbackServerStatus,
      port: number,
    ) => void,
  ) => {
    ipcRenderer.removeAllListeners('twitchCallbackServerStatus');
    ipcRenderer.on('twitchCallbackServerStatus', callback);
  },
  onTwitchBotStatus: (
    callback: (
      event: IpcRendererEvent,
      twitchBotStatus: TwitchConnectionStatus,
      message: string,
    ) => void,
  ) => {
    ipcRenderer.removeAllListeners('twitchBotStatus');
    ipcRenderer.on('twitchBotStatus', callback);
  },
  onTwitchChannelStatus: (
    callback: (
      event: IpcRendererEvent,
      twitchChannelStatus: TwitchConnectionStatus,
      message: string,
    ) => void,
  ) => {
    ipcRenderer.removeAllListeners('twitchChannelStatus');
    ipcRenderer.on('twitchChannelStatus', callback);
  },
  onTwitchBotUserName: (
    callback: (event: IpcRendererEvent, twitchBotUserName: string) => void,
  ) => {
    ipcRenderer.removeAllListeners('twitchBotUserName');
    ipcRenderer.on('twitchBotUserName', callback);
  },
  onTwitchChannel: (
    callback: (event: IpcRendererEvent, twitchChannel: string) => void,
  ) => {
    ipcRenderer.removeAllListeners('twitchChannel');
    ipcRenderer.on('twitchChannel', callback);
  },
  getVersion: (): Promise<string> => ipcRenderer.invoke('getVersion'),
};
contextBridge.exposeInMainWorld('electron', electronHandler);
export type ElectronHandler = typeof electronHandler;
