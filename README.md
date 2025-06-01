# Linear Claude Agent

<p align="center">
  <a href="https://ceedar.ai">
    <img src="https://img.shields.io/badge/Built%20by-Ceedar.ai-b8ec83?style=for-the-badge&logoColor=black&labelColor=333333" alt="Built by Ceedar.ai">
  </a>
  <a href="https://github.com/ceedario/secret-agents/actions">
    <img src="https://github.com/ceedario/secret-agents/actions/workflows/ci.yml/badge.svg" alt="CI">
  </a>
</p>

A JavaScript application that integrates Linear with Claude Code to automate issue processing. This agent uses Linear's Agent API to assist with software development tasks by providing AI-powered responses in Linear issues.

https://github.com/user-attachments/assets/730fdf2e-3875-4255-8124-9b2377b086fc

## Features

- Automatically processes Linear issues assigned to a specific user
- Creates separate Git worktrees for each issue
- Runs Claude in each worktree to handle issues
- Posts Claude's responses back to Linear as comments
- Listens for new comments via Linear's webhook API and forwards them to Claude
- Maintains isolated environments for each issue
- Cleans up worktrees on shutdown
- Supports Linear's Agent API (assignable to issues, mentionable in comments)
- OAuth authentication for secure API access
- Webhook signature verification

## How It Works

The Linear Claude Agent connects Linear's issue tracking with Anthropic's Claude Code using a layered architecture. Here's a breakdown of how the components interact:

```
┌─────────────────────────────────────┐
│            Linear Platform          │
└───────────────┬─────────────────────┘
                │
                │ Webhooks (Issue assignments,
                ▼ Comments, Mentions)
┌─────────────────────────────────────┐
│          Webhook Server             │◄─────────┐
│  (ExpressWebhookService)            │          │
└───────────────┬─────────────────────┘          │
                │                                 │
                │ Process                         │ Comments
                ▼ Events                          │ Back to Linear
┌─────────────────────────────────────┐          │
│       Linear Issue Service          ├──────────┘
│  (LinearIssueService)               │
└───────────────┬─────────────────────┘
                │
                │ Creates separate
                ▼ environment per issue
┌─────────────────────────────────────┐
│        Workspace Service            │
│  (FSWorkspaceService)               │
└───────────────┬─────────────────────┘
                │
                │ One worktree
                ▼ per issue
┌─────────────────────────────────────┐
│       Claude Service                │
│  (NodeClaudeService)                │
└───────────────┬─────────────────────┘
                │
                │ Claude CLI
                ▼ with --continue flag
┌─────────────────────────────────────┐
│       Claude Code CLI               │
│  (Running in issue workspace)       │
└─────────────────────────────────────┘
```

### Flow

1. When started, the agent fetches all issues assigned to the specified user
2. For each issue, it creates a workspace (a git worktree if in a git repo).
   - It checks if the workspace directory or branch already exists to allow persistence.
   - If a script named `secretagentsetup.sh` exists in the root of the repository, it is executed within the new worktree after creation/setup. This allows for project-specific initialization (e.g., installing dependencies).
3. It starts a Claude Code session within the workspace.
   - For new issues, a full prompt template is used with issue details injected
4. Initial responses from Claude are posted back to Linear as comments
5. When users comment on issues, the webhook receives the event
6. The comment is forwarded to the corresponding Claude session
   - Uses the `--continue` flag to maintain conversation history and context
   - No need to reload the full issue context for each comment
7. Claude's responses are posted back to Linear

### Conversation Continuity

The agent uses two different approaches for prompting Claude:

- **Initial Issue Assignment**: Loads the full prompt template with issue details, description, and existing comments
- **New Comments**: Uses the `--continue` flag which maintains the entire conversation thread and context, only passing the new comment text

This approach ensures continuous context while being efficient with token usage.

## Setup

1. Clone this repository
2. Create a `.env.secret-agents` file based on `.env.example`
3. Fill in your Linear API token, user ID, and webhook secret
4. Install dependencies with `pnpm install`
5. Optional: Install globally with `pnpm install -g .` (allows running `linear-claude-agent` from any directory)
6. Start the agent with `npm start` or `linear-claude-agent` if installed globally

## Environment Variables

By default, the agent looks for a `.env.secret-agents` file in the current directory. You can specify a different file using the `--env-file` option when running the agent.

