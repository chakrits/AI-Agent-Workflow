# Phase 1 — Stabilize Core: Contract-First Bug-Fix Workflow Design

## Status

Approved for implementation planning on 2026-07-13.

## Goal

Make the Bug Fix workflow machine-checkable before building an autonomous loop. Every Bug Fix task must have a valid persisted state, evidence before rework, and a human-review stop after two rework cycles.

## Confirmed Decisions

| Topic | Decision |
|---|---|
| Canonical authoring format | YAML |
| Validation contract | JSON Schema validates the YAML documents after YAML-to-JSON parsing |
| Reference workflow | Bug Fix |
| Loop limit | At most two `verifying -> rework` transitions after the initial implementation attempt |
| Exhausted-loop behavior | Route to `blocked` with `human_review_required` rather than retrying again |
| Phase boundary | Define and validate workflow contracts; do not build an autonomous orchestrator or runtime loop |

The loop limit permits three implementation attempts in total: the initial attempt plus two rework attempts. This replaces ambiguous wording such as "more than 3 fix attempts" with an explicit transition budget.

## Scope

### In scope

- A canonical Bug Fix workflow policy in YAML.
- A JSON Schema for a task-state instance.
- Example task-state fixtures for pass, first rework, and exhausted retry budget.
- A documented local and CI validation command.
- A single vocabulary for state, transition, evidence, retry, stop reason, and handoff across the operating model, workflow, templates, and platform adapters.
- A parity check that platform adapters point to canonical policy instead of redefining it.

### Out of scope

- An autonomous orchestrator, scheduler, queue, database, or model-specific runtime.
- Automatic code modification, autonomous release, or autonomous human-approval bypass.
- Contract coverage for workflows other than Bug Fix.
- Changing the role ownership, security gates, or human approval rules already defined in `AGENTS.md`.

## Architecture

```text
Bug report
  -> intake
  -> investigating
  -> implementing
  -> verifying -- pass --> handoff
                  |
                  +-- fail and rework_count < 2 --> rework -> implementing
                  |
                  +-- fail and rework_count = 2 --> blocked (human review required)
```

The policy specifies which transitions are permitted. A task-state instance records the current state, the transition history, the evidence attached to each meaningful decision, and the retry budget. The schema validates the instance shape; a lightweight policy validator validates transition legality and retry limits. The implementation plan must choose the validator command from the repository's available toolchain without adding a model runtime.

## Proposed Contract Layout

```text
docs/contracts/
  bug-fix-workflow.yaml
  schemas/
    task-state.schema.json
  examples/
    bug-fix-pass.yaml
    bug-fix-first-rework.yaml
    bug-fix-human-review.yaml
```

The YAML policy is the source of truth. The JSON Schema is a validation artifact, not a second policy source. Platform adapters may link to or invoke the canonical policy, but must not maintain divergent copies.

## Task-State Contract

Every task-state instance will include:

| Field | Purpose |
|---|---|
| `task_id` | Stable work-item identifier |
| `workflow_id` and `contract_version` | Bind the instance to its policy version |
| `change_type` and `risk_level` | Preserve routing context |
| `state` | Current lifecycle state |
| `rework_count` and `max_rework_attempts` | Enforce the loop budget |
| `history` | Append-only transition log with timestamp, actor, decision, and evidence references |
| `evidence` | Repro, fail path, implementation, verification, or escalation evidence |
| `next_route` and `stop_reason` | Make ownership and terminal decisions explicit |

Required evidence is state-dependent:

| Transition | Required evidence |
|---|---|
| `intake -> investigating` | Failure description and reproducible command or documented reason that repro is unavailable |
| `investigating -> implementing` | Fail-path trace and accepted/rejected hypothesis record |
| `implementing -> verifying` | Changed-files summary and validation plan |
| `verifying -> handoff` | Original repro result and verification result |
| `verifying -> rework` | Failed verification evidence and a concrete rework route |
| `verifying -> blocked` | Failed verification evidence, `rework_count: 2`, and `human_review_required` |

## Quality Rules

- Invalid YAML, invalid schema instances, illegal transitions, or mismatched retry counts fail validation.
- An agent cannot enter `implementing` without debugging evidence.
- An agent cannot enter `handoff` without verification evidence.
- A third rework transition is invalid; the only valid route after two reworks is `blocked` for human review.
- Security-sensitive Bug Fix tasks retain the existing Security Reviewer route and cannot bypass its gate.

## Acceptance Criteria

1. The canonical YAML policy declares all Bug Fix states, transitions, evidence requirements, and the two-rework limit.
2. The JSON Schema rejects malformed task-state files and requires the routing/audit fields above.
3. The policy validator rejects an illegal transition and a third rework transition.
4. The three example fixtures demonstrate: verified handoff, permitted first rework, and mandatory human-review blocking.
5. `AGENTS.md`, the operating model, Bug Fix workflows, quality gates, handoff template, and skill catalog use the same retry/stop terminology.
6. Adapter checks show `.agents/`, `.claude/`, and `.agent/` do not contain a conflicting Bug Fix policy.
7. A documented validation command is suitable for local use and CI.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Schema validates shape but not workflow semantics | Add a separate policy-validation check and fixtures for illegal transitions |
| Adapter copies drift from canonical docs | Keep policy only under `docs/contracts/`; adapters link or invoke it |
| Retry limit blocks legitimate complex fixes | The blocked state escalates to a human who can start a new approved work item or amend policy intentionally |
| Existing documents contain conflicting retry wording | Update them together in the same Phase 1 change and verify with a terminology scan |

## Verification Strategy

- Validate all example YAML files against the JSON Schema.
- Run policy checks against the three valid fixtures and deliberately invalid fixtures for an illegal transition and exhausted retry budget.
- Scan canonical docs and adapters for deprecated retry wording or duplicated Bug Fix state policy.
- Review the resulting handoff template against `docs/workflow/handoff-contract.md`.

## Handoff

| Field | Value |
|---|---|
| From | Orchestrator / Documentation Agent |
| To | Human reviewer, then SA / Implementation Planning Agent |
| Work item | PHASE1-STABILIZE-CORE-2026-07-13 |
| Change type | Process architecture and documentation |
| Risk | Medium |
| Approval gate | Design approved by human; implementation plan still requires review before execution |
| Next step | Review this spec, then create the implementation plan |
