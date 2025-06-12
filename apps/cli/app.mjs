#!/usr/bin/env node

import { EdgeWorker } from '@cyrus/edge-worker';
import dotenv from 'dotenv';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { createServer } from 'http';
import open from 'open';
import { basename, dirname, resolve } from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { URL } from 'url';

// Load environment variables
dotenv.config({ path: '.env.cyrus' });

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Edge application that uses EdgeWorker from package
 */
class EdgeApp {
  constructor() {
    this.edgeWorker = null;
    this.isShuttingDown = false;
    this.oauthServer = null;
  }

  /**
   * Load edge configuration (credentials and repositories)
   */
  loadEdgeConfig() {
    const edgeConfigPath = './.edge-config.json';
    if (existsSync(edgeConfigPath)) {
      try {
        return JSON.parse(readFileSync(edgeConfigPath, 'utf-8'));
      } catch (e) {
        console.error('Failed to load edge config:', e.message);
      }
    }

    // Check for repositories.json for backward compatibility
    const configPath = process.env.REPOSITORIES_CONFIG_PATH || './repositories.json';
    try {
      const configContent = readFileSync(resolve(configPath), 'utf-8');
      const config = JSON.parse(configContent);

      if (config.repositories && config.repositories.length > 0) {
        console.log(
          `Loaded ${config.repositories.length} repository configurations from ${configPath}`
        );
        return { repositories: config.repositories };
      }
    } catch (error) {
      // No config file found
    }

    return { repositories: [] };
  }

  /**
   * Save edge configuration
   */
  saveEdgeConfig(config) {
    writeFileSync('./.edge-config.json', JSON.stringify(config, null, 2));
  }

  /**
   * Interactive setup wizard for repository configuration
   */
  async setupRepositoryWizard(linearCredentials) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const question = (prompt) =>
      new Promise((resolve) => {
        rl.question(prompt, resolve);
      });

    console.log('\n📁 Repository Setup');
    console.log('─'.repeat(50));

