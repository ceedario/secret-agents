import path from 'path';

import { claudeConfig, env } from '../config/index.mjs';
import { Session } from '../core/Session.mjs';
import { ClaudeService } from '../services/ClaudeService.mjs';
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
   * @param {AttachmentDownloader} attachmentDownloader - Attachment downloader utility
   */
  constructor(
    claudePath, 
    promptTemplatePath, 
    issueService, 
    fileSystem = new FileSystem(), 
    processManager = new ProcessManager(),
    attachmentDownloader = null
  ) {
    super();
    this.claudePath = claudePath;
    this.issueService = issueService;
    this.fileSystem = fileSystem;
    this.processManager = processManager;
    this.promptTemplatePath = promptTemplatePath;
    this.promptTemplate = null;
    this.attachmentDownloader = attachmentDownloader;
    
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
  async buildInitialPrompt(issue, tokenLimitResumeContext = false, attachmentManifest = '') {
    // Ensure prompt template is loaded
    if (!this.promptTemplate) {
      console.log('Prompt template not loaded yet, loading now...');
      this.promptTemplate = await this._loadPromptTemplate(this.promptTemplatePath);
    }

    const issueDetails = issue.toXml();
    const linearComments = issue.formatComments();
    const branchName = issue.getBranchName();
    
    // Get the agent name from the issueService (Linear username)
    const agentName = this.issueService && this.issueService.username 
      ? this.issueService.username 
      : 'Linear Agent'; // Fallback if username not available
    
    // Inject variables into the template
    let finalPrompt = this.promptTemplate;
    
    // Verify that the template is a string
    if (typeof finalPrompt !== 'string') {
      console.error('Prompt template is not a string:', typeof finalPrompt);
      throw new Error('Prompt template is not a string. Cannot build initial prompt.');
    }
    
    // Add token limit context if needed
    if (tokenLimitResumeContext) {
      const resumeMessage = `
[SYSTEM NOTICE: This is a fresh Claude session that was started after hitting the token limit in the previous conversation. 
You should continue working on the issue as if you're resuming from where you left off. The workspace state and conversation 
history are preserved. Please continue your work on the issue.]

`;
      finalPrompt = resumeMessage + finalPrompt;
    }
    
    // Add attachment manifest if provided
    if (attachmentManifest) {
      finalPrompt = finalPrompt + '\n' + attachmentManifest;
    }
    
    finalPrompt = finalPrompt.replace('{{agent_name}}', agentName);
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
   * @param {Workspace} workspace - The workspace
   * @param {string} historyPath - Path to history file
   * @param {Function} onTokenLimitError - Callback when token limit is reached
   * @param {Session} session - The session object for tracking context
   * @returns {ChildProcess} - The Claude process with handlers attached
   */
  _setupClaudeProcessHandlers(claudeProcess, issue, workspace, historyPath, onTokenLimitError = null, session = null) {
    // Set up buffers to capture output
    let stderr = '';
    let lastAssistantResponseText = '';
    let firstResponsePosted = false;
    let lineBuffer = '';
    let tokenLimitErrorDetected = false;
    
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

          // Handle tool use events to track tool calls
          if (jsonResponse.type === 'assistant' && jsonResponse.message) {
            const message = jsonResponse.message;
            
            // Check for tool use in content
            if (message.content && Array.isArray(message.content)) {
              for (const content of message.content) {
                if (content.type === 'tool_use' && content.name && session) {
                  console.log(`[STREAMING - ${issue.identifier}] Tool call detected: ${content.name}`);
                  session.addToolCall(content.name);
                }
              }
            }
          }
          
          // Process the jsonResponse based on new format
          // Handle assistant messages wrapped in message object
          if (jsonResponse.type === 'assistant' && jsonResponse.message) {
            const message = jsonResponse.message;
            let currentResponseText = '';
            
            if (message.content && Array.isArray(message.content)) {
              for (const content of message.content) {
                if (content.type === 'text') {
                  currentResponseText += content.text;
                }
              }
            } else if (typeof message.content === 'string') {
              currentResponseText = message.content;
            }
            
            // Check for token limit error in assistant response
            if (currentResponseText === 'Prompt is too long') {
              console.error(
                `[CLAUDE JSON - ${issue.identifier}] Token limit error detected in assistant response`
              );
              console.error(
                `[CLAUDE JSON - ${issue.identifier}] onTokenLimitError: ${onTokenLimitError ? 'provided' : 'not provided'}`
              );
              console.error(
                `[CLAUDE JSON - ${issue.identifier}] tokenLimitErrorDetected: ${tokenLimitErrorDetected}`
              );
              
              // Trigger the callback if provided and not already triggered
              if (onTokenLimitError && !tokenLimitErrorDetected) {
                tokenLimitErrorDetected = true;
                console.error(
                  `[CLAUDE JSON - ${issue.identifier}] Calling onTokenLimitError callback`
                );
                onTokenLimitError(issue, workspace);
              }
              // Don't post the error message to Linear, but don't return early
              // to allow the rest of the stream to be processed
              tokenLimitErrorDetected = true;
              lastAssistantResponseText = ''; // Clear the response so it doesn't get posted
              return;
            }
            
            if (currentResponseText.trim().length > 0) {
              // Don't store or post if it's a token limit error
              if (currentResponseText !== 'Prompt is too long') {
                lastAssistantResponseText = currentResponseText;
                
                // NEW STREAMING BEHAVIOR: Update streaming comment instead of posting first response
                if (session && session.streamingCommentId) {
                  // Add text snippet to narrative and update synthesis
                  session.addTextSnippet(currentResponseText);
                  console.log(`[STREAMING - ${issue.identifier}] Synthesis updated: ${session.streamingSynthesis.substring(0, 100)}...`);
                  
                  // Update streaming comment immediately
                  await this.updateStreamingComment(issue.id, session.streamingCommentId, session.streamingSynthesis);
                } else if (!firstResponsePosted) {
                  // Fallback to old behavior if no streaming comment is set up
                  console.log(`[CLAUDE JSON - ${issue.identifier}] Posting first response to Linear (fallback).`);
                  
                  // Determine if we should thread the response
                  let parentId = null;
                  if (session) {
                    // Use currentParentId if available, otherwise use agentRootCommentId
                    parentId = session.currentParentId || session.agentRootCommentId;
                    if (parentId) {
                      console.log(`[CLAUDE JSON - ${issue.identifier}] Threading response to comment ${parentId}`);
                    }
                  }
                  
                  this.postResponseToLinear(issue.id, lastAssistantResponseText, null, null, parentId);
                  // Store first response content in issue object for comparison
                  issue.firstResponseContent = lastAssistantResponseText.trim();
                  firstResponsePosted = true;
                }
              }
            }
            
            // Check for end_turn in the message
            if (message.stop_reason === 'end_turn') {
              // Ensure final streaming update happens before posting final response
              if (session && session.streamingCommentId && session.streamingSynthesis) {
                console.log(`[STREAMING - ${issue.identifier}] Final streaming update before end_turn`);
                await this.updateStreamingComment(issue.id, session.streamingCommentId, session.streamingSynthesis);
              }
              
              // NEW STREAMING BEHAVIOR: Always post final response as separate comment
              if (lastAssistantResponseText.trim().length > 0 && lastAssistantResponseText !== 'Prompt is too long') {
                console.log(
                  `[CLAUDE JSON - ${issue.identifier}] Detected stop_reason: end_turn. Posting final response.`
                );
                
                // Determine if we should thread the response
                let parentId = null;
                if (session) {
                  // Use currentParentId if available, otherwise use agentRootCommentId
                  parentId = session.currentParentId || session.agentRootCommentId;
                  if (parentId) {
                    console.log(`[CLAUDE JSON - ${issue.identifier}] Threading final response to comment ${parentId}`);
                  }
                }
                
                this.postResponseToLinear(issue.id, lastAssistantResponseText, null, null, parentId);
                lastAssistantResponseText = '';
              } else {
                // Post a message indicating no final content
                console.log(
                  `[CLAUDE JSON - ${issue.identifier}] Detected stop_reason: end_turn, but no final content. Posting notice.`
                );
                
                // Determine if we should thread the response
                let parentId = null;
                if (session) {
                  parentId = session.currentParentId || session.agentRootCommentId;
                }
                
                this.postResponseToLinear(
                  issue.id, 
                  `I had no final comment, see my last comment to see where I left off`,
                  null, null, parentId
                );
              }
            }
          }
          
          // Check for token limit error in various possible formats
          const isTokenLimitError = (
            // Direct error type
            (jsonResponse.type === 'error' && 
             jsonResponse.message && 
             (jsonResponse.message === 'Prompt is too long' || 
              jsonResponse.message.toLowerCase().includes('prompt is too long'))) ||
            // Error object
            (jsonResponse.error && 
             typeof jsonResponse.error.message === 'string' && 
             (jsonResponse.error.message === 'Prompt is too long' ||
              jsonResponse.error.message.toLowerCase().includes('prompt is too long'))) ||
            // Assistant message with error (handled above, but keeping for completeness)
            (jsonResponse.type === 'assistant' && 
             jsonResponse.message && 
             jsonResponse.message.content &&
             typeof jsonResponse.message.content === 'string' &&
             (jsonResponse.message.content === 'Prompt is too long' ||
              jsonResponse.message.content.toLowerCase().includes('prompt is too long'))) ||
            // Tool error
            (jsonResponse.type === 'tool_error' &&
             jsonResponse.error &&
             (jsonResponse.error === 'Prompt is too long' ||
              jsonResponse.error.toLowerCase().includes('prompt is too long'))) ||
            // Result type with error - this is the most reliable indicator
            (jsonResponse.type === 'result' &&
             (jsonResponse.result === 'Prompt is too long' || jsonResponse.is_error === true))
          );
          
          if (isTokenLimitError) {
            console.error(
              `[CLAUDE JSON - ${issue.identifier}] Token limit error detected: ${JSON.stringify(jsonResponse)}`
            );
            console.error(
              `[CLAUDE JSON - ${issue.identifier}] onTokenLimitError: ${onTokenLimitError ? 'provided' : 'not provided'}`
            );
            console.error(
              `[CLAUDE JSON - ${issue.identifier}] tokenLimitErrorDetected: ${tokenLimitErrorDetected}`
            );
            
            // Trigger the callback if provided and not already triggered
            if (onTokenLimitError && !tokenLimitErrorDetected) {
              tokenLimitErrorDetected = true;
              console.error(
                `[CLAUDE JSON - ${issue.identifier}] Triggering onTokenLimitError callback`
              );
              onTokenLimitError(issue, workspace);
            } else if (tokenLimitErrorDetected) {
              console.error(
                `[CLAUDE JSON - ${issue.identifier}] Token limit error already detected, skipping callback`
              );
            } else if (!onTokenLimitError) {
              console.error(
                `[CLAUDE JSON - ${issue.identifier}] No token limit error callback provided`
              );
            }
          }
          
          // Handle result type for cost information
          if (jsonResponse.type === 'result' && jsonResponse.subtype === 'success' && jsonResponse.cost_usd) {
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
              
              // Check for token limit error in final response as well
              const isTokenLimitError = (
                (jsonResponse.type === 'error' && 
                 jsonResponse.message && 
                 (jsonResponse.message === 'Prompt is too long' ||
                  jsonResponse.message.toLowerCase().includes('prompt is too long'))) ||
                (jsonResponse.error && 
                 typeof jsonResponse.error.message === 'string' && 
                 (jsonResponse.error.message === 'Prompt is too long' ||
                  jsonResponse.error.message.toLowerCase().includes('prompt is too long'))) ||
                (jsonResponse.type === 'result' &&
                 jsonResponse.result === 'Prompt is too long') ||
                (jsonResponse.type === 'assistant' && 
                 jsonResponse.message?.content === 'Prompt is too long')
              );
              
              if (isTokenLimitError && !tokenLimitErrorDetected) {
                console.error(
                  `[CLAUDE JSON END - ${issue.identifier}] Token limit error detected in final response: ${JSON.stringify(jsonResponse)}`
                );
                tokenLimitErrorDetected = true;
                
                if (onTokenLimitError) {
                  onTokenLimitError(issue, workspace);
                }
              }
              
              if (jsonResponse.type === 'result' && jsonResponse.subtype === 'success' && jsonResponse.cost_usd) {
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
      
      // Check for token limit error in stderr as well
      if (error.toLowerCase().includes('prompt is too long') && !tokenLimitErrorDetected) {
        console.error(
          `[CLAUDE STDERR - ${issue.identifier}] Token limit error detected in stderr`
        );
        tokenLimitErrorDetected = true;
        
        // Trigger the callback if provided
        if (onTokenLimitError) {
          onTokenLimitError(issue, workspace);
        }
      }
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
   * Start a new session after token limit error
   * @param {Issue} issue - The issue to work on
   * @param {Workspace} workspace - The workspace
   * @returns {Promise<Session>} A promise that resolves with the session
   */
  async startFreshSessionAfterTokenLimit(issue, workspace) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(`Starting fresh Claude session for issue ${issue.identifier} after token limit error...`);
        
        // Check if attachments were already downloaded (they should persist in the home directory)
        let attachmentManifest = '';
        if (this.attachmentDownloader) {
          const homeDir = this.fileSystem.homedir();
          const workspaceFolderName = this.fileSystem.basename(workspace.path);
          const attachmentsDir = this.fileSystem.joinPath(
            homeDir,
            '.linearsecretagent',
            workspaceFolderName,
            'attachments'
          );
          if (this.fileSystem.existsSync(attachmentsDir)) {
            // Attachments already exist, just regenerate the manifest
            console.log('Found existing downloaded attachments, regenerating manifest...');
            // We need to re-download to get the proper mapping, but files will be overwritten
            const downloadResult = await this.attachmentDownloader.downloadIssueAttachments(issue, workspace.path);
            if (downloadResult.downloaded > 0) {
              attachmentManifest = this.attachmentDownloader.generateAttachmentManifest(downloadResult);
            }
          }
        }
        
        // Prepare initial prompt with token limit context
        const initialPrompt = await this.buildInitialPrompt(issue, true, attachmentManifest);
        
        // Get the history path (but don't clear it - we preserve the conversation history)
        const historyPath = workspace.getHistoryFilePath();
        
        console.log(`Fresh session will continue with existing conversation history at: ${historyPath}`);
        
        // Get the allowed tools based on configuration
        const config = env.claude;
        let allowedTools;
        
        if (config.allowedTools) {
          allowedTools = config.allowedTools;
          console.log(`Using configured tools: ${allowedTools.join(', ')}`);
        } else if (config.readOnlyMode) {
          allowedTools = claudeConfig.readOnlyTools;
          console.log(`Using read-only tools: ${allowedTools.join(', ')}`);
        } else {
          allowedTools = claudeConfig.availableTools;
          console.log(`Using all available tools: ${allowedTools.join(', ')}`);
        }
        
        // Use default args (without --continue) for fresh start
        const claudeArgs = claudeConfig.getDefaultArgs(allowedTools, workspace.path);
        const claudeCmd = `${this.claudePath} ${claudeArgs.join(' ')}`;
        
        // Build the full command
        const fullCommand = `${claudeCmd} | jq -c .`;
        
        console.log(`Spawning fresh Claude session via shell: sh -c "${fullCommand}"`);
        
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
        
        // Write the initial prompt with token limit context
        try {
          claudeProcess.stdin.write(initialPrompt);
          claudeProcess.stdin.end();
          console.log(
            `Initial prompt with token limit context sent to fresh Claude session (PID: ${claudeProcess.pid}) for issue ${issue.identifier}`
          );
        } catch (stdinError) {
          console.error(
            `Failed to write to Claude/jq stdin: ${stdinError.message}`
          );
          reject(stdinError);
          return;
        }
        
        // Set up common event handlers
        this._setupClaudeProcessHandlers(claudeProcess, issue, workspace, historyPath, null, null);
        
        // Create and resolve with a new Session object
        const session = new Session({
          issue,
          workspace,
          process: claudeProcess,
          startedAt: new Date(),
          agentRootCommentId
        });
        
        resolve(session);
      } catch (error) {
        console.error(
          `Failed to start fresh Claude session for issue ${issue.identifier}:`,
          error
        );
        reject(error);
      }
    });
  }

  /**
   * @inheritdoc
   */
  async startSession(issue, workspace, agentRootCommentId = null) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(`Starting Claude session for issue ${issue.identifier}...`);
        
        // Download attachments if AttachmentDownloader is available
        let attachmentManifest = '';
        if (this.attachmentDownloader) {
          console.log('Checking for attachments in issue...');
          const downloadResult = await this.attachmentDownloader.downloadIssueAttachments(issue, workspace.path);
          
          if (downloadResult.downloaded > 0) {
            attachmentManifest = this.attachmentDownloader.generateAttachmentManifest(downloadResult);
            console.log(`Downloaded ${downloadResult.downloaded} attachments for issue ${issue.identifier}`);
          }
          
          if (downloadResult.skipped > 0) {
            // Post a warning comment about skipped attachments
            await this.postResponseToLinear(
              issue.id,
              `[System] Found ${downloadResult.totalFound} attachments in this issue. Downloaded ${downloadResult.downloaded} attachments (hard limit: 10). Skipped ${downloadResult.skipped} attachments.`
            );
          }
          
          if (downloadResult.failed > 0) {
            // Post a warning comment about failed downloads
            await this.postResponseToLinear(
              issue.id,
              `[System] Failed to download ${downloadResult.failed} attachment(s). This may be due to authentication issues or files being unavailable. Continuing with available information.`
            );
          }
        }
        
        // Prepare initial prompt using the template - await the async method
        const initialPrompt = await this.buildInitialPrompt(issue, false, attachmentManifest);
        
        // Create the initial streaming comment immediately BEFORE starting Claude process
        let streamingCommentId = null;
        const parentId = agentRootCommentId || null;
        
        try {
          streamingCommentId = await this.createStreamingComment(issue.id, parentId);
          if (streamingCommentId) {
            console.log(`[STREAMING - ${issue.identifier}] Created streaming comment ${streamingCommentId}`);
          } else {
            console.error(`[STREAMING - ${issue.identifier}] Failed to create streaming comment, falling back to old behavior`);
          }
        } catch (error) {
          console.error(`[STREAMING - ${issue.identifier}] Error creating streaming comment:`, error);
        }

        // Get the history path
        const historyPath = workspace.getHistoryFilePath();
        
        console.log(`Conversation history will be stored at: ${historyPath}`);
        
        // Check if conversation history exists and has content
        let hasExistingHistory = false;
        if (this.fileSystem.existsSync(historyPath)) {
          const historyContent = await this.fileSystem.readFile(historyPath, 'utf-8');
          hasExistingHistory = historyContent.trim().length > 0;
          console.log(`History file exists with ${hasExistingHistory ? 'content' : 'no content'}`);
        } else {
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
        // Use continue args if we have existing history, otherwise use default args
        const claudeArgs = hasExistingHistory 
          ? claudeConfig.getContinueArgs(allowedTools, workspace.path)
          : claudeConfig.getDefaultArgs(allowedTools, workspace.path);
        const claudeCmd = `${this.claudePath} ${claudeArgs.join(' ')}`;
        
        // Build the full command
        let fullCommand;
        if (hasExistingHistory) {
          // For continuation, use heredoc like in sendComment
          const continuationMessage = "The system has been restarted. Please continue working on this issue.";
          fullCommand = `${claudeCmd} << 'CLAUDE_INPUT_EOF' | jq -c .
${continuationMessage}
CLAUDE_INPUT_EOF`;
        } else {
          // For new sessions, pipe the input normally
          fullCommand = `${claudeCmd} | jq -c .`;
        }
        
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
        
        // Write the initial prompt only for new sessions
        // For continuations, the content is already included in the heredoc command
        try {
          if (!hasExistingHistory) {
            // For new sessions, send the initial prompt
            claudeProcess.stdin.write(initialPrompt);
            claudeProcess.stdin.end();
            console.log(
              `Initial prompt sent via stdin to Claude/jq shell (PID: ${claudeProcess.pid}) for issue ${issue.identifier}`
            );
          } else {
            // For continuations, the heredoc already contains the content
            console.log(
              `Continuation started for issue ${issue.identifier} (using --continue with existing history)`
            );
          }
        } catch (stdinError) {
          console.error(
            `Failed to write to Claude/jq stdin: ${stdinError.message}`
          );
          reject(stdinError);
          return;
        }
        
        // Create the initial session for handler access
        const session = new Session({
          issue,
          workspace,
          process: claudeProcess,
          startedAt: new Date(),
          agentRootCommentId: agentRootCommentId || null,
          currentParentId: agentRootCommentId || null, // Initially thread under the first comment
          streamingCommentId: streamingCommentId,
          streamingSynthesis: 'Getting to work...',
          streamingNarrative: []
        });
        
        // Set up common event handlers with token limit callback
        this._setupClaudeProcessHandlers(claudeProcess, issue, workspace, historyPath, async (issue, workspace) => {
          console.log(`Token limit reached for issue ${issue.identifier}. Starting fresh session...`);
          
          // Kill the current process gracefully
          if (claudeProcess && !claudeProcess.killed) {
            claudeProcess.kill();
          }
          
          // Start a fresh session without --continue
          try {
            const freshSession = await this.startFreshSessionAfterTokenLimit(issue, workspace);
            console.log(`Fresh session started successfully for issue ${issue.identifier}`);
            
            // Update the SessionManager with the fresh session
            if (this.issueService && this.issueService.sessionManager) {
              this.issueService.sessionManager.updateSession(issue.id, freshSession);
            }
            
            // Post a comment to Linear about the token limit restart
            await this.postResponseToLinear(
              issue.id, 
              `[System] The conversation hit the token limit. Starting a fresh session while preserving the workspace state and conversation history.`
            );
          } catch (error) {
            console.error(`Failed to start fresh session after token limit:`, error);
            await this.postResponseToLinear(
              issue.id, 
              `[System Error] Failed to recover from token limit: ${error.message}`
            );
          }
        }, session);
        
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
        
        // Create a new streaming comment for the continuation BEFORE starting Claude process
        let streamingCommentId = null;
        const parentId = session.currentParentId || session.agentRootCommentId;
        
        try {
          streamingCommentId = await this.createStreamingComment(issue.id, parentId);
          if (streamingCommentId) {
            console.log(`[STREAMING - ${issue.identifier}] Created new streaming comment for continuation: ${streamingCommentId}`);
          } else {
            console.error(`[STREAMING - ${issue.identifier}] Failed to create streaming comment for continuation`);
          }
        } catch (error) {
          console.error(`[STREAMING - ${issue.identifier}] Error creating streaming comment for continuation:`, error);
        }
        
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
        const claudeArgs = claudeConfig.getContinueArgs(allowedTools, workspace.path);
        
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
        
        // Create new session with updated process and reset streaming state first
        const newSession = new Session({
          ...session,
          process: newClaudeProcess,
          streamingCommentId: streamingCommentId,
          streamingSynthesis: 'Getting to work...',
          streamingNarrative: []
        });
        
        console.log(
          `New Claude process started with PID: ${newClaudeProcess.pid}`
        );
        
        // Set up handlers with the new session that has the correct streamingCommentId
        this._setupClaudeProcessHandlers(newClaudeProcess, issue, workspace, historyPath, async (issue, workspace) => {
          console.log(`Token limit reached while continuing issue ${issue.identifier}. Starting fresh session...`);
          
          // Kill the current process gracefully
          if (newClaudeProcess && !newClaudeProcess.killed) {
            newClaudeProcess.kill();
          }
          
          // Start a fresh session without --continue
          try {
            const freshSession = await this.startFreshSessionAfterTokenLimit(issue, workspace);
            console.log(`Fresh session started successfully after token limit in continuation for issue ${issue.identifier}`);
            
            // Update the SessionManager with the fresh session
            if (this.issueService && this.issueService.sessionManager) {
              this.issueService.sessionManager.updateSession(issue.id, freshSession);
            }
            
            // Post a comment to Linear about the token limit restart
            await this.postResponseToLinear(
              issue.id, 
              `[System] The conversation hit the token limit during continuation. Starting a fresh session while preserving the workspace state and conversation history.`
            );
          } catch (error) {
            console.error(`Failed to start fresh session after token limit in continuation:`, error);
            await this.postResponseToLinear(
              issue.id, 
              `[System Error] Failed to recover from token limit during continuation: ${error.message}`
            );
          }
        }, newSession);
        
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
            
            if (entry.type === 'result' && entry.subtype === 'success' && typeof entry.cost_usd === 'number') {
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
   * Checks if the content has changed between first and final response
   * @param {string} firstResponse - The first response content
   * @param {string} finalResponse - The final response content
   * @returns {boolean} - True if content has changed, false otherwise
   * @private
   */
  _isContentChanged(firstResponse, finalResponse) {
    // If first response wasn't stored, consider it changed
    if (!firstResponse) {
      return true;
    }

    // Compare content after normalization (trim whitespace)
    return firstResponse.trim() !== finalResponse.trim();
  }

  /**
   * Create and track the initial "Getting to work..." comment
   * @param {string} issueId - The issue ID
   * @param {string} parentId - Optional parent comment ID for threading
   * @returns {Promise<string|null>} - The streaming comment ID if successful
   */
  async createStreamingComment(issueId, parentId = null) {
    try {
      console.log(`[STREAMING - ${issueId}] Creating initial streaming comment`);
      
      const result = await this.issueService.createCommentAndGetId(
        issueId, 
        'Getting to work...', 
        parentId
      );
      
      if (result.success && result.commentId) {
        console.log(`[STREAMING - ${issueId}] Created streaming comment: ${result.commentId}`);
        return result.commentId;
      } else {
        console.error(`[STREAMING - ${issueId}] Failed to create streaming comment`);
        return null;
      }
    } catch (error) {
      console.error(`[STREAMING - ${issueId}] Error creating streaming comment:`, error);
      return null;
    }
  }

  /**
   * Update the streaming comment with synthesis
   * @param {string} issueId - The issue ID
   * @param {string} commentId - The streaming comment ID
   * @param {string} synthesis - The synthesized progress message
   */
  async updateStreamingComment(issueId, commentId, synthesis) {
    try {
      console.log(`[STREAMING - ${issueId}] Updating streaming comment ${commentId}`);
      
      const success = await this.issueService.updateComment(commentId, synthesis);
      
      if (success) {
        console.log(`[STREAMING - ${issueId}] Successfully updated streaming comment`);
      } else {
        console.error(`[STREAMING - ${issueId}] Failed to update streaming comment`);
      }
      
      return success;
    } catch (error) {
      console.error(`[STREAMING - ${issueId}] Error updating streaming comment:`, error);
      return false;
    }
  }

  /**
   * @inheritdoc
   */
  async postResponseToLinear(issueId, response, costUsd = null, durationMs = null, parentId = null) {
    try {
      // Calculate response length and truncate preview to reduce verbosity
      const responseLength = response.length;
      const previewLength = Math.min(50, responseLength);
      const responsePreview = response.substring(0, previewLength) + (responseLength > previewLength ? '...' : '');
      
      console.log(`[CLAUDE JSON - ${issueId}] Posting response to Linear.`);
      if (parentId) {
        console.log(`[CLAUDE JSON - ${issueId}] Replying to parent comment: ${parentId}`);
      }
      
      // Only log full details in debug mode
      if (process.env.DEBUG_CLAUDE_RESPONSES === 'true') {
        console.log(`\n===== Posting Response to Linear for issue ${issueId} =====`);
        console.log(`Response length: ${responseLength} characters`);
        console.log(`Response preview: ${responsePreview}`);
        if (parentId) {
          console.log(`Parent comment ID: ${parentId}`);
        }
        console.log(`================================================\n`);
      }
      
      // Format the response for Linear
      let formattedResponse = response;
      
      // Append cost information if provided
      if (costUsd !== null && durationMs !== null) {
        formattedResponse += `\n\n---`;
        formattedResponse += `\n*Last run cost: $${costUsd.toFixed(2)}, Duration: ${durationMs / 1000}s*`;
      }
      
      // Create a comment on the issue with optional parent ID for threading
      const success = await this.issueService.createComment(issueId, formattedResponse, parentId);
      
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