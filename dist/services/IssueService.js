/**
 * Interface for issue-related operations
 */
export class IssueService {
    userId = null;
    username = null;
    /**
     * Get the authentication status
     * @returns Authentication status
     */
    getAuthStatus() {
        throw new Error('Not implemented');
    }
    /**
     * Fetch all issues assigned to the agent user
     * @returns List of assigned issues
     */
    async fetchAssignedIssues() {
        throw new Error('Not implemented');
    }
    /**
     * Fetch a single issue by ID
     * @param issueId - The ID of the issue to fetch
     * @returns The requested issue
     */
    async fetchIssue(issueId) {
        throw new Error('Not implemented');
    }
    /**
     * Create a comment on an issue
     * @param issueId - The ID of the issue
     * @param body - The body of the comment
     * @returns Success status
     */
    async createComment(issueId, body) {
        throw new Error('Not implemented');
    }
    /**
     * Handle an issue creation event
     * @param issueData - Raw issue data from webhook
     */
    async handleIssueCreateEvent(issueData) {
        throw new Error('Not implemented');
    }
    /**
     * Handle an issue update event
     * @param issueData - Raw issue data from webhook
     */
    async handleIssueUpdateEvent(issueData) {
        throw new Error('Not implemented');
    }
    /**
     * Handle a comment event
     * @param commentData - Raw comment data from webhook
     */
    async handleCommentEvent(commentData) {
        throw new Error('Not implemented');
    }
    /**
     * Handle when the agent is mentioned in a comment (Agent API)
     * @param data - The mention notification data
     */
    async handleAgentMention(data) {
        throw new Error('Not implemented');
    }
    /**
     * Handle when the agent is assigned to an issue (Agent API)
     * @param data - The assignment notification data
     */
    async handleAgentAssignment(data) {
        throw new Error('Not implemented');
    }
    /**
     * Handle when someone replies to the agent's comment (Agent API)
     * @param data - The reply notification data
     */
    async handleAgentReply(data) {
        throw new Error('Not implemented');
    }
    /**
     * Handle when the agent is unassigned from an issue
     * @param data - The unassignment notification data
     */
    async handleAgentUnassignment(data) {
        throw new Error('Not implemented');
    }
}
