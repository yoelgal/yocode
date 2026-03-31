---
name: supabase
description: Supabase PostgreSQL and auth platform connector
capabilities: [database, logs, storage, analytics]
auth_fields: [project_ref, service_role_key]
api_base: https://api.supabase.com
---

# Supabase Connector

## Authentication
- `project_ref`: Project reference ID (from supabase.com → Project Settings → General)
- `service_role_key`: Service role key (from Project Settings → API)

## Capabilities

### Database
Query via PostgREST or Management API:
```bash
curl "https://$PROJECT_REF.supabase.co/rest/v1/table" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY"
```

### Logs
Query project logs:
```bash
curl "https://api.supabase.com/v1/projects/$PROJECT_REF/analytics/endpoints/logs.all" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY"
```

### Storage
Check storage usage and buckets.

## Health Check
```bash
curl -s "https://$PROJECT_REF.supabase.co/rest/v1/" \
  -H "apikey: $SERVICE_ROLE_KEY" | head -1
```
