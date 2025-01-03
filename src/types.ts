export enum TwitchCallbackServerStatus {
  STOPPED,
  STARTING,
  STARTED,
}

export enum TwitchChatClientStatus {
  DISCONNECTED,
  CONNECTING,
  CONNECTED,
}

export type TwitchSettings = {
  channel: string;
  clientId: string;
  clientSecret: string;
};
