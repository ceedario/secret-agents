# Cyrus Proxy Worker (Cloudflare Workers)

This is a Cloudflare Workers implementation of the Cyrus proxy server, providing OAuth authentication, webhook handling, and event streaming for Linear integration.

## Features

- **OAuth Flow**: Secure OAuth authentication with Linear using KV storage
- **Token Encryption**: AES-GCM encryption for OAuth tokens at rest
- **Webhook Handling**: Validates and processes Linear webhooks
- **Event Streaming**: NDJSON streaming using Durable Objects for persistent connections
- **Edge Token Management**: Secure token generation and validation for edge workers
- **Global Distribution**: Runs on Cloudflare's edge network

## Architecture

```
┌─────────────────┐
│   Linear.app    │
│                 │
└────────┬────────┘
         │ Webhooks + OAuth
         ▼
┌─────────────────┐
│ Cloudflare Edge │
│   (This Worker) │
│                 │
│ • KV Storage    │
│ • Durable Obj.  │
│ • Encryption    │
└────────┬────────┘
         │ NDJSON/HTTP
         ▼
┌─────────────────┐
│  Edge Workers   │
│ (Dev machines)  │
└─────────────────┘
```

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure KV Namespaces

Create the KV namespaces in your Cloudflare account:

```bash
wrangler kv:namespace create "OAUTH_TOKENS"
wrangler kv:namespace create "OAUTH_STATE"
wrangler kv:namespace create "EDGE_TOKENS"
wrangler kv:namespace create "WORKSPACE_METADATA"
```

Update `wrangler.toml` with the namespace IDs.

### 3. Set Secrets

```bash
wrangler secret put LINEAR_CLIENT_ID
wrangler secret put LINEAR_CLIENT_SECRET
wrangler secret put LINEAR_WEBHOOK_SECRET
wrangler secret put ENCRYPTION_KEY
```

The `ENCRYPTION_KEY` should be a 32-character string for AES-256 encryption.

### 4. Deploy

```bash
# Development
pnpm run dev

# Production
pnpm run deploy
```

## Usage

### OAuth Flow

1. Direct users to `/oauth/authorize`
2. After Linear authorization, they'll be redirected to `/oauth/callback`
3. The callback displays an edge token for configuration

### Webhook Configuration

Configure your Linear webhook URL to:

```
https://your-worker.workers.dev/webhook
```

### Edge Worker Connection

Edge workers connect using:

```javascript
const response = await fetch('https://your-worker.workers.dev/events/stream', {
  headers: {
    Authorization: `Bearer ${EDGE_TOKEN}`,
  },
});
```

## Security

- OAuth tokens are encrypted using AES-GCM before storage
- Edge tokens are hashed using SHA-256 (original never stored)
- Webhook signatures are verified using HMAC-SHA256
- All sensitive data has TTL expiration

## API Endpoints

### `GET /`

Dashboard showing available endpoints

### `GET /oauth/authorize`

Starts OAuth flow with Linear

### `GET /oauth/callback`

OAuth callback endpoint - handles code exchange

### `POST /webhook`

Receives Linear webhooks

- Requires `Linear-Signature` header
- Validates HMAC signature

### `GET /events/stream`

NDJSON event stream for edge workers

- Requires `Authorization: Bearer <edge_token>`
- Uses Durable Objects for persistent connections

### `POST /events/status`

Status updates from edge workers

- Requires `Authorization: Bearer <edge_token>`

## Development

### Local Development

```bash
pnpm run dev
```

This uses Miniflare for local KV emulation.

### Type Checking

```bash
pnpm run typecheck
```

### Monitoring

View real-time logs:

```bash
pnpm run tail
```

## Costs

- **Workers**: 100,000 requests/day free, then $0.50/million
- **KV**: 100,000 reads/day free, 1,000 writes/day free
- **Durable Objects**: $0.15/million requests + storage
- **Estimated**: ~$20-50/month for moderate usage

## Migration from Express

This implementation provides the same functionality as the Express proxy server but with:

- No filesystem dependencies (uses KV)
- Better scalability (runs globally)
- Lower latency (edge deployment)
- Automatic SSL/TLS
- Built-in DDoS protection

## Troubleshooting

### KV Operations Failing

- Check namespace bindings in `wrangler.toml`
- Verify secrets are set correctly
- Check KV operation limits

### Durable Objects Not Working

- Ensure migrations are applied
- Check Durable Object bindings
- Verify class export in `index.ts`

### OAuth Failing

- Verify Linear app redirect URI matches worker URL
- Check CLIENT_ID and CLIENT_SECRET
- Ensure ENCRYPTION_KEY is 32 characters

### Webhook Signature Failing

- Verify LINEAR_WEBHOOK_SECRET matches Linear config
- Check request body handling
- Ensure signature header is present
