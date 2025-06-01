import { ChildProcess } from 'child_process';
import { ClaudeService } from '../services/ClaudeService.js';
import { Session } from '../core/Session.js';
import { FileSystem, ProcessManager, AttachmentDownloader } from '../utils/index.js';
import { Issue } from '../core/Issue.js';
import { Workspace } from '../core/Workspace.js';
import { IssueService } from '../services/IssueService.js';
interface ClaudeJsonResponse {
    type: string;
    message?: {
        content?: string | Array<{
            type: string;
            text?: string;
        }>;
        stop_reason?: string;
    };
    error?: {
        message?: string;
    } | string;
    result?: string;
    is_error?: boolean;
    subtype?: string;
    cost_usd?: number;
    duration_ms?: number;
}
type TokenLimitCallback = (issue: Issue, workspace: Workspace) => void;
/**
 * Implementation of ClaudeService using Node.js child_process
 */
export declare class NodeClaudeService extends ClaudeService {
    private claudePath;
    private promptTemplatePath;
    private issueService;
    private fileSystem;
    private processManager;
    private promptTemplate;
    private attachmentDownloader;
    /**
     * @param claudePath - Path to Claude executable
     * @param promptTemplatePath - Path to prompt template file
     * @param issueService - Service for issue operations (for posting comments)
     * @param fileSystem - File system utility
     * @param processManager - Process manager utility
     * @param attachmentDownloader - Attachment downloader utility
     */
    constructor(claudePath: string, promptTemplatePath: string, issueService: IssueService, fileSystem?: FileSystem, processManager?: ProcessManager, attachmentDownloader?: AttachmentDownloader | null);
    /**
     * Initialize the prompt template asynchronously
     * @private
     */
    _initPromptTemplate(): Promise<void>;
    /**
     * Load the prompt template from file
     * @param templatePath - Path to template file
     * @returns The loaded template
     */
    _loadPromptTemplate(templatePath: string): Promise<string>;
    /**
     * Escape XML special characters
     * @param unsafe - The string to escape
     * @returns The escaped string
     */
    _escapeXml(unsafe: string | undefined): string;
    /**
     * @inheritdoc
     */
    buildInitialPrompt(issue: Issue, tokenLimitResumeContext?: boolean, attachmentManifest?: string): Promise<string>;
    /**
     * Set up Claude process handlers
     * @param claudeProcess - The Claude process
     * @param issue - The issue
     * @param workspace - The workspace
     * @param historyPath - Path to history file
     * @param onTokenLimitError - Callback when token limit is reached
     * @returns The Claude process with handlers attached
     */
    _setupClaudeProcessHandlers(claudeProcess: ChildProcess, issue: Issue, workspace: Workspace, historyPath: string, onTokenLimitError?: TokenLimitCallback | null): ChildProcess;
    /**
     * Start a new session after token limit error
     * @param issue - The issue to work on
     * @param workspace - The workspace
     * @returns A promise that resolves with the session
     */
    startFreshSessionAfterTokenLimit(issue: Issue, workspace: Workspace): Promise<Session>;
    /**
     * @inheritdoc
     */
    startSession(issue: Issue, workspace: Workspace): Promise<Session>;
    /**
     * @inheritdoc
     */
    sendComment(session: Session, commentText: string): Promise<Session>;
    /**
     * Calculate total cost and post it to Linear
     * @param issue - The issue
     * @param historyPath - Path to history file
     * @param jsonResponse - The cost response from Claude
     * @private
     */
    _calculateAndPostCost(issue: Issue, historyPath: string, jsonResponse: ClaudeJsonResponse): Promise<void>;
    /**
     * Checks if the content has changed between first and final response
     * @param firstResponse - The first response content
     * @param finalResponse - The final response content
     * @returns True if content has changed, false otherwise
     * @private
     */
    _isContentChanged(firstResponse: string | undefined, finalResponse: string): boolean;
    /**
     * @inheritdoc
     */
    postResponseToLinear(issueId: string, response: string, costUsd?: number | null, durationMs?: number | null): Promise<boolean>;
}
export {};
