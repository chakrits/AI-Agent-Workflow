# Postmortem: Post-Merge Closeout Handoff Syntax Failure

## Summary

GitHub Issue #12 fixes the normal post-merge closeout handoff introduced by PR #11. PR #11 merged successfully, but its default-branch workflow could not compile the `actions/github-script` payload that should label and comment on the merged PR. The fix replaces the nested template-literal comment construction with parse-safe string assembly and adds a regression test that compiles the extracted script.

## Symptom

- PR #11 merged as commit `4b958893ee82180f9c3aba6b8ecb4727ebc3621a`.
- The `create-post-merge-closeout-handoff` job in Actions run `29438529157` failed with `SyntaxError: Unexpected identifier 'post'`.
- PR #11 had no `post-merge-closeout` label or marker comment, so no Documentation Agent closeout was queued and `PROJECT_STATUS.md` remained at `Human Review`.
- `validate-project-state` itself passed, so no `documentation-sync` exception Issue was expected or created.

## Root Cause

`.github/workflows/documentation-sync.yml` built the handoff comment using an outer JavaScript template literal while embedding Markdown inline-code backticks and a backtick-delimited hidden completion marker inside it. The first inner backtick terminated the outer literal. `actions/github-script` therefore failed while compiling the script, before any GitHub API request.

## Why It Produced the Symptom

The closeout job runs only after `validate-project-state` succeeds. Its JavaScript is compiled before `listPullRequestsAssociatedWithCommit`, label creation, comment pagination, or `createComment` can execute. A parse error at that point leaves the successful audit without a normal closeout signal; it does not enter the failure-only `documentation-sync` path.

## Fix

The handoff text is now assembled as `handoffBody` from an array joined with `\n`, then passed to `issues.createComment`. The dynamic marker and source PR number remain interpolated, but no backtick appears inside the enclosing template literal.

## How It Was Found

The failed hosted run was a deterministic repro. The Actions log gave the exact syntax error. A new test extracts the final GitHub Script block from the workflow and compiles it with `AsyncFunction`; before the fix it failed with the same error, and after the fix it passes.

## Why It Slipped Through

The original regression coverage asserted that expected workflow strings existed, but never compiled the embedded JavaScript. YAML parsing also cannot detect JavaScript syntax errors inside a block scalar. The first real default-branch execution of the new branch exercised that missing validation seam.

## Validation

| Evidence | Result |
|---|---|
| Original repro: compile extracted closeout script | Failed before fix with `Unexpected identifier 'post'`; passes after fix |
| Focused test: `node --test test/validate-project-state.test.mjs` | 6 passing |
| Full suite: `npm test` | 45 passing |
| Contract validation: `npm run validate:contracts` | Passed |
| Project-state validation: `npm run validate:project-state` | Passed |
| YAML parse: Ruby `YAML.load_file` | Passed |
| Hosted default-branch execution of the fix | Pending human merge and QA verification |

## Action Items / Follow-ups

| Action | Owner | Tracking |
|---|---|---|
| QA verifies Issue #12 acceptance criteria and the hosted Action result | QA Agent | GitHub Issue #12 |
| Merge the fix through human review | Human Maintainer | Fix PR for Issue #12 |
| Perform a one-time compensating documentation closeout for PR #11 after the fix lands | Documentation Agent / Human Maintainer | GitHub Issue #12 |

## References

- Issue: https://github.com/chakrits/AI-Agent-Workflow/issues/12
- Source PR: https://github.com/chakrits/AI-Agent-Workflow/pull/11
- Failed workflow: https://github.com/chakrits/AI-Agent-Workflow/actions/runs/29438529157
