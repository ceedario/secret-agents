import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

// Mock the modules before any imports
vi.mock('fs-extra', () => ({
  pathExists: vi.fn(),
  ensureDir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  appendFile: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
  remove: vi.fn(),
  ensureDirSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  rename: vi.fn()
}));

vi.mock('path', () => ({
  join: vi.fn(),
  basename: vi.fn(),
  dirname: vi.fn()
}));

vi.mock('os', () => ({
  homedir: vi.fn()
}));

import { FileSystem } from '../../../src/utils/FileSystem.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('FileSystem', () => {
  let fileSystem;

  beforeEach(() => {
    fileSystem = new FileSystem();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('pathExists forwards to fs.pathExists', async () => {
    const mockFilePath = '/test/path';
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    
    await fileSystem.pathExists(mockFilePath);
    expect(fs.pathExists).toHaveBeenCalledWith(mockFilePath);
  });

  test('ensureDir forwards to fs.ensureDir', async () => {
    const mockDirPath = '/test/path';
    vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
    
    await fileSystem.ensureDir(mockDirPath);
    expect(fs.ensureDir).toHaveBeenCalledWith(mockDirPath);
  });

  test('readFile forwards to fs.readFile', async () => {
    const mockFilePath = '/test/file.txt';
    const mockEncoding = 'utf-8';
    vi.mocked(fs.readFile).mockResolvedValue('test content');
    
    await fileSystem.readFile(mockFilePath, mockEncoding);
    expect(fs.readFile).toHaveBeenCalledWith(mockFilePath, mockEncoding);
  });

  test('writeFile forwards to fs.writeFile', async () => {
    const mockFilePath = '/test/file.txt';
    const mockContent = 'test content';
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    
    await fileSystem.writeFile(mockFilePath, mockContent);
    expect(fs.writeFile).toHaveBeenCalledWith(mockFilePath, mockContent);
  });

  test('appendFile forwards to fs.appendFile', async () => {
    const mockFilePath = '/test/file.txt';
    const mockContent = 'test content';
    vi.mocked(fs.appendFile).mockResolvedValue(undefined);
    
    await fileSystem.appendFile(mockFilePath, mockContent);
    expect(fs.appendFile).toHaveBeenCalledWith(mockFilePath, mockContent);
  });

  test('readDir forwards to fs.readdir', async () => {
    const mockDirPath = '/test/dir';
    vi.mocked(fs.readdir).mockResolvedValue(['file1.txt', 'file2.txt'] as any);
    
    await fileSystem.readDir(mockDirPath);
    expect(fs.readdir).toHaveBeenCalledWith(mockDirPath);
  });

  test('stat forwards to fs.stat', async () => {
    const mockFilePath = '/test/file.txt';
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false } as any);
    
    await fileSystem.stat(mockFilePath);
    expect(fs.stat).toHaveBeenCalledWith(mockFilePath);
  });

  test('remove forwards to fs.remove', async () => {
    const mockFilePath = '/test/file.txt';
    vi.mocked(fs.remove).mockResolvedValue(undefined);
    
    await fileSystem.remove(mockFilePath);
    expect(fs.remove).toHaveBeenCalledWith(mockFilePath);
  });

  test('joinPath forwards to path.join', () => {
    const mockPaths = ['/test', 'dir', 'file.txt'];
    vi.mocked(path.join).mockReturnValue('/test/dir/file.txt');
    
    fileSystem.joinPath(...mockPaths);
    expect(path.join).toHaveBeenCalledWith(...mockPaths);
  });

  test('basename forwards to path.basename', () => {
    const mockFilePath = '/test/dir/file.txt';
    vi.mocked(path.basename).mockReturnValue('file.txt');
    
    fileSystem.basename(mockFilePath);
    expect(path.basename).toHaveBeenCalledWith(mockFilePath);
  });

  test('dirname forwards to path.dirname', () => {
    const mockFilePath = '/test/dir/file.txt';
    vi.mocked(path.dirname).mockReturnValue('/test/dir');
    
    fileSystem.dirname(mockFilePath);
    expect(path.dirname).toHaveBeenCalledWith(mockFilePath);
  });

  test('homedir forwards to os.homedir', () => {
    vi.mocked(os.homedir).mockReturnValue('/home/user');
    
    fileSystem.homedir();
    expect(os.homedir).toHaveBeenCalled();
  });

  test('ensureDirSync forwards to fs.ensureDirSync', () => {
    const mockDirPath = '/test/dir';
    vi.mocked(fs.ensureDirSync).mockReturnValue(undefined);
    
    fileSystem.ensureDirSync(mockDirPath);
    expect(fs.ensureDirSync).toHaveBeenCalledWith(mockDirPath);
  });

  test('writeFileSync forwards to fs.writeFileSync', () => {
    const mockFilePath = '/test/file.txt';
    const mockContent = 'test content';
    vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
    
    fileSystem.writeFileSync(mockFilePath, mockContent);
    expect(fs.writeFileSync).toHaveBeenCalledWith(mockFilePath, mockContent);
  });

  test('existsSync forwards to fs.existsSync', () => {
    const mockFilePath = '/test/file.txt';
    vi.mocked(fs.existsSync).mockReturnValue(true);
    
    fileSystem.existsSync(mockFilePath);
    expect(fs.existsSync).toHaveBeenCalledWith(mockFilePath);
  });

  test('rename forwards to fs.rename', async () => {
    const oldPath = '/test/oldfile.txt';
    const newPath = '/test/newfile.txt';
    vi.mocked(fs.rename).mockResolvedValue(undefined);
    
    await fileSystem.rename(oldPath, newPath);
    expect(fs.rename).toHaveBeenCalledWith(oldPath, newPath);
  });
});