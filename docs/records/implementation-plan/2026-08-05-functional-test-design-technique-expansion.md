# Implementation Plan

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | https://github.com/chakrits/AI-Agent-Workflow/issues/143 |
| Change Type | Framework / Meta Change (skill/catalog content only, no target-app code) |
| Risk Level | Low — documentation/instruction content only |
| Owner | Documentation Agent (authoring) |
| Target Branch | `feature/functional-test-design-technique-expansion` |

## 2. Background

Boss supplied an external `skill.md` example (a "Software Testing & Quality Assurance Agent Skill Guide") intended as a reference for improving this repo's own QA/testing skills. It was screened section by section against the existing `functional-test-design`, `test-quality-discipline`, and `qa-playwright-testing` skills before adopting anything.

### Screening outcome

Adopted (3 items — genuine gaps, confirmed by grep against the whole skill catalog):

- **Decision Table Testing** — no equivalent technique exists anywhere in `functional-test-design` today. Directly relevant to this repo's own e-claim/insurance domain, where claim-eligibility rules are naturally multi-condition matrices (policy status × claim type × membership tier × remaining limit) that BVA/EP alone do not model well.
- **State Transition Testing** — also absent. Relevant to claim-status lifecycles (submitted → under review → approved/rejected → paid → closed) where illegal-transition defects (e.g. `paid → submitted`) are a real QA concern.
- **Determinism + Explicit Test Data worked example** — `functional-test-design`'s existing Output Quality Rules #6/#7 already state the underlying rule ("Expected result must be specific and verifiable"; "Empty cells not allowed") but had no concrete bad/good contrast. Adding one worked example (`"System displays an error"` vs `"HTTP 400 with INVALID_AMOUNT error code"`; `amount = bad_value` vs `amount = -500.00 THB`) follows the same "Worked Example" enrichment pattern already used for the Issue #139 API skill batch.

Rejected, with reasons (not adopted):

| Item | Reason |
|---|---|
| Gherkin/BDD as a default/core deliverable | Conflicts with `qa-playwright-testing`'s existing, deliberate decision that Gherkin is opt-in only (Necessity Check + Scenario Approval Gate), not a default pipeline step. Re-introducing it as unconditional in `functional-test-design` would create two conflicting sources of truth. |
| Operational Workflow (ASCII diagram, Step 1–4) | Duplicates `functional-test-design`'s own existing Workflow section (Step 1–6) with no new content. |
| Qualitative Risk Score (High/Medium/Low only) | Inferior to the existing Likelihood × Impact (1–25) quantitative model already in `functional-test-design`. |
| "Always be exhaustive on edge cases regardless of what's asked" | Conflicts with this repo's own anti-scope-creep principle (`CLAUDE.md`) and the existing Full/Focused Mode risk-based technique selection. |
| Explicit "Test Type" column in the test-case table | Redundant — already encoded by the `TC-HC-`/`TC-NEG-`/`TC-BVA-` ID prefix convention. |
| Role & Identity / Skill Matrix diagram | Duplicates `AGENT_PERSONAS.md` + `role-definitions.md`; decorative, no operational rule content. |
| Test-case execution-order independence | Initially flagged as a gap; grep confirmed `functional-test-design` already carries Pre-condition/Post-condition fields at both flow and test-case level, which covers the same intent. Dropped. |
| "Dependency Failures" as a first-class negative-case row | Initially flagged; already covered by the existing "Backend/API error, if applicable" bullet under Negative Case — a naming-only change with no new coverage. Dropped for consistency with rejecting the same cosmetic-cost trade elsewhere in this batch. |

### Deliberately out of scope for this Issue

A separate, unrelated gap was found during this same review cycle: `functional-test-design`'s Coverage Matrix has no column tracking whether a given Test Case ID is actually backed by an automated test (`tdd-implementation`, `qa-playwright-testing`, and `test-quality-discipline` never cross-reference `TC-*` IDs at all). This is being tracked as a **separate follow-up Issue** (not yet opened) rather than bundled here, because:

