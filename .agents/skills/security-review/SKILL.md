---
name: security-review
description: Use for authentication, authorization, secrets, sensitive data, input validation, dependency risk, and trust-boundary review.
---

# security-review

## Purpose

Use for authentication, authorization, secrets, sensitive data, input validation, dependency risk, and trust-boundary review.

## Instructions

Review security-sensitive changes, produce SECURITY_REVIEW.md, and stop high-risk changes for human approval.

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
