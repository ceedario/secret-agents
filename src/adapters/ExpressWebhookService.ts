import crypto from 'crypto';
import { Request, Response } from 'express';
import { Server } from 'http';

import { WebhookService } from '../services/WebhookService.js';
import { 
  HttpServer, 
  AgentNotificationWebhookSchema, 
  CommentWebhookSchema,
  IssueWebhookSchema,
  NotificationType,
  OAuthHelper
} from '../utils/index.js';
import { IssueService } from '../services/IssueService.js';

interface RequestWithRawBody extends Request {
  rawBody?: string;
  rawBodyBuffer?: Buffer;
}

/**
 * Implementation of WebhookService using Express
 */
export class ExpressWebhookService extends WebhookService {
  private webhookSecret: string;
  private issueService: IssueService;
  private httpServer: HttpServer;
  private oauthHelper: OAuthHelper | null;
  private server: Server | null;

  /**
   * @param webhookSecret - Secret for verifying webhook requests
   * @param issueService - Service for issue operations
   * @param httpServer - HTTP server utility
   * @param oauthHelper - OAuth helper utility
   */
  constructor(
    webhookSecret: string, 
    issueService: IssueService, 
    httpServer: HttpServer = new HttpServer(), 
    oauthHelper: OAuthHelper | null = null
  ) {
    super();
    this.webhookSecret = webhookSecret;
    this.issueService = issueService;
    this.httpServer = httpServer;
    this.oauthHelper = oauthHelper;
    this.server = null;
  }
  
