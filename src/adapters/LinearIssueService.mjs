import { IssueService } from '../services/IssueService.mjs';
import { Issue } from '../core/Issue.mjs';
import { LinearIssueSchema } from '../utils/schemas.mjs';

/**
 * Implementation of IssueService using the Linear API
 */
export class LinearIssueService extends IssueService {
  /**
   * @param {LinearClient} linearClient - Linear API client
   * @param {string} userId - ID of the agent user
   * @param {SessionManager} sessionManager - Manager for active sessions
   * @param {ClaudeService} claudeService - Service for Claude AI operations
   * @param {WorkspaceService} workspaceService - Service for workspace operations
   */
  constructor(linearClient, userId, sessionManager, claudeService, workspaceService) {
    super();
    this.linearClient = linearClient;
    this.userId = userId; // Can be null initially, will be populated from API
    this.username = null; // Will be populated from API
    this.sessionManager = sessionManager;
    this.claudeService = claudeService;
    this.workspaceService = workspaceService;
    this.isAuthenticated = false; // Track authentication status
  }
  
  /**
   * Convert Linear API issue to domain Issue
   * @param {import('../utils/schemas.mjs').LinearIssueType} linearIssue - Linear API issue
   * @returns {Issue} - Domain Issue
   */
  _convertToDomainIssue(linearIssue) {
    // Validate issue data against schema
    const validationResult = LinearIssueSchema.partial().safeParse(linearIssue);
    
    // Only log detailed validation info in debug mode
    if (!validationResult.success && process.env.DEBUG_LINEAR_API === 'true') {
      console.warn('Linear issue data does not match schema:', 
        validationResult.error.format()
      );
      // Continue with the conversion, but log the validation error
    }
    
    // Extract and format comments (without logging)
    let comments = [];
    if (Array.isArray(linearIssue.comments)) {
      comments = linearIssue.comments.map(comment => ({
        id: comment.id,
        body: comment.body,
        userId: comment.user?.id,
        userName: comment.user?.name || 'Unknown',
        createdAt: comment.createdAt
      }));
    }
    
    return new Issue({
      id: linearIssue.id,
      identifier: linearIssue.identifier,
      title: linearIssue.title,
      description: linearIssue.description,
      state: linearIssue.state?.name || linearIssue.state,
      priority: linearIssue.priority,
      url: linearIssue.url,
      assigneeId: linearIssue.assignee?.id || linearIssue._assignee?.id || linearIssue.assigneeId,
      comments: comments
    });
  }
  
  /**
   * @inheritdoc
   */
  async fetchAssignedIssues() {
    try {
      // Ensure we have user ID from API before proceeding
      if (!this.userId && this.fetchUserData) {
        console.log('No user ID available, fetching from API first...');
        const success = await this.fetchUserData();
        if (!success || !this.userId) {
          console.error('Could not automatically determine the agent user ID. Will attempt to fetch all open issues instead.');
          
          // If we didn't get a user ID, try a different approach: get all open issues
          console.log('Fetching all open issues as a fallback...');
          const allIssues = await this.linearClient.issues({
            filter: {
              state: { type: { nin: ['canceled', 'completed'] } },
            },
            first: 50
          });
          
          if (allIssues && allIssues.nodes && allIssues.nodes.length > 0) {
            console.log(`Found ${allIssues.nodes.length} open issues.`);
            this.isAuthenticated = true;
            return allIssues.nodes.map(issue => this._convertToDomainIssue(issue))
              .filter(issue => issue.assigneeId === this.userId);
          } else {
            console.log('No issues found in fallback query.');
            return [];
          }
        }
      }
      
      if (!this.userId) {
        console.error('No user ID available - will return an empty list of assigned issues');
        return [];
      }
      
      console.log(`Fetching issues assigned to user ID: ${this.userId}`);
      const issues = await this.linearClient.issues({
        filter: {
          assignee: { id: { eq: this.userId } },
          state: { type: { nin: ['canceled', 'completed'] } },
        },
      });
      
      // If we get here, we're authenticated
      this.isAuthenticated = true;
      console.log('✅ Authenticated successfully with Linear API');
      
      return issues.nodes.map(issue => this._convertToDomainIssue(issue));
    } catch (error) {
      this.isAuthenticated = false;
      
      // Handle authentication errors gracefully
      if (error.type === 'AuthenticationError' || 
          (error.message && error.message.includes('Authentication required'))) {
        console.log('⚠️ Please authenticate with Linear to fetch issues.');
        throw new Error(`Authentication required. Please use the OAuth flow to authenticate with Linear.`);
      } else {
        // For other errors, provide a concise message
        console.error(`Error fetching assigned issues: ${error.message || String(error)}`);
        throw error;
      }
    }
  }
  