### Required Variables

- `LINEAR_WEBHOOK_SECRET`: Secret for verifying webhook requests
- `WEBHOOK_PORT`: Port for the webhook server
- `CLAUDE_PATH`: Path to the Claude Code CLI executable
- `WORKSPACE_BASE_DIR`: Directory where issue workspaces will be created
- `PROMPT_TEMPLATE_PATH`: Path to the file containing the prompt template for Claude. This file should contain placeholders like `{{issue_details}}`, `{{linear_comments}}`, `{{branch_name}}`, and `{{new_input}}`. See [example prompt template](examples/prompt-template.txt).
- `GIT_MAIN_BRANCH`: The name of the main branch to pull from before creating worktrees (defaults to 'main' if not specified)
- `ANTHROPIC_API_KEY`: Your Anthropic API key (required unless you have Claude Max with authenticated CLI)

### Authentication Options (one required)

- `LINEAR_API_TOKEN`: Your Linear API token
- or OAuth credentials:
  - `LINEAR_OAUTH_CLIENT_ID`: Client ID for Linear OAuth
  - `LINEAR_OAUTH_CLIENT_SECRET`: Client secret for Linear OAuth
  - `LINEAR_OAUTH_REDIRECT_URI`: Redirect URI for OAuth flow
- or `LINEAR_PERSONAL_ACCESS_TOKEN`: Personal access token for Linear

### Tool Permissions (optional)

- `CLAUDE_ALLOWED_TOOLS`: Comma-separated list of Claude Code tools to allow (e.g., "Read,Glob,Grep,WebFetch"). 
  If not specified, defaults to read-only tools.
- `CLAUDE_READ_ONLY`: Set to "false" to allow all tools when `CLAUDE_ALLOWED_TOOLS` is not specified. Defaults to "true".

Available tools: https://docs.anthropic.com/en/docs/claude-code/security

### Debug Options (all optional)

- `DEBUG_WEBHOOKS`: Set to 'true' to enable detailed webhook event logging
- `DEBUG_SELF_WEBHOOKS`: Set to 'true' to log when agent ignores its own comments
- `DEBUG_LINEAR_API`: Set to 'true' to show detailed Linear API request/response logs
- `DEBUG_CLAUDE_RESPONSES`: Set to 'true' to log full Claude response content
- `DEBUG_COMMENT_CONTENT`: Set to 'true' to log full comment text when posting to Linear

## Linear Agent Setup

