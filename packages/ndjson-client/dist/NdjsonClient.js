import { EventEmitter } from 'events';
/**
 * NDJSON streaming client for proxy communication
 */
export class NdjsonClient extends EventEmitter {
    proxyUrl;
    token;
    connected = false;
    reconnectAttempts = 0;
    maxReconnectAttempts;
    reconnectBaseDelay;
    abortController = null;
    reconnecting = false;
    constructor(config) {
        super();
        this.proxyUrl = config.proxyUrl;
        this.token = config.token;
        this.maxReconnectAttempts = config.maxReconnectAttempts ?? 10;
        this.reconnectBaseDelay = config.reconnectBaseDelay ?? 1000;
        // Forward config callbacks to events
        if (config.onEvent)
            this.on('event', config.onEvent);
        if (config.onConnect)
            this.on('connect', config.onConnect);
        if (config.onDisconnect)
            this.on('disconnect', config.onDisconnect);
        if (config.onError)
            this.on('error', config.onError);
    }
    /**
     * Connect to the proxy and start receiving events
     */
    async connect() {
        try {
            // Create abort controller for clean disconnection
            this.abortController = new AbortController();
            const response = await fetch(`${this.proxyUrl}/events/stream`, {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    Accept: 'application/x-ndjson',
                },
                signal: this.abortController.signal,
            });
            if (!response.ok) {
                throw new Error(`Failed to connect: ${response.status} ${response.statusText}`);
            }
            this.connected = true;
            this.reconnectAttempts = 0;
            this.emit('connect');
            // Process NDJSON stream
            if (response.body) {
                await this.processStream(response.body);
            }
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    this.emit('disconnect', 'Connection aborted');
                    return;
                }
                this.connected = false;
                this.emit('error', error);
                // Attempt reconnection
                await this.reconnect();
            }
        }
    }
    /**
     * Process the NDJSON stream
     */
    async processStream(stream) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                // Decode chunk and add to buffer
                buffer += decoder.decode(value, { stream: true });
                // Process complete lines
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const event = JSON.parse(line);
                            await this.handleEvent(event);
                        }
                        catch (parseError) {
                            this.emit('error', new Error(`Failed to parse event: ${line}`));
                        }
                    }
                }
            }
        }
        finally {
            reader.releaseLock();
            this.connected = false;
            this.emit('disconnect', 'Stream ended');
        }
    }
    /**
     * Handle a single event from the stream
     */
    async handleEvent(event) {
        // Emit generic event
        this.emit('event', event);
        // Emit specific events
        switch (event.type) {
            case 'connection':
                // Connection confirmed by proxy
                break;
            case 'heartbeat':
                this.emit('heartbeat');
                break;
            case 'webhook':
                const webhookEvent = event;
                this.emit('webhook', webhookEvent.data);
                break;
            case 'error':
                this.emit('error', new Error(event.data?.message || 'Unknown error'));
                break;
        }
    }
    /**
     * Send status update to proxy
     */
    async sendStatus(update) {
        try {
            const response = await fetch(`${this.proxyUrl}/events/status`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(update),
            });
            if (!response.ok) {
                throw new Error(`Failed to send status: ${response.status}`);
            }
        }
        catch (error) {
            this.emit('error', error);
        }
    }
    /**
     * Attempt to reconnect with exponential backoff
     */
    async reconnect() {
        if (this.reconnecting)
            return;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.emit('error', new Error('Max reconnection attempts reached'));
            return;
        }
        this.reconnecting = true;
        this.reconnectAttempts++;
        const delay = this.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        if (!this.connected) {
            this.reconnecting = false;
            await this.connect();
        }
    }
    /**
     * Disconnect from the proxy
     */
    disconnect() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.connected = false;
        this.reconnecting = false;
    }
    /**
     * Check if client is connected
     */
    isConnected() {
        return this.connected;
    }
}
//# sourceMappingURL=NdjsonClient.js.map