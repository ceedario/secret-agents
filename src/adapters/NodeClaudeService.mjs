import { ClaudeService } from '../services/ClaudeService.mjs';
import { Session } from '../core/Session.mjs';
import { claudeConfig, env } from '../config/index.mjs';
import { FileSystem, ProcessManager } from '../utils/index.mjs';

/**
 * Implementation of ClaudeService using Node.js child_process
 */
export class NodeClaudeService extends ClaudeService {
  /**
   * @param {string} claudePath - Path to Claude executable
   * @param {string} promptTemplatePath - Path to prompt template file
   * @param {IssueService} issueService - Service for issue operations (for posting comments)
   * @param {FileSystem} fileSystem - File system utility
   * @param {ProcessManager} processManager - Process manager utility
   */
  constructor(
    claudePath, 
    promptTemplatePath, 
    issueService, 
    fileSystem = new FileSystem(), 
    processManager = new ProcessManager()
  ) {
    super();
    this.claudePath = claudePath;
    this.issueService = issueService;
    this.fileSystem = fileSystem;
    this.processManager = processManager;
    this.promptTemplatePath = promptTemplatePath;
    this.promptTemplate = null;
    
    // Initialize the promptTemplate asynchronously
    this._initPromptTemplate();
  }
  
  /**
   * Initialize the prompt template asynchronously
   * @private
   */
  async _initPromptTemplate() {
    try {
      this.promptTemplate = await this._loadPromptTemplate(this.promptTemplatePath);
      console.log('Prompt template loaded successfully');
    } catch (error) {
      console.error('Failed to initialize prompt template:', error);
    }
  }
  
