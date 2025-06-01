/**
 * Represents a comment in the system
 */
export declare class Comment {
    id: string;
    body: string;
    userId: string;
    issueId: string;
    createdAt: Date;
    user: {
        name?: string;
    } | null;
    constructor({ id, body, userId, issueId, createdAt, user, }: {
        id: string;
        body: string;
        userId: string;
        issueId: string;
        createdAt?: Date | string;
        user?: {
            name?: string;
        } | null;
    });
    /**
     * Format a cost calculation message
     */
    static formatCostMessage(costUsd: number, durationMs: number, totalCost?: number | null): string;
}
