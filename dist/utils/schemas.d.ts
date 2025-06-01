import { z } from 'zod';
/**
 * Shared schemas
 */
export declare const TeamSchema: z.ZodObject<{
    id: z.ZodString;
    key: z.ZodString;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    key: string;
    id: string;
}, {
    name: string;
    key: string;
    id: string;
}>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    email: z.ZodString;
    avatarUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    email: string;
    avatarUrl?: string | undefined;
}, {
    name: string;
    id: string;
    email: string;
    avatarUrl?: string | undefined;
}>;
export declare const IssueMinimalSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    teamId: z.ZodString;
    team: z.ZodObject<{
        id: z.ZodString;
        key: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        key: string;
        id: string;
    }, {
        name: string;
        key: string;
        id: string;
    }>;
    identifier: z.ZodString;
    url: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    url: string;
    title: string;
    team: {
        name: string;
        key: string;
        id: string;
    };
    identifier: string;
    teamId: string;
}, {
    id: string;
    url: string;
    title: string;
    team: {
        name: string;
        key: string;
        id: string;
    };
    identifier: string;
    teamId: string;
}>;
export declare const CommentMinimalSchema: z.ZodObject<{
    id: z.ZodString;
    body: z.ZodString;
    userId: z.ZodString;
    issueId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    body: string;
    issueId: string;
    userId: string;
}, {
    id: string;
    body: string;
    issueId: string;
    userId: string;
}>;
/**
 * Agent notification schemas
 */
export declare const NotificationBaseSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    actorId: z.ZodString;
    externalUserActorId: z.ZodNullable<z.ZodString>;
    userId: z.ZodString;
    readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    archivedAt: string | Date | null;
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}, {
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    archivedAt: string | Date | null;
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}>;
export declare const IssueCommentMentionNotificationSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    actorId: z.ZodString;
    externalUserActorId: z.ZodNullable<z.ZodString>;
    userId: z.ZodString;
    readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
} & {
    type: z.ZodLiteral<"issueCommentMention">;
    issueId: z.ZodString;
    issue: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        teamId: z.ZodString;
        team: z.ZodObject<{
            id: z.ZodString;
            key: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            key: string;
            id: string;
        }, {
            name: string;
            key: string;
            id: string;
        }>;
        identifier: z.ZodString;
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    }, {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    }>;
    commentId: z.ZodString;
    comment: z.ZodObject<{
        id: z.ZodString;
        body: z.ZodString;
        userId: z.ZodString;
        issueId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        body: string;
        issueId: string;
        userId: string;
    }, {
        id: string;
        body: string;
        issueId: string;
        userId: string;
    }>;
    actor: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        avatarUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "issueCommentMention";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    issue: {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    };
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    commentId: string;
    comment: {
        id: string;
        body: string;
        issueId: string;
        userId: string;
    };
    issueId: string;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}, {
    type: "issueCommentMention";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    issue: {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    };
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    commentId: string;
    comment: {
        id: string;
        body: string;
        issueId: string;
        userId: string;
    };
    issueId: string;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}>;
export declare const IssueAssignmentNotificationSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    actorId: z.ZodString;
    externalUserActorId: z.ZodNullable<z.ZodString>;
    userId: z.ZodString;
    readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
} & {
    type: z.ZodLiteral<"issueAssignment">;
    issueId: z.ZodString;
    issue: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        teamId: z.ZodString;
        team: z.ZodObject<{
            id: z.ZodString;
            key: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            key: string;
            id: string;
        }, {
            name: string;
            key: string;
            id: string;
        }>;
        identifier: z.ZodString;
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    }, {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    }>;
    actor: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        avatarUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "issueAssignment";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    issue: {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    };
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    issueId: string;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}, {
    type: "issueAssignment";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    issue: {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    };
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    issueId: string;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}>;
export declare const IssueCommentReplyNotificationSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    actorId: z.ZodString;
    externalUserActorId: z.ZodNullable<z.ZodString>;
    userId: z.ZodString;
    readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
} & {
    type: z.ZodLiteral<"issueCommentReply">;
    issueId: z.ZodString;
    issue: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        teamId: z.ZodString;
        team: z.ZodObject<{
            id: z.ZodString;
            key: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            key: string;
            id: string;
        }, {
            name: string;
            key: string;
            id: string;
        }>;
        identifier: z.ZodString;
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    }, {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    }>;
    commentId: z.ZodString;
    comment: z.ZodObject<{
        id: z.ZodString;
        body: z.ZodString;
        userId: z.ZodString;
        issueId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        body: string;
        issueId: string;
        userId: string;
    }, {
        id: string;
        body: string;
        issueId: string;
        userId: string;
    }>;
    actor: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        avatarUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "issueCommentReply";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    issue: {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    };
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    commentId: string;
    comment: {
        id: string;
        body: string;
        issueId: string;
        userId: string;
    };
    issueId: string;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}, {
    type: "issueCommentReply";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    issue: {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    };
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    commentId: string;
    comment: {
        id: string;
        body: string;
        issueId: string;
        userId: string;
    };
    issueId: string;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}>;
export declare const IssueNewCommentNotificationSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    actorId: z.ZodString;
    externalUserActorId: z.ZodNullable<z.ZodString>;
    userId: z.ZodString;
    readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
} & {
    type: z.ZodLiteral<"issueNewComment">;
    issueId: z.ZodString;
    issue: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        teamId: z.ZodString;
        team: z.ZodObject<{
            id: z.ZodString;
            key: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            key: string;
            id: string;
        }, {
            name: string;
            key: string;
            id: string;
        }>;
        identifier: z.ZodString;
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    }, {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    }>;
    commentId: z.ZodString;
    comment: z.ZodObject<{
        id: z.ZodString;
        body: z.ZodString;
        userId: z.ZodString;
        issueId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        body: string;
        issueId: string;
        userId: string;
    }, {
        id: string;
        body: string;
        issueId: string;
        userId: string;
    }>;
    actor: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        avatarUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "issueNewComment";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    issue: {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    };
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    commentId: string;
    comment: {
        id: string;
        body: string;
        issueId: string;
        userId: string;
    };
    issueId: string;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}, {
    type: "issueNewComment";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    issue: {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    };
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    commentId: string;
    comment: {
        id: string;
        body: string;
        issueId: string;
        userId: string;
    };
    issueId: string;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}>;
