# Cyrus Issue Assignment Workflow Analysis

## Overview

This document maps out the complete end-to-end workflow that occurs when an issue is assigned to the Cyrus agent in Linear. This analysis covers the entire pipeline from webhook reception to Claude Code execution and response posting.

## Architecture Components

### 1. Proxy Infrastructure
- **Proxy Worker** (`apps/proxy-worker/`): Cloudflare Worker that handles OAuth and webhook routing
- **Edge Worker** (`packages/edge-worker/`): Core orchestration component running locally
- **NDJSON Client** (`packages/ndjson-client/`): Real-time communication bridge
- **Shared Application Server**: Local HTTP server for OAuth callbacks and webhook reception

### 2. Core Processing
- **Claude Runner** (`packages/claude-runner/`): Manages Claude SDK sessions
- **Session Manager** (`packages/core/`): Tracks active issue sessions
- **Linear SDK Integration**: Direct API communication with Linear

## Complete Workflow Breakdown

### 1. Issue Assignment Detection

**Trigger**: User assigns issue to Cyrus agent in Linear

**Flow**:
1. Linear sends webhook to proxy worker at `https://cyrus-proxy.ceedar.workers.dev/webhook`
2. Proxy validates webhook signature and routes to connected edge workers
3. Edge worker receives webhook via NDJSON stream
4. Webhook type detection in `EdgeWorker.handleWebhook()`:
   ```typescript
   if (isIssueAssignedWebhook(webhook)) {
     await this.handleIssueAssignedWebhook(webhook, repository)
   }
   ```

**Key Files**:
- `/packages/core/src/webhook-types.ts` - Webhook type definitions
- `/packages/edge-worker/src/EdgeWorker.ts:217` - Webhook handling dispatch
- `/packages/edge-worker/src/EdgeWorker.ts:238` - Issue assignment handler

### 2. Initial Processing & State Management

**Flow**:
1. **Repository Routing**: Find appropriate repository configuration
   - Team-based routing via `teamKeys` configuration
   - Workspace-based fallback matching
   - Code: `EdgeWorker.findRepositoryForWebhook()`

2. **Issue State Transition**: Automatically move to "started" state
   ```typescript
   // EdgeWorker.moveIssueToStartedState()
   await this.moveIssueToStartedState(fullIssue, repository.id)
   ```
   - Fetches team workflow states via Linear API
   - Finds state with `type === 'started'` and lowest position
   - Updates issue state to "In Progress" or equivalent

3. **Full Issue Data Fetch**: Get complete issue details from Linear API
   ```typescript
   const fullIssue = await this.fetchFullIssueDetails(issue.id, repository.id)
   ```

**Key Files**:
- `/packages/edge-worker/src/EdgeWorker.ts:958` - State transition logic
- `/packages/edge-worker/src/EdgeWorker.ts:283` - Repository routing
- `/packages/edge-worker/src/EdgeWorker.ts:729` - Issue data fetching

### 3. Comment Creation & Threading

**Flow**:
1. **Initial Comment**: Post immediate acknowledgment
   ```typescript
   const initialComment = await this.postInitialComment(fullIssue.id, repository.id)
   ```
   - Message: "I've been assigned to this issue and am getting started right away..."
   - Creates root comment thread for the agent

2. **Comment ID Tracking**: Store for future updates
   ```typescript
   this.issueToCommentId.set(fullIssue.id, initialComment.id)
   ```

3. **Threading Context**: Maintain reply chain for mentions
   ```typescript
   this.issueToReplyContext.set(issue.id, {
     commentId: comment.id,
     parentId: replyParentId
   })
   ```

**Key Files**:
- `/packages/edge-worker/src/EdgeWorker.ts:1018` - Initial comment creation
- `/packages/edge-worker/src/EdgeWorker.ts:1052` - General comment posting
- `/packages/edge-worker/src/EdgeWorker.ts:1095` - Comment updating with TODOs

### 4. Workspace & Environment Setup

