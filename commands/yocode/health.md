---
name: health
description: |
  Quick production status check across all connectors.
  Use when asked "is prod up?", "check health", or "status".
allowed-tools:
  - Read
  - Bash
  - Grep
---

# /yocode:health

On-demand production health check. Lighter than `/yocode:diagnose`.

## Process

1. Load `.yocode/connectors.json`
2. For each connected system, do a lightweight health check:
   - **Railway**: Check deployment status
   - **Vercel**: Check latest deployment status
   - **Supabase**: Check database connectivity
   - **Sentry**: Check for P0 unresolved issues
   - **PostHog**: Check if events are flowing
   - **Langfuse**: Check trace ingestion
3. Summarize:

```markdown
## Production Health

| System | Status | Details |
|--------|--------|---------|
| Railway | ✅ UP | Last deploy: 2h ago |
| Supabase | ✅ UP | DB connections: 12/100 |
| Sentry | ⚠️ WARN | 3 unresolved P1 issues |
| PostHog | ✅ UP | 1.2k events/hr |

Overall: [HEALTHY | DEGRADED | DOWN]
```
