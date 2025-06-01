import { Session } from '../core/Session.js';
/**
 * Manages active Claude sessions
 */
export declare class SessionManager {
    private sessions;
    constructor();
    /**
     * Add a session
     * @param issueId - The issue ID
     * @param session - The session to add
     */
    addSession(issueId: string, session: Session): void;
    /**
     * Get a session
     * @param issueId - The issue ID
     * @returns The session if it exists
     */
    getSession(issueId: string): Session | undefined;
    /**
     * Check if a session exists
     * @param issueId - The issue ID
     * @returns Whether the session exists
     */
    hasSession(issueId: string): boolean;
    /**
     * Remove a session
     * @param issueId - The issue ID
     * @returns Whether the session was removed
     */
    removeSession(issueId: string): boolean;
    /**
     * Get all sessions
     * @returns All sessions
     */
    getAllSessions(): Map<string, Session>;
    /**
     * Update a session
     * @param issueId - The issue ID
     * @param session - The updated session
     * @returns Whether the session was updated
     */
    updateSession(issueId: string, session: Session): boolean;
}