- It touches a different part of the same Coverage Matrix table (new `Automated` / `Test Ref` columns vs this Issue's new `Decision Table` / `State Transition` columns) — bundling both in one PR risks a merge collision on the same table and mixes two unrelated acceptance-criteria sets.
- This Issue's two new techniques are the higher-value, domain-relevant item and should land first; the follow-up Issue will build on top of this Issue's already-updated Coverage Matrix shape.

## 3. Design Decision: avoid renumbering `function-test-report.md`

The template currently has 18 flat-numbered sections (`## 1.` … `## 18.`). `test/validate-contracts.test.mjs` was checked and asserts no section numbers today, so renumbering would not break a test — but it is avoided anyway to keep the diff small and to avoid touching section 15 (Coverage Matrix) any more than necessary, since the follow-up traceability Issue will edit that same section next.

Approach: rename section 10 from "BVA / EP Analysis" to **"Test Design Techniques"** and add two new subsections after the existing Boundary Value Analysis / Equivalence Partitioning subsections — Decision Table Testing and State Transition Testing. Sections 11–18 keep their existing numbers.

## 4. Task Breakdown

| Task ID | Task | Files | Verification |
|---|---|---|---|
| IMP-301 | Add "Decision Table Testing" technique (condition columns × action columns, rule ID convention) to Step 4 technique list and a new Test Design Rules subsection | `.agents/skills/functional-test-design/SKILL.md` | Content-assertion test |
| IMP-302 | Add "State Transition Testing" technique (states, valid/invalid transitions, guard conditions) | `.agents/skills/functional-test-design/SKILL.md` | Content-assertion test |
| IMP-303 | Add Naming Convention rows: `TC-DT-xxx`, `TC-ST-xxx` | `.agents/skills/functional-test-design/SKILL.md` (Naming Convention table) | Content-assertion test |
| IMP-304 | Add Determinism + Explicit Test Data worked example to Output Quality Rules #6/#7 | `.agents/skills/functional-test-design/SKILL.md` | Content-assertion test |
| IMP-305 | Rename template section 10 to "Test Design Techniques"; add Decision Table and State Transition subsection tables | `.agents/skills/functional-test-design/templates/function-test-report.md` | Content-assertion test |
| IMP-306 | Add 2 columns to Coverage Matrix (section 15): `Decision Table` \| `State Transition` | `.agents/skills/functional-test-design/templates/function-test-report.md` | Content-assertion test |
| IMP-307 | Mirror all changed files byte-identical to `.claude/skills/` and `.agent/skills/` | 3 platform dirs | `npm run validate:skill-parity` |
| IMP-308 | Update `SKILL_CATALOG.md` `functional-test-design` Detail cell to mention the 2 new techniques | `docs/operating-model/SKILL_CATALOG.md` | Content-assertion test |
| IMP-309 | Regression tests: new techniques present, `TC-DT-`/`TC-ST-` naming present, worked example present, byte-parity across 3 platforms | `test/validate-contracts.test.mjs` | New tests fail before, pass after; `npm test` green |
| IMP-310 | Confirm `role-definitions.md` untouched this round | — | `npm run validate:context-budget` unaffected (no budget-tracked file edited) |
| IMP-311 | Write implementation plan (this doc) + open GitHub Issue per `.github/ISSUE_TEMPLATE/work-item.md` + work-item traceability record + `PROJECT_STATUS.md`/`TASK_LOG.md` update | `docs/records/implementation-plan/`, GitHub Issue, `docs/records/work-items/`, `PROJECT_STATUS.md`, `TASK_LOG.md` | Issue follows template exactly; records cross-reference each other |

## 5. Test Strategy

| Check | Expectation |
|---|---|
| `npm test` | Increases by the count of new regression tests added in IMP-309; all green |
| `npm run validate:skill-parity` | Stays fully in sync (no new skill directory added this round, only an existing skill's `SKILL.md` + template changed across 3 platforms) |
| `npm run validate:context-budget` | Unchanged — this batch does not edit `role-definitions.md`, `AGENTS.md`, or any other budget-tracked file |
| `npm run validate:contracts` | Unaffected — no contract/schema file touched |

## 6. Risks

| Risk | Mitigation |
|---|---|
| Coverage Matrix column collision with the deferred TC-ID traceability follow-up Issue | Land this Issue first; follow-up Issue's plan will explicitly build on the post-merge Coverage Matrix shape |
| Scope creep re-litigating already-rejected items (Gherkin, ASCII workflow diagram, etc.) | Screening table in Section 2 above records the rejection reasoning so it isn't re-argued mid-implementation |

## 7. Review Plan

Self-review record at `docs/records/qa/2026-08-05-functional-test-design-technique-expansion-code-review.md` before PR, following the same CR-NNN finding format used for Issues #139/#140. An independent (non-self) review pass before merge, per Boss's established preference for this repo's meta-work.
