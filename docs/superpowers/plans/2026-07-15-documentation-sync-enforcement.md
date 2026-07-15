# Implementation Plan — Documentation Sync Enforcement

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | DOCUMENTATION-SYNC-ENFORCEMENT-2026-07-15 |
| Change Type | Workflow automation + validation |
| Risk Level | Medium |
| Owner | Documentation Agent / Maintainer |
| Target Branch | `codex/enforce-doc-sync` |

## 2. Inputs Reviewed

| Artifact | Status | Notes |
|---|---|---|
| RCA discussion | Available | Identified missing event trigger and executable audit. |
| Documentation Agent rule/template | Available | Canonical behavior and record shape already exist. |
| GitHub/GitLab CI | Available | Existing validation is Node-based and cross-platform. |
| Branch protection | Available | Maintainer confirmed direct pushes to `main` are blocked. |

## 3. Affected Areas

| Area | Files / Components | Expected Change |
|---|---|---|
| GitHub automation | `.github/workflows/documentation-sync.yml` | Create a follow-up issue after a merged PR. |
| State validation | `scripts/validate-project-state.mjs`, `package.json` | Detect stale status markers. |
| Regression tests | `test/validate-project-state.test.mjs`, existing CI test | Prove validator and workflow contract. |
| Documentation contract | Role definition, Claude adapter, README, template | Define issue handoff and completion. |
| Project tracking | `PROJECT_STATUS.md`, `TASK_LOG.md`, `CHANGELOG.md` | Track this implementation. |

## 4. Task Breakdown

| Task ID | Task | Owner | Verification |
|---|---|---|---|
| IMP-001 | Add failing tests for stale status detection and merge-event workflow contract. | Developer | `node --test test/validate-project-state.test.mjs` fails first. |
| IMP-002 | Implement local state validator and package command. | Developer | Target tests pass. |
| IMP-003 | Add minimal-permission GitHub follow-up issue workflow and run state validator in CI. | Developer | Regression tests inspect workflow. |
| IMP-004 | Update Documentation Agent completion contract and project artifacts. | Documentation Agent | Full test suite and validations pass. |

## 5. Test Strategy

| Test Type | Required? | Scope |
|---|---|---|
| Unit Test | Yes | Valid/invalid `PROJECT_STATUS.md` fixtures. |
| Regression | Yes | Workflow trigger, guards, permissions, command wiring, agent contract. |
| Hosted CI | Yes after merge | GitHub Actions run on the PR and merged commit. |
| Security Review | Focused | Review event choice and GitHub token permissions. |

## 6. Verification Commands

```bash
npm test
npm run validate:contracts
npm run validate:project-state
```

## 7. Rollback / Fallback Plan

| Scenario | Rollback / Fallback Action |
|---|---|
| Issue workflow is noisy | Disable or revert only `.github/workflows/documentation-sync.yml`; local validation remains. |
| Validator rejects a valid status | Narrow its markers and add a regression case before re-enabling the check. |

## 8. Handoff

| To | Reason | Required Evidence |
|---|---|---|
| Reviewer | Review event filtering, permissions, and test coverage. | Diff, local commands, limits. |
| Maintainer | Merge via protected PR and observe first live issue creation. | GitHub Actions URL and created issue. |
