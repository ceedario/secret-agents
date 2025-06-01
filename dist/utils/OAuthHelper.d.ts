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
/**
 * Helper class for OAuth 2.0 functionality
 */
export declare class OAuthHelper {
    private clientId;
    private clientSecret;
    private redirectUri;
    private fileSystem;
    private tokenStoragePath;
    /**
     * @param config - Configuration object
     * @param fileSystem - File system utility
     */
    constructor(config: OAuthConfig, fileSystem?: FileSystem);
    /**
     * Generate an authorization URL for Linear Agents API
     * @returns {string} - Authorization URL
     */
    generateAuthorizationUrl(): string;
    /**
     * Handle the OAuth callback
     * @param {string} code - Authorization code
     * @param {string} state - State parameter from callback
     * @returns {Promise<Object>} - Access token information
     */
    handleCallback(code: string, state: string): Promise<TokenInfo>;
    /**
     * Exchange authorization code for access token
     * @param {string} code - Authorization code
     * @returns {Promise<Object>} - Token response
     * @private
     */
    private _exchangeCodeForToken;
    /**
     * Refresh the access token using a refresh token
     * @returns {Promise<Object>} - New token information
     */
    refreshToken(): Promise<TokenInfo | {
        access_token: string;
        token_type: string;
        expires_in: number;
        refresh_token: string;
        scope: string;
    }>;
    /**
     * Get the current access token
     * @returns {Promise<string>} - Access token
     */
    getAccessToken(): Promise<string>;
    /**
     * Check if the token is available and valid
     * @returns {Promise<boolean>} - True if token is available and valid
     */
    hasValidToken(): Promise<boolean>;
    /**
     * Check if a token is valid by testing it against the API
     * @returns {Promise<boolean>} - True if the token is valid
     */
    validateTokenWithApi(): Promise<boolean>;
    /**
     * Save OAuth state to file
     * @param {string} state - State parameter
     * @private
     */
    private _saveState;
    /**
     * Load OAuth state from file
     * @returns {Promise<string>} - Saved state parameter
     * @private
     */
    _loadState(): Promise<any>;
    /**
     * Save token information to file
     * @param {Object} tokenInfo - Token information
     * @private
     */
    private _saveTokenInfo;
    /**
     * Load token information from file
     * @returns {Promise<Object>} - Token information
     * @private
     */
    _loadTokenInfo(): Promise<TokenInfo | null>;
    /**
     * Clear all stored tokens (for logout or when tokens are invalid)
     * @returns {Promise<void>}
     */
    clearTokens(): Promise<void>;
}
export {};
