import { spawn, ChildProcessWithoutNullStreams, SpawnOptions } from 'child_process';

interface ProcessHandlers {
  onStdout?: (data: Buffer) => void;
  onStderr?: (data: Buffer) => void;
  onClose?: (code: number | null) => void;
  onError?: (err: Error) => void;
}

/**
 * Process manager abstraction to make process creation testable
 */
export class ProcessManager {
  /**
   * Spawn a child process
   * @param command - Command to execute
   * @param options - Process options
   * @returns The spawned process
   */
  spawn(command: string | string[], options: SpawnOptions = {}): ChildProcessWithoutNullStreams {
    // If command is array, first element is command and rest are args
    if (Array.isArray(command)) {
      const [cmd, ...args] = command;
      return spawn(cmd, args, options) as any as ChildProcessWithoutNullStreams;
    }
    
    // Otherwise, use command as is (for shell execution)
    return spawn(command as string, options as any) as any as ChildProcessWithoutNullStreams;
  }
  
  /**
   * Create a promise that resolves after a timeout
   * @param ms - Milliseconds to wait
   * @returns Promise<void>
   */
  wait(ms: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Set up common event handlers for a process
   * @param process - Child process
   * @param handlers - Event handlers
   * @returns The process with handlers attached
   */
  setupProcessHandlers(
    process: ChildProcessWithoutNullStreams, 
    handlers: ProcessHandlers = {}
  ): ChildProcessWithoutNullStreams {
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