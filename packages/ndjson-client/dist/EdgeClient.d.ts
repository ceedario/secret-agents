import { EventEmitter } from 'events';
import type { EdgeClientConfig, EdgeClientEvents, EdgeEvent, StatusUpdate } from './types';
export declare interface EdgeClient {
  on<K extends keyof EdgeClientEvents>(event: K, listener: EdgeClientEvents[K]): this;
  emit<K extends keyof EdgeClientEvents>(
    event: K,
    ...args: Parameters<EdgeClientEvents[K]>
  ): boolean;
}
/**
 * Base NDJSON client for connecting edge workers to Cyrus proxy
 */
export declare class EdgeClient extends EventEmitter {
  private proxyUrl;
  private token;
  private connected;
  private reconnectAttempts;
  private maxReconnectAttempts;
  private reconnectBaseDelay;
  private abortController;
  private reconnecting;
  constructor(config: EdgeClientConfig);
  /**
   * Connect to the proxy and start receiving events
   */
  connect(): Promise<void>;
  /**
   * Process the NDJSON stream
   */
  private processStream;
  /**
   * Handle a single event from the stream
   */
  protected handleEvent(event: EdgeEvent): Promise<void>;
  /**
   * Send status update to proxy
   */
  sendStatus(update: StatusUpdate): Promise<void>;
  /**
   * Attempt to reconnect with exponential backoff
   */
  private reconnect;
  /**
   * Disconnect from the proxy
   */
  disconnect(): void;
  /**
   * Check if client is connected
   */
  isConnected(): boolean;
}
//# sourceMappingURL=EdgeClient.d.ts.map
