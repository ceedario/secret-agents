import { Session } from './Session.js';

/**
 * Manages active Claude sessions
 */
export class SessionManager {
  private sessions: Map<string, Session>;

  constructor() {
    this.sessions = new Map();
  }

  /**
   * Add a session
   */
  addSession(issueId: string, session: Session): void {
    this.sessions.set(issueId, session);
  }

  /**
   * Get a session
   */
  getSession(issueId: string): Session | undefined {
    return this.sessions.get(issueId);
  }

  /**
   * Check if a session exists
   */
  hasSession(issueId: string): boolean {
    return this.sessions.has(issueId);
  }

  /**
   * Remove a session
   */
  removeSession(issueId: string): boolean {
    return this.sessions.delete(issueId);
  }

  /**
   * Get all sessions
   */
  getAllSessions(): Map<string, Session> {
    return this.sessions;
  }

  /**
   * Update a session
   */
  updateSession(issueId: string, session: Session): boolean {
    if (!this.sessions.has(issueId)) {
      return false;
    }

    this.sessions.set(issueId, session);
    return true;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): Array<[string, Session]> {
    return Array.from(this.sessions.entries()).filter(([_, session]) => session.isActive());
  }

  /**
   * Count active sessions
   */
  countActiveSessions(): number {
    return this.getActiveSessions().length;
  }
}
