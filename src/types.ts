export type DDDiceRoom = {
  name: string;
  slug: string;
};

export type DDDiceTheme = {
  id: string;
  name: string;
};

export type ParsedRoll = {
  mult: number;
  type: string;
};

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
