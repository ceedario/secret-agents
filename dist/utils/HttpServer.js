import express from 'express';
/**
 * HTTP server abstraction to make server creation testable
 */
export class HttpServer {
    /**
     * Create a new server
     * @returns Express application
     */
    createServer() {
        return express();
    }
    /**
     * Create JSON body parser middleware with raw body capture for webhook verification
     * @returns Express middleware
     */
    jsonParser() {
        // Define middleware to capture the raw body for webhook verification
        const rawBodyCapture = (req, _res, next) => {
            let chunks = [];
            let receivedLength = 0;
            // Only set up listeners if they don't already exist
            if (!req.listeners('data').length) {
                // Capture the raw body
                req.on('data', (chunk) => {
                    chunks.push(chunk);
                    receivedLength += chunk.length;
                });
                // Store the raw body on the request once it's fully received
                req.on('end', () => {
                    const buffer = Buffer.concat(chunks, receivedLength);
                    // Store the raw buffer first
                    req.rawBodyBuffer = buffer;
                    // Then stringify it for text-based access
                    req.rawBody = buffer.toString('utf8');
                    // Log raw body for debugging if needed
                    // console.log(`Raw body captured (${req.rawBody.length} bytes)`);
                    // Try to parse the JSON ourselves for better error handling
                    if (req.headers['content-type']?.includes('application/json')) {
                        try {
                            req.body = JSON.parse(req.rawBody);
                        }
                        catch (err) {
                            console.error('Error parsing JSON body:', err instanceof Error ? err.message : String(err));
                            // Set an empty object to prevent null reference errors
                            req.body = {};
                        }
                    }
                    next();
                });
            }
            else {
                next();
            }
        };
        // Create a more robust JSON parser with error handling
        const jsonErrorHandler = (req, _res, next) => {
            // This is actually an error handler, but for type compatibility we'll make it a regular middleware
            if (req.jsonError) {
                console.error('JSON parsing error:', req.jsonError.message);
                // Continue with an empty body to prevent crashes
                req.body = req.body || {};
            }
            next();
        };
        // Return an array of middleware functions
        return [
            rawBodyCapture,
            express.json({
                verify: (req, _res, buf) => {
                    // This is a verification function that gets called by express.json()
                    // It doesn't affect the parsed body, but it ensures we have a backup
                    if (!req.rawBodyBuffer) {
                        req.rawBodyBuffer = buf;
                        req.rawBody = buf.toString('utf8');
                    }
                },
                // Don't reject unexpected tokens
                strict: false
            }),
            jsonErrorHandler
        ];
    }
    /**
     * Start the server
     * @param app - Express application
     * @param port - Port to listen on
     * @returns Server instance
     */
    listen(app, port) {
        return new Promise((resolve, reject) => {
            // Create server first, then set up listeners
            const server = app.listen(port);
            // Set up success listener
            server.on('listening', () => {
                resolve(server);
            });
            // Set up error listener
            server.on('error', (error) => {
                reject(error);
            });
        });
    }
    /**
     * Close the server
     * @param server - Server instance
     * @returns Promise<void>
     */
    close(server) {
        return new Promise((resolve) => {
            if (!server) {
                resolve();
                return;
            }
            server.close(() => {
                resolve();
            });
        });
    }
}
