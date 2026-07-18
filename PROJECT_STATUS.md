# PROJECT_STATUS.md

## Current Work Item
- ID: GitHub Issue #33
- Title: Enforce Orchestrator dispatch and Boss visibility
- Owner: Human Maintainer / SA Agent
- Status: PR #34 merged as a human merge exception; Issue #33 remains open because QA blocked the required live-host proof. No complete QA pass or acceptance closure is recorded.

## Current Stage
- Blocked — host capability / human architecture decision

## Change Classification
- Change Type: Workflow/process architecture correction
- Risk Level: Medium — changes parent/child routing, host-resumption, and delivery-observability contracts without adding a repository execution runtime
- Code Change Required: Yes — canonical workflow, templates/adapters, and regression coverage
- Architecture Change Required: Yes — terminal handoff, dispatch receipt, and Boss event boundary
- Security Review Required: P3 durable dispatcher design/implementation requires Security review before human approval

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
- GitHub Issue #19 merged through PR #20 as `fef37cc`; its closeout PR #25 merged as `3f5e4c9`, closed Issue #19, removed the source closeout signal, and passed default-branch validation/audit without a `documentation-sync` exception.
- GitHub Issue #28 Portable Contract merged through PR #27 as `70a9303`; QA evidence covered PC-01 through PC-05, and default-branch validation/audit runs `29642349695` and `29642349720` passed without a `documentation-sync` exception.
- GitHub Issue #29 Hosted Activation merged through PR #31 as `196aeb0`; Security review `SEC-02` and QA's full seven-row Acceptance Criteria matrix passed at `f839d1a`. Default-branch contract validation and documentation audit both passed, and GitHub emitted one normal `post-merge-closeout` signal with no `documentation-sync` exception.
- GitHub Issues #26 and #29 were closed by documentation closeout PR #32; child #28 was already closed by PR #30, and PR #31's `post-merge-closeout` signal was removed.

## In Progress
- PR #34 merged as `fa706800f5f1fabb5b64cde6ebffb5e932d63e66`; its successful default-branch audit emitted the normal `post-merge-closeout` signal. That signal requires this documentation synchronization only and is not QA or acceptance evidence.
- Issue #33 remains open. QA blocked the live-host proof at [Issue comment 5012113857](https://github.com/chakrits/AI-Agent-Workflow/issues/33#issuecomment-5012113857): `ORCH-02`, `ORCH-04`, and `ORCH-06` were not proven. The current GitHub labels `phase:human-review` and `status:verification-done` conflict with that evidence and must not be treated as authoritative.
- GitHub Issue #35 is the existing P3 durable event-driven dispatcher design proposal. It is deferred work only: no implementation is authorized until SA design, Security review, and human approval are complete.

## Blockers / Open Questions
- R-002: `.gitlab-ci.yml` has not yet been validated on a live GitLab runner; this is an external verification follow-up, not an active implementation task.
- Deferred and unscheduled: a Prototype/Spike workflow route and a shared cross-role template pattern.

## Required Artifacts
- `docs/records/REQUIREMENTS-ORCHESTRATOR-DISPATCH-VISIBILITY-2026-07-18.md` — approved
- `docs/records/SDD-ORCHESTRATOR-DISPATCH-VISIBILITY-2026-07-18.md` — approved
- `docs/records/IMPLEMENTATION-PLAN-ORCHESTRATOR-DISPATCH-VISIBILITY-2026-07-18.md` — ready for Developer Agent

## Next Quality Gate
- Human Maintainer decides how to reconcile the incomplete Issue #33 lifecycle state and whether to sponsor Issue #35 design. If sponsored: SA design → Security review → human approval precede any P3 implementation.

## Recommended Next Agent
- Human Maintainer, then SA Agent for Issue #35 only if the P3 design is authorized

## Notes
- RCA evidence: refresh runs `29635734227` and `29635753891` successfully used the App token to edit PR #20, but no `pull_request.edited` readiness run was created. The direct evaluator removes that unsupported event dependency.
- The direct evaluator uses a short-lived GitHub App token with only Pull requests: read, Issues: read, and Checks: read & write. Its Client ID is a repository variable; its private key is an environment secret in protected `work-item-refresh`, never a repository secret or committed value. The environment's `main` branch restriction does not itself protect a `pull_request_target` run from fork context; safety comes from checking out only trusted `main` and never executing PR-head content. Main branch protection must pin `work-item-readiness-freshness` to the AI Agent Workflow App source, never Any source.
- Hosted evidence: Issue-label runs `29636953171` (expected failure while `phase:development` was absent) and `29636978535` (success after restoration) published App Check Runs on PR #20. The `pull_request_target` edited-event run `29637202523` also passed and published App Check Run `88061518191`; its restoration run `29637225455` passed.
- QA recheck: all 6 contract implementation Acceptance Criteria passed at `de4db2b`; the evidence comment is `5010706703`. This earlier readiness-gate evidence does not supersede Issue #33's later live-host QA block.
- PR #34 merge is a human decision, not evidence that Issue #33 acceptance criteria passed. Do not close Issue #33, mark QA passed, or use `status:verification-done` / `phase:human-review` as proof until independently corrected with valid QA evidence.
- R-002 remains the separate live-GitLab-runner follow-up. GitLab uses the manual closeout label/comment equivalent until API automation is separately approved.
- PR #31's immutable Action pins resolve the `SEC-26-01` supply-chain concern without altering GitHub App permissions, secrets, environment, ruleset, check source/name, or privileged workflow logic.
