# Prompt Locations Inventory for CEA-136

## Executive Summary

This document provides a comprehensive inventory of all prompt-related locations in the Cyrus codebase, identifying template files, configuration options, inline prompts, and customization mechanisms. This analysis is for issue CEA-136 about iterating on the agent prompt system.

## Primary Prompt Template Files

### 1. Main Template (Active)
- **File**: `/packages/edge-worker/prompt-template.md`
- **Status**: ✅ Active - Primary template used by EdgeWorker
- **Purpose**: Default prompt template for all issue assignments
- **Usage**: Loaded by `EdgeWorker.buildInitialPrompt()` method
- **Size**: 116 lines, ~4.5KB
- **Key Features**:
  - Situation 1 (Execute) vs Situation 2 (Clarify) logic
  - Comprehensive variable substitution ({{repository_name}}, {{issue_id}}, etc.)
  - TodoWrite tool integration instructions
  - Pull request creation workflow
  - Final summary requirement

### 2. Legacy Template (Deprecated)
- **File**: `/apps/cli/agent-prompt-template.md`
- **Status**: ⚠️ Deprecated - Not actively used
- **Purpose**: Older version of prompt template
- **Usage**: Referenced in CLI examples but overridden by EdgeWorker
- **Size**: 35 lines, ~1.8KB
- **Key Features**:
  - Simpler structure without TodoWrite integration
  - Basic situation detection
  - Less comprehensive variable substitution

### 3. Example Template (Documentation)
- **File**: `/packages/edge-worker/examples/custom-prompt.md`
- **Status**: 📚 Documentation - Example for custom templates
- **Purpose**: Demonstrates custom template structure
- **Usage**: Referenced in README and examples
- **Size**: 23 lines, ~0.6KB
- **Key Features**:
  - Minimal template showing basic structure
  - Demonstrates variable substitution syntax
  - Used for documentation purposes

## Configuration System

### 1. Repository-Level Configuration (Active)
- **Interface**: `RepositoryConfig.promptTemplatePath`
- **File**: `/packages/edge-worker/src/types.ts` (line 29)
- **Status**: ✅ Active - Per-repository template override
- **Priority**: Highest (overrides global settings)
- **Usage**: Allows different templates for different repositories
- **Example**: `repositories.example.json` shows usage

### 2. Global Configuration (Active)
- **Interface**: `EdgeWorkerConfig.features.promptTemplatePath`
- **File**: `/packages/edge-worker/src/types.ts` (line 79)
- **Status**: ✅ Active - Global template override
- **Priority**: Medium (overrides built-in, overridden by repository-level)
- **Usage**: Sets default template for all repositories

### 3. CLI Configuration Override (Active)
- **Implementation**: `/apps/cli/app.ts` (lines 78-87)
- **Status**: ✅ Active - CLI strips custom templates
- **Behavior**: Intentionally removes `promptTemplatePath` from loaded configs
- **Purpose**: Forces use of built-in template in CLI app
- **Note**: This is a deliberate design choice to ensure consistency

## Template Loading Logic

### 1. Primary Loading Function (Active)
- **Function**: `EdgeWorker.buildInitialPrompt()`
- **File**: `/packages/edge-worker/src/EdgeWorker.ts` (lines 769-878)
- **Status**: ✅ Active - Core template processing
- **Logic**:
  1. Repository-specific template (`repository.promptTemplatePath`)
  2. Global template (`this.config.features?.promptTemplatePath`)
  3. Built-in template (`../prompt-template.md`)
  4. Fallback hardcoded template (lines 863-877)

### 2. Variable Substitution System (Active)
- **Location**: `EdgeWorker.buildInitialPrompt()` (lines 831-844)
- **Status**: ✅ Active - Template variable replacement
- **Variables Supported**:
  - `{{repository_name}}` - Repository display name
  - `{{issue_id}}` - Linear issue ID
  - `{{issue_title}}` - Issue title
  - `{{issue_description}}` - Full issue description
  - `{{issue_state}}` - Current issue state name
  - `{{issue_priority}}` - Priority level
  - `{{issue_url}}` - Direct Linear issue URL
  - `{{comment_history}}` - All previous comments
  - `{{latest_comment}}` - Most recent comment
  - `{{working_directory}}` - Current working directory
  - `{{base_branch}}` - Base git branch
  - `{{branch_name}}` - Issue-specific branch name

