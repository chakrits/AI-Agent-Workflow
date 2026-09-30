# QA Report — Issue #290 Post-Activation Readiness Verification

## Metadata

- Work Item ID: Issue #290 — fix readiness workflow dependency installation
- Build/Version: `main` at `4f3210c4df444dd7f7edf8b485c4cbc450295cf4`
- Environment: GitHub-hosted checks and local Node.js test environment; report prepared 2026-09-30
- Tester / Agent: Independent QA Agent
- Date: 2026-09-30

## Scope

Verify Issue #290 AC-03 after PR #291 activated the dependency bootstrap on the default branch: the trusted readiness workflow must pass for valid linked-Issue #283 metadata on PR #289, malformed frontmatter must remain fail-closed, and applicable local tests/validators must pass. This report records evidence only; it does not change task-state, Issue/PR state, project status, or task log.

## Test Summary

| Type | Total | Passed | Failed | Blocked | Notes |
|---|---:|---:|---:|---:|---|
| Unit | 60 | 60 | 0 | 0 | Focused readiness/check/project-state suites; includes malformed YAML and schema-negative cases |
| API | 0 | 0 | 0 | 0 | Not applicable to the workflow change |
| E2E | 1 | 1 | 0 | 0 | Hosted post-activation `work-item-readiness-freshness` evaluation for PR #289 |
| Regression | 0 | 0 | 0 | 0 | Full suite was not rerun for this focused post-activation verification; prior #290 QA report recorded 794/794 before activation |

## PR/Issue Comment Summary

**Overall Status:** Pass — AC-03 verified after default-branch activation.

| Type | Total | Passed | Failed | Blocked |
|---|---:|---:|---:|---:|
| Unit | 60 | 60 | 0 | 0 |
| API | 0 | 0 | 0 | 0 |
| E2E | 1 | 1 | 0 | 0 |
| Regression | 0 | 0 | 0 | 0 |

**Defect Severity Summary:** Critical: 0 · High: 0 · Medium: 0 · Low: 0 · Informational: 0

**Tester's Note:** PR #291 merged at `2026-09-30T10:27:07Z` as `4762249d71f467b16a4fb4f77884352cb5a7a605`. After activation, PR #289's required `work-item-readiness-freshness` check passed on PR head `3abda91c695884443abb11502b3461747f7de8cf`; workflow run [36726106436](https://github.com/chakrits/AI-Agent-Workflow/actions/runs/36726106436) was observed at `2026-09-30T14:02:34Z`. The PR checks are also visible at [PR #289 checks](https://github.com/chakrits/AI-Agent-Workflow/pull/289/checks). PR #289 later merged at `2026-09-30T14:19:26Z` as `8cc2705b1a4bc53a50a8b4ce82f775c4fbd44307`. The local test checkout was `966dbfdc0407190ee8e0f2b2cdf87419c28e2238`; the readiness-related code, workflow, and tests matched `origin/main` at the Build/Version SHA above. Local `validate:contracts` passed with existing non-failing AJV `date-time` format warnings.

## Failed Tests / Defects

**Defect Severity Count:** Critical: 0 · High: 0 · Medium: 0 · Low: 0 · Informational: 0

| ID | Scenario | Expected | Actual | Severity | Evidence |
|---|---|---|---|---|---|
| — | No failures observed in this verification | All listed focused checks pass; malformed frontmatter fails closed | Expected results observed | — | Hosted run and local command results below |

## Coverage

- Acceptance criteria covered:
  - AC-03 — **PASS:** after PR #291 reached `main`, the fresh `work-item-readiness-freshness` evaluation succeeded for valid linked Issue #283 / PR #289 metadata; malformed YAML and schema-invalid frontmatter still fail closed in local tests; applicable workflow/contract validators pass.
- Not covered: No full `npm test` run was repeated after activation. The previous QA report records 794/794 before activation; this report relies on focused negative-path tests plus the fresh hosted integration result for AC-03.
- Regression risk: Low for the scoped dependency bootstrap. The post-activation hosted check verifies the actual trusted workflow path; local negative cases protect malformed metadata handling.

## Verification Evidence

| Command / Evidence | Result |
|---|---|
| `node --test test/work-item-readiness-check.test.mjs test/work-item-readiness.test.mjs test/validate-project-state.test.mjs` | PASS — 60/60; includes TC-016 malformed YAML fail-closed and TC-017 schema violation fail-closed |
| `npm run validate:project-state` | PASS |
| `npm run validate:contracts` | PASS; emitted existing non-failing AJV `date-time` warnings |
| `npm run validate:ci-parity` | PASS |
| `npm run validate:workflow-evidence` | PASS |
| Hosted `work-item-readiness-freshness` on PR #289 | PASS after PR #291 activation; run [36726106436](https://github.com/chakrits/AI-Agent-Workflow/actions/runs/36726106436), PR head `3abda91c695884443abb11502b3461747f7de8cf` |

## Release Recommendation

Go for AC-03 verification. This QA result is not itself a task-state mutation. `docs/contracts/bug-fix-workflow.yaml` requires `closeout_evidence` for the `handoff -> completed` transition; the Issue #290 task-state shard remains `handoff` until the Orchestrator records this QA report as durable closeout evidence and performs the permitted transition.

## Notes

- PR #291 merge evidence: [PR #291](https://github.com/chakrits/AI-Agent-Workflow/pull/291), merge commit `4762249d71f467b16a4fb4f77884352cb5a7a605`, merged `2026-09-30T10:27:07Z`.
- PR #289 merge evidence: [PR #289](https://github.com/chakrits/AI-Agent-Workflow/pull/289), merge commit `8cc2705b1a4bc53a50a8b4ce82f775c4fbd44307`, merged `2026-09-30T14:19:26Z`.
- Build/Version main SHA: `4f3210c4df444dd7f7edf8b485c4cbc450295cf4`.
- No GitHub state, task-state, `PROJECT_STATUS.md`, or `TASK_LOG.md` was modified as part of this QA report.
