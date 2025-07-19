import { 
  LinearClient,
  LinearDocument
} from '@linear/sdk'
import type { 
  SDKMessage, 
  SDKSystemMessage, 
  SDKUserMessage, 
  SDKAssistantMessage, 
  SDKResultMessage
} from 'cyrus-claude-runner'
import type { AgentSession, AgentSessionEntry } from 'cyrus-core'

/**
 * Manages Linear Agent Sessions integration with Claude Code SDK
 * Transforms Claude streaming messages into Agent Session format
 * Handles session lifecycle: create → active → complete/error
 */
export class AgentSessionManager {
  private linearClient: LinearClient
  private sessions: Map<string, AgentSession> = new Map()
  private entries: Map<string, AgentSessionEntry[]> = new Map()

  constructor(linearClient: LinearClient) {
    this.linearClient = linearClient
  }

  /**
   * Create a new Agent Session from Claude system initialization
   */
  async createSession(systemMessage: SDKSystemMessage, issueId: string): Promise<AgentSession> {
    const agentSession: AgentSession = {
      id: this.generateId(),
      type: 'commentThread', // LinearDocument.AgentSessionType.CommentThread
      status: 'active', // LinearDocument.AgentSessionStatus.Active
      context: 'commentThread', // LinearDocument.AgentSessionType.CommentThread
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

    // Sync to Linear (create AgentContext)
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
      ? 'complete' // LinearDocument.AgentSessionStatus.Complete 
      : 'error' // LinearDocument.AgentSessionStatus.Error

    // Update session status and metadata
    await this.updateSessionStatus(sessionId, status, {
      totalCostUsd: resultMessage.total_cost_usd,
      usage: resultMessage.usage
    })

    // Add result entry if present
    if ('result' in resultMessage && resultMessage.result) {
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
          if (message.subtype === 'init') {
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
      await this.updateSessionStatus(sessionId, 'error') // LinearDocument.AgentSessionStatus.Error
    }
  }

  /**
   * Update session status and metadata
   */
  private async updateSessionStatus(
    sessionId: string, 
    status: string, // AgentSessionStatus 
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
      content: 'result' in resultMessage ? resultMessage.result : '',
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
   */
  private async syncSessionToLinear(session: AgentSession): Promise<void> {
    try {
      // Note: Linear AgentContextCreateInput requires commentId, creatorId, sourceUrl
      // For now, we'll create a placeholder approach since we don't have these values
      const contextInput: LinearDocument.AgentContextCreateInput = {
        commentId: session.issueId, // Using issueId as placeholder
        creatorId: 'system', // Placeholder - should be actual user ID
        sourceUrl: `https://linear.app/issue/${session.issueId}`, // Placeholder URL
        type: LinearDocument.AgentSessionType.CommentThread // Use actual enum value for API
      }

      // Create AgentContext in Linear
      const result = await this.linearClient.createAgentContext(contextInput)
      
      if (result.success && result.agentContext) {
        const agentContext = await result.agentContext; session.linearContextId = agentContext.id
        console.log(`[AgentSessionManager] Synced session ${session.sessionId} to Linear context ${session.linearContextId}`)
      } else {
        console.error(`[AgentSessionManager] Failed to create Linear context: success=${result.success}`)
      }
    } catch (error) {
      console.error(`[AgentSessionManager] Failed to sync session to Linear:`, error)
    }
  }

  /**
   * Sync Agent Session Entry to Linear (create AgentActivity)
   */
  private async syncEntryToLinear(entry: AgentSessionEntry): Promise<void> {
    try {
      const session = this.sessions.get(entry.sessionId)
      if (!session || !session.linearContextId) {
        console.warn(`[AgentSessionManager] No Linear context ID for session ${entry.sessionId}`)
        return
      }

      // Determine activity type based on entry type
      let activityType: LinearDocument.AgentActivityType
      switch (entry.type) {
        case 'user':
          activityType = LinearDocument.AgentActivityType.Prompt
          break
        case 'assistant':
          activityType = LinearDocument.AgentActivityType.Response
          break
        case 'system':
          activityType = LinearDocument.AgentActivityType.Thought
          break
        case 'result':
          activityType = entry.metadata?.isError ? LinearDocument.AgentActivityType.Error : LinearDocument.AgentActivityType.Action
          break
        default:
          activityType = LinearDocument.AgentActivityType.Thought
      }

      const activityInput: LinearDocument.AgentActivityCreateInput = {
        agentSessionId: session.linearContextId || session.sessionId, // Use Linear context ID or fallback
        content: {
          type: activityType,
          entryType: entry.type,
          content: entry.content,
          toolUseId: entry.metadata?.toolUseId,
          parentToolUseId: entry.metadata?.parentToolUseId,
          timestamp: entry.metadata?.timestamp?.toISOString(),
          durationMs: entry.metadata?.durationMs,
          isError: entry.metadata?.isError
        }
      }

      const result = await this.linearClient.createAgentActivity(activityInput)
      
      if (result.success && result.agentActivity) {
        const agentActivity = await result.agentActivity; entry.linearActivityId = agentActivity.id
        console.log(`[AgentSessionManager] Synced entry ${entry.id} to Linear activity ${entry.linearActivityId}`)
      } else {
        console.error(`[AgentSessionManager] Failed to create Linear activity: success=${result.success}`)
      }
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
      session => session.status === 'active' // LinearDocument.AgentSessionStatus.Active
    )
  }

  /**
   * Get sessions by issue ID
   */
  getSessionsByIssueId(issueId: string): AgentSession[] {
    return Array.from(this.sessions.values()).filter(
      session => session.issueId === issueId
    )
  }

  /**
   * Get active sessions by issue ID
   */
  getActiveSessionsByIssueId(issueId: string): AgentSession[] {
    return Array.from(this.sessions.values()).filter(
      session => session.issueId === issueId && session.status === 'active' // LinearDocument.AgentSessionStatus.Active
    )
  }

  /**
   * Get all sessions
   */
  getAllSessions(): AgentSession[] {
    return Array.from(this.sessions.values())
  }

  /**
   * Clear completed sessions older than specified time
   */
  cleanup(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = new Date(Date.now() - olderThanMs)
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (
        (session.status === 'complete' || session.status === 'error') &&
        session.updatedAt < cutoff
      ) {
        this.sessions.delete(sessionId)
        this.entries.delete(sessionId)
        console.log(`[AgentSessionManager] Cleaned up session ${sessionId}`)
      }
    }
  }

  /**
   * Serialize Agent Session state for persistence
   */
  serializeState(): { sessions: Record<string, any>, entries: Record<string, any[]> } {
    const sessions: Record<string, any> = {}
    const entries: Record<string, any[]> = {}

    // Serialize sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      sessions[sessionId] = {
        ...session,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString()
      }
    }

    // Serialize entries
    for (const [sessionId, sessionEntries] of this.entries.entries()) {
      entries[sessionId] = sessionEntries.map(entry => ({
        ...entry,
        metadata: {
          ...entry.metadata,
          timestamp: entry.metadata?.timestamp?.toISOString()
        }
      }))
    }

    return { sessions, entries }
  }

  /**
   * Restore Agent Session state from serialized data
   */
  restoreState(serializedSessions: Record<string, any>, serializedEntries: Record<string, any[]>): void {
    // Clear existing state
    this.sessions.clear()
    this.entries.clear()

    // Restore sessions
    for (const [sessionId, sessionData] of Object.entries(serializedSessions)) {
      const session: AgentSession = {
        ...sessionData,
        createdAt: new Date(sessionData.createdAt),
        updatedAt: new Date(sessionData.updatedAt)
      }
      this.sessions.set(sessionId, session)
    }

    // Restore entries
    for (const [sessionId, entriesData] of Object.entries(serializedEntries)) {
      const sessionEntries: AgentSessionEntry[] = entriesData.map(entryData => ({
        ...entryData,
        metadata: {
          ...entryData.metadata,
          timestamp: entryData.metadata?.timestamp ? new Date(entryData.metadata.timestamp) : new Date()
        }
      }))
      this.entries.set(sessionId, sessionEntries)
    }

    console.log(`[AgentSessionManager] Restored ${this.sessions.size} sessions and ${Object.keys(serializedEntries).length} entry collections`)
  }
}