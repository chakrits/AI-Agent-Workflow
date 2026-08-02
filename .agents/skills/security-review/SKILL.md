---
name: security-review
description: Use for authentication, authorization, secrets, sensitive data, input validation, dependency risk, and trust-boundary review.
---

# security-review

## Purpose

Use for authentication, authorization, secrets, sensitive data, input validation, dependency risk, and trust-boundary review.

## Instructions

Review security-sensitive changes, produce SECURITY_REVIEW.md, and stop high-risk changes for human approval.

## Scan Checklist

Run this first, before anything else, on every security-sensitive change — adapted to this project's Django/DRF/PostgreSQL stack:

- Hardcoded secret or an insecure fallback default (e.g. `os.environ.get('SECRET_KEY', 'insecure-default')`) in `settings.py` or any source file.
- `DEBUG = True` reaching a production settings file.
- Raw SQL, `.extra()`, or a string-formatted `cursor.execute()` that bypasses Django ORM parameterization.
- `CORS_ALLOW_ALL_ORIGINS = True` instead of an explicit `CORS_ALLOWED_ORIGINS` allowlist.
- A DRF view or viewset with no `permission_classes` / `authentication_classes` set.
- A token, password, or PII value reaching a log statement or a URL query parameter.
- An auth-sensitive endpoint (login, registration, password reset, MFA) with no throttling configured.

Record each item checked, or `N/A — <reason>` when the change doesn't touch that surface.

## Severity Scale

- **Critical** — remote code execution, authentication bypass, SQL injection with data access.
- **High** — stored XSS, IDOR exposing sensitive data, privilege escalation.
- **Medium** — CSRF on a state-changing action, missing security headers, verbose error messages.
- **Low** — clickjacking on a non-sensitive page, minor information disclosure.
- **Informational** — best-practice deviation with no direct exploit path.

Critical and High findings block the change. Medium and Low do not block — log them and route back to Developer Agent. Never downgrade a Critical or High finding to avoid blocking a merge.

Before dismissing a set of Medium/Low findings individually, check whether they compose into a worse risk.

## Exposed-Secret Incident Response

When a hardcoded secret is found (not just a risky pattern — an actual live credential in source, logs, or a committed file), a Critical/High finding record alone is not sufficient:

1. Stop and treat it as Critical regardless of what the secret happens to grant access to.
2. Rotate the exposed credential — a finding that only recommends removing the hardcoded value without rotating it leaves the already-exposed secret valid.
3. Sweep the rest of the codebase for the same pattern before closing the finding — an exposed secret found once is rarely isolated; check for the same credential or pattern reused elsewhere before declaring the issue closed.

## Canonical References

- `AGENTS.md`
- `PROJECT_STATUS.md`
- `docs/workflow/dynamic-routing.md`
- `docs/workflow/role-definitions.md`
- `docs/workflow/quality-gates.md`
- `docs/workflow/handoff-contract.md`
- `docs/templates/`

## Output Rules

- Use the relevant template in `docs/templates/`.
- Document assumptions and open questions.
- Do not skip required gates.
- Update `PROJECT_STATUS.md` and `TASK_LOG.md` when the platform allows file edits.
