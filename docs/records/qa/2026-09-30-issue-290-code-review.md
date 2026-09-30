# Code Review Findings — Issue #290

## Review Context

| Item | Detail |
|---|---|
| Work Item | Issue #290 — install validator dependencies in the trusted readiness workflow |
| Reviewed range | `25990c18d3912e063b20c73c9e69d0335d764626..622fc6f8cb7408011873e7679182e82e0fae5492` |
| Change type / risk | Bug Fix / Low |
| Scope | Workflow dependency bootstrap, workflow contract test, and work-item evidence/state files |
| Review focus | AC alignment, trusted-code boundary, permissions/events, dependency install safety, test coverage, and project-state accuracy |

## Summary

The workflow now sets up pinned Node.js 22 and installs lockfile-defined dependencies with lifecycle scripts disabled after checking out the trusted default branch and before importing the readiness validator. The change does not alter the trigger, checkout ref, token permissions, readiness policy, or App-owned check behavior.

## Verification Performed

```bash
git diff --find-renames 25990c18d3912e063b20c73c9e69d0335d764626..622fc6f8cb7408011873e7679182e82e0fae5492 -- .github/workflows/work-item-readiness-refresh.yml test/validate-project-state.test.mjs
node --test test/validate-project-state.test.mjs
git diff --check
```

| Check | Result | Notes |
|---|---|---|
| Exact candidate commit | Pass | Worktree `HEAD` is `622fc6f8cb7408011873e7679182e82e0fae5492`. |
| Focused workflow contract test | Pass | 9/9 tests passed, including trusted checkout → Node setup → `npm ci --ignore-scripts` → GitHub Script ordering. |
| Trust boundary / permission diff | Pass | Only workflow additions are Node setup and dependency installation; existing `pull_request_target`, trusted default-branch checkout, `persist-credentials: false`, and least-privilege permissions remain unchanged. No PR-head code is checked out or executed. |
| Dependency discipline | Pass | Uses existing `package-lock.json` via `npm ci`; lifecycle scripts are disabled. No dependency was added or version-bumped. |
| Review-record whitespace | Pass | `git diff --check` passed before adding this review record; re-run after this file is staged/committed. |
| Hosted integration | Not run | The App-owned required check uses trusted default-branch workflow code; validation of the repaired check and re-evaluation of PR #289 remain pending activation on the default branch. |

## Findings

| Finding ID | Severity | File / Area | Finding | Recommendation | Blocks Progress? | Evidence |
|---|---|---|---|---|---|---|
| CR-290-001 | Minor | Hosted readiness integration | AC-03 cannot be demonstrated by this candidate commit alone because `pull_request_target` runs the trusted workflow from the default branch. This is an activation/verification limitation, not a defect in the patch. | After a human-approved path puts the fix on the default branch, confirm the readiness workflow resolves dependencies and re-evaluate PR #289; record the hosted check evidence before closing Issue #290. | No, for code-review approval; yes, for claiming end-to-end completion | Implementation plan §8; existing workflow event and default-branch checkout; no hosted result is part of this review packet. |

## Review Decision

**APPROVED_WITH_COMMENTS** — no code changes are required before QA/PR preparation. The hosted integration follow-up remains outstanding and must not be represented as passed. Do not bypass or weaken the required check as part of this review.

## Required Follow-up

| Item | Owner | Tracking | Evidence |
|---|---|---|---|
| Run hosted readiness verification after default-branch activation and re-evaluate PR #289 | Human Maintainer / QA Agent | Issue #290 AC-03 | Record the exact GitHub check result and PR #289 readiness result |

## Scoped Re-review — 2026-09-30

The final branch review's two Minor findings were fixed in `1e0907bbeb8bb0400c8e3adec02e5a7ed768564e` and independently re-reviewed against base `3a80bb851c3b40db21f9df5bb491b125e0452151`. The reviewer confirmed the `- run:` shorthand is recognized and asserted, the handoff names PR #291, and no new breakage or out-of-scope change was introduced. Decision: **APPROVED** for the scoped fix. This does not change the original hosted AC-03 limitation or authorize a required-check bypass.