  /**
   * @inheritdoc
   */
  override verifySignature(req: RequestWithRawBody): boolean {
    const signature = req.headers['linear-signature'] as string;
    
    if (!signature) {
      console.log('No linear-signature header found');
      return false;
    }
    
    // Check for raw body in both buffer and string form
    if (!req.rawBodyBuffer && !req.rawBody) {
      console.error('No raw body available for signature verification. This is required!');
      return false;
    }
    
    try {
      // Use the raw request body exactly as received from Linear
      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      
      // Prefer buffer for binary consistency
      if (req.rawBodyBuffer) {
        hmac.update(req.rawBodyBuffer);
      } else {
        hmac.update(req.rawBody!);
      }
      
      const computedSignature = hmac.digest('hex');
      
      // Extra debug logging only if DEBUG_WEBHOOKS is true
      if (process.env.DEBUG_WEBHOOKS === 'true') {
        console.log(`Received signature: ${signature.substring(0, 8)}...${signature.substring(signature.length - 8)}`);
        console.log(`Computed signature: ${computedSignature.substring(0, 8)}...${computedSignature.substring(computedSignature.length - 8)}`);
      }
      
      // Check if signatures match
      const signatureMatches = (signature === computedSignature);
      
      if (!signatureMatches && process.env.DEBUG_WEBHOOKS === 'true') {
        console.log('❌ Signature mismatch. Check webhook secret configuration.');
      }
      
      return signatureMatches;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }
  
  /**
   * Process a legacy webhook event
   * @param type - The event type (Comment, Issue, etc.)
   * @param action - The action (create, update, etc.)
   * @param data - The validated event data
   * @returns Promise<void>
   */
  override async processEvent(type: string, action: string, data: any): Promise<void> {
    console.log(`Processing legacy event of type: ${type}/${action}`);
    
    // Check if we're authenticated before processing events that require API calls
    if (!this.issueService.getAuthStatus()) {
      console.log('⚠️ Received webhook event but not authenticated with Linear API.');
      console.log(`Webhook event ${type}/${action} ignored. Complete the OAuth flow first.`);
      return;
    }
    
    // Handle comment creation events
    if (type === 'Comment' && action === 'create') {
      // Additional validation for comment fields we need
      if (!data.issueId || !data.body) {
        console.error('Comment data missing required fields:', data);
        return;
      }
      
      // IMPORTANT: Check if this comment is from the agent itself to prevent infinite loops
      const agentUserId = this.issueService.userId;
      if (data.user?.id === agentUserId) {
        // Only log minimal information for agent's own comments
        if (process.env.DEBUG_SELF_WEBHOOKS === 'true') {
          console.log('⚠️ Ignoring comment from the agent itself (preventing infinite loop)');
        }
        return; // Skip processing this comment
      }
      
      await this.issueService.handleCommentEvent(data);
    }
    
    // Handle issue update events (for assignee changes, etc.)
    else if (type === 'Issue' && action === 'update') {
      if (!data.id || !data.identifier) {
        console.error('Issue update data missing required fields:', data);
        return;
      }
      
      await this.issueService.handleIssueUpdateEvent(data);
    }
    
    // Handle issue creation events
    else if (type === 'Issue' && action === 'create') {
      if (!data.id || !data.identifier || !data.title) {
        console.error('Issue create data missing required fields:', data);
        return;
      }
      
      await this.issueService.handleIssueCreateEvent(data);
    }
    
    // Log unhandled event types for analysis
    else {
      console.log(`Unhandled legacy webhook type: ${type}/${action}`);
      console.log('Data:', JSON.stringify(data, null, 2));
    }
  }
  
  /**
   * Process agent notification based on its type
   * @param action - The notification action type
   * @param data - The validated notification data
   * @returns Promise<void>
   */
  override async processAgentNotification(action: string, data: NotificationType): Promise<void> {
    // Basic log message - format depends on notification type
    // For agent settings notifications, there's no issue to mention
    if (data.type === 'agentAssignable') {
      console.log(`Processing ${action} agent settings notification`);
    } else {
      console.log(`Processing ${action} notification on issue ${data.issue?.identifier || data.issueId}`);
    }
    
    // Keep a concise log if not in debug mode
    if (process.env.DEBUG_WEBHOOKS === 'true') {
      // Log notification data details only in debug mode
      console.log('Notification data:', JSON.stringify(data, null, 2));
    }
    
    // Check if we're authenticated before processing events that require API calls
    if (!this.issueService.getAuthStatus()) {
      console.log('⚠️ Received agent notification but not authenticated with Linear API.');
      console.log(`Agent notification ${action} ignored. Complete the OAuth flow first.`);
      return;
    }
    
    // FIRST - Check if ANY notification is from the agent itself
    // Get the agent's userId from the issueService
    const agentUserId = this.issueService.userId;
    
    // This is a CRITICAL universal check to prevent infinite loops
    // We need to check BOTH the actor.id and comment.userId if they exist
    const hasComment = 'comment' in data && data.comment;
    if (
      (data.actor?.id === agentUserId) || 
      (hasComment && data.comment?.userId === agentUserId)
    ) {
      // Only log minimal information for agent's own notifications
      if (process.env.DEBUG_SELF_WEBHOOKS === 'true') {
        console.log('⚠️ Ignoring notification from the agent itself (preventing infinite loop)');
        console.log(`Agent ID: ${agentUserId}, Actor ID: ${data.actor?.id}, Comment User ID: ${hasComment ? data.comment?.userId : 'N/A'}`);
      }
      return; // Exit early, don't process this notification
    }
    
    // First check the notification type (this is more specific than action)
    if (data.type === 'agentAssignable') {
      console.log('Agent is now assignable to issues');
      // This is just a status update, no action needed
      return;
    }
    
    // Handle issue assigned to the agent
    if (data.type === 'issueAssignedToYou') {
      console.log(`Issue ${data.issue!.identifier} assigned to agent by ${data.actor!.name}`);
      const assignmentData = {
        issueId: data.issueId,
        issue: data.issue!,
        actor: data.actor!
      };
      await this.issueService.handleAgentAssignment(assignmentData);
      return;
    }
    
    // Handle different notification types based on action
    switch (action) {
      // Legacy notification types
      case 'mention':
        console.log('Agent was mentioned in a comment (legacy format)');
        await this.issueService.handleAgentMention(data);
        break;
        
      // Handle when agent is assigned to an issue
      case 'assigned':
        console.log('Agent was assigned to an issue');
        await this.issueService.handleAgentAssignment(data);
        break;
        
      // Handle when someone replies to agent's comment
      case 'reply':
        console.log('Someone replied to agent\'s comment');
        await this.issueService.handleAgentReply(data);
        break;
      
      // New Agent API notification types  
      case 'issueCommentMention':
        console.log('Agent was mentioned in a comment (Agent API format)');
        // Type guard to ensure we have the right data type
        if (data.type === 'issueCommentMention') {
          const mentionData = {
            commentId: data.commentId,
            comment: data.comment,
            issueId: data.issueId,
            issue: data.issue,
            actor: data.actor
          };
          await this.issueService.handleAgentMention(mentionData);
        }
        break;
        
      case 'issueAssignment':
        console.log('Agent was assigned to an issue (Agent API format)');
        const assignmentData = {
          issueId: data.issueId,
          issue: data.issue,
          actor: data.actor
        };
        await this.issueService.handleAgentAssignment(assignmentData);
        break;
      
      case 'issueCommentReply':
        console.log('Someone replied to agent\'s comment (Agent API format)');
        if (data.type === 'issueCommentReply') {
          const replyData = {
            commentId: data.commentId,
            comment: data.comment,
            issueId: data.issueId,
            issue: data.issue,
            actor: data.actor
          };
          await this.issueService.handleAgentReply(replyData);
        }
        break;
        
      case 'issueNewComment':
        console.log('New comment on an issue assigned to the agent');
        
        if (data.type === 'issueNewComment') {
          // Only process comments from other users (not from the agent)
          const newCommentData = {
            commentId: data.commentId,
            comment: data.comment,
            issueId: data.issueId,
            issue: data.issue,
            actor: data.actor
          };
          console.log(`New comment by ${data.actor!.name} on issue ${data.issue!.identifier}: ${data.comment!.body.substring(0, 100)}${data.comment!.body.length > 100 ? '...' : ''}`);
          
          // Check if comment mentions other users but not the agent
          // Get the agent's username from the issueService
          const agentUsername = this.issueService.username;
          const commentBody = data.comment?.body || '';
        
        // Check if comment contains any @ mentions
        const hasMentions = commentBody.includes('@');
        const mentionsAgent = agentUsername && commentBody.includes(`@${agentUsername}`);
        
        if (!hasMentions || mentionsAgent) {
          // Process if: no mentions at all OR agent is mentioned
          console.log(`Processing comment: ${!hasMentions ? 'no mentions' : `mentions agent @${agentUsername}`}`);
            await this.issueService.handleAgentMention(newCommentData);
          } else {
            // Skip if: has mentions but agent is NOT mentioned
            console.log(`Comment mentions other users but not agent @${agentUsername}, ignoring.`);
          }
        }
        break;

      case 'issueUnassignedFromYou':
        console.log('Agent was unassigned from an issue');
        // Handle the unassignment by terminating any active sessions
        await this.issueService.handleAgentUnassignment({
          issueId: data.issueId,
          issue: data.issue!,
          actor: data.actor!
        });
        break;
        
      // Log any other notification types for analysis
      default:
        console.log(`Unhandled agent notification type: ${action} (${data.type})`);
        console.log('Please analyze the data structure for implementation');
        break;
    }
  }
  
  /**
   * @inheritdoc
   */
  override async startServer(port: number): Promise<Server> {
    const app = this.httpServer.createServer();
    // Apply each middleware function individually
    const middlewares = this.httpServer.jsonParser();
    middlewares.forEach(middleware => app.use(middleware));
    
    // Webhook endpoint
    app.post('/webhook', (req: RequestWithRawBody, res: Response): void => {
      // First, ensure the body is parsed correctly
      if (!req.body) {
        console.error('Request body is undefined. This may indicate a JSON parsing error.');
        console.log('Raw body:', req.rawBody?.substring(0, 100) || 'Not available');
        res.status(400).send('Invalid JSON payload');
        return;
      }
      
      // Only log webhook event details if debug mode is enabled
      if (process.env.DEBUG_WEBHOOKS === 'true') {
        const eventType = req.body.type || 'Unknown';
        const eventAction = req.body.action || 'Unknown';
        console.log('Received webhook event:', eventType, eventAction);
        
        // Log selected headers for debugging
        const relevantHeaders = {
          'linear-event': req.headers['linear-event'],
          'linear-signature': req.headers['linear-signature'],
          'linear-delivery': req.headers['linear-delivery']
        };
        console.log('Linear headers:', relevantHeaders);
      }
      
      // Verify webhook signature
      if (!this.verifySignature(req)) {
        console.error('Invalid webhook signature');
        // For debugging, we'll accept the webhook even if signature validation fails
        console.log('WARNING: Accepting webhook despite invalid signature for debugging');
        // return res.status(401).send('Invalid signature');
      }
      
      // Only log full payload in debug mode
      if (process.env.DEBUG_WEBHOOKS === 'true') {
        console.log('===== WEBHOOK PAYLOAD =====');
        console.log(JSON.stringify(req.body, null, 2));
        console.log('===== END WEBHOOK PAYLOAD =====');
      }
      
      // Check if this is an Agent notification webhook (new "Inbox notifications" type)
      const isAgentNotification = req.body.type === "AppUserNotification";
      
      try {
        if (isAgentNotification) {
          // Only log detailed webhook info in debug mode
          if (process.env.DEBUG_WEBHOOKS === 'true') {
            console.log('Received Agent notification webhook');
          }
          
          // Validate the agent notification webhook payload against the schema
          const validationResult = AgentNotificationWebhookSchema.safeParse(req.body);
          
          if (!validationResult.success) {
            console.error('Agent notification webhook validation failed:');
            console.error(validationResult.error.format());
            res.status(400).send('Invalid webhook payload format');
            return;
          }
          
          const validatedPayload = validationResult.data;
          const action = validatedPayload.action;
          const notificationData = validatedPayload.notification;
          
          // Only log notification details if not from the agent itself
          // Quick check to avoid unnecessary logging
          const agentUserId = this.issueService.userId;
          const hasComment = 'comment' in notificationData && notificationData.comment;
          const isFromAgent = (notificationData.actor?.id === agentUserId) || 
                             (hasComment && notificationData.comment?.userId === agentUserId);
          
          if (!isFromAgent && process.env.DEBUG_WEBHOOKS === 'true') {
            const hasIssue = 'issue' in notificationData && notificationData.issue;
            const issueIdentifier = hasIssue ? notificationData.issue?.identifier : 'unknown';
            const actor = notificationData.actor?.name || 'unknown';
            console.log(`Agent notification: ${action} from ${actor} on issue ${issueIdentifier}`);
          }
          
          // Process the agent notification asynchronously
          this.processAgentNotification(action, notificationData).catch(error => {
            console.error('Error processing agent notification:', error);
          });
        } else {
          // Process legacy webhook event
          const type = req.body.type || 'unknown';
          const action = req.body.action || 'unknown';
          
          // Validate against the appropriate schema based on type
          let validatedData;
          
          if (type === 'Comment') {
            const validationResult = CommentWebhookSchema.safeParse(req.body);
            if (validationResult.success) {
              validatedData = validationResult.data.data;
            } else {
              console.error('Comment webhook validation failed:');
              console.error(validationResult.error.format());
            }
          } else if (type === 'Issue') {
            const validationResult = IssueWebhookSchema.safeParse(req.body);
            if (validationResult.success) {
              validatedData = validationResult.data.data;
            } else {
              console.error('Issue webhook validation failed:');
              console.error(validationResult.error.format());
            }
          }
          
          // If validation failed, fall back to the raw data (for backwards compatibility)
          const data = validatedData || req.body.data || {};
          
          console.log(`Processing legacy webhook: ${type}/${action}`);
          
          // Process the event asynchronously
          this.processEvent(type, action, data).catch(error => {
            console.error('Error processing webhook event:', error);
          });
        }
      } catch (error) {
        console.error('Error processing webhook payload:', error);
      }
      
      // Respond immediately to acknowledge receipt (recommended practice)
      res.status(200).send('Event received');
    });
    
    // Health check endpoint
    app.get('/health', (_req: Request, res: Response) => {
      res.status(200).send('Webhook server is running');
    });
    
    // Add OAuth endpoints if oauthHelper is available
    if (this.oauthHelper) {
      // Add a dashboard that shows authentication status and provides helpful links
      app.get('/', async (req: Request, res: Response) => {
        try {
          const authStatus = await this.oauthHelper!.hasValidToken();
          const linearClientStatus = this.issueService.getAuthStatus();
          
          let html = `
            <!DOCTYPE html>
            <html>
              <head>
                <title>Linear Claude Agent Dashboard</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; line-height: 1.6; }
                  h1 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; }
                  .status { margin: 20px 0; padding: 15px; border-radius: 5px; }
                  .success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
                  .error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
                  .warning { background-color: #fff3cd; color: #856404; border: 1px solid #ffeeba; }
                  .action { margin: 20px 0; }
                  .btn { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; 
                         text-decoration: none; border-radius: 4px; font-weight: bold; }
                  .btn-reset { background-color: #6c757d; }
                  .code { font-family: monospace; background-color: #f5f5f5; padding: 10px; border-radius: 3px; }
                </style>
              </head>
              <body>
                <h1>Linear Claude Agent Dashboard</h1>
          `;
          
          // Authentication status box
          if (authStatus && linearClientStatus) {
            html += `
              <div class="status success">
                <h2>✅ Authentication Status: Authenticated</h2>
                <p>Your Linear Claude Agent is successfully authenticated and running.</p>
              </div>
              <div class="action">
                <a class="btn" href="/health">Check Health</a>
                <a class="btn btn-reset" href="/oauth/reset">Reset Authentication</a>
              </div>
            `;
          } else if (authStatus) {
            html += `
              <div class="status warning">
                <h2>⚠️ Authentication Status: Token Valid but Not Working</h2>
                <p>You have a valid OAuth token, but there's an issue connecting to the Linear API. This could be due to permission issues or token scope problems.</p>
              </div>
              <div class="action">
                <a class="btn" href="/oauth/reset">Reset Authentication</a>
              </div>
            `;
          } else {
            html += `
              <div class="status error">
                <h2>❌ Authentication Status: Not Authenticated</h2>
                <p>You need to authenticate with Linear to use this agent.</p>
              </div>
              <div class="action">
                <a class="btn" href="/oauth/authorize">Authenticate with Linear</a>
              </div>
            `;
          }
          
          // Add webhook information
          html += `
            <h2>Webhook Information</h2>
            <p>For the Linear Agent API to work, you need to set up a webhook in Linear pointing to this server.</p>
            <div class="code">
              <p>Webhook URL: <strong>${req.protocol}://${req.get('host')}/webhook</strong></p>
              <p>Resource Types: Comments, Issues</p>
              <p>For Agent API: Enable "App User Notification" events</p>
            </div>
          `;
          
          html += `
              </body>
            </html>
          `;
          
          res.send(html);
        } catch (error) {
          console.error('Error rendering dashboard:', error);
          res.status(500).send('Error rendering dashboard: ' + (error as Error).message);
        }
      });
      
      // OAuth authorization endpoint - redirects to Linear
      app.get('/oauth/authorize', (_req: Request, res: Response) => {
        try {
          const authUrl = this.oauthHelper!.generateAuthorizationUrl();
          console.log(`Redirecting to Linear OAuth authorization URL: ${authUrl}`);
          res.redirect(authUrl);
        } catch (error) {
          console.error('Error generating OAuth URL:', error);
          res.status(500).send('Error setting up OAuth flow');
        }
      });
      
      // OAuth callback endpoint - handle the code from Linear
      app.get('/oauth/callback', async (req: Request, res: Response): Promise<void> => {
        try {
          const { code, state } = req.query as { code?: string; state?: string };
          
          if (!code) {
            res.status(400).send('Authorization code missing');
            return;
          }
          
          console.log(`Received OAuth callback with code: ${code.substring(0, 5)}...`);
          
          // Process the OAuth callback
          await this.oauthHelper!.handleCallback(code, state || '');
          
          console.log('OAuth flow completed successfully');
          
          // HTML response with auto-redirect to dashboard
          const html = `
            <!DOCTYPE html>
            <html>
              <head>
                <title>Authentication Successful</title>
                <meta http-equiv="refresh" content="3;url=/" />
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; line-height: 1.6; text-align: center; }
                  .success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; padding: 20px; border-radius: 5px; }
                </style>
              </head>
              <body>
                <div class="success">
                  <h1>✅ Authentication Successful!</h1>
                  <p>You have successfully authenticated with Linear.</p>
                  <p>Redirecting to dashboard in 3 seconds...</p>
                  <p><a href="/">Click here if you are not redirected automatically</a></p>
                </div>
              </body>
            </html>
          `;
          
          res.status(200).send(html);
          
          // Try to initialize the Linear client and fetch issues now
          console.log('Authentication successful! The agent will now attempt to use the new token.');
          try {
            // Attempt to fetch assigned issues to verify the token works and update auth status
            await this.issueService.fetchAssignedIssues();
            console.log('✅ Successfully initialized Linear client with new token!');
          } catch (initError) {
            console.error('Error initializing Linear client with new token:', initError);
            console.log('You may need to restart the application for the token to take effect.');
          }
        } catch (error) {
          console.error('Error handling OAuth callback:', error);
          const errorHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <title>Authentication Error</title>
                <meta http-equiv="refresh" content="5;url=/" />
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; line-height: 1.6; text-align: center; }
                  .error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; padding: 20px; border-radius: 5px; }
                </style>
              </head>
              <body>
                <div class="error">
                  <h1>⚠️ Authentication Error</h1>
                  <p>An error occurred during authentication: ${(error as Error).message}</p>
                  <p>Redirecting to dashboard in 5 seconds...</p>
                  <p><a href="/">Click here if you are not redirected automatically</a></p>
                </div>
              </body>
            </html>
          `;
          res.status(500).send(errorHtml);
        }
      });
      
      // OAuth reset endpoint - clear tokens and redirect to authorization
      app.get('/oauth/reset', async (req: Request, res: Response) => {
        try {
          console.log('Resetting OAuth tokens and starting new authorization flow');
          
          // Clear existing tokens
          await this.oauthHelper!.clearTokens();
          
          // Redirect to the authorization endpoint
          res.redirect('/oauth/authorize');
        } catch (error) {
          console.error('Error resetting OAuth:', error);
          res.status(500).send('Error resetting OAuth: ' + (error as Error).message);
        }
      });
      
      // OAuth status endpoint - check if we have valid tokens
      app.get('/oauth/status', async (req: Request, res: Response) => {
        try {
          const hasValidToken = await this.oauthHelper!.hasValidToken();
          res.json({
            authenticated: hasValidToken,
            authType: hasValidToken ? 'oauth' : 'none'
          });
        } catch (error) {
          console.error('Error checking OAuth status:', error);
          res.status(500).json({
            authenticated: false,
            error: (error as Error).message
          });
        }
      });
    }
    
    // Start the server
    try {
      this.server = await this.httpServer.listen(app, port);
      console.log(`Webhook server listening on port ${port}`);
      return this.server;
    } catch (error) {
      console.error('Failed to start webhook server:', error);
      throw error;
    }
  }
  
  /**
   * Close the server
   * @returns Promise<void>
   */
  async closeServer(): Promise<void> {
    try {
      await this.httpServer.close(this.server!);
      console.log('Webhook server closed');
      this.server = null;
    } catch (error) {
      console.error('Error closing webhook server:', error);
    }
  }
}