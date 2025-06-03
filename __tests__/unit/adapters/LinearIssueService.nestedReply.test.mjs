import { beforeEach,describe, expect, it, vi } from 'vitest'

import { LinearIssueService } from '../../../src/adapters/LinearIssueService.mjs'

describe('LinearIssueService - Nested Reply Handling', () => {
  let issueService
  let mockLinearClient
  
  beforeEach(() => {
    // Mock Linear client with comment structure support
    mockLinearClient = {
      createComment: vi.fn().mockResolvedValue({ 
        success: true,
        comment: { id: 'new-comment-id' }
      }),
      issueComments: vi.fn().mockResolvedValue({
        comments: {
          nodes: [
            // Root comment from Jane
            {
              id: 'jane-root-comment',
              body: 'Original question about the feature',
              user: { id: 'jane-id', name: 'Jane' },
              parent: null
            },
            // Jimmy's reply to Jane's root comment
            {
              id: 'jimmy-reply-1',
              body: 'I think this might be related to...',
              user: { id: 'jimmy-id', name: 'Jimmy' },
              parent: { id: 'jane-root-comment' }
            },
            // Jane's nested reply to Jimmy (this is where she mentions the agent)
            {
              id: 'jane-nested-reply',
              body: '@agentslick can you help with this?',
              user: { id: 'jane-id', name: 'Jane' },
              parent: { id: 'jimmy-reply-1' }
            }
          ]
        }
      })
    }
    
    // Create the service
    issueService = new LinearIssueService(
      mockLinearClient,
      'agent-user-id',
      null, // sessionManager
      null, // claudeService  
      null  // workspaceService
    )
  })
  
  describe('findRootCommentId', () => {
    it('should return the same ID for a root comment', async () => {
      const rootId = await issueService.findRootCommentId('issue-123', 'jane-root-comment')
      expect(rootId).toBe('jane-root-comment')
    })
    
    it('should find the root for a first-level reply', async () => {
      const rootId = await issueService.findRootCommentId('issue-123', 'jimmy-reply-1')
      expect(rootId).toBe('jane-root-comment')
    })
    
    it('should find the root for a deeply nested reply', async () => {
      const rootId = await issueService.findRootCommentId('issue-123', 'jane-nested-reply')
      expect(rootId).toBe('jane-root-comment')
    })
    
    it('should return null if comment not found', async () => {
      const rootId = await issueService.findRootCommentId('issue-123', 'non-existent-comment')
      expect(rootId).toBeNull()
    })
    
    it('should handle empty comments list', async () => {
      mockLinearClient.issueComments.mockResolvedValue({
        comments: { nodes: [] }
      })
      
      const rootId = await issueService.findRootCommentId('issue-123', 'any-comment')
      expect(rootId).toBeNull()
    })
    
    it('should handle API errors gracefully', async () => {
      mockLinearClient.issueComments.mockRejectedValue(new Error('API Error'))
      
      const rootId = await issueService.findRootCommentId('issue-123', 'any-comment')
      expect(rootId).toBeNull()
    })
    
    it('should prevent infinite loops with circular references', async () => {
      // Mock circular reference scenario (should not happen in real Linear but good to be safe)
      mockLinearClient.issueComments.mockResolvedValue({
        comments: {
          nodes: [
            {
              id: 'comment-a',
              parent: { id: 'comment-b' }
            },
            {
              id: 'comment-b', 
              parent: { id: 'comment-a' }
            }
          ]
        }
      })
      
      const rootId = await issueService.findRootCommentId('issue-123', 'comment-a')
      // Should return one of the comments rather than hanging
      expect(['comment-a', 'comment-b']).toContain(rootId)
    })
  })
  
  describe('nested reply scenario integration', () => {
    it('should use root comment ID when agent is mentioned in nested reply', async () => {
      // Simulate the scenario: Jane mentions agent in a nested reply
      const mentionData = {
        issueId: 'issue-123',
        commentId: 'jane-nested-reply',
        comment: {
          body: '@agentslick can you help with this?',
          parentId: 'jimmy-reply-1' // This is a nested reply, not a root comment
        },
        actor: { name: 'Jane' }
      }
      
      // Mock session manager and Claude service
      const mockSession = {
        currentParentId: null,
        lastCommentId: null,
        conversationContext: null
      }
      
      const mockSessionManager = {
        hasSession: vi.fn().mockReturnValue(true),
        getSession: vi.fn().mockReturnValue(mockSession),
        updateSession: vi.fn()
      }
      
      const mockClaudeService = {
        sendComment: vi.fn().mockResolvedValue(mockSession)
      }
      
      // Create service with mocked dependencies
      const serviceWithMocks = new LinearIssueService(
        mockLinearClient,
        'agent-user-id',
        mockSessionManager,
        mockClaudeService,
        null
      )
      
      // Mock fetchIssue to return a valid issue
      serviceWithMocks.fetchIssue = vi.fn().mockResolvedValue({
        id: 'issue-123',
        identifier: 'TEST-123',
        assigneeId: 'agent-user-id'
      })
      
      // Handle the agent mention
      await serviceWithMocks.handleAgentMention(mentionData)
      
      // Verify that findRootCommentId was called and currentParentId was set to root
      expect(mockLinearClient.issueComments).toHaveBeenCalledWith('issue-123')
      expect(mockSession.currentParentId).toBe('jane-root-comment') // Should be root, not 'jimmy-reply-1'
      expect(mockSession.lastCommentId).toBe('jane-nested-reply')
      expect(mockSession.conversationContext).toBe('mention')
    })
  })
})