**Flow**:
1. **Git Worktree Creation**: Create isolated workspace
   ```typescript
   const workspace = await this.config.handlers.createWorkspace(fullIssue, repository)
   ```
   - Creates `${workspaceBaseDir}/${issue.identifier}` directory
   - Sets up git worktree from base branch
   - Runs `cyrus-setup.sh` script if present

2. **Attachment Download**: Process Linear attachments
   ```typescript
   const attachmentResult = await this.downloadIssueAttachments(fullIssue, repository, workspace.path)
   ```
   - Downloads up to 10 attachments from issue description and comments
   - Stores in `~/.cyrus/<workspace>/attachments/`
   - Generates manifest for Claude to reference

**Key Files**:
- `/apps/cli/app.ts:514` - Git worktree creation logic
- `/packages/edge-worker/src/EdgeWorker.ts:1155` - Attachment download system

### 5. Claude Code Session Initialization

**Flow**:
1. **Claude Runner Setup**: Create runner with configuration
   ```typescript
   const runner = new ClaudeRunner({
     workingDirectory: workspace.path,
     allowedTools: repository.allowedTools || this.config.defaultAllowedTools,
     allowedDirectories: [attachmentsDir],
     workspaceName: fullIssue.identifier,
     mcpConfigPath: repository.mcpConfigPath,
     onMessage: (message) => this.handleClaudeMessage(...)
   })
   ```

2. **Session Management**: Track in session manager
   ```typescript
   const session = new Session({
     issue: this.convertLinearIssueToCore(fullIssue),
     workspace,
     startedAt: new Date()
   })
   this.sessionManager.addSession(fullIssue.id, session)
   ```

3. **Logging Setup**: Create JSONL logs in `~/.cyrus/logs/<workspace>/`

**Key Files**:
- `/packages/claude-runner/src/ClaudeRunner.ts:36` - Session start logic
- `/packages/core/src/Session.ts:45` - Session data model
- `/packages/claude-runner/src/ClaudeRunner.ts:247` - Logging setup

### 6. Prompt Generation & Execution

**Flow**:
1. **Prompt Template Loading**: Load from built-in template
   ```typescript
   const templatePath = resolve(__dirname, '../prompt-template.md')
   const template = await readFile(templatePath, 'utf-8')
   ```

2. **Context Injection**: Replace template variables
   - `{{repository_name}}` - Repository configuration name
   - `{{issue_id}}` - Linear issue ID
   - `{{issue_title}}` - Issue title
   - `{{issue_description}}` - Issue description
   - `{{issue_state}}` - Current Linear state name
   - `{{comment_history}}` - All issue comments with authors
   - `{{working_directory}}` - Workspace path
   - `{{base_branch}}` - Repository base branch
   - `{{branch_name}}` - Issue branch name

3. **Attachment Manifest**: Append attachment information
   ```typescript
   if (attachmentManifest) {
     const finalPrompt = prompt + '\n\n' + attachmentManifest
   }
   ```

4. **Claude SDK Execution**: Start query with generated prompt
   ```typescript
   for await (const message of query({
     prompt,
     options: {
       cwd: workingDirectory,
       allowedTools: processedAllowedTools,
       continue: continueSession,
       mcpServers
     }
   })) {
     // Process messages...
   }
   ```

**Key Files**:
- `/packages/edge-worker/src/EdgeWorker.ts:769` - Prompt building logic
- `/packages/edge-worker/prompt-template.md` - Prompt template
- `/packages/claude-runner/src/ClaudeRunner.ts:113` - Claude SDK execution

### 7. Response Processing & Updates

**Flow**:
1. **Message Stream Processing**: Handle Claude SDK messages
   ```typescript
   // EdgeWorker.handleClaudeMessage()
   if (message.type === 'assistant') {
     // Process assistant responses
   } else if (message.type === 'result') {
     // Handle final results and post to Linear
   }
   ```

2. **Tool Use Detection**: Special handling for TodoWrite
   ```typescript
   if (item.name === 'TodoWrite') {
     await this.updateCommentWithTodos(issueId, item.input.todos, repositoryId)
   }
   ```

3. **Comment Updates**: Real-time progress updates
   - Initial comment updated with TODO checklist
   - Final result posted as new comment or reply
   - Threading maintained via `issueToReplyContext` map

