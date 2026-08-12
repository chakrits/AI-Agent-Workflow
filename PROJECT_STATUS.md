# PROJECT_STATUS.md

## Current Work Item
- Issue #168 — `validate-review-gate` only diffs `HEAD~1..HEAD`, so multi-commit branches skip the review gate

## Current Stage
- Bug Fix — implementation complete, awaiting independent QA. Governed by `docs/contracts/bug-fix-workflow.yaml`, not the `phase:`/`status:` lifecycle label contract.

## Change Classification
- Change Type: Bug Fix (tooling / CI gate)
- Risk Level: Medium — the gate protects every future script change; a wrong range fails open rather than closed.
- Code Change Required: Yes — `scripts/validate-review-gate.mjs` and `test/validate-review-gate.test.mjs`.
- Architecture Change Required: No.
- Security Review Required: No — no auth, secrets, sensitive data, or trust boundary is involved; the change reads local git history only.

## Completed
- Issue #166 (strengthen task-scoped subagent execution and review contracts) merged through PR #167 as commit `eeb731f`. Adds an **optional** task-execution mode: four purpose-scoped templates (`TASK_BRIEF.md`, `IMPLEMENTER_REPORT.md`, `TASK_REVIEW.md`, `TASK_REVIEW_REREVIEW.md`), a permanent canonical definition at `docs/workflow/task-execution-mode.md`, compact pointers from `dynamic-routing.md`/`role-definitions.md`/`SKILL_CATALOG.md`/`dynamic-workflow` skill, ADR-0014, and `obra/superpowers` attribution in `THIRD_PARTY_NOTICES.md`. The mode is risk-triggered and never universal ceremony; task review/re-review are QA modes, not a new canonical role; `task_review_rework_count` is nested and does not touch any lifecycle `rework_count`. Nothing under `docs/contracts/`, `scripts/`, or `test/` changed (`git diff 7679e21...6994456` on those paths = 0 lines), so Bug Fix and New Feature contracts, retry budgets, and the 30,000-token `TARGET` are all unchanged. Independent planning QA returned NEEDS_REVISION first (evidence: https://github.com/chakrits/AI-Agent-Workflow/issues/166#issuecomment-5263220187) and the plan was amended before implementation; independent implementation QA then returned PASS on AC-01–AC-10 at `6994456` (evidence: https://github.com/chakrits/AI-Agent-Workflow/issues/166#issuecomment-5265981143). Canonical definition: `docs/workflow/task-execution-mode.md`; specification of record: `docs/records/sdd/2026-08-12-issue-166-task-execution-mode-spec.md`. Verified with the full command suite (`npm test` 399/399; `validate:contracts`, `validate:project-state`, `validate:dispatch-receipts`, `validate:skill-parity` 38/38, `adr:audit`, `validate:risk-register`, `validate:review-gate`, `validate:skill-usage`, `validate:metrics`, `validate:context-budget` 29,937/30,000, `git diff --check` — all PASS).
- Issue #164 (missing markdown table separator in `reset-to-template.mjs`'s `TASK_LOG.md` stub) merged through PR #165 as commit `7679e21`, ahead of the #166 work. Recorded here because its own closeout had not been performed; this closeout covers it as an earlier source PR.
- Issue #160 (reset repository to template baseline) merged through PR #162 as commit `93203e2`. Boss-approved run of `scripts/reset-to-template.mjs --apply --confirm-reset`: stubbed this file, `TASK_LOG.md`, `CHANGELOG.md`, `RISKS.md`, `DECISIONS.md` and cleared 13 historical record directories (109 entries — 104 deletions + 5 stub replacements), including `docs/records/handoffs` (fixed in #158/PR #159 ahead of this run). `docs/records/qa/`, `README.md`, `PROJECT_INDEX.md`, `docs/vault/00-Index.md`, and all canonical workflow/skill/template/CI content are untouched — this is a working-tree content reset only, not a history rewrite; every removed file remains recoverable via `git log`/`git show`. A first attempt (commit `f2c1375`, since-deleted branch) was correctly returned BLOCKED by independent QA because its own implementation-plan document had been left on an unmerged sibling branch, so the reset commit's history didn't actually contain the file it cited. Redone as a 2-commit branch — the plan doc landed as its own first commit (`ec2a7ca`), then the reset ran on top (`2754d45`) — so the plan is genuinely part of history before being cleared, same as every other `docs/records/` entry. Independent QA PASS on all 5 Acceptance Criteria at the corrected commit (evidence: https://github.com/chakrits/AI-Agent-Workflow/issues/160#issuecomment-5262083435). Plan: `docs/records/implementation-plan/2026-08-12-reset-to-template-execution-plan.md` (itself cleared by this same run, recoverable via `git show ec2a7ca:...`). Verified with the full command suite (`npm test` 399/399; `validate:contracts`, `validate:project-state`, `validate:skill-parity` 38/38, `adr:audit`, `validate:risk-register`, `validate:review-gate`, `validate:skill-usage`, `validate:metrics`, `validate:context-budget`, `git diff --check` — all PASS) and pre-confirmed via `scripts/verify-reset-template.mjs`'s disposable-clone harness.