export declare const AgentAssignableNotificationSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    actorId: z.ZodString;
    externalUserActorId: z.ZodNullable<z.ZodString>;
    userId: z.ZodString;
    readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
} & {
    type: z.ZodLiteral<"agentAssignable">;
    actor: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        avatarUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "agentAssignable";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}, {
    type: "agentAssignable";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}>;
export declare const IssueAssignedToYouNotificationSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    actorId: z.ZodString;
    externalUserActorId: z.ZodNullable<z.ZodString>;
    userId: z.ZodString;
    readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
} & {
    type: z.ZodLiteral<"issueAssignedToYou">;
    issueId: z.ZodString;
    issue: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        teamId: z.ZodString;
        team: z.ZodObject<{
            id: z.ZodString;
            key: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            key: string;
            id: string;
        }, {
            name: string;
            key: string;
            id: string;
        }>;
        identifier: z.ZodString;
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    }, {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    }>;
    actor: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        avatarUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "issueAssignedToYou";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    issue: {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    };
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    issueId: string;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}, {
    type: "issueAssignedToYou";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    issue: {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    };
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    issueId: string;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}>;
export declare const IssueUnassignedFromYouNotificationSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    actorId: z.ZodString;
    externalUserActorId: z.ZodNullable<z.ZodString>;
    userId: z.ZodString;
    readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
} & {
    type: z.ZodLiteral<"issueUnassignedFromYou">;
    issueId: z.ZodString;
    issue: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        teamId: z.ZodString;
        team: z.ZodObject<{
            id: z.ZodString;
            key: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            key: string;
            id: string;
        }, {
            name: string;
            key: string;
            id: string;
        }>;
        identifier: z.ZodString;
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    }, {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    }>;
    actor: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        avatarUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "issueUnassignedFromYou";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    issue: {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    };
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    issueId: string;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}, {
    type: "issueUnassignedFromYou";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    issue: {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    };
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    issueId: string;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}>;
export declare const NotificationSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    actorId: z.ZodString;
    externalUserActorId: z.ZodNullable<z.ZodString>;
    userId: z.ZodString;
    readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
} & {
    type: z.ZodLiteral<"issueCommentMention">;
    issueId: z.ZodString;
    issue: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        teamId: z.ZodString;
        team: z.ZodObject<{
            id: z.ZodString;
            key: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            key: string;
            id: string;
        }, {
            name: string;
            key: string;
            id: string;
        }>;
        identifier: z.ZodString;
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    }, {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    }>;
    commentId: z.ZodString;
    comment: z.ZodObject<{
        id: z.ZodString;
        body: z.ZodString;
        userId: z.ZodString;
        issueId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        body: string;
        issueId: string;
        userId: string;
    }, {
        id: string;
        body: string;
        issueId: string;
        userId: string;
    }>;
    actor: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        avatarUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "issueCommentMention";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    issue: {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    };
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    commentId: string;
    comment: {
        id: string;
        body: string;
        issueId: string;
        userId: string;
    };
    issueId: string;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}, {
    type: "issueCommentMention";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    issue: {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    };
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    commentId: string;
    comment: {
        id: string;
        body: string;
        issueId: string;
        userId: string;
    };
    issueId: string;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}>, z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    actorId: z.ZodString;
    externalUserActorId: z.ZodNullable<z.ZodString>;
    userId: z.ZodString;
    readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
} & {
    type: z.ZodLiteral<"issueAssignment">;
    issueId: z.ZodString;
    issue: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        teamId: z.ZodString;
        team: z.ZodObject<{
            id: z.ZodString;
            key: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            key: string;
            id: string;
        }, {
            name: string;
            key: string;
            id: string;
        }>;
        identifier: z.ZodString;
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    }, {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    }>;
    actor: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        avatarUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "issueAssignment";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    issue: {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    };
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    issueId: string;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}, {
    type: "issueAssignment";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    issue: {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    };
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    issueId: string;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}>, z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    actorId: z.ZodString;
    externalUserActorId: z.ZodNullable<z.ZodString>;
    userId: z.ZodString;
    readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
} & {
    type: z.ZodLiteral<"issueCommentReply">;
    issueId: z.ZodString;
    issue: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        teamId: z.ZodString;
        team: z.ZodObject<{
            id: z.ZodString;
            key: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            key: string;
            id: string;
        }, {
            name: string;
            key: string;
            id: string;
        }>;
        identifier: z.ZodString;
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    }, {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    }>;
    commentId: z.ZodString;
    comment: z.ZodObject<{
        id: z.ZodString;
        body: z.ZodString;
        userId: z.ZodString;
        issueId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        body: string;
        issueId: string;
        userId: string;
    }, {
        id: string;
        body: string;
        issueId: string;
        userId: string;
    }>;
    actor: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        avatarUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "issueCommentReply";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    issue: {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    };
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    commentId: string;
    comment: {
        id: string;
        body: string;
        issueId: string;
        userId: string;
    };
    issueId: string;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}, {
    type: "issueCommentReply";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    issue: {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    };
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    commentId: string;
    comment: {
        id: string;
        body: string;
        issueId: string;
        userId: string;
    };
    issueId: string;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}>, z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    actorId: z.ZodString;
    externalUserActorId: z.ZodNullable<z.ZodString>;
    userId: z.ZodString;
    readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
} & {
    type: z.ZodLiteral<"issueNewComment">;
    issueId: z.ZodString;
    issue: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        teamId: z.ZodString;
        team: z.ZodObject<{
            id: z.ZodString;
            key: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            key: string;
            id: string;
        }, {
            name: string;
            key: string;
            id: string;
        }>;
        identifier: z.ZodString;
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    }, {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    }>;
    commentId: z.ZodString;
    comment: z.ZodObject<{
        id: z.ZodString;
        body: z.ZodString;
        userId: z.ZodString;
        issueId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        body: string;
        issueId: string;
        userId: string;
    }, {
        id: string;
        body: string;
        issueId: string;
        userId: string;
    }>;
    actor: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        avatarUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "issueNewComment";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    issue: {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    };
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    commentId: string;
    comment: {
        id: string;
        body: string;
        issueId: string;
        userId: string;
    };
    issueId: string;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}, {
    type: "issueNewComment";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    issue: {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    };
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    commentId: string;
    comment: {
        id: string;
        body: string;
        issueId: string;
        userId: string;
    };
    issueId: string;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}>, z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    actorId: z.ZodString;
    externalUserActorId: z.ZodNullable<z.ZodString>;
    userId: z.ZodString;
    readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
} & {
    type: z.ZodLiteral<"agentAssignable">;
    actor: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        avatarUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "agentAssignable";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}, {
    type: "agentAssignable";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}>, z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    actorId: z.ZodString;
    externalUserActorId: z.ZodNullable<z.ZodString>;
    userId: z.ZodString;
    readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
} & {
    type: z.ZodLiteral<"issueAssignedToYou">;
    issueId: z.ZodString;
    issue: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        teamId: z.ZodString;
        team: z.ZodObject<{
            id: z.ZodString;
            key: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            key: string;
            id: string;
        }, {
            name: string;
            key: string;
            id: string;
        }>;
        identifier: z.ZodString;
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    }, {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    }>;
    actor: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        avatarUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "issueAssignedToYou";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    issue: {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    };
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    issueId: string;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}, {
    type: "issueAssignedToYou";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    issue: {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    };
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    issueId: string;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}>, z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    actorId: z.ZodString;
    externalUserActorId: z.ZodNullable<z.ZodString>;
    userId: z.ZodString;
    readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
} & {
    type: z.ZodLiteral<"issueUnassignedFromYou">;
    issueId: z.ZodString;
    issue: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        teamId: z.ZodString;
        team: z.ZodObject<{
            id: z.ZodString;
            key: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            key: string;
            id: string;
        }, {
            name: string;
            key: string;
            id: string;
        }>;
        identifier: z.ZodString;
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    }, {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    }>;
    actor: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        avatarUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "issueUnassignedFromYou";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    issue: {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    };
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    issueId: string;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}, {
    type: "issueUnassignedFromYou";
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    issue: {
        id: string;
        url: string;
        title: string;
        team: {
            name: string;
            key: string;
            id: string;
        };
        identifier: string;
        teamId: string;
    };
    archivedAt: string | Date | null;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    emailedAt: string | Date | null;
    readAt: string | Date | null;
    snoozedUntilAt: string | Date | null;
    unsnoozedAt: string | Date | null;
    issueId: string;
    actorId: string;
    userId: string;
    externalUserActorId: string | null;
}>]>;
/**
 * Webhook payload schemas
 */
