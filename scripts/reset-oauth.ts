#!/usr/bin/env node

/**
 * Utility script to reset OAuth tokens and other persistence files
 * Run with: node scripts/reset-oauth.mjs [--env-file <path>]
 */

import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';
import { parseArgs } from 'node:util';

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

// Get the workspace base directory from environment
const baseDir = process.env.WORKSPACE_BASE_DIR || './workspaces';

// Files to delete
const filesToDelete = [
  'oauth_token.json',
  'oauth_state.json'
];

async function resetOAuth() {
  console.log(`Clearing OAuth tokens from ${baseDir}...`);
  
  try {
    // Check if directory exists
    if (!fs.existsSync(baseDir)) {
      console.error(`Error: Directory ${baseDir} does not exist`);
      process.exit(1);
    }
    
    let deletedFiles = 0;
    
    // Delete each file
    for (const file of filesToDelete) {
      const filePath = path.join(baseDir, file);
      
      if (fs.existsSync(filePath)) {
        await fs.remove(filePath);
        console.log(`✅ Deleted ${filePath}`);
        deletedFiles++;
      } else {
        console.log(`File not found: ${filePath}`);
      }
    }
    
    if (deletedFiles > 0) {
      console.log(`\n✅ Successfully deleted ${deletedFiles} OAuth token files`);
      console.log('You can now restart the application to re-authorize with Linear');
    } else {
      console.log('No OAuth token files found to delete');
    }
  } catch (error) {
    console.error('Error clearing OAuth tokens:', error);
    process.exit(1);
  }
}

// Run the reset function
resetOAuth();