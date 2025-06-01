/**
 * Simple dependency injection container
 */
export declare class Container {
    private services;
    constructor();
    /**
     * Register a service with the container
     * @param name - Service name
     * @param factory - Factory function to create the service
     */
    register<T>(name: string, factory: (container: Container) => T): void;
    /**
     * Get a service from the container
     * @param name - Service name
     * @returns The service instance
     */
    get<T = any>(name: string): T;
}
/**
 * Create and configure the container
 * @returns The configured container
 */
export declare function createContainer(): Container;