export declare const AgentNotificationWebhookSchema: z.ZodObject<{
    type: z.ZodLiteral<"AppUserNotification">;
    action: z.ZodString;
    createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    organizationId: z.ZodString;
    oauthClientId: z.ZodString;
    appUserId: z.ZodString;
    notification: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        actorId: z.ZodString;
        externalUserActorId: z.ZodNullable<z.ZodString>;
        userId: z.ZodString;
        readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    } & {
        type: z.ZodLiteral<"issueCommentMention">;
        issueId: z.ZodString;
        issue: z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            teamId: z.ZodString;
            team: z.ZodObject<{
                id: z.ZodString;
                key: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
                key: string;
                id: string;
            }, {
                name: string;
                key: string;
                id: string;
            }>;
            identifier: z.ZodString;
            url: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }>;
        commentId: z.ZodString;
        comment: z.ZodObject<{
            id: z.ZodString;
            body: z.ZodString;
            userId: z.ZodString;
            issueId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        }, {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        }>;
        actor: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            email: z.ZodString;
            avatarUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "issueCommentMention";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        commentId: string;
        comment: {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        };
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }, {
        type: "issueCommentMention";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        commentId: string;
        comment: {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        };
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }>, z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        actorId: z.ZodString;
        externalUserActorId: z.ZodNullable<z.ZodString>;
        userId: z.ZodString;
        readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    } & {
        type: z.ZodLiteral<"issueAssignment">;
        issueId: z.ZodString;
        issue: z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            teamId: z.ZodString;
            team: z.ZodObject<{
                id: z.ZodString;
                key: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
                key: string;
                id: string;
            }, {
                name: string;
                key: string;
                id: string;
            }>;
            identifier: z.ZodString;
            url: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }>;
        actor: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            email: z.ZodString;
            avatarUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "issueAssignment";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }, {
        type: "issueAssignment";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }>, z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        actorId: z.ZodString;
        externalUserActorId: z.ZodNullable<z.ZodString>;
        userId: z.ZodString;
        readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    } & {
        type: z.ZodLiteral<"issueCommentReply">;
        issueId: z.ZodString;
        issue: z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            teamId: z.ZodString;
            team: z.ZodObject<{
                id: z.ZodString;
                key: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
                key: string;
                id: string;
            }, {
                name: string;
                key: string;
                id: string;
            }>;
            identifier: z.ZodString;
            url: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }>;
        commentId: z.ZodString;
        comment: z.ZodObject<{
            id: z.ZodString;
            body: z.ZodString;
            userId: z.ZodString;
            issueId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        }, {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        }>;
        actor: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            email: z.ZodString;
            avatarUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "issueCommentReply";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        commentId: string;
        comment: {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        };
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }, {
        type: "issueCommentReply";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        commentId: string;
        comment: {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        };
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }>, z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        actorId: z.ZodString;
        externalUserActorId: z.ZodNullable<z.ZodString>;
        userId: z.ZodString;
        readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    } & {
        type: z.ZodLiteral<"issueNewComment">;
        issueId: z.ZodString;
        issue: z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            teamId: z.ZodString;
            team: z.ZodObject<{
                id: z.ZodString;
                key: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
                key: string;
                id: string;
            }, {
                name: string;
                key: string;
                id: string;
            }>;
            identifier: z.ZodString;
            url: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }>;
        commentId: z.ZodString;
        comment: z.ZodObject<{
            id: z.ZodString;
            body: z.ZodString;
            userId: z.ZodString;
            issueId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        }, {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        }>;
        actor: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            email: z.ZodString;
            avatarUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "issueNewComment";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        commentId: string;
        comment: {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        };
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }, {
        type: "issueNewComment";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        commentId: string;
        comment: {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        };
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }>, z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        actorId: z.ZodString;
        externalUserActorId: z.ZodNullable<z.ZodString>;
        userId: z.ZodString;
        readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    } & {
        type: z.ZodLiteral<"agentAssignable">;
        actor: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            email: z.ZodString;
            avatarUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "agentAssignable";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }, {
        type: "agentAssignable";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }>, z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        actorId: z.ZodString;
        externalUserActorId: z.ZodNullable<z.ZodString>;
        userId: z.ZodString;
        readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    } & {
        type: z.ZodLiteral<"issueAssignedToYou">;
        issueId: z.ZodString;
        issue: z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            teamId: z.ZodString;
            team: z.ZodObject<{
                id: z.ZodString;
                key: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
                key: string;
                id: string;
            }, {
                name: string;
                key: string;
                id: string;
            }>;
            identifier: z.ZodString;
            url: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }>;
        actor: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            email: z.ZodString;
            avatarUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "issueAssignedToYou";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }, {
        type: "issueAssignedToYou";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }>, z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        actorId: z.ZodString;
        externalUserActorId: z.ZodNullable<z.ZodString>;
        userId: z.ZodString;
        readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    } & {
        type: z.ZodLiteral<"issueUnassignedFromYou">;
        issueId: z.ZodString;
        issue: z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            teamId: z.ZodString;
            team: z.ZodObject<{
                id: z.ZodString;
                key: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
                key: string;
                id: string;
            }, {
                name: string;
                key: string;
                id: string;
            }>;
            identifier: z.ZodString;
            url: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }>;
        actor: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            email: z.ZodString;
            avatarUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "issueUnassignedFromYou";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }, {
        type: "issueUnassignedFromYou";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }>]>;
    webhookTimestamp: z.ZodNumber;
    webhookId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "AppUserNotification";
    action: string;
    createdAt: string | Date;
    oauthClientId: string;
    notification: {
        type: "issueCommentMention";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        commentId: string;
        comment: {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        };
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    } | {
        type: "issueAssignment";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    } | {
        type: "issueCommentReply";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        commentId: string;
        comment: {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        };
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    } | {
        type: "issueNewComment";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        commentId: string;
        comment: {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        };
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    } | {
        type: "agentAssignable";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    } | {
        type: "issueAssignedToYou";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    } | {
        type: "issueUnassignedFromYou";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    };
    organizationId: string;
    webhookTimestamp: number;
    appUserId: string;
    webhookId: string;
}, {
    type: "AppUserNotification";
    action: string;
    createdAt: string | Date;
    oauthClientId: string;
    notification: {
        type: "issueCommentMention";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        commentId: string;
        comment: {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        };
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    } | {
        type: "issueAssignment";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    } | {
        type: "issueCommentReply";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        commentId: string;
        comment: {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        };
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    } | {
        type: "issueNewComment";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        commentId: string;
        comment: {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        };
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    } | {
        type: "agentAssignable";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    } | {
        type: "issueAssignedToYou";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    } | {
        type: "issueUnassignedFromYou";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    };
    organizationId: string;
    webhookTimestamp: number;
    appUserId: string;
    webhookId: string;
}>;
export declare const LegacyWebhookBaseSchema: z.ZodObject<{
    action: z.ZodString;
    actor: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        avatarUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }>;
    createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    url: z.ZodString;
    type: z.ZodString;
    organizationId: z.ZodString;
    webhookTimestamp: z.ZodNumber;
    webhookId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: string;
    url: string;
    action: string;
    createdAt: string | Date;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    organizationId: string;
    webhookTimestamp: number;
    webhookId: string;
}, {
    type: string;
    url: string;
    action: string;
    createdAt: string | Date;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    organizationId: string;
    webhookTimestamp: number;
    webhookId: string;
}>;
export declare const CommentWebhookSchema: z.ZodObject<{
    action: z.ZodString;
    actor: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        avatarUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }>;
    createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    url: z.ZodString;
    organizationId: z.ZodString;
    webhookTimestamp: z.ZodNumber;
    webhookId: z.ZodString;
} & {
    type: z.ZodLiteral<"Comment">;
    data: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        body: z.ZodString;
        issueId: z.ZodString;
        userId: z.ZodString;
        reactionData: z.ZodArray<z.ZodAny, "many">;
        user: z.ZodObject<Omit<{
            id: z.ZodString;
            name: z.ZodString;
            email: z.ZodString;
            avatarUrl: z.ZodOptional<z.ZodString>;
        }, "avatarUrl"> & {
            avatarUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }>;
        issue: z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            teamId: z.ZodString;
            team: z.ZodObject<{
                id: z.ZodString;
                key: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
                key: string;
                id: string;
            }, {
                name: string;
                key: string;
                id: string;
            }>;
            identifier: z.ZodString;
            url: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        body: string;
        user: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        issueId: string;
        reactionData: any[];
        userId: string;
    }, {
        id: string;
        body: string;
        user: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        issueId: string;
        reactionData: any[];
        userId: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "Comment";
    data: {
        id: string;
        body: string;
        user: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        issueId: string;
        reactionData: any[];
        userId: string;
    };
    url: string;
    action: string;
    createdAt: string | Date;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    organizationId: string;
    webhookTimestamp: number;
    webhookId: string;
}, {
    type: "Comment";
    data: {
        id: string;
        body: string;
        user: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        issueId: string;
        reactionData: any[];
        userId: string;
    };
    url: string;
    action: string;
    createdAt: string | Date;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    organizationId: string;
    webhookTimestamp: number;
    webhookId: string;
}>;
export declare const LinearIssueSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    identifier: z.ZodString;
    number: z.ZodNumber;
    priority: z.ZodNumber;
    priorityLabel: z.ZodOptional<z.ZodString>;
    url: z.ZodString;
    boardOrder: z.ZodOptional<z.ZodNumber>;
    branchName: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
    startedAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>>;
    addedToCycleAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>>;
    addedToTeamAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>>;
    customerTicketCount: z.ZodOptional<z.ZodNumber>;
    labelIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    previousIdentifiers: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    prioritySortOrder: z.ZodOptional<z.ZodNumber>;
    reactionData: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    reactions: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    slaType: z.ZodOptional<z.ZodString>;
    _assignee: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>>;
    _creator: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>>;
    _cycle: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>>;
    _state: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>>;
    _team: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    number: number;
    id: string;
    url: string;
    priority: number;
    title: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    identifier: string;
    description?: string | undefined;
    reactions?: any[] | undefined;
    reactionData?: any[] | undefined;
    addedToCycleAt?: string | Date | undefined;
    addedToTeamAt?: string | Date | undefined;
    boardOrder?: number | undefined;
    branchName?: string | undefined;
    customerTicketCount?: number | undefined;
    labelIds?: string[] | undefined;
    previousIdentifiers?: string[] | undefined;
    priorityLabel?: string | undefined;
    prioritySortOrder?: number | undefined;
    slaType?: string | undefined;
    sortOrder?: number | undefined;
    startedAt?: string | Date | undefined;
    _assignee?: {
        id: string;
    } | undefined;
    _creator?: {
        id: string;
    } | undefined;
    _cycle?: {
        id: string;
    } | undefined;
    _state?: {
        id: string;
    } | undefined;
    _team?: {
        id: string;
    } | undefined;
}, {
    number: number;
    id: string;
    url: string;
    priority: number;
    title: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    identifier: string;
    description?: string | undefined;
    reactions?: any[] | undefined;
    reactionData?: any[] | undefined;
    addedToCycleAt?: string | Date | undefined;
    addedToTeamAt?: string | Date | undefined;
    boardOrder?: number | undefined;
    branchName?: string | undefined;
    customerTicketCount?: number | undefined;
    labelIds?: string[] | undefined;
    previousIdentifiers?: string[] | undefined;
    priorityLabel?: string | undefined;
    prioritySortOrder?: number | undefined;
    slaType?: string | undefined;
    sortOrder?: number | undefined;
    startedAt?: string | Date | undefined;
    _assignee?: {
        id: string;
    } | undefined;
    _creator?: {
        id: string;
    } | undefined;
    _cycle?: {
        id: string;
    } | undefined;
    _state?: {
        id: string;
    } | undefined;
    _team?: {
        id: string;
    } | undefined;
}>;
export declare const IssueWebhookSchema: z.ZodObject<{
    action: z.ZodString;
    actor: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        avatarUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }>;
    createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    url: z.ZodString;
    organizationId: z.ZodString;
    webhookTimestamp: z.ZodNumber;
    webhookId: z.ZodString;
} & {
    type: z.ZodLiteral<"Issue">;
    data: z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>>;
        updatedAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>>;
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        identifier: z.ZodOptional<z.ZodString>;
        number: z.ZodOptional<z.ZodNumber>;
        priority: z.ZodOptional<z.ZodNumber>;
        priorityLabel: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        url: z.ZodOptional<z.ZodString>;
        boardOrder: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        branchName: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        sortOrder: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        startedAt: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>>>;
        addedToCycleAt: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>>>;
        addedToTeamAt: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>>>;
        customerTicketCount: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        labelIds: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
        previousIdentifiers: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
        prioritySortOrder: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        reactionData: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodAny, "many">>>;
        reactions: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodAny, "many">>>;
        slaType: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        _assignee: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>>>;
        _creator: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>>>;
        _cycle: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>>>;
        _state: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>>>;
        _team: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        number?: number | undefined;
        id?: string | undefined;
        url?: string | undefined;
        priority?: number | undefined;
        title?: string | undefined;
        description?: string | undefined;
        reactions?: any[] | undefined;
        createdAt?: string | Date | undefined;
        updatedAt?: string | Date | undefined;
        reactionData?: any[] | undefined;
        addedToCycleAt?: string | Date | undefined;
        addedToTeamAt?: string | Date | undefined;
        boardOrder?: number | undefined;
        branchName?: string | undefined;
        customerTicketCount?: number | undefined;
        identifier?: string | undefined;
        labelIds?: string[] | undefined;
        previousIdentifiers?: string[] | undefined;
        priorityLabel?: string | undefined;
        prioritySortOrder?: number | undefined;
        slaType?: string | undefined;
        sortOrder?: number | undefined;
        startedAt?: string | Date | undefined;
        _assignee?: {
            id: string;
        } | undefined;
        _creator?: {
            id: string;
        } | undefined;
        _cycle?: {
            id: string;
        } | undefined;
        _state?: {
            id: string;
        } | undefined;
        _team?: {
            id: string;
        } | undefined;
    }, {
        number?: number | undefined;
        id?: string | undefined;
        url?: string | undefined;
        priority?: number | undefined;
        title?: string | undefined;
        description?: string | undefined;
        reactions?: any[] | undefined;
        createdAt?: string | Date | undefined;
        updatedAt?: string | Date | undefined;
        reactionData?: any[] | undefined;
        addedToCycleAt?: string | Date | undefined;
        addedToTeamAt?: string | Date | undefined;
        boardOrder?: number | undefined;
        branchName?: string | undefined;
        customerTicketCount?: number | undefined;
        identifier?: string | undefined;
        labelIds?: string[] | undefined;
        previousIdentifiers?: string[] | undefined;
        priorityLabel?: string | undefined;
        prioritySortOrder?: number | undefined;
        slaType?: string | undefined;
        sortOrder?: number | undefined;
        startedAt?: string | Date | undefined;
        _assignee?: {
            id: string;
        } | undefined;
        _creator?: {
            id: string;
        } | undefined;
        _cycle?: {
            id: string;
        } | undefined;
        _state?: {
            id: string;
        } | undefined;
        _team?: {
            id: string;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "Issue";
    data: {
        number?: number | undefined;
        id?: string | undefined;
        url?: string | undefined;
        priority?: number | undefined;
        title?: string | undefined;
        description?: string | undefined;
        reactions?: any[] | undefined;
        createdAt?: string | Date | undefined;
        updatedAt?: string | Date | undefined;
        reactionData?: any[] | undefined;
        addedToCycleAt?: string | Date | undefined;
        addedToTeamAt?: string | Date | undefined;
        boardOrder?: number | undefined;
        branchName?: string | undefined;
        customerTicketCount?: number | undefined;
        identifier?: string | undefined;
        labelIds?: string[] | undefined;
        previousIdentifiers?: string[] | undefined;
        priorityLabel?: string | undefined;
        prioritySortOrder?: number | undefined;
        slaType?: string | undefined;
        sortOrder?: number | undefined;
        startedAt?: string | Date | undefined;
        _assignee?: {
            id: string;
        } | undefined;
        _creator?: {
            id: string;
        } | undefined;
        _cycle?: {
            id: string;
        } | undefined;
        _state?: {
            id: string;
        } | undefined;
        _team?: {
            id: string;
        } | undefined;
    };
    url: string;
    action: string;
    createdAt: string | Date;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    organizationId: string;
    webhookTimestamp: number;
    webhookId: string;
}, {
    type: "Issue";
    data: {
        number?: number | undefined;
        id?: string | undefined;
        url?: string | undefined;
        priority?: number | undefined;
        title?: string | undefined;
        description?: string | undefined;
        reactions?: any[] | undefined;
        createdAt?: string | Date | undefined;
        updatedAt?: string | Date | undefined;
        reactionData?: any[] | undefined;
        addedToCycleAt?: string | Date | undefined;
        addedToTeamAt?: string | Date | undefined;
        boardOrder?: number | undefined;
        branchName?: string | undefined;
        customerTicketCount?: number | undefined;
        identifier?: string | undefined;
        labelIds?: string[] | undefined;
        previousIdentifiers?: string[] | undefined;
        priorityLabel?: string | undefined;
        prioritySortOrder?: number | undefined;
        slaType?: string | undefined;
        sortOrder?: number | undefined;
        startedAt?: string | Date | undefined;
        _assignee?: {
            id: string;
        } | undefined;
        _creator?: {
            id: string;
        } | undefined;
        _cycle?: {
            id: string;
        } | undefined;
        _state?: {
            id: string;
        } | undefined;
        _team?: {
            id: string;
        } | undefined;
    };
    url: string;
    action: string;
    createdAt: string | Date;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    organizationId: string;
    webhookTimestamp: number;
    webhookId: string;
}>;
export declare const WebhookPayloadSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"AppUserNotification">;
    action: z.ZodString;
    createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    organizationId: z.ZodString;
    oauthClientId: z.ZodString;
    appUserId: z.ZodString;
    notification: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        actorId: z.ZodString;
        externalUserActorId: z.ZodNullable<z.ZodString>;
        userId: z.ZodString;
        readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    } & {
        type: z.ZodLiteral<"issueCommentMention">;
        issueId: z.ZodString;
        issue: z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            teamId: z.ZodString;
            team: z.ZodObject<{
                id: z.ZodString;
                key: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
                key: string;
                id: string;
            }, {
                name: string;
                key: string;
                id: string;
            }>;
            identifier: z.ZodString;
            url: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }>;
        commentId: z.ZodString;
        comment: z.ZodObject<{
            id: z.ZodString;
            body: z.ZodString;
            userId: z.ZodString;
            issueId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        }, {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        }>;
        actor: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            email: z.ZodString;
            avatarUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "issueCommentMention";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        commentId: string;
        comment: {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        };
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }, {
        type: "issueCommentMention";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        commentId: string;
        comment: {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        };
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }>, z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        actorId: z.ZodString;
        externalUserActorId: z.ZodNullable<z.ZodString>;
        userId: z.ZodString;
        readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    } & {
        type: z.ZodLiteral<"issueAssignment">;
        issueId: z.ZodString;
        issue: z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            teamId: z.ZodString;
            team: z.ZodObject<{
                id: z.ZodString;
                key: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
                key: string;
                id: string;
            }, {
                name: string;
                key: string;
                id: string;
            }>;
            identifier: z.ZodString;
            url: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }>;
        actor: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            email: z.ZodString;
            avatarUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "issueAssignment";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }, {
        type: "issueAssignment";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }>, z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        actorId: z.ZodString;
        externalUserActorId: z.ZodNullable<z.ZodString>;
        userId: z.ZodString;
        readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    } & {
        type: z.ZodLiteral<"issueCommentReply">;
        issueId: z.ZodString;
        issue: z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            teamId: z.ZodString;
            team: z.ZodObject<{
                id: z.ZodString;
                key: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
                key: string;
                id: string;
            }, {
                name: string;
                key: string;
                id: string;
            }>;
            identifier: z.ZodString;
            url: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }>;
        commentId: z.ZodString;
        comment: z.ZodObject<{
            id: z.ZodString;
            body: z.ZodString;
            userId: z.ZodString;
            issueId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        }, {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        }>;
        actor: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            email: z.ZodString;
            avatarUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "issueCommentReply";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        commentId: string;
        comment: {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        };
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }, {
        type: "issueCommentReply";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        commentId: string;
        comment: {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        };
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }>, z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        actorId: z.ZodString;
        externalUserActorId: z.ZodNullable<z.ZodString>;
        userId: z.ZodString;
        readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    } & {
        type: z.ZodLiteral<"issueNewComment">;
        issueId: z.ZodString;
        issue: z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            teamId: z.ZodString;
            team: z.ZodObject<{
                id: z.ZodString;
                key: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
                key: string;
                id: string;
            }, {
                name: string;
                key: string;
                id: string;
            }>;
            identifier: z.ZodString;
            url: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }>;
        commentId: z.ZodString;
        comment: z.ZodObject<{
            id: z.ZodString;
            body: z.ZodString;
            userId: z.ZodString;
            issueId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        }, {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        }>;
        actor: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            email: z.ZodString;
            avatarUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "issueNewComment";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        commentId: string;
        comment: {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        };
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }, {
        type: "issueNewComment";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        commentId: string;
        comment: {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        };
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }>, z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        actorId: z.ZodString;
        externalUserActorId: z.ZodNullable<z.ZodString>;
        userId: z.ZodString;
        readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    } & {
        type: z.ZodLiteral<"agentAssignable">;
        actor: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            email: z.ZodString;
            avatarUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "agentAssignable";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }, {
        type: "agentAssignable";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }>, z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        actorId: z.ZodString;
        externalUserActorId: z.ZodNullable<z.ZodString>;
        userId: z.ZodString;
        readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    } & {
        type: z.ZodLiteral<"issueAssignedToYou">;
        issueId: z.ZodString;
        issue: z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            teamId: z.ZodString;
            team: z.ZodObject<{
                id: z.ZodString;
                key: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
                key: string;
                id: string;
            }, {
                name: string;
                key: string;
                id: string;
            }>;
            identifier: z.ZodString;
            url: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }>;
        actor: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            email: z.ZodString;
            avatarUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "issueAssignedToYou";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }, {
        type: "issueAssignedToYou";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }>, z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        archivedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        actorId: z.ZodString;
        externalUserActorId: z.ZodNullable<z.ZodString>;
        userId: z.ZodString;
        readAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        emailedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        snoozedUntilAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
        unsnoozedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>, z.ZodNull]>;
    } & {
        type: z.ZodLiteral<"issueUnassignedFromYou">;
        issueId: z.ZodString;
        issue: z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            teamId: z.ZodString;
            team: z.ZodObject<{
                id: z.ZodString;
                key: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
                key: string;
                id: string;
            }, {
                name: string;
                key: string;
                id: string;
            }>;
            identifier: z.ZodString;
            url: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }>;
        actor: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            email: z.ZodString;
            avatarUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "issueUnassignedFromYou";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }, {
        type: "issueUnassignedFromYou";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    }>]>;
    webhookTimestamp: z.ZodNumber;
    webhookId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "AppUserNotification";
    action: string;
    createdAt: string | Date;
    oauthClientId: string;
    notification: {
        type: "issueCommentMention";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        commentId: string;
        comment: {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        };
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    } | {
        type: "issueAssignment";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    } | {
        type: "issueCommentReply";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        commentId: string;
        comment: {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        };
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    } | {
        type: "issueNewComment";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        commentId: string;
        comment: {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        };
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    } | {
        type: "agentAssignable";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    } | {
        type: "issueAssignedToYou";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    } | {
        type: "issueUnassignedFromYou";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    };
    organizationId: string;
    webhookTimestamp: number;
    appUserId: string;
    webhookId: string;
}, {
    type: "AppUserNotification";
    action: string;
    createdAt: string | Date;
    oauthClientId: string;
    notification: {
        type: "issueCommentMention";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        commentId: string;
        comment: {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        };
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    } | {
        type: "issueAssignment";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    } | {
        type: "issueCommentReply";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        commentId: string;
        comment: {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        };
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    } | {
        type: "issueNewComment";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        commentId: string;
        comment: {
            id: string;
            body: string;
            issueId: string;
            userId: string;
        };
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    } | {
        type: "agentAssignable";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    } | {
        type: "issueAssignedToYou";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    } | {
        type: "issueUnassignedFromYou";
        id: string;
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        archivedAt: string | Date | null;
        actor: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        emailedAt: string | Date | null;
        readAt: string | Date | null;
        snoozedUntilAt: string | Date | null;
        unsnoozedAt: string | Date | null;
        issueId: string;
        actorId: string;
        userId: string;
        externalUserActorId: string | null;
    };
    organizationId: string;
    webhookTimestamp: number;
    appUserId: string;
    webhookId: string;
}>, z.ZodObject<{
    action: z.ZodString;
    actor: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        avatarUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }>;
    createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    url: z.ZodString;
    organizationId: z.ZodString;
    webhookTimestamp: z.ZodNumber;
    webhookId: z.ZodString;
} & {
    type: z.ZodLiteral<"Comment">;
    data: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        updatedAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
        body: z.ZodString;
        issueId: z.ZodString;
        userId: z.ZodString;
        reactionData: z.ZodArray<z.ZodAny, "many">;
        user: z.ZodObject<Omit<{
            id: z.ZodString;
            name: z.ZodString;
            email: z.ZodString;
            avatarUrl: z.ZodOptional<z.ZodString>;
        }, "avatarUrl"> & {
            avatarUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }, {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        }>;
        issue: z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            teamId: z.ZodString;
            team: z.ZodObject<{
                id: z.ZodString;
                key: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
                key: string;
                id: string;
            }, {
                name: string;
                key: string;
                id: string;
            }>;
            identifier: z.ZodString;
            url: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }, {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        body: string;
        user: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        issueId: string;
        reactionData: any[];
        userId: string;
    }, {
        id: string;
        body: string;
        user: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        issueId: string;
        reactionData: any[];
        userId: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "Comment";
    data: {
        id: string;
        body: string;
        user: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        issueId: string;
        reactionData: any[];
        userId: string;
    };
    url: string;
    action: string;
    createdAt: string | Date;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    organizationId: string;
    webhookTimestamp: number;
    webhookId: string;
}, {
    type: "Comment";
    data: {
        id: string;
        body: string;
        user: {
            name: string;
            id: string;
            email: string;
            avatarUrl?: string | undefined;
        };
        createdAt: string | Date;
        updatedAt: string | Date;
        issue: {
            id: string;
            url: string;
            title: string;
            team: {
                name: string;
                key: string;
                id: string;
            };
            identifier: string;
            teamId: string;
        };
        issueId: string;
        reactionData: any[];
        userId: string;
    };
    url: string;
    action: string;
    createdAt: string | Date;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    organizationId: string;
    webhookTimestamp: number;
    webhookId: string;
}>, z.ZodObject<{
    action: z.ZodString;
    actor: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        avatarUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }, {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    }>;
    createdAt: z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>;
    url: z.ZodString;
    organizationId: z.ZodString;
    webhookTimestamp: z.ZodNumber;
    webhookId: z.ZodString;
} & {
    type: z.ZodLiteral<"Issue">;
    data: z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>>;
        updatedAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>>;
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        identifier: z.ZodOptional<z.ZodString>;
        number: z.ZodOptional<z.ZodNumber>;
        priority: z.ZodOptional<z.ZodNumber>;
        priorityLabel: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        url: z.ZodOptional<z.ZodString>;
        boardOrder: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        branchName: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        sortOrder: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        startedAt: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>>>;
        addedToCycleAt: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>>>;
        addedToTeamAt: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodType<Date, z.ZodTypeDef, Date>]>>>;
        customerTicketCount: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        labelIds: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
        previousIdentifiers: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
        prioritySortOrder: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        reactionData: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodAny, "many">>>;
        reactions: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodAny, "many">>>;
        slaType: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        _assignee: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>>>;
        _creator: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>>>;
        _cycle: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>>>;
        _state: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>>>;
        _team: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        number?: number | undefined;
        id?: string | undefined;
        url?: string | undefined;
        priority?: number | undefined;
        title?: string | undefined;
        description?: string | undefined;
        reactions?: any[] | undefined;
        createdAt?: string | Date | undefined;
        updatedAt?: string | Date | undefined;
        reactionData?: any[] | undefined;
        addedToCycleAt?: string | Date | undefined;
        addedToTeamAt?: string | Date | undefined;
        boardOrder?: number | undefined;
        branchName?: string | undefined;
        customerTicketCount?: number | undefined;
        identifier?: string | undefined;
        labelIds?: string[] | undefined;
        previousIdentifiers?: string[] | undefined;
        priorityLabel?: string | undefined;
        prioritySortOrder?: number | undefined;
        slaType?: string | undefined;
        sortOrder?: number | undefined;
        startedAt?: string | Date | undefined;
        _assignee?: {
            id: string;
        } | undefined;
        _creator?: {
            id: string;
        } | undefined;
        _cycle?: {
            id: string;
        } | undefined;
        _state?: {
            id: string;
        } | undefined;
        _team?: {
            id: string;
        } | undefined;
    }, {
        number?: number | undefined;
        id?: string | undefined;
        url?: string | undefined;
        priority?: number | undefined;
        title?: string | undefined;
        description?: string | undefined;
        reactions?: any[] | undefined;
        createdAt?: string | Date | undefined;
        updatedAt?: string | Date | undefined;
        reactionData?: any[] | undefined;
        addedToCycleAt?: string | Date | undefined;
        addedToTeamAt?: string | Date | undefined;
        boardOrder?: number | undefined;
        branchName?: string | undefined;
        customerTicketCount?: number | undefined;
        identifier?: string | undefined;
        labelIds?: string[] | undefined;
        previousIdentifiers?: string[] | undefined;
        priorityLabel?: string | undefined;
        prioritySortOrder?: number | undefined;
        slaType?: string | undefined;
        sortOrder?: number | undefined;
        startedAt?: string | Date | undefined;
        _assignee?: {
            id: string;
        } | undefined;
        _creator?: {
            id: string;
        } | undefined;
        _cycle?: {
            id: string;
        } | undefined;
        _state?: {
            id: string;
        } | undefined;
        _team?: {
            id: string;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "Issue";
    data: {
        number?: number | undefined;
        id?: string | undefined;
        url?: string | undefined;
        priority?: number | undefined;
        title?: string | undefined;
        description?: string | undefined;
        reactions?: any[] | undefined;
        createdAt?: string | Date | undefined;
        updatedAt?: string | Date | undefined;
        reactionData?: any[] | undefined;
        addedToCycleAt?: string | Date | undefined;
        addedToTeamAt?: string | Date | undefined;
        boardOrder?: number | undefined;
        branchName?: string | undefined;
        customerTicketCount?: number | undefined;
        identifier?: string | undefined;
        labelIds?: string[] | undefined;
        previousIdentifiers?: string[] | undefined;
        priorityLabel?: string | undefined;
        prioritySortOrder?: number | undefined;
        slaType?: string | undefined;
        sortOrder?: number | undefined;
        startedAt?: string | Date | undefined;
        _assignee?: {
            id: string;
        } | undefined;
        _creator?: {
            id: string;
        } | undefined;
        _cycle?: {
            id: string;
        } | undefined;
        _state?: {
            id: string;
        } | undefined;
        _team?: {
            id: string;
        } | undefined;
    };
    url: string;
    action: string;
    createdAt: string | Date;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    organizationId: string;
    webhookTimestamp: number;
    webhookId: string;
}, {
    type: "Issue";
    data: {
        number?: number | undefined;
        id?: string | undefined;
        url?: string | undefined;
        priority?: number | undefined;
        title?: string | undefined;
        description?: string | undefined;
        reactions?: any[] | undefined;
        createdAt?: string | Date | undefined;
        updatedAt?: string | Date | undefined;
        reactionData?: any[] | undefined;
        addedToCycleAt?: string | Date | undefined;
        addedToTeamAt?: string | Date | undefined;
        boardOrder?: number | undefined;
        branchName?: string | undefined;
        customerTicketCount?: number | undefined;
        identifier?: string | undefined;
        labelIds?: string[] | undefined;
        previousIdentifiers?: string[] | undefined;
        priorityLabel?: string | undefined;
        prioritySortOrder?: number | undefined;
        slaType?: string | undefined;
        sortOrder?: number | undefined;
        startedAt?: string | Date | undefined;
        _assignee?: {
            id: string;
        } | undefined;
        _creator?: {
            id: string;
        } | undefined;
        _cycle?: {
            id: string;
        } | undefined;
        _state?: {
            id: string;
        } | undefined;
        _team?: {
            id: string;
        } | undefined;
    };
    url: string;
    action: string;
    createdAt: string | Date;
    actor: {
        name: string;
        id: string;
        email: string;
        avatarUrl?: string | undefined;
    };
    organizationId: string;
    webhookTimestamp: number;
    webhookId: string;
}>]>;
/**
 * Type exports
 */
