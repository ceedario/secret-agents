import { EventEmitter } from 'events';
import type {
  ClaudeEvent,
  AssistantEvent,
  ResultEvent,
  ErrorEvent,
  ToolErrorEvent,
  TextContent,
  ToolUseContent,
  ParserOptions,
} from './types.js';

export interface StdoutParserEvents {
  message: (event: ClaudeEvent) => void;
  assistant: (event: AssistantEvent) => void;
  'tool-use': (toolName: string, input: Record<string, any>) => void;
  text: (text: string) => void;
  'end-turn': (lastText: string) => void;
  result: (event: ResultEvent) => void;
  error: (error: Error | ErrorEvent | ToolErrorEvent) => void;
  'token-limit': () => void;
  line: (line: string) => void;
}

export declare interface StdoutParser {
  on<K extends keyof StdoutParserEvents>(event: K, listener: StdoutParserEvents[K]): this;
  emit<K extends keyof StdoutParserEvents>(
    event: K,
    ...args: Parameters<StdoutParserEvents[K]>
  ): boolean;
}

/**
 * Parser for Claude's stdout JSON messages
 */
export class StdoutParser extends EventEmitter {
  private lineBuffer = '';
  private tokenLimitDetected = false;
  private lastAssistantText = '';
  private options: ParserOptions;
  private debug: boolean;

  constructor(options: ParserOptions = {}) {
    super();
    this.options = options;
    this.debug = process.env.DEBUG_EDGE === 'true';
  }

