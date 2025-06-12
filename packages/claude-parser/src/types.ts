/**
 * Types for Claude JSON messages
 */

export interface TextContent {
  type: 'text';
  text: string;
  citations?: Citation[];
}

export interface ToolUseContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface ToolResultContent {
  type: 'tool_result';
  tool_use_id: string;
  content: string | ContentBlock[];
  is_error?: boolean;
}

export type ContentBlock = TextContent | ToolUseContent | ToolResultContent;

export interface Citation {
  type: 'web_search';
  data: {
    url: string;
    title: string;
    snippet: string;
  };
}

export interface AssistantMessage {
  id: string;
  type: 'message';
  role: 'assistant';
  model: string;
  content: ContentBlock[];
  stop_reason?: 'end_turn' | 'max_tokens' | 'tool_use';
  stop_sequence?: string | null;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface UserMessage {
  role: 'user';
  content: string | ContentBlock[];
}

export interface SystemMessage {
  role: 'system';
  content: string;
}

export interface AssistantEvent {
  type: 'assistant';
  message: AssistantMessage;
  session_id?: string;
}

export interface UserEvent {
  type: 'user';
  message: UserMessage;
  session_id?: string;
}

export interface SystemInitEvent {
  type: 'system';
  subtype: 'init';
  session_id?: string;
  tools?: string[];
  mcp_servers?: Array<{
    name: string;
    status: string;
  }>;
}

export interface ResultEvent {
  type: 'result';
  subtype: 'success' | 'error_max_turns' | 'error';
  cost_usd?: number;
  duration_ms?: number;
  duration_api_ms?: number;
  is_error: boolean;
  num_turns?: number;
  result?: string;
  session_id?: string;
}

export interface ToolEvent {
  type: 'tool';
  tool_name: string;
  input: Record<string, any>;
  session_id?: string;
}

export interface ErrorEvent {
  type: 'error';
  message: string;
  error?: any;
  session_id?: string;
}

export interface ToolErrorEvent {
  type: 'tool_error';
  error: string;
  session_id?: string;
}

export type ClaudeEvent =
  | AssistantEvent
  | UserEvent
  | SystemInitEvent
  | ResultEvent
  | ToolEvent
  | ErrorEvent
  | ToolErrorEvent;

export interface ParsedMessage {
  event: ClaudeEvent;
  raw: string;
}

export interface ParserOptions {
  sessionId?: string;
  onTokenLimit?: () => void;
}