    try {
      // Ask for repository details
      const repositoryPath =
        (await question(`Repository path (default: ${process.cwd()}): `)) || process.cwd();
      const repositoryName =
        (await question(`Repository name (default: ${basename(repositoryPath)}): `)) ||
        basename(repositoryPath);
      const baseBranch = (await question('Base branch (default: main): ')) || 'main';
      const workspaceBaseDir =
        (await question(`Workspace directory (default: ${repositoryPath}/workspaces): `)) ||
        `${repositoryPath}/workspaces`;
      const promptTemplatePath =
        (await question('Prompt template path (default: ./agent-prompt-template.md): ')) ||
        './agent-prompt-template.md';

      // Ask for allowed tools configuration
      console.log('\n🔧 Tool Configuration');
      console.log(
        'Available tools: Read,Write,Edit,MultiEdit,Glob,Grep,LS,Task,WebFetch,TodoRead,TodoWrite,NotebookRead,NotebookEdit,Batch'
      );
      console.log('');
      console.log('⚠️  SECURITY NOTE: Bash tool requires special configuration for safety:');
      console.log('   • Use "Bash" for full access (not recommended in production)');
      console.log('   • Use "Bash(npm:*)" to restrict to npm commands only');
      console.log('   • Use "Bash(git:*)" to restrict to git commands only');
      console.log('   • See: https://docs.anthropic.com/en/docs/claude-code/settings#permissions');
      console.log('');
      console.log('Default: All tools except Bash (leave blank for all non-Bash tools)');
      const allowedToolsInput = await question(
        'Allowed tools (comma-separated, default: all except Bash): '
      );
      const allowedTools = allowedToolsInput
        ? allowedToolsInput.split(',').map((t) => t.trim())
        : undefined;

      rl.close();

      // Create repository configuration
      const repository = {
        id: `${linearCredentials.linearWorkspaceId}-${Date.now()}`,
        name: repositoryName,
        repositoryPath: resolve(repositoryPath),
        baseBranch,
        linearWorkspaceId: linearCredentials.linearWorkspaceId,
        linearWorkspaceName: linearCredentials.linearWorkspaceName,
        linearToken: linearCredentials.linearToken,
        workspaceBaseDir: resolve(workspaceBaseDir),
        isActive: true,
        promptTemplatePath: resolve(promptTemplatePath),
        ...(allowedTools && { allowedTools }),
      };

      return repository;
    } catch (error) {
      rl.close();
      throw error;
    }
  }

  /**
   * Start OAuth server to handle callbacks
   */
  startOAuthServer(port) {
    if (this.oauthServer) return; // Already running

    this.oauthCallbacks = new Map(); // Store pending callbacks

    this.oauthServer = createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);

      if (url.pathname === '/callback') {
        const token = url.searchParams.get('token');
        const workspaceId = url.searchParams.get('workspaceId');
        const workspaceName = url.searchParams.get('workspaceName');

        if (token) {
          // Success! Return the Linear credentials (don't save yet)
          const linearCredentials = {
            linearToken: token,
            linearWorkspaceId: workspaceId,
            linearWorkspaceName: workspaceName,
          };

          // Send success response
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <title>Authorization Successful</title>
              </head>
              <body style="font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px;">
                <h1>✅ Authorization Successful!</h1>
                <p>You can close this window and return to the terminal.</p>
                <p>Your Linear workspace <strong>${workspaceName}</strong> has been connected.</p>
                <p style="margin-top: 30px;">
                  <a href="${this.oauthServer.proxyUrl || process.env.PROXY_URL}/oauth/authorize?callback=http://localhost:${port}/callback" 
                     style="padding: 10px 20px; background: #5E6AD2; color: white; text-decoration: none; border-radius: 5px;">
                    Connect Another Workspace
                  </a>
                </p>
                <script>setTimeout(() => window.close(), 10000)</script>
              </body>
            </html>
          `);

          // Emit event for any waiting promise
          if (this.oauthCallbacks.size > 0) {
            const callback = this.oauthCallbacks.values().next().value;
            if (callback) {
              callback.resolve(linearCredentials);
              this.oauthCallbacks.delete(callback.id);
            }
          }

          // Also emit event for edge app to handle
          if (this.onOAuthComplete) {
            this.onOAuthComplete(linearCredentials);
          }
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Error: No token received</h1>');

          // Reject any waiting promises
          for (const [id, callback] of this.oauthCallbacks) {
            callback.reject(new Error('No token received'));
            this.oauthCallbacks.delete(id);
          }
        }
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    this.oauthServer.listen(port, () => {
      console.log(`OAuth callback server listening on port ${port}`);
    });
  }

  /**
   * Start OAuth flow to get Linear token
   */
  async startOAuthFlow(proxyUrl) {
    const port = 3457; // Different from proxy port

    // Ensure OAuth server is running
    if (!this.oauthServer) {
      this.startOAuthServer(port);
    }

    return new Promise((resolve, reject) => {
      // Generate unique ID for this flow
      const flowId = Date.now().toString();

      // Store callback for this flow
      this.oauthCallbacks.set(flowId, { resolve, reject, id: flowId });

      // Construct OAuth URL with callback
      const authUrl = `${proxyUrl}/oauth/authorize?callback=http://localhost:${port}/callback`;

      console.log(`\n👉 Opening your browser to authorize with Linear...`);
      console.log(`If the browser doesn't open, visit: ${authUrl}`);

      open(authUrl).catch(() => {
        console.log(`\n⚠️  Could not open browser automatically`);
        console.log(`Please visit: ${authUrl}`);
      });

      console.log(`\n⏳ Waiting for authorization...`);

      // Timeout after 5 minutes
      setTimeout(
        () => {
          if (this.oauthCallbacks.has(flowId)) {
            this.oauthCallbacks.delete(flowId);
            reject(new Error('OAuth timeout'));
          }
        },
        5 * 60 * 1000
      );
    });
  }

  /**
   * Start the edge application
   */
  async start() {
    try {
      // Validate proxy URL
      const proxyUrl = process.env.PROXY_URL;
      if (!proxyUrl) {
        console.error('❌ PROXY_URL environment variable is required');
        console.log('\nPlease set PROXY_URL in your .env.cyrus file:');
        console.log('PROXY_URL=https://your-proxy-server.com');
        process.exit(1);
      }

      // Start OAuth server immediately for easy access
      const oauthPort = 3457;
      if (!this.oauthServer) {
        this.startOAuthServer(oauthPort);
        console.log(`\n🔐 OAuth server running on port ${oauthPort}`);
        console.log(`👉 To authorize Linear (new workspace or re-auth):`);
        console.log(
          `   ${proxyUrl}/oauth/authorize?callback=http://localhost:${oauthPort}/callback`
        );
        console.log('─'.repeat(70));
      }

      // Load edge configuration
      const edgeConfig = this.loadEdgeConfig();
      let repositories = edgeConfig.repositories || [];

      // Check if we need to set up
      const needsSetup = repositories.length === 0;
      const hasLinearCredentials =
        repositories.some((r) => r.linearToken) || process.env.LINEAR_OAUTH_TOKEN;

      if (needsSetup || process.argv.includes('--setup')) {
        console.log('🚀 Welcome to Cyrus Edge Worker!');

        // Check if they want to use existing credentials or add new workspace
        let linearCredentials;

        if (hasLinearCredentials && !process.argv.includes('--new-workspace')) {
          // Show available workspaces from existing repos
          const workspaces = new Map();
          for (const repo of edgeConfig.repositories || []) {
            if (!workspaces.has(repo.linearWorkspaceId)) {
              workspaces.set(repo.linearWorkspaceId, {
                id: repo.linearWorkspaceId,
                name: repo.linearWorkspaceName,
                token: repo.linearToken,
              });
            }
          }

          if (workspaces.size === 1) {
            // Only one workspace, use it
            const ws = Array.from(workspaces.values())[0];
            linearCredentials = {
              linearToken: ws.token,
              linearWorkspaceId: ws.id,
              linearWorkspaceName: ws.name,
            };
            console.log(`\n📋 Using Linear workspace: ${linearCredentials.linearWorkspaceName}`);
          } else if (workspaces.size > 1) {
            // Multiple workspaces, let user choose
            console.log('\n📋 Available Linear workspaces:');
            const workspaceList = Array.from(workspaces.values());
            workspaceList.forEach((ws, i) => {
              console.log(`${i + 1}. ${ws.name}`);
            });

            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout,
            });

            const choice = await new Promise((resolve) => {
              rl.question('\nSelect workspace (number) or press Enter for new: ', resolve);
            });
            rl.close();

            const index = parseInt(choice) - 1;
            if (index >= 0 && index < workspaceList.length) {
              const ws = workspaceList[index];
              linearCredentials = {
                linearToken: ws.token,
                linearWorkspaceId: ws.id,
                linearWorkspaceName: ws.name,
              };
              console.log(`Using workspace: ${linearCredentials.linearWorkspaceName}`);
            } else {
              // Get new credentials
              process.argv.push('--new-workspace');
            }
          } else if (process.env.LINEAR_OAUTH_TOKEN) {
            // Use env vars
            linearCredentials = {
              linearToken: process.env.LINEAR_OAUTH_TOKEN,
              linearWorkspaceId: process.env.LINEAR_WORKSPACE_ID,
              linearWorkspaceName: 'Your Workspace',
            };
          }

          if (linearCredentials) {
            console.log('(Run with --new-workspace to connect a different workspace)');
          }
        } else {
          // Get new Linear credentials
          console.log('\n📋 Step 1: Connect to Linear');
          console.log('─'.repeat(50));

          try {
            linearCredentials = await this.startOAuthFlow(proxyUrl);
            console.log('\n✅ Linear connected successfully!');
          } catch (error) {
            console.error('\n❌ OAuth flow failed:', error.message);
            console.log('\nAlternatively, you can:');
            console.log('1. Visit', `${proxyUrl}/oauth/authorize`, 'in your browser');
            console.log('2. Copy the token after authorization');
            console.log('3. Add it to your .env.cyrus file as LINEAR_OAUTH_TOKEN');
            process.exit(1);
          }
        }

        // Now set up repository
        console.log('\n📋 Step 2: Configure Repository');
        console.log('─'.repeat(50));

        try {
          const newRepo = await this.setupRepositoryWizard(linearCredentials);

          // Add to repositories
          repositories = [...(edgeConfig.repositories || []), newRepo];
          edgeConfig.repositories = repositories;
          this.saveEdgeConfig(edgeConfig);

          console.log('\n✅ Repository configured successfully!');

          // Ask if they want to add another
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          const addAnother = await new Promise((resolve) => {
            rl.question('\nAdd another repository? (y/N): ', (answer) => {
              rl.close();
              resolve(answer.toLowerCase() === 'y');
            });
          });

          if (addAnother) {
            // Restart with --setup flag
            process.argv.push('--setup');
            return this.start();
          }
        } catch (error) {
          console.error('\n❌ Repository setup failed:', error.message);
          process.exit(1);
        }
      }

      // Validate we have repositories
      if (repositories.length === 0) {
        console.error('❌ No repositories configured');
        console.log('\nRun with --setup flag to configure:');
        console.log('pnpm run edge -- --setup');
        process.exit(1);
      }

      // Create EdgeWorker configuration
      const config = {
        proxyUrl,
        repositories,
        claudePath: process.env.CLAUDE_PATH || 'claude',
        allowedTools: process.env.ALLOWED_TOOLS?.split(',').map((t) => t.trim()) || [],
        features: {
          enableContinuation: true,
        },
        handlers: {
          createWorkspace: async (issue, repository) => {
            return this.createGitWorktree(issue, repository);
          },
        },
      };

      // Create and start EdgeWorker
      this.edgeWorker = new EdgeWorker(config);

      // Set up event handlers
      this.setupEventHandlers();

      // Start the worker
      await this.edgeWorker.start();

      console.log('\n✅ Edge worker started successfully');
      console.log(`Connected to proxy: ${config.proxyUrl}`);
      console.log(`Managing ${repositories.length} repositories:`);
      repositories.forEach((repo) => {
        console.log(`  - ${repo.name} (${repo.repositoryPath})`);
      });

      // Handle graceful shutdown
      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());
    } catch (error) {
      console.error('Failed to start edge application:', error);
      await this.shutdown();
      process.exit(1);
    }
  }

  /**
   * Set up event handlers for EdgeWorker
   */
  setupEventHandlers() {
    // Issue processing events
    this.edgeWorker.on('issue:processing', ({ issueId, repositoryId }) => {
      console.log(`Processing issue ${issueId} for repository ${repositoryId}`);
    });

    this.edgeWorker.on('issue:completed', ({ issueId, repositoryId }) => {
      console.log(`✅ Issue ${issueId} completed for repository ${repositoryId}`);
    });

    this.edgeWorker.on('issue:failed', ({ issueId, repositoryId, error }) => {
      console.error(`❌ Issue ${issueId} failed for repository ${repositoryId}:`, error);
    });

    // Session events
    this.edgeWorker.on('session:created', ({ sessionId, repositoryId, issueId }) => {
      console.log(
        `Created session ${sessionId} for issue ${issueId} in repository ${repositoryId}`
      );
    });

    this.edgeWorker.on('session:completed', ({ sessionId, exitCode }) => {
      console.log(`Session ${sessionId} completed with exit code ${exitCode}`);
    });

    // Connection events
    this.edgeWorker.on('connection:established', ({ repositoryId }) => {
      console.log(`✅ Connection established for repository ${repositoryId}`);
    });

    this.edgeWorker.on('connection:lost', ({ repositoryId, error }) => {
      console.error(`❌ Connection lost for repository ${repositoryId}:`, error);
    });

    // Error events
    this.edgeWorker.on('error', (error) => {
      console.error('EdgeWorker error:', error);
    });
  }

  /**
   * Create a git worktree for an issue
   */
  async createGitWorktree(issue, repository) {
    const { execSync } = await import('child_process');
    const { existsSync } = await import('fs');
    const { join } = await import('path');

    try {
      // Verify this is a git repository
      try {
        execSync('git rev-parse --git-dir', {
          cwd: repository.repositoryPath,
          stdio: 'pipe',
        });
      } catch (e) {
        console.error(`${repository.repositoryPath} is not a git repository`);
        throw new Error('Not a git repository');
      }

      // Use Linear's preferred branch name, or generate one if not available
      const branchName =
        issue.branchName ||
        `${issue.identifier}-${issue.title?.toLowerCase().replace(/\s+/g, '-').substring(0, 30)}`;
      const workspacePath = join(repository.workspaceBaseDir, issue.identifier);

      // Ensure workspace directory exists
      execSync(`mkdir -p "${repository.workspaceBaseDir}"`, {
        cwd: repository.repositoryPath,
        stdio: 'pipe',
      });

      // Check if worktree already exists
      try {
        const worktrees = execSync('git worktree list --porcelain', {
          cwd: repository.repositoryPath,
          encoding: 'utf-8',
        });

        if (worktrees.includes(workspacePath)) {
          console.log(`Worktree already exists at ${workspacePath}, using existing`);
          return {
            path: workspacePath,
            isGitWorktree: true,
          };
        }
      } catch (e) {
        // git worktree command failed, continue with creation
      }

      // Check if branch already exists
      let createBranch = true;
      try {
        execSync(`git rev-parse --verify "${branchName}"`, {
          cwd: repository.repositoryPath,
          stdio: 'pipe',
        });
        createBranch = false;
      } catch (e) {
        // Branch doesn't exist, we'll create it
      }

      // Create the worktree
      console.log(`Creating git worktree at ${workspacePath} from ${repository.baseBranch}`);
      const worktreeCmd = createBranch
        ? `git worktree add "${workspacePath}" -b "${branchName}" "${repository.baseBranch}"`
        : `git worktree add "${workspacePath}" "${branchName}"`;

      execSync(worktreeCmd, {
        cwd: repository.repositoryPath,
        stdio: 'pipe',
      });

      // Check for secretagentsetup.sh script in the repository root
      const setupScriptPath = join(repository.repositoryPath, 'secretagentsetup.sh');
      if (existsSync(setupScriptPath)) {
        console.log('Running secretagentsetup.sh in new worktree...');
        try {
          execSync('bash secretagentsetup.sh', {
            cwd: workspacePath,
            stdio: 'inherit',
            env: {
              ...process.env,
              LINEAR_ISSUE_ID: issue.id,
              LINEAR_ISSUE_IDENTIFIER: issue.identifier,
              LINEAR_ISSUE_TITLE: issue.title,
            },
          });
        } catch (error) {
          console.warn('Warning: secretagentsetup.sh failed:', error.message);
          // Continue despite setup script failure
        }
      }

      return {
        path: workspacePath,
        isGitWorktree: true,
      };
    } catch (error) {
      console.error('Failed to create git worktree:', error.message);
      // Fall back to regular directory if git worktree fails
      const fallbackPath = join(repository.workspaceBaseDir, issue.identifier);
      execSync(`mkdir -p "${fallbackPath}"`, { stdio: 'pipe' });
      return {
        path: fallbackPath,
        isGitWorktree: false,
      };
    }
  }

  /**
   * Shut down the application
   */
  async shutdown() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    console.log('\nShutting down edge worker...');

    // Close OAuth server if running
    if (this.oauthServer) {
      this.oauthServer.close();
    }

    // Stop edge worker
    if (this.edgeWorker) {
      await this.edgeWorker.stop();
    }

    console.log('Shutdown complete');
    process.exit(0);
  }
}

// Create and start the app
const app = new EdgeApp();
app.start().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
