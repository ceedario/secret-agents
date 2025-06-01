import { WorkspaceService } from '../services/WorkspaceService.js';
import { Workspace } from '../core/Workspace.js';
import { FileSystem, ProcessManager } from '../utils/index.js';
import { Issue } from '../core/Issue.js';
interface ScriptOutput {
    stdout: string;
    stderr: string;
}
/**
 * Implementation of WorkspaceService using the file system and git
 */
export declare class FSWorkspaceService extends WorkspaceService {
    private baseDir;
    private fileSystem;
    private processManager;
    private mainBranch;
    /**
     * @param baseDir - Base directory for workspaces
     * @param fileSystem - File system utility
     * @param processManager - Process manager utility
     * @param mainBranch - Main branch name
     */
    constructor(baseDir: string, fileSystem?: FileSystem, processManager?: ProcessManager, mainBranch?: string);
    /**
     * Helper to get repo root
     * @returns Promise<string|null> - Repo root path or null
     */
    _getRepoRoot(): Promise<string | null>;
    /**
     * Helper to execute setup script
     * @param workspacePath - Path to workspace
     * @param scriptPath - Path to script
     * @returns Promise<ScriptOutput> - Script output
     */
    _executeSetupScript(workspacePath: string, scriptPath: string): Promise<ScriptOutput>;
    /**
     * Run setup script if it exists
     * @param workspacePath - Path to workspace
     * @returns Promise<void>
     */
    _runSetupScriptIfNeeded(workspacePath: string): Promise<void>;
    /**
     * Verify branch and run setup
     * @param workspacePath - Path to workspace
     * @param expectedBranchName - Expected branch name
     * @returns Promise<void>
     */
    _verifyBranchAndRunSetup(workspacePath: string, expectedBranchName: string): Promise<void>;
    /**
     * Pull the latest changes from the main branch
     * @param mainBranch - The name of the main branch
     * @returns Promise<boolean> - Whether the pull was successful
     */
    _pullMainBranch(mainBranch: string): Promise<boolean>;
    /**
     * Create git worktree
     * @param workspacePath - Path to workspace
     * @param branchName - Branch name
     * @param mainBranch - The name of the main branch
     * @returns Promise<boolean> - Whether it's a git worktree
     */
    _createGitWorktree(workspacePath: string, branchName: string, mainBranch: string): Promise<boolean>;
    /**
     * Get the path to the conversation history file
     * @param workspacePath - Workspace path
     * @returns string - History file path
     */
    _getHistoryFilePath(workspacePath: string): string;
    /**
     * @inheritdoc
     */
    setupBaseDir(): Promise<string>;
    /**
     * @inheritdoc
     */
    getWorkspaceForIssue(issue: Issue): Promise<Workspace | null>;
    /**
     * @inheritdoc
     */
    createWorkspace(issue: Issue): Promise<Workspace>;
    /**
     * @inheritdoc
     */
    cleanupWorkspace(workspace: Workspace): Promise<void>;
    /**
     * @inheritdoc
     */
    cleanupAllWorkspaces(): Promise<void>;
}
export {};
