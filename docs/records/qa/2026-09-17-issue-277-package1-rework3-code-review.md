# Issue #277 Package 1 — Developer Rework Cycle 3 Handoff

| Field | Value |
|---|---|
| Candidate | `feat/control-plane-state-integrity` at `5db4250` |
| Trigger | Independent final review `a10162b`; SA contract addendum at `e7608a5` |
| Decision | READY_FOR_INDEPENDENT_CODE_REVIEW |
| Rework | Cycle 3, explicitly approved by Human Maintainer |
| Skills Used | `implementation-planning`, `tdd-implementation`, `js-unit-testing`, `mutation-testing`, `debugging-discipline`, `verification-before-completion`, `git-workflow-and-versioning` |

## CR mapping

- **CR-012:** `adoptArchiveTransaction()` now validates generation relation, exact physical
  cardinality, selected-shard identity/digest and phase/location before equal-generation no-op or
  generation-greater adoption. It returns `ARCHIVE_LOCATION_AMBIGUOUS`,
  `ARCHIVE_PHASE_LOCATION_MISMATCH`, `ARCHIVE_TERMINAL_LOCATION_MISMATCH`,
  `FENCE_GENERATION_REGRESSION`, or `ARCHIVE_ADOPTION_UNSAFE` as applicable. The executable oracle
  covers every six-phase × four-path × three-generation cell with explicit expected results; no
  cell uses an unasserted null oracle.
- **CR-013:** Restart through `archiveWorkItem()` now handles `compensation_requested/R` with a
  guarded reverse rename, recognizes `compensation_requested/A`, and resumes
  `compensation_moved/A` at fresh projection publication. Each path revalidates the journal tuple,
  generation, phase, identity/digest and exact path before mutation, synchronizes both parents,
  and finalizes `terminal_compensated/A`. Stale recovery is tested with a zero-rename barrier.
- **CR-014:** A matching `terminal_compensated/A` projection starts a fresh immutable transaction
  with new txid, intent and attempt while retaining the previous transaction. A projection drift
  returns `ARCHIVE_PROJECTION_DRIFT` before append; `adoptArchiveTransaction()` remains unsafe for
  terminal phases. Both behaviors have production-seam tests.
- **Prior controls:** Existing CR-001..CR-011 tests remain green. Guard ordering stays task
  admission → task guard → released projection guard; no task/projection guard is nested.

## Verification

- `node --test test/control-plane-state-integrity.test.mjs` — PASS, 16/16, including the 72-cell
  phase/path/generation oracle and compensation/fresh-retry barriers.
- `npm test` — PASS, 780/780.
- `npm run validate:contracts` — PASS.
- `npm run validate:project-state` — PASS.
- `npm run validate:review-gate` — PASS.
- `npm run validate:ci-parity` — PASS.
- `npm run validate:status-projection` — PASS.
- `npm run validate:workflow-evidence` — PASS.
- `npm run validate:risk-register` — PASS.
- `npm run validate:skill-usage` — PASS.
- `npm run adr:audit` — PASS, 2.56:1.
- `git diff --check` — PASS.
- Worktree is clean at handoff.

No Stryker or other configured mutation runner is present in `node_modules`. The barrier and matrix
tests are executable named mutation oracles; independent QA must execute the complete mutation and
crash campaign. SEC-004 runtime closure still requires independent QA mutation evidence and
Security runtime review.

## Handoff

**Status:** DONE

**Changed files:** `scripts/archive-work-item.mjs` and
`test/control-plane-state-integrity.test.mjs`.

**Commit:** `5db4250` (`fix(control-plane): complete archive recovery matrix`).

**Next owner/action:** Independent Code Review Gate — re-derive CR-012..CR-014 on `5db4250`, then
route to QA Full Mode.
