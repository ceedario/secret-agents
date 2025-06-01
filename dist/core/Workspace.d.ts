import { Issue } from './Issue.js';
/**
 * Represents a workspace for an issue
 */
export declare class Workspace {
    issue: Issue;
    path: string;
    isGitWorktree: boolean;
    historyPath: string | null;
    constructor({ issue, path, isGitWorktree, historyPath, }: {
        issue: Issue;
        path: string;
        isGitWorktree?: boolean;
        historyPath?: string | null;
    });
    /**
     * Get the branch name for this workspace
     */
    getBranchName(): string;
    /**
     * Get the workspace name (derived from issue identifier)
     */
    getName(): string;
    /**
     * Get the path to the conversation history file
     */
    getHistoryFilePath(): string | null;
    /**
     * Get the path to the setup script if it exists
     */
    getSetupScriptPath(): string;
}
