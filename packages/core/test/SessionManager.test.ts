import { beforeEach, describe, expect, it } from 'vitest';

import type { Issue, Workspace } from '../src/Session';
import { Session } from '../src/Session';
import { SessionManager } from '../src/SessionManager';

// Mock issue implementation
class MockIssue implements Issue {
  constructor(
    public id: string,
    public identifier: string,
    public title: string,
    public description?: string
  ) {}

  getBranchName(): string {
    return `issue/${this.identifier.toLowerCase()}`;
  }
}

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let mockIssue1: Issue;
  let mockIssue2: Issue;
  let mockWorkspace: Workspace;
  let session1: Session;
  let session2: Session;

  beforeEach(() => {
    sessionManager = new SessionManager();

    mockIssue1 = new MockIssue('123', 'TEST-123', 'Test Issue 1');
    mockIssue2 = new MockIssue('456', 'TEST-456', 'Test Issue 2');

    mockWorkspace = {
      path: '/tmp/workspace',
      isGitWorktree: true,
    };

    session1 = new Session({ issue: mockIssue1, workspace: mockWorkspace });
    session2 = new Session({ issue: mockIssue2, workspace: mockWorkspace });
  });

  describe('addSession', () => {
    it('should add a session', () => {
      sessionManager.addSession('issue-123', session1);

      expect(sessionManager.hasSession('issue-123')).toBe(true);
      expect(sessionManager.getSession('issue-123')).toBe(session1);
    });

    it('should overwrite existing session', () => {
      sessionManager.addSession('issue-123', session1);
      sessionManager.addSession('issue-123', session2);

      expect(sessionManager.getSession('issue-123')).toBe(session2);
    });
  });

  describe('getSession', () => {
    it('should return session if exists', () => {
      sessionManager.addSession('issue-123', session1);

      expect(sessionManager.getSession('issue-123')).toBe(session1);
    });

    it('should return undefined if not exists', () => {
      expect(sessionManager.getSession('issue-999')).toBeUndefined();
    });
  });

  describe('hasSession', () => {
    it('should return true if session exists', () => {
      sessionManager.addSession('issue-123', session1);

      expect(sessionManager.hasSession('issue-123')).toBe(true);
    });

    it('should return false if session does not exist', () => {
      expect(sessionManager.hasSession('issue-999')).toBe(false);
    });
  });

  describe('removeSession', () => {
    it('should remove existing session and return true', () => {
      sessionManager.addSession('issue-123', session1);

      const result = sessionManager.removeSession('issue-123');

      expect(result).toBe(true);
      expect(sessionManager.hasSession('issue-123')).toBe(false);
    });

    it('should return false if session does not exist', () => {
      const result = sessionManager.removeSession('issue-999');

      expect(result).toBe(false);
    });
  });

  describe('getAllSessions', () => {
    it('should return empty map initially', () => {
      const sessions = sessionManager.getAllSessions();

      expect(sessions).toBeInstanceOf(Map);
      expect(sessions.size).toBe(0);
    });

    it('should return all sessions', () => {
      sessionManager.addSession('issue-123', session1);
      sessionManager.addSession('issue-456', session2);

      const sessions = sessionManager.getAllSessions();

      expect(sessions.size).toBe(2);
      expect(sessions.get('issue-123')).toBe(session1);
      expect(sessions.get('issue-456')).toBe(session2);
    });

    it('should return the actual Map instance', () => {
      sessionManager.addSession('issue-123', session1);

      const sessions1 = sessionManager.getAllSessions();
      const sessions2 = sessionManager.getAllSessions();

      expect(sessions1).toBe(sessions2);
    });
  });

  describe('updateSession', () => {
    it('should update existing session and return true', () => {
      sessionManager.addSession('issue-123', session1);

      const updatedSession = new Session({
        issue: mockIssue1,
        workspace: mockWorkspace,
        exitCode: 0,
      });

      const result = sessionManager.updateSession('issue-123', updatedSession);

      expect(result).toBe(true);
      expect(sessionManager.getSession('issue-123')).toBe(updatedSession);
    });

    it('should return false if session does not exist', () => {
      const result = sessionManager.updateSession('issue-999', session1);

      expect(result).toBe(false);
      expect(sessionManager.hasSession('issue-999')).toBe(false);
    });
  });

  describe('getActiveSessions', () => {
    it('should return empty array when no sessions', () => {
      const activeSessions = sessionManager.getActiveSessions();

      expect(activeSessions).toEqual([]);
    });

    it('should return only active sessions', () => {
      // Create active session (with process)
      const activeSession = new Session({
        issue: mockIssue1,
        workspace: mockWorkspace,
        process: { pid: 1234, killed: false } as any,
      });

      // Create inactive session (exited)
      const inactiveSession = new Session({
        issue: mockIssue2,
        workspace: mockWorkspace,
        exitCode: 0,
      });

      sessionManager.addSession('issue-123', activeSession);
      sessionManager.addSession('issue-456', inactiveSession);

      const activeSessions = sessionManager.getActiveSessions();

      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0][0]).toBe('issue-123');
      expect(activeSessions[0][1]).toBe(activeSession);
    });

    it('should return array of tuples', () => {
      const activeSession = new Session({
        issue: mockIssue1,
        workspace: mockWorkspace,
        process: { pid: 1234, killed: false } as any,
      });

      sessionManager.addSession('issue-123', activeSession);

      const activeSessions = sessionManager.getActiveSessions();

      expect(Array.isArray(activeSessions)).toBe(true);
      expect(Array.isArray(activeSessions[0])).toBe(true);
      expect(activeSessions[0]).toHaveLength(2);
    });
  });

  describe('countActiveSessions', () => {
    it('should return 0 when no sessions', () => {
      expect(sessionManager.countActiveSessions()).toBe(0);
    });

    it('should count only active sessions', () => {
      // Add 2 active sessions
      sessionManager.addSession(
        'issue-123',
        new Session({
          issue: mockIssue1,
          workspace: mockWorkspace,
          process: { pid: 1234, killed: false } as any,
        })
      );

      sessionManager.addSession(
        'issue-456',
        new Session({
          issue: mockIssue2,
          workspace: mockWorkspace,
          process: { pid: 5678, killed: false } as any,
        })
      );

      // Add 1 inactive session
      sessionManager.addSession(
        'issue-789',
        new Session({
          issue: new MockIssue('789', 'TEST-789', 'Test Issue 3'),
          workspace: mockWorkspace,
          exitCode: 0,
        })
      );

      expect(sessionManager.countActiveSessions()).toBe(2);
    });
  });

  describe('integration scenarios', () => {
    it('should handle full session lifecycle', () => {
      // Start with no sessions
      expect(sessionManager.countActiveSessions()).toBe(0);

      // Add active session
      const activeSession = new Session({
        issue: mockIssue1,
        workspace: mockWorkspace,
        process: { pid: 1234, killed: false } as any,
      });
      sessionManager.addSession('issue-123', activeSession);

      expect(sessionManager.hasSession('issue-123')).toBe(true);
      expect(sessionManager.countActiveSessions()).toBe(1);

      // Update session to mark as exited
      const exitedSession = new Session({
        issue: mockIssue1,
        workspace: mockWorkspace,
        exitCode: 0,
        exitedAt: new Date(),
      });
      sessionManager.updateSession('issue-123', exitedSession);

      expect(sessionManager.hasSession('issue-123')).toBe(true);
      expect(sessionManager.countActiveSessions()).toBe(0);

      // Remove session
      sessionManager.removeSession('issue-123');
      expect(sessionManager.hasSession('issue-123')).toBe(false);
    });

    it('should handle multiple concurrent sessions', () => {
      // Add multiple sessions
      for (let i = 1; i <= 5; i++) {
        const session = new Session({
          issue: new MockIssue(`${i}`, `TEST-${i}`, `Test Issue ${i}`),
          workspace: mockWorkspace,
          process: i % 2 === 0 ? ({ pid: i, killed: false } as any) : null,
        });
        sessionManager.addSession(`issue-${i}`, session);
      }

      expect(sessionManager.getAllSessions().size).toBe(5);
      expect(sessionManager.countActiveSessions()).toBe(2); // Only even numbered have process
    });
  });
});
