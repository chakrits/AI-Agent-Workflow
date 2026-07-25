# Improvement Plan: Vault Traceability + Kanban + Lessons Learned + Framework Metrics

**Date:** 2026-07-25
**Author:** Orchestrator Agent (Valentine)
**Status:** Draft — awaiting Boss approval
**Issue:** https://github.com/chakrits/AI-Agent-Workflow/issues/83
**Scope:** Consolidates 4 separate discussions from session 2026-07-25 into one coherent plan with Work Item traceability as the backbone.

## Problem Statement

Boss identified a critical gap: **closed issues cannot be traced back to their source plan, and plans in `docs/` cannot be traced forward to the issues they produced.** The vault index (`docs/vault/00-Index.md`) links to directories but not to individual records, so Obsidian's graph view cannot show the relationship between an Issue, its SDD, its PRs, its postmortem, and its lessons learned.

Evidence (checked against real repo state):

| Trace | Issue → SDD/Spec | Issue → Postmortem | SDD → Vault Index | Issue → Vault Index |
|-------|-----------------|-------------------|-------------------|-------------------|
| #59 (New Feature contract) | ✅ SDD exists | ❌ none | ❌ 0 links | ❌ 0 links |
| #49 (Worktree prune) | ❌ no SDD | ❌ none | ❌ 0 links | ❌ 0 links |
| #76 (Agent role review) | ✅ postmortem exists | ✅ exists | ❌ 0 links | ❌ 0 links |

Additional gaps:
- 87 TASK_LOG entries, 0 have skill notation before 2026-07-25 cutover
- 25,910 tokens of canonical reading — unmeasured until now
- No metrics dashboard for framework self-assessment
- No Kanban view — GitHub labels exist but no board
- No lessons learned vault — lessons scattered across memory + TASK_LOG + postmortem

## Architecture: Work Item Record as Backbone

The core fix is a **Work Item Record** — one file per issue that links all artifacts together. This file lives in the Obsidian vault and is the single point of traceability.

```
docs/records/work-items/YYYY-MM-DD-issue-NN.md
```

Every other improvement (Kanban, lessons, metrics, context budget) hooks into this record.

### Work Item Record Template

```markdown
# Work Item: Issue #NN — <title>

## Source
- Issue: <URL>
- Umbrella issue: <URL or N/A>
- Boss directive: <session date or N/A>

## Classification
- Change type: <New Feature / Bug Fix / Config Change / ...>
- Risk level: <Low / Medium / High>
- Workflow route: <BA → SA → Dev → QA → ...>

## Artifacts
- Requirement: [[../requirements/YYYY-MM-DD-slug]]
- SDD: [[../../superpowers/specs/YYYY-MM-DD-slug]]
- Implementation plan: [[../implementation-plan/YYYY-MM-DD-slug]]
- PRs: #NN, #NN, #NN
- Closeout PR: #NN
- Postmortem: [[../postmortem/YYYY-MM-DD-slug]] (or N/A)

## Sub-tasks
- Sub-A (#NN): <description> — [[../../scripts/...]]
- Sub-B (#NN): <description> — [[../../.agents/skills/.../SKILL.md]]

## Lessons Learned
- <lesson 1>
- <lesson 2>

## Metrics
- Tests before: NN → Tests after: NN (+N)
- Subagent timeouts: N
- Rework cycles: N

## Status: <Open / Closed (YYYY-MM-DD)>
```

---

## Improvement 1: Work Item Traceability (Backbone)

### What
Create `docs/records/work-items/` directory + `docs/templates/WORK_ITEM.md` template. Every new issue gets a work item record created at dispatch time.

### Why
Without this, closed issues are orphaned — you cannot trace from a postmortem back to the issue that spawned it, or from an SDD forward to the PRs that implemented it. The vault graph is disconnected.

### Real impact (checked against code)
- **Files to create:** 1 directory + 1 template + 1 vault index update + 1 skill patch
- **Files to modify:** `docs/vault/00-Index.md` (add work-items section), `.agents/skills/dynamic-workflow/SKILL.md` (add rule: create work item record when creating issue)
- **No code changes** — pure documentation + skill patch
- **Existing assets reused:** `docs/records/` taxonomy already exists, `docs/templates/` pattern already established (27 templates)

### Deliverables
1. `docs/records/work-items/.gitkeep`
2. `docs/templates/WORK_ITEM.md` — template (above)
3. `docs/vault/00-Index.md` — add `[[../records/work-items/|work-items/]]` section
4. `.agents/skills/dynamic-workflow/SKILL.md` — add Output Rule: "When creating a GitHub Issue, create a work item record at `docs/records/work-items/YYYY-MM-DD-issue-NN.md` using the WORK_ITEM.md template. Link the issue URL, SDD path, and all PR numbers."
5. Mirror skill patch to `.claude/skills/` + `.agent/skills/`

### Verification
- `npm run validate:skill-parity` passes (26/26 with work-items rule)
- `npm run validate:project-state` passes
- `npm test` passes
- Manual: create a work item record for Issue #76 (retroactive) and verify Obsidian graph shows Issue → postmortem → PRs → lessons

