# TDD Checklist — Cross-Platform QA Acceptance Gate

## 1. Target Behavior

| Item | Detail |
|---|---|
| Requirement / Bug Ref | GitHub Issue #7 |
| Expected Behavior | QA, not the implementer, verifies Issue acceptance criteria and records evidence for GitHub PRs and GitLab MRs. |
| Current Behavior | Handoff and templates did not require common acceptance-criteria status or QA evidence fields. |
| Test Seam | Node contract test |

## 2. RED — Failing Test

| Item | Detail |
|---|---|
| Test Name / Path | `QA verifies issue acceptance criteria across GitHub PRs and GitLab MRs` in `test/validate-contracts.test.mjs` |
| Failure Before Fix | Missing common handoff fields and no cross-platform QA gate/template requirements. |
| Why It Fails for the Right Reason | The test reads the canonical workflow, QA adapter, platform templates, and quality gates that must express the policy. |

## 3. GREEN — Minimal Fix

| Item | Detail |
|---|---|
| Changed Files | QA workflow/adapters, handoff contract/template, GitHub PR and GitLab MR templates, contract test. |
| Fix Summary | Added a portable QA acceptance gate, explicit independent QA ownership, required evidence fields, and matching PR/MR sections. |
| Why This Addresses the Behavior | The same evidence contract is now required regardless of platform naming. |

## 4. REFACTOR — Cleanup

| Item | Detail |
|---|---|
| Refactor Performed? | No |
| Reason | This is a focused policy addition; existing routing structure remains intact. |
| Behavior Preserved By | Existing contract tests and repository test suite. |

## 5. Verification

| Test / Check | Result | Notes |
|---|---|---|
| `node --test test/validate-contracts.test.mjs` | Pass | 37 tests passed after implementation. |
| `git diff --check` | Pass | No whitespace errors. |

## 6. Known Gaps

- GitLab validates default-branch project state but cannot automatically create an exception Issue until separately approved GitLab API automation is added.
- Final project-status records must be rebased after the currently open PR #6 merges to `main`.

## 7. Handoff

| To | Reason | Evidence |
|---|---|---|
| qa-agent | Independently verify policy consistency and regression coverage. | Contract-test result and changed workflow artifacts. |
