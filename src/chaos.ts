import { app, shell } from 'electron';
import { copyFile } from 'fs/promises';
import path from 'node:path';
import { WebSocket, WebSocketServer } from 'ws';
import { Card, ChaosStatus } from './types';
import getYugiohCard from './cards/yugioh';

export default class Chaos {
  private onStatus: (status: ChaosStatus, message: string) => void;

  private path: string;
  private server: WebSocketServer | null;
  private ws: WebSocket | null;

  constructor(onStatus: (status: ChaosStatus, message: string) => void) {
    this.onStatus = onStatus;

    this.path = app.isPackaged
      ? path.join(process.resourcesPath, 'chaosCards.html')
      : path.join(__dirname, '../../src/extraResource/chaosCards.html');
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
      this.onStatus(ChaosStatus.CONNECTED, '');
    });
    try {
      await copyFile(
        this.path,
        path.join(app.getPath('userData'), 'chaosCards.html'),
      );
    } catch (e: unknown) {
      if (e instanceof Error) {
        this.onStatus(ChaosStatus.NONE, e.message);
      }
    }
  }

  showHtml() {
    shell.openPath(this.path);
  }

  private async getCard() {
    return getYugiohCard();
  }

  async chaosCard() {
    if (!this.ws) {
      throw new Error('no WebSocketClient');
    }

    const card = await this.getCard();
    await new Promise<void>((resolve, reject) => {
      if (!this.ws) {
        reject('no WebSocketClient');
        return;
      }
      this.ws.send(JSON.stringify([card]), (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async chaosPlus() {
    if (!this.ws) {
      throw new Error('no WebSocketClient');
    }

    const cards: Card[] = [];
    for (let i = 0; i < 3; i++) {
      cards.push(await this.getCard());
    }
    await new Promise<void>((resolve, reject) => {
      if (!this.ws) {
        reject('no WebSocketClient');
        return;
      }
      this.ws.send(JSON.stringify(cards), (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
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
