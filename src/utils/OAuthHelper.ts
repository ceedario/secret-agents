import * as crypto from 'crypto';
import fetch from 'node-fetch';
import { FileSystem } from './FileSystem.js';

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tokenStoragePath: string;
}

interface TokenInfo {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  obtainedAt?: number;
}

interface StateData {
  state: string;
  timestamp: number;
}

/**
 * Helper class for OAuth 2.0 functionality
 */
export class OAuthHelper {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private fileSystem: FileSystem;
  private tokenStoragePath: string;

  /**
   * @param config - Configuration object
   * @param fileSystem - File system utility
   */
  constructor(config: OAuthConfig, fileSystem = new FileSystem()) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri;
    this.fileSystem = fileSystem;
    this.tokenStoragePath = config.tokenStoragePath;
  }

  /**
   * Generate an authorization URL for Linear Agents API
   * @returns {string} - Authorization URL
   */
  generateAuthorizationUrl() {
    // Generate a random state parameter for security
    const state = crypto.randomBytes(16).toString('hex');
    
    // Store the state parameter for validation during callback
    this._saveState(state);
    
    // Build the authorization URL with required parameters
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'read,write,app:assignable,app:mentionable', // Include agent-specific scopes
      response_type: 'code',
      state: state,
      actor: 'app' // Required for agent apps
    });
    
    console.log(`Generated OAuth authorization URL with state: ${state}`);
    return `https://linear.app/oauth/authorize?${params.toString()}`;
  }
  
  /**
   * Handle the OAuth callback
   * @param {string} code - Authorization code
   * @param {string} state - State parameter from callback
   * @returns {Promise<Object>} - Access token information
   */
  async handleCallback(code: string, state: string): Promise<TokenInfo> {
    console.log('Handling OAuth callback');
    
    // Verify the state parameter to prevent CSRF attacks
    const savedState = await this._loadState();
    if (state !== savedState) {
      console.error('OAuth state mismatch, potential CSRF attack');
      throw new Error('Invalid state parameter');
    }
    
    // Exchange the authorization code for an access token
    const tokenResponse = await this._exchangeCodeForToken(code);
    
    // Save the token information
    await this._saveTokenInfo(tokenResponse);
    
    console.log('Successfully completed OAuth flow');
    return tokenResponse;
  }
  
  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code
   * @returns {Promise<Object>} - Token response
   * @private
   */
  private async _exchangeCodeForToken(code: string): Promise<TokenInfo> {
    console.log('Exchanging authorization code for access token');
    
    // For Linear API, we need to make a POST request to their token endpoint
    try {
      // Use the built-in fetch API or node-fetch in Node.js
      // Linear expects x-www-form-urlencoded format, not JSON
      const params = new URLSearchParams();
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);
      params.append('code', code);
      params.append('redirect_uri', this.redirectUri);
      params.append('grant_type', 'authorization_code');
      
      const response = await fetch('https://api.linear.app/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from Linear token endpoint:', errorText);
        throw new Error(`Failed to exchange code for token: ${response.status} ${response.statusText}`);
      }
      
      const tokenData = await response.json() as TokenInfo;
      console.log('Successfully received token response from Linear');
      
      return tokenData;
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      
      // For development/testing, provide a simulated token if real exchange fails
      if (process.env.NODE_ENV === 'development') {
        console.warn('WARNING: Using simulated token for development. This will not work in production!');
        return {
          access_token: 'simulated_access_token',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'simulated_refresh_token',
          scope: 'read,write,app:assignable,app:mentionable'
        };
      }
      
      throw error;
    }
  }
  
  /**
   * Refresh the access token using a refresh token
   * @returns {Promise<Object>} - New token information
   */
  async refreshToken() {
    console.log('Refreshing access token');
    
    // Load the current token information
    const tokenInfo = await this._loadTokenInfo();
    
    if (!tokenInfo || !tokenInfo.refresh_token) {
      console.warn('No refresh token available - this might be a long-lived token that does not need refreshing');
      
      // Check if the token is still valid by expiration time
      if (tokenInfo && tokenInfo.access_token && tokenInfo.expires_in) {
        const expiresAt = (tokenInfo.obtainedAt || 0) + (tokenInfo.expires_in * 1000);
        const now = Date.now();
        
        if (now < expiresAt) {
          console.log('Token still valid based on expiration time, skipping refresh');
          return tokenInfo;
        }
      }
      
      throw new Error('No refresh token available and token appears expired');
    }
    
    try {
      // Use the built-in fetch API or node-fetch in Node.js
      // Linear expects x-www-form-urlencoded format, not JSON
      const params = new URLSearchParams();
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);
      params.append('refresh_token', tokenInfo.refresh_token);
      params.append('grant_type', 'refresh_token');
      
      const response = await fetch('https://api.linear.app/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from Linear token refresh endpoint:', errorText);
        throw new Error(`Failed to refresh token: ${response.status} ${response.statusText}`);
      }
      
      const newTokenInfo = await response.json() as TokenInfo;
      console.log('Successfully received new token from Linear');
      
      // Save the new token information
      await this._saveTokenInfo(newTokenInfo);
      
      console.log('Successfully refreshed and saved access token');
      return newTokenInfo;
    } catch (error) {
      console.error('Error refreshing token:', error);
      
      // For development/testing, provide a simulated new token if real refresh fails
      if (process.env.NODE_ENV === 'development') {
        console.warn('WARNING: Using simulated refresh token for development. This will not work in production!');
        const newTokenInfo = {
          access_token: 'new_simulated_access_token',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'new_simulated_refresh_token',
          scope: 'read,write,app:assignable,app:mentionable'
        };
        
        // Save the simulated token information
        await this._saveTokenInfo(newTokenInfo);
        
        return newTokenInfo;
      }
      
      throw error;
    }
  }
  
  /**
   * Get the current access token
   * @returns {Promise<string>} - Access token
   */
  async getAccessToken() {
    try {
      const tokenInfo = await this._loadTokenInfo();
      
      if (!tokenInfo || !tokenInfo.access_token) {
        throw new Error('No access token available');
      }
      
      // Check if the token is expired (with a 5-minute buffer)
      const expiresAt = (tokenInfo.obtainedAt || 0) + (tokenInfo.expires_in * 1000);
      const now = Date.now();
      const bufferTime = 5 * 60 * 1000; // 5 minutes
      
      if (now + bufferTime > expiresAt) {
        try {
          console.log('Access token is expired or will expire soon, refreshing');
          const newTokenInfo = await this.refreshToken();
          return newTokenInfo.access_token;
        } catch (refreshError) {
          // If refresh fails and we have a very long-lived token, we might still be able to use it
          if (tokenInfo.expires_in > 31536000) { // More than 1 year
            console.warn('Refresh failed but token is long-lived, will try to use it anyway:', (refreshError as Error).message);
            return tokenInfo.access_token;
          }
          throw refreshError;
        }
      }
      
      console.log(`Using valid OAuth token (obtained at: ${new Date(tokenInfo.obtainedAt || 0).toISOString()}, expires at: ${new Date(expiresAt).toISOString()})`);
      return tokenInfo.access_token;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  }
  
  /**
   * Check if the token is available and valid
   * @returns {Promise<boolean>} - True if token is available and valid
   */
  async hasValidToken() {
    try {
      const tokenInfo = await this._loadTokenInfo();
      
      if (!tokenInfo || !tokenInfo.access_token) {
        console.log('No token available');
        return false;
      }
      
      // Check if the token has expired
      const expiresAt = (tokenInfo.obtainedAt || 0) + (tokenInfo.expires_in * 1000);
      const now = Date.now();
      
      if (now >= expiresAt) {
        console.log('Token has expired');
        return false;
      }
      
      if (!tokenInfo.token_type || tokenInfo.token_type.toLowerCase() !== 'bearer') {
        console.log('Token is not a Bearer token');
        return false;
      }
      
      // Log token expiration
      const expiresInMinutes = Math.floor((expiresAt - now) / 60000);
      console.log(`Token is valid (expires in ${expiresInMinutes} minutes)`);
      
      return true;
    } catch (error) {
      console.error('Error checking token validity:', error);
      return false;
    }
  }
  
  /**
   * Check if a token is valid by testing it against the API
   * @returns {Promise<boolean>} - True if the token is valid
   */
  async validateTokenWithApi() {
    try {
      const tokenInfo = await this._loadTokenInfo();
      
      if (!tokenInfo || !tokenInfo.access_token) {
        return false;
      }
      
      // Make a test request to the Linear API
      // Use the proper Authorization header format
      const tokenType = tokenInfo.token_type || 'Bearer';
      const formattedTokenType = tokenType.charAt(0).toUpperCase() + tokenType.slice(1).toLowerCase();
      
      console.log(`Testing token with API using Authorization: ${formattedTokenType} ***`);
      
      const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `${formattedTokenType} ${tokenInfo.access_token}`
        },
        body: JSON.stringify({
          query: `{ viewer { id name } }`
        })
      });
      
      const result = await response.json() as { data?: { viewer?: { id: string; name: string } }; errors?: any[] };
      
      // Check if there's a viewer property in the response
      if (result.data && result.data.viewer) {
        console.log(`Token validated with API - user: ${result.data.viewer.name} (ID: ${result.data.viewer.id})`);
        return true;
      }
      
      console.log('Token is invalid or lacks sufficient permissions');
      if (result.errors) {
        console.error('API errors:', result.errors);
      }
      
      return false;
    } catch (error) {
      console.error('Error validating token with API:', error);
      return false;
    }
  }
  
  /**
   * Save OAuth state to file
   * @param {string} state - State parameter
   * @private
   */
  private _saveState(state: string): void {
    const statePath = `${this.tokenStoragePath}/oauth_state.json`;
    const stateData = {
      state,
      timestamp: Date.now()
    };
    
    this.fileSystem.writeFileSync(
      statePath,
      JSON.stringify(stateData, null, 2)
    );
  }
  
  /**
   * Load OAuth state from file
   * @returns {Promise<string>} - Saved state parameter
   * @private
   */
  async _loadState() {
    const statePath = `${this.tokenStoragePath}/oauth_state.json`;
    
    try {
      if (await this.fileSystem.pathExists(statePath)) {
        const stateData = JSON.parse(
          await this.fileSystem.readFile(statePath, 'utf-8')
        );
        return stateData.state;
      }
    } catch (error) {
      console.error('Error loading OAuth state:', error);
    }
    
    return null;
  }
  
  /**
   * Save token information to file
   * @param {Object} tokenInfo - Token information
   * @private
   */
  private async _saveTokenInfo(tokenInfo: TokenInfo): Promise<void> {
    const tokenPath = `${this.tokenStoragePath}/oauth_token.json`;
    
    // Add the obtained timestamp
    const tokenData = {
      ...tokenInfo,
      obtainedAt: Date.now()
    };
    
    await this.fileSystem.writeFile(
      tokenPath,
      JSON.stringify(tokenData, null, 2)
    );
  }
  
  /**
   * Load token information from file
   * @returns {Promise<Object>} - Token information
   * @private
   */
  async _loadTokenInfo() {
    const tokenPath = `${this.tokenStoragePath}/oauth_token.json`;
    
    try {
      if (await this.fileSystem.pathExists(tokenPath)) {
        const tokenData = await this.fileSystem.readFile(tokenPath, 'utf-8');
        
        try {
          const parsedToken = JSON.parse(tokenData) as TokenInfo;
          
          // Validate that the token data is well-formed
          // Only access_token is absolutely required - refresh_token may not be present for long-lived tokens
          if (!parsedToken.access_token || !parsedToken.expires_in) {
            console.warn('Token file exists but contains invalid data (missing access_token or expires_in), removing it');
            await this.clearTokens();
            return null;
          }
          
          return parsedToken;
        } catch (parseError) {
          console.error('Error parsing token file, removing corrupt file:', parseError);
          await this.clearTokens();
          return null;
        }
      }
    } catch (error) {
      console.error('Error loading token information:', error);
    }
    
    return null;
  }
  
  /**
   * Clear all stored tokens (for logout or when tokens are invalid)
   * @returns {Promise<void>}
   */
  async clearTokens() {
    const tokenPath = `${this.tokenStoragePath}/oauth_token.json`;
    const statePath = `${this.tokenStoragePath}/oauth_state.json`;
    
    try {
      // Remove token file if it exists
      if (await this.fileSystem.pathExists(tokenPath)) {
        await this.fileSystem.remove(tokenPath);
        console.log('Removed token file');
      }
      
      // Remove state file if it exists
      if (await this.fileSystem.pathExists(statePath)) {
        await this.fileSystem.remove(statePath);
        console.log('Removed state file');
      }
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }
}