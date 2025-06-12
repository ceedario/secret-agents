import { vi } from 'vitest';
import type { ClaudeEvent } from '@cyrus/claude-parser';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock webhook event helpers
export const mockIssueAssignedWebhook = (issue: any = {}) => ({
  type: 'webhook',
  id: 'webhook-1',
  timestamp: new Date().toISOString(),
  data: {
    type: 'AppUserNotification',
    notification: {
      type: 'issueAssignedToYou',
      issue: {
        id: 'issue-123',
        identifier: 'TEST-123',
        title: 'Test Issue',
        description: 'Test description',
        team: { id: 'test-workspace' },
        ...issue,
      },
    },
    createdAt: new Date().toISOString(),
    eventId: 'event-123',
    organizationId: 'test-workspace',
  },
});

export const mockCommentWebhook = (issue: any = {}, comment: any = {}) => ({
  type: 'webhook',
  id: 'webhook-2',
  timestamp: new Date().toISOString(),
  data: {
    type: 'AppUserNotification',
    notification: {
      type: 'issueNewComment',
      issue: {
        id: 'issue-123',
        identifier: 'TEST-123',
        team: { id: 'test-workspace' },
        ...issue,
      },
      comment: {
        body: 'Test comment',
        ...comment,
      },
    },
    createdAt: new Date().toISOString(),
    eventId: 'event-456',
    organizationId: 'test-workspace',
  },
});

export const mockLegacyCommentWebhook = (issue: any = {}, comment: any = {}) => ({
  type: 'webhook',
  id: 'webhook-3',
  timestamp: new Date().toISOString(),
  data: {
    type: 'Comment',
    action: 'create',
    data: {
      issue: {
        id: 'issue-123',
        identifier: 'TEST-123',
        team: { id: 'test-workspace' },
        ...issue,
      },
      body: 'Test comment',
      ...comment,
    },
    createdAt: new Date().toISOString(),
    eventId: 'event-789',
  },
});

export const mockClaudeAssistantEvent = (content: string): ClaudeEvent =>
  ({
    type: 'assistant',
    message: {
      content: content,
    },
  }) as any;

export const mockClaudeToolEvent = (toolName: string, input: any): ClaudeEvent =>
  ({
    type: 'assistant',
    message: {
      content: [
        {
          type: 'tool_use',
          name: toolName,
          input,
        },
      ],
    },
  }) as any;

export const mockClaudeErrorEvent = (message: string): ClaudeEvent =>
  ({
    type: 'error',
    message,
  }) as any;

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
