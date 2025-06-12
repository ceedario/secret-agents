export interface ClaudeMessage {
  type: 'assistant' | 'user' | 'system' | 'result';
  message?: {
    id?: string;
    type?: string;
    role?: string;
    model?: string;
    content?: ContentBlock[] | string;
    stop_reason?: 'end_turn' | 'max_tokens' | 'tool_use';
    usage?: {
      input_tokens: number;
      output_tokens: number;
    };
  };
  subtype?: string;
  session_id?: string;
  cost_usd?: number;
  duration_ms?: number;
  is_error?: boolean;
  num_turns?: number;
  result?: string;
  tools?: string[];
  mcp_servers?: Array<{ name: string; status: string }>;
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, any>;
  tool_use_id?: string;
  content?: string | ContentBlock[];
  is_error?: boolean;
  citations?: Citation[];
}

export interface Citation {
  type: string;
  data: {
    url: string;
    title: string;
    snippet: string;
  };
}

export interface StreamEvent {
  type:
    | 'message_start'
    | 'content_block_start'
    | 'content_block_delta'
    | 'content_block_stop'
    | 'message_delta'
    | 'message_stop';
  message?: ClaudeMessage['message'];
  index?: number;
  content_block?: ContentBlock;
  delta?: {
    type?: 'text_delta' | 'input_json_delta';
    text?: string;
    partial_json?: string;
  };
}

export interface ParsedMessage {
  type: 'claude_message' | 'comment_divider' | 'error';
  data: ClaudeMessage | CommentDivider | Error;
  raw?: string;
}

export interface CommentDivider {
  timestamp: string;
  type: 'start' | 'end';
  content?: string;
}
