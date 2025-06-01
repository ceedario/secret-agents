import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import { LinearIssueService } from '../../../src/adapters/LinearIssueService.mjs'
import { Issue } from '../../../src/core/Issue.mjs'

describe('LinearIssueService', () => {
  let service
  let mockLinearClient
  let mockSessionManager
  let mockClaudeService
  let mockWorkspaceService

  beforeEach(() => {
    mockLinearClient = {}
    mockSessionManager = {
      hasSession: jest.fn(),
      addSession: jest.fn(),
      getSession: jest.fn(),
      removeSession: jest.fn()
    }
    mockClaudeService = {
      startSession: jest.fn()
    }
    mockWorkspaceService = {
      getWorkspaceForIssue: jest.fn(),
      createWorkspace: jest.fn()
    }

    service = new LinearIssueService(
      mockLinearClient,
      'test-user-id',
      mockSessionManager,
      mockClaudeService,
      mockWorkspaceService
    )
  })

  describe('hasBlockedIssuePermission', () => {
    it('should return false if no comments', () => {
      const issue = new Issue({
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        comments: { nodes: [] }
      })

      const result = service.hasBlockedIssuePermission(issue)
      expect(result).toBe(false)
    })

    it('should return false if no permission keywords found', () => {
      const issue = new Issue({
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        comments: {
          nodes: [
            {
              body: 'This is blocked by another issue',
              userId: 'test-user-id',
              createdAt: new Date('2024-01-01')
            },
            {
              body: 'I will wait for the blocking issue',
              userId: 'other-user',
              createdAt: new Date('2024-01-02')
            }
          ]
        }
      })

      const result = service.hasBlockedIssuePermission(issue)
      expect(result).toBe(false)
    })

    it('should return true if permission keyword found after agent query', () => {
      const issue = new Issue({
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        comments: {
          nodes: [
            {
              body: 'This issue is blocked. Should I proceed?',
              userId: 'test-user-id',
              createdAt: new Date('2024-01-01')
            },
            {
              body: 'Yes, please proceed anyway',
              userId: 'other-user',
              createdAt: new Date('2024-01-02')
            }
          ]
        }
      })

      const result = service.hasBlockedIssuePermission(issue)
      expect(result).toBe(true)
    })

    it('should ignore permission before agent asked about blocked status', () => {
      const issue = new Issue({
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        comments: {
          nodes: [
            {
              body: 'Please proceed with this',
              userId: 'other-user',
              createdAt: new Date('2024-01-01')
            },
            {
              body: 'This issue is blocked. Should I proceed?',
              userId: 'test-user-id',
              createdAt: new Date('2024-01-02')
            }
          ]
        }
      })

      const result = service.hasBlockedIssuePermission(issue)
      expect(result).toBe(false)
    })
  })

  describe('handleBlockedIssue', () => {
    beforeEach(() => {
      service.createComment = jest.fn().mockResolvedValue(true)
    })

    it('should return true if issue is not blocked', async () => {
      const issue = new Issue({
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        blockedByIssues: []
      })

      const result = await service.handleBlockedIssue(issue)
      expect(result).toBe(true)
      expect(service.createComment).not.toHaveBeenCalled()
    })

    it('should return true if permission already granted', async () => {
      const issue = new Issue({
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        blockedByIssues: [{ identifier: 'BLOCK-1' }],
        comments: {
          nodes: [
            {
              body: 'This issue is blocked. Should I proceed?',
              userId: 'test-user-id',
              createdAt: new Date('2024-01-01')
            },
            {
              body: 'go ahead',
              userId: 'other-user',
              createdAt: new Date('2024-01-02')
            }
          ]
        }
      })

      const result = await service.handleBlockedIssue(issue)
      expect(result).toBe(true)
      expect(service.createComment).not.toHaveBeenCalled()
    })

    it('should post comment and return false if blocked without permission', async () => {
      const issue = new Issue({
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        blockedByIssues: [{ identifier: 'BLOCK-1' }],
        comments: { nodes: [] }
      })

      const result = await service.handleBlockedIssue(issue)
      expect(result).toBe(false)
      expect(service.createComment).toHaveBeenCalledWith(
        'issue-1',
        expect.stringContaining('blocked by issue BLOCK-1')
      )
    })

    it('should handle multiple blocking issues', async () => {
      const issue = new Issue({
        id: 'issue-1',
        identifier: 'TEST-1',
        title: 'Test Issue',
        blockedByIssues: [
          { identifier: 'BLOCK-1' },
          { identifier: 'BLOCK-2' }
        ],
        comments: { nodes: [] }
      })

      const result = await service.handleBlockedIssue(issue)
      expect(result).toBe(false)
      expect(service.createComment).toHaveBeenCalledWith(
        'issue-1',
        expect.stringContaining('blocked by issues BLOCK-1, BLOCK-2')
      )
    })
  })
})