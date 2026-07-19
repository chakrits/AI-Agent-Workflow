---
name: data-config-change
description: Use for config changes, reference data, master data, validation SQL, rollback SQL, and non-code operational changes.
---

# data-config-change

## Purpose

Use for config changes, reference data, master data, validation SQL, rollback SQL, and non-code operational changes.

## Instructions

Create CONFIG_CHANGE_PLAN.md or DATA_CHANGE_PLAN.md. Skip Developer if no code change is required. Always provide validation and rollback.

## Config vs Data Boundary

Config controls system behavior (flag, threshold, environment setting) — use `CONFIG_CHANGE_PLAN.md`. Data is information the system displays or references (master/reference data) — use `DATA_CHANGE_PLAN.md`. State which applies when a value could be read either way.

## Escalation Guard

If the change turns out to need a code change beyond setting a config value or writing data — a new config key the code doesn't read yet, new validation logic, a schema change — stop and route to Orchestrator or SA Agent. Do not force it through the Developer-skip shortcut this flow exists for.

## Data-Specific Rules

- Non-destructive means: transaction-wrapped, idempotent upsert (`ON CONFLICT DO UPDATE`) not blind `INSERT`, with an expected row-count delta stated.
- Validation and rollback queries must be safe to run twice.
- Route to Security Reviewer before executing any change touching PII.
- Data Agent does not author Django migration files — that is SA Agent's Data Migration Safety rule; Data Agent's SQL runs after the migration is already in place.

## Config-Specific Rules

- State whether the change is hot-reloadable or requires a process restart — this determines the real effective date.
- Every feature flag needs a recorded owner and removal condition.

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
