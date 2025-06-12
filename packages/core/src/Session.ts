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
export class Session {
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
    process = null,
    startedAt = new Date(),
    exitCode = null,
    exitedAt = null,
    stderrContent = '',
    lastAssistantResponse = '',
    lastCommentId = null,
    conversationContext = null,
    agentRootCommentId = null,
    currentParentId = null,
    streamingCommentId = null,
    streamingSynthesis = null,
    streamingNarrative = [],
  }: SessionOptions) {
    this.issue = issue;
    this.workspace = workspace;
    this.process = process;
    this.startedAt = startedAt instanceof Date ? startedAt : new Date(startedAt);
    this.exitCode = exitCode;
    this.exitedAt = exitedAt instanceof Date ? exitedAt : exitedAt ? new Date(exitedAt) : null;
    this.stderrContent = stderrContent;
    this.lastAssistantResponse = lastAssistantResponse;
    this.lastCommentId = lastCommentId;
    this.conversationContext = conversationContext;
    this.agentRootCommentId = agentRootCommentId;
    this.currentParentId = currentParentId;
    this.streamingCommentId = streamingCommentId;
    this.streamingSynthesis = streamingSynthesis;
    this.streamingNarrative = streamingNarrative;
  }

  /**
   * Check if this session is currently active
   */
  isActive(): boolean {
    return this.process !== null && !this.process.killed && this.exitCode === null;
  }

  /**
   * Check if this session has exited successfully
   */
  hasExitedSuccessfully(): boolean {
    return this.exitCode === 0;
  }

  /**
   * Check if this session has exited with an error
   */
  hasExitedWithError(): boolean {
    return this.exitCode !== null && this.exitCode !== 0;
  }

  /**
   * Format an error message for posting to Linear
   */
  formatErrorMessage(): string {
    let errorMessage = `Claude process for issue ${this.issue.identifier} exited unexpectedly with code ${this.exitCode}.`;

    if (this.stderrContent) {
      errorMessage += `\n\n**Error details (stderr):**\n\`\`\`\n${this.stderrContent.substring(
        0,
        1500
      )} ${this.stderrContent.length > 1500 ? '... (truncated)' : ''}\n\`\`\``;
    }

    return errorMessage;
  }

  /**
   * Add a tool call to the narrative
   */
  addToolCall(toolName: string): void {
    this.streamingNarrative.push({
      type: 'tool_call',
      tool: toolName,
      timestamp: Date.now(),
    });
    this.updateStreamingSynthesis();
  }

  /**
   * Add a text snippet to the narrative
   */
  addTextSnippet(text: string): void {
    this.streamingNarrative.push({
      type: 'text',
      content: text,
      timestamp: Date.now(),
    });

    this.updateStreamingSynthesis();
  }

  /**
   * Extract a short preview from text content
   */
  private extractTextPreview(text: string): string {
    if (!text || typeof text !== 'string') return '';

    // Remove extra whitespace and newlines
    const cleaned = text.replace(/\s+/g, ' ').trim();

    // Return first meaningful sentence or truncate at reasonable length
    const firstSentence = cleaned.match(/^[^.!?]*[.!?]/);
    if (firstSentence && firstSentence[0].length <= 100) {
      return firstSentence[0];
    }

    // Truncate to reasonable length
    return cleaned.length > 80 ? cleaned.substring(0, 77) + '...' : cleaned;
  }

  /**
   * Update the streaming synthesis based on chronological narrative
   */
  updateStreamingSynthesis(): void {
    const entries: string[] = [];

    // Process all narrative items chronologically
    let i = 0;
    while (i < this.streamingNarrative.length) {
      const item = this.streamingNarrative[i];
      if (!item) {
        i++;
        continue;
      }

      if (item.type === 'text' && item.content) {
        // Extract preview and add as entry
        const preview = this.extractTextPreview(item.content);
        if (preview) {
          entries.push(preview);
        }
        i++;
      } else if (item.type === 'tool_call') {
        // Collect all consecutive tool calls
        const consecutiveTools: string[] = [];
        let j = i;

        while (j < this.streamingNarrative.length) {
          const narrativeItem = this.streamingNarrative[j];
          if (!narrativeItem || narrativeItem.type !== 'tool_call') {
            break;
          }
          const toolName = narrativeItem.tool;
          if (toolName && !consecutiveTools.includes(toolName)) {
            consecutiveTools.push(toolName);
          }
          j++;
        }

        // Add grouped tool call summary
        const toolCount = consecutiveTools.length;
        const toolList = consecutiveTools.join(', ');
        entries.push(`${toolCount} tool call${toolCount > 1 ? 's' : ''}: ${toolList}`);

        // Move index to the next non-tool-call item
        i = j;
      } else {
        i++;
      }
    }

    // Build chronological synthesis showing all entries
    const synthesis = ['Getting to work...'];

    // Add all entries (don't truncate to show complete chronology)
    for (const entry of entries) {
      synthesis.push(entry);
    }

    this.streamingSynthesis = synthesis.join('\n\n');
  }

  /**
   * Reset streaming state for a new run
   */
  resetStreamingState(): void {
    this.streamingNarrative = [];
    this.streamingSynthesis = 'Getting to work...';
  }
}