  /**
   * Check if the service is authenticated with Linear
   * @returns {boolean} - Authentication status
   */
  getAuthStatus() {
    return this.isAuthenticated;
  }
  
  /**
   * @inheritdoc
   */
  async fetchIssue(issueId) {
    try {
      // Fetch the issue details
      const issueResponse = await this.linearClient.issue(issueId);
      
      // Fetch comments for the issue
      const commentsResponse = await this.linearClient.issueComments(issueId);
      const commentCount = commentsResponse?.comments?.nodes?.length || 0;
      
      // Only log detailed info if debug mode is enabled
      if (process.env.DEBUG_LINEAR_API === 'true') {
        console.log(`===== FETCHING ISSUE: ${issueId} =====`);
        console.log(`Fetched issue: ${issueResponse.identifier} - ${issueResponse.title}`);
        console.log(`Fetched ${commentCount} comments for issue ${issueResponse.identifier}`);
      }
      
      // Create a modified issue object with comments
      const issueWithComments = {
        ...issueResponse,
        comments: commentsResponse?.comments?.nodes || []
      };
      
      // Convert to domain issue
      return this._convertToDomainIssue(issueWithComments);
    } catch (error) {
      console.error(`Error fetching issue ${issueId}:`, error);
      throw error;
    }
  }
  
  /**
   * @inheritdoc
   */
  async createComment(issueId, body) {
    // Calculate body length and create a preview for logging
    const bodyLength = body.length;
    const bodyPreview = bodyLength > 50 ? body.substring(0, 50) + '...' : body;
    
    console.log(`===== CREATING COMMENT ON ISSUE ${issueId} =====`);
    console.log(`Comment length: ${bodyLength} characters, Preview: ${bodyPreview}`);
    
    // Only log full comment body in debug mode
    if (process.env.DEBUG_COMMENT_CONTENT === 'true') {
      console.log('Full comment body:', body);
    }
    
    try {
      console.log('Sending comment to Linear API...');
      const response = await this.linearClient.createComment({
        issueId,
        body,
      });
      
      // Only log detailed API response in debug mode
      if (process.env.DEBUG_LINEAR_API === 'true') {
        console.log('Linear API response for createComment:');
        console.log(JSON.stringify(response, null, 2));
      }
      
      console.log(`✅ Successfully created comment on issue ${issueId}`);
      return true;
    } catch (error) {
      console.error(`Failed to create comment on issue ${issueId}:`, error);
      
      // Only log detailed error in debug mode
      if (process.env.DEBUG_LINEAR_API === 'true') {
        console.error('Error details:', JSON.stringify(error, null, 2));
      }
      
      return false;
    }
  }
  
  /**
   * Initialize a session for an issue
   * @param {Issue} issue - The issue to initialize
   */
  async initializeIssueSession(issue) {
    // Skip if we already have an active session
    if (this.sessionManager.hasSession(issue.id)) {
      console.log(`Already have an active session for issue ${issue.identifier}`);
      return;
    }
    
    try {
      // Get or create a workspace (without verbose logging)
      let workspace = await this.workspaceService.getWorkspaceForIssue(issue);
      if (!workspace) {
        console.log(`Creating workspace for issue ${issue.identifier}`);
        workspace = await this.workspaceService.createWorkspace(issue);
      }
      
      // Start a Claude session
      console.log(`Starting Claude session for issue ${issue.identifier} with agent user ID: ${this.userId}`);
      const session = await this.claudeService.startSession(issue, workspace);
      
      // Store session
      this.sessionManager.addSession(issue.id, session);
    } catch (error) {
      console.error(error);
      console.error(`Error setting up session for issue ${issue.identifier}:`, error.message);
      
      // Post error as a Linear comment
      try {
        await this.createComment(
          issue.id,
          `Claude agent encountered an error while processing issue ${issue.identifier}:\n\n\`\`\`\n${error.message}\n\`\`\``
        );
      } catch (commentError) {
        console.error(`Failed to post error comment to Linear: ${commentError.message}`);
      }
    }
  }
  
