---
name: postmortem
description: |
  Reconstruct incident timeline from all connected sources.
  Use after production incidents to document what happened and why.
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Agent
---

# /yocode:postmortem

Post-incident analysis — reconstruct timeline, find root cause, prevent recurrence.

## Step 1: Define Scope

- When did the incident start? (user report, alert, or discovery time)
- When was it resolved?
- What was the impact? (users affected, revenue impact, data loss)

## Step 2: Reconstruct Timeline

Pull from all connected systems:

1. **Git history** — What was deployed when?
2. **Sentry** — Error timeline, first occurrence
3. **Railway/Vercel** — Deploy timestamps and logs
4. **Langfuse** — LLM call failures or latency spikes
5. **PostHog** — User behavior changes, drop-off points
6. **Supabase** — Database logs, migration history

Build a timeline:
```markdown
| Time | Source | Event |
|------|--------|-------|
| 14:30 | Railway | Deploy abc123 started |
| 14:32 | Sentry | First error: "Cannot read property..." |
| 14:35 | PostHog | 40% drop in /dashboard pageviews |
| 14:50 | User | Report via Slack: "dashboard broken" |
| 15:10 | Engineer | Identified root cause |
| 15:15 | Railway | Rollback deployed |
| 15:17 | Sentry | Error rate returned to baseline |
```

## Step 3: Root Cause Analysis

Apply the "5 Whys":
1. Why did the incident occur?
2. Why was that possible?
3. Why wasn't it caught?
4. Why wasn't it caught earlier?
5. Why didn't the system prevent it?

## Step 4: Write Postmortem

```markdown
# Postmortem: [Incident Title]

## Summary
[1-2 sentence description]

## Impact
- Duration: [time]
- Users affected: [N]
- Severity: [P0-P3]

## Timeline
[From Step 2]

## Root Cause
[From Step 3]

## What Went Well
- [Things that worked during response]

## What Went Wrong
- [Things that failed or were missing]

## Action Items
- [ ] [Preventive measure 1] — Owner: [name] — Due: [date]
- [ ] [Preventive measure 2] — Owner: [name] — Due: [date]

## Lessons Learned
[Key takeaways]
```

## Step 5: Persist

- Save postmortem to `.yocode/postmortems/[date]-[slug].md`
- Create memory rules for any systemic lessons
- Update debug knowledge base if a new failure pattern was identified
