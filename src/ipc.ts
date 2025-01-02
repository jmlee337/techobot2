import { app, ipcMain } from "electron"
import Store from "electron-store";

export default function setupIPC() {
  const store = new Store<{ twitchChannel: string }>();
  let twitchChannel = store.has('twitchChannel') ? store.get('twitchChannel') : '';

  ipcMain.removeAllListeners('getTwitchChannel');
  ipcMain.handle('getTwitchChannel', () => twitchChannel);
  ipcMain.removeAllListeners('setTwitchChannel');
  ipcMain.handle('setTwitchChannel', (event, newTwitchChannel: string) => {
    store.set('twitchChannel', newTwitchChannel);
    twitchChannel = newTwitchChannel;
  });

  ipcMain.handle('getVersion', app.getVersion);
}
