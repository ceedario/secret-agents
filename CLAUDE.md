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

## Common Patterns

### Service Dependencies
Services are injected via the container pattern in `src/container.mjs`. When adding new services:
1. Create the service class
2. Register it in the container
3. Use dependency injection in constructors

### Webhook Handling
Webhook events follow this flow:
1. Express server receives webhook
2. Signature verification
3. Event parsing and validation
4. Delegation to appropriate handler
5. Response posting back to Linear

### Session Management
Each Linear issue gets its own:
- Git worktree (if in a Git repo)
- Claude Code session
- Isolated workspace directory

## Notes for Future Development

- The project uses Linear's Agent API (Beta)
- OAuth flow is preferred over API tokens
- Webhook server runs even if Linear auth fails (for OAuth setup)
- The `--continue` flag maintains conversation context efficiently
- Consider rate limits when interacting with external APIs