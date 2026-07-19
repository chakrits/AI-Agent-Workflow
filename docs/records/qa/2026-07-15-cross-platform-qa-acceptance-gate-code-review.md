# Code Review Request — Cross-Platform QA Acceptance Gate

## 1. Change Summary

| Item | Detail |
|---|---|
| Work Item | GitHub Issue #7 |
| Change Type | Workflow / documentation contract |
| PR / Branch | `codex/issue-7-cross-platform-qa-gate` |
| Owner | Codex |

## 2. Intent

Make QA acceptance-criteria verification explicit, independently owned, and portable across GitHub PRs and GitLab MRs.

## 3. Changed Files / Components

| File / Component | Change Summary | Risk |
|---|---|---|
| Canonical workflow and QA adapter | Defines independent QA ownership and evidence contract. | Medium |
| Handoff contract and template | Adds portable URL/status/evidence fields. | Medium |
| GitHub/GitLab request templates | Provides visible QA-only verification section. | Low |
| Contract tests | Prevents adapter/template drift. | Low |

## 4. Review Focus

| Area | Why It Matters |
|---|---|
| Correctness | QA must be the only role that checks acceptance criteria. |
| Edge Cases | GitLab lacks GitHub's exception-Issue automation. |
| Security | No trust-boundary, secret, or dependency change. |
| Performance | Documentation-only; no runtime impact. |
| Tests | Assertions must cover canonical policy, adapter, and both platform templates. |
| Maintainability | Platform-neutral terms must remain understandable to GitHub and GitLab users. |

## 5. Verification Performed

| Check | Result | Notes |
|---|---|---|
| `node --test test/validate-contracts.test.mjs` | Pass | 37 tests passed. |
| `git diff --check` | Pass | No whitespace errors. |

## 6. Known Risks / Limitations

- GitLab exception issues remain manual until API automation is separately approved.
- PR #6 is merged as `b81feea`; this branch is rebased on the resulting `main` and carries the project-state update.

## 7. Reviewer Questions

- Does the QA-only wording make ownership sufficiently unambiguous in both templates?
- Is the manual GitLab exception-issue limitation documented clearly enough?
