#!/usr/bin/env node
require('dotenv').config();
const { startLinearAgent } = require('./src/linearAgent');
const { startWebhookServer } = require('./src/webhookServer');
const { setupWorkspaceBaseDir, cleanupAllWorktrees } = require('./src/workspace');

let webhookServer;
let isShuttingDown = false;

async function main() {
  // Say hi
  console.log('Hi!');
  
  // Validate required environment variables
  const requiredEnvVars = [
    'LINEAR_API_TOKEN',
    'LINEAR_USER_ID',
    'LINEAR_WEBHOOK_SECRET',
    'WEBHOOK_PORT',
    'CLAUDE_PATH',
    'WORKSPACE_BASE_DIR'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`Error: ${envVar} environment variable is required.`);
      console.error('Please check your .env file or environment setup.');
      process.exit(1);
    }
  }

  try {
    // Setup workspace base directory
    await setupWorkspaceBaseDir();

    // Start webhook server
    const port = parseInt(process.env.WEBHOOK_PORT, 10);
    webhookServer = await startWebhookServer(port);
    
    // Start Linear agent
    await startLinearAgent();

    console.log(`✅ Linear agent and webhook server started successfully.`);
    console.log(`Webhook server listening on port ${port}`);
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Graceful shutdown handler
async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log('\nShutting down...');
  
  // Clean up worktrees
  // console.log('Cleaning up worktrees...');
  // await cleanupAllWorktrees();
  
  // Close webhook server
  if (webhookServer) {
    console.log('Closing webhook server...');
    webhookServer.close();
  }
  
  console.log('Shutdown complete');
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGHUP', shutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  shutdown();
});

main();