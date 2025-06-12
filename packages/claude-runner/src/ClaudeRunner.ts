import { EventEmitter } from 'events';
import { spawn, type ChildProcess } from 'child_process';
import { mkdirSync, createWriteStream, type WriteStream } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import {
  StdoutParser,
  type ClaudeEvent,
  type ErrorEvent,
  type ToolErrorEvent,
} from '@cyrus/claude-parser';
import type { ClaudeRunnerConfig, ClaudeRunnerEvents, ClaudeProcessInfo } from './types.js';

export declare interface ClaudeRunner {
  on<K extends keyof ClaudeRunnerEvents>(event: K, listener: ClaudeRunnerEvents[K]): this;
  emit<K extends keyof ClaudeRunnerEvents>(
    event: K,
    ...args: Parameters<ClaudeRunnerEvents[K]>
  ): boolean;
}

/**
 * Manages spawning and communication with Claude CLI processes
 */
export class ClaudeRunner extends EventEmitter {
  private config: ClaudeRunnerConfig;
  private process: ChildProcess | null = null;
  private parser: StdoutParser | null = null;
  private startedAt: Date | null = null;
  private logStream: WriteStream | null = null;
  private sessionId: string | null = null;

  constructor(config: ClaudeRunnerConfig) {
    super();
    this.config = config;

    // Forward config callbacks to events
    if (config.onEvent) this.on('message', config.onEvent);
    if (config.onError) this.on('error', config.onError);
    if (config.onExit) this.on('exit', config.onExit);
  }

  /**
   * Spawn a new Claude process
   */
  spawn(): ClaudeProcessInfo {
    if (this.process) {
      throw new Error('Claude process already running');
    }

    // Build command arguments
    const args = this.buildArgs();
    const command = `${this.config.claudePath} ${args.join(' ')} | jq -c .`;

    // Debug logging
    console.error('[ClaudeRunner] Spawning command:', command);
    console.error('[ClaudeRunner] Working directory:', this.config.workingDirectory);
    console.error('[ClaudeRunner] Claude path:', this.config.claudePath);

    // Ensure working directory exists
    if (this.config.workingDirectory) {
      try {
        mkdirSync(this.config.workingDirectory, { recursive: true });
        console.error('[ClaudeRunner] Created working directory');
      } catch (err) {
        console.error('[ClaudeRunner] Failed to create working directory:', err);
      }
    }

    // Spawn the process
    console.log('[ClaudeRunner] Spawning Claude process...');
    this.process = spawn('sh', ['-c', command], {
      cwd: this.config.workingDirectory,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false, // We're already using sh -c
    });

    this.startedAt = new Date();
    console.log(`[ClaudeRunner] Process spawned with PID: ${this.process.pid}`);

    // Set up stdout parser
    this.parser = new StdoutParser();
    this.setupParserEvents();

    // Handle process events
    this.setupProcessEvents();

    // Set up logging
    this.setupLogging();

    // Pipe stdout through parser
    if (this.process.stdout) {
      console.log('[ClaudeRunner] Setting up stdout data handler');
      this.process.stdout.on('data', (chunk) => {
        const chunkStr = chunk.toString();
        console.log(`[ClaudeRunner] Received stdout data, length: ${chunk.length} bytes`);
        console.log(`[ClaudeRunner] First 200 chars of stdout: ${chunkStr.substring(0, 200)}`);

        // Log raw stdout to file for debugging
        if (this.logStream) {
          const stdoutEvent = {
            type: 'stdout-raw',
            data: chunkStr,
            timestamp: new Date().toISOString(),
          };
          this.logStream.write(JSON.stringify(stdoutEvent) + '\n');
        }

        this.parser?.processData(chunk);
      });
    } else {
      console.error('[ClaudeRunner] Warning: process.stdout is null');
    }

    // Check stdin availability
    if (this.process.stdin) {
      console.log('[ClaudeRunner] stdin is available');
    } else {
      console.error('[ClaudeRunner] Warning: process.stdin is null');
    }

    return {
      process: this.process,
      pid: this.process.pid,
      startedAt: this.startedAt,
    };
  }

