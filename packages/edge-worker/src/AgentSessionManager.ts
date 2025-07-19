import { LinearClient } from '@linear/sdk'
import type { SDKMessage } from 'cyrus-claude-runner'

// Claude Code SDK types (local definitions since not available in edge-worker)
export type ApiKeySource = 'user' | 'project' | 'org' | 'temporary'
export type PermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan'

export interface NonNullableUsage {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

export interface SDKSystemMessage {
  type: 'system'
  subtype: 'init'
  apiKeySource: ApiKeySource
  cwd: string
  session_id: string
  tools: string[]
  mcp_servers: {
    name: string
    status: string
  }[]
  model: string
  permissionMode: PermissionMode
}

export interface SDKUserMessage {
  type: 'user'
  message: any // MessageParam from Anthropic SDK
  parent_tool_use_id: string | null
  session_id: string
}

export interface SDKAssistantMessage {
  type: 'assistant'
  message: any // Message from Anthropic SDK
  parent_tool_use_id: string | null
  session_id: string
}

export interface SDKResultMessage {
  type: 'result'
  subtype: 'success' | 'error_max_turns' | 'error_during_execution'
  duration_ms: number
  duration_api_ms: number
  is_error: boolean
  num_turns: number
  result?: string  // Only present for success
  session_id: string
  total_cost_usd: number
  usage: NonNullableUsage
}

// Linear Agent Sessions enums (not exported by Linear SDK)
export enum AgentSessionType {
  Action = "action",
  Elicitation = "elicitation", 
  Error = "error",
  Prompt = "prompt",
  Response = "response",
  Thought = "thought",
  CommentThread = "commentThread"
}

export enum AgentSessionStatus {
  Active = "active",
  AwaitingInput = "awaitingInput",
  Complete = "complete", 
  Error = "error",
  Pending = "pending"
}

// Internal Agent Session representation
export interface AgentSession {
  id: string
  type: AgentSessionType
  status: AgentSessionStatus
  context: AgentSessionType
  issueId: string
  sessionId: string
  createdAt: Date
  updatedAt: Date
  metadata?: {
    model?: string
    tools?: string[]
    permissionMode?: string
    apiKeySource?: string
    totalCostUsd?: number
    usage?: NonNullableUsage
  }
}

export interface AgentSessionEntry {
  id: string
  sessionId: string
  type: 'user' | 'assistant' | 'system' | 'result'
  content: string
  metadata?: {
    toolUseId?: string
    parentToolUseId?: string | undefined
    timestamp: Date
    durationMs?: number
    isError?: boolean
  }
}

/**
 * Manages Linear Agent Sessions integration with Claude Code SDK
 * Transforms Claude streaming messages into Agent Session format
 * Handles session lifecycle: create → active → complete/error
 */
export class AgentSessionManager {
  private sessions: Map<string, AgentSession> = new Map()
  private entries: Map<string, AgentSessionEntry[]> = new Map()

  constructor(public readonly linearClient: LinearClient) {}

  /**
   * Create a new Agent Session from Claude system initialization
   */
  async createSession(systemMessage: SDKSystemMessage, issueId: string): Promise<AgentSession> {
    const agentSession: AgentSession = {
      id: this.generateId(),
      type: AgentSessionType.CommentThread,
      status: AgentSessionStatus.Active,
      context: AgentSessionType.CommentThread,
      issueId,
      sessionId: systemMessage.session_id,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        model: systemMessage.model,
        tools: systemMessage.tools,
        permissionMode: systemMessage.permissionMode,
        apiKeySource: systemMessage.apiKeySource
      }
    }

    // Store locally
    this.sessions.set(systemMessage.session_id, agentSession)
    this.entries.set(systemMessage.session_id, [])

    // Sync to Linear (create AgentContext since direct session creation not available)
    await this.syncSessionToLinear(agentSession)

    return agentSession
  }

  /**
   * Add a session entry from Claude user/assistant message
   */
  async addSessionEntry(sessionId: string, sdkMessage: SDKUserMessage | SDKAssistantMessage): Promise<AgentSessionEntry> {
    const sessionEntry: AgentSessionEntry = {
      id: this.generateId(),
      sessionId,
      type: sdkMessage.type,
      content: this.extractContent(sdkMessage),
      metadata: {
        timestamp: new Date(),
        parentToolUseId: sdkMessage.parent_tool_use_id || undefined,
        ...(sdkMessage.type === 'assistant' && {
          toolUseId: this.extractToolUseId(sdkMessage)
        })
      }
    }

    // Store locally
    const entries = this.entries.get(sessionId) || []
    entries.push(sessionEntry)
    this.entries.set(sessionId, entries)

    // Create AgentActivity in Linear
    await this.syncEntryToLinear(sessionEntry)

    return sessionEntry
  }

