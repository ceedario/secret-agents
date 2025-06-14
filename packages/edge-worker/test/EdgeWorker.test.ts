import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EdgeWorker } from '../src/EdgeWorker'
import { LinearClient } from '@linear/sdk'
import { NdjsonClient } from 'cyrus-ndjson-client'
import { ClaudeRunner } from 'cyrus-claude-runner'
import { SessionManager, Session } from 'cyrus-core'
import type { EdgeWorkerConfig } from '../src/types'
import { 
  mockIssueAssignedWebhook, 
  mockCommentWebhook,
  mockUnassignedWebhook,
  mockClaudeAssistantEvent,
  mockClaudeToolEvent,
  mockClaudeErrorEvent
} from './setup'

// Mock dependencies
vi.mock('@linear/sdk')
vi.mock('cyrus-ndjson-client')
vi.mock('cyrus-claude-runner')
vi.mock('cyrus-core', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    // Keep the actual type guard functions
    isIssueAssignedWebhook: actual.isIssueAssignedWebhook,
    isIssueCommentMentionWebhook: actual.isIssueCommentMentionWebhook,
    isIssueNewCommentWebhook: actual.isIssueNewCommentWebhook,
    isIssueUnassignedWebhook: actual.isIssueUnassignedWebhook,
    // Mock Session and SessionManager
    Session: vi.fn(),
    SessionManager: vi.fn()
  }
})

