import { Session } from '../../../src/core/Session.js';
import { Issue } from '../../../src/core/Issue.js';
import { Workspace } from '../../../src/core/Workspace.js';
import { describe, it, expect } from 'vitest';

describe('Session', () => {
  // Create mock issue and workspace
  const mockIssue = new Issue({
    id: 'issue-123',
    identifier: 'TEST-456',
    title: 'Test Issue',
    description: 'This is a test issue',
    state: { name: 'Todo' },
    priority: 1,
    url: 'https://linear.app/test/issue/TEST-456',
    assigneeId: 'user-789'
  });
  
  const mockWorkspace = new Workspace({
    issue: mockIssue,
    path: '/test/workspace/test-456',
    isGitWorktree: true,
    historyPath: '/test/.linearsecretagent/test-456/conversation-history.jsonl'
  });
  
  describe('constructor', () => {
    it('should create an instance with the provided data', () => {
      const mockProcess = { pid: 12345 };
      const startedAt = new Date('2023-01-01T00:00:00Z');
      
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        process: mockProcess,
        startedAt,
        exitCode: null,
        exitedAt: null,
        stderrContent: '',
        lastAssistantResponse: 'Hello, how can I help?'
      });
      
      expect(session.issue).toBe(mockIssue);
      expect(session.workspace).toBe(mockWorkspace);
      expect(session.process).toBe(mockProcess);
      expect(session.startedAt).toEqual(startedAt);
      expect(session.exitCode).toBeNull();
      expect(session.exitedAt).toBeNull();
      expect(session.stderrContent).toBe('');
      expect(session.lastAssistantResponse).toBe('Hello, how can I help?');
    });
    
    it('should handle date strings and convert them to Date objects', () => {
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        startedAt: '2023-01-01T00:00:00Z',
        exitedAt: '2023-01-01T01:00:00Z'
      });
      
      expect(session.startedAt).toBeInstanceOf(Date);
      expect(session.startedAt.toISOString()).toBe('2023-01-01T00:00:00.000Z');
      
      expect(session.exitedAt).toBeInstanceOf(Date);
      expect(session.exitedAt.toISOString()).toBe('2023-01-01T01:00:00.000Z');
    });
  });
  
  describe('isActive', () => {
    it('should return true when the process is running', () => {
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        process: { killed: false },
        exitCode: null
      });
      
      expect(session.isActive()).toBe(true);
    });
    
    it('should return false when the process is null', () => {
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        process: null,
        exitCode: null
      });
      
      expect(session.isActive()).toBe(false);
    });
    
    it('should return false when the process is killed', () => {
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        process: { killed: true },
        exitCode: null
      });
      
      expect(session.isActive()).toBe(false);
    });
    
    it('should return false when the process has exited', () => {
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        process: { killed: false },
        exitCode: 0
      });
      
      expect(session.isActive()).toBe(false);
    });
  });
  
  describe('hasExitedSuccessfully', () => {
    it('should return true when exitCode is 0', () => {
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        exitCode: 0
      });
      
      expect(session.hasExitedSuccessfully()).toBe(true);
    });
    
    it('should return false when exitCode is not 0', () => {
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        exitCode: 1
      });
      
      expect(session.hasExitedSuccessfully()).toBe(false);
    });
    
    it('should return false when exitCode is null', () => {
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        exitCode: null
      });
      
      expect(session.hasExitedSuccessfully()).toBe(false);
    });
  });
  
  describe('hasExitedWithError', () => {
    it('should return true when exitCode is not 0 and not null', () => {
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        exitCode: 1
      });
      
      expect(session.hasExitedWithError()).toBe(true);
    });
    
    it('should return false when exitCode is 0', () => {
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        exitCode: 0
      });
      
      expect(session.hasExitedWithError()).toBe(false);
    });
    
    it('should return false when exitCode is null', () => {
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        exitCode: null
      });
      
      expect(session.hasExitedWithError()).toBe(false);
    });
  });
  
  describe('formatErrorMessage', () => {
    it('should format a basic error message', () => {
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        exitCode: 1,
        stderrContent: ''
      });
      
      const errorMessage = session.formatErrorMessage();
      expect(errorMessage).toContain('Claude process for issue TEST-456 exited unexpectedly with code 1.');
      expect(errorMessage).not.toContain('**Error details (stderr):**');
    });
    
    it('should include stderr content when available', () => {
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        exitCode: 1,
        stderrContent: 'Error: Process failed'
      });
      
      const errorMessage = session.formatErrorMessage();
      expect(errorMessage).toContain('Claude process for issue TEST-456 exited unexpectedly with code 1.');
      expect(errorMessage).toContain('**Error details (stderr):**');
      expect(errorMessage).toContain('Error: Process failed');
    });
    
    it('should truncate long stderr content', () => {
      // Create a long stderr message
      const longError = 'A'.repeat(2000);
      
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        exitCode: 1,
        stderrContent: longError
      });
      
      const errorMessage = session.formatErrorMessage();
      expect(errorMessage.length).toBeLessThan(longError.length + 200); // Add some buffer for the template text
      expect(errorMessage).toContain('... (truncated)');
    });
  });
});