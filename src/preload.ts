import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import {
  ChaosStatus,
  DDDiceFetchStatus,
  DDDiceRoom,
  DDDiceTheme,
  Greeting,
  QuestCompletion,
  QuestGold,
  QuestState,
  QuestSuggestion,
  RendererQuest,
  StreamerbotAction,
  StreamerbotStatus,
  Tally,
  TwitchCallbackServerStatus,
  TwitchClient,
  TwitchConnection,
  TwitchConnectionStatus,
} from './types';

const electronHandler = {
  // quests
  getQuestState: (): Promise<QuestState> => ipcRenderer.invoke('getQuestState'),
  setQuestState: (state: QuestState): Promise<QuestState> =>
    ipcRenderer.invoke('setQuestState', state),
  getQuestCurrent: (): Promise<RendererQuest> =>
    ipcRenderer.invoke('getQuestCurrent'),
  getQuestSuggestions: (): Promise<QuestSuggestion[]> =>
    ipcRenderer.invoke('getQuestSuggestions'),
  deleteQuestSuggestion: (id: number): Promise<void> =>
    ipcRenderer.invoke('deleteQuestSuggestion', id),
  getQuestCurrentCompletions: (): Promise<QuestCompletion[]> =>
    ipcRenderer.invoke('getQuestCurrentCompletions'),
  getQuestLastCompletions: (): Promise<QuestCompletion[]> =>
    ipcRenderer.invoke('getQuestLastCompletions'),
  getQuestAllGolds: (): Promise<QuestGold[]> =>
    ipcRenderer.invoke('getQuestAllGolds'),
  onQuestCurrent: (
    callback: (event: IpcRendererEvent, quest: RendererQuest) => void,
  ) => {
    ipcRenderer.removeAllListeners('questCurrent');
    ipcRenderer.on('questCurrent', callback);
  },
  onQuestSuggestions: (
    callback: (event: IpcRendererEvent, suggestions: QuestSuggestion[]) => void,
  ) => {
    ipcRenderer.removeAllListeners('questSuggestions');
    ipcRenderer.on('questSuggestions', callback);
  },

  // streamerbot
  getStreamerbotStatus: (): Promise<{
    status: StreamerbotStatus;
    message: string;
  }> => ipcRenderer.invoke('getStreamerbotStatus'),
  getStreamerbotActions: (): Promise<StreamerbotAction[]> =>
    ipcRenderer.invoke('getStreamerbotActions'),
  getStreamerbotActionsError: (): Promise<string> =>
    ipcRenderer.invoke('getStreamerbotActionsError'),
  getStreamerbotPort: (): Promise<number> =>
    ipcRenderer.invoke('getStreamerbotPort'),
  streamerbotRetry: (port: number): Promise<void> =>
    ipcRenderer.invoke('streamerbotRetry', port),
  getStreamerbotChaosCardsActionId: (): Promise<string> =>
    ipcRenderer.invoke('getStreamerbotChaosCardsActionId'),
  setStreamerbotChaosCardsActionId: (id: string): Promise<void> =>
    ipcRenderer.invoke('setStreamerbotChaosCardsActionId', id),
  getStreamerbotQuestOpenActionId: (): Promise<string> =>
    ipcRenderer.invoke('getStreamerbotQuestOpenActionId'),
  setStreamerbotQuestOpenActionId: (id: string): Promise<void> =>
    ipcRenderer.invoke('setStreamerbotQuestOpenActionId', id),
  onStreamerbotStatus: (
    callback: (
      event: IpcRendererEvent,
      streamerbotStatus: StreamerbotStatus,
      streamerbotStatusMessage: string,
    ) => void,
  ) => {
    ipcRenderer.removeAllListeners('streamerbotStatus');
    ipcRenderer.on('streamerbotStatus', callback);
  },
  onStreamerbotActions: (
    callback: (
      event: IpcRendererEvent,
      streamerbotActions: StreamerbotAction[],
    ) => void,
  ) => {
    ipcRenderer.removeAllListeners('streamerbotActions');
    ipcRenderer.on('streamerbotActions', callback);
  },
  onStreamerbotActionsError: (
    callback: (
      evevnt: IpcRendererEvent,
      streamerbotActionsError: string,
    ) => void,
  ) => {
    ipcRenderer.removeAllListeners('streamerbotActionsError');
    ipcRenderer.on('streamerbotActionsError', callback);
  },

  // tally
  getTallyAll: (): Promise<Tally[]> => ipcRenderer.invoke('getTallyAll'),
  getTallyHasPast: (): Promise<boolean> =>
    ipcRenderer.invoke('getTallyHasPast'),
  getTallyPast: (): Promise<{ key: string; tallies: Tally[] }[]> =>
    ipcRenderer.invoke('getTallyPast'),

  // chaos
  getChaosStatus: (): Promise<{ status: ChaosStatus; message: string }> =>
    ipcRenderer.invoke('getChaosStatus'),
  showChaosHtml: (): Promise<void> => ipcRenderer.invoke('showChaosHtml'),
  chaosCard: (): Promise<void> => ipcRenderer.invoke('chaosCard'),
  chaosPlus: (): Promise<void> => ipcRenderer.invoke('chaosPlus'),
  onChaosStatus: (
    callback: (
      event: IpcRendererEvent,
      status: ChaosStatus,
      message: string,
    ) => void,
  ) => {
    ipcRenderer.removeAllListeners('chaosStatus');
    ipcRenderer.on('chaosStatus', callback);
  },

  // greetings
  listGreetings: (): Promise<Greeting[]> => ipcRenderer.invoke('listGreetings'),
  setGreeting: (
    userId: string,
    userName: string,
    greeting: string,
  ): Promise<void> =>
    ipcRenderer.invoke('setGreeting', userId, userName, greeting),
  updateGreeting: (userId: string, greeting: string): Promise<void> =>
    ipcRenderer.invoke('updateGreeting', userId, greeting),
  deleteGreeting: (userId: string): Promise<void> =>
    ipcRenderer.invoke('deleteGreeting', userId),

  // dddice
  getDDDiceApiKey: (): Promise<string> => ipcRenderer.invoke('getDDDiceApiKey'),
  setDDDiceApiKey: (ddDiceApiKey: string): Promise<void> =>
    ipcRenderer.invoke('setDDDiceApiKey', ddDiceApiKey),
  getDDDiceRoomSlug: (): Promise<string> =>
    ipcRenderer.invoke('getDDDiceRoomSlug'),
  setDDDiceRoomSlug: (ddDiceRoomSlug: string): Promise<void> =>
    ipcRenderer.invoke('setDDDiceRoomSlug', ddDiceRoomSlug),
  getDDDiceThemeId: (): Promise<string> =>
    ipcRenderer.invoke('getDDDiceThemeId'),
  setDDDiceThemeId: (ddDiceThemeId: string): Promise<void> =>
    ipcRenderer.invoke('setDDDiceThemeId', ddDiceThemeId),
  getDDDiceUsername: (): Promise<{
    status: DDDiceFetchStatus;
    username: string;
    message: string;
  }> => ipcRenderer.invoke('getDDDiceUsername'),
  getDDDiceRooms: (): Promise<{
    status: DDDiceFetchStatus;
    rooms: DDDiceRoom[];
    message: string;
  }> => ipcRenderer.invoke('getDDDiceRooms'),
  getDDDiceThemes: (): Promise<{
    status: DDDiceFetchStatus;
    themes: DDDiceTheme[];
    message: string;
  }> => ipcRenderer.invoke('getDDDiceThemes'),
  ddDiceRoll: (roll: string): Promise<string> =>
    ipcRenderer.invoke('ddDiceRoll', roll),
  onDDDiceUsername: (
    callback: (
      event: IpcRendererEvent,
      status: DDDiceFetchStatus,
      username: string,
      message: string,
    ) => void,
  ) => {
    ipcRenderer.removeAllListeners('ddDiceUsername');
    ipcRenderer.on('ddDiceUsername', callback);
  },
  onDDDiceRooms: (
    callback: (
      event: IpcRendererEvent,
      status: DDDiceFetchStatus,
      rooms: DDDiceRoom[],
      message: string,
    ) => void,
  ) => {
    ipcRenderer.removeAllListeners('ddDiceRooms');
    ipcRenderer.on('ddDiceRooms', callback);
  },
  onDDDiceThemes: (
    callback: (
      event: IpcRendererEvent,
      status: DDDiceFetchStatus,
      themes: DDDiceTheme[],
      message: string,
    ) => void,
  ) => {
    ipcRenderer.removeAllListeners('ddDiceThemes');
    ipcRenderer.on('ddDiceThemes', callback);
  },

  // twich
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
  getTwitchUserId: (userName: string): Promise<string> =>
    ipcRenderer.invoke('getTwitchUserId', userName),
  getTwitchChatters: (): Promise<{ userId: string; userName: string }[]> =>
    ipcRenderer.invoke('getTwitchChatters'),
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
