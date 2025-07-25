# Cyrus Architecture Overview

This document provides a visual model of the Cyrus architecture and how it maps Claude Code sessions to Linear comment threads.

```
Linear Cloud                              Repository (Git)
     │                                          │
     │ [webhooks/OAuth]                         │
     │                                          │
     ▼                                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      apps/proxy                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Proxy Server                        │  │
│  │  • Handles Linear OAuth flow                          │  │
│  │  • Receives Linear webhooks                           │  │
│  │  • Forwards events to edge workers via webhooks       │  │
│  │  • Manages authentication & webhook verification       │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                               │
                               │ [webhooks via HTTP]
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    packages/edge-worker                      │
│                  (runs in CLI or standalone)                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    EdgeWorker                          │  │
│  │  • Registers webhook endpoint with proxy               │  │
│  │  • Receives Linear webhook events (via proxy)          │  │
│  │  • Creates git worktrees per issue                    │  │
│  │  • Launches Claude sessions                           │  │
│  │  • Manages session-to-comment-thread mapping          │  │
│  │  • Optional: ngrok tunnel for edge reachability¹       │  │
│  │                                                        │  │
│  │  Maps (Comment Thread Architecture):                   │  │
│  │  ────────────────────────────────────────             │  │
│  │  • claudeRunners: commentId → ClaudeRunner             │  │
│  │  • commentToRepo: commentId → repositoryId             │  │
│  │  • commentToIssue: commentId → issueId                 │  │
│  │  • commentToLatestAgentReply: commentId → commentId    │  │
│  │  • issueToCommentThreads: issueId → Set<commentId>     │  │
│  │  • issue.identifier → workspace path (git worktree)     │  │
│  │                                                        │  │
│  │  Linear Structure (ONLY 1 level of nesting):          │  │
│  │  ─────────────────────────────────────────            │  │
│  │  Issue                                                 │  │
│  │  ├── Comment (root) ← ClaudeRunner session 1          │  │
│  │  │   ├── Reply (no further nesting possible)          │  │
│  │  │   └── Reply (no further nesting possible)          │  │
│  │  └── Comment (root) ← ClaudeRunner session 2          │  │
│  │      └── Reply (no further nesting possible)          │  │
│  │                                                        │  │
│  │  IMPORTANT: Linear supports exactly ONE level of      │  │
│  │  comment nesting. Replies cannot have replies.        │  │
│  │  No recursion is needed or possible.                  │  │
│  │                                                        │  │
│  │  Contains:                                             │  │
│  │  • SessionManager (from packages/core)                 │  │
│  │  • Linear clients (one per repository)                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                               │
                               │ [manages]
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    packages/core                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  SessionManager                        │  │
│  │  • sessionsByCommentId: commentId → Session            │  │
│  │  • sessionsByIssueId: issueId → Session[]              │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                     Session                            │  │
│  │  • issue: CoreIssue                                    │  │
│  │  • workspace: Workspace                                │  │
│  │  • agentRootCommentId: string (comment thread root)    │  │
│  │  • claudeSessionId: string | null (for resume)         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                               │
                               │ [creates & runs]
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  packages/claude-runner                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   ClaudeRunner                         │  │
│  │  • Executes Claude CLI with proper context            │  │
│  │  • Streams messages back to EdgeWorker                 │  │
│  │  • Extracts session ID from Claude's first message     │  │
│  │  • Config: resumeSessionId for continuation            │  │
│  │  • Manages MCP servers (including Linear MCP)          │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                               │
                               │ [runs]
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Claude Code CLI                         │
│  • Actual Claude process with --resume capability           │
│  • Returns session_id in first message                      │
│  • Maintains conversation context per session               │
└─────────────────────────────────────────────────────────────┘

## Repository Configuration

```javascript
{
  id: string,              // Unique identifier
  linearWorkspaceId: string,
  linearApiKey: string,
  teamKeys?: string[],     // Filter by Linear teams
  workspaceBaseDir: string,// Where git worktrees go
  projectPath: string      // Main git repo path
}
```

## Key Flows

1. **Issue Assignment**: Linear webhook → Proxy → EdgeWorker (via webhook) → Create comment → Create session → ClaudeRunner
2. **User Comment**: Linear webhook → Proxy → EdgeWorker (via webhook) → Find/create session for thread → ClaudeRunner
3. **Multiple Sessions**: One issue can have multiple comment threads, each with its own Claude session
4. **Session Continuation**: Uses Claude's `--resume` with session ID extracted from first message

## Communication Architecture

- **Proxy ↔ EdgeWorker**: Webhook-based transport using HTTP POST
  - EdgeWorker registers its webhook endpoint with the proxy
  - Proxy forwards Linear events to registered EdgeWorkers
  - Webhook payloads are authenticated with HMAC signatures
- **EdgeWorker ↔ Linear**: Direct API calls using Linear SDK
- **EdgeWorker ↔ ClaudeRunner**: In-process communication (EventEmitter)

## Session Management

The system uses a comment-thread-based architecture where:
- Each Linear comment thread (root comment + replies) maps to one Claude Code session
- Multiple threads per issue are supported, allowing parallel Claude sessions
- Session IDs are extracted from Claude Code's first message rather than generated locally
- The `--resume` flag is used to continue existing Claude sessions with their extracted session IDs
- **Linear has exactly ONE level of comment nesting**: Comments can have replies, but replies cannot have further replies. This eliminates any need for recursive comment traversal.

## Notes

¹ **Edge Reachability**: The edge worker (CLI) can automatically set up an ngrok tunnel to make itself reachable by the proxy server. This is optional - you can alternatively configure your own networking by setting `CYRUS_HOST_EXTERNAL=true` and `CYRUS_BASE_URL` environment variables.