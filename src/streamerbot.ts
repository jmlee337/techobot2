import { StreamerbotAction, StreamerbotStatus } from './types';
import { StreamerbotClient } from '@streamerbot/client';

export default class Streamerbot {
  private chaosCardsActionId: string;
  private questOpenActionId: string;
  private onStreamerbotStatus: (
    status: StreamerbotStatus,
    message: string,
  ) => void;
  private onStreamerbotActions: (actions: StreamerbotAction[]) => void;
  private onStreamerbotActionsError: (message: string) => void;
  private lastError: Error | null;
  private client: StreamerbotClient;

  constructor(
    port: number,
    chaosCardsActionId: string,
    questOpenActionId: string,
    onStreamerbotStatus: (status: StreamerbotStatus, message: string) => void,
    onStreamerbotActions: (actions: StreamerbotAction[]) => void,
    onStreamerbotActionsError: (message: string) => void,
  ) {
    this.chaosCardsActionId = chaosCardsActionId;
    this.questOpenActionId = questOpenActionId;
    this.onStreamerbotStatus = onStreamerbotStatus;
    this.onStreamerbotActions = onStreamerbotActions;
    this.onStreamerbotActionsError = onStreamerbotActionsError;
    this.lastError = null;
    this.client = new StreamerbotClient({
      port,
      immediate: false,
      retries: 0,
      onDisconnect: () => {
        this.onStreamerbotStatus(
          StreamerbotStatus.DISCONNECTED,
          this.lastError?.message ?? '',
        );
      },
      onError: (error) => {
        this.lastError = error;
      },
    });
  }

  async retry(port: number) {
    await this.client.disconnect();
    this.client = new StreamerbotClient({
      port,
      immediate: false,
      retries: 0,
      onDisconnect: () => {
        this.onStreamerbotStatus(
          StreamerbotStatus.DISCONNECTED,
          this.lastError?.message ?? '',
        );
      },
      onError: (error) => {
        this.lastError = error;
      },
    });
    await this.initialize();
  }

  async initialize() {
    this.onStreamerbotStatus(StreamerbotStatus.CONNECTING, '');
    try {
      await this.client.connect();
      this.onStreamerbotStatus(StreamerbotStatus.CONNECTED, '');
    } catch {
      this.onStreamerbotStatus(
        StreamerbotStatus.DISCONNECTED,
        this.lastError?.message ?? '',
      );
      return;
    }
    try {
      const getActionsResponse = await this.client.getActions();
      if (getActionsResponse.status === 'error') {
        return;
      }

      this.onStreamerbotActions(getActionsResponse.actions);
    } catch (e: unknown) {
      if (e instanceof Error) {
        this.onStreamerbotActionsError(e.message);
      }
    }
  }

  setChaosCardsActionId(id: string) {
    this.chaosCardsActionId = id;
  }

  setQuestOpenActionId(id: string) {
    this.questOpenActionId = id;
  }

  async doChaosCardsAction() {
    if (!this.chaosCardsActionId) {
      throw new Error('chaos cards action not set');
    }
    const response = await this.client.doAction(this.chaosCardsActionId);
    if (response.status === 'error') {
      throw new Error('failed to do chaos cards action');
    }
  }

  async doQuestOpenAction() {
    if (!this.questOpenActionId) {
      throw new Error('quest open action not set');
    }
    const response = await this.client.doAction(this.questOpenActionId);
    if (response.status === 'error') {
      throw new Error('failed to do quest open action');
    }
  }
}
