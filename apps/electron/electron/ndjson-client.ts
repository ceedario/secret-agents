import { NdjsonClient as BaseNdjsonClient, type NdjsonClientConfig } from 'cyrus-ndjson-client'

export class NdjsonClient extends BaseNdjsonClient {
  constructor(proxyUrl: string, edgeToken: string, webhookBaseUrl?: string) {
    const config: NdjsonClientConfig = {
      proxyUrl,
      token: edgeToken,
      transport: 'webhook',
      webhookPort: 3000 + Math.floor(Math.random() * 1000),
      webhookPath: '/webhook',
      webhookHost: 'localhost',
      ...(webhookBaseUrl && { webhookBaseUrl })
    }

    super(config)
  }

  // Add methods for backward compatibility
  isConnected(): boolean {
    return (this as any).transport?.connected || false
  }

  async disconnect(): Promise<void> {
    return (this as any).disconnect()
  }

  // EventEmitter methods are inherited from BaseNdjsonClient
}