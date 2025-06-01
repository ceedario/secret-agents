import { vi } from 'vitest';

// Mock the modules before importing FileSystem
vi.mock('fs-extra', () => ({
  default: {
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
    rename: vi.fn(),
  },
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
  rename: vi.fn(),
}));

vi.mock('path', () => ({
  default: {
    join: vi.fn(),
    basename: vi.fn(),
    dirname: vi.fn(),
  },
  join: vi.fn(),
  basename: vi.fn(),
  dirname: vi.fn(),
}));

vi.mock('os', () => ({
  default: {
    homedir: vi.fn(),
  },
  homedir: vi.fn(),
}));

// Import FileSystem after mocking
import { FileSystem } from '../../../src/utils/FileSystem.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

// Create a simple test suite that verifies the FileSystem class properly forwards calls to the underlying implementations
describe('FileSystem', () => {
  let fileSystem;
  
  beforeEach(() => {
    vi.clearAllMocks();
    fileSystem = new FileSystem();
  });
  
  test('pathExists forwards to fs.pathExists', async () => {
    const mockPath = '/test/path';
    fs.pathExists.mockResolvedValue(true);
    
    const result = await fileSystem.pathExists(mockPath);
    expect(fs.pathExists).toHaveBeenCalledWith(mockPath);
    expect(result).toBe(true);
  });
  
  test('ensureDir forwards to fs.ensureDir', async () => {
    const mockPath = '/test/path';
    fs.ensureDir.mockResolvedValue(undefined);
    
    await fileSystem.ensureDir(mockPath);
    expect(fs.ensureDir).toHaveBeenCalledWith(mockPath);
  });
  
  test('readFile forwards to fs.readFile', async () => {
    const mockPath = '/test/file.txt';
    const mockEncoding = 'utf-8';
    fs.readFile.mockResolvedValue('test content');
    
    const result = await fileSystem.readFile(mockPath, mockEncoding);
    expect(fs.readFile).toHaveBeenCalledWith(mockPath, mockEncoding);
    expect(result).toBe('test content');
  });
  
  test('writeFile forwards to fs.writeFile', async () => {
    const mockPath = '/test/file.txt';
    const mockContent = 'test content';
    fs.writeFile.mockResolvedValue(undefined);
    
    await fileSystem.writeFile(mockPath, mockContent);
    expect(fs.writeFile).toHaveBeenCalledWith(mockPath, mockContent);
  });
  
  test('appendFile forwards to fs.appendFile', async () => {
    const mockPath = '/test/file.txt';
    const mockContent = 'test content';
    fs.appendFile.mockResolvedValue(undefined);
    
    await fileSystem.appendFile(mockPath, mockContent);
    expect(fs.appendFile).toHaveBeenCalledWith(mockPath, mockContent);
  });
  
  test('readDir forwards to fs.readdir', async () => {
    const mockPath = '/test/dir';
    fs.readdir.mockResolvedValue(['file1.txt', 'file2.txt']);
    
    const result = await fileSystem.readDir(mockPath);
    expect(fs.readdir).toHaveBeenCalledWith(mockPath);
    expect(result).toEqual(['file1.txt', 'file2.txt']);
  });
  
  test('stat forwards to fs.stat', async () => {
    const mockPath = '/test/file.txt';
    const mockStats = { isDirectory: () => false };
    fs.stat.mockResolvedValue(mockStats);
    
    const result = await fileSystem.stat(mockPath);
    expect(fs.stat).toHaveBeenCalledWith(mockPath);
    expect(result).toBe(mockStats);
  });
  
  test('remove forwards to fs.remove', async () => {
    const mockPath = '/test/file.txt';
    fs.remove.mockResolvedValue(undefined);
    
    await fileSystem.remove(mockPath);
    expect(fs.remove).toHaveBeenCalledWith(mockPath);
  });
  
  test('joinPath forwards to path.join', () => {
    const mockPaths = ['/test', 'dir', 'file.txt'];
    path.join.mockReturnValue('/test/dir/file.txt');
    
    const result = fileSystem.joinPath(...mockPaths);
    expect(path.join).toHaveBeenCalledWith(...mockPaths);
    expect(result).toBe('/test/dir/file.txt');
  });
  
  test('basename forwards to path.basename', () => {
    const mockPath = '/test/dir/file.txt';
    path.basename.mockReturnValue('file.txt');
    
    const result = fileSystem.basename(mockPath);
    expect(path.basename).toHaveBeenCalledWith(mockPath);
    expect(result).toBe('file.txt');
  });
  
  test('dirname forwards to path.dirname', () => {
    const mockPath = '/test/dir/file.txt';
    path.dirname.mockReturnValue('/test/dir');
    
    const result = fileSystem.dirname(mockPath);
    expect(path.dirname).toHaveBeenCalledWith(mockPath);
    expect(result).toBe('/test/dir');
  });
  
  test('homedir forwards to os.homedir', () => {
    os.homedir.mockReturnValue('/home/user');
    
    const result = fileSystem.homedir();
    expect(os.homedir).toHaveBeenCalled();
    expect(result).toBe('/home/user');
  });
  
  test('ensureDirSync forwards to fs.ensureDirSync', () => {
    const mockPath = '/test/dir';
    fs.ensureDirSync.mockReturnValue(undefined);
    
    fileSystem.ensureDirSync(mockPath);
    expect(fs.ensureDirSync).toHaveBeenCalledWith(mockPath);
  });
  
  test('writeFileSync forwards to fs.writeFileSync', () => {
    const mockPath = '/test/file.txt';
    const mockContent = 'test content';
    fs.writeFileSync.mockReturnValue(undefined);
    
    fileSystem.writeFileSync(mockPath, mockContent);
    expect(fs.writeFileSync).toHaveBeenCalledWith(mockPath, mockContent);
  });
  
  test('existsSync forwards to fs.existsSync', () => {
    const mockPath = '/test/file.txt';
    fs.existsSync.mockReturnValue(true);
    
    const result = fileSystem.existsSync(mockPath);
    expect(fs.existsSync).toHaveBeenCalledWith(mockPath);
    expect(result).toBe(true);
  });
  
  test('rename forwards to fs.rename', async () => {
    const oldPath = '/test/oldfile.txt';
    const newPath = '/test/newfile.txt';
    fs.rename.mockResolvedValue(undefined);
    
    await fileSystem.rename(oldPath, newPath);
    expect(fs.rename).toHaveBeenCalledWith(oldPath, newPath);
  });
});