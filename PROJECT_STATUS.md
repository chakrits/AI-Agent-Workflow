# PROJECT_STATUS.md

## Current Work Item
- Issue #166 — Strengthen task-scoped subagent execution and review contracts

## Current Stage
- Development — SUBAGENT-02 implementation preparation (`phase:development`)

## Change Classification
- Change Type: Framework / Meta (`framework_meta`)
- Risk Level: Medium
- Code Change Required: To be determined by the approved specification; documentation/templates are expected, validators/tests only if justified.
- Architecture Change Required: No durable asynchronous orchestration design is in scope; host-adapter semantics are documentation scope.
- Security Review Required: Not currently required; re-classify if credentials, access control, or production capability enters scope.

## Completed
- Issue #160 (reset repository to template baseline) merged through PR #162 as commit `93203e2`. Boss-approved run of `scripts/reset-to-template.mjs --apply --confirm-reset`: stubbed this file, `TASK_LOG.md`, `CHANGELOG.md`, `RISKS.md`, `DECISIONS.md` and cleared 13 historical record directories (109 entries — 104 deletions + 5 stub replacements), including `docs/records/handoffs` (fixed in #158/PR #159 ahead of this run). `docs/records/qa/`, `README.md`, `PROJECT_INDEX.md`, `docs/vault/00-Index.md`, and all canonical workflow/skill/template/CI content are untouched — this is a working-tree content reset only, not a history rewrite; every removed file remains recoverable via `git log`/`git show`. A first attempt (commit `f2c1375`, since-deleted branch) was correctly returned BLOCKED by independent QA because its own implementation-plan document had been left on an unmerged sibling branch, so the reset commit's history didn't actually contain the file it cited. Redone as a 2-commit branch — the plan doc landed as its own first commit (`ec2a7ca`), then the reset ran on top (`2754d45`) — so the plan is genuinely part of history before being cleared, same as every other `docs/records/` entry. Independent QA PASS on all 5 Acceptance Criteria at the corrected commit (evidence: https://github.com/chakrits/AI-Agent-Workflow/issues/160#issuecomment-5262083435). Plan: `docs/records/implementation-plan/2026-08-12-reset-to-template-execution-plan.md` (itself cleared by this same run, recoverable via `git show ec2a7ca:...`). Verified with the full command suite (`npm test` 399/399; `validate:contracts`, `validate:project-state`, `validate:skill-parity` 38/38, `adr:audit`, `validate:risk-register`, `validate:review-gate`, `validate:skill-usage`, `validate:metrics`, `validate:context-budget`, `git diff --check` — all PASS) and pre-confirmed via `scripts/verify-reset-template.mjs`'s disposable-clone harness.

## In Progress
- Issue #166 implementation is ready for independent QA: SUBAGENT-02 added templates and compact canonical pointers while retaining `phase:development` and `status:spec-ready` ([Issue comment 5263728633](https://github.com/chakrits/AI-Agent-Workflow/issues/166#issuecomment-5263728633)).

## Blockers / Open Questions
- Codex native child supervision is unavailable for #166 planning after three bounded waits; all delayed terminal results were consumed as `BLOCKED`. Human approved the direct-parent fallback for SUBAGENT-01/01A. Durable async remains out of scope and is tracked as R-002.
- The task-review two-round rule is explicitly nested, context budget may not be raised in #166, and the existing lifecycle-contract discrepancy is out of scope. QA and Human merge approval remain required.

## Required Artifacts
- Work item record: `docs/records/work-items/2026-08-12-issue-166-subagent-execution-contract.md`
- Implementation plan: `docs/records/implementation-plan/2026-08-12-issue-166-subagent-execution-contract.md`
- ADR and third-party-notice decision: `DECISIONS.md` ADR-0014 and `THIRD_PARTY_NOTICES.md`
- Detailed lightweight specification: `docs/records/sdd/2026-08-12-issue-166-task-execution-mode-spec.md` — approved

## Next Quality Gate
- QA Agent independently reviews the exact Issue #166 candidate diff and each AC before any human merge decision.

## Recommended Next Agent
- QA Agent — independently review SUBAGENT-02 and the exact candidate diff.

## Notes
- Reset to template baseline by `npm run reset:template`.
