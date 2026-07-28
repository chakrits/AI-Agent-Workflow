# Design: Config Change Workflow Contract (Issue #120)

**Date:** 2026-07-28
**Author:** BA/Config Agent (session), SA Agent (session)
**Status:** Accepted — Boss approved 2026-07-28; implemented in `docs/contracts/config-change-workflow.yaml`
**Issue:** #120 (child of #116)

## Why this exists

Contract coverage today is 2/12 (Bug Fix, New Feature). The Issue #116 review
found that copying `new-feature-workflow.yaml`'s shape for Config Change
would misrepresent it: Config changes have a different risk profile,
different approvers, and a real Developer-skip path that New Feature does
not have. This document designs Config Change from its own semantics,
grounded in the Config Agent role rules already defined in
`docs/workflow/role-definitions.md` rather than inventing new policy.

## Not a copy of New Feature

New Feature always routes through Developer and always has a single
approval gate before implementation. Config Change is different in two
structural ways this contract must encode:

1. **Two risk tiers, two approval depths.** A feature-flag toggle
   (low-risk) needs only the config owner's sign-off. A runtime parameter
   that changes system behavior, cost, or performance (medium-risk) needs
   SA Agent review in addition — because it can have architecture-level
   consequences a config owner alone isn't positioned to catch.
2. **No Developer state at all**, per the Config Agent role definition:
   "Exists so a code-free config change can skip PM and Developer Agent
   entirely... a lightweight path, not a lower-quality one." If
   implementing turns out to need actual code (the Escalation Guard case),
   that is not a state within this contract — it is an exit to the New
   Feature or Bug Fix contract via `blocked`.

## Required evidence fields (from existing Config Agent role rules)

These aren't new invented fields — they encode rules already written in
`docs/workflow/role-definitions.md`'s Config Agent section, made
machine-checkable:

- `restart_required` (boolean) — Restart-Required vs Hot-Reloadable. Determines the real effective date; a config plan that assumes hot-reload for a restart-required value is wrong regardless of approval.
- `removal_condition` (string, required only when `config_kind: feature_flag`) — Feature Flag Lifecycle: every flag needs an owner and a removal condition, or it isn't ready to ship.
- `rollback_plan` (string) — Config rollback, referenced by Release Agent's Triple Rollback Confirmation.
- `risk_tier` (`low` | `medium`) — drives which approval path applies.

## Proposed states and transitions

```
workflow_id: config-change
contract_version: 1
max_rework_attempts: 1
states: [intake, classifying, owner-review, sa-review, rollout, monitoring, rework, blocked, complete]

transitions:
  - { from: intake, to: classifying, requires: [config_owner, change_description, restart_required] }
  - { from: intake, to: blocked, requires: [stop_reason] }

  - { from: classifying, to: owner-review, requires: [risk_tier, rollback_plan] }
  # removal_condition is required by the schema only when config_kind == feature_flag
  - { from: classifying, to: blocked, requires: [stop_reason] }
  # Escalation Guard exit: classification reveals a real code change is needed
  - from: classifying
    to: blocked
    requires: [escalation_reason]
    terminal_requirements:
      state: blocked
      stop_reason: requires_code_change
      next_route: orchestrator-or-sa

  - { from: owner-review, to: rollout, requires: [owner_approval], when: { risk_tier: low } }
  - { from: owner-review, to: sa-review, requires: [owner_approval], when: { risk_tier: medium } }
  - { from: owner-review, to: blocked, requires: [stop_reason] }

  - { from: sa-review, to: rollout, requires: [sa_approval, staged_rollout_plan] }
  - { from: sa-review, to: blocked, requires: [stop_reason] }

  - { from: rollout, to: monitoring, requires: [rollout_evidence] }

  - { from: monitoring, to: complete, requires: [monitoring_result] }
  - { from: monitoring, to: rework, requires: [regression_detected, rollback_route] }
  - from: monitoring
    to: blocked
    requires: [regression_detected, human_review_required]
    terminal_requirements:
      rework_count: 1
      state: blocked
      stop_reason: human_review_required
      next_route: human-reviewer
      evidence: { human_review_required: true }

  - { from: rework, to: rollout, requires: [rollback_evidence, rework_route] }
```

`when: { risk_tier: ... }` is new syntax relative to `bug-fix-workflow.yaml`/
`new-feature-workflow.yaml` (neither has risk-conditional branching from a
single state). `scripts/validate-contracts.mjs` needs a small extension to
accept an optional `when` clause on a transition and, when present, require
the transition's own `requires` list plus the discriminant field to already
carry the matching value in the task-state instance. This is scoped to
"branch on a field's value," not general conditional logic.

## Rollback

Config rollback is a single-step revert to the previous value (`rework ->
rollout` re-enters with `rollback_evidence`), not a multi-stage migration —
this deliberately does not borrow Data Change's expand/contract rollback
shape (see the companion Issue #121 design), because a config value has no
schema-compatibility window to manage.

## Acceptance Criteria mapping

| AC (from the v3 Issue #116 spec) | Where this document satisfies it |
|---|---|
| AC-1: ADR documents Config Change workflow design | `DECISIONS.md` ADR-0014 (companion to this document) |
| AC-2: distinguishes low-risk vs medium-risk | Two-tier `risk_tier` branch at `owner-review` |
| AC-3: rollback/rollout semantics | `rollback_plan` field; `rework -> rollout` path; Triple Rollback Confirmation cross-reference |
| AC-4: BA/Config Agent approves design | Pending — this document is the artifact for that approval |
| AC-5: SA Agent approves design | Pending — `when`-clause validator extension needs SA sign-off before implementation |

## What happens next

1. BA/Config Agent and SA Agent review this document (or Boss reviews
   directly, per the same pattern used for Issue #119).
2. On approval, implementation creates `docs/contracts/config-change-workflow.yaml`,
   `docs/contracts/schemas/config-change-state.schema.json`, pass/blocked
   examples, and the `when`-clause validator extension — with TDD regression
   tests, per Developer -> QA route.

No contract YAML, schema, or validator code is included in this document or
its accompanying PR.
