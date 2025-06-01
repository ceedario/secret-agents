import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';

import { WorkspaceService } from '../services/WorkspaceService.js';
import { Workspace } from '../core/Workspace.js';
import { FileSystem, ProcessManager } from '../utils/index.js';
import { Issue } from '../core/Issue.js';

interface ScriptOutput {
  stdout: string;
  stderr: string;
}

/**
 * Implementation of WorkspaceService using the file system and git
 */
export class FSWorkspaceService extends WorkspaceService {
  private baseDir: string;
  private fileSystem: FileSystem;
  private processManager: ProcessManager;
  private mainBranch: string;

  /**
   * @param baseDir - Base directory for workspaces
   * @param fileSystem - File system utility
   * @param processManager - Process manager utility
   * @param mainBranch - Main branch name
   */
  constructor(
    baseDir: string, 
    fileSystem: FileSystem = new FileSystem(), 
    processManager: ProcessManager = new ProcessManager(), 
    mainBranch: string = 'main'
  ) {
    super();
    this.baseDir = baseDir;
    this.fileSystem = fileSystem;
    this.processManager = processManager;
    this.mainBranch = mainBranch;
  }
  
  /**
   * Helper to get repo root
   * @returns Promise<string|null> - Repo root path or null
   */
  async _getRepoRoot(): Promise<string | null> {
    return new Promise((resolve) => {
      let repoRoot = '';
      let stderr = '';
      
      const process = this.processManager.spawn(['git', 'rev-parse', '--show-toplevel'], { 
        stdio: ['ignore', 'pipe', 'pipe'] 
      });
      
      this.processManager.setupProcessHandlers(process, {
        onStdout: (data: Buffer) => repoRoot += data.toString().trim(),
        onStderr: (data: Buffer) => stderr += data.toString(),
        onClose: (code: number | null) => {
          if (code === 0 && repoRoot) {
            resolve(repoRoot);
          } else {
            console.log('Could not determine git repository root.', stderr.trim());
            resolve(null);
          }
        },
        onError: (err: Error) => {
          console.log('Error checking for git repository root:', err.message);
          resolve(null);
        }
      });
    });
  }
  
