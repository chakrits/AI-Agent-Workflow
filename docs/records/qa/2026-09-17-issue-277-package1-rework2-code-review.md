# Issue #277 Package 1 — Developer Rework Cycle 2 Handoff

| Field | Value |
|---|---|
| Candidate | `feat/control-plane-state-integrity` at `e3f912e` |
| Trigger | Independent re-review `55bc342` (CR-009..CR-012) |
| Decision | READY_FOR_INDEPENDENT_CODE_REVIEW |
| Rework | Cycle 2 of maximum 2 (final allowed cycle) |
| Skills Used | `debugging-discipline`, `tdd-implementation`, `js-unit-testing`, `mutation-testing`, `implementation-planning`, `verification-before-completion`, `code-review-gate`, `git-workflow-and-versioning` |

## Changes and CR mapping

- **CR-009:** `archiveWorkItem()` rereads the durable task generation immediately before the
  active-to-archive rename while holding the task commit guard, then checks the exact active-only
  path and source digest. The production-seam barrier in
  `test/control-plane-state-integrity.test.mjs` advances the generation at that read and proves
  `ARCHIVE_EXECUTOR_STALE`, no forward rename, and an unchanged active shard.
- **CR-010:** Every loaded journal transaction is bound to the requested task ID; the current
  transaction pointer must be the latest retained transaction, and every adoption pointer must
  reference a retained attempt. A digest-valid journal for another task is rejected as
  `TASK_IDENTITY_MISMATCH` before any move.
- **CR-011:** The v2 backfill path now reads an existing fence and fails with
  `FENCE_STATE_MISSING` or `FENCE_STATE_MALFORMED`; only the explicit v1 migration path may
  initialize generation 1. The focused test covers both missing and invalid generation records and
  confirms the shard bytes are unchanged.
- **CR-012:** Adoption rereads generation inside its guard, rejects lower-generation requests,
  preserves immutable journal history, and fails closed for unsafe phase/path cells. The focused
  tests cover forward stale barriers, identity tampering, successful adoption/resume, stale
  adoption, terminal and ambiguous paths, and the exact six-phase × four-path × three-generation
  adoption oracle (72 cells).

## Verification

- `node --test test/control-plane-state-integrity.test.mjs` — PASS, 12/12; the 72-cell oracle
  executed all generated cases.
- `npm test` — PASS, 775/775.
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

The repository has no configured Stryker/mutation runner in `node_modules`. The named barrier and
matrix tests are executable mutation oracles for the CR-009..CR-012 operators; independent QA
must run the complete mutation plan and report kill evidence. This handoff does not claim
SEC-004 runtime closure, QA approval, Security approval, or merge approval.

## Handoff

**Status:** DONE

**Changed files:** `scripts/archive-work-item.mjs`, `scripts/backfill-task-state-v2.mjs`,
`test/control-plane-state-integrity.test.mjs`.

**Commits:** `e3f912e` (`fix(control-plane): close archive fencing review findings`).

**Residual risks:** The exhaustive runtime crash/fault and mutation campaign remains an independent
QA responsibility; Security must independently verify SEC-004 after QA. The legacy v1 archive
compatibility path remains intentionally preserved by the approved blueprint.

**Next owner/action:** Independent Code Review Gate — re-derive CR-009..CR-012 on `e3f912e`, then
route to QA Full Mode.
