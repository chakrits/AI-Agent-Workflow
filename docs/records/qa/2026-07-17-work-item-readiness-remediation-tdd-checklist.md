# TDD Checklist — Work Item Readiness Remediation

| Field | Evidence |
|---|---|
| Work Item | GitHub Issue #19 / Draft PR #20 |
| Bug Reference | [QA blocker report](https://github.com/chakrits/AI-Agent-Workflow/issues/19#issuecomment-4994472846) |
| Target behavior | The live GitHub adapter calls a pure readiness decision module; the module rejects invalid closeout sources and Work Items outside the repository. |
| Test seam | `scripts/work-item-readiness.mjs` imported by `test/work-item-readiness.test.mjs` and the GitHub Actions adapter. |

## RED

`node --test test/work-item-readiness.test.mjs` failed after adding tests for an unlabeled closeout source and an external Work Item. The old module returned `[]` for both invalid inputs.

## GREEN

- Added `sourcePullRequest` and `isSameRepository` to the pure decision input.
- Required a source Pull Request with `post-merge-closeout` for closeout exemption.
- Historical: made the former `.github/workflows/work-item-readiness.yml` import the trusted module instead of duplicating decisions inline. PRs #23 and #24 superseded that adapter with the App-owned direct evaluator.
- Added a portable GitLab operations guide and its regression coverage.

## Verification

| Command | Result |
|---|---|
| `node --test test/work-item-readiness.test.mjs test/validate-project-state.test.mjs test/validate-contracts.test.mjs` | Pass — 56 tests after Bootstrap PR #21 moved the five readiness tests onto `main` |
| Full repository validation | Pending final developer checkpoint |

## Scope Limitation

GitHub does not emit a native `pull_request` event when a linked Issue label changes. PRs #23 and #24 supply the approved GitHub App design that closes that gap; GitLab remains manual until separately approved API credentials exist.
