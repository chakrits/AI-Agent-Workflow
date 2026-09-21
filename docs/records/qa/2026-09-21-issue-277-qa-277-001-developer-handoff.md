# Issue #277 Package 1 — QA-277-001 Developer Handoff

| Field | Value |
|---|---|
| Candidate | `feat/control-plane-state-integrity` at `87967f3` |
| Trigger | QA-277-001 Major blocker from `docs/records/qa/2026-09-18-issue-277-package1-full-qa.md` |
| Authority | SA addendum `docs/records/sdd/2026-09-21-issue-277-qa-277-001-contract-addendum.md` |
| Scope | Durable policy-authoritative evidence seam and TC-007/TC-024 regression coverage |
| Rework status | Human-approved additional cycle on 2026-09-21 |
| Decision | READY_FOR_INDEPENDENT_CODE_REVIEW |
| Skills Used | `implementation-planning`, `tdd-implementation`, `js-unit-testing`, `mutation-testing`, `verification-before-completion`, `git-workflow-and-versioning` |

## Change

`mutateTaskStateOnDisk()` now validates the workflow policy row once, then uses a private
policy-authoritative transition constructor that skips only the pure matrix `requires` check.
The exported `transitionTaskState()` and `resumeTaskState()` wrappers force their historical
matrix-evidence behavior, so callers cannot opt into the durable bypass through the public pure
API. Actor authorization, source/destination matrix legality, policy legality, CAS/digest,
resume/human approval, fencing and atomic writes remain unchanged.

## Regression evidence

- TC-007 positive durable transition: `intake -> investigating` succeeds with exactly
  `{ failure_description: "fd", repro: "rp" }` and no matrix-only keys.
- TC-007 negative durable cases reject a missing policy key and matrix-only evidence with
  `MISSING_REQUIRED_EVIDENCE`, preserving the shard bytes and cleaning admission/commit guards.
- Pure API compatibility is asserted even when a caller attempts to pass the internal option.
- TC-024b enumerates bug-fix policy transitions and resume destinations and fails if any policy
  destination is absent from the transition matrix.

## Verification

- Focused TC-007/TC-024 run: 4/4 passed.
- Full `npm test`: 785/785 passed. The three additional tests are the new durable evidence and
  destination-drift cases; the prior baseline was 782.
- Named temporary mutation: removing durable policy validation was killed by the TC-007 negative
  case.
- Named temporary mutation: enabling matrix evidence validation on the durable path was killed by
  the TC-007 positive case.
- `validate:contracts`, `validate:ci-parity`, `validate:project-state`, `validate:review-gate`,
  `validate:status-projection`, `validate:workflow-evidence`, `validate:risk-register`,
  `validate:skill-usage`, `validate:dispatch-receipts`, `validate:skill-parity`,
  `validate:adapter-parity`, `validate:edit-guards`, `validate:context-budget`,
  `validate:context-compatibility`, `validate:clearable-refs`, `validate:metrics`, `adr:audit`,
  and `git diff --check`: passed.

No configured Stryker or mutmut runner is present in this environment. The two named seam
mutations above were run as temporary source mutations and restored; the complete QA mutation and
process-kill/restart campaigns remain required. SEC-004 runtime closure remains pending QA and
Security review.

## Handoff

**Status:** DONE

**Changed files:** `scripts/lib/task-state-machine.mjs`, `test/task-state-machine.test.mjs`,
`PROJECT_STATUS.md`, `TASK_LOG.md`, and this record.

**Commit:** `87967f3` (`fix(control-plane): use policy evidence for durable transitions`).

**Next owner/action:** Independent Code Review Gate — re-derive the durable/pure validation seam
and confirm CR-001..CR-015 remain closed, then route to QA Full Mode.
