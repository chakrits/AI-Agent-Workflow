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

## Blocks progress

- Critical correctness issue.
- Security-sensitive behavior without review.
- Tests not run and not explicitly justified.
- Requirement/AC mismatch.
- Missing rollback for risky data/config/migration change.