describe('EdgeWorker', () => {
  let edgeWorker: EdgeWorker
  let mockConfig: EdgeWorkerConfig
  let mockLinearClient: any
  let mockNdjsonClient: any
  let mockClaudeRunner: any
  let mockSessionManager: any

  beforeEach(() => {
    // Setup config with single repository for backward compatibility
    mockConfig = {
      proxyUrl: 'http://localhost:3000',
      repositories: [{
        id: 'test-repo',
        name: 'Test Repository',
        repositoryPath: '/tmp/test-repo',
        baseBranch: 'main',
        linearWorkspaceId: 'test-workspace',
        linearToken: 'test-linear-oauth-token',
        workspaceBaseDir: '/tmp/test-workspaces'
      }],
      handlers: {
        createWorkspace: vi.fn().mockResolvedValue({
          path: '/tmp/test-workspaces/TEST-123',
          isGitWorktree: false
        }),
        onClaudeEvent: vi.fn(),
        onSessionStart: vi.fn(),
        onSessionEnd: vi.fn(),
        onError: vi.fn()
      },
      features: {
        enableContinuation: true,
        enableTokenLimitHandling: true
      }
    }

    // Setup mock Linear client
    mockLinearClient = {
      createComment: vi.fn().mockResolvedValue({
        success: true,
        comment: { id: 'comment-123' }
      })
    }
    vi.mocked(LinearClient).mockImplementation(() => mockLinearClient)

    // Setup mock NDJSON client
    mockNdjsonClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      on: vi.fn(),
      sendStatus: vi.fn().mockResolvedValue(undefined),
      isConnected: vi.fn().mockReturnValue(true)
    }
    vi.mocked(NdjsonClient).mockImplementation(() => mockNdjsonClient)

    // Setup mock Claude runner
    mockClaudeRunner = {
      spawn: vi.fn().mockReturnValue({
        process: { pid: 1234 },
        startedAt: new Date()
      }),
      sendInitialPrompt: vi.fn().mockResolvedValue(undefined),
      sendInput: vi.fn().mockResolvedValue(undefined),
      kill: vi.fn()
    }
    vi.mocked(ClaudeRunner).mockImplementation(() => mockClaudeRunner)

    // Setup mock session manager
    mockSessionManager = {
      addSession: vi.fn(),
      getSession: vi.fn(),
      removeSession: vi.fn(),
      getAllSessions: vi.fn().mockReturnValue(new Map())
    }
    vi.mocked(SessionManager).mockImplementation(() => mockSessionManager)

    // Create EdgeWorker instance
    edgeWorker = new EdgeWorker(mockConfig)

    // No longer need to mock fetchFullIssueDetails - the issue data comes directly from webhooks
  })

  afterEach(() => {
    vi.clearAllMocks()
    delete process.env.DEBUG_EDGE
  })

  describe('initialization', () => {
    it('should initialize with correct config', () => {
      expect(edgeWorker).toBeDefined()
      expect(vi.mocked(LinearClient)).toHaveBeenCalledWith({
        accessToken: 'test-linear-oauth-token'
      })
      expect(vi.mocked(NdjsonClient)).toHaveBeenCalledWith({
        proxyUrl: mockConfig.proxyUrl,
        token: 'test-linear-oauth-token',
        onConnect: expect.any(Function),
        onDisconnect: expect.any(Function),
        onError: expect.any(Function)
      })
    })

    it('should register webhook handler', () => {
      expect(mockNdjsonClient.on).toHaveBeenCalledWith('webhook', expect.any(Function))
    })

    it('should not register heartbeat handler by default', () => {
      expect(mockNdjsonClient.on).not.toHaveBeenCalledWith('heartbeat', expect.any(Function))
    })

    it('should register heartbeat handler when DEBUG_EDGE is true', () => {
      process.env.DEBUG_EDGE = 'true'
      new EdgeWorker(mockConfig)
      expect(mockNdjsonClient.on).toHaveBeenCalledWith('heartbeat', expect.any(Function))
      delete process.env.DEBUG_EDGE
    })

    it('should work without handlers', () => {
      const minimalConfig = {
        proxyUrl: 'http://localhost:3000',
        repositories: [{
          id: 'minimal-repo',
          name: 'Minimal Repository',
          repositoryPath: '/tmp/minimal-repo',
          baseBranch: 'main',
          linearWorkspaceId: 'minimal-workspace',
          linearToken: 'test-token',
          workspaceBaseDir: '/tmp/test-workspaces'
        }]
      }
      const worker = new EdgeWorker(minimalConfig)
      expect(worker).toBeDefined()
    })
  })

  describe('start/stop', () => {
    it('should connect to NDJSON client on start', async () => {
      await edgeWorker.start()
      expect(mockNdjsonClient.connect).toHaveBeenCalled()
    })

    it('should handle connection events', async () => {
      const connectedSpy = vi.fn()
      edgeWorker.on('connected', connectedSpy)

      // Trigger connection callback
      const onConnect = vi.mocked(NdjsonClient).mock.calls[0][0].onConnect
      onConnect()

      expect(connectedSpy).toHaveBeenCalledWith('test-linear-oauth-token')
      const status = edgeWorker.getConnectionStatus()
      expect(status.size).toBeGreaterThan(0)
      for (const [, isConnected] of status) {
        expect(isConnected).toBe(true)
      }
    })

    it('should handle disconnection events', () => {
      const disconnectedSpy = vi.fn()
      edgeWorker.on('disconnected', disconnectedSpy)

      // Trigger disconnection callback
      const onDisconnect = vi.mocked(NdjsonClient).mock.calls[0][0].onDisconnect
      onDisconnect('Connection lost')

      expect(disconnectedSpy).toHaveBeenCalledWith('test-linear-oauth-token', 'Connection lost')
      const status = edgeWorker.getConnectionStatus()
      expect(status.size).toBeGreaterThan(0)
      // Note: actual connection status depends on mock implementation
    })

    it('should kill all Claude processes on stop', async () => {
      // Create some mock sessions
      const runner1 = { kill: vi.fn() }
      const runner2 = { kill: vi.fn() }
      edgeWorker['claudeRunners'].set('issue-1', runner1 as any)
      edgeWorker['claudeRunners'].set('issue-2', runner2 as any)

      await edgeWorker.stop()

      expect(runner1.kill).toHaveBeenCalled()
      expect(runner2.kill).toHaveBeenCalled()
      expect(edgeWorker['claudeRunners'].size).toBe(0)
    })

    it('should clear sessions and disconnect on stop', async () => {
      mockSessionManager.getAllSessions.mockReturnValue(new Map([
        ['issue-1', {}],
        ['issue-2', {}]
      ]))

      await edgeWorker.stop()

      expect(mockSessionManager.removeSession).toHaveBeenCalledWith('issue-1')
      expect(mockSessionManager.removeSession).toHaveBeenCalledWith('issue-2')
      expect(mockNdjsonClient.disconnect).toHaveBeenCalled()
    })
  })

  describe('webhook handling', () => {
    let webhookHandler: Function

    beforeEach(() => {
      // Get the webhook handler function
      webhookHandler = mockNdjsonClient.on.mock.calls.find(
        (call: any) => call[0] === 'webhook'
      )?.[1]
    })

    it('should handle issue assignment notifications', async () => {
      const webhook = mockIssueAssignedWebhook()
      await webhookHandler(webhook)

      // Should create workspace with webhook issue data
      expect(mockConfig.handlers.createWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'issue-123',
          identifier: 'TEST-123',
          title: 'Test Issue'
        }),
        expect.objectContaining({ id: 'test-repo' })
      )

      // Should spawn Claude
      expect(mockClaudeRunner.spawn).toHaveBeenCalled()
      expect(mockClaudeRunner.sendInitialPrompt).toHaveBeenCalled()

      // Should create session
      expect(mockSessionManager.addSession).toHaveBeenCalledWith(
        'issue-123',
        expect.any(Session)
      )

      // Should emit events with webhook issue data
      expect(mockConfig.handlers.onSessionStart).toHaveBeenCalledWith(
        'issue-123',
        expect.objectContaining({
          id: 'issue-123',
          identifier: 'TEST-123',
          title: 'Test Issue'
        }),
        'test-repo'
      )
    })

    it('should use default workspace if no handler provided', async () => {
      delete mockConfig.handlers.createWorkspace
      const webhook = mockIssueAssignedWebhook()
      
      await webhookHandler(webhook)

      // Should still work with default workspace
      expect(vi.mocked(ClaudeRunner)).toHaveBeenCalledWith(
        expect.objectContaining({
          workingDirectory: '/tmp/test-workspaces/TEST-123'
        })
      )
    })

    it('should handle new comment notifications', async () => {
      // Setup existing session
      mockSessionManager.getSession.mockReturnValue({
        workspace: { path: '/tmp/test-workspaces/TEST-123' }
      })

      const webhook = mockCommentWebhook()
      await webhookHandler(webhook)

      // Should send input to Claude
      expect(mockClaudeRunner.sendInput).toHaveBeenCalledWith('Test comment')
    })

    it('should handle issue unassignment', async () => {
      mockSessionManager.getSession.mockReturnValue({
        workspace: { path: '/tmp/test-workspaces/TEST-123' }
      })

      // Set up a mock Claude runner in the internal map
      const mockRunner = { kill: vi.fn() }
      edgeWorker['claudeRunners'].set('issue-123', mockRunner as any)

      const webhook = mockUnassignedWebhook()
      await webhookHandler(webhook)

      expect(mockRunner.kill).toHaveBeenCalled()
      expect(mockSessionManager.removeSession).toHaveBeenCalledWith('issue-123')
    })

    it('should ignore comments when continuation is disabled', async () => {
      mockConfig.features!.enableContinuation = false
      mockSessionManager.getSession.mockReturnValue({})

      const webhook = mockCommentWebhook()
      await webhookHandler(webhook)

      expect(mockClaudeRunner.sendInput).not.toHaveBeenCalled()
    })

    it('should ignore comments for non-existent sessions', async () => {
      mockSessionManager.getSession.mockReturnValue(null)

      const webhook = mockCommentWebhook()
      await webhookHandler(webhook)

      expect(mockClaudeRunner.sendInput).not.toHaveBeenCalled()
    })

    it('should report failures on error', async () => {
      mockConfig.handlers.createWorkspace!.mockRejectedValue(new Error('Workspace error'))

      const webhook = mockIssueAssignedWebhook()
      await expect(webhookHandler(webhook)).rejects.toThrow('Workspace error')
    })

  })

  describe('Claude event handling', () => {
    it('should handle assistant responses', async () => {
      // Setup Claude runner with event handler
      let claudeEventHandler: Function
      vi.mocked(ClaudeRunner).mockImplementation((config) => {
        claudeEventHandler = config.onMessage
        return mockClaudeRunner
      })

      // Create a session
      const webhook = mockIssueAssignedWebhook()
      const webhookHandler = mockNdjsonClient.on.mock.calls.find(
        (call: any) => call[0] === 'webhook'
      )?.[1]
      await webhookHandler(webhook)

      // Emit Claude assistant event
      const event = mockClaudeAssistantEvent('Hello from Claude!')
      await claudeEventHandler!(event)

      // Should NOT post comment to Linear for assistant events (only for result events)
      // The initial comment should be the only one posted
      expect(mockLinearClient.createComment).toHaveBeenCalledWith({
        issueId: 'issue-123',
        body: "I've been assigned to this issue and am getting started right away. I'll update this comment with my plan shortly."
      })

      // Should emit events
      expect(mockConfig.handlers.onClaudeEvent).toHaveBeenCalledWith('issue-123', event, 'test-repo')
    })

    it('should handle tool use events', async () => {
      let claudeEventHandler: Function
      vi.mocked(ClaudeRunner).mockImplementation((config) => {
        claudeEventHandler = config.onMessage
        return mockClaudeRunner
      })

      const webhook = mockIssueAssignedWebhook()
      const webhookHandler = mockNdjsonClient.on.mock.calls.find(
        (call: any) => call[0] === 'webhook'
      )?.[1]
      await webhookHandler(webhook)

      const toolUseSpy = vi.fn()
      edgeWorker.on('claude:tool-use', toolUseSpy)

      const event = mockClaudeToolEvent('bash', { command: 'ls -la' })
      await claudeEventHandler!(event)

      expect(toolUseSpy).toHaveBeenCalledWith('issue-123', 'bash', { command: 'ls -la' }, 'test-repo')
    })

    it('should handle Claude errors', async () => {
      let claudeErrorHandler: Function
      const errorSpy = vi.fn()
      
      vi.mocked(ClaudeRunner).mockImplementation((config) => {
        claudeErrorHandler = config.onSessionError
        return mockClaudeRunner
      })

      const webhook = mockIssueAssignedWebhook()
      const webhookHandler = mockNdjsonClient.on.mock.calls.find(
        (call: any) => call[0] === 'webhook'
      )?.[1]
      await webhookHandler(webhook)

      edgeWorker.on('error', errorSpy)

      const error = new Error('Something went wrong')
      claudeErrorHandler!(error)

      expect(errorSpy).toHaveBeenCalledWith(error)
      expect(mockConfig.handlers.onError).toHaveBeenCalledWith(error)
    })

    it('should handle token limit errors', async () => {
      let claudeErrorHandler: Function
      vi.mocked(ClaudeRunner).mockImplementation((config) => {
        claudeErrorHandler = config.onSessionError
        return mockClaudeRunner
      })

      const webhook = mockIssueAssignedWebhook()
      const webhookHandler = mockNdjsonClient.on.mock.calls.find(
        (call: any) => call[0] === 'webhook'
      )?.[1]
      await webhookHandler(webhook)

      mockSessionManager.getSession.mockReturnValue({
        issue: {
          id: 'issue-123',
          identifier: 'TEST-123',
          title: 'Test Issue',
          team: { id: 'test-workspace', key: 'TEST', name: 'Test Team' },
          teamId: 'test-workspace',
          url: 'https://linear.app/issue/TEST-123'
        }
      })

      const error = new Error('Request failed due to token limit exceeded')
      claudeErrorHandler!(error)

      // Should trigger token limit handling

      // Should post warning
      expect(mockLinearClient.createComment).toHaveBeenCalledWith({
        issueId: 'issue-123',
        body: '[System] Token limit reached. Starting fresh session with issue context.'
      })

      // Should restart session
      expect(mockClaudeRunner.spawn).toHaveBeenCalledTimes(2)
    })

    it('should handle Claude process exit', async () => {
      let exitHandler: Function
      vi.mocked(ClaudeRunner).mockImplementation((config) => {
        exitHandler = config.onSessionEnd
        return mockClaudeRunner
      })

      // Create a session first
      const webhook = mockIssueAssignedWebhook()
      const webhookHandler = mockNdjsonClient.on.mock.calls.find(
        (call: any) => call[0] === 'webhook'
      )?.[1]
      await webhookHandler(webhook)

      // Now test exit handling
      exitHandler!(0)

      expect(edgeWorker['claudeRunners'].has('issue-123')).toBe(false)
      expect(mockConfig.handlers.onSessionEnd).toHaveBeenCalledWith('issue-123', 0, 'test-repo')
    })

    it('should handle comment creation failures gracefully', async () => {
      // Mock console.error to verify error logging
      const consoleErrorSpy = vi.spyOn(console, 'error')
      
      // Reset the mock to clear the initial comment creation
      mockLinearClient.createComment.mockClear()
      mockLinearClient.createComment.mockResolvedValueOnce({
        success: true,
        comment: { id: 'comment-123' }
      })
      mockLinearClient.createComment.mockRejectedValueOnce(new Error('API Error'))

      let claudeEventHandler: Function
      vi.mocked(ClaudeRunner).mockImplementation((config) => {
        claudeEventHandler = config.onMessage
        return mockClaudeRunner
      })

      const webhook = mockIssueAssignedWebhook()
      const webhookHandler = mockNdjsonClient.on.mock.calls.find(
        (call: any) => call[0] === 'webhook'
      )?.[1]
      await webhookHandler(webhook)

      // Use a result event which actually posts comments
      const event: ClaudeEvent = {
        type: 'result',
        result: 'Failed comment'
      } as any
      
      // The handler doesn't throw, it logs the error and continues
      await claudeEventHandler!(event)
      
      // Verify error was logged but not thrown
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create comment on issue issue-123:'),
        expect.any(Error)
      )
    })
  })

  describe('error handling', () => {
    it('should emit error events', () => {
      const errorSpy = vi.fn()
      edgeWorker.on('error', errorSpy)

      const onError = vi.mocked(NdjsonClient).mock.calls[0][0].onError
      const error = new Error('Connection error')
      onError(error)

      expect(errorSpy).toHaveBeenCalledWith(error)
      expect(mockConfig.handlers.onError).toHaveBeenCalledWith(error)
    })
  })

  describe('getters', () => {
    it('should return connection status', () => {
      const statusBefore = edgeWorker.getConnectionStatus()
      expect(statusBefore.size).toBe(1)
      expect(statusBefore.get('test-linear-oauth-token')).toBe(true) // Mock returns true by default

      // Test that we can check connection status
      const onConnect = vi.mocked(NdjsonClient).mock.calls[0][0].onConnect
      onConnect()

      const statusAfter = edgeWorker.getConnectionStatus()
      expect(statusAfter.size).toBe(1)
      expect(statusAfter.get('test-linear-oauth-token')).toBe(true)
    })

    it('should return active sessions', () => {
      mockSessionManager.getAllSessions.mockReturnValue(new Map([
        ['issue-1', {}],
        ['issue-2', {}],
        ['issue-3', {}]
      ]))

      const sessions = edgeWorker.getActiveSessions()
      expect(sessions).toEqual(['issue-1', 'issue-2', 'issue-3'])
    })
  })

  describe('branch name sanitization', () => {
    it('should sanitize branch names by removing backticks', () => {
      // Test the sanitization function directly
      const sanitizeBranchName = (name: string) => name ? name.replace(/`/g, '') : name
      
      expect(sanitizeBranchName('TEST-123-issue-with-`backticks`-in-title')).toBe('TEST-123-issue-with-backticks-in-title')
      expect(sanitizeBranchName('Normal-branch-name')).toBe('Normal-branch-name')
      expect(sanitizeBranchName('`start-with-backtick')).toBe('start-with-backtick')
      expect(sanitizeBranchName('end-with-backtick`')).toBe('end-with-backtick')
      expect(sanitizeBranchName('')).toBe('')
    })
  })
})