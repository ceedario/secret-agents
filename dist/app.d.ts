/**
 * Application class that orchestrates the components
 */
export declare class App {
    private container;
    private webhookServer;
    private isShuttingDown;
    constructor();
    /**
     * Initialize the application
     */
    init(): Promise<void>;
    /**
     * Start the application
     */
    start(): Promise<void>;
    /**
     * Shut down the application
     */
    shutdown(): Promise<void>;
}
