# TDD Checklist — Post-Merge Closeout Contract

## 1. Target Behavior

| Item | Detail |
|---|---|
| Requirement / Bug Ref | GitHub Issue #10 |
| Expected Behavior | A passing default-branch audit leaves an idempotent PR closeout signal, while a failed audit alone creates the `documentation-sync` Issue. |
| Current Behavior | Passing audits created neither a signal nor a normal-closeout lifecycle; QA evidence could remain unsynchronized between Issue and PR. |
| Test Seam | Static workflow, policy, adapter, and template contract tests. |

## 2. RED — Failing Test

| Item | Detail |
|---|---|
| Test Name / Path | `post-merge closeout keeps QA evidence and normal-merge handoff ownership explicit`; `GitHub separates normal post-merge closeout from documentation-sync exceptions`. |
| Failure Before Fix | No canonical closeout contract and no audit-success handoff job existed. |
| Why It Fails for the Right Reason | Tests read the canonical policy and the GitHub workflow that own these guarantees. |

## 3. GREEN — Minimal Fix

| Item | Detail |
|---|---|
| Changed Files | Canonical policy, adapters, templates, GitHub workflows, tests, and project records. |
| Fix Summary | Adds progress labels, synchronized QA closeout ownership, a normal post-merge PR label/comment, and a completion-marker loop guard. |
| Why This Addresses the Behavior | The normal and exception paths are explicit, test-guarded, and cannot both trigger for the same audit result. |

## 4. REFACTOR — Cleanup

| Item | Detail |
|---|---|
| Refactor Performed? | No |
| Reason | Existing exception workflow remains intact; the new success path is isolated in its own job. |
| Behavior Preserved By | Full repository tests and state/contract validators. |

## 5. Verification

| Test / Check | Result | Notes |
|---|---|---|
| Focused RED test run | Expected fail | Missing contract and success-path workflow evidence. |
| `npm test` | Pass | 44 tests passed after implementation. |
| Contract/project-state validators | Pass | Current state and contracts are valid. |
| `git diff --check` | Pass | No whitespace errors. |
| QA pagination rework | Pass | Replaced a one-page `listComments` call with `github.paginate`; regression now requires pagination. |

## 6. Known Gaps

- Hosted GitHub Actions must validate the workflow and first normal-closeout lifecycle after merge.
- GitLab closeout labels/comments remain manual until separately approved API automation exists.

## 7. Handoff

| To | Reason | Evidence |
|---|---|---|
| qa-agent / reviewer | Validate policy ownership, workflow branches, and hosted checks. | RED/GREEN results, GitHub label list, and changed files. |
