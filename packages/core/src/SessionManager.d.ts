import { Session } from './Session';
/**
 * Manages active Claude sessions
 */
export declare class SessionManager {
  private sessions;
  constructor();
  /**
   * Add a session
   */
  addSession(issueId: string, session: Session): void;
  /**
   * Get a session
   */
  getSession(issueId: string): Session | undefined;
  /**
   * Check if a session exists
   */
  hasSession(issueId: string): boolean;
  /**
   * Remove a session
   */
  removeSession(issueId: string): boolean;
  /**
   * Get all sessions
   */
  getAllSessions(): Map<string, Session>;
  /**
   * Update a session
   */
  updateSession(issueId: string, session: Session): boolean;
  /**
   * Get all active sessions
   */
  getActiveSessions(): Array<[string, Session]>;
  /**
   * Count active sessions
   */
  countActiveSessions(): number;
}
//# sourceMappingURL=SessionManager.d.ts.map
