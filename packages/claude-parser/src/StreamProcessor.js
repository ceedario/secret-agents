import { Transform } from 'stream';
import { StdoutParser } from './StdoutParser';
/**
 * Transform stream that processes Claude stdout and emits parsed events
 */
export class StreamProcessor extends Transform {
  parser;
  constructor(options = {}) {
    super({ objectMode: true });
    this.parser = new StdoutParser(options);
    // Forward all parser events as stream data
    this.parser.on('message', (event) => {
      this.push(event);
    });
    // Handle errors
    this.parser.on('error', (error) => {
      this.emit('error', error);
    });
  }
  _transform(chunk, _encoding, callback) {
    try {
      this.parser.processData(chunk);
      callback();
    } catch (error) {
      callback(error);
    }
  }
  _flush(callback) {
    try {
      this.parser.processEnd();
      callback();
    } catch (error) {
      callback(error);
    }
  }
  /**
   * Get the underlying parser for direct event access
   */
  getParser() {
    return this.parser;
  }
}
//# sourceMappingURL=StreamProcessor.js.map
