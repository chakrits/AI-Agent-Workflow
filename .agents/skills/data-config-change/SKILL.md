---
name: data-config-change
description: Use for config changes, reference data, master data, validation SQL, rollback SQL, and non-code operational changes.
---

# data-config-change

## Purpose

Use for config changes, reference data, master data, validation SQL, rollback SQL, and non-code operational changes.

## Instructions

Create CONFIG_CHANGE_PLAN.md or DATA_CHANGE_PLAN.md. Skip Developer if no code change is required. Always provide validation and rollback.

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
