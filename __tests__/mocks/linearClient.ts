import { describe, it, expect } from 'vitest';

interface MockIssue {
  id: string;
  identifier?: string;
  title?: string;
  description?: string;
  state?: {
    type?: string;
    name?: string;
  };
  _assignee?: {
    id: string;
    name?: string;
  };
  assignee?: {
    id: string;
    name?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface MockComment {
  id: string;
  issueId: string;
  body: string;
  createdAt: string;
  userId?: string;
}

interface IssueQueryParams {
  filter?: {
    assignee?: {
      id?: {
        eq?: string;
      };
    };
    state?: {
      type?: {
        nin?: string[];
      };
    };
  };
}

interface CommentCreateParams {
  issueId: string;
  body: string;
}

/**
 * Mock Linear client for testing
 */
export class MockLinearClient {
  issues: MockIssue[];
  comments: MockComment[];

  constructor() {
    this.issues = [];
    this.comments = [];
  }
  
  /**
   * Set mock issues for testing
   * @param issues - Array of mock issues
   */
  setIssues(issues: MockIssue[]): void {
    this.issues = issues;
  }
  
  /**
   * Set mock comments for testing
   * @param comments - Array of mock comments
   */
  setComments(comments: MockComment[]): void {
    this.comments = comments;
  }
  
  /**
   * Mock issues query
   * @param params - Query parameters
   * @returns Mock issue results
   */
  async issues(params?: IssueQueryParams): Promise<{ nodes: MockIssue[] }> {
    // Filter issues based on params if needed
    let filteredIssues = [...this.issues];
    
    if (params?.filter?.assignee?.id?.eq) {
      const userId = params.filter.assignee.id.eq;
      filteredIssues = filteredIssues.filter(issue => issue._assignee?.id === userId);
    }
    
    if (params?.filter?.state?.type?.nin) {
      const excludedTypes = params.filter.state.type.nin;
      filteredIssues = filteredIssues.filter(issue => 
        issue.state?.type ? !excludedTypes.includes(issue.state.type) : true
      );
    }
    
    return {
      nodes: filteredIssues
    };
  }
  
  /**
   * Mock issue query
   * @param issueId - Issue ID
   * @returns Mock issue
   */
  async issue(issueId: string): Promise<MockIssue> {
    const issue = this.issues.find(issue => issue.id === issueId);
    
    if (!issue) {
      throw new Error(`Issue not found: ${issueId}`);
    }
    
    return issue;
  }
  
  /**
   * Mock comment creation
   * @param params - Comment parameters
   * @returns Created comment
   */
  async createComment(params: CommentCreateParams): Promise<MockComment> {
    const comment: MockComment = {
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