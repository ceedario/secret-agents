/**
 * Represents a Claude session for an issue
 */
export class Session {
    issue;
    workspace;
    process;
    startedAt;
    exitCode;
    exitedAt;
    stderrContent;
    lastAssistantResponse;
    constructor({ issue, workspace, process = null, startedAt = new Date(), exitCode = null, exitedAt = null, stderrContent = '', lastAssistantResponse = '', }) {
        this.issue = issue;
        this.workspace = workspace;
        this.process = process;
        this.startedAt = startedAt instanceof Date ? startedAt : new Date(startedAt);
        this.exitCode = exitCode;
        this.exitedAt = exitedAt instanceof Date ? exitedAt : exitedAt ? new Date(exitedAt) : null;
        this.stderrContent = stderrContent;
        this.lastAssistantResponse = lastAssistantResponse;
    }
    /**
     * Check if this session is currently active
     */
    isActive() {
        return this.process !== null && !this.process.killed && this.exitCode === null;
    }
    /**
     * Check if this session has exited successfully
     */
    hasExitedSuccessfully() {
        return this.exitCode === 0;
    }
    /**
     * Check if this session has exited with an error
     */
    hasExitedWithError() {
        return this.exitCode !== null && this.exitCode !== 0;
    }
    /**
     * Format an error message for posting to Linear
     */
    formatErrorMessage() {
        let errorMessage = `Claude process for issue ${this.issue.identifier} exited unexpectedly with code ${this.exitCode}.`;
        if (this.stderrContent) {
            errorMessage += `\n\n**Error details (stderr):**\n\`\`\`\n${this.stderrContent.substring(0, 1500)} ${this.stderrContent.length > 1500 ? '... (truncated)' : ''}\n\`\`\``;
        }
        return errorMessage;
    }
}
