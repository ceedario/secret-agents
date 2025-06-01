import { LinearClient } from '@linear/sdk';

import { env } from './config/index.js';
import { 
  LinearIssueService, 
  FSWorkspaceService, 
  NodeClaudeService, 
  ExpressWebhookService 
} from './adapters/index.js';
import { SessionManager, ClaudeService, WorkspaceService } from './services/index.js';
import { FileSystem, ProcessManager, HttpServer, OAuthHelper, AttachmentDownloader } from './utils/index.js';

interface ServiceEntry<T = any> {
  factory: (container: Container) => T;
  instance: T | null;
}

/**
 * Simple dependency injection container
 */
export class Container {
  private services: Map<string, ServiceEntry>;

  constructor() {
    this.services = new Map<string, ServiceEntry>();
  }
  
  /**
   * Register a service with the container
   * @param name - Service name
   * @param factory - Factory function to create the service
   */
  register<T>(name: string, factory: (container: Container) => T): void {
    this.services.set(name, {
      factory,
      instance: null
    });
  }
  
  /**
   * Get a service from the container
   * @param name - Service name
   * @returns The service instance
   */
  get<T = any>(name: string): T {
    const service = this.services.get(name);
    
    if (!service) {
      throw new Error(`Service '${name}' not registered`);
    }
    
    if (!service.instance) {
      service.instance = service.factory(this);
    }
    
    return service.instance as T;
  }
}

/**
 * Create and configure the container
 * @returns The configured container
 */
