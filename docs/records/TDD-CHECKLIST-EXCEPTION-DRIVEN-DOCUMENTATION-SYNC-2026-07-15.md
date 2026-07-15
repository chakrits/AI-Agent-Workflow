# TDD Checklist — Exception-Driven Documentation Sync

## 1. Target Behavior

| Item | Detail |
|---|---|
| Requirement | Documentation assessment is completed before merge; post-merge issue is exception-only. |
| Expected Behavior | A PR requires a completed Documentation Impact marker; only a failed `main` state audit creates an idempotent issue. |
| Current Behavior | Every merged PR created a `documentation-sync` issue. |
| Test Seam | Node regression tests inspect the workflow and template contracts. |

## 2. RED — Failing Test

| Item | Detail |
|---|---|
| Test Path | `test/validate-project-state.test.mjs` |
| Failure Before Fix | Missing pre-merge workflow/template; existing workflow had `pull_request: closed` instead of a `push` audit failure condition. |
| Why It Fails for the Right Reason | The assertions directly describe the approved trigger and exception behavior. |

## 3. GREEN — Minimal Fix

| Item | Detail |
|---|---|
| Changed Files | GitHub workflows and PR template; GitLab MR template; canonical/adapter documentation. |
| Fix Summary | Added the pre-merge marker gate and replaced routine issue creation with a failed-main-audit trigger. |
| Why This Addresses the Behavior | Normal merges have no issue-creation job; only the audit job's failure can start the issue job. |

## 4. REFACTOR — Cleanup

| Item | Detail |
|---|---|
| Refactor Performed? | No |
| Reason | Kept the focused workflow change small and reviewable. |
| Behavior Preserved By | Full Node regression suite and YAML parsing. |

## 5. Verification

| Test / Check | Result | Notes |
|---|---|---|
| Focused workflow tests | Pass | 5 tests passed after implementation. |
| Full `npm test` | Pending final run | Run again before commit. |
| `npm run validate:contracts` | Pending final run | Run again before commit. |
| `npm run validate:project-state` | Pending final run | Run again before commit. |

## 6. Known Gaps

- GitLab receives the MR template and default-branch audit, but its live pipeline remains unverified (R-002).
- The GitHub check must be selected as a Required status check in branch protection after its first run appears.

## 7. Handoff

| To | Reason | Evidence |
|---|---|---|
| Reviewer | Verify event scope, permissions, marker contract, and exception-only behavior. | Plan, workflow tests, and final validation output. |
