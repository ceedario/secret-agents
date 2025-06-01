import os from 'os';
import path from 'path';
const claudeConfig = {
    /**
     * List of all available tools in Claude Code
     *
     * These can be individually allowed or denied through configuration
     */
    availableTools: [
        // File system tools
        'Read', 'Write', 'Edit', 'MultiEdit',
        'Glob', 'Grep', 'LS',
        // Execution tools
        'Bash', 'Task',
        // Web tools
        'WebFetch',
        // Task management
        'TodoRead', 'TodoWrite',
        // Notebook tools
        'NotebookRead', 'NotebookEdit',
        // Utility tools
        'Batch'
    ],
    /**
     * Default read-only tools that are safe to enable
     */
    readOnlyTools: [
        'Read', 'Glob', 'Grep', 'LS', 'WebFetch',
        'TodoRead', 'NotebookRead', 'Task', 'Batch'
    ],
    /**
     * Get the appropriate CLI arguments based on allowed tools
     */
    getToolsArgs(allowedTools, workspacePath = null) {
        // Convert array to flat CLI arguments format
        const toolArgs = [];
        if (allowedTools && allowedTools.length > 0) {
            // If workspace path is provided and Read is in the allowed tools,
            // add the attachment directory path pattern to allow Claude to read downloaded attachments
            const modifiedTools = [...allowedTools];
            if (workspacePath && allowedTools.includes('Read')) {
                // Add Read with the attachment directory path pattern
                // This allows Claude to read attachments from ~/.linearsecretagent/<workspace>/attachments/*
                const homeDir = os.homedir();
                const workspaceName = path.basename(workspacePath);
                // Quote the entire tool specification to prevent shell interpretation
                const attachmentPathPattern = `'Read(${homeDir}/.linearsecretagent/${workspaceName}/attachments/*)'`;
                modifiedTools.push(attachmentPathPattern);
            }
            toolArgs.push('--allowedTools');
            toolArgs.push(...modifiedTools);
        }
        return toolArgs;
    },
    /**
     * Default arguments for Claude CLI
     */
    getDefaultArgs(allowedTools = [], workspacePath = null) {
        return [
            '--print',
            '--verbose',
            '--output-format',
            'stream-json',
            ...this.getToolsArgs(allowedTools, workspacePath)
        ];
    },
    /**
     * Extended arguments for continuation mode
     */
    getContinueArgs(allowedTools = [], workspacePath = null) {
        return [
            ...this.getDefaultArgs(allowedTools, workspacePath),
            '--continue'
        ];
    }
};
export default claudeConfig;
