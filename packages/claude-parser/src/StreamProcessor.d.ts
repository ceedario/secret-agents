import { Transform, TransformCallback } from 'stream';
import { StdoutParser } from './StdoutParser';
import type { ParserOptions } from './types';
/**
 * Transform stream that processes Claude stdout and emits parsed events
 */
export declare class StreamProcessor extends Transform {
  private parser;
  constructor(options?: ParserOptions);
  _transform(chunk: any, _encoding: BufferEncoding, callback: TransformCallback): void;
  _flush(callback: TransformCallback): void;
  /**
   * Get the underlying parser for direct event access
   */
  getParser(): StdoutParser;
}
//# sourceMappingURL=StreamProcessor.d.ts.map
