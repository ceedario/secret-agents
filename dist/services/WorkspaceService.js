/**
 * Interface for workspace-related operations
 */
export class WorkspaceService {
    /**
     * Set up the base workspace directory
     * @returns Path to base directory
     */
    async setupBaseDir() {
        throw new Error('Not implemented');
    }
    /**
     * Get the workspace for an issue
     * @param issue - The issue
     * @returns The workspace if it exists, or null
     */
    async getWorkspaceForIssue(issue) {
        throw new Error('Not implemented');
    }
    /**
     * Create a new workspace for an issue
     * @param issue - The issue
     * @returns The created workspace
     */
    async createWorkspace(issue) {
        throw new Error('Not implemented');
    }
    /**
     * Clean up a specific workspace
     * @param workspace - The workspace to clean up
     */
    async cleanupWorkspace(workspace) {
        throw new Error('Not implemented');
    }
    /**
     * Clean up all workspaces
     */
    async cleanupAllWorkspaces() {
        throw new Error('Not implemented');
    }
}
