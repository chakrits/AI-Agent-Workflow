# Debug Ledger — Issue #283 Readiness Transition

| Item | Detail |
|---|---|
| Work Item / Ticket | Issue #283 / PR #289 |
| Feature / Module | Linked work-item readiness check |
| Owner | Orchestrator with independent QA |
| Started | 2026-09-30 |
| Current Status | Resolved on Draft; final Ready-for-review check pending after status-only update |

## Symptom

| Field | Detail |
|---|---|
| Observed Failure | `work-item-readiness-freshness` passed while PR #289 was Draft, then failed after the PR was marked Ready for review. |
| Error / Log / Stack Trace | Check run `109910546459`: `Linked Issue is missing: status:verification-done.` |
| Environment | GitHub PR #289; head `88b0acf33adfcfe9008ef0e452c75c6e2a4d47b2`; trusted readiness workflow from default branch after PR #291 merged. |
| Frequency | Deterministic on the Ready-for-review lifecycle event. |
| First Seen | 2026-09-30, immediately after `gh pr ready 289`. |

## Repro

| Field | Detail |
|---|---|
| Repro Status | Deterministic; observed directly on the Ready event. |
| Steps | Observe readiness on Draft; mark PR ready; inspect the new `work-item-readiness-freshness` check. |
| Command / Test | `gh pr ready 289`; `gh pr checks 289`; GitHub Checks API for commit `88b0acf33adfcfe9008ef0e452c75c6e2a4d47b2`. |
| Test Data | Issue #283 labels: `phase:verification`, `status:spec-ready`, `status:development-done`; no `status:verification-done`. |
| Expected | Ready-for-review PR has a completed QA milestone and passes readiness. |
| Actual | Check fails with the specific missing verification milestone. |

## Fail Path

| Layer | Evidence |
|---|---|
| Entry point | `.github/workflows/work-item-readiness-refresh.yml` runs on `pull_request_target` including `ready_for_review`. |
| Failing function / module | `scripts/work-item-readiness.mjs`, lifecycle validator. |
| Relevant branch / condition | For non-Draft PRs, the validator requires both `status:verification-done` and a QA evidence URL; Draft PRs do not require the verification milestone. |
| Relevant config / data | PR `draft` state changed from true to false; linked Issue #283 lacked the milestone. The previously committed QA report and Work Item still described the pre-rebase candidate and pending hosted checks. |
| Last known good state | On PR head `2da816e`, after evidence synchronization and Issue transition, readiness-freshness and `publish-current-readiness` both passed while Draft. |
| First bad state | The `ready_for_review` event created failed check run `109910546459`; `publish-current-readiness` itself completed successfully. |

## Hypothesis Matrix

| ID | Hypothesis | Why plausible | Proof | Disproof | Experiment | Result | Status |
|---|---|---|---|---|---|---|---|
| H-001 | PR #291's dependency repair did not work on this run. | The original #289 blocker was a YAML parser dependency failure. | Failure summary would mention parser/dependency error; validator run would not publish a current result. | Failure summary names a missing lifecycle label and readiness publication passed. | Inspect check output and `publish-current-readiness` run. | No dependency error; publication run succeeded. | Ruled out |
| H-002 | Conflict resolution/rebase broke readiness parsing or linked-Issue resolution. | The branch was rebased and status files conflicted. | Failure would report linked Issue missing, invalid metadata, malformed body, or parser failure. | API output identifies Issue #283 and specifically names `status:verification-done`; Draft run on same head passed. | Inspect API check-run summary and PR body/Issue labels. | Linked Issue resolved; only verification milestone is absent. | Ruled out |
| H-003 | Ready-for-review readiness intentionally requires a QA milestone not yet synchronized to Issue #283. | Workflow event changes `draft` to false; Issue lacks verification-done; QA/work-item records still cite old candidate and pending hosted state. | Source condition requires milestone when `!draft`; exact label is absent. | A non-Draft check passes without the label or source lacks that condition. | Trace validator and compare Issue labels. | Source condition and remote data match the failure exactly. | Confirmed |

## Experiment Ledger

| Run ID | Timestamp | Change / Command | Observation | Ruled In | Ruled Out | Next Action |
|---|---|---|---|---|---|---|
| RUN-001 / head `88b0acf` | 2026-09-30 | `gh pr checks 289` while Draft after branch sync | `work-item-readiness-freshness` and all hosted CI passed. | Validator can parse and resolve current PR/Issue. | Missing dependency; rebase conflict. | Prepare synchronized exact-candidate QA/review evidence. |
| RUN-002 / check `109910546459` | 2026-09-30 | `gh pr ready 289`; inspect commit check-runs API | Freshness failed only with `Linked Issue is missing: status:verification-done`; publication workflow passed. | Missing milestone is the direct cause. | CI code failure or YAML parser failure. | Keep PR Draft and complete Work Item/Change Request evidence synchronization before QA applies the milestone. |

## Current Conclusion

- Confirmed root cause: The Ready-for-review event activated the validator's non-Draft rule, but Issue #283 had not yet received the QA-owned `status:verification-done` milestone. The evidence records also needed post-rebase synchronization before that label could be truthful.
- Confidence: High.
- Remaining uncertainty: The freshness check must be observed after the Ready-for-review event on the final status-record commit.

## Fix Direction

- Proposed fix: No validator or workflow code change. Synchronize the exact-rebase QA/review evidence with the Work Item and PR, then apply `status:verification-done` and advance the Issue to `phase:human-review`; the issue-label event re-evaluated the PR successfully.
- Why it addresses root cause: It satisfies the existing lifecycle contract and keeps the readiness check fail-closed.
- Risks: Incorrectly applying the milestone before synchronized evidence would misstate QA completion. No such bypass occurred.
- Validation plan: Confirm Issue has exactly one phase plus `status:verification-done`; readiness passed on Draft head `2da816e`; rerun after final status update and Ready-for-review event.
