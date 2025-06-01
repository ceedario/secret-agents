/**
 * Represents a Linear issue in the system
 */
export class Issue {
    id;
    identifier;
    title;
    description;
    state;
    stateType;
    priority;
    url;
    assigneeId;
    comments;
    branchName;
    constructor({ id, identifier, title, description, state, stateType, priority, url, assigneeId, comments = { nodes: [] }, branchName, }) {
        this.id = id;
        this.identifier = identifier;
        this.title = title;
        this.description = description || '';
        this.state = state;
        this.stateType = stateType;
        this.priority = priority;
        this.url = url;
        this.assigneeId = assigneeId;
        this.comments = comments;
        this.branchName = branchName;
    }
    /**
     * Returns a formatted XML representation of the issue details
     */
    toXml() {
        return `
<issue_details>
  <identifier>${this.escapeXml(this.identifier)}</identifier>
  <title>${this.escapeXml(this.title)}</title>
  <description>${this.escapeXml(this.description || 'No description provided')}</description>
  <status>${this.escapeXml(this.state || 'Unknown')}</status>
  <priority>${this.priority}</priority>
  <url>${this.escapeXml(this.url)}</url>
</issue_details>
`;
    }
    /**
     * Returns a formatted XML representation of the issue's comments
     */
    formatComments() {
        if (!this.comments || !this.comments.nodes || this.comments.nodes.length === 0) {
            return '<linear_comments>No comments yet.</linear_comments>';
        }
        let commentString = '<linear_comments>\n';
        this.comments.nodes.forEach((comment) => {
            const escapedBody = this.escapeXml(comment.body);
            commentString += `  <comment author="${this.escapeXml(comment.user?.name || 'Unknown')}">\n`;
            commentString += `    <body>${escapedBody}</body>\n`;
            commentString += `  </comment>\n`;
        });
        commentString += '</linear_comments>';
        return commentString;
    }
    /**
     * Escape XML special characters
     */
    escapeXml(unsafe) {
        return unsafe
            ? unsafe
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;')
            : '';
    }
    /**
     * Get the branch name for this issue
     * Uses the branchName from Linear API if available, otherwise falls back to lowercase identifier
     */
    getBranchName() {
        return this.branchName || this.identifier.toLowerCase();
    }
}