  /**
   * Load the prompt template from file
   * @param {string} templatePath - Path to template file
   * @returns {Promise<string>} - The loaded template
   */
  async _loadPromptTemplate(templatePath) {
    try {
      if (!templatePath) {
        throw new Error('Prompt template path is not set.');
      }
      
      if (!this.fileSystem.existsSync(templatePath)) {
        throw new Error(`Prompt template file not found at: ${templatePath}`);
      }
      
      const template = await this.fileSystem.readFile(templatePath, 'utf-8');
      console.log(`Successfully loaded prompt template from: ${templatePath}`);
      return template;
    } catch (error) {
      console.error(`Error loading prompt template: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Escape XML special characters
   * @param {string} unsafe - The string to escape
   * @returns {string} - The escaped string
   */
  _escapeXml(unsafe) {
    return unsafe
      ? unsafe
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;')
      : '';
  }
  
  /**
   * @inheritdoc
   */
  async buildInitialPrompt(issue) {
    // Ensure prompt template is loaded
    if (!this.promptTemplate) {
      console.log('Prompt template not loaded yet, loading now...');
      this.promptTemplate = await this._loadPromptTemplate(this.promptTemplatePath);
    }

    const issueDetails = issue.toXml();
    const linearComments = issue.formatComments();
    const branchName = issue.getBranchName();
    
    // Inject variables into the template
    let finalPrompt = this.promptTemplate;
    
    // Verify that the template is a string
    if (typeof finalPrompt !== 'string') {
      console.error('Prompt template is not a string:', typeof finalPrompt);
      throw new Error('Prompt template is not a string. Cannot build initial prompt.');
    }
    
    finalPrompt = finalPrompt.replace('{{issue_details}}', issueDetails);
    finalPrompt = finalPrompt.replace('{{linear_comments}}', linearComments);
    finalPrompt = finalPrompt.replace('{{branch_name}}', branchName);
    
    // Remove placeholders for sections not used in the initial prompt
    finalPrompt = finalPrompt.replace('{{process_history}}', '');
    finalPrompt = finalPrompt.replace('{{new_input}}', '');
    
    return finalPrompt;
  }
  
  /**
   * Set up Claude process handlers
   * @param {ChildProcess} claudeProcess - The Claude process
   * @param {Issue} issue - The issue
   * @param {string} historyPath - Path to history file
   * @returns {ChildProcess} - The Claude process with handlers attached
   */
  _setupClaudeProcessHandlers(claudeProcess, issue, historyPath) {
    // Set up buffers to capture output
    let stderr = '';
    let lastAssistantResponseText = '';
    let firstResponsePosted = false;
    let lineBuffer = '';
    
    console.log(
      `=== Setting up JSON stream handlers for Claude process ${claudeProcess.pid} ===`
    );
    
    claudeProcess.stdout.on('data', async (data) => {
      lineBuffer += data.toString();
      let lines = lineBuffer.split('\n');
      
      // Process all complete lines except the last
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        try {
          const jsonResponse = JSON.parse(line);
          
          // Append to history
          try {
            await this.fileSystem.appendFile(historyPath, line + '\n');
          } catch (err) {
            console.error(
              `Failed to update conversation history (${historyPath}): ${err.message}`
            );
          }
          
          // Process the jsonResponse
          if (jsonResponse.role === 'assistant' && jsonResponse.content) {
            let currentResponseText = '';
            
            if (Array.isArray(jsonResponse.content)) {
              for (const content of jsonResponse.content) {
                if (content.type === 'text') {
                  currentResponseText += content.text;
                }
              }
            } else if (typeof jsonResponse.content === 'string') {
              currentResponseText = jsonResponse.content;
            }
            
            if (currentResponseText.trim().length > 0) {
              lastAssistantResponseText = currentResponseText;
              
              // Post the first complete response immediately
              if (!firstResponsePosted) {
                console.log(`[CLAUDE JSON - ${issue.identifier}] Posting first response to Linear.`);
                this.postResponseToLinear(issue.id, lastAssistantResponseText);
                firstResponsePosted = true;
              }
            }
          }
          
          // Post the final accumulated response when the turn ends
          if (jsonResponse.stop_reason === 'end_turn') {
            // Post the final response if there's content to post
            if (lastAssistantResponseText.trim().length > 0) {
              // Always post the final response when we reach end_turn
              console.log(
                `[CLAUDE JSON - ${issue.identifier}] Detected stop_reason: end_turn. Posting final response.`
              );
              this.postResponseToLinear(issue.id, lastAssistantResponseText);
              lastAssistantResponseText = '';
            } else {
              console.log(
                `[CLAUDE JSON - ${issue.identifier}] Detected stop_reason: end_turn, but no content to post.`
              );
            }
          }
          
          // If this is the final cost message, log it concisely
          if (jsonResponse.role === 'system' && jsonResponse.cost_usd) {
            // Only log the essential info - cost and duration
            console.log(
              `Claude response for ${issue.identifier} - Cost: $${jsonResponse.cost_usd.toFixed(2)}, Duration: ${(jsonResponse.duration_ms / 1000).toFixed(1)}s`
            );
            
            // Use a separate helper method to calculate the cost asynchronously
            // Temporarily disabled cost posting
            // this._calculateAndPostCost(issue, historyPath, jsonResponse);
          }
        } catch (err) {
          console.error(
            `[CLAUDE JSON - ${issue.identifier}] Error parsing JSON line: ${err.message}`
          );
          console.error(
            `[CLAUDE JSON - ${issue.identifier}] Offending line: ${line}`
          );
        }
      }
      
      // Keep the last line in the buffer
      lineBuffer = lines[lines.length - 1];
    });
    
    // Handle end of stream
    claudeProcess.stdout.on('end', async () => {
      const line = lineBuffer.trim();
      
      if (line) {
        try {
          // The final line might contain multiple JSON objects
          // Split by newlines and try to parse each one
          const parts = line.split(/\r?\n/);
          
          for (const part of parts) {
            if (!part.trim()) continue;
            
            try {
              const jsonResponse = JSON.parse(part);
              
              try {
                await this.fileSystem.appendFile(historyPath, part + '\n');
              } catch (err) {
                console.error(
                  `Failed to update conversation history (${historyPath}) on end: ${err.message}`
                );
              }
              
              if (jsonResponse.role === 'system' && jsonResponse.cost_usd) {
                console.log(
                  `Claude response completed (on end) - Cost: $${jsonResponse.cost_usd.toFixed(2)}, Duration: ${jsonResponse.duration_ms / 1000}s`
                );
              }
            } catch (parseErr) {
              console.error(
                `[CLAUDE JSON - ${issue.identifier}] Error parsing part of final JSON line: ${parseErr.message}`
              );
              console.error(
                `[CLAUDE JSON - ${issue.identifier}] Offending part: ${part}`
              );
            }
          }
        } catch (err) {
          console.error(
            `[CLAUDE JSON - ${issue.identifier}] Error processing final line: ${err.message}`
          );
          console.error(
            `[CLAUDE JSON - ${issue.identifier}] Offending final line: ${line}`
          );
        }
      }
      
      console.log(`Claude stdout stream ended for issue ${issue.identifier}`);
    });
    
    // Handle stderr output
    claudeProcess.stderr.on('data', (data) => {
      const error = data.toString();
      stderr += error;
      
      console.error(
        `\n[CLAUDE ERROR - ${issue.identifier}] ${error.length} bytes received:`
      );
      console.error(`----------------------------------------`);
      console.error(error);
      console.error(`----------------------------------------`);
    });
    
    // Handle process exit
    claudeProcess.on('close', async (code) => {
      console.log(
        `Claude process for issue ${issue.identifier} exited with code ${code}`
      );
      
      // Store exit code on the process object
      claudeProcess.exitCode = code;
      
      if (code !== 0) {
        console.error(
          `Claude process exited with error code ${code}. Stderr will be posted by linearAgent (ID: ${this.issueService.userId}) if needed.`
        );
        claudeProcess.stderrContent = stderr;
      } else {
        console.log(
          `Claude process exited successfully. Final comment will be posted by linearAgent (ID: ${this.issueService.userId}).`
        );
      }
    });
    
    return claudeProcess;
  }
  
  /**
   * @inheritdoc
   */
  async startSession(issue, workspace) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(`Starting Claude session for issue ${issue.identifier}...`);
        
        // Prepare initial prompt using the template - await the async method
        const initialPrompt = await this.buildInitialPrompt(issue);
        
        // Get the history path
        const historyPath = workspace.getHistoryFilePath();
        
        console.log(`Conversation history will be stored at: ${historyPath}`);
        
        if (!this.fileSystem.existsSync(historyPath)) {
          this.fileSystem.writeFileSync(historyPath, '');
        }
        
        // Get the allowed tools based on configuration
        const config = env.claude;
        let allowedTools;
        
        if (config.allowedTools) {
          // If specific tools are configured, use them
          allowedTools = config.allowedTools;
          console.log(`Using configured tools: ${allowedTools.join(', ')}`);
        } else if (config.readOnlyMode) {
          // If read-only mode is enabled (default), use read-only tools
          allowedTools = claudeConfig.readOnlyTools;
          console.log(`Using read-only tools: ${allowedTools.join(', ')}`);
        } else {
          // Otherwise, use all available tools
          allowedTools = claudeConfig.availableTools;
          console.log(`Using all available tools: ${allowedTools.join(', ')}`);
        }
        
        // Get the arguments with the appropriate tool permissions
        const claudeArgs = claudeConfig.getDefaultArgs(allowedTools);
        const claudeCmd = `${this.claudePath} ${claudeArgs.join(' ')}`;
        const fullCommand = `${claudeCmd} | jq -c .`;
        
        console.log(`Spawning Claude via shell: sh -c "${fullCommand}"`);
        console.log(
          `Using spawn options: ${JSON.stringify({
            cwd: workspace.path,
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true,
          })}`
        );
        
        const claudeProcess = this.processManager.spawn(fullCommand, {
          cwd: workspace.path,
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true,
        });
        
        // Set up error handler
        claudeProcess.on('error', (err) => {
          console.error(`\n[CLAUDE/JQ SPAWN ERROR] ${err.message}`);
          console.error(
            `Make sure the Claude executable and 'jq' are correctly installed and available in PATH`
          );
          reject(err);
        });
        
        // Write the initial prompt to stdin and close it
        try {
          claudeProcess.stdin.write(initialPrompt);
          claudeProcess.stdin.end();
          console.log(
            `Initial prompt sent via stdin to Claude/jq shell (PID: ${claudeProcess.pid}) for issue ${issue.identifier}`
          );
        } catch (stdinError) {
          console.error(
            `Failed to write prompt to Claude/jq stdin: ${stdinError.message}`
          );
          reject(stdinError);
          return;
        }
        
        // Set up common event handlers
        this._setupClaudeProcessHandlers(claudeProcess, issue, historyPath);
        
        // Create and resolve with a new Session object
        const session = new Session({
          issue,
          workspace,
          process: claudeProcess,
          startedAt: new Date()
        });
        
        resolve(session);
      } catch (error) {
        console.error(
          `Failed to start Claude session for issue ${issue.identifier}:`,
          error
        );
        reject(error);
      }
    });
  }
  
  /**
   * @inheritdoc
   */
  async sendComment(session, commentText) {
    return new Promise(async (resolve, reject) => {
      try {
        const { issue, workspace, process: claudeProcess } = session;
        const historyPath = workspace.getHistoryFilePath();
        
        if (!claudeProcess || claudeProcess.killed) {
          console.log(
            'Claude process is not running or already killed. Will start a new one.'
          );
        } else {
          console.log(
            `Terminating previous Claude process (PID: ${claudeProcess.pid})...`
          );
          claudeProcess.kill();
          await new Promise((res) => setTimeout(res, 500));
        }
        
        console.log(`Input length: ${commentText.length} characters`);
        
        // Log new input marker to history file
        try {
          await this.fileSystem.appendFile(
            historyPath,
            `\n[${new Date().toISOString()}] --- New Input Start --- \n${commentText}\n[${new Date().toISOString()}] --- New Input End --- \n`
          );
        } catch (err) {
          console.error(
            `Failed to write new input marker to history: ${err.message}`
          );
        }
        
        // Start a new Claude process with the --continue flag
        console.log(
          `Starting new Claude process with --continue flag...`
        );
        
        // Get the allowed tools based on configuration (same as in startSession)
        const config = env.claude;
        let allowedTools;
        
        if (config.allowedTools) {
          // If specific tools are configured, use them
          allowedTools = config.allowedTools;
        } else if (config.readOnlyMode) {
          // If read-only mode is enabled (default), use read-only tools
          allowedTools = claudeConfig.readOnlyTools;
        } else {
          // Otherwise, use all available tools
          allowedTools = claudeConfig.availableTools;
        }
        
        // Create a shell script to properly handle the continuation
        const escapedComment = commentText.replace(/'/g, "'\\''");
        const claudeArgs = claudeConfig.getContinueArgs(allowedTools);
        
        // Log the arguments for debugging
        console.log(`Claude arguments: ${JSON.stringify(claudeArgs)}`);
        
        // Build the command and use a heredoc in the shell for safe input passing
        const claudeCmd = `${this.claudePath} ${claudeArgs.join(' ')}`;
        
        // Use bash with here document (heredoc) to safely pass the content
        const fullCommand = `${claudeCmd} << 'CLAUDE_INPUT_EOF' | jq -c .
${commentText}
CLAUDE_INPUT_EOF`;
        
        console.log('Using heredoc format for content');
        
        const newClaudeProcess = this.processManager.spawn(fullCommand, {
          cwd: workspace.path,
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true,
        });
        
        newClaudeProcess.on('error', (err) => {
          console.error(`\n[NEW CLAUDE/JQ SPAWN ERROR] ${err.message}`);
          console.error(
            `Make sure the Claude executable and 'jq' are correctly installed and available in PATH`
          );
          reject(err);
        });
        
        // Set up handlers and resolve with new session
        this._setupClaudeProcessHandlers(newClaudeProcess, issue, historyPath);
        
        console.log(
          `New Claude process started with PID: ${newClaudeProcess.pid}`
        );
        
        // Create new session with updated process
        const newSession = new Session({
          ...session,
          process: newClaudeProcess
        });
        
        resolve(newSession);
      } catch (error) {
        console.error('Failed to send input to Claude session:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Calculate total cost and post it to Linear
   * @param {Issue} issue - The issue
   * @param {string} historyPath - Path to history file
   * @param {Object} jsonResponse - The cost response from Claude
   * @private
   */
  async _calculateAndPostCost(issue, historyPath, jsonResponse) {
    // Temporarily disabled cost posting
    /*
    try {
      let totalCost = 0;
      let costCalculationMessage = '';
      
      if (await this.fileSystem.pathExists(historyPath)) {
        const historyContent = await this.fileSystem.readFile(historyPath, 'utf-8');
        const lines = historyContent.trim().split('\n');
        
        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            
            if (entry.role === 'system' && typeof entry.cost_usd === 'number') {
              totalCost += entry.cost_usd;
            }
          } catch (parseError) {
            // Ignore parse errors
          }
        }
        
        costCalculationMessage = `*Cost for last run: $${jsonResponse.cost_usd.toFixed(2)}, Duration: ${jsonResponse.duration_ms / 1000}s*`
          + `\n*Total estimated cost for this issue: $${totalCost.toFixed(2)}*`;
      } else {
        costCalculationMessage = '*Conversation history file not found, cannot calculate total cost.*';
      }
      
      // Post the total cost message
      console.log(`[CLAUDE JSON - ${issue.identifier}] Posting total cost message to Linear.`);
      await this.postResponseToLinear(issue.id, costCalculationMessage);
    } catch (error) {
      console.error(`Error calculating total cost for issue ${issue.identifier}:`, error);
      await this.postResponseToLinear(issue.id, '*Error calculating total session cost.*');
    }
    */
    // Just log the cost without posting to Linear
    console.log(`Cost for run: $${jsonResponse.cost_usd.toFixed(2)}, Duration: ${jsonResponse.duration_ms / 1000}s`);
  }
  
  /**
   * @inheritdoc
   */
  async postResponseToLinear(issueId, response, costUsd = null, durationMs = null) {
    try {
      // Calculate response length and truncate preview to reduce verbosity
      const responseLength = response.length;
      const previewLength = Math.min(50, responseLength);
      const responsePreview = response.substring(0, previewLength) + (responseLength > previewLength ? '...' : '');
      
      console.log(`[CLAUDE JSON - ${issueId}] Posting response to Linear.`);
      
      // Only log full details in debug mode
      if (process.env.DEBUG_CLAUDE_RESPONSES === 'true') {
        console.log(`\n===== Posting Response to Linear for issue ${issueId} =====`);
        console.log(`Response length: ${responseLength} characters`);
        console.log(`Response preview: ${responsePreview}`);
        console.log(`================================================\n`);
      }
      
      // Format the response for Linear
      let formattedResponse = response;
      
      // Append cost information if provided
      if (costUsd !== null && durationMs !== null) {
        formattedResponse += `\n\n---`;
        formattedResponse += `\n*Last run cost: $${costUsd.toFixed(2)}, Duration: ${durationMs / 1000}s*`;
      }
      
      // Create a comment on the issue
      const success = await this.issueService.createComment(issueId, formattedResponse);
      
      if (success) {
        console.log(`✅ Successfully posted response to Linear issue ${issueId}`);
      } else {
        console.error(`❌ Failed to post response to Linear issue ${issueId}`);
      }
      
      return success;
    } catch (error) {
      console.error(`Failed to post response to Linear issue ${issueId}:`, error);
      return false;
    }
  }
}