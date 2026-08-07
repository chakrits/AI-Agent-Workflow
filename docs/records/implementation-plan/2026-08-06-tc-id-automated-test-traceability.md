# Implementation Plan

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | https://github.com/chakrits/AI-Agent-Workflow/issues/149 |
| Change Type | Framework / Meta Change (skill/template content only, no target-app code) |
| Risk Level | Low |
| Owner | Documentation Agent (authoring) |
| Target Branch | `feature/tc-id-automated-test-traceability` |

## 2. Background

During the Issue #143 screening discussion, a real, separate gap was found: no skill or template anywhere cross-references a QA Test Case ID (`TC-HC-xxx`, `TC-NEG-xxx`, etc.) to an actual automated test in the codebase. `functional-test-design`'s own Traceability Matrix (Requirement → Test Case IDs) and Coverage Matrix (Requirement/Function × technique) track requirement-level and technique-level coverage, but neither tracks whether a given TC-ID is actually backed by an automated test — and `tdd-implementation`, `qa-playwright-testing`, and `test-quality-discipline` never mention TC-IDs at all. A test case can be marked "Covered" in the Coverage Matrix while no automated test in the repository actually exercises it, and nothing catches that gap.

An initial proposal — have Developer Agent cite the TC-ID in `tdd-implementation`'s RED step — was rejected during the Issue #143 discussion after an advisor review found it incoherent: Developer Agent's existing Definition-of-Done Restatement rule (`docs/workflow/role-definitions.md`) sources acceptance criteria from BA Agent's requirement record, not QA's test design, and no canonical phase ordering guarantees `functional-test-design` runs before `phase:development`. The corrected, narrower design puts the fix entirely on QA's side: QA fills in the traceability during verification, when the automated test (if any) already exists to be found — no new Developer obligation, no phase-ordering dependency.

This Issue was deliberately deferred until Issue #143 merged, to avoid two Issues editing the same Coverage Matrix table (section 15 of `templates/function-test-report.md`) concurrently. Issue #143 has since merged (PR #145) and added `Decision Table`/`State Transition` columns to that table; this Issue adds 2 more columns after those, no conflict.

## 3. Scope

### In scope

- Add 2 columns to the Coverage Matrix (section 15 of `templates/function-test-report.md`): `Automated (Y/N)` | `Test Ref (path) or N/A — reason`
- Add one checklist item to `test-quality-discipline`'s existing review checklist: verify that TC-IDs traced in the Coverage Matrix are actually exercised by an automated test, flag a gap as a defect routed to Developer Agent (consistent with the skill's existing "QA Agent does not edit Developer Agent's test files" boundary)
- No new template file — QA records the finding in `TEST_REPORT.md`'s existing `## Coverage` section, which already has an "Acceptance criteria covered / Not covered" shape
- Regression tests in `test/validate-contracts.test.mjs`

### Out of scope

- Any change to `tdd-implementation` (rejected during the Issue #143 discussion — would create a Developer-side obligation with no reliable phase-ordering guarantee)
- Any change to `qa-playwright-testing` (E2E-specific TC-ID linkage was discussed but not decided; can be a future follow-up if the need proves real, not assumed here)
- Any change to `role-definitions.md`, `AGENTS.md`, or any other context-budget-tracked file
- The Defect Analysis skill (separate, larger, already-queued future Issue)

## 4. Task Breakdown

| Task ID | Task | Files | Verification |
|---|---|---|---|
| IMP-501 | Add `Automated (Y/N)` / `Test Ref (path) or N/A — reason` columns to Coverage Matrix (section 15), after the existing `Decision Table`/`State Transition` columns | `.agents/skills/functional-test-design/templates/function-test-report.md` | Content-assertion test |
| IMP-502 | Add a checklist item to `test-quality-discipline`'s review checklist for TC-ID → automated-test verification | `.agents/skills/test-quality-discipline/SKILL.md` | Content-assertion test |
| IMP-503 | Mirror both changed files byte-identical to `.claude/skills/` and `.agent/skills/` (only `SKILL.md` for `test-quality-discipline`; `function-test-report.md` follows `functional-test-design`'s existing canonical-only-in-`.agents/` convention, confirmed in Issue #143's implementation) | 3 platform dirs (`test-quality-discipline/SKILL.md` only) | `npm run validate:skill-parity` |
| IMP-504 | Regression tests: new Coverage Matrix columns present, new checklist item present, byte-parity for `test-quality-discipline` | `test/validate-contracts.test.mjs` | New tests fail before, pass after; `npm test` green |
| IMP-505 | Write implementation plan (this doc) + open GitHub Issue per `.github/ISSUE_TEMPLATE/work-item.md` + work-item traceability record + `PROJECT_STATUS.md`/`TASK_LOG.md` update | `docs/records/implementation-plan/`, GitHub Issue, `docs/records/work-items/`, `PROJECT_STATUS.md`, `TASK_LOG.md` | Issue follows template exactly; records cross-reference each other |

## 5. Test Strategy

| Check | Expectation |
|---|---|
| `npm test` | Increases by the count of new regression tests added in IMP-504; all green |
| `npm run validate:skill-parity` | Stays fully in sync — `test-quality-discipline` is an existing mirrored skill, no new skill directory added |
| `npm run validate:context-budget` | Unaffected — this batch does not edit any budget-tracked file |
| `npm run validate:contracts` | Unaffected — no contract/schema file touched |

## 6. Risks

| Risk | Mitigation |
|---|---|
| Coverage Matrix column collision with Issue #143's `Decision Table`/`State Transition` columns | Issue #143 already merged; this Issue's new columns are appended after those, confirmed by reading the current table before drafting this plan |
| QA treating "Automated: N/A — reason" as a failing gate | Explicitly not a gate — this is a QA-recorded observation for traceability/regression-suite health, not a merge-blocking check; stated plainly in the skill content to avoid it being mistaken for one |

## 7. Review Plan

Self-review record at `docs/records/qa/2026-08-06-tc-id-automated-test-traceability-code-review.md` before PR, same CR-NNN format as prior batches.
