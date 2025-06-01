/**
 * Claude configuration
 */
interface ClaudeConfig {
    availableTools: string[];
    readOnlyTools: string[];
    getToolsArgs(allowedTools: string[] | null, workspacePath?: string | null): string[];
    getDefaultArgs(allowedTools?: string[], workspacePath?: string | null): string[];
    getContinueArgs(allowedTools?: string[], workspacePath?: string | null): string[];
}
declare const claudeConfig: ClaudeConfig;
export default claudeConfig;
