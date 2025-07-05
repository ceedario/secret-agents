# Recent Changes Analysis for CEA-136: Prompt Iteration

## Executive Summary

This analysis examines the evolution of the Cyrus prompt system over the past 6 months, focusing on key changes to prompting, agent behavior, and issue handling. The codebase has undergone significant architectural improvements, with particular emphasis on streaming capabilities, context preservation, and user experience refinements.

## Timeline of Major Changes

### July 2024 (Latest)
- **Streaming Input Implementation** (commit `66c8a38`, July 4, 2025)
  - Added `StreamingPrompt` class implementing `AsyncIterable<SDKUserMessage>`
  - Modified `ClaudeRunner` to support both string and streaming prompt modes
  - Added `startStreaming()` method and `addStreamMessage()` for continuous conversations
  - Updated `EdgeWorker` to use streaming instead of killing/restarting sessions
  - **Impact**: Eliminates session restarts for follow-up comments, preserving context better

### June 2024 (Peak Activity Period)
- **Context Loss Fix** (commit `3fc6940`, June 25, 2025)
  - Fixed critical issue where follow-up comments lost repository and issue context
  - Added `buildContinuationPrompt()` method to provide essential context for mentions
  - Replaced raw comment body with structured continuation prompt
  - **Impact**: Ensures all follow-up interactions have proper context

- **Initial Comment Text Refinement** (commit `b922507`, June 20, 2025)
  - Changed from "I've been assigned to this issue" to "I'll get started right away"
  - More direct and action-oriented messaging
  - **Impact**: Better user experience, clearer intent

- **TODO Formatting Improvements** (commit `9199c80`, June 15, 2025)
  - Removed colored dots (🔴🟡🟢) from TODO priority formatting in Linear posts
  - Kept functional indicators (🔄 for in-progress, checkboxes for status)
  - **Impact**: Cleaner appearance in Linear interface

- **Custom Prompt Template Restrictions** (commit `c696afc`, June 13, 2025)
  - Stripped `promptTemplatePath` from repository configurations
  - Ensured built-in template is always used in CLI mode
  - **Impact**: Standardized prompt behavior across deployments

### May 2024 (Architecture Improvements)
- **Edge Worker Architecture** (multiple commits)
  - Transitioned from Server-Sent Events to webhook-only architecture
  - Implemented shared webhook server to eliminate port conflicts
  - Added comprehensive attachment download functionality
  - **Impact**: More reliable real-time communication

- **TypeScript Migration** (commit `25c2d0f` and related)
  - Migrated apps/cli from JavaScript to TypeScript
  - Improved type safety and eliminated 'any' types
  - Enhanced Linear SDK integration with proper types
  - **Impact**: Better code quality and maintainability

## Key Problem Areas Addressed

### 1. Context Loss in Conversations
**Problem**: Follow-up comments and mentions were losing essential context about the repository, issue, and working directory.

**Solution**: 
- Added `buildContinuationPrompt()` method that reconstructs context
- Includes repository name, issue details, state, and working directory
- Maintains conversation flow without full session restarts

**Code Location**: `packages/edge-worker/src/EdgeWorker.ts:850-896`

### 2. Session Management Complexity
**Problem**: Each new comment required killing and restarting Claude sessions, losing conversation history.

**Solution**:
- Implemented streaming input using `AsyncIterable<SDKUserMessage>`
- Added `addStreamMessage()` to feed new messages to existing streams
- Fallback to restart behavior if streaming fails

**Code Location**: `packages/claude-runner/src/ClaudeRunner.ts`

### 3. User Experience Issues
**Problem**: Initial messages were too formal, TODO formatting was cluttered.

**Solutions**:
- Changed initial comment to more direct "I'll get started right away"
- Removed colored priority dots while keeping functional indicators
- Improved comment threading behavior

### 4. Template Customization Problems
**Problem**: Inconsistent template usage across different deployment modes.

**Solution**:
- Enforced use of built-in template in CLI mode
- Standardized template loading hierarchy
- Prevented custom templates from being persisted inappropriately

## Current Prompt System Architecture