**Key Files**:
- `/packages/edge-worker/src/EdgeWorker.ts:619` - Message processing hub
- `/packages/edge-worker/src/EdgeWorker.ts:1095` - TODO comment updates
- `/packages/edge-worker/src/EdgeWorker.ts:1127` - Checklist formatting

### 8. Continuation Logic (--continue flag)

**Flow**:
1. **Comment Trigger**: New comment mentioning agent
   ```typescript
   if (isIssueNewCommentWebhook(webhook)) {
     if (await this.isAgentMentionedInComment(comment, repository)) {
       await this.handleNewComment(issue, comment, repository)
     }
   }
   ```

2. **Session Continuity**: Check for existing logs
   ```typescript
   const hasLogs = await this.hasExistingLogs(issue.identifier)
   if (hasLogs) {
     // Continue existing session
   } else {
     // Start fresh
   }
   ```

3. **Context Recovery**: Create new runner with continue flag
   ```typescript
   const runner = new ClaudeRunner({
     continueSession: true,
     // ... other config
   })
   await runner.start(comment.body || '')
   ```

**Key Files**:
- `/packages/edge-worker/src/EdgeWorker.ts:254` - Comment processing
- `/packages/edge-worker/src/EdgeWorker.ts:1394` - Agent mention detection
- `/packages/edge-worker/src/EdgeWorker.ts:516` - Continuation logic

## Environment Variables & Configuration

### Required Environment Variables
- `LINEAR_OAUTH_TOKEN` - Linear API access token
- `LINEAR_WORKSPACE_ID` - Linear workspace identifier
- `PROXY_URL` - Proxy worker URL (default: `https://cyrus-proxy.ceedar.workers.dev`)
- `CYRUS_BASE_URL` - External base URL for webhooks
- `CYRUS_SERVER_PORT` - Local server port (default: 3456)
- `CYRUS_HOST_EXTERNAL` - Set to 'true' to bind to 0.0.0.0

### Repository Configuration (`.edge-config.json`)
```json
{
  "repositories": [{
    "id": "unique-id",
    "name": "project-name",
    "repositoryPath": "/path/to/repo",
    "baseBranch": "main",
    "linearWorkspaceId": "workspace-id",
    "linearToken": "token",
    "workspaceBaseDir": "/path/to/workspaces",
    "allowedTools": ["Read(**)", "Edit(**)", "Bash(git:*)", "TodoWrite"],
    "mcpConfigPath": "./mcp-config.json",
    "teamKeys": ["CEA", "FRONT"] // Optional team filtering
  }]
}
```

## Data Flow Summary

1. **Linear** → **Proxy Worker** → **NDJSON Stream** → **Edge Worker**
2. **Edge Worker** → **State Update** → **Linear API**
3. **Edge Worker** → **Comment Creation** → **Linear API**
4. **Edge Worker** → **Workspace Setup** → **File System**
5. **Edge Worker** → **Prompt Generation** → **Claude SDK**
6. **Claude SDK** → **Message Stream** → **Edge Worker**
7. **Edge Worker** → **Response Processing** → **Linear API**

## Key Integration Points for Prompt Iteration

Based on this analysis, the prompt iteration in CEA-136 should focus on:

1. **Prompt Template** (`/packages/edge-worker/prompt-template.md`):
   - Current template uses two-situation approach (Execute vs Clarify)
   - Template variables provide comprehensive context
   - TodoWrite tool integration for progress tracking

2. **Context Building** (`EdgeWorker.buildInitialPrompt()`):
   - Issue metadata injection
   - Comment history inclusion
   - Attachment manifest generation
   - Repository-specific configuration

3. **Response Handling** (`EdgeWorker.handleClaudeMessage()`):
   - Real-time TODO updates via TodoWrite detection
   - Threading and reply context management
   - Final result posting to Linear

The workflow is well-architected with clear separation of concerns and comprehensive context passing to Claude. The prompt iteration work should focus on optimizing the template content and context formatting rather than changing the underlying workflow mechanics.