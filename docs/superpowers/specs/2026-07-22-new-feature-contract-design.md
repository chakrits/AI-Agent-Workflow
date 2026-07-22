# New Feature Workflow Contract Design

**Date:** 2026-07-22
**Status:** Draft
**Work item:** Issue #59 (Phase A)
**Owner:** SA Agent

## Goal

Define the contract state machine for the New Feature workflow — states, transitions, required evidence per transition, rework budget, and JSON Schema — following the Bug Fix contract (`docs/contracts/bug-fix-workflow.yaml`) as the established pattern, and aligned with the New Feature lifecycle labels in `docs/workflow/dynamic-routing.md`.

## Scope

In scope:

- A new contract YAML (`docs/contracts/new-feature-workflow.yaml`) with states, transitions, and rework policy.
- A new JSON Schema (`docs/contracts/schemas/new-feature-state.schema.json`) for the New Feature contract, extending the existing `task-state.schema.json` pattern.
- Integration with existing lifecycle labels (`phase:requirements`, `phase:design`, `phase:planning`, `phase:development`, `phase:verification`, `phase:human-review`, `phase:blocked`) and evidence milestones (`status:spec-ready`, `status:development-done`, `status:verification-done`).
- Rework policy: backward routes from verifying or human-review to discovery, designing, planning, or implementing.
- Terminal stop condition when rework budget is exhausted.

Out of scope:

- Modifying the existing Bug Fix contract (`docs/contracts/bug-fix-workflow.yaml`) or its schema.
- Creating or modifying skill files.
- Writing the contract YAML or schema files themselves (Phase B).
- The separate Enhancement workflow contract (future phase).

## Research Input

### Existing Bug Fix Contract Pattern

The Bug Fix contract (`docs/contracts/bug-fix-workflow.yaml`) defines:

```yaml
workflow_id: bug-fix
contract_version: 1
max_rework_attempts: 2
states: [intake, investigating, implementing, verifying, rework, handoff, blocked]
transitions:
  - { from: intake, to: investigating, requires: [failure_description, repro] }
  - { from: investigating, to: implementing, requires: [fail_path, hypothesis_matrix] }
  - { from: investigating, to: blocked, requires: [stop_reason] }
  - { from: implementing, to: verifying, requires: [changed_files, validation_plan] }
  - { from: verifying, to: handoff, requires: [original_repro_result, verification_result] }
  - { from: verifying, to: rework, requires: [verification_failed, rework_route] }
  - from: verifying
    to: blocked
    requires: [verification_failed, human_review_required]
    terminal_requirements:
      rework_count: 2
      state: blocked
      stop_reason: human_review_required
      next_route: human-reviewer
      evidence:
        human_review_required: true
  - { from: rework, to: implementing, requires: [rework_route] }
```

Key design elements to carry forward:
- Flat list of `states` with enum validation.
- Transitions as `from` / `to` / `requires` tuples.
- Terminal transition with `terminal_requirements` block for exhausted rework budget.
- `max_rework_attempts` at the contract level.

### New Feature Lifecycle Labels (dynamic-routing.md)

| Category | Labels |
|---|---|
| Current phase | `phase:requirements`, `phase:design`, `phase:planning`, `phase:development`, `phase:verification`, `phase:human-review`, `phase:blocked` |
| Evidence milestone | `status:spec-ready`, `status:development-done`, `status:verification-done` |

Standard path (design-required): `phase:requirements -> phase:design -> phase:planning -> status:spec-ready -> phase:development -> phase:verification -> phase:human-review`
Low-risk path: `phase:requirements -> status:spec-ready -> phase:development -> phase:verification -> phase:human-review`
Rework: `phase:verification or phase:human-review -> phase:development | phase:design | phase:requirements | phase:blocked`

### Quality Gates (quality-gates.md)

Related gates for New Feature:
- **PM -> BA Gate:** Business problem clear, target users clear, success metrics clear, scope explicit, priority defined.
- **BA -> SA Gate:** User stories exist, acceptance criteria exist, business rules explicit, happy/exception paths documented, open questions listed.
- **SA -> Dev Gate:** Architecture/design clear, API contract clear, data impact clear, error model defined, security constraints documented, testability considered.
- **Specification Readiness Gate:** Exactly one current `phase:` label, `status:spec-ready` before implementation begins.
- **Dev -> QA Gate:** Build passes, unit tests pass, lint passes, changed files listed, known limitations documented.
- **QA -> Release Gate:** Acceptance criteria coverage documented, critical path tests passed, regression scope documented, release recommendation clear.

### Existing Task State Schema (task-state.schema.json)

