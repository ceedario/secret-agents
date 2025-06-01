import { Session } from '../core/Session.js'

/**
 * Manages active Claude sessions
 */
export class SessionManager {
  private sessions: Map<string, Session>

  constructor() {
    this.sessions = new Map()
  }
  
  /**
   * Add a session
   * @param issueId - The issue ID
   * @param session - The session to add
   */
  addSession(issueId: string, session: Session): void {
    this.sessions.set(issueId, session)
  }
  
  /**
   * Get a session
   * @param issueId - The issue ID
   * @returns The session if it exists
   */
  getSession(issueId: string): Session | undefined {
    return this.sessions.get(issueId)
  }
  
  /**
   * Check if a session exists
   * @param issueId - The issue ID
   * @returns Whether the session exists
   */
  hasSession(issueId: string): boolean {
    return this.sessions.has(issueId)
  }
  
  /**
   * Remove a session
   * @param issueId - The issue ID
   * @returns Whether the session was removed
   */
  removeSession(issueId: string): boolean {
    return this.sessions.delete(issueId)
  }
  
  /**
   * Get all sessions
   * @returns All sessions
   */
  getAllSessions(): Map<string, Session> {
    return this.sessions
  }
  
  /**
   * Update a session
   * @param issueId - The issue ID
   * @param session - The updated session
   * @returns Whether the session was updated
   */
  updateSession(issueId: string, session: Session): boolean {
    if (!this.sessions.has(issueId)) {
      return false
    }
    
    this.sessions.set(issueId, session)
    return true
  }
}