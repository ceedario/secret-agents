#!/usr/bin/env node
import dotenv from 'dotenv';
import { parseArgs, ParseArgsConfig } from 'node:util';

// Parse command line arguments first to get env file path
const options: ParseArgsConfig['options'] = {
  'env-file': {
    type: 'string',
    short: 'e',
    default: '.env.secret-agents',
    description: 'Path to the environment file'
  },
  help: {
    type: 'boolean',
    short: 'h',
    description: 'Show help'
  }
};

let values: any;
try {
  const parsed = parseArgs({ options, allowPositionals: false });
  values = parsed.values;
} catch (err) {
  console.error(`Error: ${(err as Error).message}`);
  process.exit(1);
}

// Show help if requested
if (values.help) {
  console.log(`
Usage: linear-claude-agent [options]

Options:
  -e, --env-file <path>    Path to the environment file (default: .env.secret-agents)
  -h, --help               Show help
`);
  process.exit(0);
}

// Load environment variables BEFORE importing App
dotenv.config({ path: values['env-file'] });

// Now import App after environment is loaded
const { App } = await import('./app.js');

// Create the application
const app = new App();
let isShuttingDown = false;

// Graceful shutdown handler
async function shutdown(): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  await app.shutdown();
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGHUP', shutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught exception:', error);
  shutdown();
});

// Start the application
app.start().catch((error: Error) => {
  console.error('Application failed to start:', error);
  process.exit(1);
});