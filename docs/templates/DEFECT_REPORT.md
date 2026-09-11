# Defect Report

This is the per-defect detail artifact produced by the `defect-analysis` skill. `TEST_REPORT.md`'s Failed Tests / Defects table stays the one-row roll-up summary; link to this file from that row when a failure needs a full reproduction writeup.

## Summary

One line: what is broken and where.

## Metadata

- Defect ID:
- Work Item / Test Case ID:
- Reported By / Agent:
- Date:
- Severity: Critical / High / Medium / Low / Informational
- Status: Open / In Progress / Fixed / Verified / Closed

## Description

What is wrong, in plain terms.

## Environment

| Field | Value |
|---|---|
| OS |  |
| Browser |  |
| Device |  |
| App/Build Version |  |

## Steps to Reproduce

1.
2.
3.

If the failure does not reproduce consistently, state that explicitly here instead of listing fabricated deterministic steps.

## Expected Result

## Actual Result

## Severity Classification

Use this worked mapping (translates Security Reviewer's existing Critical/High/Medium/Low/Informational scale into functional-defect impact — not a new taxonomy):

| Severity | Functional-Defect Impact |
|---|---|
| Critical | Service down, data loss, or a security-relevant defect (route to Security Reviewer as well) |
| High | Major feature broken, no workaround |
| Medium | Feature impaired, workaround exists |
| Low | Cosmetic, no functional impact |
| Informational | Best-practice deviation or observation with no direct defect |

Selected Severity: <Critical / High / Medium / Low / Informational> — <one-line justification>

## Attachments / Logs

Before attaching any log, screenshot, or payload below, replace sensitive values with placeholders (for example `[USER_ID]`, `[POLICY_NUMBER]`, `[CLAIM_ID]`). Never attach raw PHI/PII.

Worked example — redacted API payload:

```json
{
  "claimId": "[CLAIM_ID]",
  "userId": "[USER_ID]",
  "policyNumber": "[POLICY_NUMBER]",
  "status": "error",
  "error": "Unexpected null in field 'claimAmount'"
}
```

## Root Cause (if known)

Leave blank if unknown; do not speculate. Route to Developer Agent for investigation (`debugging-discipline`) if root cause is not yet established.

## Open Questions

| # | Question | Owner | Blocks Progress? |
|---|---|---|---|
| 1 |  | Dev/QA/SA |  |
