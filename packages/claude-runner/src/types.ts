// Re-export SDK types for convenience
import type { SDKMessage, Options } from '@anthropic-ai/claude-code'

export type ClaudeMessage = SDKMessage
export type SDKOptions = Options

export interface ClaudeRunnerConfig {
  workingDirectory?: string
  allowedTools?: string[]
  allowedDirectories?: string[] // Not part of SDK, but kept for backwards compatibility
  continueSession?: boolean
  workspaceName?: string
  maxTurns?: number
  // SDK options
  sdkOptions?: SDKOptions
  // Event callbacks
  onMessage?: (message: ClaudeMessage) => void
  onSessionStart?: () => void
  onSessionEnd?: (code: number | null) => void
  onSessionError?: (error: Error) => void
}

export interface ClaudeProcessInfo {
  process: null // No longer uses child process
  pid: undefined
  startedAt: Date
}

export interface ClaudeRunnerEvents {
  // SDK message events - just re-emit the raw SDK messages
  'message': (message: ClaudeMessage) => void
  
  // Session lifecycle events
  'session:start': () => void
  'session:end': (code: number | null) => void
  'session:error': (error: Error) => void
}