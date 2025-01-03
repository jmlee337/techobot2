import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import {
  TwitchCallbackServerStatus,
  TwitchChatClientStatus,
  TwitchSettings,
} from './types';

const electronHandler = {
  getTwitchSettings: (): Promise<TwitchSettings> =>
    ipcRenderer.invoke('getTwitchSettings'),
  setTwitchSettings: (twitchSettings: TwitchSettings): Promise<void> =>
    ipcRenderer.invoke('setTwitchSettings', twitchSettings),
  getTwitchCallbackServerStatus: (): Promise<{
    status: TwitchCallbackServerStatus;
    port: number;
  }> => ipcRenderer.invoke('getTwitchCallbackServerStatus'),
  getTwitchChatClientStatus: (): Promise<TwitchChatClientStatus> =>
    ipcRenderer.invoke('getTwitchChatClientStatus'),
  startTwitchCallbackServer: (): Promise<void> =>
    ipcRenderer.invoke('startTwitchCallbackServer'),
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
  onTwitchChatClientStatus: (
    callback: (
      event: IpcRendererEvent,
      twitchChatClientStatus: TwitchChatClientStatus,
    ) => void,
  ) => {
    ipcRenderer.removeAllListeners('twitchChatClientStatus');
    ipcRenderer.on('twitchChatClientStatus', callback);
  },
  getVersion: (): Promise<string> => ipcRenderer.invoke('getVersion'),
};
contextBridge.exposeInMainWorld('electron', electronHandler);
export type ElectronHandler = typeof electronHandler;
