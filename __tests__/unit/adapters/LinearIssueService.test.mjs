import { vi } from 'vitest'

import { LinearIssueService } from '../../../src/adapters/LinearIssueService.mjs'

describe('LinearIssueService', () => {
  let linearIssueService
  let mockLinearClient
  let mockSessionManager
  let mockClaudeService
  let mockWorkspaceService

  beforeEach(() => {
    // Create mock Linear client
    mockLinearClient = {
      issue: vi.fn(),
      issues: vi.fn(),
      updateIssue: vi.fn(),
      createComment: vi.fn(),
      issueComments: vi.fn()
    }

    // Create mock services
    mockSessionManager = {
      hasSession: vi.fn().mockReturnValue(false),
      getSession: vi.fn(),
      addSession: vi.fn(),
      updateSession: vi.fn(),
      removeSession: vi.fn()
    }

    mockClaudeService = {
      startSession: vi.fn(),
      sendComment: vi.fn()
    }

    mockWorkspaceService = {
      getWorkspaceForIssue: vi.fn(),
      createWorkspace: vi.fn()
    }

    // Create service instance
    linearIssueService = new LinearIssueService(
      mockLinearClient,
      'test-user-id',
      mockSessionManager,
      mockClaudeService,
      mockWorkspaceService
    )
  })

  describe('moveIssueToInProgress', () => {
    it('should successfully move an issue to the started state', async () => {
      // Mock the issue with a team
      const mockIssue = {
        id: 'issue-123',
        team: {
          states: vi.fn().mockResolvedValue({
            nodes: [
              { id: 'state-1', name: 'Backlog', type: 'backlog' },
              { id: 'state-2', name: 'In Progress', type: 'started' },
              { id: 'state-3', name: 'Done', type: 'completed' }
            ]
          })
        }
      }

      mockLinearClient.issue.mockResolvedValue(mockIssue)
      mockLinearClient.updateIssue.mockResolvedValue({ success: true })

      // Call the method
      await linearIssueService.moveIssueToInProgress('issue-123')

      // Verify the correct calls were made
      expect(mockLinearClient.issue).toHaveBeenCalledWith('issue-123')
      expect(mockIssue.team.states).toHaveBeenCalled()
      expect(mockLinearClient.updateIssue).toHaveBeenCalledWith('issue-123', {
        stateId: 'state-2'
      })
    })

    it('should throw an error if no started state is found', async () => {
      // Mock the issue with a team that has no started state
      const mockIssue = {
        id: 'issue-123',
        team: {
          states: vi.fn().mockResolvedValue({
            nodes: [
              { id: 'state-1', name: 'Backlog', type: 'backlog' },
              { id: 'state-3', name: 'Done', type: 'completed' }
            ]
          })
        }
      }

      mockLinearClient.issue.mockResolvedValue(mockIssue)

      // Call the method and expect it to throw
      await expect(linearIssueService.moveIssueToInProgress('issue-123'))
        .rejects.toThrow('Could not find a state with type "started" for this team')

      // Verify updateIssue was not called
      expect(mockLinearClient.updateIssue).not.toHaveBeenCalled()
    })

    it('should throw an error if issue cannot be fetched', async () => {
      mockLinearClient.issue.mockResolvedValue(null)

      await expect(linearIssueService.moveIssueToInProgress('issue-123'))
        .rejects.toThrow('Could not fetch issue or issue has no team')
    })

    it('should throw an error if issue has no team', async () => {
      const mockIssue = {
        id: 'issue-123',
        team: null
      }

      mockLinearClient.issue.mockResolvedValue(mockIssue)

      await expect(linearIssueService.moveIssueToInProgress('issue-123'))
        .rejects.toThrow('Could not fetch issue or issue has no team')
    })

    it('should propagate Linear API errors', async () => {
      const apiError = new Error('Linear API error')
      mockLinearClient.issue.mockRejectedValue(apiError)

      await expect(linearIssueService.moveIssueToInProgress('issue-123'))
        .rejects.toThrow('Linear API error')
    })

    it('should log debug info when DEBUG_LINEAR_API is true', async () => {
      // Enable debug mode
      process.env.DEBUG_LINEAR_API = 'true'
      
      // Spy on console.log
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation()

      // Mock the issue with a team
      const mockIssue = {
        id: 'issue-123',
        team: {
          states: vi.fn().mockResolvedValue({
            nodes: [
              { id: 'state-2', name: 'In Progress', type: 'started' }
            ]
          })
        }
      }

      mockLinearClient.issue.mockResolvedValue(mockIssue)
      mockLinearClient.updateIssue.mockResolvedValue({ success: true })

      // Call the method
      await linearIssueService.moveIssueToInProgress('issue-123')

      // Verify debug log was called
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successfully updated issue issue-123 to "In Progress" state (type: started)')
      )

      // Clean up
      consoleLogSpy.mockRestore()
      delete process.env.DEBUG_LINEAR_API
    })

    it('should pick the started state with lowest position when multiple exist', async () => {
      // Mock the issue with a team that has multiple started states
      const mockIssue = {
        id: 'issue-123',
        team: {
          states: vi.fn().mockResolvedValue({
            nodes: [
              { id: 'state-1', name: 'Backlog', type: 'backlog', position: 1 },
              { id: 'state-2', name: 'In Progress', type: 'started', position: 2 },
              { id: 'state-3', name: 'In Review', type: 'started', position: 3 },
              { id: 'state-4', name: 'Done', type: 'completed', position: 4 }
            ]
          })
        }
      }

      mockLinearClient.issue.mockResolvedValue(mockIssue)
      mockLinearClient.updateIssue.mockResolvedValue({ success: true })

      // Call the method
      await linearIssueService.moveIssueToInProgress('issue-123')

      // Verify the correct calls were made - should pick "In Progress" (position 2) over "In Review" (position 3)
      expect(mockLinearClient.issue).toHaveBeenCalledWith('issue-123')
      expect(mockIssue.team.states).toHaveBeenCalled()
      expect(mockLinearClient.updateIssue).toHaveBeenCalledWith('issue-123', {
        stateId: 'state-2'  // "In Progress" should be selected, not "In Review"
      })
    })
  })

  describe('handleAgentAssignment', () => {
    it('should move issue to in progress when assigned', async () => {
      const assignmentData = {
        issueId: 'issue-456',
        userId: 'test-user-id'
      }

      // Mock the fetchIssue method
      const mockIssue = {
        id: 'issue-456',
        identifier: 'TEST-456',
        assigneeId: 'test-user-id'
      }
      vi.spyOn(linearIssueService, 'fetchIssue').mockResolvedValue(mockIssue)
      
      // Mock moveIssueToInProgress
      vi.spyOn(linearIssueService, 'moveIssueToInProgress').mockResolvedValue()
      
      // Mock workspace service
      mockWorkspaceService.getWorkspaceForIssue.mockResolvedValue(null)
      mockWorkspaceService.createWorkspace.mockResolvedValue({ path: '/test/workspace' })
      
      // Mock Claude service
      mockClaudeService.startSession.mockResolvedValue({ issue: mockIssue })
      
      // Spy on console.log to verify output
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation()

      // Call handleAgentAssignment
      await linearIssueService.handleAgentAssignment(assignmentData)

      // Verify moveIssueToInProgress was called
      expect(linearIssueService.moveIssueToInProgress).toHaveBeenCalledWith('issue-456')
      
      // Verify the success log message
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Moved issue TEST-456 to "started" state')
      )

      // Clean up
      consoleLogSpy.mockRestore()
    })

    it('should continue processing even if state change fails', async () => {
      const assignmentData = {
        issueId: 'issue-789',
        userId: 'test-user-id'
      }

      // Mock the fetchIssue method
      const mockIssue = {
        id: 'issue-789',
        identifier: 'TEST-789',
        assigneeId: 'test-user-id'
      }
      vi.spyOn(linearIssueService, 'fetchIssue').mockResolvedValue(mockIssue)
      
      // Mock moveIssueToInProgress to throw an error
      vi.spyOn(linearIssueService, 'moveIssueToInProgress')
        .mockRejectedValue(new Error('State change failed'))
      
      // Mock workspace service
      mockWorkspaceService.getWorkspaceForIssue.mockResolvedValue(null)
      mockWorkspaceService.createWorkspace.mockResolvedValue({ path: '/test/workspace' })
      
      // Mock Claude service
      mockClaudeService.startSession.mockResolvedValue({ issue: mockIssue })
      
      // Spy on console.error to verify error message
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation()

      // Call handleAgentAssignment
      await linearIssueService.handleAgentAssignment(assignmentData)

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to move issue to "started" state: State change failed')
      )

      // Verify session was still created despite the error
      expect(mockSessionManager.addSession).toHaveBeenCalled()

      // Clean up
      consoleErrorSpy.mockRestore()
    })
  })
})