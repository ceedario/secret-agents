import { FSWorkspaceService } from '../../../src/adapters/FSWorkspaceService.js';
import { WorkspaceService } from '../../../src/services/WorkspaceService.js';
import fs from 'fs-extra';
import path from 'path';
import { vi, describe, test, expect, beforeEach } from 'vitest';

// Create a mock implementation of the required classes
vi.mock('fs-extra', async () => {
  const mocks = {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockResolvedValue(false),
    existsSync: vi.fn().mockReturnValue(false),
    readFile: vi.fn().mockResolvedValue(''),
    writeFile: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  return {
    default: mocks,
    ...mocks
  };
});

vi.mock('path', async () => {
  return {
    default: {
      join: vi.fn((...args) => args.join('/')),
      dirname: vi.fn(p => p.substring(0, p.lastIndexOf('/'))),
      basename: vi.fn(p => p.split('/').pop()),
    },
    join: vi.fn((...args) => args.join('/')),
    dirname: vi.fn(p => p.substring(0, p.lastIndexOf('/'))),
    basename: vi.fn(p => p.split('/').pop()),
  };
});

// Mock core classes
vi.mock('../../../src/utils/FileSystem.js');
vi.mock('../../../src/utils/ProcessManager.js');
vi.mock('../../../src/core/Workspace.js', () => ({
  Workspace: vi.fn().mockImplementation(data => data)
}));

describe('FSWorkspaceService', () => {
  let workspaceService;
  let mockFileSystem;
  let mockProcessManager;
  let mockIssue;
  
  const testBaseDir = './test/workspaces';
  const customMainBranch = 'develop';
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create mock implementations
    mockFileSystem = {
      ensureDir: vi.fn().mockResolvedValue(undefined),
      pathExists: vi.fn().mockResolvedValue(false),
      existsSync: vi.fn().mockReturnValue(false),
      readFile: vi.fn().mockResolvedValue(''),
      writeFile: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      joinPath: vi.fn((...args) => args.join('/')),
      dirname: vi.fn(p => p.substring(0, p.lastIndexOf('/'))),
      basename: vi.fn(p => p.split('/').pop()),
      homedir: vi.fn(() => './home/testuser'),
      ensureDirSync: vi.fn(),
    };
    
    // Mock ProcessManager with spawn functionality
    mockProcessManager = {
      spawn: vi.fn().mockReturnValue({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            // Auto-resolve with success for simplicity
            setTimeout(() => callback(0), 10);
          }
          return { stdout: { on: vi.fn() }, stderr: { on: vi.fn() } };
        }),
      }),
      setupProcessHandlers: vi.fn((process, handlers) => {
        // Simulate immediate success by calling the onClose handler
        setTimeout(() => handlers.onClose(0), 10);
      }),
      wait: vi.fn().mockResolvedValue(undefined),
    };
    
    // Mock issue
    mockIssue = {
      id: 'test-123',
      identifier: 'TEST-123',
      getBranchName: vi.fn().mockReturnValue('test-123-branch'),
    };
    
    // Create service with custom main branch
    workspaceService = new FSWorkspaceService(
      testBaseDir,
      mockFileSystem,
      mockProcessManager,
      customMainBranch
    );
    
    // Mock internal methods to avoid real implementations
    workspaceService._getRepoRoot = vi.fn().mockResolvedValue('./test/repo');
    workspaceService._pullMainBranch = vi.fn().mockResolvedValue(true);
    workspaceService._createGitWorktree = vi.fn().mockResolvedValue(true);
    workspaceService._verifyBranchAndRunSetup = vi.fn().mockResolvedValue(undefined);
    workspaceService._getHistoryFilePath = vi.fn().mockReturnValue('./home/testuser/.linearsecretagent/test-123-branch/conversation-history.jsonl');
  });
  
  test('constructor should store the main branch name', () => {
    expect(workspaceService.mainBranch).toBe(customMainBranch);
    
    // Test default value
    const defaultService = new FSWorkspaceService(testBaseDir, mockFileSystem, mockProcessManager);
    expect(defaultService.mainBranch).toBe('main');
  });
  
  test('createWorkspace should use the configured main branch name', async () => {
    // Run the workspace creation
    await workspaceService.createWorkspace(mockIssue);
    
    // Verify it used the configured main branch name
    expect(workspaceService._createGitWorktree).toHaveBeenCalledWith(
      expect.any(String),
      mockIssue.getBranchName(),
      customMainBranch
    );
  });
  
  // Test the mainBranch parameter is correctly used in operations
  test('createWorkspace should pass mainBranch to _createGitWorktree', async () => {
    // Test with default main branch
    const defaultService = new FSWorkspaceService(testBaseDir, mockFileSystem, mockProcessManager);
    defaultService._getRepoRoot = vi.fn().mockResolvedValue('./test/repo');
    defaultService._pullMainBranch = vi.fn().mockResolvedValue(true);
    defaultService._createGitWorktree = vi.fn().mockResolvedValue(true);
    defaultService._verifyBranchAndRunSetup = vi.fn().mockResolvedValue(undefined);
    defaultService._getHistoryFilePath = vi.fn().mockReturnValue('./home/testuser/.linearsecretagent/test-123-branch/conversation-history.jsonl');
    
    await defaultService.createWorkspace(mockIssue);
    
    // Should use 'main' as the default branch
    expect(defaultService._createGitWorktree).toHaveBeenCalledWith(
      expect.any(String),
      mockIssue.getBranchName(),
      'main'
    );
    
    // Test with custom main branch
    const customService = new FSWorkspaceService(testBaseDir, mockFileSystem, mockProcessManager, 'master');
    customService._getRepoRoot = vi.fn().mockResolvedValue('./test/repo');
    customService._pullMainBranch = vi.fn().mockResolvedValue(true);
    customService._createGitWorktree = vi.fn().mockResolvedValue(true);
    customService._verifyBranchAndRunSetup = vi.fn().mockResolvedValue(undefined);
    customService._getHistoryFilePath = vi.fn().mockReturnValue('./home/testuser/.linearsecretagent/test-123-branch/conversation-history.jsonl');
    
    await customService.createWorkspace(mockIssue);
    
    // Should use 'master' as the custom branch
    expect(customService._createGitWorktree).toHaveBeenCalledWith(
      expect.any(String),
      mockIssue.getBranchName(),
      'master'
    );
  });
});