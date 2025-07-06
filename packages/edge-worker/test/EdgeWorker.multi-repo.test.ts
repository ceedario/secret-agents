import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'events'

// Mock classes before imports
class MockLinearClient {
  createComment = vi.fn().mockResolvedValue({ 
    comment: { id: 'comment-123' },
    success: true,
    lastSyncId: 1
  })
  
  issue = vi.fn((id: string) => ({
    id,
    title: `Mock issue ${id}`,
    description: `Mock description for ${id}`,
    identifier: id.includes('cee') ? 'CEE-123' : id.includes('book') ? 'BOOK-456' : 'OTHER-999',
    url: `https://linear.app/issue/${id}`,
    state: { name: 'Todo', type: 'unstarted' },
    team: { 
      id: id.includes('cee') ? 'team-cee' : id.includes('book') ? 'team-book' : 'team-other',
      key: id.includes('cee') ? 'CEE' : id.includes('book') ? 'BOOK' : 'OTHER',
      name: id.includes('cee') ? 'Ceedar Team' : id.includes('book') ? 'Bookkeeping Team' : 'Other Team'
    },
    assignee: { id: 'user-123', name: 'Test User' },
    comments: { nodes: [] }
  }))
}

class MockNdjsonClient extends EventEmitter {
  connect = vi.fn().mockResolvedValue(undefined)
  disconnect = vi.fn()
  sendStatus = vi.fn().mockResolvedValue(undefined)
  isConnected = vi.fn().mockReturnValue(true)
}

class MockClaudeRunner {
  start = vi.fn().mockResolvedValue({ 
    sessionId: 'test-session', 
    startedAt: new Date(), 
    isRunning: false 
  })
  startStreaming = vi.fn().mockResolvedValue({ 
    sessionId: 'test-session', 
    startedAt: new Date(), 
    isRunning: false 
  })
  stop = vi.fn()
  isRunning = vi.fn().mockReturnValue(false)
  isStreaming = vi.fn().mockReturnValue(false)
  addStreamMessage = vi.fn()
  completeStream = vi.fn()
  getSessionInfo = vi.fn().mockReturnValue(null)
  getMessages = vi.fn().mockReturnValue([])
}

class MockSessionManager {
  private sessions = new Map()
  addSession = vi.fn((id, session) => this.sessions.set(id, session))
  getSession = vi.fn((id) => this.sessions.get(id))
  removeSession = vi.fn((id) => this.sessions.delete(id))
  getAllSessions = vi.fn(() => this.sessions)
}

// Track constructor calls
let linearClientCalls = 0
let ndjsonClientCalls = 0

// Mock dependencies
vi.mock('@linear/sdk', () => ({
  LinearClient: vi.fn(() => {
    linearClientCalls++
    return new MockLinearClient()
  })
}))

vi.mock('cyrus-ndjson-client', () => ({
  NdjsonClient: vi.fn(() => {
    ndjsonClientCalls++
    return new MockNdjsonClient()
  })
}))

vi.mock('cyrus-claude-runner', () => ({
  ClaudeRunner: vi.fn(() => new MockClaudeRunner()),
  getAllTools: vi.fn(() => ['bash', 'edit', 'read']),
  getSafeTools: vi.fn(() => ['edit', 'read'])
}))

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
    SessionManager: vi.fn(() => new MockSessionManager()),
    Session: vi.fn((props) => props)
  }
})

// Now import after mocks
import { EdgeWorker } from '../src/EdgeWorker'
import type { RepositoryConfig } from '../src/types'