Follow the [official Linear Agent documentation](https://linear.app/developers/agents) to create your agent:

1. In your Linear workspace, go to Settings > Applications
2. Click "Create" to create a new application
3. Configure your application:
   - Name: Your agent's name
   - Description: Brief description of what your agent does
   - Icon: Choose an appropriate icon for your agent
   - Application Type: Select "Agent (Beta)"
   - Redirect URLs: Add your OAuth callback URL (e.g., `http://localhost:3000/oauth/callback`)

4. Once created, configure your OAuth settings:
   - Copy the Client ID and Client Secret for your `.env` file
   - The required scopes (`app:assignable` and `app:mentionable`) are automatically included with Agent applications

5. Set up webhooks:
   - Enable "Inbox notifications" for agent notifications
   - Set your webhook URL and secret

## Webhook Setup

When creating your application in the Linear dashboard, you'll also configure webhooks:

1. In the application settings, find the "Webhooks" section
2. Configure your webhook with the following settings:
   - URL: The public URL where your agent receives webhooks (e.g., `https://your-ngrok-url.ngrok.io/webhook`)
   - Select "Inbox notifications" to receive agent-specific notifications
   - Secret: Generate a secret and copy it to your `.env` file as `LINEAR_WEBHOOK_SECRET`

### Using ngrok for Development

**Important**: Linear webhooks require a public URL and cannot connect to localhost directly. For development, you can use [ngrok](https://ngrok.com/) to create a secure tunnel:

1. Install ngrok: `pnpm install -g ngrok` or download from [ngrok.com](https://ngrok.com/download)
2. Start your agent on your local port (e.g., port 3000)
3. In a separate terminal, start ngrok: `ngrok http 3000`
4. Copy the HTTPS URL provided by ngrok (e.g., `https://abc123.ngrok.io`)
5. Use this URL as your webhook URL in the Linear application settings

Example ngrok command:
```bash
# If your agent runs on port 3000
ngrok http 3000
```

See the [Linear Webhooks documentation](https://developers.linear.app/docs/webhooks/getting-started) for more details on webhooks.

## Running the Agent

There are several ways to run the agent:

1. **Standard Mode** (uses `.env.secret-agents` by default):
   ```
   npm start
   ```
   
   Or with a custom environment file:
   ```
   npm start -- --env-file .env.custom
   # or
   linear-claude-agent --env-file .env.custom
   ```

2. **Development Mode** (auto-restart on file changes):
   ```
   pnpm run dev
   ```

3. **OAuth Authorization** (first time setup):
   ```
   # Start an OAuth authorization server
   node scripts/start-auth-server.mjs
   # or with custom env file:
   node scripts/start-auth-server.mjs --env-file .env.custom
   
   # Start ngrok in another terminal
   ngrok http 3000
   
   # In your browser, visit (replace with your ngrok URL):
   # https://your-ngrok-url.ngrok.io/oauth/authorize
   ```

4. **OAuth Reset** (if you need to reauthorize):
   ```
   node scripts/reset-oauth.mjs
   # or with custom env file:
   node scripts/reset-oauth.mjs --env-file .env.custom
   
   # Then visit in your browser (replace with your ngrok URL):
   # https://your-ngrok-url.ngrok.io/oauth/reset
   ```

## Authentication Flow

1. The agent first tries to use OAuth if credentials are provided
2. If OAuth fails or is not set up, it falls back to the API token
3. As a last resort, it tries to use a personal access token if provided

### OAuth First-Time Setup

When you first start the agent, the webhook server will run even if authentication fails. This allows you to complete the OAuth flow:

1. Start the agent: `npm start`
2. If not authenticated, you'll see a message like:
   ```
   ⚠️ Linear agent failed to initialize, but webhook server is still running.
   👉 You can complete the OAuth flow by visiting:
   👉 http://localhost:3000/oauth/authorize
   ```
3. Visit the provided URL in your browser to authenticate
4. After successful authentication, the agent will use the new token automatically
5. You can also visit the dashboard at `http://localhost:3000/` to see your authentication status

## Development

1. **Scripts**:
   - `scripts/start-auth-server.mjs`: Start a standalone OAuth authorization server
   - `scripts/reset-oauth.mjs`: Reset OAuth tokens and force reauthorization

2. **Testing**:
   - Run tests with `npm test`
   - Test specific files with `npm test -- path/to/test.mjs`

## Troubleshooting

- Check the logs for error messages
- Enable debug flags for more verbose logging
- Ensure your Linear API token or OAuth credentials are correct
- Verify that the Claude executable path is correct
- Make sure your webhook URL is publicly accessible (Linear must be able to reach it)
- If using Claude CLI without Claude Max, ensure `ANTHROPIC_API_KEY` is set in your environment
- Check OAuth status by visiting `http://localhost:3000/oauth/status`
- If the agent is not receiving webhooks, verify your webhook secret and URL
- Ensure your Linear agent has the correct scopes (`app:assignable` and `app:mentionable`)
- For OAuth issues, try the reset endpoint: `http://localhost:3000/oauth/reset`

## Important Notes

### GitHub Actions

When Claude creates PRs using the `gh` CLI tool, it uses your local GitHub authentication. This means:

- All PRs and commits will be created under your GitHub account
- Comments and mentions in the PR will notify your account
- Review requests will be attributed to you
- Your repository permissions apply to all operations
- The only indication that Claude assisted is the "Co-Authored-By" commit trailer

Always review PR contents before allowing Claude to create them on your behalf.

## Documentation Resources

- [Linear Agents Documentation](https://linear.app/developers/agents)
- [Linear API Documentation](https://developers.linear.app/docs)
- [Linear OAuth Documentation](https://developers.linear.app/docs/oauth/authentication)
- [Linear Webhooks Documentation](https://developers.linear.app/docs/webhooks/getting-started)
- [Claude Code Documentation](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview)
- [Anthropic Claude API Documentation](https://docs.anthropic.com/claude/reference/)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

Developed by [Ceedar](https://ceedar.ai/)

Made possible by:
- [Linear API](https://linear.app/developers)
- [Anthropic Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview)

---

*This README was last updated: May 2025*

By default, all these options are disabled for minimal, focused logging. Enable specific flags only when debugging particular issues.
