# Security Review — Canonical Agent Personas

## Metadata

- Work Item ID: GitHub Issue #16
- Title: Add personality for agents
- Owner: Security Reviewer
- Date: 2026-07-16
- Status: Approved for QA

## Scope

- Change under review: Canonical persona instructions, Claude adapter references, portable/Antigravity persona discovery, and their regression tests.
- Trust boundaries touched: Agent communication style, claims of authority, human approval gates, and role-policy precedence.

## Scan Checklist

| Item | Status | Notes |
|---|---|---|
| Hardcoded secret / insecure env fallback | N/A | No runtime source or settings files changed. |
| `DEBUG = True` in production settings | N/A | No runtime source or settings files changed. |
| Raw SQL / ORM bypass | N/A | No data-access code changed. |
| CORS allowlist (no wildcard) | N/A | No HTTP/configuration code changed. |
| DRF `permission_classes` / `authentication_classes` present | N/A | No view or endpoint changed. |
| Sensitive data in logs or URLs | Pass | Reviewed changed instruction/test content; no secret, credential, PII, or URL-data handling introduced. |
| Rate limiting on auth-sensitive endpoints | N/A | No auth-sensitive endpoint changed. |

## Findings

| ID | Severity | Description | Fix-Before-Merge? | Status |
|---|---|---|---|---|
| None | Informational | Personas explicitly remain subordinate to `AGENTS.md`, role definitions, evidence requirements, and human gates; they prohibit claims of personal feelings, lived experience, or unheld authority. | No | No finding |

## Assumptions

- This review assesses documentation/instruction-layer trust boundaries, not runtime application security.

## Open Questions

- None.

## Risks

- A future persona edit could imply authority or simulate personhood too strongly. The explicit canonical boundary and regression tests are the current control; QA should preserve them when verifying parity.

## Approval / Review

- Reviewer: Security Reviewer (independent read-only review)
- Decision: Approved for QA — no Critical, High, Medium, or Low findings.
- Notes: `npm test` passed 47/47 and `git diff --check` passed in the reviewed worktree. No blocker exists.
