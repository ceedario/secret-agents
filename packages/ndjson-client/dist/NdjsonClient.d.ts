import { EventEmitter } from 'events';
import type { NdjsonClientConfig, NdjsonClientEvents, EdgeEvent, StatusUpdate } from './types.js';
export declare interface NdjsonClient {
  on<K extends keyof NdjsonClientEvents>(event: K, listener: NdjsonClientEvents[K]): this;
  emit<K extends keyof NdjsonClientEvents>(
    event: K,
    ...args: Parameters<NdjsonClientEvents[K]>
  ): boolean;
}
/**
 * NDJSON streaming client for proxy communication
 */
export declare class NdjsonClient extends EventEmitter {
  private proxyUrl;
  private token;
  private connected;
  private reconnectAttempts;
  private maxReconnectAttempts;
  private reconnectBaseDelay;
  private abortController;
  private reconnecting;
  constructor(config: NdjsonClientConfig);
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
//# sourceMappingURL=NdjsonClient.d.ts.map