export type TeamType = z.infer<typeof TeamSchema>;
export type UserType = z.infer<typeof UserSchema>;
export type IssueMinimalType = z.infer<typeof IssueMinimalSchema>;
export type LinearIssueType = z.infer<typeof LinearIssueSchema>;
export type CommentMinimalType = z.infer<typeof CommentMinimalSchema>;
export type NotificationBaseType = z.infer<typeof NotificationBaseSchema>;
export type IssueCommentMentionNotificationType = z.infer<typeof IssueCommentMentionNotificationSchema>;
export type IssueAssignmentNotificationType = z.infer<typeof IssueAssignmentNotificationSchema>;
export type IssueCommentReplyNotificationType = z.infer<typeof IssueCommentReplyNotificationSchema>;
export type IssueNewCommentNotificationType = z.infer<typeof IssueNewCommentNotificationSchema>;
export type AgentAssignableNotificationType = z.infer<typeof AgentAssignableNotificationSchema>;
export type IssueAssignedToYouNotificationType = z.infer<typeof IssueAssignedToYouNotificationSchema>;
export type IssueUnassignedFromYouNotificationType = z.infer<typeof IssueUnassignedFromYouNotificationSchema>;
export type NotificationType = z.infer<typeof NotificationSchema>;
export type AgentNotificationWebhookType = z.infer<typeof AgentNotificationWebhookSchema>;
export type CommentWebhookType = z.infer<typeof CommentWebhookSchema>;
export type IssueWebhookType = z.infer<typeof IssueWebhookSchema>;
export type WebhookPayloadType = z.infer<typeof WebhookPayloadSchema>;