  /**
   * @inheritdoc
   */
  async handleIssueCreateEvent(issueData) {
    try {
      console.log('===== PROCESSING ISSUE CREATE EVENT =====');
      console.log('Issue Create Data:');
      console.log(JSON.stringify(issueData, null, 2));
      
      console.log(
        `===== WEBHOOK: Received issue creation event for ${
          issueData.identifier || issueData.id
        } =====`
      );
      
      // Check if the issue is assigned to our agent
      console.log(`Issue assignee ID: ${issueData.assigneeId || 'null (unassigned)'}`);
      console.log(`Our agent user ID: ${this.userId}`);
      
      if (issueData.assigneeId !== this.userId) {
        console.log(
          `New issue ${
            issueData.identifier || issueData.id
          } is not assigned to our agent, skipping`
        );
        return;
      }
      
      console.log(
        `New issue ${
          issueData.identifier || issueData.id
        } is assigned to our agent, processing immediately`
      );
      
      // Fetch complete issue data
      const issue = await this.fetchIssue(issueData.id);
      
      // Process the issue right away
      await this.initializeIssueSession(issue);
      
      console.log(
        `✅ Successfully initiated processing for new issue ${issue.identifier}`
      );
    } catch (error) {
      console.error('Error handling issue creation event:', error);
    }
  }
  
  /**
   * @inheritdoc
   */
  async handleIssueUpdateEvent(issueData) {
    try {
      console.log('===== PROCESSING ISSUE UPDATE EVENT =====');
      console.log('Issue Update Data:');
      console.log(JSON.stringify(issueData, null, 2));
      
      console.log(
        `===== WEBHOOK: Received issue update for ${
          issueData.identifier || issueData.id
        } =====`
      );
      
      // Check if the assignee was changed
      if ('assigneeId' in issueData) {
        const newAssigneeId = issueData.assigneeId;
        console.log(`Detected assignee change. New assignee ID: ${newAssigneeId || 'null (unassigned)'}`);
        console.log(`Our agent user ID: ${this.userId}`);
        
        // Check if we have an active session for this issue
        if (this.sessionManager.hasSession(issueData.id)) {
          const session = this.sessionManager.getSession(issueData.id);
          const previousAssigneeId = session.issue.assigneeId;
          
          console.log(`Previous assignee ID: ${previousAssigneeId || 'null (unassigned)'}`);
          
          // If the issue was assigned to our agent but now isn't
          if (
            previousAssigneeId === this.userId &&
            (newAssigneeId === null || newAssigneeId !== this.userId)
          ) {
            console.log(
              `Issue ${session.issue.identifier} has been unassigned from our agent, terminating Claude process`
            );
            
            // Kill the Claude process
            if (session.process && !session.process.killed) {
              try {
                // Post a comment to Linear before killing the process
                await this.createComment(
                  issueData.id,
                  `This issue has been unassigned from the agent. The Claude process is being terminated.`
                );
                
                // Kill the process
                session.process.kill('SIGTERM');
                console.log(
                  `✅ Terminated Claude process for issue ${session.issue.identifier}`
                );
              } catch (killError) {
                console.error(
                  `Error terminating Claude process for issue ${session.issue.identifier}:`,
                  killError
                );
              }
            } else {
              console.log(
                `No active Claude process to kill for issue ${session.issue.identifier}`
              );
            }
          }
        }
        
        // If the issue is newly assigned to our agent
        if (
          newAssigneeId === this.userId
        ) {
          console.log(
            `Issue ${
              issueData.identifier || issueData.id
            } has been assigned to our agent, starting Claude process`
          );
          
          // Fetch complete issue data
          const issue = await this.fetchIssue(issueData.id);
          
          // Process the issue right away
          await this.initializeIssueSession(issue);
          
          console.log(
            `✅ Successfully initiated processing for newly assigned issue ${issue.identifier}`
          );
        }
      }
    } catch (error) {
      console.error('Error handling issue update event:', error);
    }
  }
  
