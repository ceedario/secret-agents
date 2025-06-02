# Claude Code Assistant Guidelines

This document contains important information and conventions for Claude Code when working on the Linear Claude Agent project.

## Project Overview

Linear Claude Agent is a JavaScript application that integrates Linear's issue tracking with Anthropic's Claude Code to automate software development tasks. The agent:
- Monitors Linear issues assigned to a specific user
- Creates isolated Git worktrees for each issue
- Runs Claude Code sessions to process issues
- Posts responses back to Linear as comments
- Maintains conversation continuity using the `--continue` flag

## Architecture

The project follows a layered architecture with clear separation of concerns:

- **Core Domain**: `src/core/` - Business logic entities (Issue, Session, Workspace, Comment)
- **Services**: `src/services/` - Application services (SessionManager, IssueService, etc.)
- **Adapters**: `src/adapters/` - External integrations (Linear API, Claude CLI, Express webhooks)
- **Utils**: `src/utils/` - Shared utilities (FileSystem, ProcessManager, etc.)
- **Config**: `src/config/` - Configuration management

## Code Conventions

### JavaScript/ES Modules
- Use ES modules (`.mjs` files) exclusively
- Import with full file extensions: `import { foo } from './bar.mjs'`
- Prefer named exports over default exports
- Use JSDoc comments for functions and classes

### Code Style
- No semicolons (except where required by AST)
- Single quotes for strings
- 2-space indentation
- Descriptive variable and function names
- Keep functions small and focused

### Error Handling
- Always handle errors gracefully
- Log errors with appropriate context
- Use try-catch blocks for async operations
- Throw meaningful error messages

### Testing
- Write tests for new functionality
- Place tests in `__tests__/` directory
- Use Jest for testing framework
- Follow existing test patterns

## Important Files and Their Purpose

- `agent-prompt-template.md`: Template for Claude's initial prompts
- `.env.secret-agents`: Default environment configuration file
- `CHANGELOG.md`: Document all notable changes
- `package.json`: Project dependencies and scripts

## Development Workflow

### Working on Issues
1. Check current branch status: `git diff main...HEAD`
2. Check for existing PRs: `gh pr list --head <branch-name>`
3. Make changes following code conventions
4. Run tests: `pnpm test`
5. Update CHANGELOG.md with your changes
6. Commit with descriptive messages
7. Create PR with adequate description

### Pull Request Requirements

**IMPORTANT**: Every pull request MUST include an entry in `CHANGELOG.md` describing the changes made. This helps maintain a clear history of project evolution.

Format for CHANGELOG entries:
```markdown
### Added
- Description of new features

### Changed
- Description of modifications

### Fixed
- Description of bug fixes

### Removed
- Description of removed features
```

### Commit Messages
- Use conventional commit format when possible
- Be descriptive about what changed and why
- Reference Linear issue IDs where applicable

## Environment Variables

Key environment variables to be aware of:
- `LINEAR_WEBHOOK_SECRET`: Webhook verification
- `CLAUDE_PATH`: Path to Claude CLI
- `WORKSPACE_BASE_DIR`: Where issue workspaces are created
- `PROMPT_TEMPLATE_PATH`: Path to agent prompt template
- `DEBUG_*`: Various debug flags for troubleshooting

## Security Considerations

- Never commit secrets or API keys
- Always validate webhook signatures
- Use environment variables for sensitive data
- Follow OAuth best practices for authentication

## Testing Commands

- Run all tests: `pnpm test`
- Run specific test: `pnpm test -- path/to/test.mjs`
- Development mode: `pnpm run dev`

## Debugging

Enable debug flags in `.env.secret-agents` for detailed logging:
- `DEBUG_WEBHOOKS=true`: Webhook event details
- `DEBUG_LINEAR_API=true`: Linear API interactions
- `DEBUG_CLAUDE_RESPONSES=true`: Claude response content
- `DEBUG_COMMENT_CONTENT=true`: Comment posting details

