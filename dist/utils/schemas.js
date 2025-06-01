import { z } from 'zod';
/**
 * Helper functions for schema definitions
 */
// Helper function for date fields (accepts both Date objects and ISO date strings)
const dateField = () => z.union([
    z.string().datetime(),
    z.instanceof(Date)
]);
/**
 * Shared schemas
 */
export const TeamSchema = z.object({
    id: z.string(),
    key: z.string(),
    name: z.string()
});
export const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    avatarUrl: z.string().url().optional()
});
export const IssueMinimalSchema = z.object({
    id: z.string(),
    title: z.string(),
    teamId: z.string(),
    team: TeamSchema,
    identifier: z.string(),
    url: z.string().url()
});
export const CommentMinimalSchema = z.object({
    id: z.string(),
    body: z.string(),
    userId: z.string(),
    issueId: z.string()
});
/**
 * Agent notification schemas
 */
// Base notification schema fields that all notifications share
export const NotificationBaseSchema = z.object({
    id: z.string(),
    createdAt: dateField(),
    updatedAt: dateField(),
    archivedAt: z.union([z.string().datetime(), z.instanceof(Date), z.null()]),
    actorId: z.string(),
    externalUserActorId: z.string().nullable(),
    userId: z.string(),
    readAt: z.union([z.string().datetime(), z.instanceof(Date), z.null()]),
    emailedAt: z.union([z.string().datetime(), z.instanceof(Date), z.null()]),
    snoozedUntilAt: z.union([z.string().datetime(), z.instanceof(Date), z.null()]),
    unsnoozedAt: z.union([z.string().datetime(), z.instanceof(Date), z.null()])
});
// Issue Comment Mention Notification
export const IssueCommentMentionNotificationSchema = NotificationBaseSchema.extend({
    type: z.literal('issueCommentMention'),
    issueId: z.string(),
    issue: IssueMinimalSchema,
    commentId: z.string(),
    comment: CommentMinimalSchema,
    actor: UserSchema
});
// Issue Assignment Notification
export const IssueAssignmentNotificationSchema = NotificationBaseSchema.extend({
    type: z.literal('issueAssignment'),
    issueId: z.string(),
    issue: IssueMinimalSchema,
    actor: UserSchema
});
// Issue Comment Reply Notification
export const IssueCommentReplyNotificationSchema = NotificationBaseSchema.extend({
    type: z.literal('issueCommentReply'),
    issueId: z.string(),
    issue: IssueMinimalSchema,
    commentId: z.string(),
    comment: CommentMinimalSchema,
    actor: UserSchema
});
// Issue New Comment Notification (when someone comments on an issue assigned to the agent)
export const IssueNewCommentNotificationSchema = NotificationBaseSchema.extend({
    type: z.literal('issueNewComment'),
    issueId: z.string(),
    issue: IssueMinimalSchema,
    commentId: z.string(),
    comment: CommentMinimalSchema,
    actor: UserSchema
});
// Agent Assigned to Issue notification (when agent is made assignable to issues)
export const AgentAssignableNotificationSchema = NotificationBaseSchema.extend({
    type: z.literal('agentAssignable'),
    actor: UserSchema
});
// Issue Assigned To You notification (when an issue is assigned to the agent)
export const IssueAssignedToYouNotificationSchema = NotificationBaseSchema.extend({
    type: z.literal('issueAssignedToYou'),
    issueId: z.string(),
    issue: IssueMinimalSchema,
    actor: UserSchema
});
// Issue Unassigned From You notification (when an issue is unassigned from the agent)
export const IssueUnassignedFromYouNotificationSchema = NotificationBaseSchema.extend({
    type: z.literal('issueUnassignedFromYou'),
    issueId: z.string(),
    issue: IssueMinimalSchema,
    actor: UserSchema
});
// Union of all notification types
export const NotificationSchema = z.discriminatedUnion('type', [
    IssueCommentMentionNotificationSchema,
    IssueAssignmentNotificationSchema,
    IssueCommentReplyNotificationSchema,
    IssueNewCommentNotificationSchema,
    AgentAssignableNotificationSchema,
    IssueAssignedToYouNotificationSchema,
    IssueUnassignedFromYouNotificationSchema
]);
/**
 * Webhook payload schemas
 */
// Agent notification webhook payload
export const AgentNotificationWebhookSchema = z.object({
    type: z.literal('AppUserNotification'),
    action: z.string(),
    createdAt: dateField(),
    organizationId: z.string(),
    oauthClientId: z.string(),
    appUserId: z.string(),
    notification: NotificationSchema,
    webhookTimestamp: z.number(),
    webhookId: z.string()
});
// Legacy webhook base payload
export const LegacyWebhookBaseSchema = z.object({
    action: z.string(),
    actor: UserSchema,
    createdAt: dateField(),
    url: z.string().url(),
    type: z.string(),
    organizationId: z.string(),
    webhookTimestamp: z.number(),
    webhookId: z.string()
});
// Comment webhook payload
export const CommentWebhookSchema = LegacyWebhookBaseSchema.extend({
    type: z.literal('Comment'),
    data: z.object({
        id: z.string(),
        createdAt: dateField(),
        updatedAt: dateField(),
        body: z.string(),
        issueId: z.string(),
        userId: z.string(),
        reactionData: z.array(z.any()),
        user: UserSchema.omit({ avatarUrl: true }).extend({
            avatarUrl: z.string().url().optional()
        }),
        issue: IssueMinimalSchema
    })
});
// Full Linear Issue Schema
export const LinearIssueSchema = z.object({
    id: z.string(),
    createdAt: dateField(),
    updatedAt: dateField(),
    title: z.string(),
    description: z.string().optional(),
    identifier: z.string(),
    number: z.number(),
    priority: z.number(),
    priorityLabel: z.string().optional(),
    url: z.string().url(),
    boardOrder: z.number().optional(),
    branchName: z.string().optional(),
    sortOrder: z.number().optional(),
    startedAt: dateField().optional(),
    addedToCycleAt: dateField().optional(),
    addedToTeamAt: dateField().optional(),
    customerTicketCount: z.number().optional(),
    labelIds: z.array(z.string()).optional(),
    previousIdentifiers: z.array(z.string()).optional(),
    prioritySortOrder: z.number().optional(),
    reactionData: z.array(z.any()).optional(),
    reactions: z.array(z.any()).optional(),
    slaType: z.string().optional(),
    // References to related entities
    _assignee: z.object({
        id: z.string()
    }).optional(),
    _creator: z.object({
        id: z.string()
    }).optional(),
    _cycle: z.object({
        id: z.string()
    }).optional(),
    _state: z.object({
        id: z.string()
    }).optional(),
    _team: z.object({
        id: z.string()
    }).optional()
});
// Issue webhook payload
export const IssueWebhookSchema = LegacyWebhookBaseSchema.extend({
    type: z.literal('Issue'),
    data: LinearIssueSchema.partial() // All fields are optional in the webhook payload
});
// Union of all webhook types
export const WebhookPayloadSchema = z.discriminatedUnion('type', [
    AgentNotificationWebhookSchema,
    CommentWebhookSchema,
    IssueWebhookSchema
]);
