import { Issue } from '../../../src/core/Issue.js';

describe('Issue', () => {
  const mockIssueData = {
    id: 'issue-123',
    identifier: 'TEST-456',
    title: 'Test Issue',
    description: 'This is a test issue',
    state: 'Todo',
    stateType: 'unstarted',
    priority: 1,
    url: 'https://linear.app/test/issue/TEST-456',
    assigneeId: 'user-789',
    comments: {
      nodes: [
        {
          body: 'Test comment',
          user: {
            name: 'Test User'
          }
        }
      ]
    }
  };
  
  describe('constructor', () => {
    it('should create an instance with the provided data', () => {
      const issue = new Issue(mockIssueData);
      
      expect(issue.id).toBe('issue-123');
      expect(issue.identifier).toBe('TEST-456');
      expect(issue.title).toBe('Test Issue');
      expect(issue.description).toBe('This is a test issue');
      expect(issue.state).toBe('Todo');
      expect(issue.stateType).toBe('unstarted');
      expect(issue.priority).toBe(1);
      expect(issue.url).toBe('https://linear.app/test/issue/TEST-456');
      expect(issue.assigneeId).toBe('user-789');
      expect(issue.comments).toEqual({
        nodes: [
          {
            body: 'Test comment',
            user: {
              name: 'Test User'
            }
          }
        ]
      });
    });
    
    it('should handle missing optional fields', () => {
      const issueWithoutOptionals = new Issue({
        id: 'issue-123',
        identifier: 'TEST-456',
        title: 'Test Issue',
        assigneeId: 'user-789'
      });
      
      expect(issueWithoutOptionals.description).toBe('');
      expect(issueWithoutOptionals.comments).toEqual({ nodes: [] });
    });
  });
  
  describe('toXml', () => {
    it('should return a properly formatted XML representation', () => {
      const issue = new Issue(mockIssueData);
      const xml = issue.toXml();
      
      expect(xml).toContain('<identifier>TEST-456</identifier>');
      expect(xml).toContain('<title>Test Issue</title>');
      expect(xml).toContain('<description>This is a test issue</description>');
      expect(xml).toContain('<status>Todo</status>');
      expect(xml).toContain('<priority>1</priority>');
      expect(xml).toContain('<url>https://linear.app/test/issue/TEST-456</url>');
    });
    
    it('should escape special XML characters', () => {
      const issueWithSpecialChars = new Issue({
        ...mockIssueData,
        title: 'Test & Issue <with> special "chars"',
        description: 'Description with <tags> & special "chars"'
      });
      
      const xml = issueWithSpecialChars.toXml();
      
      expect(xml).toContain('<title>Test &amp; Issue &lt;with&gt; special &quot;chars&quot;</title>');
      expect(xml).toContain('<description>Description with &lt;tags&gt; &amp; special &quot;chars&quot;</description>');
    });
  });
  
  describe('formatComments', () => {
    it('should return properly formatted XML comments', () => {
      const issue = new Issue(mockIssueData);
      const commentsXml = issue.formatComments();
      
      expect(commentsXml).toContain('<linear_comments>');
      expect(commentsXml).toContain('<comment author="Test User">');
      expect(commentsXml).toContain('<body>Test comment</body>');
      expect(commentsXml).toContain('</comment>');
      expect(commentsXml).toContain('</linear_comments>');
    });
    
    it('should handle no comments gracefully', () => {
      const issueWithNoComments = new Issue({
        ...mockIssueData,
        comments: { nodes: [] }
      });
      
      const commentsXml = issueWithNoComments.formatComments();
      expect(commentsXml).toBe('<linear_comments>No comments yet.</linear_comments>');
    });
    
    it('should escape special XML characters in comments', () => {
      const issueWithSpecialCharsInComments = new Issue({
        ...mockIssueData,
        comments: {
          nodes: [
            {
              body: 'Comment with <tags> & special "chars"',
              user: {
                name: 'Test & User'
              }
            }
          ]
        }
      });
      
      const commentsXml = issueWithSpecialCharsInComments.formatComments();
      
      expect(commentsXml).toContain('author="Test &amp; User"');
      expect(commentsXml).toContain('<body>Comment with &lt;tags&gt; &amp; special &quot;chars&quot;</body>');
    });
  });
  
  describe('getBranchName', () => {
    it('should return the branchName from Linear API if available', () => {
      const issueWithBranchName = new Issue({
        ...mockIssueData,
        branchName: 'feature/test-456-custom-branch-name'
      });
      expect(issueWithBranchName.getBranchName()).toBe('feature/test-456-custom-branch-name');
    });
    
    it('should fall back to lowercase identifier if branchName is not provided', () => {
      const issue = new Issue(mockIssueData);
      expect(issue.getBranchName()).toBe('test-456');
    });
    
    it('should fall back to lowercase identifier if branchName is null', () => {
      const issueWithNullBranchName = new Issue({
        ...mockIssueData,
        branchName: null
      });
      expect(issueWithNullBranchName.getBranchName()).toBe('test-456');
    });
  });
});