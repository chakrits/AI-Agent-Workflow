# SECURITY_REVIEW.md

## Metadata

- Work Item ID:
- Title:
- Owner:
- Date:
- Status: Draft / Review / Approved

## Scope

- Change under review:
- Trust boundaries touched:

## Scan Checklist

| Item | Status | Notes |
|---|---|---|
| Hardcoded secret / insecure env fallback |  |  |
| `DEBUG = True` in production settings |  |  |
| Raw SQL / ORM bypass |  |  |
| CORS allowlist (no wildcard) |  |  |
| DRF `permission_classes` / `authentication_classes` present |  |  |
| Sensitive data in logs or URLs |  |  |
| Rate limiting on auth-sensitive endpoints |  |  |

(Status: Pass / Fail / N/A — reason)

## Findings

| ID | Severity | Description | Fix-Before-Merge? | Status |
|---|---|---|---|---|
|  |  |  |  |  |

## Assumptions

- 

## Open Questions

- 

## Risks

- 

## Approval / Review

- Reviewer:
- Decision:
- Notes:
