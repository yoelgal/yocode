---
name: qa
description: |
  Systematic QA testing across 6 categories with health scoring and fix loop.
  Use when asked to "QA", "test this", "find bugs", or a feature is ready.
  Three tiers: Quick (critical only), Standard (+ medium), Exhaustive (all).
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
---

# /yocode:qa

Systematic QA testing with health scoring and iterative fix loop.

## Step 0: Determine Scope

Ask or infer:
- **URL** to test (for web apps) or **entry point** (for CLIs/libraries)
- **Tier**: Quick | Standard | Exhaustive

| Tier | Categories | When |
|------|-----------|------|
| Quick | Critical + High severity only | Pre-commit sanity check |
| Standard | + Medium severity | Pre-PR |
| Exhaustive | + Low + Cosmetic | Pre-release |

## Step 1: Test Across 6 Categories

### Category 1: Visual
- Layout consistency across viewport sizes
- Typography hierarchy and spacing
- Color contrast (WCAG AA minimum)
- Image loading and alt text
- Dark mode consistency (if applicable)

### Category 2: Functional
- Core user flows complete end-to-end
- Form validation (empty, invalid, edge cases)
- Navigation and routing
- Authentication and authorization flows
- API error handling and loading states

### Category 3: UX
- Interaction feedback (buttons respond, loading indicators)
- Error messages are helpful and actionable
- Empty states are handled gracefully
- Responsive behavior at breakpoints
- Keyboard navigation and focus management

### Category 4: Content
- No placeholder text ("Lorem ipsum", "TODO")
- Spelling and grammar
- Links work (no 404s)
- Dates and numbers formatted correctly
- Copy is consistent in tone and terminology

### Category 5: Performance
- Page load time < 3s on 3G
- No unnecessary re-renders
- Images optimized (WebP, lazy loading)
- Bundle size reasonable
- No memory leaks in long sessions

### Category 6: Accessibility
- Semantic HTML structure
- ARIA labels on interactive elements
- Color is not the only differentiator
- Screen reader navigation works
- Focus trapping in modals

## Step 2: Score

For each bug found, classify severity:

| Severity | Description | Example |
|----------|-------------|---------|
| **Critical** | Blocks core functionality | Login broken, data loss |
| **High** | Major feature broken | Form doesn't submit, page crashes |
| **Medium** | Feature works but poorly | Layout broken on mobile, slow load |
| **Low** | Minor issue | Alignment off by 2px, hover state missing |
| **Cosmetic** | Polish | Inconsistent spacing, font weight |

### Health Score

```
Score = 100 - (critical × 25) - (high × 15) - (medium × 5) - (low × 2) - (cosmetic × 1)
Minimum: 0
```

| Score | Rating | Ship? |
|-------|--------|-------|
| 90-100 | Excellent | Ship it |
| 75-89 | Good | Ship with known issues |
| 50-74 | Fair | Fix high+ before shipping |
| 0-49 | Poor | Significant work needed |

## Step 3: Fix Loop

For each bug, starting with highest severity:

1. **Locate** the source code causing the issue
2. **Fix** the root cause (not just the symptom)
3. **Commit** atomically: `fix: [category] [description]`
4. **Re-test** to verify the fix and check for regressions
5. **Update** the health score

Repeat until:
- (Quick tier) All critical bugs fixed
- (Standard tier) All high+ bugs fixed
- (Exhaustive tier) All bugs fixed

## Step 4: Report

```markdown
# QA Report

## Health Score: [N]/100 ([Rating])
Before: [score] → After: [score]

## Bugs Found: [N]
| # | Severity | Category | Description | Status |
|---|----------|----------|-------------|--------|
| 1 | Critical | Functional | Login returns 500 | Fixed ✅ |
| 2 | High | Visual | Mobile layout broken | Fixed ✅ |

## Ship Readiness
[READY | READY_WITH_CAVEATS | NOT_READY]

## Remaining Issues
[Any unfixed bugs with reasons]
```
