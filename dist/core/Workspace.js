import path from 'path';
/**
 * Represents a workspace for an issue
 */
export class Workspace {
    issue;
    path;
    isGitWorktree;
    historyPath;
    constructor({ issue, path, isGitWorktree = false, historyPath = null, }) {
        this.issue = issue;
        this.path = path;
        this.isGitWorktree = isGitWorktree;
        this.historyPath = historyPath;
    }
    /**
     * Get the branch name for this workspace
     */
    getBranchName() {
        return this.issue.getBranchName();
    }
    /**
     * Get the workspace name (derived from issue identifier)
     */
    getName() {
        return this.issue.getBranchName();
    }
    /**
     * Get the path to the conversation history file
     */
    getHistoryFilePath() {
        return this.historyPath;
    }
    /**
     * Get the path to the setup script if it exists
     */
    getSetupScriptPath() {
        return path.join(this.path, 'secretagentsetup.sh');
    }
}