## External APIs, CLI Tools, and Third-Party Integrations

The project integrates with multiple external services and tools. Understanding these is crucial for effective development:

### Primary Integrations

#### Linear API (via @linear/sdk)
- **Purpose**: Issue tracking, comment management, webhook events
- **Authentication**: OAuth 2.0 (preferred) or API tokens
- **Key Operations**: Fetch issues, create/update comments, handle webhooks
- **Rate Limits**: Respects Linear's API rate limits
- **Error Handling**: Graceful fallbacks for authentication failures

#### Claude Code CLI
- **Purpose**: AI-powered code generation and analysis
- **Execution**: Spawned as child process with shell commands
- **Communication**: JSON streaming via stdout/stderr
- **Configuration**: Tool permissions (read-only vs full access)
- **Token Management**: Automatic token limit detection and session restart

#### GitHub CLI (`gh`)
- **Purpose**: Pull request management, repository operations
- **Usage Pattern**: Used in agent prompt template for PR creation
- **Expected Commands**: `gh pr list`, `gh pr create`, repository checks
- **Prerequisites**: Must be authenticated and available in PATH

### File and Process Management

#### Node.js Built-ins
- **child_process**: Process spawning for CLI tools (Claude, git, bash scripts)
- **fs-extra**: Enhanced file system operations
- **crypto**: HMAC signature verification for webhooks
- **path**: Cross-platform path handling

#### Git Integration
- **Commands**: Worktree management, branch operations, status checks
- **Patterns**: Each issue gets isolated git worktree
- **Branch Strategy**: Automatic branch creation based on issue identifiers
- **Conflict Resolution**: Handles git errors gracefully

### HTTP and Network

#### Express.js Server
- **Purpose**: Webhook endpoint handling
- **Features**: Raw body parsing, signature verification, JSON validation
- **Security**: HMAC-SHA256 webhook signature verification
- **Middleware**: Custom raw body capture for signature validation

#### node-fetch
- **Purpose**: HTTP requests for attachment downloads
- **Authentication**: Bearer token headers for Linear uploads
- **Error Handling**: Graceful fallbacks for failed downloads
- **File Type Detection**: Uses `file-type` library for MIME detection

#### OAuth 2.0 Flow
- **Provider**: Linear's Agent API
- **Scopes**: `read,write,app:assignable,app:mentionable`
- **Security**: State parameter for CSRF protection
- **Storage**: File-based token persistence

### Development and Testing Tools

#### Vitest Testing Framework
- **Configuration**: Node environment, global test functions
- **Coverage**: V8 provider with text and LCOV reporting
- **Test Structure**: Unit tests in `__tests__/unit/`, integration in `__tests__/integration/`
- **Mocking**: Linear client mocks for isolated testing

#### Development Server
- **nodemon**: Auto-restart during development
- **Debug Flags**: Environment-based verbose logging
- **Hot Reload**: File watching for rapid iteration

### CLI Tools and System Dependencies

#### jq (JSON Processor)
- **Purpose**: Parse Claude CLI JSON streaming output
- **Usage**: Piped with Claude commands (`claude ... | jq -c .`)
- **Error Handling**: Spawn errors logged if jq not available
- **Installation**: Must be available in system PATH

#### Bash Scripts
- **Purpose**: Workspace setup and initialization
- **Execution**: Spawned in workspace directories
- **Error Handling**: Exit code and stderr capture
- **Security**: No shell injection vulnerabilities

### Environment Configuration

