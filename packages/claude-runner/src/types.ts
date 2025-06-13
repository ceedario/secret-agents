// Re-export SDK types for convenience
import type { SDKMessage, Options } from '@anthropic-ai/claude-code'

export type ClaudeMessage = SDKMessage
export type SDKOptions = Options

export interface ClaudeRunnerConfig {
  claudePath?: string // Optional now since we use SDK
  workingDirectory?: string
  allowedTools?: string[]
  allowedDirectories?: string[] // Not part of SDK, but kept for backwards compatibility
  continueSession?: boolean
  workspaceName?: string
  maxTurns?: number
  // SDK options
  sdkOptions?: SDKOptions
  // Event callbacks
  onEvent?: (event: ClaudeMessage) => void
  onError?: (error: Error) => void
  onExit?: (code: number | null) => void
}

export interface ClaudeProcessInfo {
  process: null // No longer uses child process
  pid: undefined
  startedAt: Date
}

export interface ClaudeRunnerEvents {
  'message': (event: ClaudeMessage) => void
  'assistant': (event: ClaudeMessage) => void
  'tool-use': (toolName: string, input: any) => void
  'text': (text: string) => void
  'end-turn': (lastText: string) => void
  'result': (event: ClaudeMessage) => void
  'error': (error: Error) => void
  'token-limit': () => void
  'exit': (code: number | null) => void
}