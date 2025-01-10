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
import { ApiClient, HelixModerator, HelixPaginatedResult } from '@twurple/api';
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

  private apiClient: ApiClient | null;
  private channel: string;
  private chatClient: ChatClient | null;
  private eventSubWsListener: EventSubWsListener | null;
  private server: Server | null;
  private serverConnection: TwitchConnection | null;
  private userId: string;
  private redemptionCallback:
    | ((event: EventSubChannelRedemptionAddEvent) => void)
    | null;
  private onSeenCallback: ((userId: string) => void) | null;
  private seenUserIdToUserName: Map<string, string>;
  private moderatorUserIds: Set<string>;
  private onCommandCallback:
    | ((lowerCommand: string, userId: string, userName: string) => void)
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

    this.apiClient = null;
    this.channel = '';
    this.chatClient = null;
    this.eventSubWsListener = null;
    this.server = null;
    this.serverConnection = null;
    this.userId = '';
    this.redemptionCallback = null;
    this.onSeenCallback = null;
    this.seenUserIdToUserName = new Map();
    this.moderatorUserIds = new Set();
    this.onCommandCallback = null;
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
        `https://id.twitch.tv/oauth2/authorize?client_id=${twitchClient.clientId}&redirect_uri=http://localhost:${port}&response_type=code&scope=chat:read+chat:edit+channel:manage:redemptions+moderator:read:chatters+moderation:read`,
      );
    }
  }

  async stopBot() {
    if (!this.chatClient) {
      return;
    }

    this.chatClient.removeListener();
    return new Promise<void>((resolve) => {
      if (!this.chatClient) {
        resolve();
        return;
      }

      this.chatClient.onDisconnect(() => {
        this.chatClient = null;
        this.onBotStatus(TwitchConnectionStatus.DISCONNECTED, '');
        resolve();
      });
      this.chatClient.quit();
    });
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

    await this.stopBot();
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
    this.chatClient.onMessage((channel, user, text, msg) => {
      const { userId, userName } = msg.userInfo;
      if (!this.seenUserIdToUserName.has(userId)) {
        this.seenUserIdToUserName.set(userId, userName);
        if (this.onSeenCallback) {
          this.onSeenCallback(userId);
        }
      }
      const lowerText = text.toLowerCase();
      if (lowerText.startsWith(`@${botUserName}`)) {
        const modCommands = this.isModerator(userId) ? ' !chaoscards ' : '';
        this.chatClient?.say(
          channel,
          `!tally !tallyrules !tallytop !tallylast ${modCommands}- techobot2 made by Nicolet (@jmlee337)`,
        );
      } else if (lowerText.startsWith('!') && this.onCommandCallback) {
        this.onCommandCallback(lowerText.slice(1), userId, userName);
      }
    });
    this.chatClient.connect();
    return true;
  }

  async stopChannel() {
    if (!this.eventSubWsListener) {
      return;
    }

    this.eventSubWsListener.removeListener();
    return new Promise<void>((resolve) => {
      if (!this.eventSubWsListener) {
        resolve();
        return;
      }

      this.eventSubWsListener.onUserSocketDisconnect(() => {
        this.eventSubWsListener = null;
        this.onChannelStatus(TwitchConnectionStatus.DISCONNECTED, '');
        resolve();
      });
      this.eventSubWsListener.stop();
    });
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

    await this.stopChannel();
    this.onChannelStatus(TwitchConnectionStatus.CONNECTING, '');

    const authProvider = new RefreshingAuthProvider(this.channelClient);
    authProvider.onRefresh((useId, accessToken) => {
      this.channelAccessToken = accessToken;
      this.setChannelAccessToken(this.channelAccessToken);
    });
    await authProvider.addUser(this.userId, this.channelAccessToken);

    this.apiClient = new ApiClient({ authProvider });

    let after: string | undefined = '';
    try {
      do {
        const page = (await this.apiClient.moderation.getModerators(
          this.userId,
          {
            after,
          },
        )) as HelixPaginatedResult<HelixModerator>;
        for (const helixModerator of page.data) {
          this.moderatorUserIds.add(helixModerator.userId);
        }
        after = page.cursor;
      } while (after);
    } catch {
      // just catch
    }

    this.eventSubWsListener = new EventSubWsListener({
      apiClient: this.apiClient,
    });
    this.eventSubWsListener.onChannelModeratorAdd(this.userId, (event) => {
      this.moderatorUserIds.add(event.userId);
    });
    this.eventSubWsListener.onChannelModeratorRemove(this.userId, (event) => {
      this.moderatorUserIds.delete(event.userId);
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

  onSeen(callback: (userId: string) => void) {
    this.onSeenCallback = callback;
  }

  onCommand(
    callback: (lowerCommand: string, userId: string, userName: string) => void,
  ) {
    this.onCommandCallback = callback;
  }

  say(text: string) {
    this.chatClient?.say(this.channel, text);
  }

  getChatters() {
    return Array.from(this.seenUserIdToUserName).map(([userId, userName]) => ({
      userId,
      userName,
    }));
  }

  async getUserId(userName: string) {
    if (!this.apiClient) {
      throw new Error('no api client');
    }

    const user = await this.apiClient.users.getUserByName(userName);
    if (!user) {
      throw new Error('user not found');
    }

    return user.id;
  }

  isModerator(userId: string) {
    return this.moderatorUserIds.has(userId) || this.userId === userId;
  }

  isOpen() {
    return !!(this.chatClient || this.eventSubWsListener);
  }
}
