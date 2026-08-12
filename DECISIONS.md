# DECISIONS.md

## Decision Log

### ADR-0014: Add a task-execution layer without changing lifecycle orchestration

- Date: 2026-08-12
- Work Item: [Issue #166](https://github.com/chakrits/AI-Agent-Workflow/issues/166)
- Status: Accepted for specification; implementation remains subject to specification approval.

#### Context

Packet v1 is intentionally concise, while the terminal `HANDOFF.md` contract is intentionally
complete. Multi-task work needs a bounded artifact between those two forms so that an
implementer receives task-specific context and an independent reviewer can inspect a pinned
diff without turning every subtask into a lifecycle transition. The current Codex adapter has
only bounded, in-turn parent-owned supervision; it cannot promise durable continuation after a
parent turn ends.

#### Decision

Define an optional task-execution layer with Task Brief, Implementer Report, Task Review, and
scoped Re-review artifacts. It is an execution mode used by existing roles, not a new canonical
agent role. A full lifecycle handoff remains mandatory at an owner or phase transition.

The layer uses `task_review_rework_count`, with a maximum of two task-review fix rounds, and
does not change any lifecycle `rework_count`, `max_rework_attempts`, Bug Fix retry budget, or
New Feature contract. Task review is risk-triggered, not a universal gate.

Platform/model selection is deliberately not prescribed. Hosts may select capabilities under
their own policy; repository policy does not hard-code provider or model identifiers.

Codex remains documented as bounded-native only. Durable asynchronous orchestration and
cross-turn resumption are deferred to the separately approved control-plane design work
(Issue #35), not simulated through heartbeat or polling.

#### Consequences

- The future implementation must add only compact canonical pointers and keep the measured
  canonical context set within its current 30,000-token target.
- QA remains the exact independent-verification role; task review/re-review are QA modes, not
  a `Reviewer / QA Agent` hybrid role.
- The pre-existing Handoff Rule 7 versus New Feature lifecycle retry discrepancy is not decided
  or changed by this ADR.
- This ADR records an independent conceptual adaptation of Superpowers material; the attribution
  and MIT notice are added to `THIRD_PARTY_NOTICES.md`.

### Decision note: durable-vs-clearable reference boundary (Issue #169)

- Date: 2026-08-12
- Work Item: [Issue #169](https://github.com/chakrits/AI-Agent-Workflow/issues/169)
- Status: Accepted.

#### Decision

A forward-facing file (canonical rule, contract, workflow, mirrored skill, or top-level project
state) must not depend, for the meaning of any normative statement, on a document inside
`CLEARED_DIRECTORIES` (`scripts/reset-to-template.mjs`). Historical records under `docs/records/`
are excluded by rationale: they document what was true at the time and may reference a document a
later reset cleared. `scripts/validate-clearable-refs.mjs` (diff-scoped, meaning-aware) enforces
the boundary as a required merge gate; it flags only references that make the reader consult a
cleared document's content, not directory mentions or instruction/location references. This is a
decision note, not a full ADR, because it clarifies an existing boundary rather than setting new
architecture.
