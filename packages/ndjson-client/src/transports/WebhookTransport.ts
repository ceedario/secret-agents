import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { createHmac } from 'crypto'
import { BaseTransport } from './BaseTransport.js'
import type { NdjsonClientConfig, StatusUpdate, EdgeEvent } from '../types.js'

/**
 * Webhook transport for receiving events via HTTP webhooks
 */
export class WebhookTransport extends BaseTransport {
  private server: ReturnType<typeof createServer> | null = null
  private webhookSecret: string
  private webhookUrl: string

  constructor(config: NdjsonClientConfig) {
    super(config)
    this.webhookSecret = config.token // Use token as webhook secret
    
    // Build webhook URL using webhookBaseUrl if provided, otherwise construct from parts
    if (config.webhookBaseUrl) {
      const baseUrl = config.webhookBaseUrl.replace(/\/$/, '') // Remove trailing slash
      const path = (config.webhookPath || '/webhook').replace(/^\//, '') // Remove leading slash
      this.webhookUrl = `${baseUrl}/${path}`
    } else {
      const host = config.webhookHost || 'localhost'
      const port = config.webhookPort || 3000
      const path = config.webhookPath || '/webhook'
      this.webhookUrl = `http://${host}:${port}${path}`
    }
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create HTTP server to receive webhooks
        this.server = createServer((req, res) => {
          this.handleWebhookRequest(req, res)
        })

        const port = this.config.webhookPort || 3000
        const host = this.config.webhookHost || 'localhost'
        
        this.server.listen(port, host, () => {
          this.connected = true
          this.emit('connect')
          
          // Register webhook with proxy
          this.registerWebhook()
            .then(() => resolve())
            .catch(reject)
        })

        this.server.on('error', (error) => {
          this.connected = false
          this.emit('error', error)
          reject(error)
        })
      } catch (error) {
        this.connected = false
        this.emit('error', error as Error)
        reject(error)
      }
    })
  }

  disconnect(): void {
    if (this.server) {
      this.server.close()
      this.server = null
    }
    this.connected = false
    this.emit('disconnect', 'Transport disconnected')
  }

  async sendStatus(update: StatusUpdate): Promise<void> {
    try {
      const response = await fetch(`${this.config.proxyUrl}/events/status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(update)
      })

      if (!response.ok) {
        throw new Error(`Failed to send status: ${response.status}`)
      }
    } catch (error) {
      this.emit('error', error as Error)
    }
  }

  private async registerWebhook(): Promise<void> {
    try {
      const response = await fetch(`${this.config.proxyUrl}/edge/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhookUrl: this.webhookUrl,
          secret: this.webhookSecret
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to register webhook: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      this.emit('error', error as Error)
      throw error
    }
  }

  private async handleWebhookRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'text/plain' })
        res.end('Method Not Allowed')
        return
      }

      // Read request body
      let body = ''
      req.on('data', chunk => {
        body += chunk.toString()
      })

      req.on('end', () => {
        try {
          // Verify webhook signature
          const signature = req.headers['x-webhook-signature'] as string
          if (!this.verifySignature(body, signature)) {
            res.writeHead(401, { 'Content-Type': 'text/plain' })
            res.end('Unauthorized')
            return
          }

          // Parse and handle event
          const event = JSON.parse(body) as EdgeEvent
          this.handleEvent(event)

          res.writeHead(200, { 'Content-Type': 'text/plain' })
          res.end('OK')
        } catch (error) {
          this.emit('error', error as Error)
          res.writeHead(400, { 'Content-Type': 'text/plain' })
          res.end('Bad Request')
        }
      })

      req.on('error', (error) => {
        this.emit('error', error)
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end('Internal Server Error')
      })
    } catch (error) {
      this.emit('error', error as Error)
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end('Internal Server Error')
    }
  }

  private verifySignature(body: string, signature: string): boolean {
    if (!signature) return false
    
    const expectedSignature = createHmac('sha256', this.webhookSecret)
      .update(body)
      .digest('hex')
    
    return signature === `sha256=${expectedSignature}`
  }
}