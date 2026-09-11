# Code Review Findings: IMP-004 Status Projection Compiler & Archival Lifecycle

Scope: Implementation of IMP-004 (Status Projection Compiler & Archival Lifecycle, Pillar 1) for [Issue #272](https://github.com/chakrits/AI-Agent-Workflow/issues/272), delivering `scripts/compile-status-projection.mjs`, `scripts/archive-work-item.mjs`, `package.json` script registrations, unit tests in `test/compile-status-projection.test.mjs` (covering TC-027..TC-032, TC-035), update to root `PROJECT_STATUS.md` with active work items table, and QA code review record.

| Finding ID | Severity | File / Area | Finding | Recommendation | Blocks Progress? | Evidence |
|---|---|---|---|---|---|---|
| CR-IMP004-001 | None | `scripts/compile-status-projection.mjs` | Shard discovery scans `docs/records/work-items/*/task-state.json` and strictly excludes `docs/records/work-items/archive/**`. Sorts deterministically by `task_id` ascending. Generates JCS canonical digest comment `<!-- projection-digest: ... -->`. | Retain strict exclusion of `archive/**` across all compilation modes. | No | TC-027, TC-028, TC-029 pass. |
| CR-IMP004-002 | None | `scripts/compile-status-projection.mjs` | Formats active shards strictly as a Markdown table (`\| Issue ID \| Workflow \| Current State \| Next Route / Owner \| Updated At \|`). Puts state vocabulary into table cells rather than lines matching `/^\s*-\s+Status:\s*/i`, eliminating collisions with stale merge-state markers per Constraint 3 and AC-011. | Maintain standard Markdown table layout without emitting status bullet points. | No | TC-035 passes; `npm run validate:project-state` exits 0. |
| CR-IMP004-003 | None | `scripts/compile-status-projection.mjs` | Implemented CLI flags `--check` (exits 1 on drift, 0 on match), `--write` (updates `PROJECT_STATUS.md` inside marker boundary idempotently), and `--json` (emits structured JSON projection). Execution time benchmarked well below 300ms target (<30ms for 100 shards). | Use `--check` in CI validation pipelines and `--write` during closeout automation. | No | TC-030, TC-031, TC-032 pass. |
| CR-IMP004-004 | None | `scripts/archive-work-item.mjs` | CLI tool `node scripts/archive-work-item.mjs <issue_id>` moves shard directory from `docs/records/work-items/{issue_id}` to `docs/records/work-items/archive/{issue_id}`. Sanitizes input against path traversal and refuses archival if state is not terminal (`completed` or `cancelled`). | Pair with expanded closeout PR allowlist in `scripts/work-item-readiness.mjs` for post-merge closeout. | No | Archival unit tests in `test/compile-status-projection.test.mjs` pass. |
| CR-IMP004-005 | None | `package.json` | Registered `"compile:status-projection"`, `"archive:work-item"`, `"status:compile"`, and `"validate:status-projection"` scripts in `package.json`, satisfying ADR-0022 and hook containment. | Keep registered scripts aligned with hook containment rules. | No | `node --test test/hook-containment.test.mjs` passes. |

## Verification Evidence

- `npm test`: 764/764 passed (baseline: 756 passed, +8 new tests in `test/compile-status-projection.test.mjs`).
- `node --test test/compile-status-projection.test.mjs`: 8/8 tests PASS (TC-027..TC-032, TC-035, Archival Lifecycle).
- `node --test test/hook-containment.test.mjs`: 3/3 tests PASS.
- `npm run compile:status-projection --check`: PASS (exit code 0; projection matches committed `PROJECT_STATUS.md`).
- `npm run validate:status-projection`: PASS (exit code 0).
- `npm run validate:contracts`: PASS.
- `npm run validate:ci-parity`: PASS.
- `npm run validate:project-state`: PASS (0 stale marker collisions).
- `npm run validate:context-budget`: PASS.
- `npm run validate:review-gate`: PASS.
- `git diff --check`: PASS.

## Review Decision

Approved for IMP-004 merge into feature branch. Ready for handoff to QA for independent verification.