  /**
   * @inheritdoc
   */
  async handleCommentEvent(commentData) {
    try {
      console.log('===== PROCESSING COMMENT EVENT =====');
      console.log('Comment Data:');
      console.log(JSON.stringify(commentData, null, 2));
      
      // Get the issue ID from the comment event
      const { issueId, body, user } = commentData;
      
      console.log(`Issue ID: ${issueId}`);
      console.log(`Comment body: ${body}`);
      console.log(`User ID: ${user.id}`);
      console.log(`User name: ${user.name || 'Not provided'}`);
      
      // CRITICAL: Skip comments created by our own user to prevent infinite loops
      // This check has been duplicated in ExpressWebhookService.mjs as a double-protection
      if (user.id === this.userId) {
        // Only log this in debug mode to reduce verbosity
        if (process.env.DEBUG_SELF_WEBHOOKS === 'true') {
          console.log(`⚠️ Skipping comment from our own user (${user.id}) to prevent infinite loop`);
        }
        return;
      }
      
      // Use the username from the API for mention checking
      console.log(`Checking for agent mention. Agent username: ${this.username}`);
      
      // In the legacy webhook format, we still want to check for mentions
      // But for new Agent API notifications, this is handled based on notification type
      if (this.username && !body.includes(this.username)) {
        console.log(
          `Skipping comment that does not mention the agent (${this.username})`
        );
        return;
      }
      
      console.log('Agent mention found in comment, fetching issue details...');
      const issue = await this.fetchIssue(issueId);
      console.log('Issue details:');
      console.log(JSON.stringify(issue, null, 2));
      
      if (issue.assigneeId !== this.userId) {
        console.log(
          `Skipping comment on issue ${issue.identifier} that is not assigned to our agent`
        );
        return;
      }
      
      console.log(
        `===== WEBHOOK: Received comment on assigned issue ${issueId} that mentions ${this.username}. Processing... =====`
      );
      
      // Get the session info, if it exists
      const session = this.sessionManager.getSession(issueId);
      
      if (session) {
        // Session exists, send the comment
        try {
          const updatedSession = await this.claudeService.sendComment(session, body);
          this.sessionManager.updateSession(issueId, updatedSession);
          
          console.log(
            `✅ Comment successfully sent to Claude for issue ${issue.id}`
          );
          console.log(
            `Claude is processing the comment and will post a response to Linear when ready.`
          );
        } catch (err) {
          console.error(`Failed to send comment to Claude: ${err.message}`);
          
          // Post an error comment back to Linear
          try {
            await this.createComment(
              issue.id,
              `Agent encountered an error trying to process your comment: ${err.message}`
            );
          } catch (commentError) {
            console.error(
              `Failed to post error comment to Linear for issue ${issue.id}:`,
              commentError
            );
          }
        }
      } else {
        console.error(
          `Could not find valid session for the issue ${issueId}. Reinitializing...`
        );
        
        // Try to initialize a new session
        await this.initializeIssueSession(issue);
      }
    } catch (error) {
      console.error('Error handling comment event:', error);
    }
  }
  
