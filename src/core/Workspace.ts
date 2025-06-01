import path from 'path'
import { Issue } from './Issue.js'

/**
 * Represents a workspace for an issue
 */
export class Workspace {
  issue: Issue
  path: string
  isGitWorktree: boolean
  historyPath: string | null

  constructor({
    issue,
    path,
    isGitWorktree = false,
    historyPath = null,
  }: {
    issue: Issue
    path: string
    isGitWorktree?: boolean
    historyPath?: string | null
  }) {
    this.issue = issue
    this.path = path
    this.isGitWorktree = isGitWorktree
    this.historyPath = historyPath
  }

  /**
   * Get the branch name for this workspace
   */
  getBranchName(): string {
    return this.issue.getBranchName()
  }

  /**
   * Get the workspace name (derived from issue identifier)
   */
  getName(): string {
    return this.issue.getBranchName()
  }

  /**
   * Get the path to the conversation history file
   */
  getHistoryFilePath(): string | null {
    return this.historyPath
  }

  /**
   * Get the path to the setup script if it exists
   */
  getSetupScriptPath(): string {
    return path.join(this.path, 'secretagentsetup.sh')
  }
}