describe('EdgeWorker - Multi-Repository Support', () => {
  let edgeWorker: EdgeWorker
  const mockRepositories: RepositoryConfig[] = [
    {
      id: 'frontend',
      name: 'Frontend App',
      repositoryPath: '/repos/frontend',
      baseBranch: 'main',
      linearWorkspaceId: 'workspace-1',
      linearToken: 'token-A',
      workspaceBaseDir: '/workspaces/frontend'
    },
    {
      id: 'backend',
      name: 'Backend API',
      repositoryPath: '/repos/backend',
      baseBranch: 'develop',
      linearWorkspaceId: 'workspace-1',
      linearToken: 'token-A', // Same token as frontend
      workspaceBaseDir: '/workspaces/backend'
    },
    {
      id: 'mobile',
      name: 'Mobile App',
      repositoryPath: '/repos/mobile',
      baseBranch: 'main',
      linearWorkspaceId: 'workspace-2',
      linearToken: 'token-B', // Different token
      workspaceBaseDir: '/workspaces/mobile'
    }
  ]

  beforeEach(() => {
    // Reset mocks and counters
    vi.clearAllMocks()
    linearClientCalls = 0
    ndjsonClientCalls = 0
  })

  afterEach(async () => {
    if (edgeWorker) {
      await edgeWorker.stop()
    }
  })

  it('should initialize with multiple repositories', () => {
    edgeWorker = new EdgeWorker({
      proxyUrl: 'http://proxy.test',
            repositories: mockRepositories
    })

    // Should create 3 Linear clients (one per repository)
    expect(linearClientCalls).toBe(3)
    
    // Should create 2 NDJSON clients (grouped by token)
    expect(ndjsonClientCalls).toBe(2)
  })

  it('should route webhooks to correct repository', async () => {
    const createWorkspaceMock = vi.fn().mockResolvedValue({
      path: '/test/workspace',
      isGitWorktree: false
    })

    edgeWorker = new EdgeWorker({
      proxyUrl: 'http://proxy.test',
            repositories: mockRepositories,
      handlers: {
        createWorkspace: createWorkspaceMock
      }
    })

    // Mock the fetchFullIssueDetails method
    vi.spyOn(edgeWorker as any, 'fetchFullIssueDetails').mockResolvedValue({
      id: 'issue-123',
      identifier: 'MOB-123',
      title: 'Fix mobile bug',
      description: 'Mobile issue description',
      branchName: 'MOB-123-fix-mobile-bug',
      priority: 2,
      state: Promise.resolve({ name: 'To Do' }),
      url: 'https://linear.app/test/issue/MOB-123'
    })

    // Get the ndjson clients
    const ndjsonClients = (edgeWorker as any).ndjsonClients
    expect(ndjsonClients.size).toBe(2)

    // Find the client for token-B (mobile repo)
    const mobilClient = (edgeWorker as any)._getClientByToken('token-B') as MockNdjsonClient
    expect(mobilClient).toBeDefined()

    // Simulate webhook for workspace-2 (mobile repo)
    const webhookData = {
      type: 'AppUserNotification',
      action: 'issueAssignedToYou',
      createdAt: new Date().toISOString(),
      organizationId: 'workspace-2',
      oauthClientId: 'test-oauth-client',
      appUserId: 'test-app-user',
      notification: {
        type: 'issueAssignedToYou',
        id: 'notification-123',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        archivedAt: null,
        actorId: 'actor-123',
        externalUserActorId: null,
        userId: 'user-123',
        issueId: 'issue-123',
        issue: {
          id: 'issue-123',
          identifier: 'MOB-123',
          title: 'Fix mobile bug',
          teamId: 'workspace-2',
          team: { id: 'workspace-2', key: 'MOB', name: 'Mobile Team' },
          url: 'https://linear.app/issue/MOB-123'
        },
        actor: {
          id: 'actor-123',
          name: 'Test Actor',
          email: 'test@example.com',
          url: 'https://linear.app/user/actor-123'
        }
      },
      webhookTimestamp: Date.now(),
      webhookId: 'webhook-123'
    }

    // Trigger webhook handling
    mobilClient!.emit('webhook', webhookData)

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 100))

    // Should have called createWorkspace with mobile repository
    expect(createWorkspaceMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'issue-123' }),
      expect.objectContaining({ id: 'mobile' })
    )
  })

  it('should include repository context in events', async () => {
    const onSessionStartMock = vi.fn()
    const onClaudeEventMock = vi.fn()

    edgeWorker = new EdgeWorker({
      proxyUrl: 'http://proxy.test',
            repositories: mockRepositories,
      handlers: {
        onSessionStart: onSessionStartMock,
        onClaudeMessage: onClaudeEventMock
      }
    })

    // Mock the fetchFullIssueDetails method for the second test
    vi.spyOn(edgeWorker as any, 'fetchFullIssueDetails').mockResolvedValue({
      id: 'issue-456',
      identifier: 'BACK-456',
      title: 'Update API',
      description: 'Backend issue description',
      branchName: 'BACK-456-update-api',
      priority: 1,
      state: Promise.resolve({ name: 'In Progress' }),
      url: 'https://linear.app/test/issue/BACK-456'
    })

    // Listen for events
    const sessionStartedHandler = vi.fn()
    edgeWorker.on('session:started', sessionStartedHandler)

    // Get backend repository's client (token-A)
    const backendClient = (edgeWorker as any)._getClientByToken('token-A') as MockNdjsonClient

    // Simulate issue assignment for backend repo
    const webhookData = {
      type: 'AppUserNotification',
      action: 'issueAssignedToYou',
      createdAt: new Date().toISOString(),
      organizationId: 'workspace-1',
      oauthClientId: 'test-oauth-client',
      appUserId: 'test-app-user',
      notification: {
        type: 'issueAssignedToYou',
        id: 'notification-456',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        archivedAt: null,
        actorId: 'actor-456',
        externalUserActorId: null,
        userId: 'user-456',
        issueId: 'issue-456',
        issue: {
          id: 'issue-456',
          identifier: 'BACK-456',
          title: 'Update API',
          teamId: 'workspace-1',
          team: { id: 'workspace-1', key: 'BACK', name: 'Backend Team' },
          url: 'https://linear.app/issue/BACK-456'
        },
        actor: {
          id: 'actor-456',
          name: 'Test Actor',
          email: 'test@example.com',
          url: 'https://linear.app/user/actor-456'
        }
      },
      webhookTimestamp: Date.now(),
      webhookId: 'webhook-456'
    }

    // Trigger webhook
    backendClient!.emit('webhook', webhookData)

    await new Promise(resolve => setTimeout(resolve, 100))

    // Should have been called with some repository ID
    expect(onSessionStartMock).toHaveBeenCalled()
    if (onSessionStartMock.mock.calls.length > 0) {
      const [issueId, issue, repoId] = onSessionStartMock.mock.calls[0]
      expect(issueId).toBe('issue-456')
      expect(issue.id).toBe('issue-456')
      expect(['frontend', 'backend']).toContain(repoId) // Could be either since they share workspace
    }
  })

  it('should handle inactive repositories', () => {
    const reposWithInactive = [
      ...mockRepositories,
      {
        id: 'archived',
        name: 'Archived Project',
        repositoryPath: '/repos/archived',
        baseBranch: 'main',
        linearWorkspaceId: 'workspace-3',
        linearToken: 'token-C',
        workspaceBaseDir: '/workspaces/archived',
        isActive: false
      }
    ]

    edgeWorker = new EdgeWorker({
      proxyUrl: 'http://proxy.test',
            repositories: reposWithInactive
    })

    // Should only create 3 Linear clients (not 4)
    expect(linearClientCalls).toBe(3)
  })

  it('should use repository-specific prompt templates', async () => {
    const reposWithTemplates = mockRepositories.map((repo, i) => ({
      ...repo,
      promptTemplatePath: i === 0 ? '/templates/frontend.md' : undefined
    }))

    edgeWorker = new EdgeWorker({
      proxyUrl: 'http://proxy.test',
            repositories: reposWithTemplates
    })

    const buildPromptMethod = (edgeWorker as any).buildInitialPrompt.bind(edgeWorker)
    
    const issue = {
      id: 'issue-789',
      identifier: 'FE-789',
      title: 'Add feature',
      description: 'Feature description'
    }

    // Build prompt for frontend (has custom template)
    const frontendPrompt = await buildPromptMethod(issue, reposWithTemplates[0])
    
    // Build prompt for backend (no custom template)
    const backendPrompt = await buildPromptMethod(issue, reposWithTemplates[1])

    // Verify prompts include repository context
    expect(frontendPrompt).toContain('Frontend App')
    expect(frontendPrompt).toContain('/repos/frontend')
    expect(backendPrompt).toContain('Backend API')
    expect(backendPrompt).toContain('/repos/backend')
  })

  it('should post comments using correct Linear client', async () => {
    edgeWorker = new EdgeWorker({
      proxyUrl: 'http://proxy.test',
            repositories: mockRepositories
    })

    // Get the linear clients map
    const linearClients = (edgeWorker as any).linearClients
    expect(linearClients.size).toBe(3)

    // Post comment for frontend issue
    await (edgeWorker as any).postComment('issue-123', 'Frontend comment', 'frontend')
    
    // Verify the frontend client was used
    const frontendClient = linearClients.get('frontend') as MockLinearClient
    expect(frontendClient.createComment).toHaveBeenCalledWith({
      issueId: 'issue-123',
      body: 'Frontend comment'
    })

    // Post comment for mobile issue
    await (edgeWorker as any).postComment('issue-456', 'Mobile comment', 'mobile')
    
    // Verify the mobile client was used
    const mobileClient = linearClients.get('mobile') as MockLinearClient
    expect(mobileClient.createComment).toHaveBeenCalledWith({
      issueId: 'issue-456',
      body: 'Mobile comment'
    })
  })

  it('should handle connection status per token', () => {
    edgeWorker = new EdgeWorker({
      proxyUrl: 'http://proxy.test',
            repositories: mockRepositories
    })

    const status = edgeWorker.getConnectionStatus()
    
    // Should have 2 connection statuses (one per unique token)
    expect(status.size).toBe(2)
    
    // All should be connected (mocked to return true)
    for (const [token, isConnected] of status) {
      expect(isConnected).toBe(true)
    }
  })

  describe('team-based routing', () => {
    it('should route webhooks based on team key', async () => {
      const reposWithTeamKeys = [
        {
          id: 'ceedar',
          name: 'Ceedar Repository',
          repositoryPath: '/repos/ceedar',
          baseBranch: 'main',
          linearWorkspaceId: 'workspace-shared',
          linearToken: 'token-shared',
          workspaceBaseDir: '/workspaces/ceedar',
          teamKeys: ['CEE', 'FRONT']
        },
        {
          id: 'bookkeeping',
          name: 'Bookkeeping Repository', 
          repositoryPath: '/repos/bookkeeping',
          baseBranch: 'main',
          linearWorkspaceId: 'workspace-shared',
          linearToken: 'token-shared',
          workspaceBaseDir: '/workspaces/bookkeeping',
          teamKeys: ['BOOK', 'FIN']
        },
        {
          id: 'catch-all',
          name: 'Catch All Repository',
          repositoryPath: '/repos/catch-all',
          baseBranch: 'main', 
          linearWorkspaceId: 'workspace-shared',
          linearToken: 'token-shared',
          workspaceBaseDir: '/workspaces/catch-all'
          // No teamKeys - should catch issues from workspace that don't match other repos
        }
      ]

      edgeWorker = new EdgeWorker({
        proxyUrl: 'http://proxy.test',
        repositories: reposWithTeamKeys
      })

      const onSessionStartMock = vi.fn()
      edgeWorker.on('session:started', onSessionStartMock)

      // Get the shared client (token-shared)
      const sharedClient = (edgeWorker as any)._getClientByToken('token-shared') as MockNdjsonClient
      if (!sharedClient) {
        throw new Error('Expected to find NDJSON client for token-shared')
      }

      // Test routing to ceedar repo via team key
      const ceedarWebhook = {
        type: 'AppUserNotification' as const,
        action: 'issueAssignedToYou' as const,
        createdAt: new Date().toISOString(),
        organizationId: 'workspace-shared',
        oauthClientId: 'test-oauth-client',
        appUserId: 'test-app-user',
        notification: {
          type: 'issueAssignedToYou' as const,
          id: 'notification-cee-123',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archivedAt: null,
          actorId: 'actor-123',
          externalUserActorId: null,
          userId: 'user-123',
          issueId: 'issue-cee-123',
          issue: {
            id: 'issue-cee-123',
            identifier: 'CEE-123',
            title: 'Ceedar feature',
            teamId: 'team-cee',
            team: {
              id: 'team-cee',
              key: 'CEE',
              name: 'Ceedar Team'
            },
            url: 'https://linear.app/issue/CEE-123'
          },
          actor: {
            id: 'actor-123',
            name: 'Test User',
            email: 'test@example.com',
            url: 'https://linear.app/user/actor-123'
          }
        },
        webhookTimestamp: Date.now(),
        webhookId: 'webhook-cee-123'
      }

      sharedClient.emit('webhook', ceedarWebhook)
      await new Promise(resolve => setTimeout(resolve, 100))

      // Debug: Check if webhook handler was called
      if (onSessionStartMock.mock.calls.length === 0) {
        console.log('Expected call not received. Webhook structure:')
        console.log(JSON.stringify(ceedarWebhook, null, 2))
      }

      expect(onSessionStartMock).toHaveBeenCalledWith('issue-cee-123', expect.any(Object), 'ceedar')

      // Test routing to bookkeeping repo via team key  
      onSessionStartMock.mockClear()
      const bookkeepingWebhook = {
        type: 'AppUserNotification' as const,
        action: 'issueAssignedToYou' as const,
        createdAt: new Date().toISOString(),
        organizationId: 'workspace-shared',
        oauthClientId: 'test-oauth-client',
        appUserId: 'test-app-user',
        notification: {
          type: 'issueAssignedToYou' as const,
          id: 'notification-book-456',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archivedAt: null,
          actorId: 'actor-456',
          externalUserActorId: null,
          userId: 'user-456',
          issueId: 'issue-book-456',
          issue: {
            id: 'issue-book-456',
            identifier: 'BOOK-456',
            title: 'Bookkeeping feature',
            teamId: 'team-book',
            team: {
              id: 'team-book',
              key: 'BOOK', 
              name: 'Bookkeeping Team'
            },
            url: 'https://linear.app/issue/BOOK-456'
          },
          actor: {
            id: 'actor-456',
            name: 'Test User',
            email: 'test@example.com',
            url: 'https://linear.app/user/actor-456'
          }
        },
        webhookTimestamp: Date.now(),
        webhookId: 'webhook-book-456'
      }

      sharedClient.emit('webhook', bookkeepingWebhook)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(onSessionStartMock).toHaveBeenCalledWith('issue-book-456', expect.any(Object), 'bookkeeping')
    })

    it('should fallback to parsing issue identifier when team key is missing', async () => {
      const reposWithTeamKeys = [
        {
          id: 'ceedar',
          name: 'Ceedar Repository',
          repositoryPath: '/repos/ceedar',
          baseBranch: 'main',
          linearWorkspaceId: 'workspace-shared',
          linearToken: 'token-shared',
          workspaceBaseDir: '/workspaces/ceedar',
          teamKeys: ['CEE']
        }
      ]

      edgeWorker = new EdgeWorker({
        proxyUrl: 'http://proxy.test',
        repositories: reposWithTeamKeys
      })

      const onSessionStartMock = vi.fn()
      edgeWorker.on('session:started', onSessionStartMock)

      // Get the shared client (token-shared)
      const sharedClient = (edgeWorker as any)._getClientByToken('token-shared') as MockNdjsonClient

      // Webhook without team key but with matching identifier
      const webhookNoTeam = {
        type: 'AppUserNotification' as const,
        action: 'issueAssignedToYou' as const,
        createdAt: new Date().toISOString(),
        organizationId: 'workspace-shared',
        oauthClientId: 'test-oauth-client',
        appUserId: 'test-app-user',
        notification: {
          type: 'issueAssignedToYou' as const,
          id: 'notification-cee-789',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archivedAt: null,
          actorId: 'actor-789',
          externalUserActorId: null,
          userId: 'user-789',
          issueId: 'issue-cee-789',
          issue: {
            id: 'issue-cee-789',
            identifier: 'CEE-789',
            title: 'Ceedar feature',
            teamId: 'team-cee',
            url: 'https://linear.app/issue/CEE-789'
            // No team object
          },
          actor: {
            id: 'actor-789',
            name: 'Test User',
            email: 'test@example.com',
            url: 'https://linear.app/user/actor-789'
          }
        },
        webhookTimestamp: Date.now(),
        webhookId: 'webhook-cee-789'
      }

      sharedClient.emit('webhook', webhookNoTeam)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(onSessionStartMock).toHaveBeenCalledWith('issue-cee-789', expect.any(Object), 'ceedar')
    })

    it('should route to catch-all repo when no team keys match', async () => {
      const reposWithTeamKeys = [
        {
          id: 'specialized',
          name: 'Specialized Repository',
          repositoryPath: '/repos/specialized',
          baseBranch: 'main',
          linearWorkspaceId: 'workspace-shared',
          linearToken: 'token-shared',
          workspaceBaseDir: '/workspaces/specialized',
          teamKeys: ['SPEC']
        },
        {
          id: 'catch-all',
          name: 'Catch All Repository',
          repositoryPath: '/repos/catch-all',
          baseBranch: 'main',
          linearWorkspaceId: 'workspace-shared',
          linearToken: 'token-shared',
          workspaceBaseDir: '/workspaces/catch-all'
          // No teamKeys
        }
      ]

      edgeWorker = new EdgeWorker({
        proxyUrl: 'http://proxy.test',
        repositories: reposWithTeamKeys
      })

      const onSessionStartMock = vi.fn()
      edgeWorker.on('session:started', onSessionStartMock)

      // Get the shared client (token-shared)
      const sharedClient = (edgeWorker as any)._getClientByToken('token-shared') as MockNdjsonClient

      // Webhook with team key that doesn't match any repository
      const unmatchedWebhook = {
        type: 'AppUserNotification' as const,
        action: 'issueAssignedToYou' as const,
        createdAt: new Date().toISOString(),
        organizationId: 'workspace-shared',
        oauthClientId: 'test-oauth-client',
        appUserId: 'test-app-user',
        notification: {
          type: 'issueAssignedToYou' as const,
          id: 'notification-other-999',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archivedAt: null,
          actorId: 'actor-999',
          externalUserActorId: null,
          userId: 'user-999',
          issueId: 'issue-other-999',
          issue: {
            id: 'issue-other-999',
            identifier: 'OTHER-999',
            title: 'Other feature',
            teamId: 'team-other',
            team: {
              id: 'team-other',
              key: 'OTHER',
              name: 'Other Team'
            },
            url: 'https://linear.app/issue/OTHER-999'
          },
          actor: {
            id: 'actor-999',
            name: 'Test User',
            email: 'test@example.com',
            url: 'https://linear.app/user/actor-999'
          }
        },
        webhookTimestamp: Date.now(),
        webhookId: 'webhook-other-999'
      }

      sharedClient.emit('webhook', unmatchedWebhook)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(onSessionStartMock).toHaveBeenCalledWith('issue-other-999', expect.any(Object), 'catch-all')
    })
  })
})