import {
  AccessToken,
  accessTokenIsExpired,
  exchangeCode,
  getTokenInfo,
  RefreshingAuthProvider,
  refreshUserToken,
} from '@twurple/auth';
import { ChatClient } from '@twurple/chat';
import { shell } from 'electron';
import express from 'express';
import { AddressInfo, Server } from 'net';
import {
  TwitchCallbackServerStatus,
  TwitchConnectionStatus,
  TwitchClient,
  TwitchConnection,
} from './types';
import GracefulShutdown from 'http-graceful-shutdown';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import { ApiClient } from '@twurple/api';
import { EventSubChannelRedemptionAddEvent } from '@twurple/eventsub-base';

export default class Twitch {
  private botClient: TwitchClient;
  private botAccessToken: AccessToken | null;
  private channelClient: TwitchClient;
  private channelAccessToken: AccessToken | null;
  private setBotAccessToken: (accessToken: AccessToken) => void;
  private setChannelAccessToken: (accessToken: AccessToken) => void;
  private onCallbackServerStatus: (
    callbackServerStatus: TwitchCallbackServerStatus,
    port: number,
  ) => void;
  private onBotStatus: (
    botStatus: TwitchConnectionStatus,
    message: string,
  ) => void;
  private onChannelStatus: (
    channelStatus: TwitchConnectionStatus,
    message: string,
  ) => void;
  private onBotUserName: (botUserName: string) => void;
  private onChannel: (channel: string) => void;

  private channel: string;
  private chatClient: ChatClient | null;
  private eventSubWsListener: EventSubWsListener | null;
  private server: Server | null;
  private serverConnection: TwitchConnection | null;
  private userId: string;
  private redemptionCallback:
    | ((event: EventSubChannelRedemptionAddEvent) => void)
    | null;

  constructor(
    botClient: TwitchClient,
    botAccessToken: AccessToken | null,
    channelClient: TwitchClient,
    channelAccessToken: AccessToken | null,
    setBotAccessToken: (accessToken: AccessToken) => void,
    setChannelAccessToken: (accessToken: AccessToken) => void,
    onCallbackServerStatus: (
      callbackServerStatus: TwitchCallbackServerStatus,
      port: number,
    ) => void,
    onBotStatus: (botStatus: TwitchConnectionStatus, message: string) => void,
    onChannelStatus: (
      channelStatus: TwitchConnectionStatus,
      message: string,
    ) => void,
    onBotUserName: (botUserName: string) => void,
    onChannel: (channel: string) => void,
  ) {
    this.botClient = botClient;
    this.botAccessToken = botAccessToken;
    this.channelClient = channelClient;
    this.channelAccessToken = channelAccessToken;
    this.setBotAccessToken = setBotAccessToken;
    this.setChannelAccessToken = setChannelAccessToken;
    this.onCallbackServerStatus = onCallbackServerStatus;
    this.onBotStatus = onBotStatus;
    this.onChannelStatus = onChannelStatus;
    this.onBotUserName = onBotUserName;
    this.onChannel = onChannel;

    this.channel = '';
    this.chatClient = null;
    this.eventSubWsListener = null;
    this.server = null;
    this.serverConnection = null;
    this.userId = '';
    this.redemptionCallback = null;
  }

