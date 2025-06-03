import fs from 'fs-extra';
import os from 'os';
import path from 'path';

/**
 * File system abstraction to make operations testable
 */
export class FileSystem {
  /**
   * Ensure a directory exists
   * @param {string} dirPath - Directory path
   * @returns {Promise<void>}
   */
  async ensureDir(dirPath) {
    return fs.ensureDir(dirPath);
  }
  
  /**
   * Check if a path exists
   * @param {string} filePath - File path
   * @returns {Promise<boolean>}
   */
  async pathExists(filePath) {
    return fs.pathExists(filePath);
  }
  
  /**
   * Read a file
   * @param {string} filePath - File path
   * @param {string} encoding - File encoding (default: utf-8)
   * @returns {Promise<string>}
   */
  async readFile(filePath, encoding = 'utf-8') {
    return fs.readFile(filePath, encoding);
  }
  
  /**
   * Write a file
   * @param {string} filePath - File path
   * @param {string} content - File content
   * @returns {Promise<void>}
   */
  async writeFile(filePath, content) {
    return fs.writeFile(filePath, content);
  }
  
  /**
   * Append to a file
   * @param {string} filePath - File path
   * @param {string} content - Content to append
   * @returns {Promise<void>}
   */
  async appendFile(filePath, content) {
    return fs.appendFile(filePath, content);
  }
  
  /**
   * Read a directory
   * @param {string} dirPath - Directory path
   * @returns {Promise<string[]>}
   */
  async readDir(dirPath) {
    return fs.readdir(dirPath);
  }
  
  /**
   * Get file stats
   * @param {string} filePath - File path
   * @returns {Promise<fs.Stats>}
   */
  async stat(filePath) {
    return fs.stat(filePath);
  }
  
  /**
   * Remove a file or directory
   * @param {string} filePath - File path
   * @returns {Promise<void>}
   */
  async remove(filePath) {
    return fs.remove(filePath);
  }
  
  /**
   * Join paths
   * @param {...string} paths - Paths to join
   * @returns {string}
   */
  joinPath(...paths) {
    return path.join(...paths);
  }
  
  /**
   * Get the base name of a path
   * @param {string} filePath - File path
   * @returns {string}
   */
  basename(filePath) {
    return path.basename(filePath);
  }
  
  /**
   * Get the directory name of a path
   * @param {string} filePath - File path
   * @returns {string}
   */
  dirname(filePath) {
    return path.dirname(filePath);
  }
  
  /**
   * Get the home directory
   * @returns {string}
   */
  homedir() {
    return os.homedir();
  }
  
  /**
   * Synchronously ensure a directory exists
   * @param {string} dirPath - Directory path
   */
  ensureDirSync(dirPath) {
    return fs.ensureDirSync(dirPath);
  }
  
  /**
   * Synchronously write a file
   * @param {string} filePath - File path
   * @param {string} content - File content
   */
  writeFileSync(filePath, content) {
    return fs.writeFileSync(filePath, content);
  }
  
  /**
   * Synchronously check if a path exists
   * @param {string} filePath - File path
   * @returns {boolean}
   */
  existsSync(filePath) {
    return fs.existsSync(filePath);
  }
  
  /**
   * Rename/move a file
   * @param {string} oldPath - Current file path
   * @param {string} newPath - New file path
   * @returns {Promise<void>}
   */
  async rename(oldPath, newPath) {
    return fs.rename(oldPath, newPath);
  }
}