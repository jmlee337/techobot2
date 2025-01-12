export type DDDiceRoom = {
  name: string;
  slug: string;
};

export type DDDiceTheme = {
  id: string;
  name: string;
};

export enum DDDiceFetchStatus {
  NONE,
  FETCHING,
  FETCHED,
}

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

export type Greeting = {
  userId: string;
  userName: string;
  greeting: string;
};

export enum ChaosStatus {
  NONE,
  STARTING,
  STARTED,
  CONNECTED,
}

export type Tally = {
  userId: string;
  userName: string;
  points: number;
};

export type Card = {
  type: 'yugioh' | 'pokemon' | 'tarot';
  name: string;
  flavorText: string;
  imgSrc: string;
};

export enum StreamerbotStatus {
  DISCONNECTED,
  CONNECTING,
  CONNECTED,
}

export type StreamerbotAction = {
  id: string;
  name: string;
};

export type RendererQuest = {
  desc: string;
  progress: number;
  gold: number;
};

export type Quest = {
  id: number;
  desc: string;
  progress: number;
  completedUserIds: string[];
};

export enum QuestState {
  SUGGESTING,
  VOTING,
  CLOSED,
}

export type QuestSuggestion = {
  id: number;
  desc: string;
  votes: number;
};
