# Lessons Learned: Issue #303 Forensic Review & Lifecycle/Rollback/Failure Contract Hardening

## Date
2026-11-05

## Work Items
- Issue #303 — [[../work-items/2026-11-05-issue-303]]

## Lessons
| # | Lesson | Category | Evidence |
|---|--------|----------|----------|
| L-01 | Trace every state-machine validator end-to-end (`validateWhenClause`, `Map` transition indexing, and downstream `planning -> implementing` evidence gates) rather than patching a single YAML transition in isolation. | Contract Validation | `scripts/validate-contracts.mjs:113-163`, `docs/contracts/new-feature-workflow.yaml:6-24` |
| L-02 | Never conflate frozen schema outcome enums (`workflow-evidence/v1`) or 14-day ledger bookkeeping expiry (`dispatch-receipt`) with live runtime subagent timeouts; name each metric after its exact data source. | Metrics & Schema Integrity | `scripts/lib/workflow-evidence.mjs:27-44`, `docs/workflow/task-execution-mode.md:60-78` |
| L-03 | Restrict rework rate denominators strictly to evaluated cohorts that reached verification states (`verifying`, `monitoring`, `validating`) so unverified `intake` backlog items cannot dilute breach signals. | Statistical Rigor | `scripts/validate-metrics.mjs`, `docs/contracts/bug-fix-workflow.yaml` |
| L-04 | A single input-anomaly `Intent-Fingerprint` cannot detect human edits to a generated draft body; pair an RFC 8785 JCS `Intent-Fingerprint` (excluding `HEAD`) with a `Draft-Content-SHA256` body hash to fail closed (`exit 2`) on human-modified drafts. | CLI Safety (`RR-05`) | Spec v4 Section 4.4.3 (`M-01`–`M-08`) |
| L-05 | Distinguish core policy (`AGENTS.md:67` treats skill trees as independently editable optional libraries) from a work item's deliberate delivery scope (updating all 9 `code-review-gate` surfaces in Issue #303), and never claim `validate-skill-parity.mjs` verifies nested `templates/*.md` when it only hashes `SKILL.md` (`line 53`). | Policy & Audit Accuracy (`DW-01`) | `AGENTS.md:67`, `docs/workflows/stabilize-core.md:18`, `scripts/validate-skill-parity.mjs:43-56` |
| L-06 | For Stacked PRs sharing one Issue, intermediate PRs must declare `closing_action: advances-only` (`advances_issue: NN`) and reset inter-slice completion labels (`status:development-done`, `status:verification-done`), reserving `closing_action: closes` for the terminal PR. | PR Readiness (`DW-02`) | `scripts/work-item-readiness.mjs:197-222, 305-360` |
| L-07 | Touching `PROJECT_STATUS.md`, `TASK_LOG.md`, or `docs/records/work-items/**` triggers `validate:status-projection` and `validate:risk-register`; always run `compile-status-projection.mjs --reconcile` and maintain an open `RISKS.md` entry while work is active. | State Projection (`DW-03`) | `scripts/lib/validation-scope.mjs:122-128`, `scripts/validate-risk-register.mjs:124-164` |
| L-08 | State-machine contracts must model temporal mid-flight risk escalation (`low -> medium/high`) and rework episodes: evaluate branch selection strictly over the causal prefix `history.slice(0, index)` within the current `discovery` episode, and require `designing -> planning` remediation whenever current classification escalates past a historical `classification_snapshot`. | Temporal Lifecycle Logic (`R3-01`) | `scripts/validate-contracts.mjs:132,160`, `docs/contracts/schemas/new-feature-state.schema.json:38-54` |
| L-09 | Rollback plans for workflow contracts must separate pre-adoption code revert from post-adoption sunset (`historical_only: true`) so persisted `task-state` histories remain valid without rewriting audit history. | Rollback Compatibility (`R3-02`) | `scripts/validate-contracts.mjs:165`, Spec v4 Section 5.1 |
| L-10 | Trace file I/O helpers through their exact commit point (`renameSync` in `fenced-commit.mjs:79` occurs before `syncDirectorySync` at line `84`): unlink partial files created by our own `wx` open on `ENOSPC`, never unlink existing files on `EEXIST`, and report `POST_COMMIT_DIR_SYNC_FAILED` (`targetModified: true`) if directory `fsync` fails after commit. | Failure Semantics (`R3-03`) | `scripts/lib/fenced-commit.mjs:50-85`, Spec v4 Section 4.4.3 |
| L-11 | Enforce `METRICS.md:45` by rejecting structured threshold/emit flags when combined with `--source legacy-task-log` (`INCOMPATIBLE_SOURCE_FLAGS` `exit 2`), and calibrate pre-implementation specification claims ("design addresses findings; pending implementation/verification") rather than claiming "100% gap-free". | CLI Compatibility & Engineering Discipline (`R3-04`, Sec 8) | `docs/operating-model/METRICS.md:45`, Spec v4 Section 1.1 & 4.4.2 |
| L-12 | Sunset mode (`historical_only: true`) must provide an in-flight remediation hold (`REMEDIATION_HOLD_STATES = {"discovery", "designing", "rework", "blocked"}`) so active items executing runbook recovery steps do not fail `validateContracts()` before advancing to `implementing`, and must reject newly created post-sunset entries via `event.at > policy.sunset_effective_at` without requiring signed ledgers. | Sunset & Recovery Semantics (`V4-01a`, `V4-01b`) | `scripts/validate-contracts.mjs`, Spec v5 Section 4.2.3 & 5.1 |
| L-13 | File I/O helpers must use a positive write-all loop (`while (offset < buf.length)`) because POSIX `writeSync` may return fewer bytes without throwing; cleanup on write failure must be wrapped in try/catch and report `WRITE_ABORTED_CLEANUP_FAILED` with `targetModified: true` if unlinking fails; and `--force` `renameSync` failure must attempt temp cleanup and honestly distinguish `TARGET_UNCHANGED_BEFORE_COMMIT` (`tempLeft: 0`) from `RENAME_FAILED_TEMP_RESIDUAL` (`tempLeft: [tmpPath]`). | Resilient I/O Failure Contract (`V4-02a`, `V4-02b`, `V4-02c`) | `scripts/validate-metrics.mjs`, Spec v5 Section 4.4.3 |

## Metrics Snapshot
- Tests: 801+ baseline (pre-implementation planning stage)
- Subagent timeouts: 0
- Rework cycles: 0

## Memory Updated
- [x] Durable lessons recorded in repository `docs/records/lessons-learned/`
- [ ] Skill updates scheduled in Slice 2 (`IMP-303-06`) after `status:spec-ready`
