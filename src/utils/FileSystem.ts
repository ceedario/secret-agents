import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

/**
 * File system abstraction to make operations testable
 */
export class FileSystem {
  /**
   * Ensure a directory exists
   * @param dirPath - Directory path
   * @returns Promise<void>
   */
  async ensureDir(dirPath: string): Promise<void> {
    return fs.ensureDir(dirPath);
  }
  
  /**
   * Check if a path exists
   * @param filePath - File path
   * @returns Promise<boolean>
   */
  async pathExists(filePath: string): Promise<boolean> {
    return fs.pathExists(filePath);
  }
  
  /**
   * Read a file
   * @param filePath - File path
   * @param encoding - File encoding (default: utf-8)
   * @returns Promise<string>
   */
  async readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    return fs.readFile(filePath, encoding);
  }
  
  /**
   * Write a file
   * @param filePath - File path
   * @param content - File content
   * @returns Promise<void>
   */
  async writeFile(filePath: string, content: string | Buffer): Promise<void> {
    return fs.writeFile(filePath, content);
  }
  
  /**
   * Append to a file
   * @param filePath - File path
   * @param content - Content to append
   * @returns Promise<void>
   */
  async appendFile(filePath: string, content: string): Promise<void> {
    return fs.appendFile(filePath, content);
  }
  
  /**
   * Read a directory
   * @param dirPath - Directory path
   * @returns Promise<string[]>
   */
  async readDir(dirPath: string): Promise<string[]> {
    return fs.readdir(dirPath);
  }
  
  /**
   * Get file stats
   * @param filePath - File path
   * @returns Promise<fs.Stats>
   */
  async stat(filePath: string): Promise<fs.Stats> {
    return fs.stat(filePath);
  }
  
  /**
   * Remove a file or directory
   * @param filePath - File path
   * @returns Promise<void>
   */
  async remove(filePath: string): Promise<void> {
    return fs.remove(filePath);
  }
  
  /**
   * Join paths
   * @param paths - Paths to join
   * @returns string
   */
  joinPath(...paths: string[]): string {
    return path.join(...paths);
  }
  
  /**
   * Get the base name of a path
   * @param filePath - File path
   * @returns string
   */
  basename(filePath: string): string {
    return path.basename(filePath);
  }
  
  /**
   * Get the directory name of a path
   * @param filePath - File path
   * @returns string
   */
  dirname(filePath: string): string {
    return path.dirname(filePath);
  }
  
  /**
   * Get the home directory
   * @returns string
   */
  homedir(): string {
    return os.homedir();
  }
  
  /**
   * Synchronously ensure a directory exists
   * @param dirPath - Directory path
   */
  ensureDirSync(dirPath: string): void {
    return fs.ensureDirSync(dirPath);
  }
  
  /**
   * Synchronously write a file
   * @param filePath - File path
   * @param content - File content
   */
  writeFileSync(filePath: string, content: string | Buffer): void {
    return fs.writeFileSync(filePath, content);
  }
  
  /**
   * Synchronously check if a path exists
   * @param filePath - File path
   * @returns boolean
   */
  existsSync(filePath: string): boolean {
    return fs.existsSync(filePath);
  }
  
  /**
   * Rename/move a file
   * @param oldPath - Current file path
   * @param newPath - New file path
   * @returns Promise<void>
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    return fs.rename(oldPath, newPath);
  }
}