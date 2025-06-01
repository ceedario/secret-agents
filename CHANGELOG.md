# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- TypeScript support for the entire codebase
  - Migrated all JavaScript files (.mjs) to TypeScript (.ts)
  - Added comprehensive type definitions for all classes and interfaces
  - Configured TypeScript with strict mode for better type safety
  - Added build script to compile TypeScript to JavaScript
  - Added TypeScript dependencies: typescript, ts-node, and type definitions
  - Created tsconfig.json with provided strict configuration
  - dist/ folder added to .gitignore for TypeScript build output
- Vitest as the new test runner, replacing Jest
  - Provides significantly faster test execution
  - Maintains full compatibility with existing test APIs
  - Includes built-in UI mode for test debugging with `pnpm run test:ui`
  - Native ES modules support without experimental flags
- Coverage folder to .gitignore to prevent test coverage reports from being tracked
- AttachmentDownloader class to handle all types of Linear attachments (not just images)
  - Supports downloading any file type from Linear's authenticated storage
  - Automatically detects file types and categorizes them as images or other attachments
  - Gracefully handles download failures with informative warnings
  - Replaces the previous ImageDownloader with a more comprehensive solution

### Changed  
- All source files from ES modules (.mjs) to TypeScript (.ts)
- Build output now goes to dist/ directory
- Package.json main entry point updated to dist/index.js
- Added TypeScript compilation step before running the application
- Dev script now uses ts-node to run TypeScript directly without compilation
- All test files migrated from .mjs to .ts
- Test configuration to use vitest with TypeScript support
- Updated all imports to use .js extensions as per TypeScript ES module standards
- Migrated from npm to pnpm package manager
  - Replaced package-lock.json with pnpm-lock.yaml
  - Updated all documentation to use pnpm commands
  - Updated GitHub Actions workflow to use pnpm
  - Added `packageManager` field to package.json for explicit pnpm version (10.11.0)
- Renamed and simplified GitHub Actions workflow
  - Renamed `tests.yml` to `ci.yml` to better reflect its purpose
  - Simplified workflow configuration for clarity
  - Updated badge reference in README.md
  - Switched to `wyvox/action-setup-pnpm` for consistent dependency installation
  - Added Node.js 22.x to the test matrix
  - Refactored dependency installation into a reusable GitHub Action
- Test runner from Jest to Vitest for improved performance
  - All test files updated to import from 'vitest' instead of '@jest/globals'
  - Mock functions migrated from `jest.*` to `vi.*` equivalents
  - Updated package.json test scripts to use vitest commands
  - Created vitest.config.mjs with minimal configuration using defaults
- CLI argument `--env-file`/`-e` to specify custom environment file
- Default environment file changed from `.env` to `.env.secret-agents`
- CLAUDE.md file with project conventions and guidelines for Claude Code assistant
- Updated attachment handling to support all file types, not just images
  - NodeClaudeService now uses AttachmentDownloader instead of ImageDownloader
  - Attachments are stored in `~/.linearsecretagent/<workspace>/attachments` directory
  - Claude configuration updated to allow reading from attachments directory only
  - Error messages now indicate when non-image attachments fail to process
- Branch naming now uses Linear's workspace-configured branch format
  - Fetches `branchName` property from Linear API
  - Respects workspace settings for branch naming conventions
  - Falls back to lowercase identifier if API value not available
- All entry points now support custom environment file paths
- Updated documentation to reflect new environment file behavior
- NodeClaudeService now downloads images before starting Claude sessions
- Fresh sessions after token limit also include previously downloaded images
- Agent now has better social awareness when reading Linear comments 🎭
  - Only responds to comments without @ mentions (general conversation)
  - Always responds when directly @ mentioned (someone needs the agent!)
  - Politely ignores when other users are @ mentioned but not the agent (respecting private conversations)
- Image storage location moved from project directory to home directory
  - Images are now stored in `~/.linearsecretagent/<workspace>/images` instead of `.linear-images` in project
  - Prevents workspace pollution and eliminates need to update `.gitignore`
  - Follows same pattern as conversation history storage
- Image file type detection from content
  - Automatically detects actual file type (png, jpg, gif, etc.) from downloaded content
  - No longer relies on URL extensions which Linear doesn't provide
  - Falls back to .png if file type cannot be determined

### Removed
- Jest test runner and related dependencies (@types/jest, jest-environment-node)
- Jest configuration file (jest.config.mjs) 
- Coverage folder from git tracking (now properly ignored)
- ImageDownloader class (replaced by AttachmentDownloader)
  - All image handling functionality is now provided by AttachmentDownloader
  - Removed ImageDownloader tests, exports, and container registration
- Experimental Node.js flags from test scripts

### Fixed
- TypeScript compilation errors in source files
  - Fixed import statements for Node.js built-in modules (crypto, os, path)
  - Added proper type annotations for parseArgs options
  - Fixed unused variable warnings (tokenInfo in ExpressWebhookService)
  - Removed unused imports (ChildProcessWithoutNullStreams, path)
  - Fixed error handling with proper type assertions
  - Updated tsconfig.json with ES2022 module and target for top-level await support
  - Added allowSyntheticDefaultImports for better module compatibility
- Agent now correctly identifies itself using its Linear username instead of "Claude"
  - Prompt template now uses dynamic `{{agent_name}}` placeholder
  - Agent name is fetched from Linear API and injected into prompts
  - Fallback to "Linear Agent" if username is not available
- Fixed issue where all attachments were treated as images
  - Non-image attachments (like .jsonl files) no longer cause "Could not process image" errors
  - Attachment failures are now handled gracefully without stopping the agent