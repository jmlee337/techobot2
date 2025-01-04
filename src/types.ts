export enum TwitchCallbackServerStatus {
  STOPPED,
  STARTING,
  STARTED,
}

export enum TwitchConnection {
  BOT,
  CHANNEL,
}

export enum TwitchConnectionStatus {
  DISCONNECTED,
  CONNECTING,
  CONNECTED,
}

export type TwitchClient = {
  clientId: string;
  clientSecret: string;
};
