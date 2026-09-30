# Issue #290 — Human Activation Decision Handoff

## From Agent

QA Agent; terminal Conditional Pass consumed by Orchestrator.

## To Agent

Human Maintainer

## Work Item

Issue #290 — install dependencies for work-item readiness checks.

## Work Item URL

https://github.com/chakrits/AI-Agent-Workflow/issues/290

## Change Request URL

https://github.com/chakrits/AI-Agent-Workflow/pull/291

## Change Type

Bug Fix — trusted GitHub Actions readiness workflow.

## Risk Level

Low implementation risk. The pending decision concerns changing a required CI control and requires explicit human approval.

## Lifecycle Phase

`phase:verification` — QA is conditional; `status:verification-done` has not been applied.

## Specification Readiness

Required specification: Lightweight. Issue #290 scope and acceptance criteria were approved before implementation; implementation plan is `docs/records/implementation-plan/2026-09-30-issue-290-readiness-workflow-plan.md`.

## Current Stage

Draft PR #291 is open. Local implementation, independent review, and QA are complete to the extent possible before default-branch activation. Waiting for a Human Maintainer decision on the allowed activation/merge path.

## Task State

`handoff`; next route `human-maintainer`; state digest `7b13692ee884c09a1aa0e446ad625b4d3866e92e83b1d0893e71aeef91ce0fd8` verified by the task-state CLI. Bug-fix contract v1; task-state envelope v2; rework count 0.

## Completed Work

- Reproduced the original failure on PR #289 and confirmed the exact same error on PR #291: `Linked Issue is missing: YAML parser dependency unavailable.`
- Added pinned Node 22 setup and `npm ci --ignore-scripts` after trusted default-branch checkout and before GitHub Script.
- Independent code review approved implementation candidate `622fc6f8cb7408011873e7679182e82e0fae5492` with one non-blocking hosted-integration follow-up.
- Independent QA returned Conditional Pass: AC-01 and AC-02 pass; AC-03 hosted activation/re-evaluation remains pending.
- Opened Draft PR #291. All observed GitHub checks pass except required `work-item-readiness-freshness`; the failure is the known bootstrap error from the unchanged workflow on `main`.

## Done when

An explicitly approved activation path puts the repair on the default branch; the repaired hosted readiness check passes on valid metadata; PR #289 is re-evaluated successfully; malformed frontmatter remains fail-closed; then QA records complete AC evidence and the Issue receives normal closeout.

## May proceed through

Read-only check inspection, local verification, Draft PR #291 updates that preserve the pending AC-03 limitation, and documentation/evidence updates in this work item.

## Must stop for

Any change to required checks, rulesets, merge bypass, merging PR #291, or claiming AC-03 complete. These require an explicit Human Maintainer decision. No workflow check, ruleset, or permission has been changed.

## Assumptions

None. GitHub check output confirms the required check still runs trusted default-branch code and emits the original parser-unavailable error.

## Artifacts Produced

- Implementation candidate: `622fc6f8cb7408011873e7679182e82e0fae5492`.
- Independent review: `docs/records/qa/2026-09-30-issue-290-code-review.md` (`APPROVED_WITH_COMMENTS`).
- Independent QA: `docs/records/qa/2026-09-30-issue-290-qa.md` (`CONDITIONAL_PASS`).
- Issue #290 and Draft PR #291.
- Task state: `docs/records/work-items/issue-290/task-state.json`.

## Files Changed

- `.github/workflows/work-item-readiness-refresh.yml`
- `test/validate-project-state.test.mjs`
- `PROJECT_STATUS.md`, `TASK_LOG.md`
- Issue #290 implementation/configuration, QA, and task-state records under `docs/records/`

## Verification Performed

- Focused workflow contract tests: 9/9.
- Full suite: 794/794.
- `validate:project-state`, `validate:contracts`, `validate:ci-parity`, `validate:skill-usage`, `validate:status-projection`, and `validate:review-gate`: pass.
- Draft body `validate:pr-readiness -- --draft`: pass against live Issue #290 metadata.
- GitHub PR #291 checks: Node 22 tests, Python 3.12 reference, both `validate` runs, documentation impact, and `publish-current-readiness` pass; required `work-item-readiness-freshness` fails with the known `YAML parser dependency unavailable` error.
- Post-activation run and PR #289 re-evaluation: not yet possible.

## Evidence References

