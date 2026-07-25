# Workflow: Code Review Gate

## Use when

Code changes are ready for review before QA, merge, or release.

## Flow

```text
Developer Agent
  ↓
verification-before-completion
  ↓
code-review-gate
  ↓
Reviewer / Security / QA
```

## Gate Rules

Full review dimensions and process live in the `code-review-gate` skill. This
playbook blocks progress on:

- Critical correctness issue.
- Security-sensitive behavior without review.
- Tests not run and not explicitly justified.
- Requirement/AC mismatch.
- Missing rollback for risky data/config/migration change.

## Handoff

Include:

- review findings, grouped by dimension (see skill's Review dimensions)
- severity per finding: Critical / Major / Minor / Question
- blocking (must fix before proceeding) vs non-blocking findings, stated explicitly
- re-review scope — which files/areas need a second pass after fixes land
