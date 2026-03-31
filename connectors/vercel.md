---
name: vercel
description: Vercel frontend deployment platform connector
capabilities: [deploys, logs, analytics]
auth_fields: [token, project_id]
api_base: https://api.vercel.com
---

# Vercel Connector

## Authentication
- `token`: Vercel API token (from vercel.com → Settings → Tokens)
- `project_id`: Project ID

## Capabilities

### Deploys
List recent deployments:
```bash
curl "https://api.vercel.com/v6/deployments?projectId=$PROJECT_ID&limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

### Logs
Get deployment build logs and runtime logs.

### Analytics
Web analytics and Core Web Vitals data.

## Health Check
```bash
curl -s "https://api.vercel.com/v2/user" \
  -H "Authorization: Bearer $TOKEN" | grep -q "id"
```