  /**
   * Process a chunk of data from stdout
   */
  processData(data: Buffer | string): void {
    const dataStr = data.toString();
    if (this.debug) {
      console.log('[StdoutParser] processData called with data length:', dataStr.length);
      console.log(
        '[StdoutParser] Raw data chunk:',
        JSON.stringify(dataStr.slice(0, 200) + (dataStr.length > 200 ? '...' : ''))
      );
    }

    this.lineBuffer += dataStr;
    if (this.debug) {
      console.log('[StdoutParser] Current buffer length:', this.lineBuffer.length);
    }

    const lines = this.lineBuffer.split('\n');
    if (this.debug) {
      console.log('[StdoutParser] Split into', lines.length, 'lines');
    }

    // Process all complete lines except the last
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i]?.trim();
      if (this.debug) {
        console.log(
          `[StdoutParser] Processing line ${i + 1}/${lines.length - 1}:`,
          line ? `"${line.slice(0, 100)}${line.length > 100 ? '...' : ''}"` : '(empty)'
        );
      }
      if (line) {
        this.processLine(line);
      }
    }

    // Keep the last line in the buffer
    this.lineBuffer = lines[lines.length - 1] || '';
    if (this.debug) {
      console.log(
        '[StdoutParser] Remaining buffer:',
        this.lineBuffer.slice(0, 100) + (this.lineBuffer.length > 100 ? '...' : '')
      );
    }
  }

  /**
   * Process any remaining data when stream ends
   */
  processEnd(): void {
    if (this.debug) {
      console.log('[StdoutParser] processEnd called, buffer length:', this.lineBuffer.length);
    }
    const line = this.lineBuffer.trim();
    if (line) {
      if (this.debug) {
        console.log(
          '[StdoutParser] Processing remaining buffer:',
          JSON.stringify(line.slice(0, 200) + (line.length > 200 ? '...' : ''))
        );
      }
      // The final line might contain multiple JSON objects
      const parts = line.split(/\r?\n/);
      if (this.debug) {
        console.log('[StdoutParser] Split final buffer into', parts.length, 'parts');
      }
      for (const part of parts) {
        if (part.trim()) {
          if (this.debug) {
            console.log(
              '[StdoutParser] Processing final part:',
              JSON.stringify(part.trim().slice(0, 100) + (part.trim().length > 100 ? '...' : ''))
            );
          }
          this.processLine(part.trim());
        }
      }
    }
    this.lineBuffer = '';
  }

  /**
   * Process a single line of JSON
   */
  private processLine(line: string): void {
    if (this.debug) {
      console.log(
        '[StdoutParser] processLine called with:',
        JSON.stringify(line.slice(0, 200) + (line.length > 200 ? '...' : ''))
      );
    }
    try {
      const jsonResponse = JSON.parse(line);
      if (this.debug) {
        console.log(
          '[StdoutParser] Successfully parsed JSON:',
          JSON.stringify(jsonResponse).slice(0, 200) +
            (JSON.stringify(jsonResponse).length > 200 ? '...' : '')
        );
        console.log('[StdoutParser] Message type:', jsonResponse.type);
      }

      // Emit raw line event
      if (this.debug) {
        console.log('[StdoutParser] Emitting "line" event');
      }
      this.emit('line', line);

      // Add session ID if provided
      if (this.options.sessionId && !jsonResponse.session_id) {
        jsonResponse.session_id = this.options.sessionId;
        if (this.debug) {
          console.log('[StdoutParser] Added session ID:', this.options.sessionId);
        }
      }

      // Emit generic message event
      if (this.debug) {
        console.log('[StdoutParser] Emitting "message" event for type:', jsonResponse.type);
      }
      this.emit('message', jsonResponse);

      // Process specific message types
      this.processMessage(jsonResponse);
    } catch (err) {
      console.error('[StdoutParser] JSON parse error:', err);
      console.error('[StdoutParser] Failed line:', line);
      this.emit(
        'error',
        new Error(
          `Failed to parse JSON: ${err instanceof Error ? err.message : String(err)}\nLine: ${line}`
        )
      );
    }
  }

  /**
   * Process a parsed message based on its type
   */
  private processMessage(message: any): void {
    if (this.debug) {
      console.log('[StdoutParser] processMessage called with type:', message.type);
    }

    // Check for token limit errors first
    if (this.isTokenLimitError(message)) {
      if (this.debug) {
        console.log('[StdoutParser] Token limit error detected');
      }
      this.handleTokenLimitError();
      return;
    }

    switch (message.type) {
      case 'assistant':
        if (this.debug) {
          console.log('[StdoutParser] Processing assistant message');
        }
        this.processAssistantMessage(message as AssistantEvent);
        break;

      case 'result':
        if (this.debug) {
          console.log('[StdoutParser] Emitting "result" event');
        }
        this.emit('result', message as ResultEvent);
        break;

      case 'error':
        if (this.debug) {
          console.log('[StdoutParser] Emitting "error" event for error type');
        }
        this.emit('error', message as ErrorEvent);
        break;

      case 'tool_error':
        if (this.debug) {
          console.log('[StdoutParser] Emitting "error" event for tool_error type');
        }
        this.emit('error', message as ToolErrorEvent);
        break;

      default:
        if (this.debug) {
          console.log('[StdoutParser] Unknown message type:', message.type);
        }
    }
  }

  /**
   * Process assistant messages
   */
  private processAssistantMessage(event: AssistantEvent): void {
    if (this.debug) {
      console.log('[StdoutParser] processAssistantMessage called');
      console.log('[StdoutParser] Emitting "assistant" event');
    }
    this.emit('assistant', event);

    const message = event.message;
    let currentText = '';

    if (this.debug) {
      console.log(
        '[StdoutParser] Message content type:',
        typeof message.content,
        Array.isArray(message.content) ? '(array)' : '(not array)'
      );
      console.log('[StdoutParser] Stop reason:', message.stop_reason);
    }

    // Extract content from message
    if (message.content && Array.isArray(message.content)) {
      if (this.debug) {
        console.log('[StdoutParser] Processing', message.content.length, 'content items');
      }
      for (const content of message.content) {
        if (this.debug) {
          console.log('[StdoutParser] Content type:', content.type);
        }
        if (content.type === 'text') {
          const textContent = content as TextContent;
          currentText += textContent.text;
          if (this.debug) {
            console.log(
              '[StdoutParser] Emitting "text" event with:',
              textContent.text.slice(0, 100) + (textContent.text.length > 100 ? '...' : '')
            );
          }
          this.emit('text', textContent.text);
        } else if (content.type === 'tool_use') {
          const toolContent = content as ToolUseContent;
          if (this.debug) {
            console.log('[StdoutParser] Emitting "tool-use" event for tool:', toolContent.name);
          }
          this.emit('tool-use', toolContent.name, toolContent.input);
        }
      }
    } else if (typeof message.content === 'string') {
      currentText = message.content;
      if (this.debug) {
        console.log(
          '[StdoutParser] String content, emitting "text" event with:',
          currentText.slice(0, 100) + (currentText.length > 100 ? '...' : '')
        );
      }
      this.emit('text', currentText);
    }

    // Check for token limit in text
    if (currentText === 'Prompt is too long') {
      if (this.debug) {
        console.log('[StdoutParser] Token limit detected in text content');
      }
      this.handleTokenLimitError();
      return;
    }

    // Store last assistant text
    if (currentText.trim()) {
      this.lastAssistantText = currentText;
      if (this.debug) {
        console.log('[StdoutParser] Stored last assistant text, length:', currentText.length);
      }
    }

    // Check for end of turn
    if (message.stop_reason === 'end_turn') {
      if (this.debug) {
        console.log('[StdoutParser] End of turn detected, emitting "end-turn" event');
      }
      this.emit('end-turn', this.lastAssistantText);
    }
  }

  /**
   * Check if a message indicates a token limit error
   */
  private isTokenLimitError(message: any): boolean {
    return (
      // Direct error type
      (message.type === 'error' &&
        message.message &&
        (message.message === 'Prompt is too long' ||
          message.message.toLowerCase().includes('prompt is too long'))) ||
      // Error object
      (message.error &&
        typeof message.error.message === 'string' &&
        (message.error.message === 'Prompt is too long' ||
          message.error.message.toLowerCase().includes('prompt is too long'))) ||
      // Assistant message with error
      (message.type === 'assistant' && message.message?.content === 'Prompt is too long') ||
      // Tool error
      (message.type === 'tool_error' &&
        message.error &&
        (message.error === 'Prompt is too long' ||
          message.error.toLowerCase().includes('prompt is too long'))) ||
      // Result type with error
      (message.type === 'result' &&
        (message.result === 'Prompt is too long' || message.is_error === true))
    );
  }

  /**
   * Handle token limit error
   */
  private handleTokenLimitError(): void {
    if (!this.tokenLimitDetected) {
      this.tokenLimitDetected = true;
      this.emit('token-limit');
      if (this.options.onTokenLimit) {
        this.options.onTokenLimit();
      }
    }
  }

  /**
   * Reset parser state
   */
  reset(): void {
    this.lineBuffer = '';
    this.tokenLimitDetected = false;
    this.lastAssistantText = '';
  }
}