  /**
   * @inheritdoc
   */
  async handleAgentMention(data) {
    try {
      console.log('===== PROCESSING AGENT MENTION NOTIFICATION =====');
      
      // Extract relevant information from notification data
      const issueId = data.issueId;
      const commentId = data.commentId;
      const commentContent = data.comment?.body;
      const actor = data.actor?.name || 'Unknown user';
      
      console.log(`Agent mentioned by ${actor} in comment ${commentId} on issue ${issueId}`);
      if (commentContent) {
        console.log(`Comment content (preview): ${commentContent.substring(0, 100)}${commentContent.length > 100 ? '...' : ''}`);
      }
      
      if (!issueId) {
        console.log('No issue ID found in mention data, cannot process');
        return;
      }
      
      // Fetch the issue to get full context
      const issue = await this.fetchIssue(issueId);
      console.log(`Fetched issue: ${issue.identifier}`);
      
      // Check if we already have a session for this issue
      if (this.sessionManager.hasSession(issueId)) {
        console.log(`Using existing session for issue ${issue.identifier}`);
        const session = this.sessionManager.getSession(issueId);
        
        // Process the mention as a comment (using commentContent from data.comment.body)
        if (commentContent) {
          console.log(`Processing mention as a comment: ${commentContent.substring(0, 50)}${commentContent.length > 50 ? '...' : ''}`);
          // Ensure we're using the correct variable (commentContent, not content)
          const updatedSession = await this.claudeService.sendComment(session, commentContent);
          this.sessionManager.updateSession(issueId, updatedSession);
        }
      } else {
        // Initialize a new session for this issue
        console.log(`No existing session for issue ${issue.identifier}, initializing new session`);
        await this.initializeIssueSession(issue);
      }
      
      console.log('Successfully processed agent mention');
    } catch (error) {
      console.error('Error handling agent mention:', error);
    }
  }
  
  /**
   * @inheritdoc
   */
  async handleAgentAssignment(data) {
    try {
      // Extract relevant information from notification data
      const { issueId } = data;
      const actor = data.actor?.name || 'Unknown user';
      const issueIdentifier = data.issue?.identifier || '';
      
      // Concise logging of assignment
      console.log(`📋 Agent assigned to issue ${issueIdentifier} by ${actor}`);
      
      if (!issueId) {
        console.log('No issue ID found in assignment data, cannot process');
        return;
      }
      
      // Fetch the issue to get full context (detailed debug logs are in fetchIssue)
      const issue = await this.fetchIssue(issueId);
      
      // Best practice - Post an acknowledgement comment
      await this.createComment(
        issueId,
        `I'm now assigned to this issue and will start working on it right away.`
      );
      
      // Initialize a session for this issue
      console.log(`Starting work on issue ${issue.identifier}`);
      await this.initializeIssueSession(issue);
    } catch (error) {
      console.error('Error handling agent assignment:', error);
    }
  }
  
  /**
   * @inheritdoc
   */
  async handleAgentReply(data) {
    try {
      console.log('===== PROCESSING AGENT REPLY NOTIFICATION =====');
      
      // Extract relevant information from notification data using safer property access
      const issueId = data.issueId;
      const commentId = data.commentId;
      const commentContent = data.comment?.body;
      const actor = data.actor?.name || 'Unknown user';
      
      console.log(`Reply from ${actor} on issue ${data.issue?.identifier || issueId}`);
      if (commentContent) {
        console.log(`Comment preview: ${commentContent.substring(0, 50)}${commentContent.length > 50 ? '...' : ''}`);
      }
      
      if (!issueId) {
        console.log('No issue ID found in reply data, cannot process');
        return;
      }
      
      // Fetch the issue to get full context
      const issue = await this.fetchIssue(issueId);
      console.log(`Fetched issue: ${issue.identifier}`);
      
      // Check if we have a session for this issue
      if (this.sessionManager.hasSession(issueId)) {
        console.log(`Using existing session for issue ${issue.identifier}`);
        const session = this.sessionManager.getSession(issueId);
        
        // Process the reply as a comment
        if (commentContent) {
          console.log(`Processing reply as a comment`);
          const updatedSession = await this.claudeService.sendComment(session, commentContent);
          this.sessionManager.updateSession(issueId, updatedSession);
        }
      } else {
        // Initialize a new session for this issue
        console.log(`No existing session for issue ${issue.identifier}, initializing new session`);
        await this.initializeIssueSession(issue);
      }
      
      console.log('Successfully processed agent reply');
    } catch (error) {
      console.error('Error handling agent reply:', error);
    }
  }
}