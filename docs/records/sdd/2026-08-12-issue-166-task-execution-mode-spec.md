# Issue #166 — Task-Execution Mode Lightweight Specification

## Metadata

| Field | Value |
|---|---|
| Work Item | [Issue #166](https://github.com/chakrits/AI-Agent-Workflow/issues/166) |
| Status | Approved — Human Maintainer evidence: [Issue comment 5263728633](https://github.com/chakrits/AI-Agent-Workflow/issues/166#issuecomment-5263728633) |
| Change type / risk | Framework / Meta / Medium |
| Owner | Orchestrator acting directly under approved `host_completion_unavailable` fallback |
| Decision record | `DECISIONS.md` — ADR-0014 |
| Governing sources | Issue #166 and its approval / QA comments; canonical workflow documents remain authoritative |

## 1. Outcome and boundaries

The future implementation adds an **optional task-execution mode** for a planned, multi-task
change. It reduces child context to the task’s own evidence while preserving independent review
and existing lifecycle controls.

It does not replace Packet v1, `HANDOFF.md`, dynamic routing, QA, security routing, lifecycle
labels, human gates, or existing Bug Fix/New Feature state contracts. It creates no canonical
Task Reviewer role.

## 2. Entry and exit rules

Use the mode only when an approved implementation plan has two or more dependent tasks, or one
Medium/High-risk task that changes production decision logic, an integration/shared contract,
or security/data behavior. It is optional for Low-risk documentation or mechanical work.

Before a task dispatch, the parent records: task ID; immutable `base_sha`; intended write set;
dependencies; AC/source references; verify commands; required reviewer mode; and an addressable
Human decision status. Any unresolved source conflict, overlapping write set, or missing Human
decision that changes scope stops the task and routes to Human.

The mode ends at the task’s review result. A change of owner or lifecycle phase then uses the
existing full `HANDOFF.md` contract; a task report never substitutes for it.

## 3. Artifact contracts

| Artifact | Producer | Minimum content | Not a substitute for |
|---|---|---|---|
| Task Brief | Orchestrator / plan owner | task ID, objective, `base_sha`, allowed files/write set, dependencies, source/AC pointers, verification, stop condition | Packet v1 or a lifecycle handoff |
| Implementer Report | Developer / Documentation Agent | `base_sha`, `head_sha`, changed paths, commands/results, known limits, task status | Independent verification |
| Task Review | QA Agent in task-review mode | pinned range, AC/spec verdict, quality verdict, evidence, findings | QA lifecycle acceptance evidence when that gate applies |
| Scoped Re-review | QA Agent in re-review mode | prior finding IDs, fix range, each finding’s disposition, fix-caused regression only, parked observations | a fresh broad review or lifecycle handoff |

Task Review’s two verdicts are independent:

- `spec_verdict`: `PASS`, `FAIL`, or `CANNOT_VERIFY`
- `quality_verdict`: `APPROVED` or `NEEDS_FIX`

`CANNOT_VERIFY` identifies missing evidence; it must not silently expand the task scope.

## 4. Pinned diffs and bounded review loop

Each review pins `base_sha` and `head_sha`; it does not use `HEAD~1` as a substitute for a
multi-commit range. A re-review receives only the prior findings and the corresponding fix diff.
It may report a new finding only when the fix caused the regression. Other observations are
recorded as out of scope with an owner/next action.

`task_review_rework_count` starts at zero for each task. After a review that needs a fix, the
counter increments once. At two task-review fix rounds, the next unresolved review result stops
for Human Maintainer. This counter is separate from the work item’s lifecycle `rework_count`.
No file under `docs/contracts/` changes under this specification.

## 5. State evidence gap analysis

### AC-07: runtime control versus receipt ledger

Existing `docs/workflow/handoff-contract.md` already distinguishes `dispatched` from
`acknowledged`, requires `acknowledgement pending` when evidence is absent, and defines parent
dispatch-control states. The receipt schema separately defines durable ledger states
`registered`, `consumed`, `expired`, and `cancelled`; its own comment says `consumed` is not
runtime-attested and does not prove named-agent execution.

Residual implementation gap: add one compact canonical glossary/pointer that names the two
namespaces and their negative semantics: acknowledgement is not completion, and receipt
consumption is not proof of execution. Detailed examples belong in an uncounted artifact.

### AC-08: bounded-native supervision

Existing `.codex/orchestrator-supervision.md` already defines bounded in-turn waiting,
terminal timeout/cancellation, `host_completion_unavailable`, no cross-turn parent resume, and
diagnostic-only heartbeat behavior. No new normative adapter prose is required unless the
implementation’s review identifies a contradiction with that existing text.

## 6. Context-budget allocation

The measured canonical set is 29,776 / 30,000 tokens. #166 must not raise the target. Before
editing canonical files, the implementer creates a per-file delta table and demonstrates one of:

1. net canonical growth is at most the remaining headroom after removing duplicated wording; or
2. detailed mechanics are stored in the new uncounted templates/specification, with only a
   compact canonical pointer and entry rule.

Preferred allocation is option 2: one concise entry/exit pointer in routing/role policy and
template links in the catalog. The full state glossary, examples, and review loop mechanics stay
in task artifacts. `npm run validate:context-budget` is required before QA handoff.

## 7. Implementation constraints and likely files

The future implementation may change only the exact canonical files justified by the approved
delta table, plus new templates. Likely candidates are `docs/templates/`,
`docs/workflow/dynamic-routing.md`, `docs/workflow/role-definitions.md`,
`docs/workflow/handoff-contract.md`, `docs/operating-model/SKILL_CATALOG.md`, and
`.agents/skills/dynamic-workflow/`. Scripts/tests are conditional: add them only if a normative
rule has a stable machine-checkable seam.

The following remain excluded: `docs/contracts/`, all lifecycle counter values, provider/model
identifiers, durable async runtime, heartbeat routing, and repair of the pre-existing Issue #102
design link.

## 8. Verification and regression evidence

Run applicable candidate-revision commands:

```bash
npm test
npm run validate:contracts
npm run validate:project-state
npm run validate:dispatch-receipts
npm run housekeeping:worktrees
npm run validate:skill-parity
npm run adr:audit
npm run validate:risk-register
npm run validate:review-gate
npm run validate:skill-usage
npm run validate:metrics
npm run validate:context-budget
git diff --check
```

QA independently verifies every Issue AC against the exact candidate diff. It must confirm that
Bug Fix and New Feature lifecycle contracts are unchanged, the terminal handoff remains intact,
and the new mode is not applied as universal process ceremony.

## 9. Acceptance-criteria readiness mapping

| AC | Specification mechanism | Implementation evidence needed |
|---|---|---|
| AC-01 | Sections 1–2 | entry/exit rule in canonical routing plus review proof |
| AC-02 | Section 3 | four templates and preserved `HANDOFF.md` boundary |
| AC-03 | Section 2 | pre-dispatch checklist and source/decision evidence |
| AC-04 | Sections 3–4 | pinned review template and independent QA evidence |
| AC-05 | Section 4 | scoped re-review template and finding disposition evidence |
| AC-06 | Section 4 | nested counter artifact; unchanged lifecycle contracts |
| AC-07 | Section 5 | concise namespace mapping and receipt validation evidence |
| AC-08 | Section 5 | cited existing adapter policy; no duplicate change unless gap proven |
| AC-09 | Section 8 | command output and independent QA matrix |
| AC-10 | ADR-0014 and notice | source links and third-party notice entry |

## 10. Human decision requested

Approved by Human Maintainer. This authorizes SUBAGENT-02 implementation preparation; it does
not authorize merge, release, durable async orchestration, or a lifecycle-contract change.