  /**
   * Complete a session from Claude result message
   */
  async completeSession(sessionId: string, resultMessage: SDKResultMessage): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      console.error(`[AgentSessionManager] No session found for ID: ${sessionId}`)
      return
    }

    const status = resultMessage.subtype === 'success' 
      ? AgentSessionStatus.Complete 
      : AgentSessionStatus.Error

    // Update session status and metadata
    await this.updateSessionStatus(sessionId, status, {
      totalCostUsd: resultMessage.total_cost_usd,
      usage: resultMessage.usage
    })

    // Add result entry if present
    if (resultMessage.result) {
      await this.addResultEntry(sessionId, resultMessage)
    }
  }

  /**
   * Handle streaming Claude messages and route to appropriate methods
   */
  async handleClaudeMessage(sessionId: string, message: SDKMessage, issueId: string): Promise<void> {
    try {
      switch (message.type) {
        case 'system':
          if ((message as SDKSystemMessage).subtype === 'init') {
            await this.createSession(message as SDKSystemMessage, issueId)
          }
          break

        case 'user':
        case 'assistant':
          await this.addSessionEntry(sessionId, message as SDKUserMessage | SDKAssistantMessage)
          break

        case 'result':
          await this.completeSession(sessionId, message as SDKResultMessage)
          break

        default:
          console.warn(`[AgentSessionManager] Unknown message type: ${(message as any).type}`)
      }
    } catch (error) {
      console.error(`[AgentSessionManager] Error handling message:`, error)
      // Mark session as error state
      await this.updateSessionStatus(sessionId, AgentSessionStatus.Error)
    }
  }

  /**
   * Update session status and metadata
   */
  private async updateSessionStatus(
    sessionId: string, 
    status: AgentSessionStatus, 
    additionalMetadata?: Partial<AgentSession['metadata']>
  ): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) return

    session.status = status
    session.updatedAt = new Date()
    
    if (additionalMetadata) {
      session.metadata = { ...session.metadata, ...additionalMetadata }
    }

    this.sessions.set(sessionId, session)

    // Sync status update to Linear
    await this.syncSessionToLinear(session)
  }

  /**
   * Add result entry from Claude result message
   */
  private async addResultEntry(sessionId: string, resultMessage: SDKResultMessage): Promise<void> {
    const resultEntry: AgentSessionEntry = {
      id: this.generateId(),
      sessionId,
      type: 'result',
      content: resultMessage.result || '',
      metadata: {
        timestamp: new Date(),
        durationMs: resultMessage.duration_ms,
        isError: resultMessage.is_error
      }
    }

    // Store locally
    const entries = this.entries.get(sessionId) || []
    entries.push(resultEntry)
    this.entries.set(sessionId, entries)

    // Sync to Linear
    await this.syncEntryToLinear(resultEntry)
  }

  /**
   * Extract content from Claude message
   */
  private extractContent(sdkMessage: SDKUserMessage | SDKAssistantMessage): string {
    const message = sdkMessage.message
    
    if (typeof message.content === 'string') {
      return message.content
    }
    
    if (Array.isArray(message.content)) {
      return message.content
        .map((block: any) => {
          if (block.type === 'text') {
            return block.text
          } else if (block.type === 'tool_use') {
            return `[Tool Use: ${block.name}]`
          }
          return ''
        })
        .filter(Boolean)
        .join('\n')
    }
    
    return ''
  }

  /**
   * Extract tool use ID from Claude assistant message
   */
  private extractToolUseId(sdkMessage: SDKAssistantMessage): string | undefined {
    const message = sdkMessage.message
    
    if (Array.isArray(message.content)) {
      const toolUse = message.content.find((block: any) => block.type === 'tool_use')
      return toolUse?.id
    }
    return undefined
  }

  /**
   * Sync Agent Session to Linear (create/update AgentContext)
   * Note: Linear Agent Sessions API structure is still being determined
   */
  private async syncSessionToLinear(session: AgentSession): Promise<void> {
    try {
      // TODO: Implement proper Linear Agent Sessions integration
      // For now, just log that we would sync to Linear
      console.log(`[AgentSessionManager] Would sync session ${session.sessionId} to Linear`)
      console.log(`Session details:`, {
        id: session.id,
        type: session.type,
        status: session.status,
        issueId: session.issueId,
        model: session.metadata?.model
      })
    } catch (error) {
      console.error(`[AgentSessionManager] Failed to sync session to Linear:`, error)
    }
  }

  /**
   * Sync Agent Session Entry to Linear (create AgentActivity)
   * Note: Linear Agent Sessions API structure is still being determined
   */
  private async syncEntryToLinear(entry: AgentSessionEntry): Promise<void> {
    try {
      // TODO: Implement proper Linear Agent Activity integration
      // For now, just log that we would sync to Linear
      console.log(`[AgentSessionManager] Would sync entry ${entry.id} to Linear`)
      console.log(`Entry details:`, {
        type: entry.type,
        sessionId: entry.sessionId,
        contentLength: entry.content.length
      })
    } catch (error) {
      console.error(`[AgentSessionManager] Failed to sync entry to Linear:`, error)
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `asm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): AgentSession | undefined {
    return this.sessions.get(sessionId)
  }

  /**
   * Get session entries by session ID
   */
  getSessionEntries(sessionId: string): AgentSessionEntry[] {
    return this.entries.get(sessionId) || []
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): AgentSession[] {
    return Array.from(this.sessions.values()).filter(
      session => session.status === AgentSessionStatus.Active
    )
  }

  /**
   * Clear completed sessions older than specified time
   */
  cleanup(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = new Date(Date.now() - olderThanMs)
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (
        (session.status === AgentSessionStatus.Complete || session.status === AgentSessionStatus.Error) &&
        session.updatedAt < cutoff
      ) {
        this.sessions.delete(sessionId)
        this.entries.delete(sessionId)
        console.log(`[AgentSessionManager] Cleaned up session ${sessionId}`)
      }
    }
  }
}