### 3. Comment History Integration (Active)
- **Location**: `EdgeWorker.buildInitialPrompt()` (lines 798-828)
- **Status**: ✅ Active - Fetches and formats comment history
- **Features**:
  - Fetches all issue comments via Linear API
  - Resolves user information for each comment
  - Formats with timestamps and author names
  - Handles missing or empty comment history

## Environment Variables

### 1. Debug Variables (Active)
- **Variable**: `DEBUG_EDGE`
- **File**: `/packages/edge-worker/src/EdgeWorker.ts` (line 111)
- **Status**: ✅ Active - Debug logging control
- **Purpose**: Enables heartbeat logging for NDJSON connections
- **Usage**: Set to 'true' for verbose logging

### 2. CLI Environment Variables (Active)
- **Variables**: Various CYRUS_* environment variables
- **File**: `/apps/cli/app.ts`
- **Status**: ✅ Active - CLI configuration
- **Variables**:
  - `CYRUS_BASE_URL` - Base URL for OAuth callbacks
  - `CYRUS_WEBHOOK_PORT` - Legacy webhook port
  - `CYRUS_SERVER_PORT` - Server port for webhooks/OAuth
  - `CYRUS_HOST_EXTERNAL` - External host binding (0.0.0.0)
  - `PROXY_URL` - Proxy server URL
  - `ALLOWED_TOOLS` - Default allowed tools list
  - `LINEAR_OAUTH_TOKEN` - Direct Linear token
  - `LINEAR_WORKSPACE_ID` - Direct workspace ID

### 3. No Prompt-Specific Environment Variables
- **Status**: ❌ None found
- **Note**: No environment variables directly control prompt templates or content

## Claude Runner Integration

### 1. System Prompt Support (Available)
- **Interface**: `ClaudeRunnerConfig.systemPrompt`
- **File**: `/packages/claude-runner/src/types.ts` (line 9)
- **Status**: ⚠️ Available but unused by EdgeWorker
- **Purpose**: Allows setting system prompt for Claude sessions
- **Usage**: Not currently used by EdgeWorker implementation

### 2. Template vs System Prompt Relationship
- **Current**: EdgeWorker uses initial message (not system prompt)
- **Method**: `runner.start(prompt)` sends prompt as first user message
- **Location**: `/packages/edge-worker/src/EdgeWorker.ts` (line 396)
- **Alternative**: Could use `systemPrompt` in ClaudeRunnerConfig

## Inline Prompts and Hardcoded Text

### 1. Fallback Prompt (Active)
- **Location**: `/packages/edge-worker/src/EdgeWorker.ts` (lines 863-877)
- **Status**: ✅ Active - Emergency fallback
- **Purpose**: Used when template loading fails
- **Content**: Basic hardcoded prompt with variable substitution
- **Trigger**: Template file read errors or parsing failures

### 2. Comment Templates (Active)
- **Initial Assignment**: "I've been assigned to this issue..." (line 1020)
- **Immediate Reply**: "I'm getting started on that right away..." (line 457)
- **Unassignment**: "I've been unassigned and am stopping work now." (line 578)
- **Token Limit**: "[System] Token limit reached. Starting fresh session..." (line 713)
- **Status**: ✅ Active - System response templates
- **Customization**: Currently hardcoded, not configurable

### 3. TODO Integration Messages (Active)
- **Location**: `/packages/edge-worker/src/EdgeWorker.ts` (lines 1095-1133)
- **Status**: ✅ Active - TODO checklist formatting
- **Purpose**: Formats TodoWrite tool output for Linear comments
- **Customization**: Hardcoded emoji and formatting logic

## Test Files and Examples

### 1. Test Configurations (Testing)
- **Files**: 
  - `/packages/edge-worker/test/EdgeWorker.test.ts`
  - `/packages/edge-worker/test/EdgeWorker.multi-repo.test.ts`
- **Status**: 🧪 Testing - Mock configurations
- **Purpose**: Test different repository configurations
- **Includes**: Mock repository configs with template paths

