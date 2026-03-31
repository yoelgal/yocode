---
name: cso
description: |
  Chief Security Officer mode. Infrastructure-first security audit:
  secrets archaeology, supply chain, CI/CD, OWASP Top 10, STRIDE.
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Agent
  - WebSearch
---

# /yocode:cso

Comprehensive security audit — infrastructure first, then application.

## Phase 1: Secrets Archaeology

```bash
# Check git history for leaked secrets
git log --all --diff-filter=D -- "*.env" "*.key" "*.pem" 2>/dev/null
git log --all -p -- "*.env" 2>/dev/null | head -50

# Check current files
grep -r "sk-" --include="*.ts" --include="*.js" --include="*.py" . 2>/dev/null | head -20
grep -r "AKIA" --include="*.ts" --include="*.js" . 2>/dev/null | head -20
grep -r "password.*=.*['\"]" --include="*.ts" --include="*.js" . 2>/dev/null | head -20
```

Check for:
- API keys committed to git (even if later deleted — they're in history)
- Hardcoded credentials in source code
- .env files not properly gitignored
- Secret patterns in CI/CD config

## Phase 2: Dependency Supply Chain

```bash
# Check for known vulnerabilities
npm audit 2>/dev/null || bun audit 2>/dev/null || true

# Check for typosquatting risks
# Verify top 10 dependencies are legitimate
```

Check for:
- Dependencies with known CVEs
- Typosquatted package names
- Abandoned packages (no updates in 2+ years)
- Packages with excessive permissions (postinstall scripts)

## Phase 3: CI/CD Pipeline Security

```bash
ls .github/workflows/*.yml 2>/dev/null
ls .gitlab-ci.yml 2>/dev/null
```

Check for:
- Secrets exposed in CI logs
- Pull request workflows that run with write permissions
- Missing pinned action versions (using @main instead of @v4.1.0)
- Overprivileged GitHub tokens

## Phase 4: OWASP Top 10

1. **Injection** — SQL, command, LDAP injection vectors
2. **Broken Auth** — Session management, token handling
3. **Sensitive Data** — Encryption at rest/transit, PII handling
4. **XML/XXE** — External entity processing
5. **Broken Access Control** — Missing auth checks, IDOR
6. **Misconfiguration** — Default configs, verbose errors in prod
7. **XSS** — Reflected, stored, DOM-based
8. **Insecure Deserialization** — Untrusted data parsing
9. **Known Vulnerabilities** — Dependency CVEs (covered in Phase 2)
10. **Insufficient Logging** — Missing audit trails

## Phase 5: STRIDE Threat Model

For each major component:
- **Spoofing** — Can someone pretend to be another user?
- **Tampering** — Can data be modified in transit/storage?
- **Repudiation** — Can actions be denied?
- **Information Disclosure** — Can sensitive data leak?
- **Denial of Service** — Can the system be overwhelmed?
- **Elevation of Privilege** — Can a user gain unauthorized access?

## Report

```markdown
# Security Audit: [project]

## Risk Level: [CRITICAL | HIGH | MEDIUM | LOW]

## Findings

### Critical ([N])
[Immediate action required]

### High ([N])
[Should fix before next release]

### Medium ([N])
[Plan to address]

### Low ([N])
[Good to fix when convenient]

## Secrets Status
- [N] secrets found in git history
- [N] hardcoded credentials in source
- .env gitignored: [yes/no]

## Dependency Health
- [N] known CVEs
- [N] outdated packages
- [N] suspicious packages

## Recommendations
[Prioritized list of actions]
```
