import { vi } from 'vitest'
import { LinearIssueService } from '../../../src/adapters/LinearIssueService.mjs'
import { NodeClaudeService } from '../../../src/adapters/NodeClaudeService.mjs'
import { Session } from '../../../src/core/Session.mjs'
import { Issue } from '../../../src/core/Issue.mjs'
import { Workspace } from '../../../src/core/Workspace.mjs'

describe('Automatic Thread Resolution', () => {
  let issueService
  let claudeService
  let mockLinearClient
  let mockIssueService
  
  beforeEach(() => {
    // Mock Linear client with comment resolution support
    mockLinearClient = {
      _request: vi.fn().mockResolvedValue({
        commentResolve: {
          success: true,
          comment: {
            id: 'resolved-comment-123',
            resolved: true
          }
        }
      }),
      createComment: vi.fn().mockResolvedValue({ 
        success: true,
        _comment: { id: 'new-comment-id' }
      })
    }
    
    // Mock issue service for Claude
    mockIssueService = {
      createComment: vi.fn().mockResolvedValue(true),
      createCommentAndGetId: vi.fn().mockResolvedValue({
        success: true,
        commentId: 'final-comment-123'
      }),
      updateComment: vi.fn().mockResolvedValue(true),
      resolveCommentThread: vi.fn().mockResolvedValue(true)
    }
    
    // Mock the file system to avoid template loading errors in tests
    const mockFileSystem = {
      existsSync: vi.fn().mockReturnValue(true),
      readFile: vi.fn().mockResolvedValue('mock template content')
    }
    
    claudeService = new NodeClaudeService(
      '/usr/local/bin/claude',
      '/fake/template/path',  // promptTemplatePath
      mockIssueService,
      mockFileSystem,
      null
    )
    
    issueService = new LinearIssueService(
      mockLinearClient,
      'agent-user-id',
      null, // sessionManager
      claudeService,
      null  // workspaceService
    )
  })
  
  describe('Thread Resolution with GraphQL', () => {
    it('should resolve a comment thread using GraphQL mutation', async () => {
      const success = await issueService.resolveCommentThread(
        'root-comment-123',
        'resolving-comment-456'
      )
      
      expect(success).toBe(true)
      expect(mockLinearClient._request).toHaveBeenCalledWith(
        expect.stringContaining('mutation CommentResolve'),
        {
          id: 'root-comment-123',
          resolvingCommentId: 'resolving-comment-456'
        }
      )
    })
    
    it('should resolve a comment thread without a resolving comment', async () => {
      const success = await issueService.resolveCommentThread('root-comment-123')
      
      expect(success).toBe(true)
      expect(mockLinearClient._request).toHaveBeenCalledWith(
        expect.stringContaining('mutation CommentResolve'),
        {
          id: 'root-comment-123',
          resolvingCommentId: null
        }
      )
    })
    
    it('should handle GraphQL errors gracefully', async () => {
      mockLinearClient._request.mockRejectedValue(new Error('GraphQL error'))
      
      const success = await issueService.resolveCommentThread('invalid-comment-123')
      
      expect(success).toBe(false)
    })
    
    it('should handle unsuccessful API responses', async () => {
      mockLinearClient._request.mockResolvedValue({
        commentResolve: {
          success: false
        }
      })
      
      const success = await issueService.resolveCommentThread('comment-123')
      
      expect(success).toBe(false)
    })
  })
  
  describe('Automatic Thread Resolution on Claude Session End', () => {
    it('should post final response and resolve user conversation thread', async () => {
      const session = new Session({
        issue: new Issue({ id: 'issue-123', identifier: 'TEST-123' }),
        workspace: new Workspace({ issueId: 'issue-123', path: '/test' }),
        agentRootCommentId: 'agent-root-123',
        currentParentId: 'user-comment-456', // In a user conversation
        streamingCommentId: 'streaming-123'
      })
      
      const success = await claudeService.postFinalResponseAndResolve(
        'issue-123',
        'I have completed the task successfully.',
        'user-comment-456',
        session
      )
      
      expect(success).toBe(true)
      expect(mockIssueService.createCommentAndGetId).toHaveBeenCalledWith(
        'issue-123',
        'I have completed the task successfully.',
        'user-comment-456'
      )
      expect(mockIssueService.resolveCommentThread).toHaveBeenCalledWith(
        'user-comment-456',  // Resolve the user's thread
        'final-comment-123'  // Using the final comment as resolving comment
      )
    })
    
    it('should post final response and resolve agent-initiated thread', async () => {
      const session = new Session({
        issue: new Issue({ id: 'issue-123', identifier: 'TEST-123' }),
        workspace: new Workspace({ issueId: 'issue-123', path: '/test' }),
        agentRootCommentId: 'agent-root-123',
        currentParentId: null, // Not in a user conversation
        streamingCommentId: 'streaming-123'
      })
      
      const success = await claudeService.postFinalResponseAndResolve(
        'issue-123',
        'I have completed the initial analysis.',
        'agent-root-123',
        session
      )
      
      expect(success).toBe(true)
      expect(mockIssueService.createCommentAndGetId).toHaveBeenCalledWith(
        'issue-123',
        'I have completed the initial analysis.',
        'agent-root-123'
      )
      expect(mockIssueService.resolveCommentThread).toHaveBeenCalledWith(
        'agent-root-123',    // Resolve the agent's thread
        'final-comment-123'  // Using the final comment as resolving comment
      )
    })
    
    it('should skip thread resolution when no thread context is available', async () => {
      const session = new Session({
        issue: new Issue({ id: 'issue-123', identifier: 'TEST-123' }),
        workspace: new Workspace({ issueId: 'issue-123', path: '/test' }),
        agentRootCommentId: null,
        currentParentId: null,
        streamingCommentId: null
      })
      
      const success = await claudeService.postFinalResponseAndResolve(
        'issue-123',
        'Final response without thread context.',
        null,
        session
      )
      
      expect(success).toBe(true)
      expect(mockIssueService.createCommentAndGetId).toHaveBeenCalledWith(
        'issue-123',
        'Final response without thread context.',
        null
      )
      // Should not attempt to resolve any thread
      expect(mockIssueService.resolveCommentThread).not.toHaveBeenCalled()
    })
    
    it('should handle comment creation failure gracefully', async () => {
      mockIssueService.createCommentAndGetId.mockResolvedValue({
        success: false
      })
      
      const session = new Session({
        issue: new Issue({ id: 'issue-123', identifier: 'TEST-123' }),
        workspace: new Workspace({ issueId: 'issue-123', path: '/test' }),
        currentParentId: 'user-comment-456'
      })
      
      const success = await claudeService.postFinalResponseAndResolve(
        'issue-123',
        'Failed to post this.',
        'user-comment-456',
        session
      )
      
      expect(success).toBe(false)
      expect(mockIssueService.resolveCommentThread).not.toHaveBeenCalled()
    })
  })
  
  describe('Thread Resolution Logic', () => {
    it('should prioritize user conversation thread over agent thread', async () => {
      const session = new Session({
        issue: new Issue({ id: 'issue-123', identifier: 'TEST-123' }),
        workspace: new Workspace({ issueId: 'issue-123', path: '/test' }),
        agentRootCommentId: 'agent-root-123',
        currentParentId: 'user-comment-456', // Both are set, should prioritize user thread
        streamingCommentId: 'streaming-123'
      })
      
      await claudeService.postFinalResponseAndResolve(
        'issue-123',
        'Prioritizing user thread.',
        'user-comment-456',
        session
      )
      
      // Should resolve the user thread, not the agent thread
      expect(mockIssueService.resolveCommentThread).toHaveBeenCalledWith(
        'user-comment-456',  // User thread takes priority
        'final-comment-123'
      )
      expect(mockIssueService.resolveCommentThread).not.toHaveBeenCalledWith(
        'agent-root-123',   // Agent thread should not be resolved
        expect.anything()
      )
    })
  })
})