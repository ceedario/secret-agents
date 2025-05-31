/**
 * Interface for issue-related operations
 */
export class IssueService {
  /**
   * Fetch all issues assigned to the agent user
   * @returns {Promise<Array<Issue>>} - List of assigned issues
   */
  async fetchAssignedIssues() {
    throw new Error('Not implemented');
  }
  
  /**
   * Fetch a single issue by ID
   * @param {string} issueId - The ID of the issue to fetch
   * @returns {Promise<Issue>} - The requested issue
   */
  async fetchIssue(issueId) {
    throw new Error('Not implemented');
  }
  
  /**
   * Create a comment on an issue
   * @param {string} issueId - The ID of the issue
   * @param {string} body - The body of the comment
   * @param {string|null} parentId - The ID of the parent comment for threaded replies
   * @returns {Promise<boolean>} - Success status
   */
  async createComment(issueId, body, parentId = null) {
    throw new Error('Not implemented');
  }
  
  /**
   * Handle an issue creation event
   * @param {Object} issueData - Raw issue data from webhook
   * @returns {Promise<void>}
   */
  async handleIssueCreateEvent(issueData) {
    throw new Error('Not implemented');
  }
  
  /**
   * Handle an issue update event
   * @param {Object} issueData - Raw issue data from webhook
   * @returns {Promise<void>}
   */
  async handleIssueUpdateEvent(issueData) {
    throw new Error('Not implemented');
  }
  
  /**
   * Handle a comment event
   * @param {Object} commentData - Raw comment data from webhook
   * @returns {Promise<void>}
   */
  async handleCommentEvent(commentData) {
    throw new Error('Not implemented');
  }
  
  /**
   * Handle when the agent is mentioned in a comment (Agent API)
   * @param {Object} data - The mention notification data
   * @returns {Promise<void>}
   */
  async handleAgentMention(data) {
    throw new Error('Not implemented');
  }
  
  /**
   * Handle when the agent is assigned to an issue (Agent API)
   * @param {Object} data - The assignment notification data
   * @returns {Promise<void>}
   */
  async handleAgentAssignment(data) {
    throw new Error('Not implemented');
  }
  
  /**
   * Handle when someone replies to the agent's comment (Agent API)
   * @param {Object} data - The reply notification data
   * @returns {Promise<void>}
   */
  async handleAgentReply(data) {
    throw new Error('Not implemented');
  }
  
  /**
   * Handle when the agent is unassigned from an issue
   * @param {Object} data - The unassignment notification data
   * @returns {Promise<void>}
   */
  async handleAgentUnassignment(data) {
    throw new Error('Not implemented');
  }
}