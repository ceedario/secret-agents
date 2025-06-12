import { Transform, TransformCallback } from 'stream';
import { StdoutParser } from './StdoutParser.js';
import type { ClaudeEvent, ParserOptions, ErrorEvent, ToolErrorEvent } from './types.js';

/**
 * Transform stream that processes Claude stdout and emits parsed events
 */
export class StreamProcessor extends Transform {
  private parser: StdoutParser;

  constructor(options: ParserOptions = {}) {
    super({ objectMode: true });
    this.parser = new StdoutParser(options);

    // Forward all parser events as stream data
    this.parser.on('message', (event: ClaudeEvent) => {
      this.push(event);
    });

    // Handle errors
    this.parser.on('error', (error: Error | ErrorEvent | ToolErrorEvent) => {
      this.emit('error', error);
    });
  }

  _transform(chunk: any, _encoding: BufferEncoding, callback: TransformCallback): void {
    try {
      this.parser.processData(chunk);
      callback();
    } catch (error) {
      callback(error as Error);
    }
  }

  _flush(callback: TransformCallback): void {
    try {
      this.parser.processEnd();
      callback();
    } catch (error) {
      callback(error as Error);
    }
  }

  /**
   * Get the underlying parser for direct event access
   */
  getParser(): StdoutParser {
    return this.parser;
  }
}
