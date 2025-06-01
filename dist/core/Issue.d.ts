interface CommentNode {
    body: string;
    user?: {
        name?: string;
    };
}
interface Comments {
    nodes: CommentNode[];
}
/**
 * Represents a Linear issue in the system
 */
export declare class Issue {
    id: string;
    identifier: string;
    title: string;
    description: string;
    state: string | null;
    stateType: string | null;
    priority: number;
    url: string;
    assigneeId: string | null;
    comments: Comments;
    branchName: string | null;
    constructor({ id, identifier, title, description, state, stateType, priority, url, assigneeId, comments, branchName, }: {
        id: string;
        identifier: string;
        title: string;
        description?: string;
        state: string | null;
        stateType: string | null;
        priority: number;
        url: string;
        assigneeId: string | null;
        comments?: Comments;
        branchName: string | null;
    });
    /**
     * Returns a formatted XML representation of the issue details
     */
    toXml(): string;
    /**
     * Returns a formatted XML representation of the issue's comments
     */
    formatComments(): string;
    /**
     * Escape XML special characters
     */
    escapeXml(unsafe: string | null): string;
    /**
     * Get the branch name for this issue
     * Uses the branchName from Linear API if available, otherwise falls back to lowercase identifier
     */
    getBranchName(): string;
}
export {};
