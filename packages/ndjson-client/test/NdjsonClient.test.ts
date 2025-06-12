import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NdjsonClient } from '../src/NdjsonClient';
import type { EdgeEvent, NdjsonClientConfig, StatusUpdate, WebhookEvent } from '../src/types';

// Mock fetch globally
global.fetch = vi.fn();

// Mock ReadableStream
class MockReadableStream {
  private chunks: Uint8Array[];
  private index = 0;

  constructor(chunks: string[]) {
    const encoder = new TextEncoder();
    this.chunks = chunks.map((chunk) => encoder.encode(chunk));
  }

  getReader() {
    return {
      read: async () => {
        if (this.index >= this.chunks.length) {
          return { done: true, value: undefined };
        }
        const value = this.chunks[this.index++];
        return { done: false, value };
      },
      releaseLock: () => {},
    };
  }
}

describe('NdjsonClient', () => {
  let client: NdjsonClient;
  let config: NdjsonClientConfig;
  const mockFetch = global.fetch as any;

  beforeEach(() => {
    vi.clearAllMocks();

    config = {
      proxyUrl: 'https://proxy.test',
      token: 'test-token-123',
      maxReconnectAttempts: 3,
      reconnectBaseDelay: 100,
    };
  });

  afterEach(() => {
    if (client) {
      client.disconnect();
    }
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      client = new NdjsonClient(config);
      expect(client).toBeDefined();
      expect(client.isConnected()).toBe(false);
    });

    it('should register config callbacks as event listeners', () => {
      const onEvent = vi.fn();
      const onConnect = vi.fn();
      const onDisconnect = vi.fn();
      const onError = vi.fn();

      client = new NdjsonClient({
        ...config,
        onEvent,
        onConnect,
        onDisconnect,
        onError,
      });

      client.emit('event', { id: '1', type: 'heartbeat', timestamp: '2024-01-01' });
      client.emit('connect');
      client.emit('disconnect', 'test');
      client.emit('error', new Error('test'));

      expect(onEvent).toHaveBeenCalled();
      expect(onConnect).toHaveBeenCalled();
      expect(onDisconnect).toHaveBeenCalledWith('test');
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should use default values for optional config', () => {
      client = new NdjsonClient({
        proxyUrl: 'https://proxy.test',
        token: 'test-token',
      });

      // Test by triggering reconnect logic
      expect(client).toBeDefined();
    });
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      const stream = new MockReadableStream([]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: stream,
      });

      const connectListener = vi.fn();
      client = new NdjsonClient(config);
      client.on('connect', connectListener);

      await client.connect();

      expect(mockFetch).toHaveBeenCalledWith('https://proxy.test/events/stream', {
        headers: {
          Authorization: 'Bearer test-token-123',
          Accept: 'application/x-ndjson',
        },
        signal: expect.any(AbortSignal),
      });

      expect(connectListener).toHaveBeenCalled();
      expect(client.isConnected()).toBe(false); // Stream ended immediately
    });

    it('should handle connection failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const errorListener = vi.fn();
      client = new NdjsonClient(config);
      client.on('error', errorListener);

      await client.connect();

      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to connect: 401 Unauthorized',
        })
      );
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const errorListener = vi.fn();
      client = new NdjsonClient(config);
      client.on('error', errorListener);

      await client.connect();

      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Network error',
        })
      );
    });

    it('should handle abort gracefully', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const disconnectListener = vi.fn();
      const errorListener = vi.fn();

      client = new NdjsonClient(config);
      client.on('disconnect', disconnectListener);
      client.on('error', errorListener);

      await client.connect();

      expect(disconnectListener).toHaveBeenCalledWith('Connection aborted');
      expect(errorListener).not.toHaveBeenCalled();
    });
  });

  describe('stream processing', () => {
    it('should process NDJSON events', async () => {
      const events: EdgeEvent[] = [
        { id: '1', type: 'connection', timestamp: '2024-01-01', data: { message: 'Connected' } },
        { id: '2', type: 'heartbeat', timestamp: '2024-01-02' },
        { id: '3', type: 'webhook', timestamp: '2024-01-03', data: { type: 'issueUpdate' } },
      ];

      const stream = new MockReadableStream([
        events.map((e) => JSON.stringify(e)).join('\n') + '\n',
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const eventListener = vi.fn();
      const heartbeatListener = vi.fn();
      const webhookListener = vi.fn();
      const disconnectListener = vi.fn();

      client = new NdjsonClient(config);
      client.on('event', eventListener);
      client.on('heartbeat', heartbeatListener);
      client.on('webhook', webhookListener);
      client.on('disconnect', disconnectListener);

      await client.connect();

      expect(eventListener).toHaveBeenCalledTimes(3);
      expect(eventListener).toHaveBeenCalledWith(events[0]);
      expect(eventListener).toHaveBeenCalledWith(events[1]);
      expect(eventListener).toHaveBeenCalledWith(events[2]);

      expect(heartbeatListener).toHaveBeenCalledTimes(1);
      expect(webhookListener).toHaveBeenCalledWith({ type: 'issueUpdate' });
      expect(disconnectListener).toHaveBeenCalledWith('Stream ended');
    });

    it('should handle partial messages across chunks', async () => {
      const event: EdgeEvent = {
        id: '1',
        type: 'webhook',
        timestamp: '2024-01-01',
        data: { type: 'test', payload: { large: 'object' } },
      };

      const json = JSON.stringify(event);
      const part1 = json.substring(0, 50);
      const part2 = json.substring(50) + '\n';

      const stream = new MockReadableStream([part1, part2]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const eventListener = vi.fn();
      client = new NdjsonClient(config);
      client.on('event', eventListener);

      await client.connect();

      expect(eventListener).toHaveBeenCalledWith(event);
    });

    it('should handle multiple events in one chunk', async () => {
      const events: EdgeEvent[] = [
        { id: '1', type: 'heartbeat', timestamp: '2024-01-01' },
        { id: '2', type: 'heartbeat', timestamp: '2024-01-02' },
        { id: '3', type: 'heartbeat', timestamp: '2024-01-03' },
      ];

      const chunk = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
      const stream = new MockReadableStream([chunk]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const eventListener = vi.fn();
      client = new NdjsonClient(config);
      client.on('event', eventListener);

      await client.connect();

      expect(eventListener).toHaveBeenCalledTimes(3);
      events.forEach((event) => {
        expect(eventListener).toHaveBeenCalledWith(event);
      });
    });

    it('should handle JSON parse errors', async () => {
      const stream = new MockReadableStream([
        '{ invalid json\n',
        '{"id":"1","type":"heartbeat","timestamp":"2024-01-01"}\n',
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const errorListener = vi.fn();
      const eventListener = vi.fn();

      client = new NdjsonClient(config);
      client.on('error', errorListener);
      client.on('event', eventListener);

      await client.connect();

      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Failed to parse event'),
        })
      );

      // Should continue processing after error
      expect(eventListener).toHaveBeenCalledWith({
        id: '1',
        type: 'heartbeat',
        timestamp: '2024-01-01',
      });
    });

    it('should ignore empty lines', async () => {
      const stream = new MockReadableStream([
        '\n\n{"id":"1","type":"heartbeat","timestamp":"2024-01-01"}\n\n\n',
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const eventListener = vi.fn();
      client = new NdjsonClient(config);
      client.on('event', eventListener);

      await client.connect();

      expect(eventListener).toHaveBeenCalledTimes(1);
    });

    it('should handle error events', async () => {
      const errorEvent: EdgeEvent = {
        id: '1',
        type: 'error',
        timestamp: '2024-01-01',
        data: { message: 'Something went wrong', code: 'ERR_001' },
      };

      const stream = new MockReadableStream([JSON.stringify(errorEvent) + '\n']);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const errorListener = vi.fn();
      client = new NdjsonClient(config);
      client.on('error', errorListener);

      await client.connect();

      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Something went wrong',
        })
      );
    });
  });

  describe('sendStatus', () => {
    beforeEach(() => {
      client = new NdjsonClient(config);
    });

    it('should send status update successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const update: StatusUpdate = {
        eventId: 'evt-123',
        status: 'completed',
        metadata: { duration: 1000 },
      };

      await client.sendStatus(update);

      expect(mockFetch).toHaveBeenCalledWith('https://proxy.test/events/status', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(update),
      });
    });

    it('should handle status update failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const errorListener = vi.fn();
      client.on('error', errorListener);

      const update: StatusUpdate = {
        eventId: 'evt-123',
        status: 'failed',
        error: 'Test error',
      };

      await client.sendStatus(update);

      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to send status: 500',
        })
      );
    });

    it('should handle network errors when sending status', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const errorListener = vi.fn();
      client.on('error', errorListener);

      await client.sendStatus({
        eventId: 'evt-123',
        status: 'processing',
      });

      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Network error',
        })
      );
    });
  });

  describe('reconnection', () => {
    it('should attempt to reconnect on connection failure', async () => {
      let attempts = 0;
      mockFetch.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Connection failed'));
        }
        return Promise.resolve({
          ok: true,
          body: new MockReadableStream([]),
        });
      });

      const errorListener = vi.fn();
      const connectListener = vi.fn();

      client = new NdjsonClient({
        ...config,
        reconnectBaseDelay: 10, // Speed up tests
      });

      client.on('error', errorListener);
      client.on('connect', connectListener);

      await client.connect();

      // Wait for reconnections
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(attempts).toBe(3);
      expect(connectListener).toHaveBeenCalled();
    });

    it('should stop reconnecting after max attempts', async () => {
      mockFetch.mockRejectedValue(new Error('Connection failed'));

      const errorListener = vi.fn();

      client = new NdjsonClient({
        ...config,
        maxReconnectAttempts: 2,
        reconnectBaseDelay: 10,
      });

      client.on('error', errorListener);

      await client.connect();

      // Wait for all reconnection attempts
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Max reconnection attempts reached',
        })
      );
    });

    it('should use exponential backoff for reconnection', async () => {
      const connectTimes: number[] = [];
      let attempts = 0;

      mockFetch.mockImplementation(() => {
        connectTimes.push(Date.now());
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Connection failed'));
        }
        return Promise.resolve({
          ok: true,
          body: new MockReadableStream([]),
        });
      });

      const errorListener = vi.fn();
      const connectListener = vi.fn();

      client = new NdjsonClient({
        ...config,
        reconnectBaseDelay: 20,
      });

      client.on('error', errorListener);
      client.on('connect', connectListener);

      await client.connect();

      // Wait for reconnections
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(attempts).toBe(3);
      expect(connectListener).toHaveBeenCalled();

      // Check delays are increasing (with some tolerance for timing)
      if (connectTimes.length >= 3) {
        const delay1 = connectTimes[1] - connectTimes[0];
        const delay2 = connectTimes[2] - connectTimes[1];

        // Second delay should be roughly double the first
        expect(delay2).toBeGreaterThan(delay1 * 1.5);
      }
    });
  });

  describe('disconnect', () => {
    it('should disconnect cleanly', async () => {
      const stream = new MockReadableStream([
        // Simulate ongoing stream
        '{"id":"1","type":"heartbeat","timestamp":"2024-01-01"}\n',
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      client = new NdjsonClient(config);

      const connectPromise = client.connect();

      // Disconnect while connecting
      client.disconnect();

      await connectPromise;

      expect(client.isConnected()).toBe(false);
    });

    it('should abort ongoing fetch when disconnecting', () => {
      let abortSignal: AbortSignal | undefined;

      mockFetch.mockImplementationOnce((url: string, options: any) => {
        abortSignal = options.signal;
        return new Promise(() => {}); // Never resolve
      });

      client = new NdjsonClient(config);
      client.connect();

      expect(abortSignal).toBeDefined();
      expect(abortSignal!.aborted).toBe(false);

      client.disconnect();

      expect(abortSignal!.aborted).toBe(true);
    });

    it('should handle multiple disconnects gracefully', () => {
      client = new NdjsonClient(config);

      expect(() => {
        client.disconnect();
        client.disconnect();
        client.disconnect();
      }).not.toThrow();
    });
  });

  describe('event handling', () => {
    it('should emit webhook events with data only', async () => {
      const webhookEvent: WebhookEvent = {
        id: '1',
        type: 'webhook',
        timestamp: '2024-01-01',
        data: {
          type: 'issueAssignedToYou',
          createdAt: '2024-01-01',
          issue: { id: '123', title: 'Test Issue' },
          notification: { type: 'issueAssignedToYou' },
        },
      };

      const stream = new MockReadableStream([JSON.stringify(webhookEvent) + '\n']);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const webhookListener = vi.fn();
      client = new NdjsonClient(config);
      client.on('webhook', webhookListener);

      await client.connect();

      expect(webhookListener).toHaveBeenCalledWith(webhookEvent.data);
      expect(webhookListener).not.toHaveBeenCalledWith(webhookEvent);
    });

    it('should handle connection events', async () => {
      const connectionEvent: EdgeEvent = {
        id: '1',
        type: 'connection',
        timestamp: '2024-01-01',
        data: { message: 'Connected to proxy', edge_id: 'edge-123' },
      };

      const stream = new MockReadableStream([JSON.stringify(connectionEvent) + '\n']);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const eventListener = vi.fn();
      client = new NdjsonClient(config);
      client.on('event', eventListener);

      await client.connect();

      expect(eventListener).toHaveBeenCalledWith(connectionEvent);
    });
  });

  describe('isConnected', () => {
    it('should return false initially', () => {
      client = new NdjsonClient(config);
      expect(client.isConnected()).toBe(false);
    });

    it('should return true while connected', async () => {
      // Create a stream that doesn't end immediately
      let resolveRead: () => void;
      const stream = {
        getReader: () => ({
          read: () =>
            new Promise((resolve) => {
              resolveRead = () => resolve({ done: true });
            }),
          releaseLock: () => {},
        }),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      client = new NdjsonClient(config);

      const connectPromise = client.connect();

      // Wait for connection to be established
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(client.isConnected()).toBe(true);

      // End the stream
      resolveRead!();
      await connectPromise;

      expect(client.isConnected()).toBe(false);
    });
  });
});
