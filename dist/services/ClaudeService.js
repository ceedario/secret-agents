/**
 * Interface for Claude AI operations
 */
export class ClaudeService {
    /**
     * Start a new Claude session for an issue
     * @param issue - The issue to process
     * @param workspace - The workspace for the issue
     * @returns The created session
     */
    async startSession(issue, workspace) {
        throw new Error('Not implemented');
    }
    /**
     * Send a comment to an existing Claude session
     * @param session - The existing session
     * @param commentText - The comment text to send
     * @returns The updated session
     */
    async sendComment(session, commentText) {
        throw new Error('Not implemented');
    }
    /**
     * Post a response from Claude to Linear
     * @param issueId - The issue ID
     * @param response - The response text
     * @param costUsd - Optional cost information
     * @param durationMs - Optional duration information
     * @returns Success status
     */
    async postResponseToLinear(issueId, response, costUsd = null, durationMs = null) {
        throw new Error('Not implemented');
    }
    /**
     * Build an initial prompt for Claude using the loaded template
     * @param issue - The issue to build the prompt for
     * @param tokenLimitResumeContext - Whether this is a resume after token limit
     * @returns The formatted prompt
     */
    async buildInitialPrompt(issue, tokenLimitResumeContext = false) {
        throw new Error('Not implemented');
    }
}
