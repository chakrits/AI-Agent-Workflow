# Design: Data Change Classification and Workflow Contract (Issue #121)

**Date:** 2026-07-28
**Author:** BA/Data Agent (session), SA Agent (session)
**Status:** Accepted — Boss approved 2026-07-28; implemented in `docs/contracts/data-change-workflow.yaml`
**Issue:** #121 (child of #116)

## Why this exists

The Issue #116 review found `schema-design` treated as a universal Data
Change state, when it applies to only one of several genuinely different
data-change subtypes. This document classifies those subtypes first, then
designs states per subtype, grounded in the Data Agent role rules already
in `docs/workflow/role-definitions.md` rather than inventing new policy.

## Classification: four subtypes, not one "Data Change"

| Subtype | What it is | Needs `schema-design`? | Highest-risk control |
|---|---|---|---|
| **Reference data** | Master/lookup data upsert against an existing schema (e.g. a new dropdown value) | No | Non-Destructive Mechanics (transaction + idempotent upsert + expected row-count delta) |
| **Backfill** | Populating an existing column for existing rows | No | Same as reference data, plus Idempotent Re-run Safety (a retried backfill must not double-apply) |
| **Migration** | A schema change (DDL) plus the data movement it requires | Yes | SA Agent's Data Migration Safety (expand/contract sequencing) — Data Agent authors the DML that runs *after* SA's migration is in place, never the migration file itself (existing Boundary vs SA Agent's Data Migration Safety rule) |
| **Destructive** | Deletes, drops, or any operation without a full-fidelity rollback | N/A (orthogonal — a destructive op can accompany any of the above) | Mandatory Human approval; mandatory Security Reviewer if it also touches PII (existing PII Routing rule: "not just record it in the plan's Risk section... trigger that review, not skip it") |

A change can combine subtypes (e.g. a migration that also deletes a
deprecated column — both `migration` and `destructive` apply). The contract
below treats `data_change_kind` as a set, not a single enum value.

## Required evidence fields (from existing Data Agent role rules)

- `contains_pii` (boolean) — PII Routing: true forces `security-review` regardless of subtype or risk tier.
- `transaction_wrapped`, `idempotent_upsert_used`, `expected_row_count_delta` — Non-Destructive Mechanics, required for reference-data and backfill.
- `sa_migration_plan_ref` — required for `migration`; Data Agent's DML references SA's already-approved migration, never authors it.
- `rollback_sql` and `rollback_idempotency_confirmed` — Idempotent Re-run Safety applies to rollback scripts too, not only forward scripts.
- `human_approval_evidence` — mandatory whenever `destructive` is in `data_change_kind`, independent of PII.

## Proposed states and transitions

```
workflow_id: data-change
contract_version: 1
max_rework_attempts: 1
states: [intake, classifying, schema-design, data-review, security-review, human-approval, executing, validating, rework, blocked, complete]

transitions:
  - { from: intake, to: classifying, requires: [data_owner, change_description, contains_pii] }
  - { from: intake, to: blocked, requires: [stop_reason] }

  - { from: classifying, to: schema-design, requires: [data_change_kind], when: { data_change_kind_includes: migration } }
  - { from: classifying, to: data-review, requires: [data_change_kind, non_destructive_evidence], when: { data_change_kind_excludes: migration } }
  - { from: classifying, to: blocked, requires: [stop_reason] }
  # Escalation Guard exit: classification reveals new business rules/schema change beyond data itself
  - from: classifying
    to: blocked
    requires: [escalation_reason]
    terminal_requirements:
      state: blocked
      stop_reason: requires_code_change
      next_route: orchestrator-or-sa

  - { from: schema-design, to: data-review, requires: [sa_migration_plan_ref, rollback_sql] }
  - { from: schema-design, to: blocked, requires: [stop_reason] }

  - { from: data-review, to: security-review, requires: [data_owner_approval], when: { contains_pii: true } }
  - { from: data-review, to: human-approval, requires: [data_owner_approval], when: { contains_pii: false, data_change_kind_includes: destructive } }
  - { from: data-review, to: executing, requires: [data_owner_approval, transaction_wrapped, idempotent_upsert_used], when: { contains_pii: false, data_change_kind_excludes: destructive } }
  - { from: data-review, to: blocked, requires: [stop_reason] }

  - { from: security-review, to: human-approval, requires: [security_approval], when: { data_change_kind_includes: destructive } }
  - { from: security-review, to: executing, requires: [security_approval, transaction_wrapped, idempotent_upsert_used], when: { data_change_kind_excludes: destructive } }
  - { from: security-review, to: blocked, requires: [stop_reason] }

  - { from: human-approval, to: executing, requires: [human_approval_evidence, transaction_wrapped] }
  - { from: human-approval, to: blocked, requires: [stop_reason] }

  - { from: executing, to: validating, requires: [expected_row_count_delta, execution_evidence] }

  - { from: validating, to: complete, requires: [actual_row_count_delta, validation_result] }
  - { from: validating, to: rework, requires: [validation_failed, rollback_route] }
  - from: validating
    to: blocked
    requires: [validation_failed, human_review_required]
    terminal_requirements:
      rework_count: 1
      state: blocked
      stop_reason: human_review_required
      next_route: human-reviewer
      evidence: { human_review_required: true }

  - { from: rework, to: executing, requires: [rollback_sql, rollback_idempotency_confirmed, rework_route] }
```

`data_change_kind_includes`/`data_change_kind_excludes` extend the `when`
clause proposed in the companion Config Change design (Issue #120,
ADR-0014) to a set-membership test, since `data_change_kind` is a set here
rather than Config's single `risk_tier` enum. Both extensions should be
designed together in the same `scripts/validate-contracts.mjs` change,
not independently, to avoid two slightly different conditional-branching
mechanisms in one validator.

## Rollback is per-subtype, not universal

- Reference data / backfill: rollback is a reverse idempotent upsert (`rollback_sql`), re-entering `executing` from `rework`.
- Migration: rollback is SA's expand/contract sequencing (referenced via `sa_migration_plan_ref`, not re-derived here) — this contract does not own migration rollback design, only the DML rollback that runs within it.
- Destructive: rollback may not exist (a `DROP` has no automatic reverse); when it doesn't, `rollback_sql` must explicitly record `NONE — irreversible` rather than being silently omitted, so `validating`'s failure path has an honest answer instead of a false promise.

## Acceptance Criteria mapping

| AC (from the v3 Issue #116 spec) | Where this document satisfies it |
|---|---|
| AC-1: classification (reference-data vs schema vs migration vs destructive) | Classification table above |
| AC-2: workflow design per subtype | State/transition design with `when` branching |
| AC-3: rollback/validation semantics per subtype | Rollback section above; `expected_row_count_delta`/`actual_row_count_delta` validation pair |
| AC-4: BA/Data Agent approves classification | Pending — this document is the artifact for that approval |
| AC-5: SA Agent approves design | Pending — the shared `when`-clause validator extension (with #120) needs SA sign-off before implementation |

## What happens next

1. BA/Data Agent and SA Agent review this document (or Boss reviews
   directly, per the pattern used for Issues #119 and #120).
2. On approval, implementation creates `docs/contracts/data-change-workflow.yaml`,
   `docs/contracts/schemas/data-change-state.schema.json`, pass/blocked
   examples, and the shared `when`-clause validator extension (designed
   jointly with #120, implemented once) — with TDD regression tests, per
   Developer -> QA route.

No contract YAML, schema, or validator code is included in this document or
its accompanying PR.
