---
name: railway
description: Railway deployment platform connector
capabilities: [logs, deploys, metrics]
auth_fields: [token, project_id]
api_base: https://backboard.railway.app/graphql/v2
---

# Railway Connector

## Authentication
- `token`: Railway API token (get from railway.app → Account Settings → Tokens)
- `project_id`: Project ID (get from railway.app → project → Settings)

## Capabilities

### Logs
Query deployment logs via GraphQL:
```graphql
query { deploymentLogs(deploymentId: "...", limit: 100) { message timestamp severity } }
```

### Deploys
Check deployment status:
```graphql
query { deployments(projectId: "...", first: 5) { edges { node { id status createdAt } } } }
```

### Metrics
Check service health and resource usage.

## Health Check
```bash
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ me { name } }"}' | grep -q "name"
```
