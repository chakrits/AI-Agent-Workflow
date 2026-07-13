# Workflow: Bug Fix

```text
QA/BA -> Developer -> QA -> Reviewer
```

## Canonical Contract

Use `docs/contracts/bug-fix-workflow.yaml` as the canonical Bug Fix policy.
Before each handoff, validate the work item's `task-state`; the contract defines
the allowed states, transitions, evidence requirements, and retry budget.

Allow at most two verifying -> rework transitions. On the next failed verification,
set state to blocked with `stop_reason: human_review_required` and hand off to a human.

## Backward Routing

- Expected behavior unclear -> BA
- Contract/design issue -> SA
- Auth/security issue -> Security Reviewer
