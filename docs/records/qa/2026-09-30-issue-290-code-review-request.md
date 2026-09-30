# Code Review Request — Issue #290

## 1. Change Summary

| Item | Detail |
|---|---|
| Work Item | Issue #290 — install dependencies for work-item readiness checks |
| Change Type | Bug Fix — GitHub Actions workflow |
| PR / Branch | `codex/issue-290-readiness-dependencies` (PR not opened yet) |
| Owner | Developer Agent |

## 2. Intent

Install the lockfile dependencies required by the trusted readiness validator before `github-script` loads it, without executing lifecycle scripts or changing readiness policy, permissions, event boundaries, or PR-code trust boundaries.

## 3. Changed Files / Components

| File / Component | Change Summary | Risk |
|---|---|---|
| `.github/workflows/work-item-readiness-refresh.yml` | Pin Node 22 setup and run `npm ci --ignore-scripts` after trusted checkout | Low |
| `test/validate-project-state.test.mjs` | Assert setup/install ordering and action pin | Low |
| Issue #290 records, `PROJECT_STATUS.md`, `TASK_LOG.md` | Record plan, root cause, lifecycle, and evidence | Low |

## 4. Review Focus

| Area | Why It Matters |
|---|---|
| Correctness / order | Dependencies must exist before trusted validator import |
| Security boundary | `pull_request_target` must continue to run only trusted default-branch code; scripts remain disabled |
| Permissions / events | Existing least-privilege permissions and event filters must remain unchanged |
| Tests | Regression contract must fail if runtime/install is absent or late |
| Maintainability | Reuse lockfile and existing Node 22 convention |

## 5. Verification Performed

```bash
npm test
npm run validate:project-state
npm run validate:contracts
npm run validate:ci-parity
npm run validate:skill-usage
npm run validate:status-projection
git diff --check
```

All listed checks passed locally; `npm test` passed 794/794. Hosted checks and post-merge readiness integration remain pending.

## 6. Known Risks / Limitations

- The PR's required readiness check may still fail until this trusted workflow reaches `main`; the merge path requires Human Maintainer decision. No bypass or ruleset change is authorized.
- AC-03's fresh readiness evaluation for PR #289 and fail-closed malformed-frontmatter hosted check remain pending post-merge.

## 7. Reviewer Questions

- Does the workflow preserve the trusted-code boundary while installing only lockfile dependencies?
- Are action pinning, dependency-install order, and regression assertions adequate for the acceptance criteria?