#### Required Environment Variables
```bash
# Linear Authentication (OAuth preferred)
LINEAR_OAUTH_CLIENT_ID=your_client_id
LINEAR_OAUTH_CLIENT_SECRET=your_client_secret
LINEAR_OAUTH_REDIRECT_URI=http://localhost:3000/callback
# OR alternatively
LINEAR_API_TOKEN=your_api_token
LINEAR_PERSONAL_ACCESS_TOKEN=your_personal_token

# Webhook Configuration
LINEAR_WEBHOOK_SECRET=your_webhook_secret
WEBHOOK_PORT=3000

# Claude Configuration
CLAUDE_PATH=/path/to/claude
PROMPT_TEMPLATE_PATH=/path/to/template.md
CLAUDE_ALLOWED_TOOLS=Read,Write,Bash,Glob,Grep # comma-separated
CLAUDE_READ_ONLY=true # or false for full tool access

# Workspace Configuration
WORKSPACE_BASE_DIR=/path/to/workspaces
GIT_MAIN_BRANCH=main # or master

# Debug Flags (optional)
DEBUG_WEBHOOKS=true
DEBUG_LINEAR_API=true
DEBUG_CLAUDE_RESPONSES=true
DEBUG_COMMENT_CONTENT=true
```

#### Claude Tool Configuration
- **Available Tools**: Read, Write, Edit, MultiEdit, Glob, Grep, LS, Bash, Task, WebFetch, TodoRead, TodoWrite, NotebookRead, NotebookEdit, Batch
- **Read-Only Mode**: Default configuration for safety
- **Custom Tools**: Can specify allowed tools via environment variables
- **Workspace Access**: Automatic attachment directory access patterns

### Common Integration Patterns

#### Service Dependencies
Services are injected via the container pattern in `src/container.mjs`. When adding new services:
1. Create the service class
2. Register it in the container
3. Use dependency injection in constructors

#### Webhook Handling
Webhook events follow this flow:
1. Express server receives webhook
2. Signature verification using HMAC-SHA256
3. Event parsing and validation with Zod schemas
4. Delegation to appropriate handler
5. Response posting back to Linear

#### Session Management
Each Linear issue gets its own:
- Git worktree (if in a Git repo)
- Claude Code session with streaming JSON output
- Isolated workspace directory
- Conversation history file for context preservation

#### Error Recovery
- **Token Limits**: Automatic session restart with context preservation
- **Network Failures**: Retry logic and graceful degradation
- **Process Crashes**: Process monitoring and restart capabilities
- **Authentication**: Automatic OAuth token refresh when needed

## Common Patterns and Best Practices

### Service Dependencies and Dependency Injection

The project uses a simple but effective dependency injection container pattern (`src/container.mjs`):

**Container Registration Pattern:**
```javascript
// Register services with factory functions
container.register('serviceName', (c) => {
  const dependency = c.get('dependencyName');
  return new ServiceClass(dependency);
});

// Get services (lazy instantiation)
const service = container.get('serviceName');
```

**Circular Dependency Resolution:**
Services avoid circular dependencies by using lazy function injection:
```javascript
// Instead of injecting service directly, inject a function
const serviceProxy = () => container.get('claudeService');
// Call serviceProxy() when needed instead of holding direct reference
```

### Error Handling Strategies

**Graceful Authentication Fallbacks:**
```javascript
// Multi-tier authentication with fallbacks
try {
  // Try OAuth first
  const token = await oauthHelper.getAccessToken();
  return { token, type: 'oauth' };
} catch (oauthError) {
  // Fall back to API key
  if (config.linear.apiToken) {
    return { token: config.linear.apiToken, type: 'apiKey' };
  }
  throw new Error('No authentication method available');
}
```

**Process Error Handling:**
- Always wrap `child_process.spawn()` calls in try-catch blocks
- Use process exit codes to determine success/failure
- Capture both stdout and stderr for debugging
- Implement timeouts for long-running processes
- Clean up processes on application shutdown

**API Error Recovery:**
- Reset client instances on authentication errors
- Implement exponential backoff for rate limits
- Provide meaningful error messages to users
- Log detailed errors only in debug mode

### Debugging and Logging Patterns

**Conditional Debug Logging:**
```javascript
// Standard logging (always shown)
console.log('Processing issue:', issueId);

// Debug logging (only when DEBUG_* flags are true)
if (process.env.DEBUG_LINEAR_API === 'true') {
  console.log('Full API response:', response);
}
```

