import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StdoutParser } from '../src/StdoutParser';
import type {
  AssistantEvent,
  UserEvent,
  SystemInitEvent,
  ResultEvent,
  ErrorEvent,
  ToolErrorEvent,
  ClaudeEvent,
} from '../src/types';

describe('StdoutParser', () => {
  let parser: StdoutParser;

  beforeEach(() => {
    parser = new StdoutParser();
  });

  describe('processData', () => {
    it('should parse complete JSON messages', () => {
      const messageListener = vi.fn();
      parser.on('message', messageListener);

      const assistantEvent: AssistantEvent = {
        type: 'assistant',
        message: {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          model: 'claude-3.5-sonnet',
          content: [{ type: 'text', text: 'Hello!' }],
        },
      };

      parser.processData(JSON.stringify(assistantEvent) + '\n');

      expect(messageListener).toHaveBeenCalledWith(assistantEvent);
    });

    it('should handle multiple messages in one chunk', () => {
      const messageListener = vi.fn();
      parser.on('message', messageListener);

      const event1: UserEvent = {
        type: 'user',
        message: { role: 'user', content: 'Test 1' },
      };

      const event2: UserEvent = {
        type: 'user',
        message: { role: 'user', content: 'Test 2' },
      };

      const data = JSON.stringify(event1) + '\n' + JSON.stringify(event2) + '\n';
      parser.processData(data);

      expect(messageListener).toHaveBeenCalledTimes(2);
      expect(messageListener).toHaveBeenCalledWith(event1);
      expect(messageListener).toHaveBeenCalledWith(event2);
    });

    it('should buffer incomplete messages', () => {
      const messageListener = vi.fn();
      parser.on('message', messageListener);

      const event: AssistantEvent = {
        type: 'assistant',
        message: {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          model: 'claude-3.5-sonnet',
          content: [{ type: 'text', text: 'Hello!' }],
        },
      };

      const json = JSON.stringify(event);
      const part1 = json.substring(0, 50);
      const part2 = json.substring(50) + '\n';

      // Send first part - should not emit
      parser.processData(part1);
      expect(messageListener).not.toHaveBeenCalled();

      // Send second part - should emit
      parser.processData(part2);
      expect(messageListener).toHaveBeenCalledWith(event);
    });

    it('should handle Buffer input', () => {
      const messageListener = vi.fn();
      parser.on('message', messageListener);

      const event: SystemInitEvent = {
        type: 'system',
        subtype: 'init',
        tools: ['bash', 'edit'],
      };

      const buffer = Buffer.from(JSON.stringify(event) + '\n');
      parser.processData(buffer);

      expect(messageListener).toHaveBeenCalledWith(event);
    });

    it('should ignore empty lines', () => {
      const messageListener = vi.fn();
      parser.on('message', messageListener);

      parser.processData('\n\n  \n');

      expect(messageListener).not.toHaveBeenCalled();
    });
  });

  describe('processEnd', () => {
    it('should process remaining buffered data', () => {
      const messageListener = vi.fn();
      parser.on('message', messageListener);

      const event: ResultEvent = {
        type: 'result',
        subtype: 'success',
        is_error: false,
        cost_usd: 0.01,
        duration_ms: 1000,
      };

      // Send without newline
      parser.processData(JSON.stringify(event));
      expect(messageListener).not.toHaveBeenCalled();

      // Process end
      parser.processEnd();
      expect(messageListener).toHaveBeenCalledWith(event);
    });

    it('should handle multiple messages in buffer', () => {
      const messageListener = vi.fn();
      const errorListener = vi.fn();
      parser.on('message', messageListener);
      parser.on('error', errorListener);

      const event1: UserEvent = { type: 'user', message: { role: 'user', content: 'Message 1' } };
      const event2: UserEvent = { type: 'user', message: { role: 'user', content: 'Message 2' } };

      // Send without final newline
      parser.processData(JSON.stringify(event1) + '\r\n' + JSON.stringify(event2));

      // First event should be processed
      expect(messageListener).toHaveBeenCalledTimes(1);
      expect(messageListener).toHaveBeenCalledWith(event1);

      // Process end for second event
      parser.processEnd();
      expect(messageListener).toHaveBeenCalledTimes(2);
      expect(messageListener).toHaveBeenCalledWith(event2);
    });

    it('should clear buffer after processing', () => {
      const messageListener = vi.fn();
      parser.on('message', messageListener);

      const event: UserEvent = {
        type: 'user',
        message: { role: 'user', content: 'Test' },
      };

      parser.processData(JSON.stringify(event));
      parser.processEnd();

      // Process end again - should not emit anything
      messageListener.mockClear();
      parser.processEnd();

      expect(messageListener).not.toHaveBeenCalled();
    });
  });

  describe('event emission', () => {
    it('should emit assistant events', () => {
      const assistantListener = vi.fn();
      const textListener = vi.fn();

      parser.on('assistant', assistantListener);
      parser.on('text', textListener);

      const event: AssistantEvent = {
        type: 'assistant',
        message: {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          model: 'claude-3.5-sonnet',
          content: [{ type: 'text', text: 'Hello world!' }],
        },
      };

      parser.processData(JSON.stringify(event) + '\n');

      expect(assistantListener).toHaveBeenCalledWith(event);
      expect(textListener).toHaveBeenCalledWith('Hello world!');
    });

    it('should emit tool-use events', () => {
      const toolUseListener = vi.fn();

      parser.on('tool-use', toolUseListener);

      const event: AssistantEvent = {
        type: 'assistant',
        message: {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          model: 'claude-3.5-sonnet',
          content: [
            {
              type: 'tool_use',
              id: 'tool_123',
              name: 'bash',
              input: { command: 'ls -la' },
            },
          ],
        },
      };

      parser.processData(JSON.stringify(event) + '\n');

      expect(toolUseListener).toHaveBeenCalledWith('bash', { command: 'ls -la' });
    });

    it('should emit end-turn for end_turn stop reason', () => {
      const endTurnListener = vi.fn();

      parser.on('end-turn', endTurnListener);

      const event: AssistantEvent = {
        type: 'assistant',
        message: {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          model: 'claude-3.5-sonnet',
          content: [{ type: 'text', text: 'Final message' }],
          stop_reason: 'end_turn',
        },
      };

      parser.processData(JSON.stringify(event) + '\n');

      expect(endTurnListener).toHaveBeenCalledWith('Final message');
    });

    it('should emit token-limit for specific error patterns', () => {
      const tokenLimitListener = vi.fn();
      const onTokenLimit = vi.fn();
      const errorListener = vi.fn();

      parser = new StdoutParser({ onTokenLimit });
      parser.on('token-limit', tokenLimitListener);
      parser.on('error', errorListener);

      const event: ErrorEvent = {
        type: 'error',
        message: 'Prompt is too long',
      };

      parser.processData(JSON.stringify(event) + '\n');

      // Token limit is detected before error is emitted
      expect(tokenLimitListener).toHaveBeenCalled();
      expect(onTokenLimit).toHaveBeenCalled();
      // Error is not emitted for token limit errors
      expect(errorListener).not.toHaveBeenCalled();
    });

    it('should emit result events', () => {
      const resultListener = vi.fn();

      parser.on('result', resultListener);

      const event: ResultEvent = {
        type: 'result',
        subtype: 'success',
        is_error: false,
        cost_usd: 0.025,
        duration_ms: 2500,
        num_turns: 3,
      };

      parser.processData(JSON.stringify(event) + '\n');

      expect(resultListener).toHaveBeenCalledWith(event);
    });

    it('should emit error events', () => {
      const errorListener = vi.fn();

      parser.on('error', errorListener);

      const event: ToolErrorEvent = {
        type: 'tool_error',
        error: 'Tool execution failed',
      };

      parser.processData(JSON.stringify(event) + '\n');

      expect(errorListener).toHaveBeenCalledWith(event);
    });
  });

  describe('error handling', () => {
    it('should emit error for invalid JSON', () => {
      const errorListener = vi.fn();

      parser.on('error', errorListener);

      parser.processData('{ invalid json\n');

      expect(errorListener).toHaveBeenCalled();
      const error = errorListener.mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Failed to parse JSON');
    });

    it('should include line content in parse errors', () => {
      const errorListener = vi.fn();

      parser.on('error', errorListener);

      const badLine = '{ "type": "test", bad json }';
      parser.processData(badLine + '\n');

      expect(errorListener).toHaveBeenCalled();
      const error = errorListener.mock.calls[0][0];
      expect(error.message).toContain(badLine);
    });

    it('should not stop processing after error', () => {
      const messageListener = vi.fn();
      const errorListener = vi.fn();

      parser.on('message', messageListener);
      parser.on('error', errorListener);

      const validEvent: UserEvent = {
        type: 'user',
        message: { role: 'user', content: 'Valid message' },
      };

      const data = '{ invalid json\n' + JSON.stringify(validEvent) + '\n';
      parser.processData(data);

      expect(errorListener).toHaveBeenCalledTimes(1);
      expect(messageListener).toHaveBeenCalledTimes(1);
      expect(messageListener).toHaveBeenCalledWith(validEvent);
    });
  });

  describe('sessionId option', () => {
    it('should add sessionId to events when provided', () => {
      const sessionId = 'session-123';
      parser = new StdoutParser({ sessionId });

      const messageListener = vi.fn();
      parser.on('message', messageListener);

      const event: AssistantEvent = {
        type: 'assistant',
        message: {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          model: 'claude-3.5-sonnet',
          content: [{ type: 'text', text: 'Hello!' }],
        },
      };

      parser.processData(JSON.stringify(event) + '\n');

      expect(messageListener).toHaveBeenCalledWith({
        ...event,
        session_id: sessionId,
      });
    });

    it('should not override existing sessionId', () => {
      parser = new StdoutParser({ sessionId: 'default-session' });

      const messageListener = vi.fn();
      parser.on('message', messageListener);

      const event: ResultEvent = {
        type: 'result',
        subtype: 'success',
        is_error: false,
        session_id: 'original-session',
      };

      parser.processData(JSON.stringify(event) + '\n');

      expect(messageListener).toHaveBeenCalledWith(event);
      expect(messageListener.mock.calls[0][0].session_id).toBe('original-session');
    });
  });

  describe('line event', () => {
    it('should emit line events for debugging', () => {
      const lineListener = vi.fn();

      parser.on('line', lineListener);

      const event: UserEvent = {
        type: 'user',
        message: { role: 'user', content: 'Test' },
      };

      const line = JSON.stringify(event);
      parser.processData(line + '\n');

      expect(lineListener).toHaveBeenCalledWith(line);
    });
  });

  describe('complex content handling', () => {
    it('should handle multiple content blocks', () => {
      const textListener = vi.fn();
      const toolUseListener = vi.fn();

      parser.on('text', textListener);
      parser.on('tool-use', toolUseListener);

      const event: AssistantEvent = {
        type: 'assistant',
        message: {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          model: 'claude-3.5-sonnet',
          content: [
            { type: 'text', text: 'Let me help you with that.' },
            {
              type: 'tool_use',
              id: 'tool_1',
              name: 'read',
              input: { file_path: '/tmp/test.txt' },
            },
            { type: 'text', text: 'File contents:' },
            {
              type: 'tool_use',
              id: 'tool_2',
              name: 'edit',
              input: { file_path: '/tmp/test.txt', content: 'New content' },
            },
          ],
        },
      };

      parser.processData(JSON.stringify(event) + '\n');

      expect(textListener).toHaveBeenCalledTimes(2);
      expect(textListener).toHaveBeenNthCalledWith(1, 'Let me help you with that.');
      expect(textListener).toHaveBeenNthCalledWith(2, 'File contents:');

      expect(toolUseListener).toHaveBeenCalledTimes(2);
      expect(toolUseListener).toHaveBeenNthCalledWith(1, 'read', { file_path: '/tmp/test.txt' });
      expect(toolUseListener).toHaveBeenNthCalledWith(2, 'edit', {
        file_path: '/tmp/test.txt',
        content: 'New content',
      });
    });

    it('should track last assistant text across messages', () => {
      const endTurnListener = vi.fn();

      parser.on('end-turn', endTurnListener);

      // First message
      const event1: AssistantEvent = {
        type: 'assistant',
        message: {
          id: 'msg_1',
          type: 'message',
          role: 'assistant',
          model: 'claude-3.5-sonnet',
          content: [{ type: 'text', text: 'First part' }],
        },
      };

      parser.processData(JSON.stringify(event1) + '\n');

      // Second message with end_turn
      const event2: AssistantEvent = {
        type: 'assistant',
        message: {
          id: 'msg_2',
          type: 'message',
          role: 'assistant',
          model: 'claude-3.5-sonnet',
          content: [{ type: 'text', text: 'Second part' }],
          stop_reason: 'end_turn',
        },
      };

      parser.processData(JSON.stringify(event2) + '\n');

      expect(endTurnListener).toHaveBeenCalledWith('Second part');
    });
  });
});
