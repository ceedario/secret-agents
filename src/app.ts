import { createContainer } from './container.js';
import { Server } from 'http';

/**
 * Application class that orchestrates the components
 */
export class App {
  private container: ReturnType<typeof createContainer>;
  private webhookServer: Server | null;
  private isShuttingDown: boolean;

  constructor() {
    // Environment variables should already be loaded in index.mjs
    this.container = createContainer();
    this.webhookServer = null;
    this.isShuttingDown = false;
  }
  
  /**
   * Initialize the application
   */
  async init(): Promise<void> {
    // Validate configuration
    this.container.get('config').validate();
    
    // Set up workspace base directory
    const workspaceService = this.container.get('workspaceService');
    await workspaceService.setupBaseDir();
  }
  
  /**
   * Start the application
   */
  async start(): Promise<void> {
    try {
      // Initialize the application
      await this.init();
      
      // Get configuration
      const config = this.container.get('config');
      
      // Start webhook server first (needed for OAuth flow)
      const webhookService = this.container.get('webhookService');
      this.webhookServer = await webhookService.startServer(config.webhook.port);
      console.log(`✅ Webhook server listening on port ${config.webhook.port}`);
      
      try {
        // Try to start Linear agent - this may fail if not authenticated
        console.log('Attempting to start Linear agent...');
        const issueService = this.container.get('issueService');
        const issues = await issueService.fetchAssignedIssues();
        
        if (issues && issues.length > 0) {
          console.log(`Found ${issues.length} assigned issues. Checking for existing workspaces...`);
          issues.forEach((issue: any) => {
            // Pass true to indicate this is a startup initialization
            issueService.initializeIssueSession(issue, true).catch((err: any) => {
              console.error(`Failed to initialize session for issue ${issue.identifier}:`, err);
            });
          });
        } else {
          console.log('No assigned issues found. Agent is ready to receive new assignments.');
        }
        
        console.log(`✅ Linear agent started successfully.`);
      } catch (linearError) {
        // Log the error but don't shut down the application
        const error = linearError as Error;
        if (error.message && error.message.includes('Authentication required')) {
          // Authentication error - clean and friendly message
          console.log('\n──────────────────────────────────────────────────────────────────');
          console.log('⚠️  Authentication Required');
          console.log('──────────────────────────────────────────────────────────────────');
          console.log('The Linear agent needs authentication to access your Linear account.');
          console.log('The webhook server is still running, so you can complete the OAuth flow:');
          console.log('\n👉 Visit this URL in your browser to authenticate:');
          console.log(`👉 http://localhost:${config.webhook.port}/oauth/authorize`);
          console.log('\nAfter authentication, the agent will automatically use your credentials.');
          console.log('──────────────────────────────────────────────────────────────────\n');
        } else {
          // Other errors - more concise message
          console.error('Failed to start Linear agent:', error.message || String(linearError));
          console.log('\n⚠️ Linear agent failed to initialize, but webhook server is still running.');
          console.log('👉 Visit the dashboard to check status and authenticate:');
          console.log(`👉 http://localhost:${config.webhook.port}/\n`);
        }
        
        // Return early without throwing - the webhook server is still running
        return;
      }
      
      console.log(`✅ Application running successfully.`);
    } catch (error) {
      console.error('Failed to start application:', error);
      await this.shutdown();
      throw error;
    }
  }
  
  /**
   * Shut down the application
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    
    console.log('\nShutting down...');
    
    // Clean up worktrees
    // Uncomment when ready to implement
    // console.log('Cleaning up worktrees...');
    // const workspaceService = this.container.get('workspaceService');
    // await workspaceService.cleanupAllWorkspaces();
    
    // Close webhook server
    if (this.webhookServer) {
      console.log('Closing webhook server...');
      this.webhookServer.close();
    }
    
    console.log('Shutdown complete');
  }
}