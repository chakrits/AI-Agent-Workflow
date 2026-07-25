# Workflow: DB / Reference Data Change

```text
BA -> Data Agent -> QA -> Release
```

## Use when

- Reference data or master data needs to change (not config values).
- A database migration or seed-data update is required.
- Existing rows need correcting, backfilling, or removing outside application code.

## Required Outputs

- DATA_CHANGE_PLAN.md
- validation query
- rollback query
- TEST_REPORT.md
- RELEASE_PLAN.md

## Gate Rules

Full rules live in the `data-config-change` skill. Before completion, confirm
evidence for:

- The rollback query has been tested, not just written.
- The validation query passes after the change is applied.
- A data backup or point-in-time recovery path is confirmed before executing.
- The change is transaction-wrapped and idempotent (safe to re-run) — see the
  skill's Non-Destructive Mechanics rule.
- Any PII-touching change was routed through Security Reviewer first.

## Handoff

Include:

- migration/data script
- rollback script
- validation query and its result
- expected row-count delta
- backup/recovery reference

## Backward Routing

- The change requires a Django migration file → SA Agent (Data Migration Safety is SA's rule; Data Agent's SQL runs after)
- The change turns out to require new code, not just data → Orchestrator / SA Agent
- PII involved → Security Reviewer before executing
