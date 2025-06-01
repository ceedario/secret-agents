import { FSWorkspaceService } from '../../../src/adapters/FSWorkspaceService.mjs';
import { WorkspaceService } from '../../../src/services/WorkspaceService.mjs';
import fs from 'fs-extra';
import path from 'path';
import { jest } from '@jest/globals';

// Create a mock implementation of the required classes
jest.mock('fs-extra', () => ({
  ensureDir: jest.fn().mockResolvedValue(undefined),
  pathExists: jest.fn().mockResolvedValue(false),
  existsSync: jest.fn().mockReturnValue(false),
  readFile: jest.fn().mockResolvedValue(''),
  writeFile: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn(p => p.substring(0, p.lastIndexOf('/'))),
  basename: jest.fn(p => p.split('/').pop()),
}));

// Mock core classes
jest.mock('../../../src/utils/FileSystem.mjs');
jest.mock('../../../src/utils/ProcessManager.mjs');
jest.mock('../../../src/core/Workspace.js', () => ({
  Workspace: jest.fn().mockImplementation(data => data)
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
    jest.clearAllMocks();
    
    // Create mock implementations
    mockFileSystem = {
      ensureDir: jest.fn().mockResolvedValue(undefined),
      pathExists: jest.fn().mockResolvedValue(false),
      existsSync: jest.fn().mockReturnValue(false),
      readFile: jest.fn().mockResolvedValue(''),
      writeFile: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      joinPath: jest.fn((...args) => args.join('/')),
      dirname: jest.fn(p => p.substring(0, p.lastIndexOf('/'))),
      basename: jest.fn(p => p.split('/').pop()),
      homedir: jest.fn(() => './home/testuser'),
      ensureDirSync: jest.fn(),
    };
    
    // Mock ProcessManager with spawn functionality
    mockProcessManager = {
      spawn: jest.fn().mockReturnValue({
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            // Auto-resolve with success for simplicity
            setTimeout(() => callback(0), 10);
          }
          return { stdout: { on: jest.fn() }, stderr: { on: jest.fn() } };
        }),
      }),
      setupProcessHandlers: jest.fn((process, handlers) => {
        // Simulate immediate success by calling the onClose handler
        setTimeout(() => handlers.onClose(0), 10);
      }),
      wait: jest.fn().mockResolvedValue(undefined),
    };
    
    // Mock issue
    mockIssue = {
      id: 'test-123',
      identifier: 'TEST-123',
      getBranchName: jest.fn().mockReturnValue('test-123-branch'),
    };
    
    // Create service with custom main branch
    workspaceService = new FSWorkspaceService(
      testBaseDir,
      mockFileSystem,
      mockProcessManager,
      customMainBranch
    );
    
    // Mock internal methods to avoid real implementations
    workspaceService._getRepoRoot = jest.fn().mockResolvedValue('./test/repo');
    workspaceService._pullMainBranch = jest.fn().mockResolvedValue(true);
    workspaceService._createGitWorktree = jest.fn().mockResolvedValue(true);
    workspaceService._verifyBranchAndRunSetup = jest.fn().mockResolvedValue(undefined);
    workspaceService._getHistoryFilePath = jest.fn().mockReturnValue('./home/testuser/.linearsecretagent/test-123-branch/conversation-history.jsonl');
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
    defaultService._getRepoRoot = jest.fn().mockResolvedValue('./test/repo');
    defaultService._pullMainBranch = jest.fn().mockResolvedValue(true);
    defaultService._createGitWorktree = jest.fn().mockResolvedValue(true);
    defaultService._verifyBranchAndRunSetup = jest.fn().mockResolvedValue(undefined);
    defaultService._getHistoryFilePath = jest.fn().mockReturnValue('./home/testuser/.linearsecretagent/test-123-branch/conversation-history.jsonl');
    
    await defaultService.createWorkspace(mockIssue);
    
    // Should use 'main' as the default branch
    expect(defaultService._createGitWorktree).toHaveBeenCalledWith(
      expect.any(String),
      mockIssue.getBranchName(),
      'main'
    );
    
    // Test with custom main branch
    const customService = new FSWorkspaceService(testBaseDir, mockFileSystem, mockProcessManager, 'master');
    customService._getRepoRoot = jest.fn().mockResolvedValue('./test/repo');
    customService._pullMainBranch = jest.fn().mockResolvedValue(true);
    customService._createGitWorktree = jest.fn().mockResolvedValue(true);
    customService._verifyBranchAndRunSetup = jest.fn().mockResolvedValue(undefined);
    customService._getHistoryFilePath = jest.fn().mockReturnValue('./home/testuser/.linearsecretagent/test-123-branch/conversation-history.jsonl');
    
    await customService.createWorkspace(mockIssue);
    
    // Should use 'master' as the custom branch
    expect(customService._createGitWorktree).toHaveBeenCalledWith(
      expect.any(String),
      mockIssue.getBranchName(),
      'master'
    );
  });
});