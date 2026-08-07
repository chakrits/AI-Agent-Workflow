# Implementation Plan

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | https://github.com/chakrits/AI-Agent-Workflow/issues/152 |
| Change Type | Framework / Meta Change (skill/template authoring, no target-app code) |
| Risk Level | Low |
| Owner | Documentation Agent (authoring) |
| Target Branch | `feature/defect-analysis-skill` |

## 2. Background

`SKILL_CATALOG.md`'s Planned Skills table has carried "Defect Analysis" (`.agents/skills/defect-analysis/`, purpose: "Analyze test failures, logs, screenshots, reproduce steps, severity") unbuilt for a long time — `qa-playwright-testing`'s own catalog row already routes to it as a "Next Skill/Agent" for E2E failures, so the routing intent exists, just no content.

Confirmed during the Issue #144 template-screening discussion that no QA-owned defect-report artifact exists in this repo: `REPRO_STEPS.md` is `debugging-discipline`-owned (Developer Agent, used only once a bug is already assigned for investigation), `BUG_POSTMORTEM.md` is a post-fix retrospective, and `TEST_REPORT.md`'s Failed Tests table is a one-row summary with no room for reproduction detail.

### Source screened this round

`microsoft/skills`'s [`github-issue-creator`](https://github.com/microsoft/skills/blob/main/.github/skills/github-issue-creator/SKILL.md) (MIT license) was reviewed. It is not a defect-*analysis* skill (it converts messy raw input — voice notes, error pastes — into a formatted GitHub issue), so most of it does not apply, but 3 elements were adopted and 2 were rejected:

**Adopted:**
- A `Summary` field at the top of the report — a one-line gap `DEFECT_REPORT.md` didn't have
- A concrete severity-to-impact worked mapping (Critical = service down/data loss/security; High = major feature broken, no workaround; Medium = feature impaired, workaround exists; Low = cosmetic) — this translates Security Reviewer's existing Critical/High/Medium/Low/Informational scale (calibrated to exploit/blast-radius) into functional-defect terms, without inventing a new taxonomy
- A note to placeholder/redact sensitive data (`[USER_ID]`, `[POLICY_NUMBER]`) before attaching logs/screenshots — directly relevant to this repo's e-claim/insurance domain's PHI/PII handling

**Rejected:**
- "Infer missing context... fill in specifics" — conflicts directly with this repo's Evidence-Based Reporting rule ("Do not manufacture or suppress issues — report exactly what the evidence shows") and `functional-test-design`'s "Do not invent requirements" rule
- Output as a markdown file under an `/issues/` directory — conflicts with this repo's existing output-location conventions (`functional-test-design` writes to `docs/qa/function-test-reports/`; a defect report belongs either as a real GitHub Issue or under a matching `docs/qa/defect-reports/` path, not a new ad-hoc directory)

## 3. Scope

### In scope

- New skill `.agents/skills/defect-analysis/SKILL.md` — purpose, when-to-use, analysis method (logs/screenshots/network payload review), severity classification citing Security Reviewer's existing scale with the adopted functional-defect worked mapping
- New template `docs/templates/DEFECT_REPORT.md` — Summary, Description, Environment (OS/Browser/Device/Version, structured not flat), Steps to Reproduce, Expected/Actual Result, Attachments/Logs (with a worked-example JSON payload and the PII-placeholder note)
- Update `SKILL_CATALOG.md`: move "Defect Analysis" from Planned Skills to a real entry; update the Superseded/Note paragraph that currently describes it as still-unbuilt; update `qa-playwright-testing`'s row to point at the real skill
- Add one row to QA Agent's Skill Routing table (`docs/workflow/role-definitions.md`, mirrored in `.claude/agents/qa-agent.md`)
- Mirror `defect-analysis/SKILL.md` byte-identical to `.claude/skills/` and `.agent/skills/` (template stays canonical-only in `.agents/`, per the convention confirmed in Issues #143/#149)
- Add a `microsoft/skills` (MIT) entry to `THIRD_PARTY_NOTICES.md`
- Regression tests in `test/validate-contracts.test.mjs`

### Out of scope

- No change to `TEST_REPORT.md`'s existing Failed Tests table (stays the summary roll-up; `DEFECT_REPORT.md` is the detailed artifact it can link to)
- No change to `debugging-discipline`/`REPRO_STEPS.md` (different owner, different lifecycle stage)
- No change to any severity taxonomy beyond citing Security Reviewer's existing scale — no 3rd taxonomy invented

## 4. Task Breakdown

| Task ID | Task | Files |
|---|---|---|
| IMP-601 | Write `defect-analysis/SKILL.md` | `.agents/skills/defect-analysis/SKILL.md` |
| IMP-602 | Write `DEFECT_REPORT.md` (Summary field, severity-to-impact worked mapping, PII-placeholder note, JSON payload worked example) | `docs/templates/DEFECT_REPORT.md` |
| IMP-603 | Mirror `SKILL.md` to `.claude/skills/`, `.agent/skills/` | 2 platform dirs |
| IMP-604 | Update `SKILL_CATALOG.md` (move Planned → real entry, fix Note paragraph, fix `qa-playwright-testing` row) | `docs/operating-model/SKILL_CATALOG.md` |
| IMP-605 | Add QA Skill Routing row | `docs/workflow/role-definitions.md`, `.claude/agents/qa-agent.md` |
| IMP-606 | Add `microsoft/skills` (MIT) attribution | `THIRD_PARTY_NOTICES.md` |
| IMP-607 | Regression tests | `test/validate-contracts.test.mjs` |
| IMP-608 | Plan (this doc) + open GitHub Issue + work-item record + `PROJECT_STATUS.md`/`TASK_LOG.md` | as usual |

## 5. Test Strategy

| Check | Expectation |
|---|---|
| `npm test` | Increases by the new regression test count; all green |
| `npm run validate:skill-parity` | 37/37 (one new skill directory) |
| `npm run validate:context-budget` | Small increase from `SKILL_CATALOG.md` + `role-definitions.md` edits — check before push, currently 28516/30000 (~4.9% headroom) |
| `npm run validate:contracts` | Unaffected |

## 6. Risks

| Risk | Mitigation |
|---|---|
| `role-definitions.md` + `SKILL_CATALOG.md` are both budget-tracked; headroom is down to ~4.9% after prior batches | Keep both edits to 1 line / 1 table row each; run `validate:context-budget` before pushing and report the exact number, don't assume unchanged like Issue #143's mistake |
| Confusing `DEFECT_REPORT.md` with `TEST_REPORT.md`'s existing Failed Tests table | State explicitly in both files that `TEST_REPORT.md` is the roll-up summary and `DEFECT_REPORT.md` is the per-defect detail it can link to |

## 7. Review Plan

Self-review record at `docs/records/qa/2026-08-06-defect-analysis-skill-code-review.md` written proactively before opening the PR (per the lesson from Issue #149, which passed CI on the first attempt this way).
