import { EventEmitter } from 'events';
import type {
  ClaudeEvent,
  AssistantEvent,
  ResultEvent,
  ErrorEvent,
  ToolErrorEvent,
  ParserOptions,
} from './types';
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
export declare class StdoutParser extends EventEmitter {
  private lineBuffer;
  private tokenLimitDetected;
  private lastAssistantText;
  private options;
  constructor(options?: ParserOptions);
  /**
   * Process a chunk of data from stdout
   */
  processData(data: Buffer | string): void;
  /**
   * Process any remaining data when stream ends
   */
  processEnd(): void;
  /**
   * Process a single line of JSON
   */
  private processLine;
  /**
   * Process a parsed message based on its type
   */
  private processMessage;
  /**
   * Process assistant messages
   */
  private processAssistantMessage;
  /**
   * Check if a message indicates a token limit error
   */
  private isTokenLimitError;
  /**
   * Handle token limit error
   */
  private handleTokenLimitError;
  /**
   * Reset parser state
   */
  reset(): void;
}
//# sourceMappingURL=StdoutParser.d.ts.map
