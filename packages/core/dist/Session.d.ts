import type { ChildProcess } from 'child_process';
export interface Issue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  getBranchName(): string;
}
export interface Workspace {
  path: string;
  isGitWorktree: boolean;
  historyPath?: string;
}
export interface SessionOptions {
  issue: Issue;
  workspace: Workspace;
  process?: ChildProcess | null;
  startedAt?: Date | string;
  exitCode?: number | null;
  exitedAt?: Date | string | null;
  stderrContent?: string;
  lastAssistantResponse?: string;
  lastCommentId?: string | null;
  conversationContext?: any;
  agentRootCommentId?: string | null;
  currentParentId?: string | null;
  streamingCommentId?: string | null;
  streamingSynthesis?: string | null;
  streamingNarrative?: NarrativeItem[];
}
export interface NarrativeItem {
  type: 'text' | 'tool_call';
  content?: string;
  tool?: string;
  timestamp: number;
}
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
  lastCommentId: string | null;
  conversationContext: any;
  agentRootCommentId: string | null;
  currentParentId: string | null;
  streamingCommentId: string | null;
  streamingSynthesis: string | null;
  streamingNarrative: NarrativeItem[];
  constructor({
    issue,
    workspace,
    process,
    startedAt,
    exitCode,
    exitedAt,
    stderrContent,
    lastAssistantResponse,
    lastCommentId,
    conversationContext,
    agentRootCommentId,
    currentParentId,
    streamingCommentId,
    streamingSynthesis,
    streamingNarrative,
  }: SessionOptions);
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
  /**
   * Add a tool call to the narrative
   */
  addToolCall(toolName: string): void;
  /**
   * Add a text snippet to the narrative
   */
  addTextSnippet(text: string): void;
  /**
   * Extract a short preview from text content
   */
  private extractTextPreview;
  /**
   * Update the streaming synthesis based on chronological narrative
   */
  updateStreamingSynthesis(): void;
  /**
   * Reset streaming state for a new run
   */
  resetStreamingState(): void;
}
//# sourceMappingURL=Session.d.ts.map
