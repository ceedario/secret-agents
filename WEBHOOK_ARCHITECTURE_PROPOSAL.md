# Webhook Architecture Proposal: SSE to Webhook Migration

**Issue**: [CEA-128](https://linear.app/ceedaragents/issue/CEA-128/switch-from-a-client-request-and-server-sent-events-streaming-solution)

## Executive Summary

This proposal outlines the migration from the current Server-Sent Events (SSE) based architecture to a webhook-driven solution for the ndjson-client + proxy-worker communication system. The change eliminates persistent connections, simplifies the architecture, and improves scalability.

## Current Architecture Analysis

### Current SSE-Based Flow
```
Linear → Proxy Worker → NDJSON/SSE Stream → Edge Workers (Electron Apps)
```

**Key Components:**
- `EventStreamer` - Handles webhook reception and broadcasting
- `EventStreamDurableObject` - Maintains persistent NDJSON connections
- `NdjsonClient` - Consumes NDJSON streams with reconnection logic
- Cloudflare KV - Tracks edge worker connections

### Current Problems
1. **Resource Intensive**: Persistent connections consume resources on both proxy and edge workers
2. **Connection Limits**: SSE limited to 100 concurrent connections per IP address
3. **Complex Reconnection**: Exponential backoff logic required for connection drops
4. **State Management**: Durable Objects needed to maintain connection state
5. **Network Reliability**: Connection drops require full reconnection cycle

## Proposed Webhook Architecture

### New Webhook-Driven Flow
```
Linear → Proxy Worker → Direct HTTP Webhooks → Edge Workers
```

**Architecture Benefits:**
- ✅ No persistent connections needed
- ✅ Simple HTTP request/response model  
- ✅ No connection limits
- ✅ Built-in retry mechanisms
- ✅ Stateless architecture
- ✅ Better resource utilization

## Detailed Design

### 1. Edge Worker Registration System

Replace persistent connections with webhook endpoint registration:

```typescript
// New endpoint: POST /edge/register
interface EdgeWorkerRegistration {
  webhookUrl: string;        // Where to send webhooks
  linearToken: string;       // For workspace access validation
  name: string;             // Human-readable identifier
  capabilities: string[];   // What webhook types to receive
}
```

**Storage**: Use Cloudflare KV with TTL for webhook registrations
**Security**: Validate Linear tokens and workspace access during registration

### 2. Webhook Delivery Service

Replace `EventStreamer.broadcastToWorkspace()` with direct webhook calls:

```typescript
class WebhookSender {
  async sendWebhookToEdgeWorkers(event: EdgeEvent, workspaceId: string): Promise<void> {
    const edgeWorkers = await this.getRegisteredEdgeWorkers(workspaceId);
    
    for (const worker of edgeWorkers) {
      await this.deliverWebhookWithRetry(worker.webhookUrl, event, worker.secret);
    }
  }
  
  private async deliverWebhookWithRetry(url: string, event: EdgeEvent, secret: string): Promise<void> {
    // Implement exponential backoff retry logic
    // HMAC-SHA256 signature for security
  }
}
```

### 3. Edge Worker Webhook Receiver

Replace `NdjsonClient` with HTTP webhook server:

```typescript
class WebhookReceiver {
  // Express/Fastify endpoint: POST /webhook
  async handleLinearWebhook(request: WebhookRequest): Promise<void> {
    const event = this.validateWebhookSignature(request);
    await this.processEvent(event);
  }
  
  private validateWebhookSignature(request: WebhookRequest): EdgeEvent {
    // Verify HMAC-SHA256 signature
    // Parse and validate event structure
  }
}
```

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Add webhook registration endpoints to proxy-worker
- [ ] Implement `WebhookSender` class
- [ ] Add KV storage for webhook registrations
- [ ] Implement HMAC-SHA256 signature system

### Phase 2: Edge Worker Updates (Week 2-3)  
- [ ] Add HTTP server to Electron apps
- [ ] Implement `WebhookReceiver` class
- [ ] Replace `NdjsonClient` usage with webhook handling
- [ ] Add webhook endpoint registration on startup

### Phase 3: Testing & Cleanup (Week 3-4)
- [ ] Integration testing with webhook flow
- [ ] Performance testing vs current SSE system
- [ ] Remove SSE-related code:
  - `EventStreamDurableObject`
  - `NdjsonClient` 
  - NDJSON streaming logic
  - Connection management code

## File Changes Required

### Proxy Worker
- **Modified**: `src/services/EventStreamer.ts` - Replace broadcasting with webhook calls
- **New**: `src/services/WebhookSender.ts` - Handle webhook delivery
- **New**: `src/services/EdgeWorkerRegistry.ts` - Manage webhook registrations
- **Removed**: `src/services/EventStreamDurableObject.ts`

### Edge Worker (Electron)
- **Modified**: `electron/main.ts` - Add HTTP server setup
- **New**: `electron/webhook-receiver.ts` - Replace ndjson-client
- **Removed**: `electron/ndjson-client.ts`

### Package Changes
- **Removed**: `packages/ndjson-client/` - No longer needed

## Security Considerations

1. **Webhook Authentication**: HMAC-SHA256 signatures for all webhook deliveries
2. **HTTPS Only**: All webhook URLs must use HTTPS
3. **Rate Limiting**: Prevent abuse of registration endpoints
4. **Token Validation**: Verify Linear tokens during registration
5. **Firewall Considerations**: Edge workers must accept inbound HTTP requests

## Monitoring & Observability

1. **Delivery Metrics**: Track webhook delivery success/failure rates
2. **Latency Monitoring**: Compare delivery times vs current SSE
3. **Health Checks**: Regular validation of registered webhook endpoints
4. **Error Alerting**: Failed delivery notifications

## Rollout Strategy

**Direct Replacement** (No dual-mode operation):
1. Deploy new proxy-worker with webhook system
2. Update all edge workers to use webhook receivers
3. Remove SSE code in single deployment

**Coordination Required**:
- All edge workers must be updated simultaneously
- Temporary service interruption during deployment
- Rollback plan if webhook delivery fails

## Questions for Clarification

1. **Development Environment**: How should local development handle webhook URLs? (ngrok, local tunneling?)
2. **Edge Worker Discovery**: Manual registration vs automatic discovery?
3. **Failure Handling**: What happens when all edge workers for a workspace are unreachable?
4. **Event Ordering**: Is strict ordering required or is eventual consistency acceptable?

## Success Criteria

- [ ] All Linear webhook events delivered via webhooks instead of SSE
- [ ] Webhook delivery latency ≤ current SSE delivery latency
- [ ] Webhook delivery success rate ≥ 99%
- [ ] No persistent connections maintained
- [ ] Simplified codebase with SSE code removed
- [ ] Support for same number of concurrent edge workers

## Risk Mitigation

1. **Network Connectivity**: Edge workers behind NAT/firewalls may need port forwarding
2. **Webhook Reliability**: Implement robust retry logic with dead letter queues
3. **Registration Failures**: Fallback mechanism if edge worker registration fails
4. **Security**: Comprehensive signature validation to prevent spoofing

---

**Next Steps**: Awaiting approval to proceed with implementation of Phase 1.