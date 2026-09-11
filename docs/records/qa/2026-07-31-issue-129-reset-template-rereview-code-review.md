# Issue #129 Reset-to-Template Re-review

## 1. Review Context

| Item | Detail |
|---|---|
| Work Item | GitHub Issue #129 |
| Reviewer Role | Reviewer — independent re-review; did not implement the fixes |
| Change Type / Risk | Framework / Meta Change; Medium planned risk with destructive local apply behavior |
| Branch / Reviewed Commit | `codex/issue-129-reset-template` / `af20850a26c2d48a40e96e7d9cf5cbb95fce77e1` |
| Fix Range | `5ffb284..af20850` |
| Original Review | `docs/records/qa/2026-07-31-issue-129-reset-template-code-review.md` |
| Acceptance-Criteria Source | `docs/records/implementation-plan/2026-07-28-reset-to-template-history-scrub.md` |
| Files Reviewed | `scripts/reset-to-template.mjs`; `test/reset-to-template.test.mjs`; effect on the original `d10f579..a0bbc7d` range |
| Gate Verdict | **PASS** |
| Next Owner | QA Agent |

## 2. Re-review Scope and Result

The fix adds a complete preflight over every declared reset target before inventory or mutation. It rejects symbolic links in any existing target path component and verifies resolved components remain beneath the resolved repository root. The CI scanner now combines GitHub Actions `run:` and GitLab `script:` block scalars before checking for a reset command plus `--apply`.

The Reviewer re-derived both results in disposable fixtures and did not rely on Developer evidence. No Critical, Major, Minor, or Question findings remain in the fix range. No implementation files were changed by the Reviewer.

## 3. Finding-by-Finding Closure

| Finding ID | Prior Severity | Closure | Independent Evidence | Regression Effect |
|---|---|---|---|---|
| CR-129-001 | Critical | **CLOSED** | A clean committed fixture replaced the parent path component `docs/records` with a symlink to an outside directory. `node scripts/reset-to-template.mjs --apply --confirm-reset` exited 1 with `symlinked target path is not allowed`; the outside binary sentinel remained byte-identical, the symlink remained intact, and all top-level declared stub files remained byte-identical. This is stricter than the original direct-target symlink repro and proves preflight occurs before partial mutation. | Ordinary clean apply/idempotency, dirty tracked/staged/untracked refusal, QA preservation, and dry-run behavior remain green in the 18 focused tests and 302-test suite. |
| CR-129-002 | Major | **CLOSED** | Disposable GitHub and GitLab fixtures covered folded and literal block scalars, chomping modifiers, npm-script and direct-node forms. The scanner returned all destructive workflow files and omitted a harmless dry-run workflow. | Existing repository CI remains free of destructive reset invocation; same-line matching remains supported because physical lines are still scanned. |

## 4. Acceptance-Criteria Mapping

| AC | Re-review Status | Evidence |
|---|---|---|
| AC-06 | **PASS** | Existing tracked/staged/untracked refusal tests pass. The independent committed parent-component symlink fixture additionally exits non-zero before mutation, preserves the outside sentinel byte-for-byte, and leaves every sampled declared target unchanged. |
| AC-10 | **PASS** | GitHub/GitLab folded and literal npm/direct-node destructive forms are detected; harmless dry-run forms are not detected. Focused CI tests and the independent fixture both pass. |
| AC-01–AC-05, AC-07, AC-09, AC-11 | **NO REGRESSION FOUND** | The focused reset suite passes 18/18 and the full suite passes 302/302. Static review found no scope expansion beyond the two remedies. |
| AC-08 | **PASS FOR NORMAL TIP GATES IN RE-REVIEW SCOPE** | Full `npm test` passes 302/302. `validate:review-gate` is intentionally rerun after this new tip review record is committed. Post-reset disposable-clone validation remains part of independent QA evidence rather than this narrowly scoped fix re-review. |
| AC-12 | **PASS FOR REVIEWER GATE** | Independent Reviewer evidence now precedes QA; no destructive command was run in the real worktree. Independent QA and human merge approval remain required. |

## 5. Verification Evidence

| Command / Experiment | Result |
|---|---|
| `git status --short --branch`; `git rev-parse HEAD` | Correct branch and `af20850a26c2d48a40e96e7d9cf5cbb95fce77e1`; clean start |
| `git diff 5ffb284..af20850`; `git diff --check 5ffb284..af20850` | Two intended files reviewed; diff check PASS |
| Independent committed parent-component symlink fixture | PASS — exit 1; outside sentinel byte-identical; zero sampled partial mutation |
| Independent GitHub/GitLab folded/literal scanner fixture | PASS — destructive npm/direct-node forms detected; harmless dry run omitted |
| `node --test test/reset-to-template.test.mjs` | PASS — 18/18 |
| `npm test` | PASS — 302/302 |
| `npm run validate:review-gate` before this record | Expected FAIL — fix tip had script changes without a new tip review record |
| `npm run validate:review-gate` after this record commit | Required post-commit check; result recorded in final Reviewer handoff |
| `git diff --check` | PASS before record commit; required again after commit |

## 6. Review Dimensions and Residual Risk

- Correctness and security boundary: both blocking fail paths now fail closed before mutation.
- Tests: focused regressions cover the original direct-target symlink and CI scalar failures; the independent fixture adds a parent-component symlink adversary.
- Maintainability: target validation is separated from deletion and invoked by both planning and apply entry points.
- Dependencies and dead code: no dependencies were added or bumped; no dead code was identified in the fix range.
- Performance and compatibility: preflight adds bounded filesystem metadata checks over the fixed declared-target list; no material performance or backward-compatibility risk was found.
- Residual risk: the CI check is a conservative textual YAML block-scalar scanner rather than a complete YAML/shell parser. Dynamic command construction, YAML aliases, included GitLab configs, or nonstandard CI systems are outside AC-10's stated GitHub/GitLab invocation scope.
- Residual gate: post-reset disposable-clone full validators are not repeated by this narrow re-review and remain QA evidence required before human merge approval.

## 7. Review Decision and Handoff

**Decision: PASS — CR-129-001 and CR-129-002 are closed; no blocking findings remain.**

| Item | Value |
|---|---|
| Required artifact | This new tip code-review record |
| Quality gate | Reviewer gate passes subject to the post-commit `validate:review-gate` check |
| Next Action | Independently execute the full AC and post-reset disposable-clone QA plan |
| Next Owner | QA Agent |
| Human Gate | Human Maintainer retains merge/release approval |

## 8. Completion Check

| Item | Status | Notes |
|---|---|---|
| Scope Match | PASS | Re-reviewed only the requested fix range and its effect on the original findings |
| Source Grounding | PASS | Original review remedies and implementation-plan AC boundaries govern |
| Artifact Complete | PASS | Closure evidence, AC mapping, regression impact, commands, risks, and handoff are recorded |
| Quality Gate | PASS | No Critical or Major findings remain; post-commit mechanical gate is mandatory |
| No Unsafe Action | PASS | Destructive apply ran only in disposable temporary fixtures |
| Minimal Change | PASS | Reviewer adds only this record |
| Risks / Limitations | RECORDED | Textual CI scanner and remaining independent QA scope are explicit |
| Next Owner | QA Agent | Human merge approval remains mandatory after QA |
