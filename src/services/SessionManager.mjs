/**
 * Manages active Claude sessions
 */
export class SessionManager {
  constructor() {
    this.sessions = new Map();
  }
  
  /**
   * Add a session
   * @param {string} issueId - The issue ID
   * @param {Session} session - The session to add
   */
  addSession(issueId, session) {
    this.sessions.set(issueId, session);
  }
  
  /**
   * Get a session
   * @param {string} issueId - The issue ID
   * @returns {Session|undefined} - The session if it exists
   */
  getSession(issueId) {
    return this.sessions.get(issueId);
  }
  
  /**
   * Check if a session exists
   * @param {string} issueId - The issue ID
   * @returns {boolean} - Whether the session exists
   */
  hasSession(issueId) {
    return this.sessions.has(issueId);
  }
  
  /**
   * Remove a session
   * @param {string} issueId - The issue ID
   * @returns {boolean} - Whether the session was removed
   */
  removeSession(issueId) {
    return this.sessions.delete(issueId);
  }
  
  /**
   * Get all sessions
   * @returns {Map<string, Session>} - All sessions
   */
  getAllSessions() {
    return this.sessions;
  }
  
  /**
   * Update a session
   * @param {string} issueId - The issue ID
   * @param {Session} session - The updated session
   * @returns {boolean} - Whether the session was updated
   */
  updateSession(issueId, session) {
    if (!this.sessions.has(issueId)) {
      return false;
    }
    
    this.sessions.set(issueId, session);
    return true;
  }
}