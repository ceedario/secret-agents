# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### CLI
- cyrus-ai@0.1.10

### Added
- Added `CYRUS_OAUTH_CALLBACK_BASE_URL` environment variable to configure OAuth callback URL (defaults to `http://localhost:3457`) ([#69](https://github.com/ceedaragents/cyrus/pull/69))
- Added `CYRUS_OAUTH_CALLBACK_PORT` environment variable to configure OAuth callback port (defaults to `3457`)
- OAuth callback URL is now fully configurable for different deployment environments (Docker, remote development, custom domains)
- Supports `--env-file=path` option to load environment variables from custom file
- Added `CYRUS_WEBHOOK_BASE_URL` environment variable to configure webhook base URL for edge worker communication ([#74](https://github.com/ceedaragents/cyrus/pull/74))

### Changed
- **BREAKING**: Migrated from Server-Sent Events (SSE) to webhook-only architecture for edge worker communication ([#74](https://github.com/ceedaragents/cyrus/pull/74))
- Renamed repository setup script from `secretagentsetup.sh` to `cyrus-setup.sh` for better naming consistency
- Updated all references in codebase to use the new script name
- Added comprehensive documentation for the setup script feature in README.md

### Fixed
- Improved disconnection message formatting to show token suffix consistently
- Removed duplicate disconnection logging between EdgeWorker and CLI
- Resolved SSE connection reliability issues by migrating to webhook architecture

### Packages
- cyrus-ndjson-client

### Changed
- **BREAKING**: Complete rewrite from SSE-based to webhook-based architecture ([#74](https://github.com/ceedaragents/cyrus/pull/74))
- Implemented transport abstraction pattern with `BaseTransport` and `WebhookTransport` classes
- Added HMAC-SHA256 webhook signature verification for enhanced security
- Added support for custom webhook base URLs via `webhookBaseUrl` configuration option

### Added
- New `WebhookTransport` class with HTTP server for receiving webhook events
- New `BaseTransport` abstract class for future transport implementations  
- Added `webhookPort`, `webhookPath`, `webhookHost`, and `webhookBaseUrl` configuration options
- Enhanced retry logic with exponential backoff for webhook registration
- Comprehensive test suite rewritten for webhook architecture (15 tests)

### Removed
- **BREAKING**: Removed SSE transport entirely due to reliability issues
- Removed `reconnectOnStreamEnd` configuration option (no longer applicable with webhooks)

### Fixed
- Fixed all TypeScript compilation issues across packages
- Resolved port conflicts in test suite with dynamic port allocation

- cyrus-claude-runner

### Changed
- Upgraded @anthropic-ai/claude-code dependency to version 1.0.31

## [0.0.3] - 2025-06-17

### Packages
- cyrus-claude-runner@0.0.3
- cyrus-core@0.0.3
- cyrus-edge-worker@0.0.3
- cyrus-ndjson-client@0.0.3

Initial changelog entry

## [0.1.9] - 2025-06-17

### CLI
- cyrus-ai@0.1.9

Initial changelog entry
