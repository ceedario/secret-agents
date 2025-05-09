import { spawn } from 'child_process';

/**
 * Process manager abstraction to make process creation testable
 */
export class ProcessManager {
  /**
   * Spawn a child process
   * @param {string|string[]} command - Command to execute
   * @param {Object} options - Process options
   * @returns {ChildProcess} - The spawned process
   */
  spawn(command, options = {}) {
    // If command is array, first element is command and rest are args
    if (Array.isArray(command)) {
      const [cmd, ...args] = command;
      return spawn(cmd, args, options);
    }
    
    // Otherwise, use command as is (for shell execution)
    return spawn(command, options);
  }
  
  /**
   * Create a promise that resolves after a timeout
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise<void>}
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Set up common event handlers for a process
   * @param {ChildProcess} process - Child process
   * @param {Object} handlers - Event handlers
   * @returns {ChildProcess} - The process with handlers attached
   */
  setupProcessHandlers(process, handlers = {}) {
    const {
      onStdout,
      onStderr,
      onClose,
      onError,
    } = handlers;
    
    if (onStdout && process.stdout) {
      process.stdout.on('data', onStdout);
    }
    
    if (onStderr && process.stderr) {
      process.stderr.on('data', onStderr);
    }
    
    if (onClose) {
      process.on('close', onClose);
    }
    
    if (onError) {
      process.on('error', onError);
    }
    
    return process;
  }
}