"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventProcessor = void 0;
const events_1 = require("events");
const child_process_1 = require("child_process");
const path_1 = require("path");
const promises_1 = require("fs/promises");
const cyrus_core_1 = require("cyrus-core");
class EventProcessor extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.sessionManager = new cyrus_core_1.SessionManager();
        this.config = config;
    }
    async processEvent(event) {
        console.log('Processing event:', event.type, event.data?.webhookType);
        console.log('Event data:', JSON.stringify(event.data, null, 2));
        switch (event.type) {
            case 'webhook':
                await this.handleWebhook(event);
                break;
            case 'heartbeat':
                // Just acknowledge heartbeats
                break;
            default:
                console.warn('Unknown event type:', event.type);
        }
    }
    async handleWebhook(event) {
        const webhook = event.data;
        // Linear webhook structure: { type, action, data, ... }
        // For notifications: { type: 'AppUserNotification', notification: { type: 'issueAssignedToYou', ... } }
        if (webhook.type === 'AppUserNotification') {
            const notificationType = webhook.notification?.type;
            const issue = webhook.notification?.issue;
            switch (notificationType) {
                case 'issueAssignedToYou':
                    await this.handleIssueAssigned(issue);
                    break;
                case 'issueCommentMention':
                case 'issueCommentReply':
                    await this.handleComment({ issue, comment: webhook.notification });
                    break;
                default:
                    console.log('Unhandled notification type:', notificationType);
            }
        }
        else {
            console.log('Unhandled webhook type:', webhook.type);
        }
    }
    async handleIssueAssigned(issueData) {
        if (!issueData) {
            console.error('No issue data provided to handleIssueAssigned');
            return;
        }
        console.log('Handling issue assigned:', issueData.identifier, issueData.title);
        // Create workspace directory
        const workspaceDir = (0, path_1.join)(this.config.workspaceBaseDir, `issue-${issueData.id}`);
        await (0, promises_1.mkdir)(workspaceDir, { recursive: true });
        // Create Issue object that implements the interface
        const issue = {
            id: issueData.id,
            identifier: issueData.identifier,
            title: issueData.title,
            description: issueData.description,
            getBranchName: () => `${issueData.identifier.toLowerCase()}-${issueData.title.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}`
        };
        // Create Workspace object
        const workspace = {
            path: workspaceDir,
            isGitWorktree: false,
            historyPath: (0, path_1.join)(workspaceDir, 'conversation-history.jsonl')
        };
        // Create a prompt file for Claude
        const prompt = `
You are working on Linear issue ${issue.identifier}: ${issue.title}

Description:
${issue.description || 'No description provided'}

Please help solve this issue.
`;
        await (0, promises_1.writeFile)((0, path_1.join)(workspaceDir, 'prompt.md'), prompt);
        // Start Claude session with jq for robust JSON processing
        const claudeProcess = (0, child_process_1.spawn)('sh', ['-c', `${this.config.claudePath} | jq -c .`], {
            cwd: workspaceDir,
            env: {
                ...process.env,
                LINEAR_TOKEN: this.config.linearToken
            }
        });
        // Create Session object
        const session = new cyrus_core_1.Session({
            issue,
            workspace,
            process: claudeProcess,
            startedAt: new Date()
        });
        this.sessionManager.addSession(issue.id, session);
        // Emit status updates
        this.emit('session-started', {
            issueId: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            isLive: true
        });
        claudeProcess.on('exit', (code) => {
            const session = this.sessionManager.getSession(issue.id);
            if (session) {
                session.exitCode = code;
                session.exitedAt = new Date();
            }
            this.emit('session-ended', {
                issueId: issue.id,
                code,
                isLive: false
            });
        });
    }
    async handleComment(data) {
        const { issue, comment } = data;
        const session = this.sessionManager.getSession(issue.id);
        if (!session) {
            console.log('No active session for issue:', issue.id);
            return;
        }
        // In a real implementation, we would send the comment to Claude
        // For now, just log it
        console.log('New comment on', issue.identifier, ':', comment.body);
    }
    getActiveSessions() {
        return Array.from(this.sessionManager.getAllSessions().entries()).map(([issueId, session]) => ({
            issueId,
            workspaceDir: session.workspace.path
        }));
    }
}
exports.EventProcessor = EventProcessor;
