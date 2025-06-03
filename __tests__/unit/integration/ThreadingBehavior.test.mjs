import { vi } from 'vitest'

import { LinearIssueService } from '../../../src/adapters/LinearIssueService.mjs'
import { NodeClaudeService } from '../../../src/adapters/NodeClaudeService.mjs'
import { Issue } from '../../../src/core/Issue.mjs'
import { Session } from '../../../src/core/Session.mjs'
import { Workspace } from '../../../src/core/Workspace.mjs'
import { SessionManager } from '../../../src/services/SessionManager.mjs'

describe('Linear Threading Behavior', () => {
  let issueService
  let claudeService
  let sessionManager
  let mockLinearClient
  let mockIssueService
  
  beforeEach(() => {
    // Mock Linear client
    mockLinearClient = {
      createComment: vi.fn().mockResolvedValue({ 
        success: true,
        comment: { id: 'new-comment-id' }
      })
    }
    
    // Mock issue service for Claude
    mockIssueService = {
      createComment: vi.fn().mockResolvedValue(true)
    }
    
    // Create real instances
    sessionManager = new SessionManager()
    
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
      sessionManager,
      claudeService,
      null
    )
  })
  
  describe('Agent Assignment Flow', () => {
    it('should create first comment without parentId when assigned', async () => {
      // When agent is assigned, it creates the first comment
      await issueService.createComment(
        'issue-123',
        "I'm now assigned to this issue and will start working on it right away."
      )
      
      expect(mockLinearClient.createComment).toHaveBeenCalledWith({
        issueId: 'issue-123',
        body: "I'm now assigned to this issue and will start working on it right away."
        // No parentId - this is the root comment
      })
    })
    
    it('should thread subsequent agent messages under the first comment', async () => {
      const issue = new Issue({ id: 'issue-123', identifier: 'TEST-123' })
      const workspace = new Workspace({ issueId: 'issue-123', path: '/test' })
      const session = new Session({ 
        issue, 
        workspace,
        agentRootCommentId: 'first-agent-comment-123' // Track the first comment
      })
      
      // Simulate agent posting subsequent messages
      await claudeService.postResponseToLinear(
        'issue-123',
        "I'll investigate this issue and implement the required changes.",
        null,
        null,
        'first-agent-comment-123' // Should reply to its own first comment
      )
      
      expect(mockIssueService.createComment).toHaveBeenCalledWith(
        'issue-123',
        "I'll investigate this issue and implement the required changes.",
        'first-agent-comment-123'
      )
    })
    
    it('should thread final response under the first comment', async () => {
      await claudeService.postResponseToLinear(
        'issue-123',
        "I've completed the implementation. Here are some questions...",
        null,
        null,
        'first-agent-comment-123'
      )
      
      expect(mockIssueService.createComment).toHaveBeenCalledWith(
        'issue-123',
        "I've completed the implementation. Here are some questions...",
        'first-agent-comment-123'
      )
    })
  })
  
  describe('User Comment Response Flow', () => {
    it('should reply to user root comment when mentioned', async () => {
      const mockCommentData = {
        id: 'user-comment-789',
        issueId: 'issue-123',
        body: 'Hey @testagent can you help with this?',
        user: { id: 'user-456', name: 'Test User' }
        // No parentId - this is a root comment
      }
      
      // Session should track this comment for replies
      const session = new Session({
        issue: { id: 'issue-123' },
        workspace: { path: '/test' },
        agentRootCommentId: 'first-agent-comment-123'
      })
      
      // Update session to track the user comment
      session.lastCommentId = 'user-comment-789'
      session.conversationContext = 'reply'
      
      // Agent should reply to the user comment
      await claudeService.postResponseToLinear(
        'issue-123',
        "Sure, I'll get started on this right away.",
        null,
        null,
        'user-comment-789' // Reply to user's comment
      )
      
      expect(mockIssueService.createComment).toHaveBeenCalledWith(
        'issue-123',
        "Sure, I'll get started on this right away.",
        'user-comment-789'
      )
    })
    
    it('should continue threading under the same user comment', async () => {
      // Second response should also thread under the user comment
      await claudeService.postResponseToLinear(
        'issue-123',
        "I've finished implementing the requested feature.",
        null,
        null,
        'user-comment-789'
      )
      
      expect(mockIssueService.createComment).toHaveBeenCalledWith(
        'issue-123',
        "I've finished implementing the requested feature.",
        'user-comment-789'
      )
    })
  })
  
  describe('Nested Thread Response Flow', () => {
    it('should reply to the same thread when user replies in existing thread', async () => {
      // Scenario: Jane creates root comment, Jimmy replies, Jane mentions agent in thread
      const mockThreadedComment = {
        id: 'jane-reply-in-thread',
        issueId: 'issue-123',
        body: '@testagent can you fix this bug?',
        user: { id: 'jane-id', name: 'Jane' },
        parentId: 'jane-root-comment' // Jane's reply is in the thread
      }
      
      // Agent should reply to the same parent as Jane's threaded comment
      await claudeService.postResponseToLinear(
        'issue-123',
        "Sure, getting started on the bug fix...",
        null,
        null,
        'jane-root-comment' // Use same parentId as the comment that mentioned us
      )
      
      expect(mockIssueService.createComment).toHaveBeenCalledWith(
        'issue-123',
        "Sure, getting started on the bug fix...",
        'jane-root-comment'
      )
    })
  })
  
  describe('Error Message Threading', () => {
    it('should thread error messages under the current conversation', async () => {
      // Error messages should also be threaded
      await claudeService.postResponseToLinear(
        'issue-123',
        '[System Error] Failed to process request: Token limit exceeded',
        null,
        null,
        'user-comment-789' // Thread under current conversation
      )
      
      expect(mockIssueService.createComment).toHaveBeenCalledWith(
        'issue-123',
        '[System Error] Failed to process request: Token limit exceeded',
        'user-comment-789'
      )
    })
  })
  
  describe('Session Tracking', () => {
    it('should track agent root comment ID in session', () => {
      const session = new Session({
        issue: { id: 'issue-123' },
        workspace: { path: '/test' }
      })
      
      // When agent creates first comment, store its ID
      session.agentRootCommentId = 'first-agent-comment-123'
      
      expect(session.agentRootCommentId).toBe('first-agent-comment-123')
    })
    
    it('should track current conversation parent for replies', () => {
      const session = new Session({
        issue: { id: 'issue-123' },
        workspace: { path: '/test' },
        agentRootCommentId: 'first-agent-comment-123'
      })
      
      // When responding to a user comment
      session.currentParentId = 'user-comment-789'
      
      expect(session.currentParentId).toBe('user-comment-789')
    })
  })
})