import { vi } from 'vitest'

import { LinearIssueService } from '../../../src/adapters/LinearIssueService.mjs'

describe('Threaded Comments Integration', () => {
  let issueService
  let mockLinearClient
  
  beforeEach(() => {
    // Create a minimal mock Linear client
    mockLinearClient = {
      createComment: vi.fn().mockResolvedValue({ success: true })
    }
    
    // Create the service with minimal dependencies
    issueService = new LinearIssueService(
      mockLinearClient,
      'test-user-id',
      null, // sessionManager
      null, // claudeService  
      null  // workspaceService
    )
  })
  
  describe('createComment with threading support', () => {
    it('should create a regular top-level comment when parentId is not provided', async () => {
      await issueService.createComment('issue-123', 'This is a top-level comment')
      
      expect(mockLinearClient.createComment).toHaveBeenCalledWith({
        issueId: 'issue-123',
        body: 'This is a top-level comment'
      })
    })
    
    it('should create a threaded reply when parentId is provided', async () => {
      await issueService.createComment(
        'issue-123', 
        'This is a reply',
        'parent-comment-456'
      )
      
      expect(mockLinearClient.createComment).toHaveBeenCalledWith({
        issueId: 'issue-123',
        body: 'This is a reply',
        parentId: 'parent-comment-456'
      })
    })
    
    it('should not include parentId when it is null', async () => {
      await issueService.createComment('issue-123', 'Another comment', null)
      
      expect(mockLinearClient.createComment).toHaveBeenCalledWith({
        issueId: 'issue-123',
        body: 'Another comment'
      })
    })
  })
})