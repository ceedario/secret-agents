import { Issue } from './Issue.js';
import { Workspace } from './Workspace.js';
import { ChildProcess } from 'child_process';
/**
 * Represents a Claude session for an issue
 */
export declare class Session {
    issue: Issue;
    workspace: Workspace;
    process: ChildProcess | null;
    startedAt: Date;
    exitCode: number | null;
    exitedAt: Date | null;
    stderrContent: string;
    lastAssistantResponse: string;
    constructor({ issue, workspace, process, startedAt, exitCode, exitedAt, stderrContent, lastAssistantResponse, }: {
        issue: Issue;
        workspace: Workspace;
        process?: ChildProcess | null;
        startedAt?: Date | string;
        exitCode?: number | null;
        exitedAt?: Date | string | null;
        stderrContent?: string;
        lastAssistantResponse?: string;
    });
    /**
     * Check if this session is currently active
     */
    isActive(): boolean;
    /**
     * Check if this session has exited successfully
     */
    hasExitedSuccessfully(): boolean;
    /**
     * Check if this session has exited with an error
     */
    hasExitedWithError(): boolean;
    /**
     * Format an error message for posting to Linear
     */
    formatErrorMessage(): string;
}
