/**
 * Configuration loaded from environment variables
 */
interface LinearConfig {
    apiToken?: string;
    webhookSecret?: string;
    oauthClientId?: string;
    oauthClientSecret?: string;
    oauthRedirectUri?: string;
    personalAccessToken?: string;
}
interface WebhookConfig {
    port: number;
}
interface ClaudeEnvConfig {
    path?: string;
    promptTemplatePath?: string;
    allowedTools: string[] | null;
    readOnlyMode: boolean;
}
interface WorkspaceConfig {
    baseDir?: string;
    mainBranch: string;
}
interface DebugConfig {
    webhooks: boolean;
    selfWebhooks: boolean;
    linearApi: boolean;
    claudeResponses: boolean;
    commentContent: boolean;
}
interface EnvConfig {
    linear: LinearConfig;
    webhook: WebhookConfig;
    claude: ClaudeEnvConfig;
    workspace: WorkspaceConfig;
    debug: DebugConfig;
    validate(): boolean;
}
declare const envConfig: EnvConfig;
export default envConfig;
