# Optional Task-Execution Mode

Canonical, permanent definition of the optional task-execution mode referenced by
[`docs/workflow/dynamic-routing.md`](dynamic-routing.md). This document is normative and
self-contained: it does not depend on any record under `docs/records/`.

Work item provenance: [Issue #166](https://github.com/chakrits/AI-Agent-Workflow/issues/166),
`DECISIONS.md` ADR-0014.

## Purpose and Boundaries

The mode reduces a child agent's context to its own task evidence while preserving independent
review and every existing lifecycle control. It does not replace Packet v1, `HANDOFF.md`,
dynamic routing, QA, security routing, lifecycle labels, human gates, or the Bug Fix and New
Feature state contracts. It creates no canonical Task Reviewer role: task review is a QA mode.

## Entry and Exit Criteria

Use the mode only when an approved implementation plan has two or more dependent tasks, or one
Medium/High-risk task that changes production decision logic, an integration or shared contract,
or security/data behavior. It is optional for Low-risk documentation or mechanical work and must
not be applied as universal process ceremony.

Before each task dispatch the parent records: task ID; immutable `base_sha`; intended write set;
dependencies; AC/source references; verify commands; required reviewer mode; and an addressable
Human decision status. Any unresolved source conflict, overlapping write set, or missing Human
decision that changes scope stops the task and routes to the Human Maintainer.

The mode ends at the task's review result. A change of owner or lifecycle phase then uses the
full `HANDOFF.md` contract; a task report never substitutes for it.

## Artifact Contracts

| Artifact | Producer | Minimum content | Not a substitute for |
|---|---|---|---|
| [Task Brief](../templates/TASK_BRIEF.md) | Orchestrator / plan owner | task ID, objective, `base_sha`, allowed files/write set, dependencies, source/AC pointers, verification, stop condition | Packet v1 or a lifecycle handoff |
| [Implementer Report](../templates/IMPLEMENTER_REPORT.md) | Developer / Documentation Agent | `base_sha`, `head_sha`, changed paths, commands/results, known limits, task status | Independent verification |
| [Task Review](../templates/TASK_REVIEW.md) | QA Agent in task-review mode | pinned range, AC/spec verdict, quality verdict, evidence, findings | QA lifecycle acceptance evidence when that gate applies |
| [Scoped Re-review](../templates/TASK_REVIEW_REREVIEW.md) | QA Agent in re-review mode | prior finding IDs, fix range, each finding's disposition, fix-caused regression only, parked observations | a fresh broad review or lifecycle handoff |

Task Review carries two independent verdicts:

- `spec_verdict`: `PASS`, `FAIL`, or `CANNOT_VERIFY`
- `quality_verdict`: `APPROVED` or `NEEDS_FIX`

`CANNOT_VERIFY` identifies missing evidence; it must not silently expand the task scope.

## Pinned Diffs and Bounded Review Loop

Each review pins `base_sha` and `head_sha`; `HEAD~1` is never a substitute for a multi-commit
range. A re-review receives only the prior findings and the corresponding fix diff. It may raise
a new finding only when the fix caused the regression; other observations are recorded as
out-of-scope with an owner and next action.

`task_review_rework_count` starts at zero for each task and increments once after a review that
needs a fix. At two task-review fix rounds, the next unresolved review result stops for the Human
Maintainer. This counter is separate from the work item's lifecycle `rework_count`, and no file
under `docs/contracts/` changes because of this mode.

## State Glossary: Runtime Dispatch Control versus Durable Receipt Ledger

Two state namespaces exist and must never be conflated.

| Namespace | Where defined | States | Meaning |
|---|---|---|---|
| Parent runtime dispatch control | [`handoff-contract.md`](handoff-contract.md), [`dynamic-routing.md`](dynamic-routing.md) | `dispatched`, `acknowledged`, `blocked`, `timed_out`, `cancelled` | In-turn control state of one parent-to-child dispatch |
| Durable receipt ledger | `docs/contracts/schemas/dispatch-receipt.schema.json` | `registered`, `consumed`, `expired`, `cancelled` | Persisted bookkeeping state of a receipt record |

Both negative semantics are binding:

- **Acknowledgement is not completion.** `acknowledged` means the child received the dispatch. It
  is not evidence that the work finished, passed review, or met an acceptance criterion. When no
  callback exists, report `acknowledgement pending`.
- **Receipt consumption is not proof of execution.** `consumed` means the parent read the receipt
  exactly once. It is not runtime-attested and does not prove a named agent executed the work.

Only a terminal result with its own evidence closes a task; neither namespace substitutes for QA
acceptance or a human gate.

## Supervision

Supervision is in-turn only, per `docs/workflow/handoff-contract.md` and the host adapter policy.
If a required dispatch cannot complete in-turn, record `host_completion_unavailable` and stop in
that turn. Cross-turn or event-driven parent resumption is deferred to GitHub Issue #35.

## Terminal Dispatch and Boss Visibility

Relocated from `docs/workflow/role-definitions.md` (Orchestrator Agent section) —
[Issue #212](https://github.com/chakrits/AI-Agent-Workflow/issues/212), `DECISIONS.md` ADR-0021 —
to recover canonical `role-definitions.md` context-budget headroom. `role-definitions.md` keeps a
short pointer to this section; this is the normative text.

When an agent produces a terminal handoff, the Orchestrator must record exactly one outcome in the same active Orchestrator turn: `Dispatch`, `Human review`, or `Blocked`. `Dispatch` requires a named non-human target plus a receipt containing the source/target, supplied evidence, and dispatch result. The Orchestrator must not treat a prose-only next-agent recommendation as a completed route.

The dispatch receipt uses `pending`, `dispatched`, `acknowledged`, `awaiting_terminal`, `completed`, `cancelled`, `timed_out`, or `blocked`. `dispatched` only proves a recorded attempt; an `acknowledged` state requires target-agent or runtime evidence. If the platform cannot provide callback evidence, report `acknowledgement pending` honestly.

Every terminal outcome creates a Boss-visible event with the completed work and quality-gate result, next action/owner, receipt state/evidence, and any blocker or decision need. `Human review` is a stop: record `Dispatch State: blocked` with `Stop Reason: human_review_required`, prepare context for Boss, and do not bypass the human gate. Dispatch-control states are not lifecycle labels and do not replace phase/status evidence.

Supervision is in-turn only: for every dispatch, the parent Orchestrator invokes the target child and awaits its terminal receipt within the same active Orchestrator turn, for the whole dispatch chain, and does not end or yield while a child is outstanding. The receipt records `Handoff Event ID`, `Parent Orchestrator ID`, `Child Task ID`, and `Completion Event Evidence`. Once the in-turn wait delivers a `Terminal Result ID`, the parent consumes `(Handoff Event ID, Terminal Result ID)` exactly once, emits one Boss event, and records the permitted route or stop in `Consumption Evidence` before ending its turn. The completion primitive has no authority to make a workflow decision. No host capability in this contract retains and resumes a parent after it ends or yields; if a required dispatch cannot complete in-turn, the Orchestrator must record `Dispatch State: blocked`, `Stop Reason: host_completion_unavailable`, and a Boss event in the current turn rather than end or yield on a claimed future continuation. Deadline expiry and explicit cancellation during an active in-turn wait record `timed_out` or `cancelled` as evidence-backed terminal outcomes. Cross-turn or event-driven orchestration that resumes a parent after it has ended its turn is deferred to a separately approved durable control-plane design (GitHub Issue #35). A heartbeat is an operator-invoked emergency diagnostic only, never the happy path, and cannot route work or serve as acceptance evidence.
