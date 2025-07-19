/**
 * Agent Session types for Linear Agent Sessions integration
 * These types represent the core data structures for tracking Claude Code sessions in Linear
 */

// Internal Agent Session representation (simplified)
export interface AgentSession {
  id: string
  type: string // LinearDocument.AgentSessionType.CommentThread
  status: string // LinearDocument.AgentSessionStatus
  context: string // LinearDocument.AgentSessionType.CommentThread
  issueId: string
  sessionId: string
  createdAt: Date
  updatedAt: Date
  linearContextId?: string // Track Linear AgentContext ID
  metadata?: {
    model?: string
    tools?: string[]
    permissionMode?: string
    apiKeySource?: string
    totalCostUsd?: number
    usage?: any
  }
}

export interface AgentSessionEntry {
  id: string
  sessionId: string
  type: 'user' | 'assistant' | 'system' | 'result'
  content: string
  linearActivityId?: string // Track Linear AgentActivity ID
  metadata?: {
    toolUseId?: string
    parentToolUseId?: string
    timestamp: Date
    durationMs?: number
    isError?: boolean
  }
}