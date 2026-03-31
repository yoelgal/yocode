---
name: langfuse
description: Langfuse LLM observability and tracing connector
capabilities: [traces, metrics, events]
auth_fields: [public_key, secret_key, host]
---

# Langfuse Connector

## Authentication
- `public_key`: Public key (from Langfuse → Settings → API Keys)
- `secret_key`: Secret key
- `host`: Langfuse host URL (default: https://cloud.langfuse.com)

## Capabilities

### Traces
Query recent LLM traces:
```bash
curl "$HOST/api/public/traces?limit=50" \
  -u "$PUBLIC_KEY:$SECRET_KEY"
```

### Metrics
LLM call latency, token usage, cost tracking.

### Events
Score tracking, user feedback, custom events.

## Health Check
```bash
curl -s "$HOST/api/public/health" \
  -u "$PUBLIC_KEY:$SECRET_KEY" | grep -q "ok"
```
