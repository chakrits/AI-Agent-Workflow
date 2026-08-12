# PROJECT_STATUS.md

## Current Work Item
- None. Issue #166 is complete and merged; no work item is active.

## Current Stage
- Idle — post-merge closeout for Issue #166 / PR #167.

## Change Classification
- Change Type: N/A
- Risk Level: N/A
- Code Change Required: N/A
- Architecture Change Required: N/A
- Security Review Required: N/A

## Completed
- Issue #166 (strengthen task-scoped subagent execution and review contracts) merged through PR #167 as commit `eeb731f`. Adds an **optional** task-execution mode: four purpose-scoped templates (`TASK_BRIEF.md`, `IMPLEMENTER_REPORT.md`, `TASK_REVIEW.md`, `TASK_REVIEW_REREVIEW.md`), a permanent canonical definition at `docs/workflow/task-execution-mode.md`, compact pointers from `dynamic-routing.md`/`role-definitions.md`/`SKILL_CATALOG.md`/`dynamic-workflow` skill, ADR-0014, and `obra/superpowers` attribution in `THIRD_PARTY_NOTICES.md`. The mode is risk-triggered and never universal ceremony; task review/re-review are QA modes, not a new canonical role; `task_review_rework_count` is nested and does not touch any lifecycle `rework_count`. Nothing under `docs/contracts/`, `scripts/`, or `test/` changed (`git diff 7679e21...6994456` on those paths = 0 lines), so Bug Fix and New Feature contracts, retry budgets, and the 30,000-token `TARGET` are all unchanged. Independent planning QA returned NEEDS_REVISION first (evidence: https://github.com/chakrits/AI-Agent-Workflow/issues/166#issuecomment-5263220187) and the plan was amended before implementation; independent implementation QA then returned PASS on AC-01–AC-10 at `6994456` (evidence: https://github.com/chakrits/AI-Agent-Workflow/issues/166#issuecomment-5265981143). Canonical definition: `docs/workflow/task-execution-mode.md`; specification of record: `docs/records/sdd/2026-08-12-issue-166-task-execution-mode-spec.md`. Verified with the full command suite (`npm test` 399/399; `validate:contracts`, `validate:project-state`, `validate:dispatch-receipts`, `validate:skill-parity` 38/38, `adr:audit`, `validate:risk-register`, `validate:review-gate`, `validate:skill-usage`, `validate:metrics`, `validate:context-budget` 29,937/30,000, `git diff --check` — all PASS).
- Issue #164 (missing markdown table separator in `reset-to-template.mjs`'s `TASK_LOG.md` stub) merged through PR #165 as commit `7679e21`, ahead of the #166 work. Recorded here because its own closeout had not been performed; this closeout covers it as an earlier source PR.
- Issue #160 (reset repository to template baseline) merged through PR #162 as commit `93203e2`. Boss-approved run of `scripts/reset-to-template.mjs --apply --confirm-reset`: stubbed this file, `TASK_LOG.md`, `CHANGELOG.md`, `RISKS.md`, `DECISIONS.md` and cleared 13 historical record directories (109 entries — 104 deletions + 5 stub replacements), including `docs/records/handoffs` (fixed in #158/PR #159 ahead of this run). `docs/records/qa/`, `README.md`, `PROJECT_INDEX.md`, `docs/vault/00-Index.md`, and all canonical workflow/skill/template/CI content are untouched — this is a working-tree content reset only, not a history rewrite; every removed file remains recoverable via `git log`/`git show`. A first attempt (commit `f2c1375`, since-deleted branch) was correctly returned BLOCKED by independent QA because its own implementation-plan document had been left on an unmerged sibling branch, so the reset commit's history didn't actually contain the file it cited. Redone as a 2-commit branch — the plan doc landed as its own first commit (`ec2a7ca`), then the reset ran on top (`2754d45`) — so the plan is genuinely part of history before being cleared, same as every other `docs/records/` entry. Independent QA PASS on all 5 Acceptance Criteria at the corrected commit (evidence: https://github.com/chakrits/AI-Agent-Workflow/issues/160#issuecomment-5262083435). Plan: `docs/records/implementation-plan/2026-08-12-reset-to-template-execution-plan.md` (itself cleared by this same run, recoverable via `git show ec2a7ca:...`). Verified with the full command suite (`npm test` 399/399; `validate:contracts`, `validate:project-state`, `validate:skill-parity` 38/38, `adr:audit`, `validate:risk-register`, `validate:review-gate`, `validate:skill-usage`, `validate:metrics`, `validate:context-budget`, `git diff --check` — all PASS) and pre-confirmed via `scripts/verify-reset-template.mjs`'s disposable-clone harness.

## In Progress
- Nothing in progress.

## Blockers / Open Questions
- No blocker. Three follow-ups opened from the Issue #166 work remain open and unscheduled: Issue #168 (`validate-review-gate` diffs only `HEAD~1..HEAD`, so a multi-commit branch can skip the review gate), Issue #169 (canonical and contract files reference documents that `reset-to-template` clears), and Issue #170 (two QA Minor findings: unpinned `obra/superpowers` attribution and `TASK_BRIEF.md`'s weaker "Human decision evidence" wording).
- Risk R-002 stays open: Codex bounded-native child supervision timed out three times during the #166 planning work, and the Human-approved direct-parent fallback cannot substitute for independent QA. Durable async orchestration remains deferred to Issue #35.

## Required Artifacts
- None. Issue #166's artifacts are merged: canonical definition `docs/workflow/task-execution-mode.md`, specification of record `docs/records/sdd/2026-08-12-issue-166-task-execution-mode-spec.md`, `DECISIONS.md` ADR-0014, and the `THIRD_PARTY_NOTICES.md` attribution entry.

## Next Quality Gate
- N/A. The next gate belongs to whichever follow-up (Issue #168, #169, or #170) is scheduled first.

## Recommended Next Agent
- Orchestrator Agent (or PM Agent for a new business request).

## Notes
- Reset to template baseline by `npm run reset:template`.
