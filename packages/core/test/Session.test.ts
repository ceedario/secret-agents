import type { ChildProcess } from 'child_process';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Issue, NarrativeItem, SessionOptions, Workspace } from '../src/Session';
import { Session } from '../src/Session';

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

describe('Session', () => {
  let mockIssue: Issue;
  let mockWorkspace: Workspace;
  let mockProcess: ChildProcess;

  beforeEach(() => {
    mockIssue = new MockIssue('123', 'TEST-123', 'Test Issue', 'Test description');
    mockWorkspace = {
      path: '/tmp/workspace/TEST-123',
      isGitWorktree: true,
      historyPath: '/tmp/workspace/TEST-123/.claude_history.md',
    };
    mockProcess = {
      pid: 1234,
      killed: false,
      kill: vi.fn(),
    } as any;
  });

  describe('constructor', () => {
    it('should create a session with minimal options', () => {
      const session = new Session({ issue: mockIssue, workspace: mockWorkspace });

      expect(session.issue).toBe(mockIssue);
      expect(session.workspace).toBe(mockWorkspace);
      expect(session.process).toBeNull();
      expect(session.startedAt).toBeInstanceOf(Date);
      expect(session.exitCode).toBeNull();
      expect(session.exitedAt).toBeNull();
      expect(session.stderrContent).toBe('');
      expect(session.lastAssistantResponse).toBe('');
      expect(session.streamingNarrative).toEqual([]);
    });

    it('should create a session with all options', () => {
      const startedAt = new Date('2024-01-15T10:00:00Z');
      const exitedAt = new Date('2024-01-15T11:00:00Z');
      const narrative: NarrativeItem[] = [
        { type: 'text', content: 'Hello', timestamp: Date.now() },
      ];

      const options: SessionOptions = {
        issue: mockIssue,
        workspace: mockWorkspace,
        process: mockProcess,
        startedAt,
        exitCode: 0,
        exitedAt,
        stderrContent: 'Some error',
        lastAssistantResponse: 'Last response',
        lastCommentId: 'comment-123',
        conversationContext: { some: 'context' },
        agentRootCommentId: 'root-comment-123',
        currentParentId: 'parent-123',
        streamingCommentId: 'streaming-123',
        streamingSynthesis: 'Current synthesis',
        streamingNarrative: narrative,
      };

      const session = new Session(options);

      expect(session.issue).toBe(mockIssue);
      expect(session.workspace).toBe(mockWorkspace);
      expect(session.process).toBe(mockProcess);
      expect(session.startedAt).toEqual(startedAt);
      expect(session.exitCode).toBe(0);
      expect(session.exitedAt).toEqual(exitedAt);
      expect(session.stderrContent).toBe('Some error');
      expect(session.lastAssistantResponse).toBe('Last response');
      expect(session.lastCommentId).toBe('comment-123');
      expect(session.conversationContext).toEqual({ some: 'context' });
      expect(session.agentRootCommentId).toBe('root-comment-123');
      expect(session.currentParentId).toBe('parent-123');
      expect(session.streamingCommentId).toBe('streaming-123');
      expect(session.streamingSynthesis).toBe('Current synthesis');
      expect(session.streamingNarrative).toBe(narrative);
    });

    it('should handle string dates', () => {
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        startedAt: '2024-01-15T10:00:00Z',
        exitedAt: '2024-01-15T11:00:00Z',
      });

      expect(session.startedAt).toBeInstanceOf(Date);
      expect(session.exitedAt).toBeInstanceOf(Date);
      expect(session.startedAt.toISOString()).toBe('2024-01-15T10:00:00.000Z');
      expect(session.exitedAt?.toISOString()).toBe('2024-01-15T11:00:00.000Z');
    });
  });

  describe('isActive', () => {
    it('should return true for active session', () => {
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        process: mockProcess,
      });

      expect(session.isActive()).toBe(true);
    });

    it('should return false when process is null', () => {
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
      });

      expect(session.isActive()).toBe(false);
    });

    it('should return false when process is killed', () => {
      const killedProcess = { ...mockProcess, killed: true };
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        process: killedProcess,
      });

      expect(session.isActive()).toBe(false);
    });

    it('should return false when exitCode is set', () => {
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        process: mockProcess,
        exitCode: 0,
      });

      expect(session.isActive()).toBe(false);
    });
  });

  describe('hasExitedSuccessfully', () => {
    it('should return true when exitCode is 0', () => {
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        exitCode: 0,
      });

      expect(session.hasExitedSuccessfully()).toBe(true);
    });

    it('should return false when exitCode is non-zero', () => {
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        exitCode: 1,
      });

      expect(session.hasExitedSuccessfully()).toBe(false);
    });

    it('should return false when exitCode is null', () => {
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
      });

      expect(session.hasExitedSuccessfully()).toBe(false);
    });
  });

  describe('hasExitedWithError', () => {
    it('should return true when exitCode is non-zero', () => {
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        exitCode: 1,
      });

      expect(session.hasExitedWithError()).toBe(true);
    });

    it('should return false when exitCode is 0', () => {
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        exitCode: 0,
      });

      expect(session.hasExitedWithError()).toBe(false);
    });

    it('should return false when exitCode is null', () => {
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
      });

      expect(session.hasExitedWithError()).toBe(false);
    });
  });

  describe('formatErrorMessage', () => {
    it('should format basic error message', () => {
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        exitCode: 1,
      });

      const message = session.formatErrorMessage();
      expect(message).toBe('Claude process for issue TEST-123 exited unexpectedly with code 1.');
    });

    it('should include stderr content', () => {
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        exitCode: 1,
        stderrContent: 'Error: Something went wrong',
      });

      const message = session.formatErrorMessage();
      expect(message).toContain(
        'Claude process for issue TEST-123 exited unexpectedly with code 1.'
      );
      expect(message).toContain('**Error details (stderr):**');
      expect(message).toContain('Error: Something went wrong');
    });

    it('should truncate long stderr content', () => {
      const longError = 'x'.repeat(2000);
      const session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
        exitCode: 1,
        stderrContent: longError,
      });

      const message = session.formatErrorMessage();
      expect(message).toContain('x'.repeat(1500));
      expect(message).toContain('... (truncated)');
    });
  });

  describe('narrative management', () => {
    let session: Session;

    beforeEach(() => {
      session = new Session({
        issue: mockIssue,
        workspace: mockWorkspace,
      });
    });

    describe('addToolCall', () => {
      it('should add tool call to narrative', () => {
        const beforeTimestamp = Date.now();
        session.addToolCall('bash');
        const afterTimestamp = Date.now();

        expect(session.streamingNarrative).toHaveLength(1);
        const item = session.streamingNarrative[0];
        expect(item.type).toBe('tool_call');
        expect(item.tool).toBe('bash');
        expect(item.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
        expect(item.timestamp).toBeLessThanOrEqual(afterTimestamp);
      });

      it('should update streaming synthesis', () => {
        session.addToolCall('bash');
        expect(session.streamingSynthesis).toBeTruthy();
        expect(session.streamingSynthesis).toContain('1 tool call: bash');
      });

      it('should group consecutive tool calls', () => {
        session.addToolCall('bash');
        session.addToolCall('edit');
        session.addToolCall('read');

        expect(session.streamingSynthesis).toContain('3 tool calls: bash, edit, read');
      });
    });

    describe('addTextSnippet', () => {
      it('should add text to narrative', () => {
        const beforeTimestamp = Date.now();
        session.addTextSnippet('Test text snippet');
        const afterTimestamp = Date.now();

        expect(session.streamingNarrative).toHaveLength(1);
        const item = session.streamingNarrative[0];
        expect(item.type).toBe('text');
        expect(item.content).toBe('Test text snippet');
        expect(item.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
        expect(item.timestamp).toBeLessThanOrEqual(afterTimestamp);
      });

      it('should update streaming synthesis with text preview', () => {
        session.addTextSnippet('This is a test message.');
        expect(session.streamingSynthesis).toContain('This is a test message.');
      });

      it('should truncate long text', () => {
        const longText =
          'This is a very long text that should be truncated because it exceeds the maximum length allowed for preview display in the synthesis.';
        session.addTextSnippet(longText);

        expect(session.streamingSynthesis).toContain('...');
        expect(session.streamingSynthesis?.length).toBeLessThan(longText.length);
      });
    });

    describe('updateStreamingSynthesis', () => {
      it('should handle mixed narrative items', () => {
        session.addTextSnippet('Starting work');
        session.addToolCall('bash');
        session.addToolCall('edit');
        session.addTextSnippet('Finished editing');
        session.addToolCall('read');

        const synthesis = session.streamingSynthesis!;
        expect(synthesis).toContain('Starting work');
        expect(synthesis).toContain('2 tool calls: bash, edit');
        expect(synthesis).toContain('Finished editing');
        expect(synthesis).toContain('1 tool call: read');
      });

      it('should handle empty narrative', () => {
        session.updateStreamingSynthesis();
        expect(session.streamingSynthesis).toContain('Getting to work...');
      });

      it('should clean up text whitespace', () => {
        session.addTextSnippet('Text   with\n\nmultiple    spaces');
        expect(session.streamingSynthesis).toContain('Text with multiple spaces');
      });

      it('should extract first sentence', () => {
        session.addTextSnippet('First sentence. Second sentence. Third sentence.');
        expect(session.streamingSynthesis).toContain('First sentence.');
        expect(session.streamingSynthesis).not.toContain('Second sentence');
      });
    });
  });

  describe('Issue interface', () => {
    it('should implement getBranchName correctly', () => {
      const issue = new MockIssue('456', 'FEAT-456', 'New Feature');
      expect(issue.getBranchName()).toBe('issue/feat-456');
    });
  });
});
