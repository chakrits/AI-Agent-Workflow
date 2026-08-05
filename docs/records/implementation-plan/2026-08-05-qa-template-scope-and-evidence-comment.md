# Implementation Plan

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | https://github.com/chakrits/AI-Agent-Workflow/issues/144 |
| Change Type | Framework / Meta Change (template content only, no code) |
| Risk Level | Low |
| Owner | Documentation Agent (authoring) |
| Target Branch | `feature/qa-template-scope-and-evidence-comment` |

## 2. Background

Boss supplied 3 external template examples ("Test Approach", "Test Report Summary", "Defect Report") for screening against this repo's existing QA templates. Screened against `docs/templates/TEST_PLAN.md`, `docs/templates/TEST_REPORT.md`, `docs/templates/REPRO_STEPS.md`, `docs/templates/BUG_POSTMORTEM.md`, `debugging-discipline`'s ownership of `REPRO_STEPS.md`, and `docs/operating-model/SKILL_CATALOG.md`'s Planned Skills table.

Two of the three items are small enrichments to existing templates (this Issue). The third ("Defect Report") maps to a much larger, pre-existing gap — the long-Planned-but-never-built "Defect Analysis" skill — and per Boss's instruction is deliberately **not** in this Issue; it will be its own separate, larger Issue queued after this one and after the deferred TC-ID traceability Issue.

### Screening outcome for this Issue

| Item | Existing template | Gap found | Fix |
|---|---|---|---|
| Test Approach | `TEST_PLAN.md` | Already covers Test Types checklist, Environment, Entry/Exit Criteria (≈ Definition of Done), Related Artifacts. Missing: no explicit "Scope (In/Out)" section — Entry/Exit Criteria is a different concept (test-readiness gate, not feature scope), and `WORK_ITEM.md`'s Scope In/Out is Issue-level, not test-round-level | Add a `## Scope` section (In-Scope / Out-of-Scope bullets) to `TEST_PLAN.md` |
| Test Report Summary | `TEST_REPORT.md` | Full detail already exists, but this example is explicitly meant as a condensed **PR/Issue comment**, a different artifact position from the full internal report file. QA's Cross-Platform Acceptance Criteria Gate already requires a "QA Evidence comment" on the PR/Issue, but no canonical shape exists for it — this session's own QA evidence comments (Issues #139/#140) were free-form prose | Add a "PR/Issue Comment Summary" subsection to `TEST_REPORT.md` (condensed banner + metrics table + defect-severity summary + tester's note) for QA to copy directly into a PR/Issue comment; add an aggregated Critical/High vs Medium/Low defect-count line above the existing Failed Tests table |

### Explicitly not in this Issue

- "Defect Report" → deferred to its own future Issue building the Planned `defect-analysis` skill (`docs/operating-model/SKILL_CATALOG.md`'s Planned Skills table, purpose: "Analyze test failures, logs, screenshots, reproduce steps, severity") plus a new `docs/templates/DEFECT_REPORT.md`, distinct from Developer Agent's `debugging-discipline`-owned `REPRO_STEPS.md` (used only once a bug is already assigned to Dev for root-cause investigation) and from `BUG_POSTMORTEM.md` (post-fix retrospective). Not started; queued after the deferred TC-ID traceability Issue.
- No change to any severity taxonomy — if/when `defect-analysis` is built, it should reuse Security Reviewer's existing Critical/High/Medium/Low/Informational scale rather than inventing a third one alongside `code-review-gate`'s Critical/Major/Minor/Question.

## 3. Task Breakdown

| Task ID | Task | Files | Verification |
|---|---|---|---|
| IMP-401 | Add `## Scope` section (In-Scope / Out-of-Scope) to `TEST_PLAN.md`, placed after Metadata and before Test Types In Scope | `docs/templates/TEST_PLAN.md` | Content-assertion test |
| IMP-402 | Add "PR/Issue Comment Summary" subsection to `TEST_REPORT.md` (Overall Status banner, condensed metrics table, defect-severity summary, tester's note) | `docs/templates/TEST_REPORT.md` | Content-assertion test |
| IMP-403 | Add an aggregated defect-severity-count line above the existing Failed Tests / Defects table in `TEST_REPORT.md` | `docs/templates/TEST_REPORT.md` | Content-assertion test |
| IMP-404 | Regression tests for IMP-401/402/403 | `test/validate-contracts.test.mjs` | New tests fail before, pass after; `npm test` green |
| IMP-405 | Write implementation plan (this doc) + open GitHub Issue per `.github/ISSUE_TEMPLATE/work-item.md` + work-item traceability record + `PROJECT_STATUS.md`/`TASK_LOG.md` update | `docs/records/implementation-plan/`, GitHub Issue, `docs/records/work-items/`, `PROJECT_STATUS.md`, `TASK_LOG.md` | Issue follows template exactly; records cross-reference each other |

Note: these templates (`docs/templates/`) are not skill files, so no `.claude/`/`.agent/` mirroring or `validate:skill-parity` step applies to this Issue.

## 4. Test Strategy

| Check | Expectation |
|---|---|
| `npm test` | Increases by the count of new regression tests added in IMP-404; all green |
| `npm run validate:context-budget` | Unaffected — `docs/templates/*.md` is not a budget-tracked file |
| `npm run validate:contracts` | Unaffected — no contract/schema file touched |

## 5. Risks

| Risk | Mitigation |
|---|---|
| Confusing this Issue's small template edits with Issue #143's `functional-test-design` technique work or the still-unopened `defect-analysis`/TC-ID-traceability Issues | Separate branch (`feature/qa-template-scope-and-evidence-comment`), separate Issue, separate work-item record — no file overlap with #143's `.agents/skills/functional-test-design/` changes |

## 6. Review Plan

Self-review record at `docs/records/qa/2026-08-05-qa-template-scope-and-evidence-comment-code-review.md` before PR, same CR-NNN format as prior batches.
