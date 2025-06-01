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
    async ensureDir(dirPath) {
        return fs.ensureDir(dirPath);
    }
    /**
     * Check if a path exists
     * @param filePath - File path
     * @returns Promise<boolean>
     */
    async pathExists(filePath) {
        return fs.pathExists(filePath);
    }
    /**
     * Read a file
     * @param filePath - File path
     * @param encoding - File encoding (default: utf-8)
     * @returns Promise<string>
     */
    async readFile(filePath, encoding = 'utf-8') {
        return fs.readFile(filePath, encoding);
    }
    /**
     * Write a file
     * @param filePath - File path
     * @param content - File content
     * @returns Promise<void>
     */
    async writeFile(filePath, content) {
        return fs.writeFile(filePath, content);
    }
    /**
     * Append to a file
     * @param filePath - File path
     * @param content - Content to append
     * @returns Promise<void>
     */
    async appendFile(filePath, content) {
        return fs.appendFile(filePath, content);
    }
    /**
     * Read a directory
     * @param dirPath - Directory path
     * @returns Promise<string[]>
     */
    async readDir(dirPath) {
        return fs.readdir(dirPath);
    }
    /**
     * Get file stats
     * @param filePath - File path
     * @returns Promise<fs.Stats>
     */
    async stat(filePath) {
        return fs.stat(filePath);
    }
    /**
     * Remove a file or directory
     * @param filePath - File path
     * @returns Promise<void>
     */
    async remove(filePath) {
        return fs.remove(filePath);
    }
    /**
     * Join paths
     * @param paths - Paths to join
     * @returns string
     */
    joinPath(...paths) {
        return path.join(...paths);
    }
    /**
     * Get the base name of a path
     * @param filePath - File path
     * @returns string
     */
    basename(filePath) {
        return path.basename(filePath);
    }
    /**
     * Get the directory name of a path
     * @param filePath - File path
     * @returns string
     */
    dirname(filePath) {
        return path.dirname(filePath);
    }
    /**
     * Get the home directory
     * @returns string
     */
    homedir() {
        return os.homedir();
    }
    /**
     * Synchronously ensure a directory exists
     * @param dirPath - Directory path
     */
    ensureDirSync(dirPath) {
        return fs.ensureDirSync(dirPath);
    }
    /**
     * Synchronously write a file
     * @param filePath - File path
     * @param content - File content
     */
    writeFileSync(filePath, content) {
        return fs.writeFileSync(filePath, content);
    }
    /**
     * Synchronously check if a path exists
     * @param filePath - File path
     * @returns boolean
     */
    existsSync(filePath) {
        return fs.existsSync(filePath);
    }
    /**
     * Rename/move a file
     * @param oldPath - Current file path
     * @param newPath - New file path
     * @returns Promise<void>
     */
    async rename(oldPath, newPath) {
        return fs.rename(oldPath, newPath);
    }
}
