import { EventEmitter } from 'events';
/**
 * Parser for Claude's stdout JSON messages
 */
export class StdoutParser extends EventEmitter {
  lineBuffer = '';
  tokenLimitDetected = false;
  lastAssistantText = '';
  options;
  constructor(options = {}) {
    super();
    this.options = options;
  }
  /**
   * Process a chunk of data from stdout
   */
  processData(data) {
    this.lineBuffer += data.toString();
    const lines = this.lineBuffer.split('\n');
    // Process all complete lines except the last
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i]?.trim();
      if (line) {
        this.processLine(line);
      }
    }
    // Keep the last line in the buffer
    this.lineBuffer = lines[lines.length - 1] || '';
  }
  /**
   * Process any remaining data when stream ends
   */
  processEnd() {
    const line = this.lineBuffer.trim();
    if (line) {
      // The final line might contain multiple JSON objects
      const parts = line.split(/\r?\n/);
      for (const part of parts) {
        if (part.trim()) {
          this.processLine(part.trim());
        }
      }
    }
    this.lineBuffer = '';
  }
  /**
   * Process a single line of JSON
   */
  processLine(line) {
    try {
      const jsonResponse = JSON.parse(line);
      // Emit raw line event
      this.emit('line', line);
      // Add session ID if provided
      if (this.options.sessionId && !jsonResponse.session_id) {
        jsonResponse.session_id = this.options.sessionId;
      }
      // Emit generic message event
      this.emit('message', jsonResponse);
      // Process specific message types
      this.processMessage(jsonResponse);
    } catch (err) {
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
  processMessage(message) {
    // Check for token limit errors first
    if (this.isTokenLimitError(message)) {
      this.handleTokenLimitError();
      return;
    }
    switch (message.type) {
      case 'assistant':
        this.processAssistantMessage(message);
        break;
      case 'result':
        this.emit('result', message);
        break;
      case 'error':
        this.emit('error', message);
        break;
      case 'tool_error':
        this.emit('error', message);
        break;
    }
  }
  /**
   * Process assistant messages
   */
  processAssistantMessage(event) {
    this.emit('assistant', event);
    const message = event.message;
    let currentText = '';
    // Extract content from message
    if (message.content && Array.isArray(message.content)) {
      for (const content of message.content) {
        if (content.type === 'text') {
          const textContent = content;
          currentText += textContent.text;
          this.emit('text', textContent.text);
        } else if (content.type === 'tool_use') {
          const toolContent = content;
          this.emit('tool-use', toolContent.name, toolContent.input);
        }
      }
    } else if (typeof message.content === 'string') {
      currentText = message.content;
      this.emit('text', currentText);
    }
    // Check for token limit in text
    if (currentText === 'Prompt is too long') {
      this.handleTokenLimitError();
      return;
    }
    // Store last assistant text
    if (currentText.trim()) {
      this.lastAssistantText = currentText;
    }
    // Check for end of turn
    if (message.stop_reason === 'end_turn') {
      this.emit('end-turn', this.lastAssistantText);
    }
  }
  /**
   * Check if a message indicates a token limit error
   */
  isTokenLimitError(message) {
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
  handleTokenLimitError() {
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
  reset() {
    this.lineBuffer = '';
    this.tokenLimitDetected = false;
    this.lastAssistantText = '';
  }
}
//# sourceMappingURL=StdoutParser.js.map
