# TDD Checklist: Post-Merge Closeout Syntax Fix

## Target Behavior

| Item | Detail |
|---|---|
| Requirement / Bug Ref | GitHub Issue #12 |
| Expected Behavior | The normal closeout GitHub Script compiles and includes the completion-marker instruction. |
| Current Behavior | The script fails compilation before reaching GitHub API calls. |
| Test Seam | Focused workflow-contract test using `AsyncFunction`. |

## RED

| Item | Detail |
|---|---|
| Test | `GitHub post-merge closeout script compiles and preserves its completion instruction` in `test/validate-project-state.test.mjs` |
| Failure | `SyntaxError: Unexpected identifier 'post'` |
| Why correct | The test compiles the same YAML-embedded JavaScript payload that failed in Actions. |

## GREEN

| Item | Detail |
|---|---|
| Changed files | `.github/workflows/documentation-sync.yml`, `test/validate-project-state.test.mjs` |
| Fix | Assemble the comment in `handoffBody` with `join('\\n')`; pass it to `issues.createComment`. |
| Why it works | The hidden marker is no longer embedded within another template literal. |

## REFACTOR

No unrelated refactor. The new local name makes the comment payload explicit.

## Verification

| Check | Result |
|---|---|
| Focused RED test before fix | Failed as expected |
| Focused GREEN test after fix | 6 passing |
| `npm test` | 45 passing |
| `npm run validate:contracts` | Passed |
| `npm run validate:project-state` | Passed |
| YAML parse and `git diff --check` | Passed |

## Known Gap

The hosted post-merge workflow can only run after human merge; QA must record its result in Issue #12.
