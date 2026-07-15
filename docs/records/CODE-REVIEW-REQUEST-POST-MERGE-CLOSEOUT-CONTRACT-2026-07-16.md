# Code Review Request — Post-Merge Closeout Contract

## 1. Change Summary

| Item | Detail |
|---|---|
| Work Item | GitHub Issue #10 |
| Change Type | Workflow / agent-instruction enhancement |
| PR / Branch | `codex/issue-10-post-merge-closeout` |
| Owner | Codex |

## 2. Intent

Make normal post-merge documentation work visible and closeable without reopening the automatic-Issue-per-merge problem.

## 3. Changed Files / Components

| File / Component | Change Summary | Risk |
|---|---|---|
| Canonical policy, adapters, templates | Defines closeout ownership, labels, and QA evidence synchronization. | Medium |
| Documentation workflows | Adds audit-success PR signal and loop-safe cleanup; improves error output. | Medium |
| Regression tests | Guards policy/template/workflow drift. | Low |
| Project records | Tracks approved Issue #10 implementation. | Low |

## 4. Review Focus

| Area | Why It Matters |
|---|---|
| Correctness | Success must signal one source PR; failure must create only the exception Issue. |
| Edge Cases | No associated PR and a missing source label must be safe no-ops. |
| Security | Workflow token is scoped to PR read and Issue label/comment write; no contents write or secret is added. |
| Tests | Assertions cover the success/failure split, marker, and portable policy. |
| Maintainability | The completion marker must prevent an endless closeout-PR loop. |

## 5. Verification Performed

| Check | Result | Notes |
|---|---|---|
| RED contract tests | Expected fail | Missing closeout contract and success path. |
| `npm test` | Pass | 44 tests. |
| `npm run validate:contracts` | Pass | Contract validation passed. |
| `npm run validate:project-state` | Pass | Project state validation passed. |
| Ruby YAML parse | Pass | Both modified GitHub workflow files parsed. |
| `git diff --check` | Pass | No whitespace errors. |

## 6. Known Risks / Limitations

- Hosted GitHub Actions has not yet exercised the first normal closeout signal or marker-removal lifecycle.
- GitLab label/comment closeout remains manual until separately approved API automation.
- No associated PR is intentionally a logged no-op; protected main should make it exceptional.

## 7. Reviewer Questions

- Does `listPullRequestsAssociatedWithCommit` select the expected merged PR for this repository's merge strategy?
- Is the source-label removal marker clear enough for Documentation Agent handoff?