The Bug Fix schema validates: `task_id`, `workflow_id`, `contract_version`, `change_type`, `risk_level`, `state`, `rework_count`, `max_rework_attempts`, `history` (array of transitions with evidence refs), `evidence`, `next_route`, `stop_reason`.

## Proposed State Machine

### States

| State | Corresponding Phase Label | Description |
|---|---|---|
| `intake` | _(pre-phase)_ | Change classified, risk assessed, workflow selected. |
| `discovery` | `phase:requirements` | BA/PM elicits requirements, user stories, acceptance criteria, business rules. |
| `designing` | `phase:design` | SA produces architecture design, API contracts, data model, ADRs. |
| `planning` | `phase:planning` | SA reviews spec readiness; lightweight spec or SDD approved before dev. |
| `implementing` | `phase:development` | Developer codes against approved spec. |
| `verifying` | `phase:verification` | QA verifies against acceptance criteria. |
| `rework` | _(transitional)_ | Work routes backward to fix gaps. |
| `human-review` | `phase:human-review` | Human approval gate before merge/release. |
| `blocked` | `phase:blocked` | Stop state; cannot proceed without human intervention. |
| `release` | _(post-phase)_ | Feature deployed; closeout initiated. |

### Transitions

```mermaid
stateDiagram-v2
    [*] --> intake
    intake --> discovery : classify & assign
    intake --> blocked : cannot classify

    discovery --> designing : requirements clear
    discovery --> blocked : infeasible / stopped

    designing --> planning : SDD + contract ready
    designing --> blocked : design stopped

    planning --> implementing : spec-ready approved
    planning --> designing : spec gap → redesign
    planning --> blocked : spec stopped

    implementing --> verifying : dev-done
    implementing --> blocked : dev stopped

    verifying --> human-review : QA pass
    verifying --> rework : QA fail → rework
    verifying --> blocked : rework exhausted → human required

    rework --> discovery : requirement gap
    rework --> designing : design gap
    rework --> planning : plan update needed
    rework --> implementing : implementation fix

    human-review --> release : approved
    human-review --> rework : review failed → revise
    human-review --> blocked : rejected / stopped

    release --> [*]
```

### Transition Table

| # | From | To | Required Evidence |
|---|---|---|---|
| T1 | `intake` | `discovery` | `change_type`, `risk_level`, `initial_scope` |
| T2 | `intake` | `blocked` | `stop_reason` |
| T3 | `discovery` | `designing` | `user_stories`, `acceptance_criteria`, `business_rules`, `pm_ba_gate_result` |
| T4 | `discovery` | `blocked` | `stop_reason` |
| T5 | `designing` | `planning` | `sdd_reference`, `api_contract`, `data_impact`, `ba_sa_gate_result` |
| T6 | `designing` | `blocked` | `stop_reason` |
| T7 | `planning` | `implementing` | `spec_readiness_checklist`, `implementation_plan`, `sa_dev_gate_result` |
| T8 | `planning` | `designing` | `spec_gap`, `redesign_scope` |
| T9 | `planning` | `blocked` | `stop_reason` |
| T10 | `implementing` | `verifying` | `changed_files`, `test_evidence`, `dev_qa_gate_result` |
| T11 | `implementing` | `blocked` | `stop_reason` |
| T12 | `verifying` | `human-review` | `verification_result`, `acceptance_traceability`, `qa_release_gate_result` |
| T13 | `verifying` | `rework` | `verification_failed`, `rework_route` |
| T14 | `verifying` | `blocked` | `verification_failed`, `human_review_required` _(terminal, see rework budget)_ |
| T15 | `rework` | `discovery` | `rework_scope`, `requirement_gap` |
| T16 | `rework` | `designing` | `rework_scope`, `design_gap` |
| T17 | `rework` | `planning` | `rework_scope`, `plan_update` |
| T18 | `rework` | `implementing` | `rework_route` |
| T19 | `human-review` | `release` | `approval_evidence`, `release_plan` |
| T20 | `human-review` | `rework` | `review_failed`, `rework_route` |
| T21 | `human-review` | `blocked` | `stop_reason` |
| T22 | `release` | _terminal_ | `release_evidence`, `closeout_ref` |

### Rework Budget

**Issue #59 proposes:** 1 rework attempt limit.

**Analysis:**
- The Bug Fix contract permits 2 rework attempts for a simpler 5-state workflow (intake → investigating → implementing → verifying → handoff, with rework looping back to implementing only).
- The New Feature workflow has 10 states with rework able to route backward to 4 different states (discovery, designing, planning, implementing) — each backward route represents a different kind of gap. A single attempt means the feature gets exactly one cycle of QA feedback + fix before the second failure triggers a human-review block.
- For a design-required feature, the rework path can be expensive (redesign, replanning, reimplementation). Limiting to 1 rework encourages high-quality handoffs at every gate.

