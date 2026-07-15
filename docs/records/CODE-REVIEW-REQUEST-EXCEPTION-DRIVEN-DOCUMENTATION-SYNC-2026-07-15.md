# Code Review Request

## 1. Change Summary

| Item | Detail |
|---|---|
| Work Item | EXCEPTION-DRIVEN-DOCUMENTATION-SYNC-2026-07-15 |
| Change Type | Workflow automation + validation |
| PR / Branch | `codex/documentation-sync/3` |
| Owner | Documentation Agent / Developer |

## 2. Intent

- Require Documentation Impact assessment before a GitHub PR targets `main`.
- Stop opening an issue for normal merges; create one only after the `main` project-state audit fails.

## 3. Changed Files / Components

| File / Component | Change Summary | Risk |
|---|---|---|
| `.github/workflows/documentation-impact-gate.yml` | Validates the completed PR assessment marker. | Medium |
| `.github/workflows/documentation-sync.yml` | Runs state audit on `main` and opens an issue only after failure. | Medium |
| GitHub/GitLab templates | Give PR/MR authors the same assessment structure. | Low |
| Documentation Agent rules | Move normal work before merge and reserve post-merge records for exceptions. | Medium |
| Regression tests | Guard the new trigger contracts. | Low |

## 4. Review Focus

| Area | Why It Matters |
|---|---|
| Happy path | A passing main audit must never create an issue. |
| Failure path | A failed audit must create one idempotent issue keyed to its commit SHA. |
| Permissions | The PR check is read-only; issue write permission is scoped to the exception job. |
| Branch protection | The maintainer must select `Validate documentation impact` as a Required status check after its first run appears. |
| GitLab | The MR template and default-branch audit remain platform-neutral; live runner validation is still R-002. |

## 5. Verification Performed

- `npm test` — 41 tests passed, including the pre-merge marker and exception-only issue regression tests.
- `npm run validate:contracts` — passed.
- `npm run validate:project-state` — passed.
- `git diff --check` — passed.
- YAML parse check for the GitHub workflows and GitLab MR template — passed.

## 6. Known Risks / Limitations

- The marker check establishes completion, while reviewer judgment still verifies the quality of the rationale and documentation changes.
- GitLab has no automated MR-description marker gate in this change.

## 7. Reviewer Questions

- Is the Documentation Impact marker sufficient as a required check, paired with protected-branch reviewer approval?
