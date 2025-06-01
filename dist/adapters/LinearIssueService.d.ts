import { LinearClient } from '@linear/sdk';
import { IssueService } from '../services/IssueService.js';
import { Issue } from '../core/Issue.js';
import { LinearIssueType } from '../utils/schemas.js';
import { SessionManager } from '../services/SessionManager.js';
import { ClaudeService } from '../services/ClaudeService.js';
import { WorkspaceService } from '../services/WorkspaceService.js';
interface IssueData {
    id: string;
    identifier?: string;
    title?: string;
    state?: {
        name?: string;
        type?: string;
    } | string;
    assigneeId?: string | null;
    assignee?: {
        id?: string;
    };
    _assignee?: {
        id?: string;
    };
    user?: {
        id?: string;
        name?: string;
    };
    body?: string;
    issueId?: string;
}
interface AgentHandlerData {
    issueId: string;
    issue?: any;
    actor?: any;
    comment?: any;
    commentId?: string;
}
/**
 * Implementation of IssueService using the Linear API
 */
export declare class LinearIssueService extends IssueService {
    private linearClient;
    userId: string | null;
    username: string | null;
    private sessionManager;
    private claudeService;
    private workspaceService;
    private isAuthenticated;
    /**
     * @param linearClient - Linear API client
     * @param userId - ID of the agent user
     * @param sessionManager - Manager for active sessions
     * @param claudeService - Service for Claude AI operations
     * @param workspaceService - Service for workspace operations
     */
    constructor(linearClient: LinearClient, userId: string | null, sessionManager: SessionManager, claudeService: ClaudeService, workspaceService: WorkspaceService);
    /**
     * Convert Linear API issue to domain Issue
     * @param linearIssue - Linear API issue
     * @returns Domain Issue
     */
    _convertToDomainIssue(linearIssue: LinearIssueType): Issue;
    /**
     * @inheritdoc
     */
    fetchAssignedIssues(): Promise<Issue[]>;
    /**
     * Check if the service is authenticated with Linear
     * @returns Authentication status
     */
    getAuthStatus(): boolean;
    /**
     * @inheritdoc
     */
    fetchIssue(issueId: string): Promise<Issue>;
    /**
     * @inheritdoc
     */
    createComment(issueId: string, body: string): Promise<boolean>;
    /**
     * Initialize a session for an issue
     * @param issue - The issue to initialize
     * @param isStartupInit - Whether this is a system startup initialization
     */
    initializeIssueSession(issue: Issue, isStartupInit?: boolean): Promise<void>;
    /**
     * @inheritdoc
     */
    handleIssueCreateEvent(issueData: IssueData): Promise<void>;
    /**
     * @inheritdoc
     */
    handleIssueUpdateEvent(issueData: IssueData): Promise<void>;
    /**
     * @inheritdoc
     */
    handleCommentEvent(commentData: IssueData): Promise<void>;
    /**
     * @inheritdoc
     */
    handleAgentMention(data: AgentHandlerData): Promise<void>;
    /**
     * @inheritdoc
     */
    handleAgentAssignment(data: AgentHandlerData): Promise<void>;
    /**
     * @inheritdoc
     */
    handleAgentReply(data: AgentHandlerData): Promise<void>;
    /**
     * @inheritdoc
     */
    handleAgentUnassignment(data: AgentHandlerData): Promise<void>;
}
export {};