  /**
   * Helper to execute setup script
   * @param workspacePath - Path to workspace
   * @param scriptPath - Path to script
   * @returns Promise<ScriptOutput> - Script output
   */
  async _executeSetupScript(workspacePath: string, scriptPath: string): Promise<ScriptOutput> {
    return new Promise((resolve, reject) => {
      const scriptProcess = spawn('bash', [path.basename(scriptPath)], {
        cwd: workspacePath,
        stdio: 'pipe'
      });
      
      let scriptStdout = '';
      let scriptStderr = '';
      
      scriptProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        scriptStdout += output;
        console.log(`[Setup Script - ${path.basename(workspacePath)}] stdout: ${output.trim()}`);
      });
      
      scriptProcess.stderr.on('data', (data: Buffer) => {
        const errorOutput = data.toString();
        scriptStderr += errorOutput;
        console.error(`[Setup Script - ${path.basename(workspacePath)}] stderr: ${errorOutput.trim()}`);
      });
      
      scriptProcess.on('close', (code: number | null) => {
        if (code === 0) {
          console.log(`Setup script in ${workspacePath} finished successfully.`);
          resolve({ stdout: scriptStdout, stderr: scriptStderr });
        } else {
          console.error(`Setup script in ${workspacePath} failed with code ${code}.`);
          reject(new Error(`Setup script failed with code ${code}\nStderr: ${scriptStderr}`));
        }
      });
      
      scriptProcess.on('error', (err: Error) => {
        console.error(`Failed to start setup script in ${workspacePath}: ${err.message}`);
        reject(err);
      });
    });
  }
  
  /**
   * Run setup script if it exists
   * @param workspacePath - Path to workspace
   * @returns Promise<void>
   */
  async _runSetupScriptIfNeeded(workspacePath: string): Promise<void> {
    const setupScriptPath = path.join(workspacePath, 'secretagentsetup.sh');
    
    try {
      if (await fs.pathExists(setupScriptPath)) {
        console.log(`Found setup script at ${setupScriptPath}. Executing...`);
        await this._executeSetupScript(workspacePath, setupScriptPath);
      } else {
        console.log(`No setup script (secretagentsetup.sh) found in ${workspacePath}.`);
      }
    } catch (error) {
      console.error(`Error checking for or running setup script in ${workspacePath}:`, error);
    }
  }
  
  /**
   * Verify branch and run setup
   * @param workspacePath - Path to workspace
   * @param expectedBranchName - Expected branch name
   * @returns Promise<void>
   */
  async _verifyBranchAndRunSetup(workspacePath: string, expectedBranchName: string): Promise<void> {
    return new Promise(async (resolve) => {
      // Check if git is available in the workspace directory
      const checkGit = spawn('git', ['status'], { cwd: workspacePath, stdio: 'ignore' });
      
      checkGit.on('close', async (code: number | null) => {
        if (code !== 0) {
          console.log(`Git not available or ${workspacePath} is not a git repository. Skipping branch verification.`);
          // Still try to run setup script even if not a git repo
          await this._runSetupScriptIfNeeded(workspacePath);
          resolve();
          return;
        }
        
        // Git is available, verify the branch
        const gitBranch = spawn('git', ['branch', '--show-current'], { cwd: workspacePath, stdio: ['ignore', 'pipe', 'pipe'] });
        let currentBranch = '';
        
        gitBranch.stdout.on('data', (data: Buffer) => currentBranch += data.toString().trim());
        
        gitBranch.on('close', async (branchCode: number | null) => {
          if (branchCode === 0) {
            if (currentBranch === expectedBranchName) {
              console.log(`Workspace ${workspacePath} is correctly on branch ${expectedBranchName}`);
            } else {
              console.log(`Workspace ${workspacePath} is on branch ${currentBranch}, attempting to switch to ${expectedBranchName}`);
              
              const gitCheckout = spawn('git', ['checkout', expectedBranchName], { cwd: workspacePath, stdio: 'pipe' });
              let checkoutStderr = '';
              
              gitCheckout.stderr.on('data', (data: Buffer) => checkoutStderr += data.toString());
              
              gitCheckout.on('close', (checkoutCode: number | null) => {
                if (checkoutCode === 0) {
                  console.log(`Successfully checked out branch ${expectedBranchName}`);
                } else {
                  console.warn(`Failed to checkout branch ${expectedBranchName} (code ${checkoutCode}): ${checkoutStderr.trim()}`);
                }
                
                // Continue to setup script check after checkout attempt
                this._runSetupScriptIfNeeded(workspacePath).then(resolve);
              });
              
              gitCheckout.on('error', (err: Error) => {
                console.error(`Error spawning git checkout: ${err.message}`);
                this._runSetupScriptIfNeeded(workspacePath).then(resolve);
              });
              
              return; // Don't run setup script yet if checkout is attempted
            }
          } else {
            console.log(`Failed to get current branch in workspace ${workspacePath}.`);
          }
          
          // If branch was already correct or check failed, run setup script now
          await this._runSetupScriptIfNeeded(workspacePath);
          resolve();
        });
        
        gitBranch.on('error', async (err: Error) => {
          console.error(`Error spawning git branch: ${err.message}`);
          await this._runSetupScriptIfNeeded(workspacePath);
          resolve();
        });
      });
      
      checkGit.on('error', (err: Error) => {
        console.error(`Error spawning git status: ${err.message}. Cannot verify workspace.`);
        resolve();
      });
    });
  }
  
  /**
   * Pull the latest changes from the main branch
   * @param mainBranch - The name of the main branch
   * @returns Promise<boolean> - Whether the pull was successful
   */
  async _pullMainBranch(mainBranch: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      const repoRoot = await this._getRepoRoot();
      
      if (!repoRoot) {
        console.log('Not in a git repository, skipping pull.');
        resolve(false);
        return;
      }
      
      // First, check if we're on the main branch
      const currentBranch = await new Promise<string | null>((resolveBranch) => {
        let branchName = '';
        const branchProcess = this.processManager.spawn(['git', 'branch', '--show-current'], { 
          cwd: repoRoot,
          stdio: ['ignore', 'pipe', 'pipe'] 
        });
        
        branchProcess.stdout.on('data', (data: Buffer) => branchName += data.toString().trim());
        
        branchProcess.on('close', (code: number | null) => {
          if (code === 0) {
            resolveBranch(branchName);
          } else {
            console.warn('Unable to determine current branch.');
            resolveBranch(null);
          }
        });
        
        branchProcess.on('error', (err: Error) => {
          console.error(`Error checking current branch: ${err.message}`);
          resolveBranch(null);
        });
      });
      
      // If we're not on the main branch, checkout the main branch first
      if (currentBranch !== mainBranch) {
        console.log(`Currently on branch '${currentBranch}', checking out '${mainBranch}' before pulling...`);
        
        const checkoutResult = await new Promise<boolean>((resolveCheckout) => {
          const checkoutProcess = this.processManager.spawn(['git', 'checkout', mainBranch], { 
            cwd: repoRoot,
            stdio: ['ignore', 'pipe', 'pipe'] 
          });
          
          let checkoutError = '';
          
          checkoutProcess.stderr.on('data', (data: Buffer) => checkoutError += data.toString());
          
          checkoutProcess.on('close', (code: number | null) => {
            if (code === 0) {
              console.log(`Successfully checked out ${mainBranch} branch.`);
              resolveCheckout(true);
            } else {
              console.error(`Failed to checkout ${mainBranch} branch: ${checkoutError.trim()}`);
              resolveCheckout(false);
            }
          });
          
          checkoutProcess.on('error', (err: Error) => {
            console.error(`Error checking out ${mainBranch} branch: ${err.message}`);
            resolveCheckout(false);
          });
        });
        
        if (!checkoutResult) {
          console.warn(`Unable to checkout ${mainBranch} branch, skipping pull.`);
          resolve(false);
          return;
        }
      }
      
      // Now pull the latest changes
      console.log(`Pulling latest changes from ${mainBranch} branch...`);
      
      const pullProcess = this.processManager.spawn(['git', 'pull', 'origin', mainBranch], { 
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'pipe'] 
      });
      
      let pullOutput = '';
      let pullError = '';
      
      pullProcess.stdout.on('data', (data: Buffer) => pullOutput += data.toString());
      pullProcess.stderr.on('data', (data: Buffer) => pullError += data.toString());
      
      pullProcess.on('close', (code: number | null) => {
        if (code === 0) {
          console.log(`Successfully pulled latest changes from ${mainBranch} branch.`);
          console.log(pullOutput.trim());
          resolve(true);
        } else {
          console.error(`Failed to pull latest changes from ${mainBranch} branch: ${pullError.trim()}`);
          resolve(false);
        }
      });
      
      pullProcess.on('error', (err: Error) => {
        console.error(`Error pulling from ${mainBranch} branch: ${err.message}`);
        resolve(false);
      });
    });
  }
  
  /**
   * Create git worktree
   * @param workspacePath - Path to workspace
   * @param branchName - Branch name
   * @param mainBranch - The name of the main branch
   * @returns Promise<boolean> - Whether it's a git worktree
   */
  async _createGitWorktree(workspacePath: string, branchName: string, mainBranch: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const repoRoot = await this._getRepoRoot();
      
      if (!repoRoot) {
        console.log('Not in a git repository, creating simple workspace directory.');
        await fs.ensureDir(workspacePath);
        resolve(false);
        return;
      }
      
      // Pull the latest changes from the main branch
      await this._pullMainBranch(mainBranch);
      
      console.log(`Attempting to create/attach git worktree for branch ${branchName} at ${workspacePath}`);
      
      // Try creating worktree with a new branch first, tracking origin/main
      const addWithNewBranch = spawn('git', ['worktree', 'add', '--track', '-b', branchName, workspacePath, `origin/${mainBranch}`], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
      
      let addWithNewBranchStderr = '';
      
      addWithNewBranch.stderr.on('data', (data: Buffer) => addWithNewBranchStderr += data.toString());
      
      addWithNewBranch.on('close', async (code: number | null) => {
        if (code === 0) {
          console.log(`Successfully created new worktree and branch ${branchName} at ${workspacePath}`);
          resolve(true);
        } else {
          console.log(`Failed to create worktree with new branch (code ${code}): ${addWithNewBranchStderr.trim()}.`);
          
          // Check if the failure is because the branch already exists
          const branchExistsError = addWithNewBranchStderr.includes(`branch '${branchName}' already exists`) || 
                                   addWithNewBranchStderr.includes(`already exists`);
          
          if (branchExistsError) {
            console.log(`Branch ${branchName} already exists or path is occupied. Attempting to attach worktree to existing branch.`);
            
            // Try adding worktree attached to the existing branch
            const addExistingBranch = spawn('git', ['worktree', 'add', workspacePath, branchName], {
              cwd: repoRoot,
              stdio: 'pipe'
            });
            
            let addExistingBranchStderr = '';
            
            addExistingBranch.stderr.on('data', (data: Buffer) => addExistingBranchStderr += data.toString());
            
            addExistingBranch.on('close', async (codeExisting: number | null) => {
              if (codeExisting === 0) {
                console.log(`Successfully attached worktree to existing branch ${branchName} at ${workspacePath}`);
                resolve(true);
              } else {
                // Check if failure is because worktree path already exists
                if (addExistingBranchStderr.includes('already exists') && addExistingBranchStderr.includes(workspacePath)) {
                  console.warn(`Worktree path ${workspacePath} already exists but might not be properly linked. Assuming it's usable.`);
                  resolve(true);
                } else {
                  console.error(`Failed to attach worktree to existing branch ${branchName} (code ${codeExisting}): ${addExistingBranchStderr.trim()}. Creating simple directory instead.`);
                  await fs.ensureDir(workspacePath);
                  resolve(false);
                }
              }
            });
            
            addExistingBranch.on('error', async (err: Error) => {
              console.error(`Error spawning git worktree add (existing branch): ${err.message}. Creating simple directory instead.`);
              await fs.ensureDir(workspacePath);
              resolve(false);
            });
          } else {
            // Different error, fallback to simple directory
            console.error(`Failed to create worktree for unknown reason. Creating simple directory instead.`);
            await fs.ensureDir(workspacePath);
            resolve(false);
          }
        }
      });
      
      addWithNewBranch.on('error', async (err: Error) => {
        console.error(`Error spawning git worktree add (new branch): ${err.message}. Creating simple directory instead.`);
        await fs.ensureDir(workspacePath);
        resolve(false);
      });
    });
  }
  
  /**
   * Get the path to the conversation history file
   * @param workspacePath - Workspace path
   * @returns string - History file path
   */
  _getHistoryFilePath(workspacePath: string): string {
    const homeDir = this.fileSystem.homedir();
    const workspaceFolderName = this.fileSystem.basename(workspacePath);
    const historyDir = this.fileSystem.joinPath(
      homeDir,
      '.linearsecretagent',
      workspaceFolderName
    );
    
    // Ensure the directory exists
    this.fileSystem.ensureDirSync(historyDir);
    
    return this.fileSystem.joinPath(historyDir, 'conversation-history.jsonl');
  }
  
  /**
   * @inheritdoc
   */
  override async setupBaseDir(): Promise<string> {
    try {
      // Ensure the base directory exists
      await this.fileSystem.ensureDir(this.baseDir);
      console.log(`Workspace base directory ready: ${this.baseDir}`);
      return this.baseDir;
    } catch (error) {
      console.error('Failed to setup workspace directory:', error);
      throw error;
    }
  }
  
  /**
   * @inheritdoc
   */
  override async getWorkspaceForIssue(issue: Issue): Promise<Workspace | null> {
    const workspaceName = issue.getBranchName();
    const workspacePath = this.fileSystem.joinPath(this.baseDir, workspaceName);
    
    if (await this.fileSystem.pathExists(workspacePath)) {
      // Determine if it's a git worktree by checking for .git file/directory
      const gitPath = this.fileSystem.joinPath(workspacePath, '.git');
      const isGitWorktree = await this.fileSystem.pathExists(gitPath);
      
      const historyPath = this._getHistoryFilePath(workspacePath);
      
      return new Workspace({
        issue,
        path: workspacePath,
        isGitWorktree,
        historyPath
      });
    }
    
    return null;
  }
  
  /**
   * @inheritdoc
   */
  override async createWorkspace(issue: Issue): Promise<Workspace> {
    const workspaceName = issue.getBranchName();
    const workspacePath = path.join(this.baseDir, workspaceName);
    
    try {
      console.log(`Using main branch: ${this.mainBranch}`);
      
      // Ensure the parent directory exists
      await fs.ensureDir(path.dirname(workspacePath));
      
      // Check if workspace directory already exists
      if (await fs.pathExists(workspacePath)) {
        console.log(`Workspace directory ${workspacePath} already exists. Verifying branch and running setup script...`);
        
        // It exists, ensure it's set up correctly
        await this._verifyBranchAndRunSetup(workspacePath, workspaceName);
        
        const isGitWorktree = await fs.pathExists(path.join(workspacePath, '.git'));
        const historyPath = this._getHistoryFilePath(workspacePath);
        
        return new Workspace({
          issue,
          path: workspacePath,
          isGitWorktree,
          historyPath
        });
      } else {
        console.log(`Workspace directory ${workspacePath} does not exist. Creating worktree/directory...`);
        
        // Create the worktree (or simple dir if git fails)
        const isGitWorktree = await this._createGitWorktree(workspacePath, workspaceName, this.mainBranch);
        
        // Verify branch and run setup script
        console.log(`Worktree/directory created. Verifying branch and running setup script...`);
        await this._verifyBranchAndRunSetup(workspacePath, workspaceName);
        
        const historyPath = this._getHistoryFilePath(workspacePath);
        
        console.log(`Workspace setup complete for ${issue.identifier} at ${workspacePath}`);
        
        return new Workspace({
          issue,
          path: workspacePath,
          isGitWorktree,
          historyPath
        });
      }
    } catch (error) {
      console.error(`Failed to create or verify workspace for issue ${issue.identifier}:`, error);
      throw error;
    }
  }
  
  /**
   * @inheritdoc
   */
  override async cleanupWorkspace(workspace: Workspace): Promise<void> {
    const workspacePath = workspace.path;
    
    return new Promise(async (resolve) => {
      const repoRoot = await this._getRepoRoot();
      
      if (!repoRoot || !workspace.isGitWorktree) {
        console.log(`Not a git worktree, attempting simple directory removal for ${workspacePath}`);
        
        try {
          await fs.remove(workspacePath);
          console.log(`Removed directory ${workspacePath}`);
        } catch (err) {
          console.error(`Failed to remove directory ${workspacePath}: ${(err as Error).message}`);
        }
        
        resolve();
        return;
      }
      
      // It's a git repo and a worktree, attempt worktree removal
      console.log(`Attempting to remove git worktree at ${workspacePath}`);
      
      const gitRemove = spawn('git', ['worktree', 'remove', '--force', workspacePath], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
      
      let removeStderr = '';
      
      gitRemove.stderr.on('data', (data: Buffer) => removeStderr += data.toString());
      
      gitRemove.on('close', async (code: number | null) => {
        if (code === 0) {
          console.log(`Successfully removed git worktree at ${workspacePath}`);
        } else {
          console.log(`Failed to remove git worktree at ${workspacePath} (code ${code}): ${removeStderr.trim()}. Attempting simple directory removal.`);
          
          // Fallback to simple directory removal
          try {
            await fs.remove(workspacePath);
            console.log(`Removed directory ${workspacePath} as fallback.`);
          } catch (err) {
            console.error(`Fallback directory removal failed for ${workspacePath}: ${(err as Error).message}`);
          }
        }
        
        resolve();
      });
      
      gitRemove.on('error', async (err: Error) => {
        console.error(`Error spawning git worktree remove for ${workspacePath}: ${err.message}. Attempting simple directory removal.`);
        
        try {
          await fs.remove(workspacePath);
          console.log(`Removed directory ${workspacePath} as fallback.`);
        } catch (fsErr) {
          console.error(`Fallback directory removal failed for ${workspacePath}: ${(fsErr as Error).message}`);
        }
        
        resolve();
      });
    });
  }
  
  /**
   * @inheritdoc
   */
  override async cleanupAllWorkspaces(): Promise<void> {
    try {
      if (!await fs.pathExists(this.baseDir)) {
        console.log(`Workspace base directory ${this.baseDir} does not exist, nothing to clean up.`);
        return;
      }
      
      // Get all entries in the base directory
      const entries = await fs.readdir(this.baseDir);
      
      // Clean up each entry
      for (const entryName of entries) {
        const workspacePath = path.join(this.baseDir, entryName);
        
        try {
          const stats = await fs.stat(workspacePath);
          
          if (stats.isDirectory()) {
            // Check if it looks like a worktree
            const gitFilePath = path.join(workspacePath, '.git');
            
            if (await fs.pathExists(gitFilePath)) {
              const gitFileContent = await fs.readFile(gitFilePath, 'utf8');
              const isGitWorktree = gitFileContent.includes('gitdir:');
              
              // Create a minimal workspace object for cleanup
              const workspace = new Workspace({
                issue: {} as Issue, // Minimal issue object, not used in cleanup
                path: workspacePath,
                isGitWorktree,
                historyPath: ''
              });
              
              console.log(`Cleaning up ${isGitWorktree ? 'worktree' : 'directory'}: ${workspacePath}`);
              await this.cleanupWorkspace(workspace);
            } else {
              console.log(`Cleaning up directory (no .git file): ${workspacePath}`);
              await fs.remove(workspacePath);
            }
          }
        } catch (statError) {
          console.warn(`Could not process entry ${workspacePath} during cleanup: ${(statError as Error).message}`);
        }
      }
      
      console.log('Workspace cleanup process finished.');
    } catch (error) {
      console.error('Failed during workspace cleanup:', error);
    }
  }
}