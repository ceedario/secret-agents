import { Express, RequestHandler } from 'express';
import { Server } from 'http';
declare global {
    namespace Express {
        interface Request {
            rawBody?: string;
            rawBodyBuffer?: Buffer;
        }
    }
}
/**
 * HTTP server abstraction to make server creation testable
 */
export declare class HttpServer {
    /**
     * Create a new server
     * @returns Express application
     */
    createServer(): Express;
    /**
     * Create JSON body parser middleware with raw body capture for webhook verification
     * @returns Express middleware
     */
    jsonParser(): RequestHandler[];
    /**
     * Start the server
     * @param app - Express application
     * @param port - Port to listen on
     * @returns Server instance
     */
    listen(app: Express, port: number): Promise<Server>;
    /**
     * Close the server
     * @param server - Server instance
     * @returns Promise<void>
     */
    close(server: Server | null): Promise<void>;
}
