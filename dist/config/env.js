/**
 * Configuration loaded from environment variables
 */
const envConfig = {
    linear: {
        apiToken: process.env.LINEAR_API_TOKEN,
        webhookSecret: process.env.LINEAR_WEBHOOK_SECRET,
        // OAuth configuration for Linear Agents API
        oauthClientId: process.env.LINEAR_OAUTH_CLIENT_ID,
        oauthClientSecret: process.env.LINEAR_OAUTH_CLIENT_SECRET,
        oauthRedirectUri: process.env.LINEAR_OAUTH_REDIRECT_URI,
        // Personal access token as an alternative to API token or OAuth
        personalAccessToken: process.env.LINEAR_PERSONAL_ACCESS_TOKEN,
    },
    webhook: {
        port: parseInt(process.env.WEBHOOK_PORT || '0', 10),
    },
    claude: {
        path: process.env.CLAUDE_PATH,
        promptTemplatePath: process.env.PROMPT_TEMPLATE_PATH,
        // Tool permissions - parse from comma-separated string or use defaults
        allowedTools: process.env.CLAUDE_ALLOWED_TOOLS ?
            process.env.CLAUDE_ALLOWED_TOOLS.split(',').map(tool => tool.trim()) :
            null, // null means use the default read-only tools
        // Whether to use strict read-only mode (when allowedTools is null)
        readOnlyMode: process.env.CLAUDE_READ_ONLY === 'true' || process.env.CLAUDE_READ_ONLY === undefined,
    },
    workspace: {
        baseDir: process.env.WORKSPACE_BASE_DIR,
        // Default main branch is 'main' if not specified
        mainBranch: process.env.GIT_MAIN_BRANCH || 'main',
    },
    // Debugging flags (all default to false if not explicitly set to 'true')
    debug: {
        webhooks: process.env.DEBUG_WEBHOOKS === 'true',
        selfWebhooks: process.env.DEBUG_SELF_WEBHOOKS === 'true',
        linearApi: process.env.DEBUG_LINEAR_API === 'true',
        claudeResponses: process.env.DEBUG_CLAUDE_RESPONSES === 'true',
        commentContent: process.env.DEBUG_COMMENT_CONTENT === 'true'
    },
    /**
     * Validate that all required environment variables are set
     */
    validate() {
        // Always required variables
        const requiredEnvVars = [
            'LINEAR_WEBHOOK_SECRET',
            'WEBHOOK_PORT',
            'CLAUDE_PATH',
            'WORKSPACE_BASE_DIR',
            'PROMPT_TEMPLATE_PATH'
        ];
        // OAuth or API token is required (one of them)
        const authRequirement = {
            api: 'LINEAR_API_TOKEN',
            oauth: ['LINEAR_OAUTH_CLIENT_ID', 'LINEAR_OAUTH_CLIENT_SECRET', 'LINEAR_OAUTH_REDIRECT_URI']
        };
        const missing = [];
        // Check required env vars
        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                missing.push(envVar);
            }
        }
        // Check authentication (API token or OAuth)
        let hasApiToken = false;
        let hasOAuth = true;
        if (process.env[authRequirement.api]) {
            hasApiToken = true;
        }
        for (const oauthVar of authRequirement.oauth) {
            if (!process.env[oauthVar]) {
                hasOAuth = false;
                break;
            }
        }
        // Check for personal access token
        let hasPersonalToken = false;
        if (process.env.LINEAR_PERSONAL_ACCESS_TOKEN) {
            hasPersonalToken = true;
        }
        // If none of the authentication methods are available, add them to missing
        if (!hasApiToken && !hasOAuth && !hasPersonalToken) {
            missing.push(`(${authRequirement.api} OR (${authRequirement.oauth.join(' AND ')}) OR LINEAR_PERSONAL_ACCESS_TOKEN)`);
        }
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
        return true;
    }
};
export default envConfig;