### Effort: 2 commits

---

## Improvement 2: Kanban Board View

### What
Create a GitHub Project board (Kanban) that maps existing `phase:*` labels to To Do / Doing / Done columns. No new tracking system — just a view on top of existing labels.

### Why
GitHub Issues have labels but no visual board. Boss cannot see at a glance what is To Do, Doing, Done. PROJECT_STATUS.md and TASK_LOG.md are text — they don't show flow.

### Real impact (checked against code)
- **Labels already exist:** `phase:requirements`, `phase:design`, `phase:planning`, `phase:development`, `phase:verification`, `phase:human-review`, `phase:blocked` — 7 labels ready
- **Blocker:** `gh project list` fails — token missing `read:project` scope. Must run `gh auth refresh -s read:project` first
- **No code changes** — GitHub UI only
- **Column mapping:**
  - **To Do:** `phase:requirements` + `phase:design` + `phase:planning` + no label (unclassified)
  - **Doing:** `phase:development` + `phase:verification`
  - **Review:** `phase:human-review` + `phase:blocked`
  - **Done:** closed issues

### Deliverables
1. `gh auth refresh -s read:project` (Boss action)
2. `gh project create --title "AI-Agent-Workflow Board" --owner @chakrits`
3. Configure columns: To Do, Doing, Review, Done
4. Add automation: issue with `phase:development` → moves to Doing; closed → moves to Done
5. Document in README: "View the board at <URL>"

### Verification
- Board URL accessible
- Open issues appear in correct columns
- Closed issues appear in Done

### Effort: 0 commits (GitHub UI) + 1 commit (README update)

---

## Improvement 3: Lessons Learned Vault

### What
Create `docs/records/lessons-learned/` directory + `docs/templates/LESSONS_LEARNED.md` template. Every session that produces a postmortem also gets a lessons learned entry linked from the work item record.

### Why
Lessons are currently scattered: Hermes memory (volatile), TASK_LOG Notes column (unsearchable), postmortem records (1 file). No single place to browse lessons by topic or date.

### Real impact (checked against code)
- **Files to create:** 1 directory + 1 template + 1 vault index update
- **Existing postmortem:** `docs/records/postmortem/2026-07-22-agent-role-review.md` — will get a lessons learned companion
- **Work item record (Improvement 1) links to this** — `## Lessons Learned` section points here
- **No code changes**

### Deliverables
1. `docs/records/lessons-learned/.gitkeep`
2. `docs/templates/LESSONS_LEARNED.md` — template:
   ```markdown
   # Lessons Learned: <session or topic>

   ## Date
   ## Work Items
   - Issue #NN — [[../work-items/YYYY-MM-DD-issue-NN]]

   ## Lessons
   | # | Lesson | Category | Evidence |
   |---|--------|----------|----------|
   | 1 | Context contradiction causes timeout | Subagent dispatch | Sub-D timeout, transcript log |

   ## Metrics Snapshot
   - Tests: NN → NN
   - Subagent timeouts: N
   - Rework cycles: N

   ## Memory Updated
   - [ ] Hermes memory updated with durable lessons
   - [ ] Skill patched if procedural lesson
   ```
3. `docs/records/lessons-learned/2026-07-25-p0-p2-session.md` — first entry (retroactive)
4. `docs/vault/00-Index.md` — add `[[../records/lessons-learned/|lessons-learned/]]` section

### Verification
- Vault index links to lessons-learned directory
- Work item record for #76 links to lessons learned entry
- Obsidian graph shows: Issue #76 → work item → lessons learned → postmortem

### Effort: 2 commits

---

## Improvement 4: Framework Metrics Dashboard

### What
Create `scripts/validate-metrics.mjs` that parses TASK_LOG.md and prints a dashboard of framework health metrics. Add `npm run validate:metrics` to CI.

### Why
The framework has 190 tests, 8 CI checks, 12 ADRs, 7 risks, 87 TASK_LOG entries — but no way to measure if the framework itself is working well. Metrics like rework rate, subagent timeout rate, and test growth trend are invisible.

### Real impact (checked against code)
- **TASK_LOG.md format:** `| Date | Work Item | Agent | Action | Result | Next Agent | Notes |` — fixed 7-column table, parseable by splitting on `|`
- **87 entries** — enough for meaningful metrics
- **Existing parsers:** `scripts/validate-skill-usage.mjs` already parses TASK_LOG rows — can reuse pattern
- **No dependencies** — pure Node.js, no external libraries

### Deliverables
1. `scripts/validate-metrics.mjs` — parses TASK_LOG, outputs:
   ```
   Framework Metrics Dashboard
   ===========================
   Total work items:          87
   Total PRs merged:          NN
   Average PRs per issue:      N.N
   Subagent timeouts:          2 (2.3%)
   Rework cycles:              1 (1.1%)
   Test count trend:           121 → 190 (+69, +57%)
   Skills added:               11 → 25 (+14)
   ADRs:                       12
   Risks tracked:              7 (6 open, 1 closed)
   Contracts:                  2
   CI checks:                  8
   ```
