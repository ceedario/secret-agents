import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// Mock classes before imports
class MockLinearClient {
  createComment = vi.fn().mockResolvedValue({
    comment: { id: 'comment-123' },
    success: true,
    lastSyncId: 1,
  });
}

class MockNdjsonClient extends EventEmitter {
  connect = vi.fn().mockResolvedValue(undefined);
  disconnect = vi.fn();
  sendStatus = vi.fn().mockResolvedValue(undefined);
  isConnected = vi.fn().mockReturnValue(true);
}

class MockClaudeRunner {
  spawn = vi.fn().mockReturnValue({ process: {}, startedAt: new Date() });
  sendInitialPrompt = vi.fn().mockResolvedValue(undefined);
  sendInput = vi.fn().mockResolvedValue(undefined);
  kill = vi.fn();
}

class MockSessionManager {
  private sessions = new Map();
  addSession = vi.fn((id, session) => this.sessions.set(id, session));
  getSession = vi.fn((id) => this.sessions.get(id));
  removeSession = vi.fn((id) => this.sessions.delete(id));
  getAllSessions = vi.fn(() => this.sessions);
}

// Track constructor calls
let linearClientCalls = 0;
let ndjsonClientCalls = 0;

// Mock dependencies
vi.mock('@linear/sdk', () => ({
  LinearClient: vi.fn(() => {
    linearClientCalls++;
    return new MockLinearClient();
  }),
}));

vi.mock('@cyrus/ndjson-client', () => ({
  NdjsonClient: vi.fn(() => {
    ndjsonClientCalls++;
    return new MockNdjsonClient();
  }),
}));

vi.mock('@cyrus/claude-runner', () => ({
  ClaudeRunner: vi.fn(() => new MockClaudeRunner()),
  getAllTools: vi.fn(() => ['bash', 'edit', 'read']),
  getSafeTools: vi.fn(() => ['edit', 'read']),
}));

vi.mock('@cyrus/core', () => ({
  SessionManager: vi.fn(() => new MockSessionManager()),
  Session: vi.fn((props) => props),
}));

// Now import after mocks
import { EdgeWorker } from '../src/EdgeWorker';
import type { RepositoryConfig } from '../src/types';

