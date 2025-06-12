/**
 * Manages active Claude sessions
 */
export class SessionManager {
    sessions;
    constructor() {
        this.sessions = new Map();
    }
    /**
     * Add a session
     */
    addSession(issueId, session) {
        this.sessions.set(issueId, session);
    }
    /**
     * Get a session
     */
    getSession(issueId) {
        return this.sessions.get(issueId);
    }
    /**
     * Check if a session exists
     */
    hasSession(issueId) {
        return this.sessions.has(issueId);
    }
    /**
     * Remove a session
     */
    removeSession(issueId) {
        return this.sessions.delete(issueId);
    }
    /**
     * Get all sessions
     */
    getAllSessions() {
        return this.sessions;
    }
    /**
     * Update a session
     */
    updateSession(issueId, session) {
        if (!this.sessions.has(issueId)) {
            return false;
        }
        this.sessions.set(issueId, session);
        return true;
    }
    /**
     * Get all active sessions
     */
    getActiveSessions() {
        return Array.from(this.sessions.entries()).filter(([_, session]) => session.isActive());
    }
    /**
     * Count active sessions
     */
    countActiveSessions() {
        return this.getActiveSessions().length;
    }
}
//# sourceMappingURL=SessionManager.js.map