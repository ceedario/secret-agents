import { Request } from 'express';
import { Server } from 'http';
import { WebhookService } from '../services/WebhookService.js';
import { HttpServer, NotificationType, OAuthHelper } from '../utils/index.js';
import { IssueService } from '../services/IssueService.js';
interface RequestWithRawBody extends Request {
    rawBody?: string;
    rawBodyBuffer?: Buffer;
}
/**
 * Implementation of WebhookService using Express
 */
export declare class ExpressWebhookService extends WebhookService {
    private webhookSecret;
    private issueService;
    private httpServer;
    private oauthHelper;
    private server;
    /**
     * @param webhookSecret - Secret for verifying webhook requests
     * @param issueService - Service for issue operations
     * @param httpServer - HTTP server utility
     * @param oauthHelper - OAuth helper utility
     */
    constructor(webhookSecret: string, issueService: IssueService, httpServer?: HttpServer, oauthHelper?: OAuthHelper | null);
    /**
     * @inheritdoc
     */
    verifySignature(req: RequestWithRawBody): boolean;
    /**
     * Process a legacy webhook event
     * @param type - The event type (Comment, Issue, etc.)
     * @param action - The action (create, update, etc.)
     * @param data - The validated event data
     * @returns Promise<void>
     */
    processEvent(type: string, action: string, data: any): Promise<void>;
    /**
     * Process agent notification based on its type
     * @param action - The notification action type
     * @param data - The validated notification data
     * @returns Promise<void>
     */
    processAgentNotification(action: string, data: NotificationType): Promise<void>;
    /**
     * @inheritdoc
     */
    startServer(port: number): Promise<Server>;
    /**
     * Close the server
     * @returns Promise<void>
     */
    closeServer(): Promise<void>;
}
export {};
