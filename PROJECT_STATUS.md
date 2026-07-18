# PROJECT_STATUS.md

## Current Work Item
- ID: GitHub Issue #19
- Title: Add lifecycle stages and automated PR readiness gate
- Owner: Developer Agent / Human Maintainer
- Status: Readiness-refresh bootstrap in progress — trusted workflow must merge before PR #20 can automatically re-check changed Issue state

## Current Stage
- Developer Remediation

## Change Classification
- Change Type: Bug Fix — stale readiness result after linked-Issue label change
- Risk Level: Medium — dedicated GitHub App pull-request write
- Code Change Required: Yes — trusted refresh workflow and regression coverage
- Architecture Change Required: No
- Security Review Required: Yes — GitHub App token and private-key secret

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

## In Progress
- Issue #19 refresh bootstrap: edit an invisible PR refresh marker after lifecycle-label changes, then let the existing read-only readiness workflow re-check current state.

## Blockers / Open Questions
- R-002: `.gitlab-ci.yml` has not yet been validated on a live GitLab runner; this is an external verification follow-up, not an active implementation task.
- Deferred and unscheduled: a Prototype/Spike workflow route and a shared cross-role template pattern.

## Required Artifacts
- Trusted refresh workflow, regression coverage, security/code review, hosted re-check evidence, and readiness-workflow concurrency.

## Next Quality Gate
- Security/code review of the refresh bootstrap, human merge into `main`, then rebase PR #20 and QA verifies automatic re-check after a label change.

## Recommended Next Agent
- Security Reviewer, then Human Maintainer for bootstrap merge; QA Agent after PR #20 is rebased.

## Notes
- The refresh workflow uses a short-lived GitHub App token with only Pull requests: read & write. Its Client ID is a repository variable; its private key is an environment secret in protected `work-item-refresh`, never a repository secret or committed value. It never checks out or executes pull-request content.
- R-002 remains the separate live-GitLab-runner follow-up. GitLab uses the manual closeout label/comment equivalent until API automation is separately approved.