2. `docs/operating-model/METRICS.md` — baseline + targets
3. `package.json` — add `"validate:metrics": "node scripts/validate-metrics.mjs"`
4. `.github/workflows/validate-contracts.yml` + `.gitlab-ci.yml` — add CI step
5. `test/validate-metrics.test.mjs` — regression test

### Verification
- `npm run validate:metrics` prints dashboard
- `npm test` passes with new regression test
- CI runs `validate:metrics` on every push

### Effort: 3 commits

---

## Improvement 5: Context Budget Awareness

### What
Create `scripts/validate-context-budget.mjs` that counts approximate tokens of canonical reading files. Add `npm run validate:context-budget` to CI.

### Why
Canonical reading files total **103,641 chars ≈ 25,910 tokens** — that's ~13% of a 200K context window or ~52% of a 50K window. This cost is invisible and unmeasured. As the framework grows, this will silently degrade agent performance.

### Real impact (checked against code)
- **Files measured (real numbers):**
  - `AGENTS.md` → 15,344 chars ≈ 3,836 tokens
  - `docs/workflow/role-definitions.md` → 33,725 chars ≈ 8,431 tokens
  - `docs/operating-model/SKILL_CATALOG.md` → 18,663 chars ≈ 4,665 tokens
  - `docs/workflow/handoff-contract.md` → 5,016 chars ≈ 1,254 tokens
  - `docs/workflow/quality-gates.md` → 6,803 chars ≈ 1,700 tokens
  - `docs/workflow/dynamic-routing.md` → 8,077 chars ≈ 2,019 tokens
  - `docs/operating-model/AGENT_OPERATING_MODEL.md` → 6,062 chars ≈ 1,515 tokens
  - `docs/operating-model/AGENT_EVALUATION_CHECKLIST.md` → 9,951 chars ≈ 2,487 tokens
  - **Total: 103,641 chars ≈ 25,910 tokens**
- **No dependencies** — `wc -c` + divide by 4
- **No file changes** — measurement only

### Deliverables
1. `scripts/validate-context-budget.mjs` — counts tokens of canonical files, exits 1 if total > target (default: 30,000 tokens)
2. `docs/operating-model/CONTEXT_BUDGET.md` — baseline (25,910 tokens) + target (≤30,000) + per-file breakdown
3. `package.json` — add `"validate:context-budget": "node scripts/validate-context-budget.mjs"`
4. `.github/workflows/validate-contracts.yml` + `.gitlab-ci.yml` — add CI step
5. `test/validate-context-budget.test.mjs` — regression test

### Verification
- `npm run validate:context-budget` prints breakdown + total
- Exit 0 (current: 25,910 < 30,000 target)
- CI runs on every push

### Effort: 3 commits

---

## Implementation Order

Improvements are sequenced so each builds on the previous:

```
1. Work Item Traceability (backbone)
   ↓ creates the record that everything links to
2. Lessons Learned Vault
   ↓ links into Work Item Record's "Lessons Learned" section
3. Metrics Dashboard
   ↓ metrics snapshot embedded in Work Item Record + Lessons Learned
4. Context Budget
   ↓ standalone, but budget number referenced in Metrics Dashboard
5. Kanban Board
   ↓ GitHub UI, no code — but board URL added to PROJECT_STATUS.md
```

### Total deliverables

| # | Improvement | New files | Modified files | CI? | Effort |
|---|------------|-----------|---------------|-----|--------|
| 1 | Work Item Traceability | 2 (template + .gitkeep) | 2 (vault index + skill) | No | 2 commits |
| 2 | Lessons Learned Vault | 3 (template + .gitkeep + first entry) | 1 (vault index) | No | 2 commits |
| 3 | Metrics Dashboard | 3 (script + doc + test) | 3 (package.json + 2 CI) | Yes | 3 commits |
| 4 | Context Budget | 3 (script + doc + test) | 3 (package.json + 2 CI) | Yes | 3 commits |
| 5 | Kanban Board | 0 | 1 (README) | No | 0 commits + GitHub UI |
| **Total** | | **11 new files** | **10 modifications** | 2 new CI checks | **~10 commits** |

### What is NOT included (deliberately)

- **Skill Generation (1 canonical → 2 generated):** Requires ADR — architecture change, high risk if generator has bug. Deferred.
- **Visual Workflow Diagrams:** Mermaid already exists in SDD. Low value. Deferred.
- **Dispatch Receipt Tool:** Schema exists but 0 receipts. Tied to Hermes Kanban (runtime), not repo artifact. Deferred.
- **Onboarding Template:** `reset-to-template.mjs` already works. Wrapper is convenience, not traceability. Deferred.

## References

- Problem evidence: this document, Section "Problem Statement"
- Existing vault index: `docs/vault/00-Index.md`
- Existing templates: `docs/templates/` (27 templates)
- Existing records taxonomy: `docs/records/` (9 subdirectories)
- TASK_LOG format: `| Date | Work Item | Agent | Action | Result | Next Agent | Notes |`
- Canonical file token counts: measured 2026-07-25, total 25,910 tokens
- GitHub labels: 7 `phase:*` + 3 `status:*` labels already exist
- GitHub Project API: requires `read:project` scope (not yet granted)
