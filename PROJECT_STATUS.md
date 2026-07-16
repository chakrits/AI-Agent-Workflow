# PROJECT_STATUS.md

## Current Work Item
- ID: GitHub Issue #19
- Title: Add lifecycle stages and automated PR readiness gate
- Owner: Developer Agent / Human Maintainer
- Status: Hosted readiness-gate bootstrap verified; the remaining Issue #19 lifecycle implementation is still Draft PR #20

## Current Stage
- Development — Draft PR #20 requires its remaining QA acceptance-criteria work

## Change Classification
- Change Type: Bug Fix — stale readiness result after linked-Issue label change
- Risk Level: High — dedicated GitHub App Check Run write
- Code Change Required: Yes — trusted direct evaluator and regression coverage
- Architecture Change Required: Yes — branch protection will consume an App-owned Check Run instead of an event-chained PR workflow
- Security Review Required: Yes — GitHub App token, private-key secret, and Check Run write

## Completed
- All 11 agent roles have their current canonical rules, adapters, and regression coverage on `main`.
- Release, Config, Data, Security, Developer, Orchestrator, PM, BA, SA, QA, and Documentation role-enrichment work is committed.
- `7386ce2` committed and pushed the combined Skill Catalog sync, GitLab CI, README onboarding, Playwright technical guidance, and BDD Scenario Workflow work items.
- R-001 (Phase 1 hosted GitHub Actions confirmation) is closed.
- `DOCUMENTATION-SYNC-ENFORCEMENT-2026-07-15` merged through PR #2 as commit `0e03c62`; GitHub created issue #3, confirming the post-merge issue trigger works in the live repository.
- `DOCUMENTATION-SYNC-3-2026-07-15` completed the review record for PR #2 and moved normal documentation assessment to the pre-merge path; post-merge issues are now reserved for failed state audits.
- PR #4 merged the exception-driven documentation workflow as `320c144`; the legacy routine issue #3 was closed as completed.
- GitHub Issue #5, Frontend UI Engineering skill, merged through PR #6 as commit `b81feea`; canonical and platform-adapter skill copies, catalog discovery, regression coverage, and MIT attribution are on `main`.
- GitHub Issue #7, Cross-platform QA acceptance gate, merged through PR #8 as commit `f35c8b8`; QA evidence confirmed all six acceptance criteria, and the passing default-branch audit created no `documentation-sync` exception issue.
- GitHub Issue #10's closeout contract merged through PR #11. Its first live run exposed a syntax defect, and PR #13 then exposed a job-level pull-request permission defect; both were remediated under Issue #12 through PRs #13 and #14.
- PR #14's default-branch audit passed in run `29440627931`, created one `post-merge-closeout` signal, and its successful rerun confirmed the handoff is idempotent without creating a `documentation-sync` exception.
- GitHub Issue #16, canonical agent personas, merged through PR #17 as commit `8e4a3e0`; all seven QA acceptance criteria passed, the default-branch audit run `29510562131` passed, and no `documentation-sync` exception Issue was created.
- PR #23 merged as `1eb0465`. Its trusted direct readiness evaluator passed independent code and security review. Hosted tests proved both lifecycle-label and `pull_request_target` edited events create an App-owned `work-item-readiness-freshness` Check Run on PR #20; `main` now requires that check from **AI Agent Workflow**.

## In Progress
- Issue #19 lifecycle-stage implementation remains in Draft PR #20; its QA acceptance criteria and final review are not yet complete.

## Blockers / Open Questions
- R-002: `.gitlab-ci.yml` has not yet been validated on a live GitLab runner; this is an external verification follow-up, not an active implementation task.
- Deferred and unscheduled: a Prototype/Spike workflow route and a shared cross-role template pattern.

## Required Artifacts
- Draft PR #20 rebase/current-state review, QA acceptance-criteria evidence, and final human review.

## Next Quality Gate
- Rebase Draft PR #20 onto current `main`, then route its scoped lifecycle-stage changes through code review and QA acceptance-criteria verification.

## Recommended Next Agent
- Developer Agent, then Code Reviewer and QA Agent for Draft PR #20.

## Notes
- RCA evidence: refresh runs `29635734227` and `29635753891` successfully used the App token to edit PR #20, but no `pull_request.edited` readiness run was created. The direct evaluator removes that unsupported event dependency.
- The direct evaluator uses a short-lived GitHub App token with only Pull requests: read, Issues: read, and Checks: read & write. Its Client ID is a repository variable; its private key is an environment secret in protected `work-item-refresh`, never a repository secret or committed value. The environment's `main` branch restriction does not itself protect a `pull_request_target` run from fork context; safety comes from checking out only trusted `main` and never executing PR-head content. Main branch protection must pin `work-item-readiness-freshness` to the AI Agent Workflow App source, never Any source.
- Hosted evidence: Issue-label runs `29636953171` (expected failure while `phase:development` was absent) and `29636978535` (success after restoration) published App Check Runs on PR #20. The `pull_request_target` edited-event run `29637202523` also passed and published App Check Run `88061518191`; its restoration run `29637225455` passed.
- R-002 remains the separate live-GitLab-runner follow-up. GitLab uses the manual closeout label/comment equivalent until API automation is separately approved.
- Issue #19 must preserve the existing Bug Fix contract and exception-driven post-merge closeout behavior; it does not alter either state machine.
