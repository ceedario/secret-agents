import { Router } from 'itty-router';

import { EventStreamer } from './services/EventStreamer';
import { OAuthService } from './services/OAuthService';
import { WebhookReceiver } from './services/WebhookReceiver';
import type { Env, LinearWebhook } from './types';

// Export Durable Object
export { EventStreamDurableObject } from './services/EventStreamDurableObject';

const router = Router();

// Dashboard
router.get('/', (request: Request, env: Env) => {
  return new Response(
    `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cyrus Edge Proxy</title>
      <style>
        body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
        .endpoint { background: #f3f4f6; padding: 15px; margin: 10px 0; border-radius: 8px; }
        .method { font-weight: bold; color: #3b82f6; }
        a { color: #3b82f6; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h1>🚀 Cyrus Edge Proxy (Cloudflare Workers)</h1>
      <p>A distributed OAuth and webhook handler for Linear integration.</p>
      
      <h2>Available Endpoints:</h2>
      
      <div class="endpoint">
        <span class="method">GET</span> <a href="/oauth/authorize">/oauth/authorize</a>
        <p>Start OAuth flow with Linear</p>
      </div>
      
      <div class="endpoint">
        <span class="method">GET</span> /oauth/callback
        <p>OAuth callback endpoint (configure in Linear app)</p>
      </div>
      
      <div class="endpoint">
        <span class="method">POST</span> /webhook
        <p>Webhook receiver endpoint</p>
      </div>
      
      <div class="endpoint">
        <span class="method">GET</span> /events/stream
        <p>NDJSON event stream for edge workers</p>
      </div>
      
      <div class="endpoint">
        <span class="method">POST</span> /events/status
        <p>Status updates from edge workers</p>
      </div>
      
      <h2>Configuration:</h2>
      <p>Edge workers should connect to: <strong>${request.url.replace(/\/$/, '')}</strong></p>
    </body>
    </html>
  `,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    }
  );
});

// OAuth routes
router.get('/oauth/authorize', async (request: Request, env: Env) => {
  const oauthService = new OAuthService(env);
  return oauthService.handleAuthorize(request);
});

router.get('/oauth/callback', async (request: Request, env: Env) => {
  const oauthService = new OAuthService(env);
  return oauthService.handleCallback(request);
});

// Webhook route
router.post('/webhook', async (request: Request, env: Env, ctx: ExecutionContext) => {
  const eventStreamer = new EventStreamer(env);

  const webhookReceiver = new WebhookReceiver(env, async (webhook: LinearWebhook) => {
    // Extract workspace ID from webhook
    const workspaceId = webhook.organizationId;

    if (!workspaceId) {
      console.error('No organizationId in webhook, cannot route to edges');
      return;
    }

    // Transform webhook to event
    const event = eventStreamer.transformWebhookToEvent(webhook);

    // Broadcast to edges in the background
    ctx.waitUntil(
      eventStreamer
        .broadcastToWorkspace(event, workspaceId)
        .then((count) =>
          console.log(`Webhook for workspace ${workspaceId} forwarded to ${count} edge worker(s)`)
        )
        .catch((error) => console.error('Failed to broadcast webhook:', error))
    );
  });

  return webhookReceiver.handleWebhook(request);
});

// Event streaming routes
router.get('/events/stream', async (request: Request, env: Env) => {
  const eventStreamer = new EventStreamer(env);
  return eventStreamer.handleStream(request);
});

router.post('/events/status', async (request: Request, env: Env) => {
  const eventStreamer = new EventStreamer(env);
  return eventStreamer.handleStatus(request);
});

// 404 handler
router.all('*', () => {
  return new Response('Not found', { status: 404 });
});

// Export worker
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      return await router.handle(request, env, ctx);
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal server error', { status: 500 });
    }
  },
};
