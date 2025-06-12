import type { ChildProcess } from 'child_process';
import type { ClaudeEvent } from '@cyrus/claude-parser';

export interface ClaudeRunnerConfig {
  claudePath: string;
  workingDirectory?: string;
  allowedTools?: string[];
  allowedDirectories?: string[];
  continueSession?: boolean;
  workspaceName?: string;
  onEvent?: (event: ClaudeEvent) => void;
  onError?: (error: Error) => void;
  onExit?: (code: number | null) => void;
}

export interface ClaudeProcessInfo {
  process: ChildProcess;
  pid: number | undefined;
  startedAt: Date;
}

export interface ClaudeRunnerEvents {
  message: (event: ClaudeEvent) => void;
  assistant: (event: ClaudeEvent) => void;
  'tool-use': (toolName: string, input: any) => void;
  text: (text: string) => void;
  'end-turn': (lastText: string) => void;
  result: (event: ClaudeEvent) => void;
  error: (error: Error) => void;
  'token-limit': () => void;
  exit: (code: number | null) => void;
}
