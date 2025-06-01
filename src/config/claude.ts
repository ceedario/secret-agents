import os from 'os'
import path from 'path'

/**
 * Claude configuration
 */

interface ClaudeConfig {
  availableTools: string[]
  readOnlyTools: string[]
  getToolsArgs(allowedTools: string[] | null, workspacePath?: string | null): string[]
  getDefaultArgs(allowedTools?: string[], workspacePath?: string | null): string[]
  getContinueArgs(allowedTools?: string[], workspacePath?: string | null): string[]
}

const claudeConfig: ClaudeConfig = {
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
  getToolsArgs(allowedTools: string[] | null, workspacePath: string | null = null): string[] {
    // Convert array to flat CLI arguments format
    const toolArgs: string[] = []
    if (allowedTools && allowedTools.length > 0) {
      // If workspace path is provided and Read is in the allowed tools,
      // add the attachment directory path pattern to allow Claude to read downloaded attachments
      const modifiedTools = [...allowedTools]
      if (workspacePath && allowedTools.includes('Read')) {
        // Add Read with the attachment directory path pattern
        // This allows Claude to read attachments from ~/.linearsecretagent/<workspace>/attachments/*
        const homeDir = os.homedir()
        const workspaceName = path.basename(workspacePath)
        // Quote the entire tool specification to prevent shell interpretation
        const attachmentPathPattern = `'Read(${homeDir}/.linearsecretagent/${workspaceName}/attachments/*)'`
        modifiedTools.push(attachmentPathPattern)
      }
      
      toolArgs.push('--allowedTools')
      toolArgs.push(...modifiedTools)
    }
    return toolArgs
  },
  
  /**
   * Default arguments for Claude CLI
   */
  getDefaultArgs(allowedTools: string[] = [], workspacePath: string | null = null): string[] {
    return [
      '--print',
      '--verbose',
      '--output-format',
      'stream-json',
      ...this.getToolsArgs(allowedTools, workspacePath)
    ]
  },
  
  /**
   * Extended arguments for continuation mode
   */
  getContinueArgs(allowedTools: string[] = [], workspacePath: string | null = null): string[] {
    return [
      ...this.getDefaultArgs(allowedTools, workspacePath),
      '--continue'
    ]
  }
}

export default claudeConfig