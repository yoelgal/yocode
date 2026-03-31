---
name: diagnose
description: |
  Pull from all connected production systems, correlate, surface anomalies.
  Use when "in prod", "users reporting", or "check logs" detected.
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Agent
  - WebSearch
---

# /yocode:diagnose

Production investigation across all connected systems.

## Step 0: Load Connectors

```bash
cat .yocode/connectors.json 2>/dev/null || echo "No connectors configured. Run /yocode:connect first."
```

## Step 1: Parallel Data Pull

For each connected system, spawn a researcher agent to:

### Logs (Railway, Vercel, Supabase)
- Pull last 100 log entries
- Filter for errors, warnings, and anomalies
- Identify error patterns and frequency

### Errors (Sentry)
- Pull recent unresolved issues
- Group by error type and frequency
- Identify new errors (first seen in last 24h)

### Metrics (PostHog, Langfuse)
- Check key metrics for anomalies
- Compare against recent baselines
- Flag significant deviations

### Traces (Langfuse, Sentry)
- Pull slow traces (>p95 latency)
- Identify bottleneck operations
- Check for failed LLM calls

## Step 2: Correlate

Cross-reference findings across sources:
- Do error spikes correlate with deploy times?
- Do slow traces correlate with specific endpoints?
- Do analytics drops correlate with error increases?

## Step 3: Report

```markdown
# Production Diagnosis

## Status: [HEALTHY | DEGRADED | DOWN]

## Active Issues
| Priority | Source | Issue | First Seen | Count |
|----------|--------|-------|-----------|-------|
| [P0-P3] | [system] | [description] | [time] | [N] |

## Correlations
[Cross-system patterns identified]

## Recommended Actions
1. [Most urgent action]
2. [Secondary action]
```