**Recommendation:** **Confirm 1 rework attempt** as the starting limit. This is consistent with the Bug Fix contract's conservative stance (Bug Fix has 2 because its transitions are simpler and cheaper) and keeps the New Feature workflow quality-focused. Monitor in practice: if the workflow proves too constrained (e.g., complex features legitimately need a second rework cycle), the limit can be revised to 2 in a future contract version.

**Terminal stop condition** (matches Bug Fix pattern):
- When `rework_count >= max_rework_attempts` and verification fails again → state becomes `blocked` with `stop_reason: human_review_required`.
- The `next_route` is set to `human-reviewer`.

## JSON Schema Structure

A new schema `docs/contracts/schemas/new-feature-state.schema.json` should be created, modelled on `task-state.schema.json` with these differences:

### Properties

| Property | Type | Constraints | Notes |
|---|---|---|---|
| `task_id` | string | minLength 1 | Same as Bug Fix |
| `workflow_id` | string | enum: `["new-feature"]` | Fixed for this contract |
| `contract_version` | integer | minimum 1 | Same as Bug Fix |
| `change_type` | enum | `["new-feature"]` | Fixed for this contract |
| `risk_level` | enum | `["low", "medium", "high", "critical"]` | Same as Bug Fix |
| `state` | enum | `["intake", "discovery", "designing", "planning", "implementing", "verifying", "rework", "human-review", "blocked", "release"]` | New Feature states |
| `rework_count` | integer | minimum 0 | Tracks `verifying → rework` transitions |
| `max_rework_attempts` | integer | const: 1 | Confirmed rework budget |
| `phase_label` | string | enum of lifecycle phase labels | Current phase from dynamic-routing labels |
| `milestone_labels` | array of strings | enum of evidence milestone labels | Additive: `status:spec-ready`, `status:development-done`, `status:verification-done` |
| `history` | array of transition objects | See below | Same structure as Bug Fix |
| `evidence` | object | — | Free-form evidence map |
| `next_route` | string | — | Next agent/role or `human-reviewer` |
| `stop_reason` | string or null | — | Present only when blocked |

### History Entry Schema

Same as Bug Fix:
```json
{
  "from": { "enum": [ "intake", "discovery", "designing", "planning", "implementing", "verifying", "rework", "human-review", "blocked", "release" ] },
  "to": { "enum": [ "intake", "discovery", "designing", "planning", "implementing", "verifying", "rework", "human-review", "blocked", "release" ] },
  "at": { "type": "string", "minLength": 1 },
  "actor": { "type": "string", "minLength": 1 },
  "evidence_refs": { "type": "array", "items": { "type": "string" } }
}
```

## Contract YAML Structure (Design)

The contract YAML will follow the Bug Fix pattern precisely:

```yaml
workflow_id: new-feature
contract_version: 1
max_rework_attempts: 1
states: [intake, discovery, designing, planning, implementing, verifying, rework, human-review, blocked, release]
transitions:
  # Forward path
  - { from: intake, to: discovery, requires: [change_type, risk_level, initial_scope] }
  - { from: intake, to: blocked, requires: [stop_reason] }
  - { from: discovery, to: designing, requires: [user_stories, acceptance_criteria, business_rules, pm_ba_gate_result] }
  - { from: discovery, to: blocked, requires: [stop_reason] }
  - { from: designing, to: planning, requires: [sdd_reference, api_contract, data_impact, ba_sa_gate_result] }
  - { from: designing, to: blocked, requires: [stop_reason] }
  - { from: planning, to: implementing, requires: [spec_readiness_checklist, implementation_plan, sa_dev_gate_result] }
  - { from: planning, to: blocked, requires: [stop_reason] }
  - { from: implementing, to: verifying, requires: [changed_files, test_evidence, dev_qa_gate_result] }
  - { from: implementing, to: blocked, requires: [stop_reason] }
  - { from: verifying, to: human-review, requires: [verification_result, acceptance_traceability, qa_release_gate_result] }
  - { from: verifying, to: rework, requires: [verification_failed, rework_route] }
  - from: verifying
    to: blocked
    requires: [verification_failed, human_review_required]
    terminal_requirements:
      rework_count: 1
      state: blocked
      stop_reason: human_review_required
      next_route: human-reviewer
      evidence:
        human_review_required: true
  # Backward rework routes
  - { from: rework, to: discovery, requires: [rework_scope, requirement_gap] }
  - { from: rework, to: designing, requires: [rework_scope, design_gap] }
  - { from: rework, to: planning, requires: [rework_scope, plan_update] }
  - { from: rework, to: implementing, requires: [rework_route] }
  # Human review paths
  - { from: human-review, to: release, requires: [approval_evidence, release_plan] }
  - { from: human-review, to: rework, requires: [review_failed, rework_route] }
  - { from: human-review, to: blocked, requires: [stop_reason] }
  # Planning backward route (spec gap before implementation starts)
  - { from: planning, to: designing, requires: [spec_gap, redesign_scope] }
```