### 2. Example Configurations (Documentation)
- **File**: `/apps/cli/repositories.example.json`
- **Status**: 📚 Documentation - Example repository config
- **Purpose**: Shows how to configure `promptTemplatePath`
- **Note**: CLI strips this setting, so example is misleading

### 3. Integration Examples (Documentation)
- **File**: `/packages/edge-worker/examples/cli-integration.ts`
- **Status**: 📚 Documentation - Shows EdgeWorker integration
- **Purpose**: Demonstrates EdgeWorker setup with custom templates

## Current Issues and Inconsistencies

### 1. CLI Template Stripping
- **Issue**: CLI intentionally removes `promptTemplatePath` from configs
- **Impact**: Users cannot customize prompts via CLI
- **Location**: `/apps/cli/app.ts` (lines 78-87)
- **Reason**: Documented as "ensure built-in template is used"

### 2. Documentation Misalignment
- **Issue**: `repositories.example.json` shows `promptTemplatePath` usage
- **Impact**: Users expect customization that CLI doesn't support
- **Files**: Example config vs CLI implementation

### 3. Unused Legacy Template
- **Issue**: `/apps/cli/agent-prompt-template.md` exists but isn't used
- **Impact**: Confusion about which template is active
- **Status**: Should be removed or repurposed

### 4. System Prompt Unused
- **Issue**: ClaudeRunner supports `systemPrompt` but EdgeWorker doesn't use it
- **Impact**: Missing potential for better prompt structure
- **Opportunity**: Could separate system instructions from issue context

## Recommendations for CEA-136

### 1. Immediate Actions
1. **Remove Legacy Template**: Delete `/apps/cli/agent-prompt-template.md`
2. **Fix Example Config**: Update `repositories.example.json` to not show `promptTemplatePath`
3. **Document CLI Limitation**: Clearly state that CLI doesn't support custom templates

### 2. Architecture Improvements
1. **Enable CLI Customization**: Remove template stripping in CLI or add flag to enable it
2. **Use System Prompt**: Migrate to ClaudeRunner's `systemPrompt` for better separation
3. **Standardize Comments**: Make system comment templates configurable

### 3. Future Enhancements
1. **Template Validation**: Add validation for custom template files
2. **Variable Documentation**: Better documentation of available template variables
3. **Template Testing**: Add tests for template rendering and variable substitution

## Template Variable Reference

| Variable | Source | Type | Description |
|----------|--------|------|-------------|
| `{{repository_name}}` | `repository.name` | String | Repository display name |
| `{{issue_id}}` | `issue.id` | String | Linear issue ID |
| `{{issue_title}}` | `issue.title` | String | Issue title |
| `{{issue_description}}` | `issue.description` | String | Full issue description |
| `{{issue_state}}` | `issue.state.name` | String | Current issue state |
| `{{issue_priority}}` | `issue.priority` | Number | Priority level (0-4) |
| `{{issue_url}}` | `issue.url` | String | Direct Linear issue URL |
| `{{comment_history}}` | API call | String | All previous comments formatted |
| `{{latest_comment}}` | API call | String | Most recent comment text |
| `{{working_directory}}` | Config/Handler | String | Current working directory |
| `{{base_branch}}` | `repository.baseBranch` | String | Base git branch |
| `{{branch_name}}` | `issue.branchName` | String | Issue-specific branch name |

## Files Requiring Changes for CEA-136

### High Priority (Core Functionality)
1. `/packages/edge-worker/prompt-template.md` - Main template to iterate
2. `/packages/edge-worker/src/EdgeWorker.ts` - Template loading and processing
3. `/packages/edge-worker/src/types.ts` - Configuration interfaces

### Medium Priority (Consistency)
1. `/apps/cli/app.ts` - Remove template stripping or make configurable
2. `/apps/cli/repositories.example.json` - Fix misleading example
3. `/apps/cli/agent-prompt-template.md` - Remove or repurpose

### Low Priority (Documentation)
1. `/packages/edge-worker/README.md` - Update prompt documentation
2. `/packages/edge-worker/examples/custom-prompt.md` - Update example
3. Test files - Update mock configurations

This inventory provides a complete picture of the prompt system architecture and identifies all locations that would need consideration when iterating on the agent prompt for CEA-136.