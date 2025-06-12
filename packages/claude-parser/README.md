# @cyrus/claude-parser

A TypeScript parser for Claude's stdout JSON messages, designed to work with streamed output from the Claude CLI.

## Overview

This package provides a robust parser for processing Claude's JSON output, handling:

- Streaming JSON parsing with line buffering
- All Claude message types (assistant, user, system, tool, error, etc.)
- Token limit detection and handling
- Event-based architecture for real-time processing

## Important: jq Requirement

This parser is designed to work with Claude's output that has been processed through `jq -c .`. The `jq` command:

- Ensures valid JSON formatting
- Compacts output to one JSON object per line
- Handles any malformed JSON gracefully

### Typical Usage Pattern

```bash
claude [args] | jq -c .
```

The parser expects this compact JSON format where each line is a complete JSON object.

## Installation

```bash
pnpm add @cyrus/claude-parser
```

## Usage

### Basic Stream Processing

```typescript
import { StreamProcessor } from '@cyrus/claude-parser';

// Create a stream processor
const processor = new StreamProcessor({
  sessionId: 'optional-session-id',
});

// Pipe Claude's stdout through jq to the processor
claudeProcess.stdout.pipe(processor);

// Handle parsed events
processor.on('data', (event) => {
  console.log('Parsed event:', event);
});

processor.on('error', (error) => {
  console.error('Parse error:', error);
});
```

### Direct Parser Usage

```typescript
import { StdoutParser } from '@cyrus/claude-parser';

const parser = new StdoutParser({
  sessionId: 'optional-session-id',
});

// Listen for specific events
parser.on('assistant', (event) => {
  console.log('Assistant message:', event.message);
});

parser.on('tool-use', (toolName, input) => {
  console.log(`Tool ${toolName} called with:`, input);
});

parser.on('text', (text) => {
  console.log('Text content:', text);
});

parser.on('error', (error) => {
  console.error('Error:', error);
});

// Process data chunks
parser.processData(chunk);

// When done
parser.processEnd();
```

## Event Types

The parser emits the following events:

- `message`: Any Claude message (raw event)
- `assistant`: Assistant messages with content
- `user`: User messages
- `system`: System initialization events
- `tool-use`: When Claude uses a tool
- `text`: Text content from assistant messages
- `end-turn`: When assistant finishes a turn
- `result`: Final result of the session
- `error`: Parse errors or Claude errors
- `token-limit`: When token limit is detected
- `line`: Raw JSON lines (for debugging)

## Message Types

All TypeScript types are exported from the package:

```typescript
import type {
  ClaudeEvent,
  AssistantMessage,
  UserMessage,
  ToolUseContent,
  ErrorEvent,
  // ... and more
} from '@cyrus/claude-parser';
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm run build

# Run tests
pnpm test

# Watch mode
pnpm run dev
```

## Notes

- The parser handles partial JSON by buffering incomplete lines
- It automatically detects and emits token limit errors
- Session IDs can be injected into all events via options
- Error events include both Error objects and Claude's error message types