describe('EdgeWorker - Multi-Repository Support', () => {
  let edgeWorker: EdgeWorker;
  const mockRepositories: RepositoryConfig[] = [
    {
      id: 'frontend',
      name: 'Frontend App',
      repositoryPath: '/repos/frontend',
      baseBranch: 'main',
      linearWorkspaceId: 'workspace-1',
      linearToken: 'token-A',
      workspaceBaseDir: '/workspaces/frontend',
    },
    {
      id: 'backend',
      name: 'Backend API',
      repositoryPath: '/repos/backend',
      baseBranch: 'develop',
      linearWorkspaceId: 'workspace-1',
      linearToken: 'token-A', // Same token as frontend
      workspaceBaseDir: '/workspaces/backend',
    },
    {
      id: 'mobile',
      name: 'Mobile App',
      repositoryPath: '/repos/mobile',
      baseBranch: 'main',
      linearWorkspaceId: 'workspace-2',
      linearToken: 'token-B', // Different token
      workspaceBaseDir: '/workspaces/mobile',
    },
  ];

  beforeEach(() => {
    // Reset mocks and counters
    vi.clearAllMocks();
    linearClientCalls = 0;
    ndjsonClientCalls = 0;
  });

  afterEach(async () => {
    if (edgeWorker) {
      await edgeWorker.stop();
    }
  });

  it('should initialize with multiple repositories', () => {
    edgeWorker = new EdgeWorker({
      proxyUrl: 'http://proxy.test',
      claudePath: '/usr/bin/claude',
      repositories: mockRepositories,
    });

    // Should create 3 Linear clients (one per repository)
    expect(linearClientCalls).toBe(3);

    // Should create 2 NDJSON clients (grouped by token)
    expect(ndjsonClientCalls).toBe(2);
  });

  it('should route webhooks to correct repository', async () => {
    const createWorkspaceMock = vi.fn().mockResolvedValue({
      path: '/test/workspace',
      isGitWorktree: false,
    });

    edgeWorker = new EdgeWorker({
      proxyUrl: 'http://proxy.test',
      claudePath: '/usr/bin/claude',
      repositories: mockRepositories,
      handlers: {
        createWorkspace: createWorkspaceMock,
      },
    });

    // Get the ndjson clients
    const ndjsonClients = (edgeWorker as any).ndjsonClients;
    expect(ndjsonClients.size).toBe(2);

    // Find the client for token-B (mobile repo)
    let mobilClient: MockNdjsonClient | undefined;
    for (const [token, client] of ndjsonClients) {
      if (token === 'token-B') {
        mobilClient = client as unknown as MockNdjsonClient;
        break;
      }
    }
    expect(mobilClient).toBeDefined();

    // Simulate webhook for workspace-2 (mobile repo)
    const webhookData = {
      type: 'AppUserNotification',
      notification: {
        type: 'issueAssignedToYou',
        issue: {
          id: 'issue-123',
          identifier: 'MOB-123',
          title: 'Fix mobile bug',
          team: { id: 'workspace-2' },
        },
      },
      eventId: 'evt-123',
    };

    // Trigger webhook handling
    mobilClient!.emit('webhook', webhookData);

    // Wait for async processing
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Should have called createWorkspace with mobile repository
    expect(createWorkspaceMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'issue-123' }),
      expect.objectContaining({ id: 'mobile' })
    );
  });

  it('should include repository context in events', async () => {
    const onSessionStartMock = vi.fn();
    const onClaudeEventMock = vi.fn();

    edgeWorker = new EdgeWorker({
      proxyUrl: 'http://proxy.test',
      claudePath: '/usr/bin/claude',
      repositories: mockRepositories,
      handlers: {
        onSessionStart: onSessionStartMock,
        onClaudeEvent: onClaudeEventMock,
      },
    });

    // Listen for events
    const sessionStartedHandler = vi.fn();
    edgeWorker.on('session:started', sessionStartedHandler);

    // Get backend repository's client (token-A)
    const ndjsonClients = (edgeWorker as any).ndjsonClients;
    let backendClient: MockNdjsonClient | undefined;
    for (const [token, client] of ndjsonClients) {
      if (token === 'token-A') {
        backendClient = client as unknown as MockNdjsonClient;
        break;
      }
    }

    // Simulate issue assignment for backend repo
    const webhookData = {
      type: 'AppUserNotification',
      notification: {
        type: 'issueAssignedToYou',
        issue: {
          id: 'issue-456',
          identifier: 'BACK-456',
          title: 'Update API',
          team: { id: 'workspace-1' },
        },
      },
      organizationId: 'workspace-1',
    };

    // Trigger webhook
    backendClient!.emit('webhook', webhookData);

    await new Promise((resolve) => setTimeout(resolve, 200));

    // Should have been called with some repository ID
    expect(onSessionStartMock).toHaveBeenCalled();
    if (onSessionStartMock.mock.calls.length > 0) {
      const [issueId, issue, repoId] = onSessionStartMock.mock.calls[0];
      expect(issueId).toBe('issue-456');
      expect(issue.id).toBe('issue-456');
      expect(['frontend', 'backend']).toContain(repoId); // Could be either since they share workspace
    }
  });

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
        isActive: false,
      },
    ];

    edgeWorker = new EdgeWorker({
      proxyUrl: 'http://proxy.test',
      claudePath: '/usr/bin/claude',
      repositories: reposWithInactive,
    });

    // Should only create 3 Linear clients (not 4)
    expect(linearClientCalls).toBe(3);
  });

  it('should use repository-specific prompt templates', async () => {
    const reposWithTemplates = mockRepositories.map((repo, i) => ({
      ...repo,
      promptTemplatePath: i === 0 ? '/templates/frontend.md' : undefined,
    }));

    edgeWorker = new EdgeWorker({
      proxyUrl: 'http://proxy.test',
      claudePath: '/usr/bin/claude',
      repositories: reposWithTemplates,
    });

    const buildPromptMethod = (edgeWorker as any).buildInitialPrompt.bind(edgeWorker);

    const issue = {
      id: 'issue-789',
      identifier: 'FE-789',
      title: 'Add feature',
      description: 'Feature description',
    };

    // Build prompt for frontend (has custom template)
    const frontendPrompt = await buildPromptMethod(issue, reposWithTemplates[0]);

    // Build prompt for backend (no custom template)
    const backendPrompt = await buildPromptMethod(issue, reposWithTemplates[1]);

    // Verify prompts include repository context
    expect(frontendPrompt).toContain('Frontend App');
    expect(frontendPrompt).toContain('/repos/frontend');
    expect(backendPrompt).toContain('Backend API');
    expect(backendPrompt).toContain('/repos/backend');
  });

  it('should post comments using correct Linear client', async () => {
    edgeWorker = new EdgeWorker({
      proxyUrl: 'http://proxy.test',
      claudePath: '/usr/bin/claude',
      repositories: mockRepositories,
    });

    // Get the linear clients map
    const linearClients = (edgeWorker as any).linearClients;
    expect(linearClients.size).toBe(3);

    // Post comment for frontend issue
    await (edgeWorker as any).postComment('issue-123', 'Frontend comment', 'frontend');

    // Verify the frontend client was used
    const frontendClient = linearClients.get('frontend') as MockLinearClient;
    expect(frontendClient.createComment).toHaveBeenCalledWith({
      issueId: 'issue-123',
      body: 'Frontend comment',
    });

    // Post comment for mobile issue
    await (edgeWorker as any).postComment('issue-456', 'Mobile comment', 'mobile');

    // Verify the mobile client was used
    const mobileClient = linearClients.get('mobile') as MockLinearClient;
    expect(mobileClient.createComment).toHaveBeenCalledWith({
      issueId: 'issue-456',
      body: 'Mobile comment',
    });
  });

  it('should handle connection status per token', () => {
    edgeWorker = new EdgeWorker({
      proxyUrl: 'http://proxy.test',
      claudePath: '/usr/bin/claude',
      repositories: mockRepositories,
    });

    const status = edgeWorker.getConnectionStatus();

    // Should have 2 connection statuses (one per unique token)
    expect(status.size).toBe(2);

    // All should be connected (mocked to return true)
    for (const [token, isConnected] of status) {
      expect(isConnected).toBe(true);
    }
  });
});
