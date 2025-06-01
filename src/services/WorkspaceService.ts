import { Issue } from '../core/Issue.js'
import { Workspace } from '../core/Workspace.js'

/**
 * Interface for workspace-related operations
 */
export class WorkspaceService {
  /**
   * Set up the base workspace directory
   * @returns Path to base directory
   */
  async setupBaseDir(): Promise<string> {
    throw new Error('Not implemented')
  }
  
  /**
   * Get the workspace for an issue
   * @param issue - The issue
   * @returns The workspace if it exists, or null
   */
  async getWorkspaceForIssue(issue: Issue): Promise<Workspace | null> {
    throw new Error('Not implemented')
  }
  
  /**
   * Create a new workspace for an issue
   * @param issue - The issue
   * @returns The created workspace
   */
  async createWorkspace(issue: Issue): Promise<Workspace> {
    throw new Error('Not implemented')
  }
  
  /**
   * Clean up a specific workspace
   * @param workspace - The workspace to clean up
   */
  async cleanupWorkspace(workspace: Workspace): Promise<void> {
    throw new Error('Not implemented')
  }
  
  /**
   * Clean up all workspaces
   */
  async cleanupAllWorkspaces(): Promise<void> {
    throw new Error('Not implemented')
  }
}