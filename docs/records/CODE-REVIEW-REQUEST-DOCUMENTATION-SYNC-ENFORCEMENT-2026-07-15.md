# Code Review Request

## 1. Change Summary

| Item | Detail |
|---|---|
| Work Item | DOCUMENTATION-SYNC-ENFORCEMENT-2026-07-15 |
| Change Type | Workflow automation + validation |
| PR / Branch | `codex/enforce-doc-sync` |
| Owner | Documentation Agent / Developer |

## 2. Intent

- Create an auditable Documentation Agent follow-up after each non-sync PR merges into `main`.
- Reject known stale `PROJECT_STATUS.md` merge-state markers after a default-branch push.

## 3. Changed Files / Components

| File / Component | Change Summary | Risk |
|---|---|---|
| `.github/workflows/documentation-sync.yml` | Creates an idempotent labeled issue from the trusted merged-PR event. | Medium |
| `scripts/validate-project-state.mjs` | Checks only current `Status:` fields for narrow stale markers. | Low |
| GitHub/GitLab CI | Runs the state validator only after default-branch pushes. | Low |
| Documentation Agent contracts/templates | Makes the issue-to-review-to-close path explicit. | Low |
| Tests | Covers valid/invalid state and workflow invariants. | Low |

## 4. Review Focus

| Area | Why It Matters |
|---|---|
| Event trust boundary | The issue-writing job must only run after a merged PR and must not execute PR code. |
| Permissions | Confirm `issues: write` and `pull-requests: read` are sufficient and no broader token is inherited. |
| Loop prevention | A `codex/documentation-sync/` PR must not create another follow-up issue. |
| Validator precision | Historical prose must not fail CI; only current `Status:` markers are checked. |
| Operational handoff | Confirm the issue, branch name, record, and closure steps are practical. |

## 5. Verification Performed

```bash
npm test
npm run validate:contracts
npm run validate:project-state
git diff --check
```

All commands exited 0 locally. `npm test` passed 40 tests.

## 6. Known Risks / Limitations

- GitHub Actions creates an issue but cannot invoke an LLM to make semantic documentation decisions; a Documentation Agent still completes the review.
- GitLab retains post-default-branch state validation but not GitHub-style issue creation, because that requires a separately authorized GitLab API integration.
- The first live merged PR is required to confirm GitHub token policy permits issue and label creation in this repository.

## 7. Reviewer Questions

- Does the repository permit GitHub Actions to create labels and issues with the default `GITHUB_TOKEN` under its Actions settings?
- Is `codex/documentation-sync/<issue-number>` the preferred branch convention for the team?