export function createContainer(): Container {
  const container = new Container();
  
  // Register environment config
  container.register('config', () => env);
  
  // Register Linear client
  container.register('linearClient', (c) => {
    const config = c.get('config');
    const oauthHelper = c.get('oauthHelper');
    
    // Create a function to get the access token or fall back to API key
    const getAuthToken = async () => {
      // First try: Check if we have a valid OAuth token
      const hasValidOAuth = await oauthHelper.hasValidToken();
      
      if (hasValidOAuth) {
        try {
          // Validate token against the API (more reliable)
          const isApiValid = await oauthHelper.validateTokenWithApi();
          
          if (isApiValid) {
            const token = await oauthHelper.getAccessToken();
            console.log(`Successfully retrieved validated OAuth token: ****${token.slice(-4)}`);
            return { token, type: 'oauth' };
          } else {
            console.log('OAuth token is not valid with API, clearing token and falling back to API key');
            await oauthHelper.clearTokens(); // Clear the invalid token
          }
        } catch (oauthError) {
          console.error('Error validating OAuth token:', oauthError);
        }
      } else {
        console.log('No valid OAuth token available based on local check');
      }
      
      // Fall back to API key if OAuth fails or is not available
      if (config.linear.apiToken) {
        console.log('Using API key as fallback authentication');
        return { token: config.linear.apiToken, type: 'apiKey' };
      }
      
      // Last resort: try to use a personal access token if configured
      if (config.linear.personalAccessToken) {
        console.log('Using personal access token as last resort authentication');
        return { token: config.linear.personalAccessToken, type: 'personalAccessToken' };
      }
      
      throw new Error('No authentication method available (neither OAuth token nor API key)');
    };
    
    // Create a placeholder client (will be initialized with token later)
    let client: LinearClient | null = null;
    let authType: 'oauth' | 'apiKey' | null = null;
    let lastInitTime = 0;
    
    // Return a proxy that initializes the client on first use
    return new Proxy({}, {
      get(target, prop, receiver) {
        // Intercept the function call
        return async function(...args: any[]) {
          const now = Date.now();
          
          // Initialize the client if needed or if it's been more than 5 minutes
          if (!client || (now - lastInitTime > 5 * 60 * 1000)) {
            console.log('Initializing Linear client with authentication...');
            
            try {
              // Get the auth info (token and type)
              const authInfo = await getAuthToken();
              authType = authInfo.type as 'oauth' | 'apiKey';
              
              console.log(`Using ${authInfo.type === 'oauth' ? 'OAuth Access Token' : 'API Key'} (masked): ****${authInfo.token.slice(-4)}`);
              
              // Create the client with the appropriate authentication
              if (authInfo.type === 'apiKey') {
                client = new LinearClient({
                  apiKey: authInfo.token
                });
              } else if (authInfo.type === 'personalAccessToken') {
                // Personal access tokens use the same parameter as OAuth access tokens
                client = new LinearClient({
                  accessToken: authInfo.token
                });
              } else { // OAuth token
                client = new LinearClient({
                  accessToken: authInfo.token
                });
              }
              
              lastInitTime = now;
              console.log('Linear client successfully initialized');
              
              // Test connection with a simple query
              try {
                console.log('Testing Linear API connection...');
                await client.viewer;
                console.log('✅ Linear API connection test successful');
              } catch (testError: any) {
                // Check if this is an authentication error (most common when setting up)
                if (testError.type === 'AuthenticationError' || 
                    (testError.raw && testError.raw.message && testError.raw.message.includes('Authentication required'))) {
                  console.log('⚠️ Authentication required: Token validation failed');
                  // Reset client to force re-initialization on next call
                  client = null;
                  throw new Error('Authentication required. Please complete the OAuth flow.');
                } else {
                  // For other errors, log a simplified message
                  console.error('❌ Linear API connection test failed:', testError.message || String(testError));
                  // Reset client to force re-initialization on next call
                  client = null;
                  throw new Error('Linear API connection test failed');
                }
              }
            } catch (error: any) {
              // Simplified error message for authentication issues
              if (error.message && error.message.includes('Authentication required')) {
                console.log('⚠️ Linear authentication needed. Please complete the OAuth flow.');
                throw new Error('Authentication required. Please complete the OAuth flow.');
              } else if (error.message && error.message.includes('No authentication method available')) {
                console.log('⚠️ No authentication credentials found. Please set up Linear authentication.');
                throw new Error('No authentication credentials available. Please check your configuration.');
              } else {
                // For other errors, provide a concise message
                console.error('Failed to initialize Linear client:', error.message || String(error));
                throw new Error('Failed to initialize Linear client');
              }
            }
          }
          
          // Get the method from the actual client
          const method = (client as any)[prop];
          
          if (typeof method !== 'function') {
            return method;
          }
          
          // Log the API call - condensed format
          console.log(`Linear API (${authType}): ${String(prop)}${args.length > 0 ? ' with params' : ''}`);
          
          // Only log detailed arguments if DEBUG_LINEAR_API is true
          if (process.env.DEBUG_LINEAR_API === 'true' && args.length > 0) {
            console.log('Arguments:', JSON.stringify(args, null, 2));
          }
          
          try {
            // Call the method and return the result
            const result = await method.apply(client, args);
            // Minimal success logging
            return result;
          } catch (error: any) {
            // Simplified error logging
            const errorMessage = error.message || String(error);
            console.error(`Linear API error in ${String(prop)}: ${errorMessage.substring(0, 150)}`);
            
            // If the error is an authentication error, reset the client to force re-initialization
            if (error.type === 'AuthenticationError') {
              console.log('Authentication error detected, will re-initialize client on next call');
              client = null;
            }
            
            // Detailed error logging only in debug mode
            if (process.env.DEBUG_LINEAR_API === 'true') {
              console.error('Full error details:', error);
            }
            
            throw error;
          }
        };
      }
    });
  });
  
  // Register session manager
  container.register('sessionManager', () => new SessionManager());
  
  // Register utilities
  container.register('fileSystem', () => new FileSystem());
  container.register('processManager', () => new ProcessManager());
  container.register('httpServer', () => new HttpServer());
  
  // Register OAuth helper
  container.register('oauthHelper', (c) => {
    const config = c.get('config');
    const fileSystem = c.get('fileSystem');
    
    return new OAuthHelper({
      clientId: config.linear.oauthClientId,
      clientSecret: config.linear.oauthClientSecret,
      redirectUri: config.linear.oauthRedirectUri,
      tokenStoragePath: config.workspace.baseDir
    }, fileSystem);
  });
  
  // Register attachment downloader
  container.register('attachmentDownloader', (c) => {
    const linearClient = c.get('linearClient');
    const fileSystem = c.get('fileSystem');
    const oauthHelper = c.get('oauthHelper');
    
    return new AttachmentDownloader(linearClient, fileSystem, oauthHelper);
  });
  
  // Register workspace service
  container.register('workspaceService', (c) => {
    const config = c.get('config');
    const fileSystem = c.get('fileSystem');
    const processManager = c.get('processManager');
    return new FSWorkspaceService(
      config.workspace.baseDir,
      fileSystem,
      processManager,
      config.workspace.mainBranch
    );
  });
  
  // Register issue service - circular dependency is resolved at runtime
  container.register('issueService', (c) => {
    const linearClient = c.get('linearClient');
    const sessionManager = c.get('sessionManager');
    
    // These will be lazy-loaded when needed to avoid circular dependencies
    const claudeService = () => c.get('claudeService');
    const workspaceService = () => c.get('workspaceService');
    
    // Create the service with placeholder ID - will be updated after API fetch
    const service = new LinearIssueService(
      linearClient, 
      null, // userId will be fetched from API instead of config
      sessionManager,
      {
        startSession: (...args: any[]) => claudeService().startSession(...args),
        sendComment: (...args: any[]) => claudeService().sendComment(...args),
        postResponseToLinear: (...args: any[]) => claudeService().postResponseToLinear(...args),
        buildInitialPrompt: (...args: any[]) => claudeService().buildInitialPrompt(...args)
      } as ClaudeService,
      {
        getWorkspaceForIssue: (...args: any[]) => workspaceService().getWorkspaceForIssue(...args),
        createWorkspace: (...args: any[]) => workspaceService().createWorkspace(...args)
      } as WorkspaceService
    );
    
    // Set up a method to fetch user data from the API
    (service as any).fetchUserData = async () => {
      try {
        console.log('Fetching agent user data from Linear API...');
        
        // Try getting organization information first
        const organization = await linearClient.organization;
        console.log(`Connected to Linear organization: ${organization.name || 'Unknown'}`);
        
        // Now get the viewer information
        try {
          const viewer = await linearClient.viewer;
          
          if (viewer && viewer.id) {
            service.userId = viewer.id;
            service.username = viewer.name;
            console.log(`Updated agent details from API - user: ${viewer.name} (ID: ${viewer.id})`);
            return true;
          } else {
            console.error('Viewer data returned from API but missing ID - will try different approach');
          }
        } catch (viewerError) {
          console.error('Error fetching viewer data:', viewerError instanceof Error ? viewerError.message : String(viewerError));
        }
        
        // If viewer approach fails, try getting all users
        console.log('Attempting to fetch agent details from users list...');
        try {
          const users = await linearClient.users();
          
          // Look for a user that has "Agent" or "Bot" in the name
          const agentUser = users.nodes.find((user: any) => 
            user.name && (
              user.name.includes('Agent') || 
              user.name.includes('Bot') || 
              user.name.toLowerCase().includes('agent') ||
              user.name.toLowerCase().includes('bot')
            )
          );
          
          if (agentUser) {
            service.userId = agentUser.id;
            service.username = agentUser.name;
            console.log(`Found agent user in users list: ${agentUser.name} (ID: ${agentUser.id})`);
            return true;
          }
          
          // If no agent found, use the first user as a fallback (not ideal)
          if (users.nodes.length > 0) {
            const firstUser = users.nodes[0];
            service.userId = firstUser.id;
            service.username = firstUser.name;
            console.log(`Using first user as fallback: ${firstUser.name} (ID: ${firstUser.id})`);
            console.warn('Warning: Had to use first user in list as agent ID. Verify this is correct!');
            return true;
          }
          
          console.error('No users found in the organization');
          return false;
        } catch (usersError: any) {
          console.error('Error fetching users list:', usersError.message);
          return false;
        }
      } catch (error: any) {
        console.error('Error fetching user data from Linear API:', error.message);
        return false;
      }
    };
    
    return service;
  });
  
  // Register Claude service
  container.register('claudeService', (c) => {
    const config = c.get('config');
    const issueService = c.get('issueService');
    const fileSystem = c.get('fileSystem');
    const processManager = c.get('processManager');
    const attachmentDownloader = c.get('attachmentDownloader');
    
    return new NodeClaudeService(
      config.claude.path,
      config.claude.promptTemplatePath,
      {
        createComment: (...args: any[]) => issueService.createComment(...args),
        userId: issueService.userId,
        username: issueService.username,
        getAuthStatus: () => issueService.getAuthStatus(),
        fetchAssignedIssues: () => issueService.fetchAssignedIssues(),
        initializeIssueSession: (...args: any[]) => issueService.initializeIssueSession(...args),
        handleAgentAssignment: (...args: any[]) => issueService.handleAgentAssignment(...args),
        handleAgentMention: (...args: any[]) => issueService.handleAgentMention(...args),
        handleAgentReply: (...args: any[]) => issueService.handleAgentReply(...args),
        handleCommentEvent: (...args: any[]) => issueService.handleCommentEvent(...args),
        handleSessionExit: (...args: any[]) => issueService.handleSessionExit(...args),
        postResponseToLinear: (...args: any[]) => issueService.postResponseToLinear(...args),
        postResponseToLinearAsync: (...args: any[]) => issueService.postResponseToLinearAsync(...args)
      } as any,
      fileSystem,
      processManager,
      attachmentDownloader
    );
  });
  
  // Register webhook service
  container.register('webhookService', (c) => {
    const config = c.get('config');
    const issueService = c.get('issueService');
    const httpServer = c.get('httpServer');
    const oauthHelper = c.get('oauthHelper');
    
    return new ExpressWebhookService(
      config.linear.webhookSecret,
      issueService,
      httpServer,
      oauthHelper
    );
  });
  
  return container;
}