import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable, Writable } from 'stream';
import { StreamProcessor } from '../src/StreamProcessor';
import type { AssistantEvent, UserEvent, ErrorEvent, ClaudeEvent } from '../src/types';

describe('StreamProcessor', () => {
  let processor: StreamProcessor;

  beforeEach(() => {
    processor = new StreamProcessor();
  });

  describe('transform stream behavior', () => {
    it('should transform JSON strings to parsed events', async () => {
      const events: ClaudeEvent[] = [];

      processor.on('data', (event) => {
        events.push(event);
      });

      const endPromise = new Promise<void>((resolve) => {
        processor.on('end', () => resolve());
      });

      // Write data
      processor.write(
        JSON.stringify({ type: 'user', message: { role: 'user', content: 'Hello' } }) + '\n'
      );
      processor.write(
        JSON.stringify({
          type: 'assistant',
          message: {
            id: 'msg_123',
            type: 'message',
            role: 'assistant',
            model: 'claude-3.5-sonnet',
            content: [{ type: 'text', text: 'Hi there!' }],
          },
        }) + '\n'
      );
      processor.end();

      await endPromise;

      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({
        type: 'user',
        message: { role: 'user', content: 'Hello' },
      });
      expect(events[1]).toEqual({
        type: 'assistant',
        message: {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          model: 'claude-3.5-sonnet',
          content: [{ type: 'text', text: 'Hi there!' }],
        },
      });
    });

    it('should work in a pipe chain', async () => {
      const input = new Readable({
        read() {
          this.push(
            JSON.stringify({ type: 'user', message: { role: 'user', content: 'Test' } }) + '\n'
          );
          this.push(null);
        },
      });

      const events: ClaudeEvent[] = [];
      const output = new Writable({
        objectMode: true,
        write(chunk, _encoding, callback) {
          events.push(chunk);
          callback();
        },
      });

      const finishPromise = new Promise<void>((resolve) => {
        output.on('finish', () => resolve());
      });

      input.pipe(processor).pipe(output);

      await finishPromise;

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('user');
    });

    it('should handle partial messages across chunks', async () => {
      const events: ClaudeEvent[] = [];

      processor.on('data', (event) => {
        events.push(event);
      });

      const endPromise = new Promise<void>((resolve) => {
        processor.on('end', () => resolve());
      });

      const json = JSON.stringify({
        type: 'assistant',
        message: {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          model: 'claude-3.5-sonnet',
          content: [{ type: 'text', text: 'Hello world!' }],
        },
      });

      // Split the JSON into parts
      const part1 = json.substring(0, 50);
      const part2 = json.substring(50) + '\n';

      processor.write(part1);
      processor.write(part2);
      processor.end();

      await endPromise;

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('assistant');
    });

    it('should handle Buffer input', async () => {
      const events: ClaudeEvent[] = [];

      processor.on('data', (event) => {
        events.push(event);
      });

      const endPromise = new Promise<void>((resolve) => {
        processor.on('end', () => resolve());
      });

      const buffer = Buffer.from(
        JSON.stringify({
          type: 'user',
          message: { role: 'user', content: 'Buffer test' },
        }) + '\n'
      );

      processor.write(buffer);
      processor.end();

      await endPromise;

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('user');
    });
  });

  describe('error handling', () => {
    it('should emit error events from parser', async () => {
      const errorPromise = new Promise<Error>((resolve) => {
        processor.on('error', (error) => resolve(error));
      });

      processor.write('{ invalid json\n');

      const error = await errorPromise;
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Failed to parse JSON');
    });

    it('should emit tool error events', async () => {
      const errorPromise = new Promise<any>((resolve) => {
        processor.on('error', (error) => resolve(error));
      });

      processor.write(
        JSON.stringify({
          type: 'tool_error',
          error: 'Tool execution failed',
        }) + '\n'
      );

      const error = await errorPromise;
      expect(error).toEqual({
        type: 'tool_error',
        error: 'Tool execution failed',
      });
    });

    it('should continue processing after errors', async () => {
      const events: ClaudeEvent[] = [];
      let errorCount = 0;

      processor.on('data', (event) => {
        events.push(event);
      });

      processor.on('error', () => {
        errorCount++;
      });

      const endPromise = new Promise<void>((resolve) => {
        processor.on('end', () => resolve());
      });

      processor.write('{ bad json\n');
      processor.write(
        JSON.stringify({ type: 'user', message: { role: 'user', content: 'Valid' } }) + '\n'
      );
      processor.end();

      await endPromise;

      expect(errorCount).toBe(1);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('user');
    });

    it('should handle errors in _transform', async () => {
      // Mock processData to throw
      const parser = processor.getParser();
      parser.processData = vi.fn(() => {
        throw new Error('Process error');
      });

      const errorPromise = new Promise<Error>((resolve) => {
        processor.on('error', (error) => resolve(error));
      });

      processor.write('test data');

      const error = await errorPromise;
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Process error');
    });

    it('should handle errors in _flush', async () => {
      // Mock processEnd to throw
      const parser = processor.getParser();
      parser.processEnd = vi.fn(() => {
        throw new Error('Flush error');
      });

      const errorPromise = new Promise<Error>((resolve) => {
        processor.on('error', (error) => resolve(error));
      });

      processor.end();

      const error = await errorPromise;
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Flush error');
    });
  });

  describe('parser options', () => {
    it('should pass options to underlying parser', async () => {
      const sessionId = 'test-session';
      processor = new StreamProcessor({ sessionId });

      const events: ClaudeEvent[] = [];

      processor.on('data', (event) => {
        events.push(event);
      });

      const endPromise = new Promise<void>((resolve) => {
        processor.on('end', () => resolve());
      });

      processor.write(
        JSON.stringify({
          type: 'user',
          message: { role: 'user', content: 'Test' },
        }) + '\n'
      );
      processor.end();

      await endPromise;

      expect(events[0].session_id).toBe(sessionId);
    });

    it('should handle onTokenLimit callback', async () => {
      const onTokenLimit = vi.fn();
      processor = new StreamProcessor({ onTokenLimit });

      // Write error that triggers token limit
      processor.write(
        JSON.stringify({
          type: 'error',
          message: 'Prompt is too long',
        }) + '\n'
      );

      // Wait a bit for processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(onTokenLimit).toHaveBeenCalled();
    });
  });

  describe('getParser', () => {
    it('should return the underlying parser instance', () => {
      const parser = processor.getParser();
      expect(parser).toBeDefined();
      expect(parser.processData).toBeDefined();
      expect(parser.processEnd).toBeDefined();
    });

    it('should allow direct event access on parser', async () => {
      const parser = processor.getParser();

      const assistantPromise = new Promise<AssistantEvent>((resolve) => {
        parser.on('assistant', (event: AssistantEvent) => resolve(event));
      });

      processor.write(
        JSON.stringify({
          type: 'assistant',
          message: {
            id: 'msg_123',
            type: 'message',
            role: 'assistant',
            model: 'claude-3.5-sonnet',
            content: [{ type: 'text', text: 'Direct access' }],
          },
        }) + '\n'
      );

      const event = await assistantPromise;
      expect(event.type).toBe('assistant');
      expect(event.message.content[0]).toEqual({
        type: 'text',
        text: 'Direct access',
      });
    });
  });

  describe('stream lifecycle', () => {
    it('should handle empty stream', async () => {
      const events: ClaudeEvent[] = [];

      processor.on('data', (event) => {
        events.push(event);
      });

      const endPromise = new Promise<void>((resolve) => {
        processor.on('end', () => resolve());
      });

      processor.end();

      await endPromise;

      expect(events).toHaveLength(0);
    });

    it('should process remaining data on end', async () => {
      const events: ClaudeEvent[] = [];

      processor.on('data', (event) => {
        events.push(event);
      });

      const endPromise = new Promise<void>((resolve) => {
        processor.on('end', () => resolve());
      });

      // Write without newline
      processor.write(
        JSON.stringify({
          type: 'result',
          subtype: 'success',
          is_error: false,
        })
      );
      processor.end();

      await endPromise;

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('result');
    });

    it('should handle rapid writes', async () => {
      const events: ClaudeEvent[] = [];

      processor.on('data', (event) => {
        events.push(event);
      });

      const endPromise = new Promise<void>((resolve) => {
        processor.on('end', () => resolve());
      });

      // Write 100 messages rapidly
      for (let i = 0; i < 100; i++) {
        processor.write(
          JSON.stringify({
            type: 'user',
            message: { role: 'user', content: `Message ${i}` },
          }) + '\n'
        );
      }
      processor.end();

      await endPromise;

      expect(events).toHaveLength(100);
      events.forEach((event, i) => {
        expect(event.type).toBe('user');
        expect((event as UserEvent).message.content).toBe(`Message ${i}`);
      });
    });
  });

  describe('objectMode', () => {
    it('should be in object mode', () => {
      // Object mode streams allow non-string/buffer values
      const testObj = { test: 'object' };

      // This would throw if not in object mode
      expect(() => {
        processor.push(testObj as any);
      }).not.toThrow();
    });
  });
});
