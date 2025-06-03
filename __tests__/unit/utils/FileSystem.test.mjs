import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { vi } from 'vitest';

import { FileSystem } from '../../../src/utils/FileSystem.mjs';

// Create a simple test suite that verifies the FileSystem class properly forwards calls to the underlying implementations
describe('FileSystem', () => {
  let fileSystem;
  
  beforeEach(() => {
    fileSystem = new FileSystem();
  });
  
  test('pathExists forwards to fs.pathExists', () => {
    const mockPath = '/test/path';
    vi.spyOn(fs, 'pathExists').mockImplementation(() => Promise.resolve(true));
    
    fileSystem.pathExists(mockPath);
    expect(fs.pathExists).toHaveBeenCalledWith(mockPath);
  });
  
  test('ensureDir forwards to fs.ensureDir', () => {
    const mockPath = '/test/path';
    vi.spyOn(fs, 'ensureDir').mockImplementation(() => Promise.resolve());
    
    fileSystem.ensureDir(mockPath);
    expect(fs.ensureDir).toHaveBeenCalledWith(mockPath);
  });
  
  test('readFile forwards to fs.readFile', () => {
    const mockPath = '/test/file.txt';
    const mockEncoding = 'utf-8';
    vi.spyOn(fs, 'readFile').mockImplementation(() => Promise.resolve('test content'));
    
    fileSystem.readFile(mockPath, mockEncoding);
    expect(fs.readFile).toHaveBeenCalledWith(mockPath, mockEncoding);
  });
  
  test('writeFile forwards to fs.writeFile', () => {
    const mockPath = '/test/file.txt';
    const mockContent = 'test content';
    vi.spyOn(fs, 'writeFile').mockImplementation(() => Promise.resolve());
    
    fileSystem.writeFile(mockPath, mockContent);
    expect(fs.writeFile).toHaveBeenCalledWith(mockPath, mockContent);
  });
  
  test('appendFile forwards to fs.appendFile', () => {
    const mockPath = '/test/file.txt';
    const mockContent = 'test content';
    vi.spyOn(fs, 'appendFile').mockImplementation(() => Promise.resolve());
    
    fileSystem.appendFile(mockPath, mockContent);
    expect(fs.appendFile).toHaveBeenCalledWith(mockPath, mockContent);
  });
  
  test('readDir forwards to fs.readdir', () => {
    const mockPath = '/test/dir';
    vi.spyOn(fs, 'readdir').mockImplementation(() => Promise.resolve(['file1.txt', 'file2.txt']));
    
    fileSystem.readDir(mockPath);
    expect(fs.readdir).toHaveBeenCalledWith(mockPath);
  });
  
  test('stat forwards to fs.stat', () => {
    const mockPath = '/test/file.txt';
    vi.spyOn(fs, 'stat').mockImplementation(() => Promise.resolve({ isDirectory: () => false }));
    
    fileSystem.stat(mockPath);
    expect(fs.stat).toHaveBeenCalledWith(mockPath);
  });
  
  test('remove forwards to fs.remove', () => {
    const mockPath = '/test/file.txt';
    vi.spyOn(fs, 'remove').mockImplementation(() => Promise.resolve());
    
    fileSystem.remove(mockPath);
    expect(fs.remove).toHaveBeenCalledWith(mockPath);
  });
  
  test('joinPath forwards to path.join', () => {
    const mockPaths = ['/test', 'dir', 'file.txt'];
    vi.spyOn(path, 'join').mockImplementation(() => '/test/dir/file.txt');
    
    fileSystem.joinPath(...mockPaths);
    expect(path.join).toHaveBeenCalledWith(...mockPaths);
  });
  
  test('basename forwards to path.basename', () => {
    const mockPath = '/test/dir/file.txt';
    vi.spyOn(path, 'basename').mockImplementation(() => 'file.txt');
    
    fileSystem.basename(mockPath);
    expect(path.basename).toHaveBeenCalledWith(mockPath);
  });
  
  test('dirname forwards to path.dirname', () => {
    const mockPath = '/test/dir/file.txt';
    vi.spyOn(path, 'dirname').mockImplementation(() => '/test/dir');
    
    fileSystem.dirname(mockPath);
    expect(path.dirname).toHaveBeenCalledWith(mockPath);
  });
  
  test('homedir forwards to os.homedir', () => {
    vi.spyOn(os, 'homedir').mockImplementation(() => '/home/user');
    
    fileSystem.homedir();
    expect(os.homedir).toHaveBeenCalled();
  });
  
  test('ensureDirSync forwards to fs.ensureDirSync', () => {
    const mockPath = '/test/dir';
    vi.spyOn(fs, 'ensureDirSync').mockImplementation(() => {});
    
    fileSystem.ensureDirSync(mockPath);
    expect(fs.ensureDirSync).toHaveBeenCalledWith(mockPath);
  });
  
  test('writeFileSync forwards to fs.writeFileSync', () => {
    const mockPath = '/test/file.txt';
    const mockContent = 'test content';
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    
    fileSystem.writeFileSync(mockPath, mockContent);
    expect(fs.writeFileSync).toHaveBeenCalledWith(mockPath, mockContent);
  });
  
  test('existsSync forwards to fs.existsSync', () => {
    const mockPath = '/test/file.txt';
    vi.spyOn(fs, 'existsSync').mockImplementation(() => true);
    
    fileSystem.existsSync(mockPath);
    expect(fs.existsSync).toHaveBeenCalledWith(mockPath);
  });
  
  test('rename forwards to fs.rename', async () => {
    const oldPath = '/test/oldfile.txt';
    const newPath = '/test/newfile.txt';
    vi.spyOn(fs, 'rename').mockImplementation(() => Promise.resolve());
    
    await fileSystem.rename(oldPath, newPath);
    expect(fs.rename).toHaveBeenCalledWith(oldPath, newPath);
  });
});