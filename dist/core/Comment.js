/**
 * Represents a comment in the system
 */
export class Comment {
    id;
    body;
    userId;
    issueId;
    createdAt;
    user;
    constructor({ id, body, userId, issueId, createdAt = new Date(), user = null, }) {
        this.id = id;
        this.body = body;
        this.userId = userId;
        this.issueId = issueId;
        this.createdAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
        this.user = user;
    }
    /**
     * Format a cost calculation message
     */
    static formatCostMessage(costUsd, durationMs, totalCost = null) {
        let message = `*Cost for last run: $${costUsd.toFixed(2)}, Duration: ${durationMs / 1000}s*`;
        if (totalCost !== null) {
            message += `\n*Total estimated cost for this issue: $${totalCost.toFixed(2)}*`;
        }
        return message;
    }
}
