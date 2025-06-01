import { Issue } from '../core/Issue.js';
/**
 * Interface for issue-related operations
 */
export declare class IssueService {
    userId: string | null;
    username: string | null;
    /**
     * Get the authentication status
     * @returns Authentication status
     */
    getAuthStatus(): boolean;
    /**
     * Fetch all issues assigned to the agent user
     * @returns List of assigned issues
     */
    fetchAssignedIssues(): Promise<Issue[]>;
    /**
     * Fetch a single issue by ID
     * @param issueId - The ID of the issue to fetch
     * @returns The requested issue
     */
    fetchIssue(issueId: string): Promise<Issue>;
    /**
     * Create a comment on an issue
     * @param issueId - The ID of the issue
     * @param body - The body of the comment
     * @returns Success status
     */
    createComment(issueId: string, body: string): Promise<boolean>;
    /**
     * Handle an issue creation event
     * @param issueData - Raw issue data from webhook
     */
    handleIssueCreateEvent(issueData: any): Promise<void>;
    /**
     * Handle an issue update event
     * @param issueData - Raw issue data from webhook
     */
    handleIssueUpdateEvent(issueData: any): Promise<void>;
    /**
     * Handle a comment event
     * @param commentData - Raw comment data from webhook
     */
    handleCommentEvent(commentData: any): Promise<void>;
    /**
     * Handle when the agent is mentioned in a comment (Agent API)
     * @param data - The mention notification data
     */
    handleAgentMention(data: any): Promise<void>;
    /**
     * Handle when the agent is assigned to an issue (Agent API)
     * @param data - The assignment notification data
     */
    handleAgentAssignment(data: any): Promise<void>;
    /**
     * Handle when someone replies to the agent's comment (Agent API)
     * @param data - The reply notification data
     */
    handleAgentReply(data: any): Promise<void>;
    /**
     * Handle when the agent is unassigned from an issue
     * @param data - The unassignment notification data
     */
    handleAgentUnassignment(data: any): Promise<void>;
}