**Debug Flags Usage:**
- `DEBUG_WEBHOOKS=true`: Webhook signature verification details
- `DEBUG_LINEAR_API=true`: Full API request/response logging
- `DEBUG_CLAUDE_RESPONSES=true`: Claude CLI output and parsing
- `DEBUG_COMMENT_CONTENT=true`: Comment content before posting

**Structured Error Messages:**
```javascript
// Bad: Generic error
throw new Error('Failed');

// Good: Contextual error with details
throw new Error(`Failed to process issue ${issueId}: ${originalError.message}`);
```

### Data Validation and Schema Patterns

**Zod Schema Validation:**
```javascript
import { LinearIssueSchema } from '../utils/schemas.mjs';

// Validate API responses
const validationResult = LinearIssueSchema.safeParse(apiData);
if (!validationResult.success) {
  console.warn('Data validation failed:', validationResult.error.format());
  // Continue with best-effort processing or fail gracefully
}
```

**Schema Organization:**
- Base schemas in `src/utils/schemas.mjs`
- Reusable components (UserSchema, TeamSchema, etc.)
- Webhook-specific schemas for different event types
- Optional vs required field handling with `.partial()`

### Testing Patterns

**Mock Service Setup:**
```javascript
beforeEach(() => {
  mockLinearClient = {
    issue: vi.fn(),
    issues: vi.fn(),
    updateIssue: vi.fn()
  };
  
  // Create service with mocks
  service = new LinearIssueService(mockLinearClient, 'user-id', ...);
});
```

**Test Organization:**
- Unit tests: `__tests__/unit/` - Test individual classes/functions
- Integration tests: `__tests__/integration/` - Test service interactions
- Mock external dependencies (Linear API, file system, processes)
- Use descriptive test names that explain the scenario

**Vitest Configuration:**
- Global test functions (describe, it, expect)
- Node environment for server-side testing
- V8 coverage provider for accurate code coverage
- LCOV and text coverage reports

### Git and Workspace Management

**Worktree Pattern:**
```javascript
// Each issue gets isolated workspace
const workspacePath = path.join(baseDir, issueIdentifier);
await processManager.spawn(['git', 'worktree', 'add', workspacePath, branchName]);

// Always clean up worktrees
await processManager.spawn(['git', 'worktree', 'remove', workspacePath]);
```

**Branch Naming Convention:**
- Format: `cea-${issueNumber}-${slugified-title}`
- Example: `cea-123-fix-authentication-bug`
- Automatically derived from Linear issue identifiers

### HTTP and Network Patterns

**Webhook Signature Verification:**
```javascript
// Always verify webhook signatures using HMAC-SHA256
const hmac = crypto.createHmac('sha256', webhookSecret);
hmac.update(req.rawBodyBuffer); // Use raw body, not parsed JSON
const computedSignature = hmac.digest('hex');
const isValid = (receivedSignature === computedSignature);
```

**File Download with Error Handling:**
```javascript
try {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  // Process successful response
} catch (error) {
  console.warn(`Failed to download ${filename}: ${error.message}`);
  // Continue processing without the attachment
}
```

### Process and CLI Integration

**Claude CLI Execution Pattern:**
```javascript
// Build command with proper escaping
const command = [
  claudePath,
  '--no-chat-history',
  '--model', 'claude-3-5-sonnet-20240620',
  '--no-desktop-output'
];

// Spawn process with proper handlers
const process = processManager.spawn(command, { 
  cwd: workspaceDir,
  stdio: ['pipe', 'pipe', 'pipe']
});

// Handle streaming output
process.stdout.on('data', (data) => {
  // Parse JSON streaming output
  // Update progress in real-time
});
```

**Tool Permission Management:**
```javascript
// Configure Claude tools based on environment
const allowedTools = env.claude.readOnlyMode 
  ? ['Read', 'LS', 'Glob', 'Grep'] 
  : ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'];
```

### Configuration Management