  /**
   * Send input to Claude
   */
  async sendInput(input: string): Promise<void> {
    console.log(`[ClaudeRunner] sendInput called with input length: ${input.length} characters`);

    if (!this.process || !this.process.stdin) {
      console.error('[ClaudeRunner] No active Claude process or stdin');
      throw new Error('No active Claude process');
    }

    return new Promise((resolve, reject) => {
      // Just send the input directly, no heredoc needed
      const inputWithNewline = input.endsWith('\n') ? input : input + '\n';

      console.log(`[ClaudeRunner] Writing to stdin, input: "${inputWithNewline.trim()}"`);

      this.process!.stdin!.write(inputWithNewline, (err) => {
        if (err) {
          console.error('[ClaudeRunner] Error writing to stdin:', err);
          reject(err);
        } else {
          console.log('[ClaudeRunner] Successfully wrote to stdin');
          // Close stdin after writing for --continue mode
          if (this.config.continueSession) {
            this.process!.stdin!.end();
            console.log('[ClaudeRunner] Closed stdin for continue mode');
          }
          resolve();
        }
      });
    });
  }

  /**
   * Send initial prompt and close stdin
   */
  async sendInitialPrompt(prompt: string): Promise<void> {
    console.log(
      `[ClaudeRunner] sendInitialPrompt called with prompt length: ${prompt.length} characters`
    );
    try {
      await this.sendInput(prompt);
      console.log('[ClaudeRunner] sendInput completed, closing stdin');
      this.process?.stdin?.end();
      console.log('[ClaudeRunner] stdin closed successfully');
    } catch (error) {
      console.error('[ClaudeRunner] Error in sendInitialPrompt:', error);
      throw error;
    }
  }

