# Issue #277 Package 1 — CR-015 Developer Handoff

| Field | Value |
|---|---|
| Candidate | `feat/control-plane-state-integrity` at `a7702b2` |
| Trigger | Independent final code review `1231ac2`; finding record `docs/records/qa/2026-09-17-issue-277-package1-independent-final-code-review.md` |
| Scope | CR-015 corrective exception: stale compensation journal advancement |
| Rework status | Human-approved post-cycle-3 corrective exception |
| Decision | READY_FOR_INDEPENDENT_CODE_REVIEW |
| Skills Used | `debugging-discipline`, `tdd-implementation`, `js-unit-testing`, `mutation-testing`, `verification-before-completion`, `git-workflow-and-versioning` |

## Change

`advancePhase()` now reloads and validates the current journal tuple and revision, then reads the
task generation while the task commit guard is held immediately before `writeJournal()`. A stale
generation returns `ARCHIVE_EXECUTOR_STALE` before changing the journal. All archive and
compensation phase transitions use this guarded conditional path.

## Regression evidence

- CR-015 production-seam barrier bumps the generation on compensation guard reacquisition after
  projection failure. The test asserts a stale/conflict error, byte-identical journal and shard,
  unchanged projection, zero reverse rename, and cleanup of admission/commit guards.
- A second CR-015 production-seam case changes the journal revision between the compensation
  executor's read and its conditional update. It asserts `ARCHIVE_JOURNAL_CONFLICT`, zero reverse
  rename, unchanged shard and no extra phase advancement.
- Existing CR-001..CR-014 control-plane barriers, recovery cases, and the explicit 72-cell adoption
  oracle remain green.

## Verification

The focused control-plane suite passes `18/18`; `npm test` passes `782/782`. The complete repository
validator set and `git diff --check` are run on this candidate before handoff, with worktree
cleanliness required.

No configured Stryker or mutmut runner is present in `node_modules`; executable named barrier and
matrix oracles are included, but independent QA must run the complete mutation and crash campaign.
SEC-004 runtime closure remains pending independent QA mutation evidence and Security runtime review.

## Handoff

**Status:** DONE

**Changed files:** `scripts/archive-work-item.mjs`,
`test/control-plane-state-integrity.test.mjs`, `PROJECT_STATUS.md`, `TASK_LOG.md`, and this record.

**Commit:** `a7702b2` (`fix(control-plane): fence compensation journal advancement`), with the
documentation handoff commit following verification.

**Next owner/action:** Independent Code Review Gate — re-derive CR-015 and confirm CR-001..CR-014
remain closed, then route to QA Full Mode.
