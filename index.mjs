#!/usr/bin/env node
import { parseArgs } from 'node:util';

import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Get package.json for version info
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));

// Parse command line arguments first to get env file path
const options = {
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
  },
  version: {
    type: 'boolean',
    short: 'v',
    description: 'Show version'
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

// Show version if requested
if (values.version) {
  console.log(`${packageJson.name} v${packageJson.version}`);
  process.exit(0);
}

// Show help if requested
if (values.help) {
  console.log(`
Usage: linear-claude-agent [options]

Options:
  -e, --env-file <path>    Path to the environment file (default: .env.secret-agents)
  -h, --help               Show help
  -v, --version            Show version
`);
  process.exit(0);
}

// Load environment variables BEFORE importing App
dotenv.config({ path: values['env-file'] });

// Now import App after environment is loaded
const { App } = await import('./src/app.mjs');

// Create the application
const app = new App();
let isShuttingDown = false;

// Graceful shutdown handler
async function shutdown() {
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
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  shutdown();
});

// Start the application
app.start().catch(error => {
  console.error('Application failed to start:', error);
  process.exit(1);
});