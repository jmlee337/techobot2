import { DDDiceRoom, DDDiceTheme } from './types';

export default class DDDice {
  private apiKey: string;
  private roomSlug: string;
  private themeId: string;

  private rooms: DDDiceRoom[];
  private themes: DDDiceTheme[];

  constructor(apiKey: string, roomSlug: string, themeId: string) {
    this.apiKey = apiKey;
    this.roomSlug = roomSlug;
    this.themeId = themeId;
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
    return response.json();
  }

  async getUsername() {
    const usernameResponse = await this.fetchApi(
      'https://dddice.com/api/1.0/user',
      'GET',
    );
    return usernameResponse.data.username;
  }

  async getRooms() {
    let page = 1;
    let pages = -1;
    const rooms: DDDiceRoom[] = [];
    do {
      const roomsResponse = await this.fetchApi(
        'https://dddice.com/api/1.0/room?created=1',
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
    return this.rooms;
  }

  async getThemes() {
    let page = 1;
    let pages = -1;
    const themes: DDDiceTheme[] = [];
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
    return this.themes;
  }

  setApiKey(apiKey: string) {
    if (!apiKey) {
      throw new Error('invalid api key');
    }

    this.apiKey = apiKey;
    return this.getUsername();
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

  async testRoll() {
    await this.fetchApi('https://dddice.com/api/1.0/roll', 'POST', {
      dice: [{ type: 'd20', theme: this.themeId }],
      room: this.roomSlug,
    });
  }
}