**Key differences from Bug Fix contract:**
1. More states (10 vs 7) reflecting the richer New Feature lifecycle.
2. `max_rework_attempts: 1` (vs 2 for Bug Fix).
3. Rework routes to 4 possible targets (discovery/designing/planning/implementing) instead of 1 (implementing).
4. Planning → Designing backward route for spec gaps caught before development starts (does not count against rework budget).
5. Human-review → Rework backward route for human reviewer feedback.
6. Release as a terminal state instead of handoff.

## Acceptance Criteria

1. **State coverage:** The contract defines exactly the 10 states listed above — no more, no fewer.
2. **Transition coverage:** Every forward transition has a corresponding `requires` list. Every state (except `release`) has at least one outgoing transition.
3. **Terminal condition:** When `rework_count >= max_rework_attempts` and verification fails, the contract forces transition to `blocked` with `stop_reason: human_review_required` and `next_route: human-reviewer`.
4. **Rework count integrity:** Only `verifying → rework` transitions increment `rework_count`. `human-review → rework` and `planning → designing` backward routes do **not** count against the rework budget.
5. **Schema validation:** The contract YAML is validatable against its JSON Schema, and the schema validates that `change_type` and `workflow_id` are locked to `new-feature`.
6. **Phase label alignment:** Each contract state maps to exactly one lifecycle phase label (from `dynamic-routing.md`).

## Open Questions

1. **Enhancement workflow:** Should Enhancement (a distinct change type per `dynamic-routing.md`) share this contract, or does it need its own? This design assumes Enhancement is a variant of New Feature and can use the same contract with an adjusted `change_type` enum. A separate design can revisit if the Enhancement lifecycle diverges.
2. **Low-risk shortcut path:** The dynamic routing policy defines a low-risk path (`phase:requirements → status:spec-ready → phase:development → phase:verification → phase:human-review`) that skips `phase:design` and `phase:planning`. Should the contract model this as a separate set of transitions (e.g., `discovery → implementing` directly when risk is low and no SDD is needed), or should the contract always require the full path with a `risk_level` gate that permits state skips? **Recommendation:** Model the full path in the contract; use `risk_level` as a gate condition on `discovery` to decide whether `designing` and `planning` can be fast-tracked (skipped with a `skip_reason` evidence entry). This keeps the contract simple while allowing the routing policy to take effect.
3. **Phase B artifact location:** Should `docs/contracts/new-feature-workflow.yaml` and `docs/contracts/schemas/new-feature-state.schema.json` be created in the same PR that implements this design, or as a follow-up? **Recommendation:** Create the YAML and schema in Phase B (single follow-up PR) since the contract and schema are mechanical products of this design.

## Alternatives Considered

### 1. 2 rework attempts (matching Bug Fix)

Rejected because Bug Fix's transitions are cheaper (rework only loops back to implementing). New Feature rework can go to discovery (requirement rework) or designing (design rework) — these are expensive paths that should not be used liberally. 1 rework enforces quality gates.

### 2. Single rework target (rework → implementing only)

Rejected because a New Feature may fail QA due to requirement ambiguity (route to discovery/BA) or design gaps (route to designing/SA), not just implementation bugs. Multiple backward targets match the dynamic routing documentation's stated rework paths.

### 3. Merged Bug Fix + New Feature contract

Rejected because the state sets diverge too much. A single contract with conditionals would be harder to validate, and keeping separate contracts follows the DRY-appropriate pattern already established by the single Bug Fix contract.

## Decision

Proceed with this design as the Phase A SDD. Create `docs/contracts/new-feature-workflow.yaml` and `docs/contracts/schemas/new-feature-state.schema.json` in Phase B once this design is approved. The state machine, rework budget of 1, and terminal stop condition are locked; the open questions about low-risk skipping and Enhancement variants are deferred to the approver.

## Testability Notes

- The contract YAML should have regression tests in `test/validate-contracts.test.mjs` (matching the existing Bug Fix contract test pattern).
- Every transition should be tested: valid evidence → transition succeeds; missing evidence → transition rejected.
- Rework budget exhaustion scenario: verify that after 1 `verifying → rework` cycle, a second verification failure correctly transitions to `blocked` with `stop_reason: human_review_required`.
- Backward route integrity: verify that `human-review → rework` and `planning → designing` do not increment `rework_count`.
- Schema validation: verify that invalid states (e.g., `investigating` from Bug Fix) are rejected.
