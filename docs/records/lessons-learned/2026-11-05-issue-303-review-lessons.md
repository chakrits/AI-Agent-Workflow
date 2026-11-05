# Lessons Learned: Issue #303 Forensic Review & `/dynamic-workflow` Execution Hardening

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
| L-04 | A single input-anomaly `Intent-Fingerprint` cannot detect human edits to a generated draft body; pair an RFC 8785 JCS `Intent-Fingerprint` (excluding `HEAD`) with a `Draft-Content-SHA256` body hash and `wx` / atomic writes to fail closed (`exit 2`) on human-modified drafts. | CLI Safety | Spec v3 Section 4.4 (`RR-05` Dual-Digest Matrix `M-01`–`M-08`) |
| L-05 | When revising multi-surface skills (`code-review-gate`), check both cross-platform skill mirrors (`.agents/`, `.claude/`, `.agent/`) via `validate-skill-parity.mjs` AND nested skill templates (`templates/CODE_REVIEW_FINDINGS.md`) so no host loads stale instructions. | Cross-Platform Parity (`DW-01`) | `scripts/validate-skill-parity.mjs:43-80`, `.agents/skills/code-review-gate/SKILL.md:91` |
| L-06 | For Stacked PRs sharing one Issue, intermediate PRs must declare `closing_action: advances-only` (`advances_issue: NN`) and reset inter-slice completion labels (`status:development-done`, `status:verification-done`), reserving `closing_action: closes` for the terminal PR. | PR Readiness (`DW-02`) | `scripts/work-item-readiness.mjs:197-222, 305-360` |
| L-07 | Touching `PROJECT_STATUS.md`, `TASK_LOG.md`, or `docs/records/work-items/**` triggers `validate:status-projection` and `validate:risk-register`; always run `compile-status-projection.mjs --reconcile` and maintain an open `RISKS.md` entry while work is active. | State Projection (`DW-03`) | `scripts/lib/validation-scope.mjs:122-128`, `scripts/validate-risk-register.mjs:124-164` |

## Metrics Snapshot
- Tests: 801+ baseline (pre-implementation planning stage)
- Subagent timeouts: 0
- Rework cycles: 0

## Memory Updated
- [x] Durable lessons recorded in repository `docs/records/lessons-learned/`
- [ ] Skill updates scheduled in Slice 2 (`IMP-303-06`) after `status:spec-ready`
