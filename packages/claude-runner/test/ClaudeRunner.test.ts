import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

// Mock StdoutParser
vi.mock('@cyrus/claude-parser', () => {
  const EventEmitter = require('events').EventEmitter;
  class MockStdoutParser extends EventEmitter {
    processData = vi.fn();
    processEnd = vi.fn();
  }
  return { StdoutParser: MockStdoutParser };
});

import { spawn } from 'child_process';
import { StdoutParser } from '@cyrus/claude-parser';
import { ClaudeRunner } from '../src/ClaudeRunner';
import type { ClaudeRunnerConfig } from '../src/types';
import type {
  ClaudeEvent,
  AssistantEvent,
  ResultEvent,
  ErrorEvent,
  ToolErrorEvent,
} from '@cyrus/claude-parser';

describe('ClaudeRunner', () => {
  let runner: ClaudeRunner;
  let mockProcess: any;
  let mockStdin: any;
  let mockStdout: any;
  let mockStderr: any;

  const defaultConfig: ClaudeRunnerConfig = {
    claudePath: '/usr/local/bin/claude',
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock streams
    mockStdin = {
      write: vi.fn((data, cb) => cb && cb()),
      end: vi.fn(),
    };
    mockStdout = new EventEmitter();
    mockStderr = new EventEmitter();

    // Create mock process
    mockProcess = new EventEmitter();
    mockProcess.stdin = mockStdin;
    mockProcess.stdout = mockStdout;
    mockProcess.stderr = mockStderr;
    mockProcess.pid = 12345;
    mockProcess.killed = false;
    mockProcess.kill = vi.fn(() => {
      mockProcess.killed = true;
      setImmediate(() => mockProcess.emit('exit', 0));
    });

    // Mock spawn to return our mock process
    vi.mocked(spawn).mockReturnValue(mockProcess as any);

    runner = new ClaudeRunner(defaultConfig);
  });

  afterEach(() => {
    if (runner.isRunning()) {
      runner.kill();
    }
  });

  describe('Constructor & Initialization', () => {
    it('should create instance with required config', () => {
      expect(runner).toBeInstanceOf(ClaudeRunner);
      expect(runner).toBeInstanceOf(EventEmitter);
    });

    it('should register onEvent callback if provided', () => {
      const onEvent = vi.fn();
      const runnerWithCallback = new ClaudeRunner({
        ...defaultConfig,
        onEvent,
      });

      runnerWithCallback.emit('message', { type: 'test' } as any);
      expect(onEvent).toHaveBeenCalledWith({ type: 'test' });
    });

    it('should register onError callback if provided', () => {
      const onError = vi.fn();
      const runnerWithCallback = new ClaudeRunner({
        ...defaultConfig,
        onError,
      });

      const error = new Error('test error');
      runnerWithCallback.emit('error', error);
      expect(onError).toHaveBeenCalledWith(error);
    });

    it('should register onExit callback if provided', () => {
      const onExit = vi.fn();
      const runnerWithCallback = new ClaudeRunner({
        ...defaultConfig,
        onExit,
      });

      runnerWithCallback.emit('exit', 0);
      expect(onExit).toHaveBeenCalledWith(0);
    });
  });

  describe('spawn()', () => {
    it('should spawn claude process with basic arguments', () => {
      const result = runner.spawn();

      expect(spawn).toHaveBeenCalledWith(
        'sh',
        ['-c', '/usr/local/bin/claude --print --verbose --output-format stream-json | jq -c .'],
        {
          cwd: undefined,
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: false,
        }
      );

      expect(result).toEqual({
        process: mockProcess,
        pid: 12345,
        startedAt: expect.any(Date),
      });
    });

    it('should spawn with working directory if provided', () => {
      const runnerWithDir = new ClaudeRunner({
        ...defaultConfig,
        workingDirectory: '/workspace',
      });

      runnerWithDir.spawn();

      expect(spawn).toHaveBeenCalledWith(
        'sh',
        expect.any(Array),
        expect.objectContaining({
          cwd: '/workspace',
        })
      );
    });

    it('should add --continue flag if continueSession is true', () => {
      const runnerWithContinue = new ClaudeRunner({
        ...defaultConfig,
        continueSession: true,
      });

      runnerWithContinue.spawn();

      const command = vi.mocked(spawn).mock.calls[0][1][1];
      expect(command).toContain('--continue');
    });

    it('should add allowed tools if provided', () => {
      const runnerWithTools = new ClaudeRunner({
        ...defaultConfig,
        allowedTools: ['Read', 'Write', 'Edit'],
      });

      runnerWithTools.spawn();

      const command = vi.mocked(spawn).mock.calls[0][1][1];
      expect(command).toContain('--allowedTools Read Write Edit');
    });

    it('should throw error if process already running', () => {
      runner.spawn();
      expect(() => runner.spawn()).toThrow('Claude process already running');
    });

    it('should set up stdout data piping to parser', () => {
      runner.spawn();

      const parser = (runner as any).parser;
      mockStdout.emit('data', Buffer.from('test data'));

      expect(parser.processData).toHaveBeenCalledWith(Buffer.from('test data'));
    });
  });

  describe('sendInput()', () => {
    it('should send input with newline', async () => {
      runner.spawn();

      await runner.sendInput('Hello Claude');

      expect(mockStdin.write).toHaveBeenCalledWith('Hello Claude\n', expect.any(Function));
    });

    it('should handle multiline input', async () => {
      runner.spawn();

      const multilineInput = 'Line 1\nLine 2\nLine 3';
      await runner.sendInput(multilineInput);

      expect(mockStdin.write).toHaveBeenCalledWith(
        'Line 1\nLine 2\nLine 3\n',
        expect.any(Function)
      );
    });

    it('should throw error if no active process', async () => {
      await expect(runner.sendInput('test')).rejects.toThrow('No active Claude process');
    });

    it('should reject on write error', async () => {
      runner.spawn();

      const writeError = new Error('Write failed');
      mockStdin.write.mockImplementation((data, cb) => cb(writeError));

      await expect(runner.sendInput('test')).rejects.toThrow('Write failed');
    });
  });

  describe('sendInitialPrompt()', () => {
    it('should send prompt and close stdin', async () => {
      runner.spawn();

      await runner.sendInitialPrompt('Initial prompt');

      expect(mockStdin.write).toHaveBeenCalled();
      expect(mockStdin.end).toHaveBeenCalled();
    });

    it('should throw error if no active process', async () => {
      await expect(runner.sendInitialPrompt('test')).rejects.toThrow('No active Claude process');
    });
  });

  describe('kill()', () => {
    it('should kill process with SIGTERM', () => {
      runner.spawn();
      runner.kill();

      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect((runner as any).process).toBeNull();
      expect((runner as any).parser).toBeNull();
    });

    it('should be safe to call without active process', () => {
      expect(() => runner.kill()).not.toThrow();
    });

    it('should be safe to call multiple times', () => {
      runner.spawn();
      runner.kill();
      expect(() => runner.kill()).not.toThrow();
    });
  });

  describe('isRunning()', () => {
    it('should return true when process is running', () => {
      runner.spawn();
      expect(runner.isRunning()).toBe(true);
    });

    it('should return false when no process', () => {
      expect(runner.isRunning()).toBe(false);
    });

    it('should return false when process is killed', () => {
      runner.spawn();
      mockProcess.killed = true;
      expect(runner.isRunning()).toBe(false);
    });
  });

  describe('Event Forwarding from Parser', () => {
    let parser: any;

    beforeEach(() => {
      runner.spawn();
      parser = (runner as any).parser;
    });

    it('should forward message event as message', async () => {
      const event: ClaudeEvent = {
        type: 'assistant',
        message: { content: [], role: 'assistant', type: 'message', id: '1', model: 'claude' },
      };

      const promise = new Promise<void>((resolve) => {
        runner.on('message', (received) => {
          expect(received).toEqual(event);
          resolve();
        });
      });

      parser.emit('message', event);
      await promise;
    });

    it('should forward assistant event unchanged', async () => {
      const event: AssistantEvent = {
        type: 'assistant',
        message: { content: [], role: 'assistant', type: 'message', id: '1', model: 'claude' },
      };

      const promise = new Promise<void>((resolve) => {
        runner.on('assistant', (received) => {
          expect(received).toEqual(event);
          resolve();
        });
      });

      parser.emit('assistant', event);
      await promise;
    });

    it('should forward tool-use event unchanged', async () => {
      const promise = new Promise<void>((resolve) => {
        runner.on('tool-use', (toolName, input) => {
          expect(toolName).toBe('Read');
          expect(input).toEqual({ file_path: '/test.txt' });
          resolve();
        });
      });

      parser.emit('tool-use', 'Read', { file_path: '/test.txt' });
      await promise;
    });

    it('should forward text event unchanged', async () => {
      const promise = new Promise<void>((resolve) => {
        runner.on('text', (text) => {
          expect(text).toBe('Hello from Claude');
          resolve();
        });
      });

      parser.emit('text', 'Hello from Claude');
      await promise;
    });

    it('should forward end-turn event unchanged', async () => {
      const promise = new Promise<void>((resolve) => {
        runner.on('end-turn', (lastText) => {
          expect(lastText).toBe('Final message');
          resolve();
        });
      });

      parser.emit('end-turn', 'Final message');
      await promise;
    });

    it('should forward result event unchanged', async () => {
      const event: ResultEvent = {
        type: 'result',
        subtype: 'success',
        is_error: false,
        cost_usd: 0.15,
        duration_ms: 5000,
      };

      const promise = new Promise<void>((resolve) => {
        runner.on('result', (received) => {
          expect(received).toEqual(event);
          resolve();
        });
      });

      parser.emit('result', event);
      await promise;
    });

    it('should forward token-limit event unchanged', async () => {
      const promise = new Promise<void>((resolve) => {
        runner.on('token-limit', () => {
          resolve();
        });
      });

      parser.emit('token-limit');
      await promise;
    });

    describe('Error handling', () => {
      it('should forward Error instance unchanged', async () => {
        const error = new Error('Parser error');

        const promise = new Promise<void>((resolve) => {
          runner.on('error', (received) => {
            expect(received).toBe(error);
            resolve();
          });
        });

        parser.emit('error', error);
        await promise;
      });

      it('should convert ErrorEvent to Error', async () => {
        const errorEvent: ErrorEvent = {
          type: 'error',
          message: 'API error occurred',
        };

        const promise = new Promise<void>((resolve) => {
          runner.on('error', (received) => {
            expect(received).toBeInstanceOf(Error);
            expect(received.message).toBe('API error occurred');
            resolve();
          });
        });

        parser.emit('error', errorEvent);
        await promise;
      });

      it('should convert ToolErrorEvent to Error', async () => {
        const toolError: ToolErrorEvent = {
          type: 'tool_error',
          error: 'File not found',
        };

        const promise = new Promise<void>((resolve) => {
          runner.on('error', (received) => {
            expect(received).toBeInstanceOf(Error);
            expect(received.message).toBe('File not found');
            resolve();
          });
        });

        parser.emit('error', toolError);
        await promise;
      });
    });
  });

  describe('Process Event Handling', () => {
    it('should handle process error event', async () => {
      const promise = new Promise<void>((resolve) => {
        runner.on('error', (error) => {
          expect(error.message).toBe('Claude process error: spawn failed');
          resolve();
        });
      });

      runner.spawn();
      mockProcess.emit('error', new Error('spawn failed'));
      await promise;
    });

    it('should handle process exit event', async () => {
      const promise = new Promise<void>((resolve) => {
        runner.on('exit', (code) => {
          expect(code).toBe(0);
          resolve();
        });
      });

      runner.spawn();
      mockProcess.emit('exit', 0);
      await promise;

      expect((runner as any).process).toBeNull();
      expect((runner as any).parser).toBeNull();
    });

    it('should call parser.processEnd on exit', () => {
      runner.spawn();
      const parser = (runner as any).parser;

      mockProcess.emit('exit', 0);

      expect(parser.processEnd).toHaveBeenCalled();
    });

    it('should handle stderr output', async () => {
      const messages: string[] = [];
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      runner.on('error', (error) => {
        messages.push(error.message);
        if (messages.length === 2) {
          expect(messages).toEqual(['Claude stderr: Error line 1', 'Claude stderr: Error line 2']);
          resolvePromise();
        }
      });

      runner.spawn();
      mockStderr.emit('data', Buffer.from('Error line 1\nError line 2\n'));
      await promise;
    });

    it('should buffer partial stderr lines', async () => {
      const promise = new Promise<void>((resolve) => {
        runner.on('error', (error) => {
          expect(error.message).toBe('Claude stderr: Complete error message');
          resolve();
        });
      });

      runner.spawn();
      mockStderr.emit('data', Buffer.from('Complete error '));
      mockStderr.emit('data', Buffer.from('message\n'));
      await promise;
    });

    it('should ignore empty stderr lines', () => {
      const errorHandler = vi.fn();
      runner.on('error', errorHandler);

      runner.spawn();
      mockStderr.emit('data', Buffer.from('\n  \n\t\n'));

      expect(errorHandler).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle process crash during operation', async () => {
      let errorEmitted = false;

      runner.on('error', () => {
        errorEmitted = true;
      });

      const promise = new Promise<void>((resolve) => {
        runner.on('exit', (code) => {
          expect(code).toBe(1);
          expect(errorEmitted).toBe(false); // No error event for clean exit
          resolve();
        });
      });

      runner.spawn();
      mockProcess.emit('exit', 1);
      await promise;
    });

    it('should handle stdin being null', async () => {
      runner.spawn();
      mockProcess.stdin = null;

      await expect(runner.sendInput('test')).rejects.toThrow('No active Claude process');
    });

    it('should handle stdout being null', () => {
      mockProcess.stdout = null;
      expect(() => runner.spawn()).not.toThrow();
    });

    it('should handle stderr being null', () => {
      mockProcess.stderr = null;
      expect(() => runner.spawn()).not.toThrow();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle full conversation flow', async () => {
      const events: any[] = [];

      runner.on('message', (e) => events.push({ type: 'message', data: e }));
      runner.on('assistant', (e) => events.push({ type: 'assistant', data: e }));
      runner.on('text', (t) => events.push({ type: 'text', data: t }));
      runner.on('end-turn', (t) => events.push({ type: 'end-turn', data: t }));
      runner.on('result', (e) => events.push({ type: 'result', data: e }));

      runner.spawn();
      const parser = (runner as any).parser;

      // Send initial prompt
      await runner.sendInitialPrompt('Hello Claude');

      // Simulate Claude's response
      const assistantEvent: AssistantEvent = {
        type: 'assistant',
        message: {
          id: '1',
          type: 'message',
          role: 'assistant',
          model: 'claude-3',
          content: [{ type: 'text', text: 'Hello! How can I help?' }],
          stop_reason: 'end_turn',
        },
      };

      parser.emit('message', assistantEvent);
      parser.emit('assistant', assistantEvent);
      parser.emit('text', 'Hello! How can I help?');
      parser.emit('end-turn', 'Hello! How can I help?');

      const resultEvent: ResultEvent = {
        type: 'result',
        subtype: 'success',
        is_error: false,
      };
      parser.emit('result', resultEvent);

      // Process should exit
      mockProcess.emit('exit', 0);

      // Verify event sequence
      expect(events).toHaveLength(5);
      expect(events[0].type).toBe('message');
      expect(events[1].type).toBe('assistant');
      expect(events[2].type).toBe('text');
      expect(events[3].type).toBe('end-turn');
      expect(events[4].type).toBe('result');
    });

    it('should handle tool use scenario', async () => {
      const toolUses: any[] = [];
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      runner.on('tool-use', (name, input) => {
        toolUses.push({ name, input });

        if (toolUses.length === 2) {
          expect(toolUses).toEqual([
            { name: 'Read', input: { file_path: '/file1.txt' } },
            { name: 'Write', input: { file_path: '/file2.txt', content: 'Hello' } },
          ]);
          resolvePromise();
        }
      });

      runner.spawn();
      const parser = (runner as any).parser;

      parser.emit('tool-use', 'Read', { file_path: '/file1.txt' });
      parser.emit('tool-use', 'Write', { file_path: '/file2.txt', content: 'Hello' });
      await promise;
    });
  });
});