  /**
   * Kill the Claude process
   */
  kill(): void {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
      this.parser = null;
    }
  }

  /**
   * Check if process is running
   */
  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  /**
   * Build command line arguments
   */
  private buildArgs(): string[] {
    const args = ['--print', '--verbose', '--output-format', 'stream-json'];

    // Add continue flag if specified
    if (this.config.continueSession) {
      args.push('--continue');
    }

    // Add allowed tools
    if (this.config.allowedTools && this.config.allowedTools.length > 0) {
      args.push('--allowedTools');
      args.push(...this.config.allowedTools);
    }

    // Add allowed directories
    if (this.config.allowedDirectories && this.config.allowedDirectories.length > 0) {
      args.push('--add-dir');
      args.push(...this.config.allowedDirectories);
    }

    return args;
  }

  /**
   * Set up parser event handlers
   */
  private setupParserEvents(): void {
    if (!this.parser) return;

    // Forward all events
    this.parser.on('message', (event: ClaudeEvent) => {
      // Capture session ID from the first event if available
      if (!this.sessionId && 'sessionId' in event && event.sessionId) {
        this.sessionId = event.sessionId as string;
        console.log(`[ClaudeRunner] Captured session ID: ${this.sessionId}`);
        this.updateLogFilePath();
      }

      // Log the event
      if (this.logStream) {
        this.logStream.write(JSON.stringify(event) + '\n');
      }

      this.emit('message', event);
    });

    this.parser.on('assistant', (event: ClaudeEvent) => {
      this.emit('assistant', event);
    });

    this.parser.on('tool-use', (toolName: string, input: any) => {
      this.emit('tool-use', toolName, input);
    });

    this.parser.on('text', (text: string) => {
      this.emit('text', text);
    });

    this.parser.on('end-turn', (lastText: string) => {
      this.emit('end-turn', lastText);
    });

    this.parser.on('result', (event: ClaudeEvent) => {
      this.emit('result', event);
    });

    this.parser.on('error', (error: Error | ErrorEvent | ToolErrorEvent) => {
      if (error instanceof Error) {
        this.emit('error', error);
      } else {
        // Convert ErrorEvent/ToolErrorEvent to Error
        const message =
          'message' in error ? error.message : 'error' in error ? error.error : 'Unknown error';
        this.emit('error', new Error(message));
      }
    });

    this.parser.on('token-limit', () => {
      this.emit('token-limit');
    });
  }

  /**
   * Set up process event handlers
   */
  private setupProcessEvents(): void {
    if (!this.process) return;

    this.process.on('error', (error) => {
      this.emit('error', new Error(`Claude process error: ${error.message}`));
    });

    this.process.on('exit', (code, signal) => {
      console.log(`[ClaudeRunner] Process exited with code: ${code}, signal: ${signal}`);

      // Log exit to file
      if (this.logStream) {
        const exitEvent = {
          type: 'process-exit',
          code,
          signal,
          timestamp: new Date().toISOString(),
        };
        this.logStream.write(JSON.stringify(exitEvent) + '\n');
      }

      // Process any remaining data
      if (this.parser) {
        console.log('[ClaudeRunner] Processing any remaining parser data');
        this.parser.processEnd();
      }

      this.emit('exit', code);
      this.process = null;
      this.parser = null;

      // Close log stream
      if (this.logStream) {
        this.logStream.end();
        this.logStream = null;
      }
    });

    // Capture stderr
    if (this.process.stderr) {
      console.log('[ClaudeRunner] Setting up stderr handler');
      let stderrBuffer = '';
      this.process.stderr.on('data', (chunk) => {
        const chunkStr = chunk.toString();
        console.log(`[ClaudeRunner] Received stderr data: ${chunkStr}`);
        stderrBuffer += chunkStr;

        // Log to file for debugging
        if (this.logStream) {
          const errorEvent = {
            type: 'stderr',
            data: chunkStr,
            timestamp: new Date().toISOString(),
          };
          this.logStream.write(JSON.stringify(errorEvent) + '\n');
        }
        // Emit complete lines
        const lines = stderrBuffer.split('\n');
        stderrBuffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            console.error(`[ClaudeRunner] stderr line: ${line}`);
            this.emit('error', new Error(`Claude stderr: ${line}`));
          }
        }
      });
    } else {
      console.error('[ClaudeRunner] Warning: process.stderr is null');
    }
  }

  /**
   * Set up logging to .cyrus directory
   */
  private setupLogging(): void {
    try {
      // Create logs directory structure: ~/.cyrus/logs/<workspace-name>/
      const cyrusDir = join(homedir(), '.cyrus');
      const logsDir = join(cyrusDir, 'logs');

      // Get workspace name from config or extract from working directory
      const workspaceName =
        this.config.workspaceName ||
        (this.config.workingDirectory
          ? this.config.workingDirectory.split('/').pop()
          : 'default') ||
        'default';
      const workspaceLogsDir = join(logsDir, workspaceName);

      // Create directories
      mkdirSync(workspaceLogsDir, { recursive: true });

      // Create initial log file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logFileName = `session-${timestamp}.jsonl`;
      const logFilePath = join(workspaceLogsDir, logFileName);

      console.log(`[ClaudeRunner] Creating log file at: ${logFilePath}`);
      this.logStream = createWriteStream(logFilePath, { flags: 'a' });

      // Write initial metadata
      const metadata = {
        type: 'session-metadata',
        startedAt: this.startedAt?.toISOString(),
        workingDirectory: this.config.workingDirectory,
        workspaceName: workspaceName,
        timestamp: new Date().toISOString(),
      };
      this.logStream.write(JSON.stringify(metadata) + '\n');
    } catch (error) {
      console.error('[ClaudeRunner] Failed to set up logging:', error);
    }
  }

  /**
   * Update log file path when session ID is captured
   */
  private updateLogFilePath(): void {
    if (!this.sessionId || !this.logStream) return;

    try {
      // Close current stream
      this.logStream.end();

      // Create new file with session ID
      const cyrusDir = join(homedir(), '.cyrus');
      const logsDir = join(cyrusDir, 'logs');
      const workspaceName =
        this.config.workspaceName ||
        (this.config.workingDirectory
          ? this.config.workingDirectory.split('/').pop()
          : 'default') ||
        'default';
      const workspaceLogsDir = join(logsDir, workspaceName);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logFileName = `session-${this.sessionId}-${timestamp}.jsonl`;
      const logFilePath = join(workspaceLogsDir, logFileName);

      console.log(`[ClaudeRunner] Updating log file to: ${logFilePath}`);
      this.logStream = createWriteStream(logFilePath, { flags: 'a' });

      // Write session metadata
      const metadata = {
        type: 'session-metadata',
        sessionId: this.sessionId,
        startedAt: this.startedAt?.toISOString(),
        workingDirectory: this.config.workingDirectory,
        workspaceName: workspaceName,
        timestamp: new Date().toISOString(),
      };
      this.logStream.write(JSON.stringify(metadata) + '\n');
    } catch (error) {
      console.error('[ClaudeRunner] Failed to update log file path:', error);
    }
  }
}
