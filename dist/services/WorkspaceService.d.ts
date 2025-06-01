import { Issue } from '../core/Issue.js';
import { Workspace } from '../core/Workspace.js';
/**
 * Interface for workspace-related operations
 */
export declare class WorkspaceService {
    /**
     * Set up the base workspace directory
     * @returns Path to base directory
     */
    setupBaseDir(): Promise<string>;
    /**
     * Get the workspace for an issue
     * @param issue - The issue
     * @returns The workspace if it exists, or null
     */
    getWorkspaceForIssue(issue: Issue): Promise<Workspace | null>;
    /**
     * Create a new workspace for an issue
     * @param issue - The issue
     * @returns The created workspace
     */
    createWorkspace(issue: Issue): Promise<Workspace>;
    /**
     * Clean up a specific workspace
     * @param workspace - The workspace to clean up
     */
    cleanupWorkspace(workspace: Workspace): Promise<void>;
    /**
     * Clean up all workspaces
     */
    cleanupAllWorkspaces(): Promise<void>;
}
