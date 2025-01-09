import { app, shell } from 'electron';
import { copyFile } from 'fs/promises';
import path from 'node:path';
import { WebSocket, WebSocketServer } from 'ws';
import { Card, ChaosStatus } from './types';
import getYugiohCard from './cards/yugioh';
import getPokemonCard from './cards/pokemon';
import getTarotCard from './cards/tarot';

async function getCard() {
  switch (Math.floor(Math.random() * 3)) {
    case 0:
      return getYugiohCard();
    case 1:
      return getPokemonCard();
    case 2:
      return getTarotCard();
    default:
      throw new Error('getCard oob');
  }
}

export default class Chaos {
  private onStatus: (status: ChaosStatus, message: string) => void;

  private path: string;
  private files: { fullPath: string; fileName: string }[];
  private server: WebSocketServer | null;
  private ws: WebSocket | null;

  constructor(onStatus: (status: ChaosStatus, message: string) => void) {
    this.onStatus = onStatus;

    this.files = [
      'chaosCards.html',
      'card-back-ptcg.png',
      'card-back-tarot.png',
      'card-back-yugioh.png',
    ].map((fileName) => ({
      fileName,
      fullPath: app.isPackaged
        ? path.join(process.resourcesPath, fileName)
        : path.join(__dirname, '../../src/extraResource', fileName),
    }));
    this.server = null;
  }

  async initialize() {
    this.onStatus(ChaosStatus.STARTING, '');
    this.server = new WebSocketServer({ port: 51440 }, () => {
      this.onStatus(ChaosStatus.STARTED, '');
    });
    this.server.shouldHandle = () => !this.ws;
    this.server.on('close', () => {
      this.onStatus(ChaosStatus.NONE, 'WebSocketServer closed');
    });
    this.server.on('connection', (ws) => {
      this.ws = ws;
      this.ws.onclose = () => {
        this.ws = null;
        this.onStatus(ChaosStatus.STARTED, '');
      };
      this.ws.send(JSON.stringify({ version: 1 }));
      this.onStatus(ChaosStatus.CONNECTED, '');
    });
    const userDataPath = app.getPath('userData');
    for (const file of this.files) {
      try {
        await copyFile(file.fullPath, path.join(userDataPath, file.fileName));
      } catch (e: unknown) {
        if (e instanceof Error) {
          this.onStatus(ChaosStatus.NONE, e.message);
        }
      }
    }
  }

  showHtml() {
    shell.openPath(this.path);
  }

  async chaosCard() {
    if (!this.ws) {
      throw new Error('no WebSocketClient');
    }

    const card = await getCard();
    return new Promise<Card>((resolve, reject) => {
      if (!this.ws) {
        reject('no WebSocketClient');
        return;
      }
      this.ws.send(JSON.stringify({ cards: [card] }), (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(card);
        }
      });
    });
  }

  async chaosPlus() {
    if (!this.ws) {
      throw new Error('no WebSocketClient');
    }

    const cards = await Promise.all([
      getYugiohCard(),
      getTarotCard(),
      getPokemonCard(),
    ]);
    return new Promise<Card[]>((resolve, reject) => {
      if (!this.ws) {
        reject('no WebSocketClient');
        return;
      }
      this.ws.send(JSON.stringify({ cards }), (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(cards);
        }
      });
    });
  }

  isOpen() {
    return !!this.ws;
  }

  async close() {
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    if (this.server) {
      this.server.removeAllListeners();
      await new Promise<void>((resolve) => {
        if (this.server) {
          this.server.close(() => {
            resolve();
          });
        } else {
          resolve();
        }
      });
      this.server = null;
    }
  }
}
