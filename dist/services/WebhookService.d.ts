import { Request } from 'express';
import { Server } from 'http';
/**
 * Interface for webhook operations
 */
export declare class WebhookService {
    /**
     * Start the webhook server
     * @param port - The port to listen on
     * @returns The server instance
     */
    startServer(port: number): Promise<Server>;
    /**
     * Verify the webhook signature
     * @param req - The express request object
     * @returns Whether the signature is valid
     */
    verifySignature(req: Request): boolean;
    /**
     * Process a webhook event (legacy method)
     * @param type - The event type
     * @param action - The event action
     * @param data - The event data
     */
    processEvent(type: string, action: string, data: any): Promise<void>;
    /**
     * Process an agent notification webhook event
     * @param action - The notification type
     * @param data - The notification data
     */
    processAgentNotification(action: string, data: any): Promise<void>;
}
