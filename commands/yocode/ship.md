---
name: ship
description: |
  Full shipping pipeline: tests, review, version bump, changelog, PR.
  Use when asked to "ship", "deploy", "PR", "push", or "release".
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
  - WebSearch
---

# /yocode:ship

Complete shipping pipeline from tests to PR creation.

## Step 0: Platform Detection

```bash
# Detect base branch
BASE=$(git remote show origin 2>/dev/null | grep "HEAD branch" | awk '{print $NF}')
BASE=${BASE:-main}
echo "Base branch: $BASE"

# Detect current branch
BRANCH=$(git branch --show-current)
echo "Current branch: $BRANCH"

# Detect test framework
if [ -f "package.json" ]; then
  if grep -q '"vitest"' package.json 2>/dev/null; then echo "Tests: vitest"
  elif grep -q '"jest"' package.json 2>/dev/null; then echo "Tests: jest"
  elif grep -q '"test"' package.json 2>/dev/null; then echo "Tests: npm test"
  fi
fi

# Check for CI
ls .github/workflows/*.yml 2>/dev/null && echo "CI: GitHub Actions"
```

## Step 1: Merge Base Branch

```bash
git fetch origin $BASE
git merge origin/$BASE --no-edit
```

If merge conflicts, resolve them before proceeding.

## Step 2: Run Tests

```bash
# Use project's test command from CLAUDE.md or package.json
# If no test framework exists, offer to bootstrap one
```

All tests must pass. If tests fail:
1. Identify which test(s) failed
2. Determine if failure is from your changes or pre-existing
3. Fix if your changes caused it
4. If pre-existing, document in PR body

## Step 3: Review Diff

Analyze ALL changes vs base branch:

```bash
git diff $BASE...HEAD --stat
git diff $BASE...HEAD
```

Check for:
- SQL safety issues (raw queries, migrations)
- Secret exposure (.env values, API keys, tokens)
- Security vulnerabilities (injection, XSS, etc.)
- Dead code or stale references
- Missing error handling
- Type coherence across the change

## Step 4: Scope Drift Detection

Compare changes against the plan (if one exists):
- Files modified that weren't in the plan
- Changes that go beyond the stated objective
- "While I was in there" improvements

Flag any scope drift. Minor drift is fine, significant drift needs acknowledgment.

## Step 5: Version Bump

If the project uses versioning:

```bash
# Read current version
cat VERSION 2>/dev/null || node -e "console.log(require('./package.json').version)"
```

Determine bump type:
- **patch** (0.0.X): Bug fixes, small changes
- **minor** (0.X.0): New features, non-breaking changes
- **major** (X.0.0): Breaking changes

## Step 6: Changelog

If CHANGELOG.md exists, add an entry:

```markdown
## [version] - [date]

### Added
- [New features]

### Changed
- [Modified behavior]

### Fixed
- [Bug fixes]
```

Write for users, not contributors. Lead with what they can now DO.

## Step 7: Commit

```bash
git add -A
git commit -m "release: v[version] — [one-line summary]"
```

## Step 8: Push & Create PR

```bash
git push -u origin $BRANCH
```

Create PR:
```bash
gh pr create --title "[title]" --body "$(cat <<'PREOF'
## Summary
[1-3 bullet points of what changed]

## Changes
[Detailed list]

## Test Plan
- [ ] Tests pass
- [ ] Manual verification of [specific things]

## Screenshots
[If applicable]
PREOF
)"
```

## Step 9: Post-Ship

- Report the PR URL
- If `/yocode:canary` is configured, offer to start monitoring
- Update `.yocode/STATE.md` with the ship event
