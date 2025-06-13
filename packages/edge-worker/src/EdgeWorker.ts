import { EventEmitter } from 'events'
import { LinearClient } from '@linear/sdk'
import { NdjsonClient } from '@cyrus/ndjson-client'
import { ClaudeRunner, getSafeTools } from '@cyrus/claude-runner'
import { SessionManager, Session } from '@cyrus/core'
import type { EdgeWorkerConfig, EdgeWorkerEvents, RepositoryConfig } from './types.js'
import type { WebhookEvent, StatusUpdate } from '@cyrus/ndjson-client'
import type { ClaudeMessage } from '@cyrus/claude-runner'
import { readFile, writeFile, mkdir, rename, readdir } from 'fs/promises'
import { resolve, dirname, join, basename, extname } from 'path'
import { fileURLToPath } from 'url'
import { homedir } from 'os'
import { fileTypeFromBuffer } from 'file-type'
import { existsSync } from 'fs'

export declare interface EdgeWorker {
  on<K extends keyof EdgeWorkerEvents>(event: K, listener: EdgeWorkerEvents[K]): this
  emit<K extends keyof EdgeWorkerEvents>(event: K, ...args: Parameters<EdgeWorkerEvents[K]>): boolean
}

/**
 * Unified edge worker that orchestrates NDJSON streaming, Claude processing, and Linear integration
 */
export class EdgeWorker extends EventEmitter {
  private config: EdgeWorkerConfig
  private repositories: Map<string, RepositoryConfig> = new Map()
  private linearClients: Map<string, LinearClient> = new Map()
  private ndjsonClients: Map<string, NdjsonClient> = new Map()
  private sessionManager: SessionManager
  private claudeRunners: Map<string, ClaudeRunner> = new Map()
  private sessionToRepo: Map<string, string> = new Map() // Maps session ID to repository ID
  private issueToCommentId: Map<string, string> = new Map() // Maps issue ID to initial comment ID
  private issueToReplyContext: Map<string, { commentId: string; parentId?: string }> = new Map() // Maps issue ID to reply context

  constructor(config: EdgeWorkerConfig) {
    super()
    this.config = config
    this.sessionManager = new SessionManager()

    // Initialize repositories
    for (const repo of config.repositories) {
      if (repo.isActive !== false) {
        this.repositories.set(repo.id, repo)
        
        // Create Linear client for this repository's workspace
        this.linearClients.set(repo.id, new LinearClient({
          accessToken: repo.linearToken
        }))
      }
    }

    // Group repositories by token to minimize NDJSON connections
    const tokenToRepos = new Map<string, RepositoryConfig[]>()
    for (const repo of this.repositories.values()) {
      const repos = tokenToRepos.get(repo.linearToken) || []
      repos.push(repo)
      tokenToRepos.set(repo.linearToken, repos)
    }

    // Create one NDJSON client per unique token
    for (const [token, repos] of tokenToRepos) {
      const ndjsonClient = new NdjsonClient({
        proxyUrl: config.proxyUrl,
        token: token,
        onConnect: () => this.handleConnect(token),
        onDisconnect: (reason) => this.handleDisconnect(token, reason),
        onError: (error) => this.handleError(error)
      })

      // Set up webhook handler
      ndjsonClient.on('webhook', (data) => this.handleWebhook(data, repos))
      
      // Optional heartbeat logging
      if (process.env.DEBUG_EDGE === 'true') {
        ndjsonClient.on('heartbeat', () => {
          console.log(`❤️ Heartbeat received for token ending in ...${token.slice(-4)}`)
        })
      }

      this.ndjsonClients.set(token, ndjsonClient)
    }
  }

  /**
   * Start the edge worker
   */
  async start(): Promise<void> {
    // Connect all NDJSON clients
    const connections = Array.from(this.ndjsonClients.values()).map(client => 
      client.connect()
    )
    await Promise.all(connections)
  }

  /**
   * Stop the edge worker
   */
  async stop(): Promise<void> {
    // Kill all Claude processes
    for (const [, runner] of this.claudeRunners) {
      runner.kill()
    }
    this.claudeRunners.clear()
    
    // Clear all sessions
    for (const [issueId] of this.sessionManager.getAllSessions()) {
      this.sessionManager.removeSession(issueId)
    }
    this.sessionToRepo.clear()
    
    // Disconnect all NDJSON clients
    for (const client of this.ndjsonClients.values()) {
      client.disconnect()
    }
  }

