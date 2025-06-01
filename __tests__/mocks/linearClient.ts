/**
 * Mock Linear client for testing
 */
export class MockLinearClient {
  constructor() {
    this.issues = [];
    this.comments = [];
  }
  
  /**
   * Set mock issues for testing
   * @param {Array} issues - Array of mock issues
   */
  setIssues(issues) {
    this.issues = issues;
  }
  
  /**
   * Set mock comments for testing
   * @param {Array} comments - Array of mock comments
   */
  setComments(comments) {
    this.comments = comments;
  }
  
  /**
   * Mock issues query
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} - Mock issue results
   */
  async issues(params) {
    // Filter issues based on params if needed
    let filteredIssues = [...this.issues];
    
    if (params?.filter?.assignee?.id?.eq) {
      const userId = params.filter.assignee.id.eq;
      filteredIssues = filteredIssues.filter(issue => issue._assignee?.id === userId);
    }
    
    if (params?.filter?.state?.type?.nin) {
      const excludedTypes = params.filter.state.type.nin;
      filteredIssues = filteredIssues.filter(issue => !excludedTypes.includes(issue.state?.type));
    }
    
    return {
      nodes: filteredIssues
    };
  }
  
  /**
   * Mock issue query
   * @param {string} issueId - Issue ID
   * @returns {Promise<Object>} - Mock issue
   */
  async issue(issueId) {
    const issue = this.issues.find(issue => issue.id === issueId);
    
    if (!issue) {
      throw new Error(`Issue not found: ${issueId}`);
    }
    
    return issue;
  }
  
  /**
   * Mock comment creation
   * @param {Object} params - Comment parameters
   * @returns {Promise<Object>} - Created comment
   */
  async createComment(params) {
    const comment = {
      id: `comment-${Date.now()}`,
      issueId: params.issueId,
      body: params.body,
      createdAt: new Date().toISOString(),
    };
    
    this.comments.push(comment);
    return comment;
  }
}

// Add a test to prevent Jest warning about no tests
describe('MockLinearClient', () => {
  it('should initialize with empty issues and comments', () => {
    const client = new MockLinearClient();
    expect(client.issues).toEqual([]);
    expect(client.comments).toEqual([]);
  });
});