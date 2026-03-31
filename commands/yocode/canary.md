---
name: canary
description: |
  Post-deploy canary monitoring. Watches for errors, performance
  regressions, and page failures after shipping.
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Agent
---

# /yocode:canary

Post-deploy monitoring loop. Watches the live app for issues after shipping.

## Step 0: Establish Baseline

Before deploying (called by `/yocode:ship`):
- Capture current error rate from Sentry
- Capture current latency p50/p95/p99
- Capture current event volume from PostHog
- Take a snapshot of key pages (if browse daemon available)

## Step 1: Monitor Loop

After deploy, check every 2 minutes for 10 minutes:

```
Check 1 (T+2min):  Error rate vs baseline
Check 2 (T+4min):  Latency vs baseline
Check 3 (T+6min):  Event volume vs baseline
Check 4 (T+8min):  Console errors on key pages
Check 5 (T+10min): Final summary
```

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error rate | >2x baseline | >5x baseline |
| p95 latency | >1.5x baseline | >3x baseline |
| Event volume | <50% baseline | <20% baseline |
| Console errors | Any new error | N/A |

## Step 2: Report

```markdown
# Canary Report: [deploy hash]

## Verdict: [PASS | WARNING | ROLLBACK_RECOMMENDED]

## Metrics vs Baseline
| Metric | Baseline | Current | Change |
|--------|----------|---------|--------|
| Error rate | [N]/hr | [N]/hr | [+/-]% |
| p95 latency | [N]ms | [N]ms | [+/-]% |

## Issues Detected
[If any]

## Recommendation
[Continue | Investigate | Rollback]
```

If ROLLBACK_RECOMMENDED, surface immediately — don't wait for the loop to finish.