  /**
   * Handle connection established
   */
  private handleConnect(token: string): void {
    this.emit('connected', token)
    console.log(`✅ Connected to proxy with token ending in ...${token.slice(-4)}`)
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(token: string, reason?: string): void {
    this.emit('disconnected', token, reason)
    console.log(`❌ Disconnected from proxy (token ...${token.slice(-4)}): ${reason || 'Unknown reason'}`)
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    this.emit('error', error)
    this.config.handlers?.onError?.(error)
  }

  /**
   * Check if Claude logs exist for a workspace
   */
  private async hasExistingLogs(workspaceName: string): Promise<boolean> {
    try {
      const logsDir = join(homedir(), '.cyrus', 'logs', workspaceName)
      
      // Check if directory exists
      if (!existsSync(logsDir)) {
        return false
      }
      
      // Check if directory has any log files
      const files = await readdir(logsDir)
      return files.some(file => file.endsWith('.jsonl'))
    } catch (error) {
      console.error(`Failed to check logs for workspace ${workspaceName}:`, error)
      return false
    }
  }

  /**
   * Handle webhook events from proxy
   */
  private async handleWebhook(data: WebhookEvent['data'], repos: RepositoryConfig[]): Promise<void> {
    // Find the appropriate repository for this webhook
    const repository = this.findRepositoryForWebhook(data, repos)
    if (!repository) {
      console.log('No repository configured for webhook from workspace', this.extractWorkspaceId(data))
      return
    }
    try {
      // Check for Agent notifications
      if (data.type === 'AppUserNotification') {
        await this.handleAgentNotification(data, repository)
      } else {
        // Handle legacy webhook format
        await this.handleLegacyWebhook(data, repository)
      }
      
      // Report success if we have an event ID
      if ('eventId' in data && data.eventId) {
        await this.reportStatus({
          eventId: data.eventId as string,
          status: 'completed'
        })
      }
    } catch (error) {
      // Report failure
      if ('eventId' in data && data.eventId) {
        await this.reportStatus({
          eventId: data.eventId as string,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
      throw error
    }
  }

  /**
   * Handle Agent API notifications
   */
  private async handleAgentNotification(data: any, repository: RepositoryConfig): Promise<void> {
    const notification = data.notification
    
    switch (notification?.type) {
      case 'issueAssignedToYou':
        await this.handleIssueAssigned(notification.issue, repository)
        break
        
      case 'issueCommentMention':
      case 'issueCommentReply':
      case 'issueNewComment':
        await this.handleNewComment(notification.issue, notification.comment, repository)
        break
        
      case 'issueUnassignedFromYou':
        await this.handleIssueUnassigned(notification.issue, repository)
        break
        
      default:
        console.log(`Unhandled notification type: ${notification?.type}`)
    }
  }

  /**
   * Handle legacy webhook format
   */
  private async handleLegacyWebhook(data: any, repository: RepositoryConfig): Promise<void> {
    if (data.type === 'Comment' && data.action === 'create') {
      const issue = data.data?.issue
      const comment = data.data
      if (issue && comment) {
        await this.handleNewComment(issue, comment, repository)
      }
    }
  }

  /**
   * Find the repository configuration for a webhook
   */
  private findRepositoryForWebhook(data: any, repos: RepositoryConfig[]): RepositoryConfig | null {
    const workspaceId = this.extractWorkspaceId(data)
    if (!workspaceId) return repos[0] || null // Fallback to first repo if no workspace ID

    return repos.find(repo => repo.linearWorkspaceId === workspaceId) || null
  }

  /**
   * Extract workspace ID from webhook data
   */
  private extractWorkspaceId(data: any): string | null {
    // Try different locations where workspace ID might be
    return data.organizationId || 
           data.workspaceId || 
           data.data?.workspaceId || 
           data.notification?.issue?.team?.id ||
           null
  }

  /**
   * Handle issue assignment
   */
  private async handleIssueAssigned(issue: any, repository: RepositoryConfig): Promise<void> {
    console.log(`[EdgeWorker] handleIssueAssigned started for issue ${issue.identifier} (${issue.id})`)
    
    // Post initial comment immediately
    const initialComment = await this.postInitialComment(issue.id, repository.id)
    
    // Create workspace
    const workspace = this.config.handlers?.createWorkspace
      ? await this.config.handlers.createWorkspace(issue, repository)
      : {
          path: `${repository.workspaceBaseDir}/${issue.identifier}`,
          isGitWorktree: false
        }

    console.log(`[EdgeWorker] Workspace created at: ${workspace.path}`)

    // Download attachments before creating Claude runner
    const attachmentResult = await this.downloadIssueAttachments(issue, repository, workspace.path)
    
    // Build allowed directories list
    const allowedDirectories: string[] = []
    if (attachmentResult.attachmentsDir) {
      allowedDirectories.push(attachmentResult.attachmentsDir)
    }

    // Create Claude runner with attachment directory access
    const runner = new ClaudeRunner({
      claudePath: this.config.claudePath,
      workingDirectory: workspace.path,
      allowedTools: repository.allowedTools || this.config.defaultAllowedTools || getSafeTools(),
      allowedDirectories,
      workspaceName: issue.identifier,
      onEvent: (event) => this.handleClaudeEvent(issue.id, event, repository.id),
      onExit: (code) => this.handleClaudeExit(issue.id, code, repository.id)
    })

    // Store runner
    this.claudeRunners.set(issue.id, runner)

    // Spawn Claude process
    const processInfo = runner.spawn()

    // Create session
    const session = new Session({
      issue,
      workspace,
      process: processInfo.process,
      startedAt: processInfo.startedAt
    })
    
    // Store initial comment ID if we have one
    if (initialComment?.id) {
      this.issueToCommentId.set(issue.id, initialComment.id)
    }
    
    this.sessionManager.addSession(issue.id, session)
    this.sessionToRepo.set(issue.id, repository.id)

    // Emit events
    this.emit('session:started', issue.id, issue, repository.id)
    this.config.handlers?.onSessionStart?.(issue.id, issue, repository.id)

    // Build and send initial prompt with attachment manifest
    console.log(`[EdgeWorker] Building initial prompt for issue ${issue.identifier}`)
    try {
      const prompt = await this.buildInitialPrompt(issue, repository, attachmentResult.manifest)
      console.log(`[EdgeWorker] Initial prompt built successfully, length: ${prompt.length} characters`)
      console.log(`[EdgeWorker] Sending initial prompt to Claude runner`)
      await runner.sendInitialPrompt(prompt)
      console.log(`[EdgeWorker] Initial prompt sent successfully`)
    } catch (error) {
      console.error(`[EdgeWorker] Error in prompt building/sending:`, error)
      throw error
    }
  }

  /**
   * Handle new comment on issue
   */
  private async handleNewComment(issue: any, comment: any, repository: RepositoryConfig): Promise<void> {
    // Check if continuation is enabled
    if (!this.config.features?.enableContinuation) {
      console.log('Continuation not enabled, ignoring comment')
      return
    }

    // The webhook doesn't include parentId, so we need to fetch the full comment
    let replyParentId = comment.id // Default to treating it as root
    
    try {
      const linearClient = this.linearClients.get(repository.id)
      if (linearClient && comment.id) {
        // Fetch the full comment data - comment() expects an object with id property
        // See: node_modules/.pnpm/@linear+sdk@39.0.0/node_modules/@linear/sdk/dist/_generated_sdk.d.ts:L.CommentQueryVariables
        const fullComment = await linearClient.comment({ id: comment.id })
        
        // Check if comment has a parent (is a reply in a thread)
        // Try the async parent relation
        if (fullComment.parent) {
          const parent = await fullComment.parent
          if (parent?.id) {
            replyParentId = parent.id
          }
        }
        // If no parent found, replyParentId stays as comment.id (treat as root)
      }
    } catch (error) {
      console.error('Failed to fetch full comment data:', error)
    }
    
    this.issueToReplyContext.set(issue.id, {
      commentId: comment.id,
      parentId: replyParentId
    })
    console.log(`Stored reply context for issue ${issue.id}: commentId=${comment.id}, replyParentId=${replyParentId}`)
    
    // Post immediate reply that will be updated with TODOs
    try {
      const immediateReply = await this.postComment(
        issue.id,
        "I'm getting started on that right away. I'll update this comment with my plan as I work through it.",
        repository.id,
        replyParentId
      )
      
      if (immediateReply?.id) {
        // Store this as the comment to update with TODOs
        this.issueToCommentId.set(issue.id, immediateReply.id)
        console.log(`Posted immediate reply with ID: ${immediateReply.id}`)
      }
    } catch (error) {
      console.error('Failed to post immediate reply:', error)
    }

    let session = this.sessionManager.getSession(issue.id)
    
    // If no session exists, we need to create one
    if (!session) {
      console.log(`No active session for issue ${issue.identifier}, checking for existing logs...`)
      
      // Check if we have existing logs for this issue
      const hasLogs = await this.hasExistingLogs(issue.identifier)
      
      if (!hasLogs) {
        console.log(`No existing logs found for ${issue.identifier}, treating as new assignment`)
        // Start fresh - treat it like a new assignment
        await this.handleIssueAssigned(issue, repository)
        return
      }
      
      console.log(`Found existing logs for ${issue.identifier}, creating session for continuation`)
      
      // Create workspace (or get existing one)
      const workspace = this.config.handlers?.createWorkspace
        ? await this.config.handlers.createWorkspace(issue, repository)
        : {
            path: `${repository.workspaceBaseDir}/${issue.identifier}`,
            isGitWorktree: false
          }
      
      // Create session without spawning Claude yet
      session = new Session({
        issue,
        workspace,
        process: null,
        startedAt: new Date()
      })
      
      this.sessionManager.addSession(issue.id, session)
      this.sessionToRepo.set(issue.id, repository.id)
    }

    // Kill existing Claude process if running
    const existingRunner = this.claudeRunners.get(issue.id)
    if (existingRunner) {
      existingRunner.kill()
    }

    try {
      // Create new runner with --continue flag
      const runner = new ClaudeRunner({
        claudePath: this.config.claudePath,
        workingDirectory: session.workspace.path,
        allowedTools: repository.allowedTools || this.config.defaultAllowedTools || getSafeTools(),
        continueSession: true,
        workspaceName: issue.identifier,
        onEvent: (event) => {
          // Check for continuation errors
          if (event.type === 'assistant' && 'message' in event && event.message?.content) {
            const content = Array.isArray(event.message.content) ? event.message.content : [event.message.content]
            for (const item of content) {
              if (item?.type === 'text' && item.text?.includes('tool_use` ids were found without `tool_result` blocks')) {
                console.log('Detected corrupted conversation history, will restart fresh')
                // Kill this runner
                runner.kill()
                // Remove from map
                this.claudeRunners.delete(issue.id)
                // Start fresh
                this.handleIssueAssigned(issue, repository).catch(console.error)
                return
              }
            }
          }
          this.handleClaudeEvent(issue.id, event, repository.id)
        },
        onExit: (code) => this.handleClaudeExit(issue.id, code, repository.id)
      })

      // Store new runner
      this.claudeRunners.set(issue.id, runner)

      // Spawn new process
      runner.spawn()

      // Send comment as input
      await runner.sendInput(comment.body || comment.text || '')
    } catch (error) {
      console.error('Failed to continue conversation, starting fresh:', error)
      // Remove any partially created session
      this.sessionManager.removeSession(issue.id)
      this.sessionToRepo.delete(issue.id)
      // Start fresh
      await this.handleIssueAssigned(issue, repository)
    }
  }

  /**
   * Handle issue unassignment
   */
  private async handleIssueUnassigned(issue: any, repository: RepositoryConfig): Promise<void> {
    // Check if there's an active session for this issue
    const session = this.sessionManager.getSession(issue.id)
    const initialCommentId = this.issueToCommentId.get(issue.id)
    
    // Post farewell comment if there's an active session
    if (session && initialCommentId) {
      await this.postComment(
        issue.id,
        "I've been unassigned and am stopping work now.",
        repository.id,
        initialCommentId  // Post as reply to initial comment
      )
    }
    
    // Kill Claude process
    const runner = this.claudeRunners.get(issue.id)
    if (runner) {
      runner.kill()
      this.claudeRunners.delete(issue.id)
    }

    // Remove session
    this.sessionManager.removeSession(issue.id)
    const repoId = this.sessionToRepo.get(issue.id)
    this.sessionToRepo.delete(issue.id)
    
    // Clean up comment ID mapping
    this.issueToCommentId.delete(issue.id)

    // Emit events
    this.emit('session:ended', issue.id, null, repoId || repository.id)
    this.config.handlers?.onSessionEnd?.(issue.id, null, repoId || repository.id)
  }

  /**
   * Handle Claude events
   */
  private async handleClaudeEvent(issueId: string, event: ClaudeMessage, repositoryId: string): Promise<void> {
    // Emit generic event
    this.emit('claude:event', issueId, event, repositoryId)
    this.config.handlers?.onClaudeEvent?.(issueId, event, repositoryId)

    // Handle specific events
    if (event.type === 'assistant') {
      const content = this.extractTextContent(event)
      if (content) {
        this.emit('claude:response', issueId, content, repositoryId)
        // Don't post assistant messages anymore - wait for result
      }
      
      // Also check for tool use in assistant messages
      if ('message' in event && event.message && 'content' in event.message) {
        const messageContent = Array.isArray(event.message.content) ? event.message.content : [event.message.content]
        for (const item of messageContent) {
          if (item && typeof item === 'object' && 'type' in item && item.type === 'tool_use') {
            this.emit('claude:tool-use', issueId, item.name, item.input, repositoryId)
            
            // Handle TodoWrite tool specifically
            if ('name' in item && item.name === 'TodoWrite' && 'input' in item && item.input?.todos) {
              console.log(`[EdgeWorker] Detected TodoWrite tool use with ${item.input.todos.length} todos`)
              await this.updateCommentWithTodos(issueId, item.input.todos, repositoryId)
            }
          }
        }
      }
    } else if (event.type === 'result' && 'result' in event && event.result) {
      // Post the final result to Linear
      // Check if we have reply context (from a comment mention)
      const replyContext = this.issueToReplyContext.get(issueId)
      if (replyContext) {
        // Reply to the comment that mentioned us, using appropriate parentId
        await this.postComment(issueId, event.result, repositoryId, replyContext.parentId)
        // Clear the reply context after using it
        this.issueToReplyContext.delete(issueId)
      } else {
        // Fall back to replying to initial comment (for direct assignments)
        const initialCommentId = this.issueToCommentId.get(issueId)
        await this.postComment(issueId, event.result, repositoryId, initialCommentId)
      }
    } else if (event.type === 'error' || event.type === 'tool_error') {
      const errorMessage = 'message' in event ? event.message : 'error' in event ? event.error : 'Unknown error'
      this.handleError(new Error(`Claude error: ${errorMessage}`))
    }

    // Handle token limit
    if (this.config.features?.enableTokenLimitHandling && event.type === 'error') {
      if ('message' in event && event.message?.includes('token')) {
        await this.handleTokenLimit(issueId, repositoryId)
      }
    }
  }

  /**
   * Handle Claude process exit
   */
  private handleClaudeExit(issueId: string, code: number | null, repositoryId: string): void {
    this.claudeRunners.delete(issueId)
    this.sessionToRepo.delete(issueId)
    this.emit('session:ended', issueId, code, repositoryId)
    this.config.handlers?.onSessionEnd?.(issueId, code, repositoryId)
  }

  /**
   * Handle token limit by restarting session
   */
  private async handleTokenLimit(issueId: string, repositoryId: string): Promise<void> {
    const session = this.sessionManager.getSession(issueId)
    if (!session) return

    const repository = this.repositories.get(repositoryId)
    if (!repository) return

    // Post warning to Linear
    await this.postComment(
      issueId,
      '[System] Token limit reached. Starting fresh session with issue context.',
      repositoryId
    )

    // Restart session
    await this.handleIssueAssigned(session.issue, repository)
  }

  /**
   * Build initial prompt for issue
   */
  private async buildInitialPrompt(issue: any, repository: RepositoryConfig, attachmentManifest: string = ''): Promise<string> {
    console.log(`[EdgeWorker] buildInitialPrompt called for issue ${issue.identifier}`)
    try {
      // Use custom template if provided (repository-specific takes precedence)
      let templatePath = repository.promptTemplatePath || this.config.features?.promptTemplatePath
      
      // If no custom template, use the default one
      if (!templatePath) {
        const __filename = fileURLToPath(import.meta.url)
        const __dirname = dirname(__filename)
        templatePath = resolve(__dirname, '../prompt-template.md')
      }

      // Load the template
      console.log(`[EdgeWorker] Loading prompt template from: ${templatePath}`)
      const template = await readFile(templatePath, 'utf-8')
      console.log(`[EdgeWorker] Template loaded, length: ${template.length} characters`)
      
      // Get comment history
      const linearClient = this.linearClients.get(repository.id)
      let commentHistory = ''
      let latestComment = ''
      
      if (linearClient && issue.id) {
        try {
          const comments = await linearClient.comments({
            filter: { issue: { id: { eq: issue.id } } }
          })
          
          const commentNodes = await comments.nodes
          if (commentNodes.length > 0) {
            commentHistory = commentNodes.map((comment: any, index: number) => 
              `Comment ${index + 1} by ${comment.user?.name || 'Unknown'} at ${comment.createdAt}:\n${comment.body}`
            ).join('\n\n')
            
            latestComment = commentNodes[commentNodes.length - 1]?.body || ''
          }
        } catch (error) {
          console.error('Failed to fetch comments:', error)
        }
      }
      
      // Replace template variables
      const prompt = template
        .replace(/{{repository_name}}/g, repository.name)
        .replace(/{{issue_id}}/g, issue.id || issue.identifier || '')
        .replace(/{{issue_title}}/g, issue.title || '')
        .replace(/{{issue_description}}/g, issue.description || 'No description provided')
        .replace(/{{issue_state}}/g, issue.state?.name || 'Unknown')
        .replace(/{{issue_priority}}/g, issue.priority?.toString() || 'None')
        .replace(/{{issue_url}}/g, issue.url || '')
        .replace(/{{comment_history}}/g, commentHistory || 'No comments yet')
        .replace(/{{latest_comment}}/g, latestComment || 'No comments yet')
        .replace(/{{working_directory}}/g, this.config.handlers?.createWorkspace ? 
          'Will be created based on issue' : repository.repositoryPath)
        .replace(/{{base_branch}}/g, repository.baseBranch)
        .replace(/{{branch_name}}/g, issue.branchName || `${issue.identifier}-${issue.title?.toLowerCase().replace(/\s+/g, '-').substring(0, 30)}`)
      
      // Append attachment manifest if provided
      if (attachmentManifest) {
        console.log(`[EdgeWorker] Adding attachment manifest, length: ${attachmentManifest.length} characters`)
        const finalPrompt = prompt + '\n\n' + attachmentManifest
        console.log(`[EdgeWorker] Final prompt with attachments, total length: ${finalPrompt.length} characters`)
        return finalPrompt
      }
      
      console.log(`[EdgeWorker] Returning prompt without attachments, length: ${prompt.length} characters`)
      return prompt
    } catch (error) {
      console.error('[EdgeWorker] Failed to load prompt template:', error)
      
      // Fallback to simple prompt
      return `Please help me with the following Linear issue:

Repository: ${repository.name}
Issue: ${issue.identifier}
Title: ${issue.title}
Description: ${issue.description || 'No description provided'}

Working directory: ${repository.repositoryPath}
Base branch: ${repository.baseBranch}

Please analyze this issue and help implement a solution.`
    }
  }

  /**
   * Extract text content from Claude event
   */
  private extractTextContent(event: any): string | null {
    if (event.type !== 'assistant') return null
    
    const message = event.message
    if (!message?.content) return null

    if (typeof message.content === 'string') {
      return message.content
    }

    if (Array.isArray(message.content)) {
      return message.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('')
    }

    return null
  }

  /**
   * Report status back to proxy
   */
  private async reportStatus(update: StatusUpdate): Promise<void> {
    // Find which client to use based on the event ID
    // For now, send to all clients (they'll ignore if not their event)
    const promises = Array.from(this.ndjsonClients.values()).map(client => 
      client.sendStatus(update).catch(err => 
        console.error('Failed to send status update:', err)
      )
    )
    await Promise.all(promises)
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): Map<string, boolean> {
    const status = new Map<string, boolean>()
    for (const [token, client] of this.ndjsonClients) {
      status.set(token, client.isConnected())
    }
    return status
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessionManager.getAllSessions().keys())
  }

  /**
   * Post initial comment when assigned to issue
   */
  private async postInitialComment(issueId: string, repositoryId: string): Promise<{ id: string } | null> {
    try {
      const body = "I've been assigned to this issue and am getting started right away. I'll update this comment with my plan shortly."
      
      // Get the Linear client for this repository
      const linearClient = this.linearClients.get(repositoryId)
      if (!linearClient) {
        throw new Error(`No Linear client found for repository ${repositoryId}`)
      }

      const commentData: any = {
        issueId,
        body
      }

      const response = await linearClient.createComment(commentData)

      // Linear SDK returns CommentPayload with structure: { comment, success, lastSyncId }
      if (response && response.comment) {
        const comment = await response.comment
        console.log(`✅ Posted initial comment on issue ${issueId} (ID: ${comment.id})`)
        return comment
      } else {
        throw new Error('Initial comment creation failed')
      }
    } catch (error) {
      console.error(`Failed to create initial comment on issue ${issueId}:`, error)
      return null
    }
  }

  /**
   * Post a comment to Linear
   */
  private async postComment(issueId: string, body: string, repositoryId: string, parentId?: string): Promise<{ id: string } | null> {
    try {
      // Get the Linear client for this repository
      const linearClient = this.linearClients.get(repositoryId)
      if (!linearClient) {
        throw new Error(`No Linear client found for repository ${repositoryId}`)
      }

      const commentData: any = {
        issueId,
        body
      }

      // Add parent ID if provided (for reply)
      if (parentId) {
        commentData.parentId = parentId
      }

      const response = await linearClient.createComment(commentData)

      // Linear SDK returns CommentPayload with structure: { comment, success, lastSyncId }
      if (response && response.comment) {
        console.log(`✅ Successfully created comment on issue ${issueId}`)
        const comment = await response.comment
        if (comment?.id) {
          console.log(`Comment ID: ${comment.id}`)
          return comment
        }
        return null
      } else {
        throw new Error('Comment creation failed')
      }
    } catch (error) {
      console.error(`Failed to create comment on issue ${issueId}:`, error)
      // Don't re-throw - just log the error so the edge worker doesn't crash
      // TODO: Implement retry logic or token refresh
      return null
    }
  }

  /**
   * Update initial comment with TODO checklist
   */
  private async updateCommentWithTodos(issueId: string, todos: Array<{id: string, content: string, status: string, priority: string}>, repositoryId: string): Promise<void> {
    try {
      const commentId = this.issueToCommentId.get(issueId)
      if (!commentId) {
        console.log('No initial comment ID found for issue, cannot update with todos')
        return
      }

      // Convert todos to Linear checklist format
      const checklist = this.formatTodosAsChecklist(todos)
      const body = `I've been assigned to this issue and am getting started right away. Here's my plan:\n\n${checklist}`

      // Get the Linear client
      const linearClient = this.linearClients.get(repositoryId)
      if (!linearClient) {
        throw new Error(`No Linear client found for repository ${repositoryId}`)
      }

      // Update the comment
      const response = await linearClient.updateComment(commentId, { body })
      
      if (response) {
        console.log(`✅ Updated comment ${commentId} with ${todos.length} todos`)
      }
    } catch (error) {
      console.error(`Failed to update comment with todos:`, error)
    }
  }

  /**
   * Format todos as Linear checklist markdown
   */
  private formatTodosAsChecklist(todos: Array<{id: string, content: string, status: string, priority: string}>): string {
    return todos.map(todo => {
      const checkbox = todo.status === 'completed' ? '[x]' : '[ ]'
      const priorityEmoji = todo.priority === 'high' ? '🔴' : todo.priority === 'medium' ? '🟡' : '🟢'
      const statusEmoji = todo.status === 'in_progress' ? ' 🔄' : ''
      return `- ${checkbox} ${priorityEmoji} ${todo.content}${statusEmoji}`
    }).join('\n')
  }
  
  /**
   * Extract attachment URLs from text (issue description or comment)
   */
  private extractAttachmentUrls(text: string): string[] {
    if (!text) return []
    
    // Match URLs that start with https://uploads.linear.app
    const regex = /https:\/\/uploads\.linear\.app\/[^\s<>"')]+/gi
    const matches = text.match(regex) || []
    
    // Remove duplicates
    return [...new Set(matches)]
  }
  
  /**
   * Download attachments from Linear issue
   */
  private async downloadIssueAttachments(issue: any, repository: RepositoryConfig, workspacePath: string): Promise<{ manifest: string, attachmentsDir: string | null }> {
    try {
      const attachmentMap: Record<string, string> = {}
      const imageMap: Record<string, string> = {}
      let attachmentCount = 0
      let imageCount = 0
      let skippedCount = 0
      let failedCount = 0
      const maxAttachments = 10
      
      // Create attachments directory in home directory
      const workspaceFolderName = basename(workspacePath)
      const attachmentsDir = join(
        homedir(),
        '.cyrus',
        workspaceFolderName,
        'attachments'
      )
      
      // Ensure directory exists
      await mkdir(attachmentsDir, { recursive: true })
      
      // Extract URLs from issue description
      const descriptionUrls = this.extractAttachmentUrls(issue.description)
      
      // Extract URLs from comments if available
      const commentUrls: string[] = []
      const linearClient = this.linearClients.get(repository.id)
      if (linearClient && issue.id) {
        try {
          const comments = await linearClient.comments({
            filter: { issue: { id: { eq: issue.id } } }
          })
          const commentNodes = await comments.nodes
          for (const comment of commentNodes) {
            const urls = this.extractAttachmentUrls(comment.body)
            commentUrls.push(...urls)
          }
        } catch (error) {
          console.error('Failed to fetch comments for attachments:', error)
        }
      }
      
      // Combine and deduplicate all URLs
      const allUrls = [...new Set([...descriptionUrls, ...commentUrls])]
      
      console.log(`Found ${allUrls.length} unique attachment URLs in issue ${issue.identifier}`)
      
      if (allUrls.length > maxAttachments) {
        console.warn(`Warning: Found ${allUrls.length} attachments but limiting to ${maxAttachments}. Skipping ${allUrls.length - maxAttachments} attachments.`)
      }
      
      // Download attachments up to the limit
      for (const url of allUrls) {
        if (attachmentCount >= maxAttachments) {
          skippedCount++
          continue
        }
        
        // Generate a temporary filename
        const tempFilename = `attachment_${attachmentCount + 1}.tmp`
        const tempPath = join(attachmentsDir, tempFilename)
        
        const result = await this.downloadAttachment(url, tempPath, repository.linearToken)
        
        if (result.success) {
          // Determine the final filename based on type
          let finalFilename: string
          if (result.isImage) {
            imageCount++
            finalFilename = `image_${imageCount}${result.fileType || '.png'}`
          } else {
            finalFilename = `attachment_${attachmentCount + 1}${result.fileType || ''}`
          }
          
          const finalPath = join(attachmentsDir, finalFilename)
          
          // Rename the file to include the correct extension
          await rename(tempPath, finalPath)
          
          // Store in appropriate map
          if (result.isImage) {
            imageMap[url] = finalPath
          } else {
            attachmentMap[url] = finalPath
          }
          attachmentCount++
        } else {
          failedCount++
          console.warn(`Failed to download attachment: ${url}`)
        }
      }
      
      // Generate attachment manifest
      const manifest = this.generateAttachmentManifest({
        attachmentMap,
        imageMap,
        totalFound: allUrls.length,
        downloaded: attachmentCount,
        imagesDownloaded: imageCount,
        skipped: skippedCount,
        failed: failedCount
      })
      
      // Return manifest and directory path if any attachments were downloaded
      return {
        manifest,
        attachmentsDir: attachmentCount > 0 ? attachmentsDir : null
      }
    } catch (error) {
      console.error('Error downloading attachments:', error)
      return { manifest: '', attachmentsDir: null } // Return empty manifest on error
    }
  }
  
  /**
   * Download a single attachment from Linear
   */
  private async downloadAttachment(
    attachmentUrl: string, 
    destinationPath: string, 
    linearToken: string
  ): Promise<{ success: boolean, fileType?: string, isImage?: boolean }> {
    try {
      console.log(`Downloading attachment from: ${attachmentUrl}`)
      
      const response = await fetch(attachmentUrl, {
        headers: {
          'Authorization': `Bearer ${linearToken}`
        }
      })
      
      if (!response.ok) {
        console.error(`Attachment download failed: ${response.status} ${response.statusText}`)
        return { success: false }
      }
      
      const buffer = Buffer.from(await response.arrayBuffer())
      
      // Detect the file type from the buffer
      const fileType = await fileTypeFromBuffer(buffer)
      let detectedExtension: string | undefined = undefined
      let isImage = false
      
      if (fileType) {
        detectedExtension = `.${fileType.ext}`
        isImage = fileType.mime.startsWith('image/')
        console.log(`Detected file type: ${fileType.mime} (${fileType.ext}), is image: ${isImage}`)
      } else {
        // Try to get extension from URL
        const urlPath = new URL(attachmentUrl).pathname
        const urlExt = extname(urlPath)
        if (urlExt) {
          detectedExtension = urlExt
          console.log(`Using extension from URL: ${detectedExtension}`)
        }
      }
      
      // Write the attachment to disk
      await writeFile(destinationPath, buffer)
      
      console.log(`Successfully downloaded attachment to: ${destinationPath}`)
      return { success: true, fileType: detectedExtension, isImage }
    } catch (error) {
      console.error(`Error downloading attachment:`, error)
      return { success: false }
    }
  }
  
  /**
   * Generate a markdown section describing downloaded attachments
   */
  private generateAttachmentManifest(downloadResult: {
    attachmentMap: Record<string, string>
    imageMap: Record<string, string>
    totalFound: number
    downloaded: number
    imagesDownloaded: number
    skipped: number
    failed: number
  }): string {
    const { attachmentMap, imageMap, totalFound, downloaded, imagesDownloaded, skipped, failed } = downloadResult
    
    let manifest = '\n## Downloaded Attachments\n\n'
    
    if (totalFound === 0) {
      manifest += 'No attachments were found in this issue.\n'
      return manifest
    }
    
    manifest += `Found ${totalFound} attachments. Downloaded ${downloaded}`
    if (imagesDownloaded > 0) {
      manifest += ` (including ${imagesDownloaded} images)`
    }
    if (skipped > 0) {
      manifest += `, skipped ${skipped} due to ${downloaded} attachment limit`
    }
    if (failed > 0) {
      manifest += `, failed to download ${failed}`
    }
    manifest += '.\n\n'
    
    if (failed > 0) {
      manifest += '**Note**: Some attachments failed to download. This may be due to authentication issues or the files being unavailable. The agent will continue processing the issue with the available information.\n\n'
    }
    
    manifest += 'Attachments have been downloaded to the `~/.cyrus/<workspace>/attachments` directory:\n\n'
    
    // List images first
    if (Object.keys(imageMap).length > 0) {
      manifest += '### Images\n'
      Object.entries(imageMap).forEach(([url, localPath], index) => {
        const filename = basename(localPath)
        manifest += `${index + 1}. ${filename} - Original URL: ${url}\n`
        manifest += `   Local path: ${localPath}\n\n`
      })
      manifest += 'You can use the Read tool to view these images.\n\n'
    }
    
    // List other attachments
    if (Object.keys(attachmentMap).length > 0) {
      manifest += '### Other Attachments\n'
      Object.entries(attachmentMap).forEach(([url, localPath], index) => {
        const filename = basename(localPath)
        manifest += `${index + 1}. ${filename} - Original URL: ${url}\n`
        manifest += `   Local path: ${localPath}\n\n`
      })
      manifest += 'You can use the Read tool to view these files.\n\n'
    }
    
    return manifest
  }
}