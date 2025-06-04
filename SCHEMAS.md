# Linear Webhook Schemas Documentation

This document describes the Zod schemas used for validating Linear webhook payloads in this application.

## Overview

The Linear API sends webhooks in different formats:

1. **Legacy Webhooks**: Used for standard Linear events like comment creation and issue updates
2. **Agent API Webhooks**: Used specifically for agent-related notifications like mentions and assignments

We use [Zod](https://github.com/colinhacks/zod) for runtime validation of these payloads to ensure type safety and proper handling.

## Schema Types

### Shared Schemas

These schemas represent common data structures used across different webhook types:

- `TeamSchema`: Linear team data
- `UserSchema`: Linear user data
- `IssueMinimalSchema`: Minimal issue data included in notifications
- `CommentMinimalSchema`: Minimal comment data included in notifications

### Agent Notification Schemas

Agent notifications include specialized schemas for handling agent-specific events:

- `NotificationBaseSchema`: Common fields for all notification types
- `IssueCommentMentionNotificationSchema`: When an agent is mentioned in a comment
- `IssueAssignmentNotificationSchema`: When an issue is assigned to an agent
- `IssueCommentReplyNotificationSchema`: When someone replies to an agent's comment
- `IssueNewCommentNotificationSchema`: When a new comment is added to an issue assigned to the agent
- `AgentAssignableNotificationSchema`: When an agent is made assignable to issues
- `IssueAssignedToYouNotificationSchema`: When an issue is directly assigned to the agent

### Webhook Payload Schemas

Top-level schemas for the entire webhook payload:

- `AgentNotificationWebhookSchema`: For agent-specific notifications
- `CommentWebhookSchema`: For comment-related events
- `IssueWebhookSchema`: For issue-related events

## Example Payloads

### Agent Notification Webhook (Agent Made Assignable)

```json
{
  "type": "AppUserNotification",
  "action": "agentAssignable",
  "createdAt": "2025-05-05T20:15:00.000Z",
  "organizationId": "ee2a1136-fe42-47ac-897f-f4ee8e824eb8",
  "oauthClientId": "2902b10a-8454-4907-8670-4767dab347ff",
  "appUserId": "6ee0d291-4995-4a40-b02c-2381ccb6eaf8",
  "notification": {
    "id": "b9c309f7-bf50-4f9e-9aea-773d6919199f",
    "createdAt": "2025-05-05T20:15:00.000Z",
    "updatedAt": "2025-05-05T20:15:00.000Z",
    "archivedAt": null,
    "type": "agentAssignable",
    "actorId": "c4678d48-c096-480c-9080-0a520e8051e8",
    "externalUserActorId": null,
    "userId": "6ee0d291-4995-4a40-b02c-2381ccb6eaf8",
    "actor": {
      "id": "c4678d48-c096-480c-9080-0a520e8051e8",
      "name": "Connor Turland",
      "email": "connor@ceedar.io",
      "avatarUrl": "https://public.linear.app/ee2a1136-fe42-47ac-897f-f4ee8e824eb8/3abfb45d-f906-4237-9035-af4a6e27d492/d321c0c5-6541-4fe6-8ac5-50a2fd69ee01"
    }
  },
  "webhookTimestamp": 1746472100000,
  "webhookId": "198b0d2a-4a02-4fa3-a337-bb469514378c"
}
```

### Agent Notification Webhook (Issue Assigned to Agent)

```json
{
  "type": "AppUserNotification",
  "action": "issueAssignedToYou",
  "createdAt": "2025-05-05T19:58:54.897Z",
  "organizationId": "ee2a1136-fe42-47ac-897f-f4ee8e824eb8",
  "oauthClientId": "2902b10a-8454-4907-8670-4767dab347ff",
  "appUserId": "6ee0d291-4995-4a40-b02c-2381ccb6eaf8",
  "notification": {
    "id": "b560a5eb-27ae-41a0-a710-41ac8746648c",
    "createdAt": "2025-05-05T19:58:54.867Z",
    "updatedAt": "2025-05-05T19:58:54.867Z",
    "archivedAt": null,
    "type": "issueAssignedToYou",
    "actorId": "c4678d48-c096-480c-9080-0a520e8051e8",
    "externalUserActorId": null,
    "userId": "6ee0d291-4995-4a40-b02c-2381ccb6eaf8",
    "issueId": "c540335e-b092-4095-806e-87a2e42b79f2",
    "issue": {
      "id": "c540335e-b092-4095-806e-87a2e42b79f2",
      "title": "simple issue",
      "teamId": "1cfc6426-7357-4a80-847e-e636efb71a23",
      "team": {
        "id": "1cfc6426-7357-4a80-847e-e636efb71a23",
        "key": "CEE",
        "name": "Ceedar"
      },
      "identifier": "CEE-594",
      "url": "https://linear.app/ceedar/issue/CEE-594/simple-issue"
    },
    "actor": {
      "id": "c4678d48-c096-480c-9080-0a520e8051e8",
      "name": "Connor Turland",
      "email": "connor@ceedar.io",
      "avatarUrl": "https://public.linear.app/ee2a1136-fe42-47ac-897f-f4ee8e824eb8/3abfb45d-f906-4237-9035-af4a6e27d492/d321c0c5-6541-4fe6-8ac5-50a2fd69ee01"
    }
  },
  "webhookTimestamp": 1746475134919,
  "webhookId": "b14b04c7-90c4-46cf-bedc-a42965e26c85"
}
```

### Agent Notification Webhook (Issue Comment Mention)

```json
{
  "type": "AppUserNotification",
  "action": "issueCommentMention",
  "createdAt": "2025-05-05T19:07:23.480Z",
  "organizationId": "ee2a1136-fe42-47ac-897f-f4ee8e824eb8",
  "oauthClientId": "2902b10a-8454-4907-8670-4767dab347ff",
  "appUserId": "6ee0d291-4995-4a40-b02c-2381ccb6eaf8",
  "notification": {
    "id": "b9c309f7-bf50-4f9e-9aea-773d6919199f",
    "createdAt": "2025-05-05T19:07:23.440Z",
    "updatedAt": "2025-05-05T19:07:23.440Z",
    "archivedAt": null,
    "type": "issueCommentMention",
    "actorId": "c4678d48-c096-480c-9080-0a520e8051e8",
    "externalUserActorId": null,
    "userId": "6ee0d291-4995-4a40-b02c-2381ccb6eaf8",

    "issueId": "c540335e-b092-4095-806e-87a2e42b79f2",
    "issue": {
      "id": "c540335e-b092-4095-806e-87a2e42b79f2",
      "title": "simple issue",
      "teamId": "1cfc6426-7357-4a80-847e-e636efb71a23",
      "team": {
        "id": "1cfc6426-7357-4a80-847e-e636efb71a23",
        "key": "CEE",
        "name": "Ceedar"
      },
      "identifier": "CEE-594",
      "url": "https://linear.app/ceedar/issue/CEE-594/simple-issue"
    },
    "commentId": "93f5b1cc-e902-4f88-a699-93ccdfc9ea0b",
    "comment": {
      "id": "93f5b1cc-e902-4f88-a699-93ccdfc9ea0b",
      "body": "yah that clarifies things. @agentclear1 thanks. ",
      "userId": "c4678d48-c096-480c-9080-0a520e8051e8",
      "issueId": "c540335e-b092-4095-806e-87a2e42b79f2"
    },
    "actor": {
      "id": "c4678d48-c096-480c-9080-0a520e8051e8",
      "name": "Connor Turland",
      "email": "connor@ceedar.io",
      "avatarUrl": "https://public.linear.app/ee2a1136-fe42-47ac-897f-f4ee8e824eb8/3abfb45d-f906-4237-9035-af4a6e27d492/d321c0c5-6541-4fe6-8ac5-50a2fd69ee01"
    }
  },
  "webhookTimestamp": 1746472043496,
  "webhookId": "198b0d2a-4a02-4fa3-a337-bb469514378b"
}
```

### Legacy Comment Webhook

```json
{
  "action": "create",
  "actor": {
    "id": "c4678d48-c096-480c-9080-0a520e8051e8",
    "name": "Connor Turland",
    "email": "connor@ceedar.io",
    "type": "user"
  },
  "createdAt": "2025-05-05T18:33:09.743Z",
  "data": {
    "id": "00d56bdc-5c15-42fd-b35c-7ecb6ebea19d",
    "createdAt": "2025-05-05T18:33:09.755Z",
    "updatedAt": "2025-05-05T18:33:09.743Z",
    "body": "@agentclear1 let's see about his",
    "issueId": "c540335e-b092-4095-806e-87a2e42b79f2",
    "userId": "c4678d48-c096-480c-9080-0a520e8051e8",
    "reactionData": [],
    "user": {
      "id": "c4678d48-c096-480c-9080-0a520e8051e8",
      "name": "Connor Turland",
      "email": "connor@ceedar.io"
    },
    "issue": {
      "id": "c540335e-b092-4095-806e-87a2e42b79f2",
      "title": "simple issue",
      "teamId": "1cfc6426-7357-4a80-847e-e636efb71a23",
      "team": {
        "id": "1cfc6426-7357-4a80-847e-e636efb71a23",
        "key": "CEE",
        "name": "Ceedar"
      },
      "identifier": "CEE-594",
      "url": "https://linear.app/ceedar/issue/CEE-594/simple-issue"
    }
  },
  "url": "https://linear.app/ceedar/issue/CEE-594/simple-issue#comment-00d56bdc",
  "type": "Comment",
  "organizationId": "ee2a1136-fe42-47ac-897f-f4ee8e824eb8",
  "webhookTimestamp": 1746469989865,
  "webhookId": "d48bbf43-265a-4efc-892e-3e769cb8590e"
}
```

## Usage

The schemas are used in the application to validate incoming webhook payloads:

1. **Validation**: Incoming webhooks are validated against these schemas
2. **Type Checking**: The schemas provide runtime type checking for webhook data
3. **Error Handling**: Validation failures are logged and handled gracefully

Example usage:

```javascript
// Validate an agent notification webhook
const validationResult = AgentNotificationWebhookSchema.safeParse(req.body);

if (validationResult.success) {
  const validatedPayload = validationResult.data;
  // Process the validated payload
} else {
  console.error("Validation failed:");
  console.dir(validationResult.error.format(), { depth: null });
}
```

## Type Definitions

For code documentation and editor intellisense, JSDoc type definitions are available by importing from the schemas module:

```javascript
/**
 * @param {import('../utils/schemas.mjs').NotificationType} data
 */
function processNotification(data) {
  // TypeScript-like intellisense will be available for 'data'
}
```
