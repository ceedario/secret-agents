import { Request } from 'express'
import { Server } from 'http'

/**
 * Interface for webhook operations
 */
export class WebhookService {
  /**
   * Start the webhook server
   * @param port - The port to listen on
   * @returns The server instance
   */
  async startServer(_port: number): Promise<Server> {
    throw new Error('Not implemented')
  }
  
  /**
   * Verify the webhook signature
   * @param req - The express request object
   * @returns Whether the signature is valid
   */
  verifySignature(_req: Request): boolean {
    throw new Error('Not implemented')
  }
  
  /**
   * Process a webhook event (legacy method)
   * @param type - The event type
   * @param action - The event action
   * @param data - The event data
   */
  async processEvent(_type: string, _action: string, _data: any): Promise<void> {
    throw new Error('Not implemented')
  }
  
  /**
   * Process an agent notification webhook event
   * @param action - The notification type
   * @param data - The notification data
   */
  async processAgentNotification(_action: string, _data: any): Promise<void> {
    throw new Error('Not implemented')
  }
}