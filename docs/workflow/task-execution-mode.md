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