- QA evidence: https://github.com/chakrits/AI-Agent-Workflow/issues/290#issuecomment-5906794886
- Review: `docs/records/qa/2026-09-30-issue-290-code-review.md`
- QA report: `docs/records/qa/2026-09-30-issue-290-qa.md`
- PR checks: https://github.com/chakrits/AI-Agent-Workflow/pull/291/checks
- Original failure / source trace: `docs/records/qa/2026-09-30-issue-290-debug-ledger.md`

## Acceptance Criteria Verification Status

- AC-01: Pass — local workflow order and trusted-code boundary independently verified.
- AC-02: Pass — focused/full tests and local validators pass.
- AC-03: Partial — local suite passes; hosted check still fails on old trusted `main` workflow. Post-activation success for PR #291, PR #289 re-evaluation, and hosted malformed-frontmatter behavior remain outstanding.

## Acceptance Traceability Matrix URL

Issue #290: https://github.com/chakrits/AI-Agent-Workflow/issues/290

## Reviewed Candidate SHA

`13cc90e9ef6bf390e1312762fe26d61cb179df2f` (PR #291 head; implementation commit `622fc6f8cb7408011873e7679182e82e0fae5492`).

## Handoff Record Commit SHA

Resolved externally as the final commit SHA on branch `codex/issue-290-readiness-dependencies` containing this record.

## Platform Activation Record URL / Status

GitHub Actions / branch protection: https://github.com/chakrits/AI-Agent-Workflow/pull/291/checks — required check is active but still executes the old trusted `main` workflow; no ruleset or workflow control change has been made.

## QA Evidence URL

https://github.com/chakrits/AI-Agent-Workflow/issues/290#issuecomment-5906794886

## Stop Reason

`human_review_required` — the next step may require temporarily disabling or otherwise changing a required check, or using a merge exception. No such action is authorized yet.

## Known Limitations

- AC-03 cannot be fully verified until the fix is active on the default branch.
- PR #291 remains Draft and merge-blocked by the required readiness check.
- The test-quality review noted that the workflow contract assertions inspect YAML text rather than parse YAML semantically; no current defect was found.

## Open Questions

Will the Human Maintainer approve temporarily disabling only `work-item-readiness-freshness` until PR #290 is merged and verified, or prefer another permitted activation mechanism? All other checks remain green. This choice is a human approval gate; the agent has not changed any check.

## QA / Review Focus

After activation, confirm dependency install succeeds on the runner, the required check passes on valid PR #291 metadata, PR #289 is re-evaluated successfully, and malformed metadata still fails closed.

## Recommended Next Step

Human Maintainer selects or rejects the specific activation/merge path. Until then, keep PR #291 Draft, make no ruleset change, and do not bypass the required check.

## Next Action

`Human review`

## Next Owner

Human Maintainer

## Orchestration Turn ID

`issue290-human-activation-handoff-20260930-01`

## Boss Event Required

Yes — the Orchestrator reports the conditional QA/review result, hosted check status, requested decision, and stop boundary to the Human Maintainer in this active turn.

## Dispatch State

`blocked`

## Source Agent

QA Agent (`/root/issue290_independent_qa`); Orchestrator consumed the QA receipt and verified current GitHub check state.

## Target Agent

Human Maintainer; no child agent was dispatched.

## Dispatch Result

Human review requested. The QA terminal result was consumed in-turn and the required-check failure was confirmed; no external control was changed.

## Acknowledgement Evidence

Pending Human Maintainer decision; this handoff is the request for that decision.

## Boss Event

Issue #290 implementation is locally verified and independently reviewed; QA is Conditional Pass (AC-01/02 pass, AC-03 pending). Draft PR #291 is open. All GitHub checks pass except the required readiness check, which repeats the original parser-unavailable failure from `main`. Next action: Human review of the activation/merge path. Dispatch state is blocked at the human gate; no check was disabled or bypassed. Human decision required before continuing.

## Handoff Event ID

`issue290-human-activation-handoff-20260930-01`

## Parent Orchestrator ID

`/root`

## Child Task ID

`/root/issue290_independent_qa` — QA terminal result source; no child exists for the direct human-review target.

## Terminal Result ID

`issue290-qa-conditional-pass-13cc90e-20260930`

## Completion Event Evidence

`collaboration.wait_agent` delivered the QA terminal result during this active Orchestrator turn; the follow-up task-state transition returned a verified digest. Current PR check state was then inspected through GitHub CLI.

## Consumption Evidence

The Orchestrator consumed the QA result once, recorded the `verifying → handoff` state with QA actor, verified all PR checks, and emitted this single Boss event. No further dispatch is made until the Human Maintainer responds.

## Timeout / Cancellation Reason

N/A — no timeout or cancellation occurred.
