# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- CLI argument `--env-file`/`-e` to specify custom environment file
- Default environment file changed from `.env` to `.env.secret-agents`
- CLAUDE.md file with project conventions and guidelines for Claude Code assistant
- Image download functionality for Linear issue attachments
  - Automatically downloads images from issue descriptions and comments
  - Supports Linear's authenticated file storage URLs
  - Includes images in Claude Code prompt with local file paths
  - Implements 10 image hard cap limit to prevent token overflow
  - Posts warning to Linear when image limit is exceeded

### Changed
- All entry points now support custom environment file paths
- Updated documentation to reflect new environment file behavior
- NodeClaudeService now downloads images before starting Claude sessions
- Fresh sessions after token limit also include previously downloaded images
- Agent now has better social awareness when reading Linear comments 🎭
  - Only responds to comments without @ mentions (general conversation)
  - Always responds when directly @ mentioned (someone needs the agent!)
  - Politely ignores when other users are @ mentioned but not the agent (respecting private conversations)

### Fixed
- Improved attachment handling to properly distinguish images from other file types
  - Non-image attachments (e.g., .jsonl, .pdf, .csv) are now downloaded separately
  - Fixed "Could not process image" error when non-image files were treated as images
  - Attachment download failures are now non-fatal with warnings instead of blocking issue processing
  - Updated regex to properly parse attachment URLs in markdown format (e.g., `[Link](url)`)
  - Renamed `.linear-images` directory to `.linear-attachments` to reflect broader file type support