  async initialize() {
    try {
      const started = await this.startChannel();
      if (started) {
        try {
          await this.startBot();
        } catch (e: unknown) {
          if (e instanceof Error) {
            this.onBotStatus(TwitchConnectionStatus.DISCONNECTED, e.message);
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        this.onChannelStatus(TwitchConnectionStatus.DISCONNECTED, e.message);
      }
    }
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

    GracefulShutdown(this.server, {
      finally: () => {
        this.server = null;
        this.serverConnection = null;
        this.onCallbackServerStatus(TwitchCallbackServerStatus.STOPPED, 0);
        console.log('server stopped');
      },
    })();
  }

  startCallbackServer(twitchConnection: TwitchConnection) {
    if (this.server) {
      throw new Error(`server already started for ${this.serverConnection}`);
    }
    if (
      twitchConnection !== TwitchConnection.BOT &&
      twitchConnection !== TwitchConnection.CHANNEL
    ) {
      throw new Error(`invalid twitch connection: ${twitchConnection}`);
    }

    this.onCallbackServerStatus(TwitchCallbackServerStatus.STARTING, 0);
    const app = express();
    this.server = app.listen(() => {
      this.onCallbackServerStatus(
        TwitchCallbackServerStatus.STARTED,
        this.getPort(),
      );
    });
    this.serverConnection = twitchConnection;
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
        let client: TwitchClient;
        if (twitchConnection === TwitchConnection.BOT) {
          client = this.botClient;
        } else if (twitchConnection === TwitchConnection.CHANNEL) {
          client = this.channelClient;
        } else {
          throw new Error('unreachable');
        }
        const newAccessToken = await exchangeCode(
          client.clientId,
          client.clientSecret,
          code,
          `http://localhost:${port}`,
        );
        res
          .status(200)
          .send('Success! You can close this tab and return to techobot2.');
        if (twitchConnection === TwitchConnection.BOT) {
          this.botAccessToken = newAccessToken;
          this.setBotAccessToken(this.botAccessToken);
          this.startBot();
        } else if (twitchConnection === TwitchConnection.CHANNEL) {
          this.channelAccessToken = newAccessToken;
          this.setChannelAccessToken(this.channelAccessToken);
          const started = await this.startChannel();
          if (started) {
            this.startBot();
          }
        } else {
          throw new Error('unreachable');
        }
        this.stopCallbackServer();
      } catch (e: unknown) {
        res.status(503).send(e instanceof Error ? e.message : e);
      }
    });
  }

  setTwitchClient(
    twitchConnection: TwitchConnection,
    twitchClient: TwitchClient,
  ) {
    let oldClient: TwitchClient;
    if (twitchConnection === TwitchConnection.BOT) {
      oldClient = this.botClient;
    } else if (twitchConnection === TwitchConnection.CHANNEL) {
      oldClient = this.channelClient;
    } else {
      throw new Error(`invalid twitch connection: ${twitchConnection}`);
    }
    if (!twitchClient.clientId || !twitchClient.clientSecret) {
      throw new Error('must set client ID and client secret.');
    }

    if (
      twitchClient.clientId !== oldClient.clientId ||
      twitchClient.clientSecret !== oldClient.clientSecret ||
      !this.chatClient
    ) {
      if (twitchConnection === TwitchConnection.BOT) {
        this.botClient = twitchClient;
      } else if (twitchConnection === TwitchConnection.CHANNEL) {
        this.channelClient = twitchClient;
      } else {
        throw new Error('unreachable');
      }
      const port = this.getPort();
      if (!port) {
        throw new Error('must start callback server.');
      }
      shell.openExternal(
        `https://id.twitch.tv/oauth2/authorize?client_id=${twitchClient.clientId}&redirect_uri=http://localhost:${port}&response_type=code&scope=chat:read+chat:edit+channel:manage:redemptions`,
      );
    }
  }

  stopBot() {
    if (!this.chatClient) {
      return;
    }

    this.chatClient.quit();
    this.chatClient = null;
    this.onBotStatus(TwitchConnectionStatus.DISCONNECTED, '');
  }

  async startBot(): Promise<boolean> {
    if (
      !this.botClient.clientId ||
      !this.botClient.clientSecret ||
      !this.botAccessToken
    ) {
      return false;
    }

    if (accessTokenIsExpired(this.botAccessToken)) {
      if (!this.botAccessToken.refreshToken) {
        throw new Error('no refresh token');
      }
      this.botAccessToken = await refreshUserToken(
        this.botClient.clientId,
        this.botClient.clientSecret,
        this.botAccessToken.refreshToken,
      );
      this.setBotAccessToken(this.botAccessToken);
    }
    const tokenInfo = await getTokenInfo(
      this.botAccessToken.accessToken,
      this.botClient.clientId,
    );
    if (!tokenInfo.userName) {
      throw new Error('could not get bot user name');
    }
    const botUserName = tokenInfo.userName;
    this.onBotUserName(botUserName);
    if (!tokenInfo.userId) {
      throw new Error('could not get bot user id');
    }

    if (!this.channel) {
      return false;
    }

    this.stopBot();
    this.onBotStatus(TwitchConnectionStatus.CONNECTING, '');

    const authProvider = new RefreshingAuthProvider(this.botClient);
    authProvider.onRefresh((userId, accessToken) => {
      this.botAccessToken = accessToken;
      this.setBotAccessToken(this.botAccessToken);
    });
    await authProvider.addUser(tokenInfo.userId, this.botAccessToken, ['chat']);

    this.chatClient = new ChatClient({
      authProvider,
      channels: [this.channel],
      webSocket: true,
    });
    this.chatClient.onConnect(() => {
      this.onBotStatus(TwitchConnectionStatus.CONNECTED, '');
    });
    this.chatClient.onDisconnect((manually, error) => {
      this.onBotStatus(
        TwitchConnectionStatus.DISCONNECTED,
        error?.message ?? '',
      );
    });
    this.chatClient.onJoin((channel) => {
      this.chatClient?.say(
        channel,
        "I'm back! My memory is a bit foggy, what did I miss?",
      );
    });
    this.chatClient.onMessage((channel, user, text) => {
      const lowerText = text.toLowerCase();
      if (
        lowerText === '!techobot' ||
        lowerText === '!techobot2' ||
        lowerText === '!techobot 2' ||
        lowerText.includes(`@${botUserName.toLowerCase()}`)
      ) {
        this.chatClient?.say(channel, 'techobot2');
      }
    });
    this.chatClient.connect();
    return true;
  }

  stopChannel() {
    if (!this.eventSubWsListener) {
      return;
    }

    this.eventSubWsListener.stop();
    this.eventSubWsListener = null;
    this.onChannelStatus(TwitchConnectionStatus.DISCONNECTED, '');
  }

  async startChannel(): Promise<boolean> {
    if (
      !this.channelClient.clientId ||
      !this.channelClient.clientSecret ||
      !this.channelAccessToken
    ) {
      return false;
    }

    if (accessTokenIsExpired(this.channelAccessToken)) {
      if (!this.channelAccessToken.refreshToken) {
        throw new Error('no refresh token');
      }
      this.channelAccessToken = await refreshUserToken(
        this.channelClient.clientId,
        this.channelClient.clientSecret,
        this.channelAccessToken.refreshToken,
      );
      this.setChannelAccessToken(this.channelAccessToken);
    }
    const tokenInfo = await getTokenInfo(
      this.channelAccessToken.accessToken,
      this.channelClient.clientId,
    );
    if (!tokenInfo.userName) {
      throw new Error('could not get channel name');
    }
    this.channel = tokenInfo.userName;
    this.onChannel(this.channel);
    if (!tokenInfo.userId) {
      throw new Error('could not get channel user id');
    }
    this.userId = tokenInfo.userId;

    this.stopChannel();
    this.onChannelStatus(TwitchConnectionStatus.CONNECTING, '');

    const authProvider = new RefreshingAuthProvider(this.channelClient);
    authProvider.onRefresh((useId, accessToken) => {
      this.channelAccessToken = accessToken;
      this.setChannelAccessToken(this.channelAccessToken);
    });
    await authProvider.addUser(this.userId, this.channelAccessToken);

    this.eventSubWsListener = new EventSubWsListener({
      apiClient: new ApiClient({ authProvider }),
    });
    if (this.redemptionCallback) {
      this.eventSubWsListener.onChannelRedemptionAdd(
        this.userId,
        this.redemptionCallback,
      );
    }
    this.eventSubWsListener.onUserSocketConnect(() => {
      this.onChannelStatus(TwitchConnectionStatus.CONNECTED, '');
    });
    this.eventSubWsListener.onUserSocketDisconnect((userId, error) => {
      this.onChannelStatus(
        TwitchConnectionStatus.DISCONNECTED,
        error?.message ?? '',
      );
      this.eventSubWsListener = null;
    });
    this.eventSubWsListener.start();
    return true;
  }

  onRedemption(callback: (event: EventSubChannelRedemptionAddEvent) => void) {
    this.redemptionCallback = callback;
    if (this.eventSubWsListener) {
      this.eventSubWsListener.onChannelRedemptionAdd(
        this.userId,
        this.redemptionCallback,
      );
    }
  }

  say(text: string) {
    this.chatClient?.say(this.channel, text);
  }
}
