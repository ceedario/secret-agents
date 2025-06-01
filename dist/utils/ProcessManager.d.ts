import { ChildProcessWithoutNullStreams, SpawnOptions } from 'child_process';
interface ProcessHandlers {
    onStdout?: (data: Buffer) => void;
    onStderr?: (data: Buffer) => void;
    onClose?: (code: number | null) => void;
    onError?: (err: Error) => void;
}
/**
 * Process manager abstraction to make process creation testable
 */
export declare class ProcessManager {
    /**
     * Spawn a child process
     * @param command - Command to execute
     * @param options - Process options
     * @returns The spawned process
     */
    spawn(command: string | string[], options?: SpawnOptions): ChildProcessWithoutNullStreams;
    /**
     * Create a promise that resolves after a timeout
     * @param ms - Milliseconds to wait
     * @returns Promise<void>
     */
    wait(ms: number): Promise<void>;
    /**
     * Set up common event handlers for a process
     * @param process - Child process
     * @param handlers - Event handlers
     * @returns The process with handlers attached
     */
    setupProcessHandlers(process: ChildProcessWithoutNullStreams, handlers?: ProcessHandlers): ChildProcessWithoutNullStreams;
}
export {};