**Environment Variable Validation:**
```javascript
// Validate required vs optional environment variables
const requiredVars = ['LINEAR_WEBHOOK_SECRET', 'CLAUDE_PATH'];
const authOptions = {
  oauth: ['LINEAR_OAUTH_CLIENT_ID', 'LINEAR_OAUTH_CLIENT_SECRET'],
  apiKey: ['LINEAR_API_TOKEN']
};

// Check that at least one auth method is configured
if (!hasOAuth && !hasApiKey) {
  throw new Error('No authentication method configured');
}
```

### Performance and Reliability

**Streaming Updates with Throttling:**
```javascript
// Prevent overwhelming API with rapid updates
const THROTTLE_DELAY = 2000; // 2 seconds minimum between updates
let lastUpdateTime = 0;

const throttledUpdate = async (content) => {
  const now = Date.now();
  if (now - lastUpdateTime < THROTTLE_DELAY) {
    await new Promise(resolve => setTimeout(resolve, THROTTLE_DELAY));
  }
  await updateComment(content);
  lastUpdateTime = Date.now();
};
```

**Memory Management:**
- Clean up child processes on application exit
- Remove temporary files and worktrees
- Avoid holding large objects in memory longer than necessary
- Use streams for large file operations

## Linear API Documentation References

When working with Linear API issues, use WebFetch tool to access these documentation URLs:

### GraphQL API Documentation
- **Main GraphQL API Reference**: https://studio.apollographql.com/public/Linear-API/variant/current/home
- **GraphQL Schema Explorer**: https://studio.apollographql.com/public/Linear-API/variant/current/schema/reference
- **Available Query Types**: https://studio.apollographql.com/public/Linear-API/variant/current/schema/reference/objects/Query
- **Available Mutation Types**: https://studio.apollographql.com/public/Linear-API/variant/current/schema/reference/objects/Mutation

### Core Linear Objects and Fields
- **Issue Object Fields**: https://studio.apollographql.com/public/Linear-API/variant/current/schema/reference/objects/Issue
- **Comment Object Fields**: https://studio.apollographql.com/public/Linear-API/variant/current/schema/reference/objects/Comment
- **Team Object Fields**: https://studio.apollographql.com/public/Linear-API/variant/current/schema/reference/objects/Team
- **User Object Fields**: https://studio.apollographql.com/public/Linear-API/variant/current/schema/reference/objects/User
- **WorkflowState Fields**: https://studio.apollographql.com/public/Linear-API/variant/current/schema/reference/objects/WorkflowState

### Enums and Types
- **Issue State Types**: https://studio.apollographql.com/public/Linear-API/variant/current/schema/reference/enums/ProjectStatusType
- **Comment Types**: https://studio.apollographql.com/public/Linear-API/variant/current/schema/reference/enums/CommentType
- **Issue Priority Levels**: https://studio.apollographql.com/public/Linear-API/variant/current/schema/reference/enums/IssuePriorityValue

### Webhook Documentation
- **Webhook Events Guide**: https://developers.linear.app/docs/graphql/webhooks
- **Agent API Webhooks**: https://developers.linear.app/docs/agent-api
- **Webhook Signature Verification**: https://developers.linear.app/docs/graphql/webhooks#webhook-signature-verification

### Authentication and Authorization
- **OAuth 2.0 Flow**: https://developers.linear.app/docs/oauth
- **API Key Authentication**: https://developers.linear.app/docs/graphql/working-with-the-graphql-api#authentication
- **Agent API Scopes**: https://developers.linear.app/docs/agent-api#scopes

### SDK Documentation
- **@linear/sdk NPM Package**: https://www.npmjs.com/package/@linear/sdk
- **Linear SDK TypeScript Docs**: https://github.com/linear/linear/tree/master/packages/sdk

## External API and Tool Documentation References

