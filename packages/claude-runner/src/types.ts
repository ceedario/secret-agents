import type { SDKMessage, McpServerConfig } from '@anthropic-ai/claude-code'

export interface ClaudeRunnerConfig {
  workingDirectory?: string
  allowedTools?: string[]
  allowedDirectories?: string[]
  continueSession?: boolean
  workspaceName?: string
  systemPrompt?: string
  appendSystemPrompt?: string  // Additional prompt to append to the default system prompt
  mcpConfigPath?: string | string[]  // Single path or array of paths to compose
  mcpConfig?: Record<string, McpServerConfig>  // Additional/override MCP servers
  onMessage?: (message: SDKMessage) => void
  onError?: (error: Error) => void
  onComplete?: (messages: SDKMessage[]) => void
}

export interface ClaudeSessionInfo {
  sessionId: string
  startedAt: Date
  isRunning: boolean
}

export interface ClaudeRunnerEvents {
  'message': (message: SDKMessage) => void
  'assistant': (content: string) => void
  'tool-use': (toolName: string, input: any) => void
  'text': (text: string) => void
  'end-turn': (lastText: string) => void
  'error': (error: Error) => void
  'complete': (messages: SDKMessage[]) => void
}

// Re-export SDK types for convenience
export type { SDKMessage, McpServerConfig } from '@anthropic-ai/claude-code'