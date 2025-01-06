import {
  DDDiceFetchStatus,
  DDDiceRoom,
  DDDiceTheme,
  ParsedRoll,
} from './types';

export default class DDDice {
  private apiKey: string;
  private roomSlug: string;
  private themeId: string;
  private onUsername: (
    status: DDDiceFetchStatus,
    username: string,
    message: string,
  ) => void;
  private onRooms: (
    status: DDDiceFetchStatus,
    rooms: DDDiceRoom[],
    message: string,
  ) => void;
  private onThemes: (
    status: DDDiceFetchStatus,
    themes: DDDiceTheme[],
    message: string,
  ) => void;

  private rooms: DDDiceRoom[];
  private themes: DDDiceTheme[];

  constructor(
    apiKey: string,
    roomSlug: string,
    themeId: string,
    onUsername: (
      status: DDDiceFetchStatus,
      username: string,
      message: string,
    ) => void,
    onRooms: (
      status: DDDiceFetchStatus,
      rooms: DDDiceRoom[],
      message: string,
    ) => void,
    onThemes: (
      status: DDDiceFetchStatus,
      themes: DDDiceTheme[],
      message: string,
    ) => void,
  ) {
    this.apiKey = apiKey;
    this.roomSlug = roomSlug;
    this.themeId = themeId;
    this.onUsername = onUsername;
    this.onRooms = onRooms;
    this.onThemes = onThemes;
  }

  async initialize() {
    if (!this.apiKey) {
      return;
    }

    this.getUsername();
    this.getRooms();
    this.getThemes();
  }

  async fetchApi(url: string, method: string, body?: object) {
    if (!this.apiKey) {
      throw new Error('no api key');
    }

    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(body),
    });
    const json = await response.json();
    if (json.type === 'error') {
      throw new Error(json.data.message as string);
    }
    return json;
  }

  async getUsername() {
    this.onUsername(DDDiceFetchStatus.FETCHING, '', '');
    try {
      const usernameResponse = await this.fetchApi(
        'https://dddice.com/api/1.0/user',
        'GET',
      );
      this.onUsername(
        DDDiceFetchStatus.FETCHED,
        usernameResponse.data.username,
        '',
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '';
      this.onUsername(DDDiceFetchStatus.NONE, '', message);
    }
  }

  async getRooms() {
    let page = 1;
    let pages = -1;
    const rooms: DDDiceRoom[] = [];
    this.onRooms(DDDiceFetchStatus.FETCHING, [], '');
    try {
      do {
        const roomsResponse = await this.fetchApi(
          `https://dddice.com/api/1.0/room?page=${page}`,
          'GET',
        );
        rooms.push(
          ...roomsResponse.data.map((room: { name: string; slug: string }) => ({
            name: room.name,
            slug: room.slug,
          })),
        );
        pages = roomsResponse.meta.to;
        page++;
      } while (page <= pages);
      this.rooms = rooms;
      this.onRooms(DDDiceFetchStatus.FETCHED, rooms, '');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '';
      this.onRooms(DDDiceFetchStatus.NONE, [], message);
    }
  }

  async getThemes() {
    let page = 1;
    let pages = -1;
    const themes: DDDiceTheme[] = [];
    this.onThemes(DDDiceFetchStatus.FETCHING, [], '');
    try {
      do {
        const themesResponse = await this.fetchApi(
          `https://dddice.com/api/1.0/dice-box?page=${page}`,
          'GET',
        );
        themes.push(
          ...themesResponse.data.map((theme: { id: string; name: string }) => ({
            id: theme.id,
            name: theme.name,
          })),
        );
        pages = themesResponse.meta.to;
        page++;
      } while (page <= pages);
      this.themes = themes;
      this.onThemes(DDDiceFetchStatus.FETCHED, themes, '');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '';
      this.onThemes(DDDiceFetchStatus.NONE, [], message);
    }
  }

  setApiKey(apiKey: string) {
    if (!apiKey) {
      throw new Error('invalid api key');
    }

    this.apiKey = apiKey;
    this.getUsername();
    this.getRooms();
    this.getThemes();
  }

  setRoomSlug(roomSlug: string) {
    if (!this.rooms.find((room) => room.slug === roomSlug)) {
      throw new Error('invalid room slug');
    }

    this.roomSlug = roomSlug;
  }

  setThemeId(themeId: string) {
    if (!this.themes.find((theme) => theme.id === themeId)) {
      throw new Error('invalid theme id');
    }

    this.themeId = themeId;
  }

  async roll({ type, mult }: ParsedRoll) {
    let dice: { type: string; theme: string }[];
    if (type === 'd100') {
      dice = new Array(mult * 2);
      for (let i = 0; i < dice.length; i += 2) {
        dice[i] = { type: 'd10x', theme: this.themeId };
        dice[i + 1] = { type: 'd10', theme: this.themeId };
      }
    } else {
      dice = new Array(mult).fill({
        type,
        theme: this.themeId,
      });
    }
    const response = await this.fetchApi(
      'https://dddice.com/api/1.0/roll',
      'POST',
      {
        dice,
        room: this.roomSlug,
      },
    );
    const total = response.data.total_value;
    const values = response.data.values.map(
      (die: { value: number }) => die.value,
    );
    return `[${values.join(', ')}]: ${total} total`;
  }
}
