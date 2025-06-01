import * as fs from 'fs-extra';
/**
 * File system abstraction to make operations testable
 */
export declare class FileSystem {
    /**
     * Ensure a directory exists
     * @param dirPath - Directory path
     * @returns Promise<void>
     */
    ensureDir(dirPath: string): Promise<void>;
    /**
     * Check if a path exists
     * @param filePath - File path
     * @returns Promise<boolean>
     */
    pathExists(filePath: string): Promise<boolean>;
    /**
     * Read a file
     * @param filePath - File path
     * @param encoding - File encoding (default: utf-8)
     * @returns Promise<string>
     */
    readFile(filePath: string, encoding?: BufferEncoding): Promise<string>;
    /**
     * Write a file
     * @param filePath - File path
     * @param content - File content
     * @returns Promise<void>
     */
    writeFile(filePath: string, content: string | Buffer): Promise<void>;
    /**
     * Append to a file
     * @param filePath - File path
     * @param content - Content to append
     * @returns Promise<void>
     */
    appendFile(filePath: string, content: string): Promise<void>;
    /**
     * Read a directory
     * @param dirPath - Directory path
     * @returns Promise<string[]>
     */
    readDir(dirPath: string): Promise<string[]>;
    /**
     * Get file stats
     * @param filePath - File path
     * @returns Promise<fs.Stats>
     */
    stat(filePath: string): Promise<fs.Stats>;
    /**
     * Remove a file or directory
     * @param filePath - File path
     * @returns Promise<void>
     */
    remove(filePath: string): Promise<void>;
    /**
     * Join paths
     * @param paths - Paths to join
     * @returns string
     */
    joinPath(...paths: string[]): string;
    /**
     * Get the base name of a path
     * @param filePath - File path
     * @returns string
     */
    basename(filePath: string): string;
    /**
     * Get the directory name of a path
     * @param filePath - File path
     * @returns string
     */
    dirname(filePath: string): string;
    /**
     * Get the home directory
     * @returns string
     */
    homedir(): string;
    /**
     * Synchronously ensure a directory exists
     * @param dirPath - Directory path
     */
    ensureDirSync(dirPath: string): void;
    /**
     * Synchronously write a file
     * @param filePath - File path
     * @param content - File content
     */
    writeFileSync(filePath: string, content: string | Buffer): void;
    /**
     * Synchronously check if a path exists
     * @param filePath - File path
     * @returns boolean
     */
    existsSync(filePath: string): boolean;
    /**
     * Rename/move a file
     * @param oldPath - Current file path
     * @param newPath - New file path
     * @returns Promise<void>
     */
    rename(oldPath: string, newPath: string): Promise<void>;
}
