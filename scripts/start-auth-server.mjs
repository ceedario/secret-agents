#!/usr/bin/env node

/**
 * Utility script to start just the OAuth authorization server
 * Run with: node scripts/start-auth-server.mjs [--env-file <path>]
 */

import { parseArgs } from 'node:util';

import dotenv from 'dotenv';
import express from 'express';
import fetch from 'node-fetch'; // Ensure node-fetch is used in Node.js environment

import { FileSystem } from '../src/utils/FileSystem.mjs';
import { OAuthHelper } from '../src/utils/OAuthHelper.mjs';

// Parse command line arguments
const options = {
  'env-file': {
    type: 'string',
    short: 'e',
    default: '.env.secret-agents',
    description: 'Path to the environment file'
  }
};

let values;
try {
  const parsed = parseArgs({ options, allowPositionals: false });
  values = parsed.values;
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}

// Load environment variables from the specified file
dotenv.config({ path: values['env-file'] });

// Initialize dependencies
const fileSystem = new FileSystem();
const oauthHelper = new OAuthHelper({
  clientId: process.env.LINEAR_OAUTH_CLIENT_ID,
  clientSecret: process.env.LINEAR_OAUTH_CLIENT_SECRET,
  redirectUri: process.env.LINEAR_OAUTH_REDIRECT_URI,
  tokenStoragePath: process.env.WORKSPACE_BASE_DIR || './workspaces'
}, fileSystem);

// Configuration validation
function validateConfig() {
  const requiredVars = [
    'LINEAR_OAUTH_CLIENT_ID',
    'LINEAR_OAUTH_CLIENT_SECRET',
    'LINEAR_OAUTH_REDIRECT_URI',
    'WORKSPACE_BASE_DIR'
  ];
  
  const missing = [];
  for (const envVar of requiredVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

async function startServer() {
  try {
    // Validate configuration
    validateConfig();
    
    // Create Express app
    const app = express();
    const port = process.env.AUTH_SERVER_PORT || 3000;
    
    // OAuth authorization endpoint
    app.get('/oauth/authorize', (req, res) => {
      try {
        const authUrl = oauthHelper.generateAuthorizationUrl();
        console.log(`Redirecting to Linear OAuth authorization URL: ${authUrl}`);
        res.redirect(authUrl);
      } catch (error) {
        console.error('Error generating OAuth URL:', error);
        res.status(500).send('Error setting up OAuth flow: ' + error.message);
      }
    });
    
    // OAuth callback endpoint
    app.get('/oauth/callback', async (req, res) => {
      try {
        const { code, state } = req.query;
        
        if (!code) {
          return res.status(400).send('Authorization code missing');
        }
        
        console.log(`Received OAuth callback with code: ${code.substring(0, 5)}...`);
        
        // Process the OAuth callback
        const tokenInfo = await oauthHelper.handleCallback(code, state);
        
        console.log('OAuth flow completed successfully');
        res.status(200).send(`
          <html>
            <head>
              <title>Authentication Successful</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .success { color: green; font-size: 24px; }
                .container { max-width: 600px; margin: 0 auto; }
                .note { margin-top: 30px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1 class="success">Authentication Successful!</h1>
                <p>Your Linear OAuth token has been saved successfully.</p>
                <p>You can now close this window and restart the main application.</p>
                <div class="note">
                  <p>Token details:</p>
                  <ul style="text-align: left;">
                    <li>Token type: ${tokenInfo.token_type}</li>
                    <li>Expires in: ${tokenInfo.expires_in} seconds</li>
                    <li>Scopes: ${tokenInfo.scope}</li>
                  </ul>
                </div>
              </div>
            </body>
          </html>
        `);
      } catch (error) {
        console.error('Error handling OAuth callback:', error);
        res.status(500).send(`
          <html>
            <head>
              <title>Authentication Error</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .error { color: red; font-size: 24px; }
                .container { max-width: 600px; margin: 0 auto; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1 class="error">Authentication Error</h1>
                <p>There was an error processing your OAuth callback:</p>
                <pre>${error.message}</pre>
              </div>
            </body>
          </html>
        `);
      }
    });
    
    // OAuth reset endpoint
    app.get('/oauth/reset', async (req, res) => {
      try {
        console.log('Resetting OAuth tokens and starting new authorization flow');
        
        // Clear existing tokens
        await oauthHelper.clearTokens();
        
        // Redirect to the authorization endpoint
        res.redirect('/oauth/authorize');
      } catch (error) {
        console.error('Error resetting OAuth:', error);
        res.status(500).send('Error resetting OAuth: ' + error.message);
      }
    });
    
    // OAuth status endpoint
    app.get('/oauth/status', async (req, res) => {
      try {
        const hasValidToken = await oauthHelper.hasValidToken();
        const isApiValid = hasValidToken ? await oauthHelper.validateTokenWithApi() : false;
        
        res.json({
          hasValidToken,
          isApiValid,
          authType: isApiValid ? 'oauth' : 'none'
        });
      } catch (error) {
        console.error('Error checking OAuth status:', error);
        res.status(500).json({
          hasValidToken: false,
          isApiValid: false,
          error: error.message
        });
      }
    });
    
    // Start server
    app.listen(port, () => {
      console.log(`
========================================================
  Linear OAuth Authorization Server
========================================================
Server running at: http://localhost:${port}

Available endpoints:
- To authorize with Linear: http://localhost:${port}/oauth/authorize
- To reset tokens and reauthorize: http://localhost:${port}/oauth/reset
- To check token status: http://localhost:${port}/oauth/status

The OAuth callback will be automatically handled.

After successful authorization, you can start the main
application which will use the saved token.
========================================================
`);
    });
  } catch (error) {
    console.error('Failed to start authorization server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();