import {
  AccessToken,
  exchangeCode,
  RefreshingAuthProvider,
} from '@twurple/auth';
import { ChatClient } from '@twurple/chat';
import { shell } from 'electron';
import express from 'express';
import { AddressInfo } from 'net';
import {
  TwitchCallbackServerStatus,
  TwitchChatClientStatus,
  TwitchSettings,
} from './types';
import { Server } from 'http';
import { GracefulShutdownManager } from '@moebius/http-graceful-shutdown';

export default class Twitch {
  private channel: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken: AccessToken | null;
  private setAccessToken: (accessToken: AccessToken) => void;
  private onCallbackServerStatus: (
    callbackServerStatus: TwitchCallbackServerStatus,
    port: number,
  ) => void;
  private onChatClientStatus: (
    chatClientStatus: TwitchChatClientStatus,
  ) => void;

  private chatClient: ChatClient | null;
  private server: Server | null;

  constructor(
    twitchSettings: TwitchSettings,
    accessToken: AccessToken | null,
    setAccessToken: (accessToken: AccessToken) => void,
    onCallbackServerStatus: (
      callbackServerStatus: TwitchCallbackServerStatus,
      port: number,
    ) => void,
    onChatClientStatus: (chatClientStatus: TwitchChatClientStatus) => void,
  ) {
    this.channel = twitchSettings.channel;
    this.clientId = twitchSettings.clientId;
    this.clientSecret = twitchSettings.clientSecret;
    this.accessToken = accessToken;
    this.setAccessToken = setAccessToken;
    this.onCallbackServerStatus = onCallbackServerStatus;
    this.onChatClientStatus = onChatClientStatus;

    this.chatClient = null;
    this.server = null;
  }

  getPort() {
    if (!this.server) {
      return 0;
    }

    const port = (this.server.address() as AddressInfo).port;
    if (!Number.isInteger(port) || port <= 0) {
      throw new Error('could not get server port');
    }
    return port;
  }

  stopCallbackServer() {
    if (!this.server) {
      return;
    }

    new GracefulShutdownManager(this.server).terminate(() => {
      this.server = null;
      this.onCallbackServerStatus(TwitchCallbackServerStatus.STOPPED, 0);
    });
  }

  startCallbackServer() {
    if (this.server) {
      return;
    }

    this.onCallbackServerStatus(TwitchCallbackServerStatus.STARTING, 0);
    const app = express();
    this.server = app.listen(() => {
      this.onCallbackServerStatus(
        TwitchCallbackServerStatus.STARTED,
        this.getPort(),
      );
    });
    const port = this.getPort();
    app.get('/', async (req, res) => {
      const code = req.query.code;
      if (typeof code !== 'string' || code.length === 0) {
        res
          .status(400)
          .send('Failure! Request URL does not contain code param.');
        return;
      }

      try {
        this.accessToken = await exchangeCode(
          this.clientId,
          this.clientSecret,
          code,
          `http://localhost:${port}`,
        );
        this.setAccessToken(this.accessToken);
        res
          .status(200)
          .send('Success! You can close this tab and return to techobot2.');
        this.stopCallbackServer();
        this.startChatClient();
      } catch (e: unknown) {
        res.status(503).send(e instanceof Error ? e.message : e);
      }
    });
  }

  setTwitchSettings(twitchSettings: TwitchSettings) {
    if (
      !twitchSettings.channel ||
      !twitchSettings.clientId ||
      !twitchSettings.clientSecret
    ) {
      throw new Error('must set channel, client ID, and client secret.');
    }

    if (
      twitchSettings.clientId !== this.clientId ||
      twitchSettings.clientSecret !== this.clientSecret ||
      !this.chatClient
    ) {
      this.channel = twitchSettings.channel;
      this.clientId = twitchSettings.clientId;
      this.clientSecret = twitchSettings.clientSecret;
      const port = this.getPort();
      if (!port) {
        throw new Error('must start callback server.');
      }
      shell.openExternal(
        `https://id.twitch.tv/oauth2/authorize?client_id=${this.clientId}&redirect_uri=http://localhost:${port}&response_type=code&scope=chat:read+chat:edit`,
      );
    } else if (twitchSettings.channel !== this.channel) {
      this.chatClient?.part(this.channel);
      this.chatClient?.join(twitchSettings.channel);
      this.channel = twitchSettings.channel;
    }
  }

  stopChatClient() {
    if (!this.chatClient) {
      return;
    }

    this.chatClient.quit();
    this.onChatClientStatus(TwitchChatClientStatus.DISCONNECTED);
  }

  async startChatClient() {
    if (
      !this.channel ||
      !this.clientId ||
      !this.clientSecret ||
      !this.accessToken
    ) {
      return false;
    }

    this.stopChatClient();
    this.onChatClientStatus(TwitchChatClientStatus.CONNECTING);

    const authProvider = new RefreshingAuthProvider({
      clientId: this.clientId,
      clientSecret: this.clientSecret,
    });
    authProvider.onRefresh((userId, accessToken) => {
      this.accessToken = accessToken;
      this.setAccessToken(this.accessToken);
    });
    await authProvider.addUserForToken(this.accessToken, ['chat']);

    this.chatClient = new ChatClient({
      authProvider,
      channels: [this.channel],
      webSocket: true,
    });
    this.chatClient.onConnect(() => {
      this.onChatClientStatus(TwitchChatClientStatus.CONNECTED);
    });
    this.chatClient.onJoin((channel) => {
      this.chatClient?.say(channel, 'hey chat');
    });
    this.chatClient.onMessage((channel, user, text, msg) => {
      if (text === '!techobot') {
        this.chatClient?.say(channel, 'techobot2');
      } else if (msg.isRedemption) {
        this.chatClient?.say(channel, `rewardId: ${msg.rewardId}`);
      }
    });
    this.chatClient.connect();
    return true;
  }
}
