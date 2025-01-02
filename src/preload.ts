import { contextBridge, ipcRenderer } from "electron";

const electronHandler = {
  getTwitchChannel: (): Promise<string> => ipcRenderer.invoke('getTwitchChannel'),
  setTwitchChannel: (twitchChannel: string): Promise<void> => ipcRenderer.invoke('setTwitchChannel', twitchChannel),
  getVersion: (): Promise<string> => ipcRenderer.invoke('getVersion'),
};
contextBridge.exposeInMainWorld('electron', electronHandler);
export type ElectronHandler = typeof electronHandler;