### Node.js and JavaScript Libraries
- **Express.js Documentation**: https://expressjs.com/en/4x/api.html
- **Node.js child_process**: https://nodejs.org/api/child_process.html
- **fs-extra Documentation**: https://github.com/jprichardson/node-fs-extra
- **node-fetch Documentation**: https://github.com/node-fetch/node-fetch
- **Zod Schema Validation**: https://zod.dev/

### Testing Framework
- **Vitest Documentation**: https://vitest.dev/guide/
- **Vitest API Reference**: https://vitest.dev/api/
- **Vitest Configuration**: https://vitest.dev/config/

### Git and GitHub
- **GitHub CLI Documentation**: https://cli.github.com/manual/
- **Git Worktree Documentation**: https://git-scm.com/docs/git-worktree
- **GitHub API Documentation**: https://docs.github.com/en/rest

### OAuth 2.0 Specification
- **OAuth 2.0 RFC**: https://datatracker.ietf.org/doc/html/rfc6749
- **OAuth 2.0 Security Best Practices**: https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics

### Process and System Tools
- **jq Manual**: https://jqlang.github.io/jq/manual/
- **Bash Reference Manual**: https://www.gnu.org/software/bash/manual/bash.html

## Linear State Management

The agent automatically moves issues to the "started" state when assigned. Linear uses standardized state types:

- **State Types Reference**: https://studio.apollographql.com/public/Linear-API/variant/current/schema/reference/enums/ProjectStatusType
- **Standard Types**: `triage`, `backlog`, `unstarted`, `started`, `completed`, `canceled`
- **Issue Assignment Behavior**: When an issue is assigned to the agent, it automatically transitions to a state with `type === 'started'` (In Progress)

## Common Gotchas and Troubleshooting

### Authentication Issues
- **OAuth token expiration**: Client proxy automatically reinitializes on auth errors
- **API rate limits**: Implement exponential backoff and respect Linear's limits
- **Token validation**: Always test token validity with a simple API call after initialization

### Webhook Reliability
- **Signature verification**: Must use raw request body, not parsed JSON
- **Event deduplication**: Handle potential duplicate webhook deliveries
- **Processing order**: Events may arrive out of order, design accordingly

### Process Management
- **Zombie processes**: Always clean up spawned processes on application shutdown
- **Working directory**: Ensure correct cwd when spawning git/Claude commands
- **Path resolution**: Use absolute paths when possible to avoid confusion

### Git Integration
- **Worktree cleanup**: Failed operations may leave orphaned worktrees
- **Branch conflicts**: Handle cases where branch already exists
- **Repository state**: Check if directory is actually a git repository before git operations

## Development Workflow Best Practices

### Before Making Changes
1. **Check branch status**: `git diff main...HEAD` to understand current changes
2. **Run tests**: `pnpm test` to ensure baseline functionality
3. **Review recent commits**: Understand project evolution and patterns

### During Development
1. **Follow code conventions**: No semicolons, 2-space indentation, single quotes
2. **Add comprehensive error handling**: Every external API call should be wrapped
3. **Include debug logging**: Use conditional logging with DEBUG_* flags
4. **Write or update tests**: Maintain test coverage for new functionality

### Before Committing
1. **Update CHANGELOG.md**: Required for every PR, describes user-visible changes
2. **Run full test suite**: `pnpm test` and verify all tests pass
3. **Test edge cases**: Authentication failures, network issues, invalid data
4. **Verify debug output**: Test with DEBUG flags enabled

### Pull Request Requirements
- **CHANGELOG.md entry**: Mandatory for every PR
- **Descriptive commit messages**: Reference Linear issue IDs when applicable
- **Code review**: Focus on error handling, testing, and maintainability

## Notes for Future Development

- The project uses Linear's Agent API (Beta) - expect potential API changes
- OAuth flow is preferred over API tokens for better security and user experience
- Webhook server runs even if Linear auth fails (enables OAuth setup flow)
- The `--continue` flag maintains conversation context efficiently, use for long-running sessions
- Consider rate limits when interacting with external APIs - implement backoff strategies
- Process cleanup is critical - always handle application shutdown gracefully