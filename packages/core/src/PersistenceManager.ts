import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import { existsSync } from 'fs'

/**
 * Serializable session state for persistence
 */
export interface SerializableSession {
  issueId: string
  issueIdentifier: string
  issueTitle: string
  branchName: string
  workspacePath: string
  isGitWorktree: boolean
  historyPath?: string
  claudeSessionId: string | null
  agentRootCommentId: string | null
  lastCommentId: string | null
  currentParentId: string | null
  startedAt: string
  exitedAt: string | null
  conversationContext: any
}

/**
 * Serializable EdgeWorker state for persistence
 */
export interface SerializableEdgeWorkerState {
  commentToRepo: Record<string, string>
  commentToIssue: Record<string, string>
  commentToLatestAgentReply: Record<string, string>
  issueToCommentThreads: Record<string, string[]>
  issueToReplyContext: Record<string, { commentId: string; parentId?: string }>
  sessionsByCommentId: Record<string, SerializableSession>
  sessionsByIssueId: Record<string, SerializableSession[]>
  // Agent Session state - keyed by repository ID
  agentSessions?: Record<string, Record<string, any>> // Maps repositoryId -> sessionId -> AgentSession
  agentSessionEntries?: Record<string, Record<string, any[]>> // Maps repositoryId -> sessionId -> AgentSessionEntry[]
}

/**
 * Manages persistence of critical mappings to survive restarts
 */
export class PersistenceManager {
  private persistencePath: string

  constructor(persistencePath?: string) {
    this.persistencePath = persistencePath || join(homedir(), '.cyrus', 'state')
  }

  /**
   * Get the full path to the state file for a repository
   */
  private getStateFilePath(repositoryId: string): string {
    return join(this.persistencePath, `${repositoryId}-state.json`)
  }

  /**
   * Ensure the persistence directory exists
   */
  private async ensurePersistenceDirectory(): Promise<void> {
    await mkdir(this.persistencePath, { recursive: true })
  }

  /**
   * Save EdgeWorker state to disk
   */
  async saveEdgeWorkerState(repositoryId: string, state: SerializableEdgeWorkerState): Promise<void> {
    try {
      await this.ensurePersistenceDirectory()
      const stateFile = this.getStateFilePath(repositoryId)
      const stateData = {
        version: '1.0',
        savedAt: new Date().toISOString(),
        repositoryId,
        state
      }
      await writeFile(stateFile, JSON.stringify(stateData, null, 2), 'utf8')
    } catch (error) {
      console.error(`Failed to save EdgeWorker state for ${repositoryId}:`, error)
      throw error
    }
  }

  /**
   * Load EdgeWorker state from disk
   */
  async loadEdgeWorkerState(repositoryId: string): Promise<SerializableEdgeWorkerState | null> {
    try {
      const stateFile = this.getStateFilePath(repositoryId)
      if (!existsSync(stateFile)) {
        return null
      }

      const stateData = JSON.parse(await readFile(stateFile, 'utf8'))
      
      // Validate state structure
      if (!stateData.state || !stateData.repositoryId || stateData.repositoryId !== repositoryId) {
        console.warn(`Invalid state file for ${repositoryId}, ignoring`)
        return null
      }

      return stateData.state
    } catch (error) {
      console.error(`Failed to load EdgeWorker state for ${repositoryId}:`, error)
      return null
    }
  }

  /**
   * Check if state file exists for a repository
   */
  hasStateFile(repositoryId: string): boolean {
    return existsSync(this.getStateFilePath(repositoryId))
  }

  /**
   * Delete state file for a repository
   */
  async deleteStateFile(repositoryId: string): Promise<void> {
    try {
      const stateFile = this.getStateFilePath(repositoryId)
      if (existsSync(stateFile)) {
        await writeFile(stateFile, '', 'utf8') // Clear file instead of deleting
      }
    } catch (error) {
      console.error(`Failed to delete state file for ${repositoryId}:`, error)
    }
  }

  /**
   * Convert Map to Record for serialization
   */
  static mapToRecord<T>(map: Map<string, T>): Record<string, T> {
    return Object.fromEntries(map.entries())
  }

  /**
   * Convert Record to Map for deserialization
   */
  static recordToMap<T>(record: Record<string, T>): Map<string, T> {
    return new Map(Object.entries(record))
  }

  /**
   * Convert Set to Array for serialization
   */
  static setToArray<T>(set: Set<T>): T[] {
    return Array.from(set)
  }

  /**
   * Convert Array to Set for deserialization
   */
  static arrayToSet<T>(array: T[]): Set<T> {
    return new Set(array)
  }
}