### Template Structure
The active template (`packages/edge-worker/prompt-template.md`) follows a two-situation pattern:
1. **Situation 1 - Execute**: Clear requirements → systematic implementation
2. **Situation 2 - Clarify**: Vague requirements → investigation and clarification

### Key Features
- **TODO Tool Integration**: Mandatory use of TodoWrite/TodoRead for progress tracking
- **Branching Logic**: Automatic branch and PR management
- **Context Variables**: 15+ template variables for comprehensive context
- **Streaming Support**: Real-time updates to Linear comments
- **Attachment Support**: Automatic download and integration of issue attachments

### Template Variables
- Repository: `{{repository_name}}`
- Issue: `{{issue_id}}`, `{{issue_title}}`, `{{issue_description}}`
- State: `{{issue_state}}`, `{{issue_priority}}`, `{{issue_url}}`
- Context: `{{comment_history}}`, `{{latest_comment}}`
- Environment: `{{working_directory}}`, `{{base_branch}}`, `{{branch_name}}`

## Identified Pain Points and Opportunities

### 1. Situation Detection Logic
**Current**: Relies on Claude to determine if requirements are clear enough for execution
**Opportunity**: Could implement automated analysis of issue structure, acceptance criteria presence, etc.

### 2. Prompt Length Management
**Current**: Prompts can become very long with extensive comment history
**Opportunity**: Implement smart truncation or summarization for long conversations

### 3. Template Customization
**Current**: Limited customization options in CLI mode
**Opportunity**: Allow repository-specific overrides for certain sections while maintaining core structure

### 4. Error Recovery
**Current**: Basic fallback prompt when template processing fails
**Opportunity**: More sophisticated error handling and recovery mechanisms

### 5. Attachment Integration
**Current**: Attachments are downloaded and listed in manifest
**Opportunity**: Better integration of attachment content into prompt context

## Recent Bug Fixes and Stability Improvements

### Major Fixes
1. **Context Loss in Continuations** - Fixed agent losing context in follow-up comments
2. **@ Mention Handling** - Fixed agent triggering on mentions of other users
3. **State Management** - Fixed agent setting issues to wrong states on assignment
4. **Command Injection** - Fixed branch name sanitization to prevent backtick injection
5. **Streaming Reliability** - Fixed various issues with real-time comment updates

### Configuration Issues
1. **Environment Variables** - Standardized CYRUS_* prefixes for all config
2. **OAuth Callbacks** - Fixed callback URL configuration for different deployments
3. **Webhook Architecture** - Migrated from SSE to webhooks for better reliability

## Development Momentum and Patterns

### Active Development Areas
1. **Streaming and Real-time Updates** - Continuous improvements to comment streaming
2. **Architecture Simplification** - Moving toward webhook-only, shared server model
3. **Type Safety** - Ongoing TypeScript migration and type improvements
4. **User Experience** - Constant refinement of agent messaging and behavior

### Emerging Patterns
1. **Context Preservation** - Strong focus on maintaining conversation context
2. **Standardization** - Enforcing consistent behavior across deployment modes
3. **Reliability** - Prioritizing stability over feature additions
4. **Tool Integration** - Heavy emphasis on TODO tool usage for progress tracking

## Recommendations for CEA-136 Prompt Iteration

### High Priority
1. **Situation Detection Enhancement** - Implement automated analysis of issue quality
2. **Context Management** - Improve handling of long conversation histories
3. **Template Modularity** - Allow selective customization while maintaining core structure

### Medium Priority
1. **Error Recovery** - Enhance fallback behaviors and error handling
2. **Attachment Integration** - Better incorporation of attachments into prompts
3. **Performance Optimization** - Reduce prompt processing overhead

### Low Priority
1. **Template Validation** - Add validation for custom templates
2. **Analytics Integration** - Add metrics for prompt effectiveness
3. **A/B Testing Framework** - Enable testing of different prompt variations

## Conclusion

The Cyrus prompt system has evolved significantly over the past 6 months, with major improvements in context preservation, streaming capabilities, and user experience. The current architecture provides a solid foundation for further iteration, with clear opportunities for enhancement in situation detection, context management, and template customization.

The development team has shown strong focus on reliability and user experience, making this an opportune time to implement more sophisticated prompt iteration features while maintaining the stability gains achieved.