## In Progress
- Issue #168: `scripts/validate-review-gate.mjs` now resolves its audit range via `git merge-base` against the PR base branch (`GITHUB_BASE_REF` → `origin/main` → `main`), falling back to `HEAD~1..HEAD` only when no base resolves — and printing an explicit WARNING when it does. Three regression tests build a real two-commit branch whose script change lands in the first commit. Implemented TDD (behavioral RED at 2 failing / 13 passing, then GREEN at 15/15; suite 399 → 402). Independent QA returned NEEDS_REVISION on the first candidate `7ffb4fa` with two Major fail-open findings, both introduced by that first fix and both reproduced independently before being accepted: an empty merge-base range when HEAD is at or behind the base (every `push` to `main` became a vacuous PASS), and a silent fall-through to `main` when a declared base ref does not resolve (a stacked branch was credited with an ancestor's review record). Fixed: declared base signals are authoritative with no fall-through, an empty range degrades to the last-commit audit with a warning, and the bare ref is tried alongside `origin/<ref>`. Suite 402 → 406. Self-review record: `docs/records/qa/2026-08-12-issue-168-review-gate-merge-base-code-review.md` (CR-901–CR-910). `task_review_rework_count`: 1.

## Blockers / Open Questions
- No blocker. Two follow-ups from the Issue #166 work remain open and unscheduled: Issue #169 (canonical and contract files reference documents that `reset-to-template` clears) and Issue #170 (two QA Minor findings: unpinned `obra/superpowers` attribution and `TASK_BRIEF.md`'s weaker "Human decision evidence" wording).
- Not audited: whether any earlier multi-commit branch merged an unreviewed script change while Issue #168's defect was live. This fix corrects the mechanism only. PR #167 specifically is clear — independent QA re-derived `git diff 7679e21...6994456 -- scripts/ test/` = 0 lines by hand.
- Risk R-002 stays open: Codex bounded-native child supervision timed out three times during the #166 planning work, and the Human-approved direct-parent fallback cannot substitute for independent QA. Durable async orchestration remains deferred to Issue #35.

## Required Artifacts
- Self-review record: `docs/records/qa/2026-08-12-issue-168-review-gate-merge-base-code-review.md`
- Issue #166's artifacts are merged: canonical definition `docs/workflow/task-execution-mode.md`, specification of record `docs/records/sdd/2026-08-12-issue-166-task-execution-mode-spec.md`, `DECISIONS.md` ADR-0014, and the `THIRD_PARTY_NOTICES.md` attribution entry.

## Next Quality Gate
- Independent QA re-review of Issue #168's fix diff against the prior finding set (CR-907–CR-910), scoped to fix-caused regression.

## Recommended Next Agent
- QA Agent — independent verifier. The implementer must not self-certify this gate.

## Notes
- Reset to template baseline by `npm run reset:template`.
