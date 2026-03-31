---
name: posthog
description: PostHog product analytics connector
capabilities: [events, analytics]
auth_fields: [api_key, project_id]
api_base: https://app.posthog.com/api
---

# PostHog Connector

## Authentication
- `api_key`: Personal API key (from PostHog → Settings → Personal API Keys)
- `project_id`: Project ID

## Capabilities

### Events
Query recent events:
```bash
curl "https://app.posthog.com/api/projects/$PROJECT_ID/events/?limit=100" \
  -H "Authorization: Bearer $API_KEY"
```

### Analytics
Query insights, funnels, trends.

## Health Check
```bash
curl -s "https://app.posthog.com/api/projects/$PROJECT_ID/" \
  -H "Authorization: Bearer $API_KEY" | grep -q "id"
```
