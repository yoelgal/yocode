---
name: sentry
description: Sentry error tracking and monitoring connector
capabilities: [events, traces, metrics]
auth_fields: [auth_token, org, project]
api_base: https://sentry.io/api/0
---

# Sentry Connector

## Authentication
- `auth_token`: Auth token (from sentry.io → Settings → Auth Tokens)
- `org`: Organization slug
- `project`: Project slug

## Capabilities

### Events
List recent issues:
```bash
curl "https://sentry.io/api/0/projects/$ORG/$PROJECT/issues/?query=is:unresolved" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### Traces
Get performance data and slow transactions.

### Metrics
Error rate, response times, throughput.

## Health Check
```bash
curl -s "https://sentry.io/api/0/projects/$ORG/$PROJECT/" \
  -H "Authorization: Bearer $AUTH_TOKEN" | grep -q "id"
```
