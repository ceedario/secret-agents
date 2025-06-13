import { EventEmitter } from 'events'
import { createWriteStream, type WriteStream, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { query, type Options as SDKOptions } from '@anthropic-ai/claude-code'
import type { ClaudeRunnerConfig, ClaudeRunnerEvents, ClaudeProcessInfo, ClaudeMessage } from './types.js'

export declare interface ClaudeRunner {
  on<K extends keyof ClaudeRunnerEvents>(event: K, listener: ClaudeRunnerEvents[K]): this
  emit<K extends keyof ClaudeRunnerEvents>(event: K, ...args: Parameters<ClaudeRunnerEvents[K]>): boolean
}

/**
 * Manages communication with Claude using the TypeScript SDK
 */
export class ClaudeRunner extends EventEmitter {
  private config: ClaudeRunnerConfig
  private abortController: AbortController | null = null
  private startedAt: Date | null = null
  private logStream: WriteStream | null = null
  private sessionId: string | null = null
  private running: boolean = false

  constructor(config: ClaudeRunnerConfig) {
    super()
    this.config = config

    // Forward config callbacks to events
    if (config.onMessage) this.on('message', config.onMessage)
    if (config.onSessionStart) this.on('session:start', config.onSessionStart)
    if (config.onSessionEnd) this.on('session:end', config.onSessionEnd)
    if (config.onSessionError) this.on('session:error', config.onSessionError)
  }

  /**
   * Start a new Claude session using the SDK
   */
  spawn(): ClaudeProcessInfo {
    if (this.running) {
      throw new Error('Claude session already running')
    }

    this.startedAt = new Date()
    this.running = true
    this.abortController = new AbortController()
    
    console.log('[ClaudeRunner] Starting Claude SDK session...')

    // Set up logging
    this.setupLogging()

    // Emit session start event
    this.emit('session:start')

    return {
      process: null,
      pid: undefined,
      startedAt: this.startedAt
    }
  }

  /**
   * Send input to Claude using SDK
   */
  async sendInput(input: string): Promise<void> {
    console.log(`[ClaudeRunner] sendInput called with input length: ${input.length} characters`)
    
    if (!this.running) {
      console.error('[ClaudeRunner] No active Claude session')
      throw new Error('No active Claude session')
    }

    await this.runQuery(input)
  }

  /**
   * Send initial prompt using SDK
   */
  async sendInitialPrompt(prompt: string): Promise<void> {
    console.log(`[ClaudeRunner] sendInitialPrompt called with prompt length: ${prompt.length} characters`)
    try {
      await this.runQuery(prompt)
      console.log('[ClaudeRunner] Initial prompt completed successfully')
    } catch (error) {
      console.error('[ClaudeRunner] Error in sendInitialPrompt:', error)
      throw error
    }
  }

  /**
   * Run a query using the Claude SDK
   */
  private async runQuery(prompt: string): Promise<void> {
    if (!this.abortController) {
      throw new Error('No abort controller available')
    }

    try {
      // Build SDK options
      const options: SDKOptions = {
        abortController: this.abortController,
        cwd: this.config.workingDirectory,
        allowedTools: this.config.allowedTools,
        maxTurns: this.config.maxTurns,
        continue: this.config.continueSession,
        ...this.config.sdkOptions // Allow override of any SDK options
      }

      console.log(`[ClaudeRunner] Starting SDK query with options:`, {
        cwd: options.cwd,
        maxTurns: options.maxTurns,
        continue: options.continue,
        allowedTools: options.allowedTools?.length || 0
      })

      // Use the SDK's query method
      for await (const message of query({
        prompt,
        abortController: this.abortController,
        options
      })) {
        // Process each streaming message
        this.handleSDKMessage(message)
      }

      // Session completed
      this.handleSessionComplete()
    } catch (error) {
      console.error('[ClaudeRunner] SDK query error:', error)
      const err = error instanceof Error ? error : new Error(String(error))
      this.emit('session:error', err)
      this.handleSessionComplete()
    }
  }

  /**
   * Kill the Claude session
   */
  kill(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    this.running = false
  }

  /**
   * Check if session is running
   */
  isRunning(): boolean {
    return this.running
  }

  /**
   * Handle SDK streaming messages
   */
  private handleSDKMessage(message: ClaudeMessage): void {
    // Capture session ID from the first event if available
    if (!this.sessionId && message.session_id) {
      this.sessionId = message.session_id
      console.log(`[ClaudeRunner] Captured session ID: ${this.sessionId}`)
      this.updateLogFilePath()
    }
    
    // Log the event
    if (this.logStream) {
      this.logStream.write(JSON.stringify(message) + '\n')
    }
    
    // Just re-emit the raw SDK message - no processing needed!
    this.emit('message', message)
  }


  /**
   * Handle session completion
   */
  private handleSessionComplete(): void {
    this.running = false
    this.abortController = null
    
    // Close log stream
    if (this.logStream) {
      this.logStream.end()
      this.logStream = null
    }

    // Emit session end event
    this.emit('session:end', 0)
  }

  /**
   * Set up logging to .cyrus directory
   */
  private setupLogging(): void {
    try {
      // Create logs directory structure: ~/.cyrus/logs/<workspace-name>/
      const cyrusDir = join(homedir(), '.cyrus')
      const logsDir = join(cyrusDir, 'logs')
      
      // Get workspace name from config or extract from working directory
      const workspaceName = this.config.workspaceName || 
        (this.config.workingDirectory ? this.config.workingDirectory.split('/').pop() : 'default') || 
        'default'
      const workspaceLogsDir = join(logsDir, workspaceName)
      
      // Create directories
      mkdirSync(workspaceLogsDir, { recursive: true })
      
      // Create initial log file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const logFileName = `session-${timestamp}.jsonl`
      const logFilePath = join(workspaceLogsDir, logFileName)
      
      console.log(`[ClaudeRunner] Creating log file at: ${logFilePath}`)
      this.logStream = createWriteStream(logFilePath, { flags: 'a' })
      
      // Write initial metadata
      const metadata = {
        type: 'session-metadata',
        startedAt: this.startedAt?.toISOString(),
        workingDirectory: this.config.workingDirectory,
        workspaceName: workspaceName,
        timestamp: new Date().toISOString()
      }
      this.logStream.write(JSON.stringify(metadata) + '\n')
      
    } catch (error) {
      console.error('[ClaudeRunner] Failed to set up logging:', error)
    }
  }
  
  /**
   * Update log file path when session ID is captured
   */
  private updateLogFilePath(): void {
    if (!this.sessionId || !this.logStream) return
    
    try {
      // Close current stream
      this.logStream.end()
      
      // Create new file with session ID
      const cyrusDir = join(homedir(), '.cyrus')
      const logsDir = join(cyrusDir, 'logs')
      const workspaceName = this.config.workspaceName || 
        (this.config.workingDirectory ? this.config.workingDirectory.split('/').pop() : 'default') || 
        'default'
      const workspaceLogsDir = join(logsDir, workspaceName)
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const logFileName = `session-${this.sessionId}-${timestamp}.jsonl`
      const logFilePath = join(workspaceLogsDir, logFileName)
      
      console.log(`[ClaudeRunner] Updating log file to: ${logFilePath}`)
      this.logStream = createWriteStream(logFilePath, { flags: 'a' })
      
      // Write session metadata
      const metadata = {
        type: 'session-metadata',
        sessionId: this.sessionId,
        startedAt: this.startedAt?.toISOString(),
        workingDirectory: this.config.workingDirectory,
        workspaceName: workspaceName,
        timestamp: new Date().toISOString()
      }
      this.logStream.write(JSON.stringify(metadata) + '\n')
      
    } catch (error) {
      console.error('[ClaudeRunner] Failed to update log file path:', error)
    }
  }
}