---
name: skeptic
description: Mandatory failure analysis — every plan and implementation must survive the skeptic before shipping
scope: axiom
---

# Skeptic Axioms

Before any plan is presented or any implementation is declared done, it must
survive the skeptic. The skeptic asks: "How does this break?"

This axiom exists because AI agents systematically produce happy-path plans.
They describe what happens when everything works and skip what happens when
things fail. In production, things fail constantly.

## During Planning: The Failure Gauntlet

Before presenting any plan to the user, run it through these checks:

### 1. For Every External Call (API, DB, Service)

Ask and answer:
- **What if it times out?** (network partition, slow response, connection pool exhausted)
- **What if it returns an error?** (400, 401, 403, 404, 429, 500, 502, 503)
- **What if it returns unexpected data?** (null where object expected, empty array, wrong type, HTML instead of JSON)
- **What if it's unavailable?** (service down, DNS failure, certificate expired)
- **What if it's slow?** (p99 is 5x normal — does the UI hang? Does the queue back up?)

For each: specify the handling. "Retry with backoff" or "degrade gracefully showing cached data" or "show error with retry button." NOT "handle errors appropriately."

### 2. For Every State Change (DB Write, Cache Update, Queue Push)

Ask and answer:
- **What if it partially succeeds?** (3 of 5 rows inserted, then constraint violation)
- **What if it's called twice?** (duplicate message, user double-clicks, job retries)
- **What if the data is stale?** (read-then-write race, optimistic locking failure)
- **What if there's a concurrent modification?** (two users editing the same resource)
- **What if the write succeeds but the notification fails?** (consistency between systems)

For each: specify whether you need transactions, idempotency keys, optimistic locking, or eventual consistency.

### 3. For Every User-Facing Flow

Ask and answer:
- **What does the user see while loading?** (skeleton, spinner, nothing, flash of wrong content)
- **What does the user see on error?** (specific message with action, or generic "something went wrong")
- **What if the user navigates away mid-operation?** (orphaned request, unsaved state)
- **What if the user retries immediately?** (double-submit, duplicate creation)
- **What if the user has no data yet?** (first-time experience, empty state)
- **What if the user has too much data?** (pagination, virtualization, timeout)
- **What if the user's connection drops mid-flow?** (offline, reconnection, partial state)

### 4. For Every New Dependency or Integration

Ask and answer:
- **What's the blast radius if this dependency goes down?** (does the whole app die, or just one feature?)
- **Is there a circuit breaker?** (stop calling a dead service after N failures)
- **What's the fallback?** (cached data, default behavior, degraded experience)
- **Does this create a new single point of failure?**

### 5. Downstream Effects

For every change, trace forward:
- **What else reads this data?** (dashboards, reports, exports, other services)
- **What else triggers on this event?** (webhooks, queue consumers, scheduled jobs)
- **What caches does this invalidate?** (CDN, Redis, in-memory, browser)
- **What indexes does this affect?** (search, analytics, materialized views)
- **What notifications does this send?** (email, push, in-app — do they still make sense?)

## During Implementation: Verify, Don't Assume

After implementing, verify each failure scenario from the plan:

1. **Can you trigger the error path?** Try it. If you can't test it, flag it.
2. **Does the error message help the user recover?** Read it as a confused user would.
3. **Does the retry logic actually work?** Check for exponential backoff, max retries, jitter.
4. **Are timeouts set?** Default timeouts are almost always wrong (too long or infinite).
5. **Is idempotency handled?** If the operation can be called twice, what happens?

## The Skeptic Checklist (Quick Version)

Before presenting a plan or declaring implementation done:

- [ ] Every external call has timeout + error + unexpected data handling
- [ ] Every state change is idempotent or explicitly documented as not
- [ ] Every user flow has loading, error, empty, and edge case states
- [ ] Downstream effects are traced (what else touches this data?)
- [ ] No new single points of failure introduced
- [ ] Failure scenarios are specific, not "handle errors gracefully"

## When This Axiom Fires

- **Planning:** Before presenting the plan. The plan should already contain failure handling.
- **Implementation:** Before declaring done. Error paths should be implemented, not just planned.
- **Review:** The reviewer checks that the skeptic analysis was done, not just the happy path.
- **Debug:** When investigating, the skeptic helps identify which failure scenario wasn't handled.
