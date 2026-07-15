# PROJECT_STATUS.md

## Current Work Item
- ID: ENGINEERING-DISCIPLINE-SKILLS-BATCH-2026-07-15
- Title: Add a git-workflow-and-versioning skill and sharpen tdd-implementation, code-review-gate, and implementation-planning with normalized concepts from six external references
- Owner: Developer / Implementation Agent
- Status: Implemented, uncommitted — pending review

## Current Stage
- Cross-Cutting Skill/Policy Update / Reviewer Gate

## Change Classification
- Change Type: Documentation and process-governance change with regression coverage
- Risk Level: Low
- Code Change Required: Yes — scoped Node regression coverage for every change
- Architecture Change Required: No — new skill plus additive sections in existing skills; no code behavior changed
- Security Review Required: No

## Completed
- Assumptions Surfacing + AGENTS.md Boundaries index (`SPEC-DRIVEN-DEV-CONCEPTS-2026-07-15`, uncommitted, bundled into this batch per user instruction to combine).
- Orchestrator Agent instruction (`a20311b`, committed, not yet pushed — see Blockers).
- Developer Agent instruction (`3b49fca`, committed, not yet pushed — see Blockers).
- QA Agent instruction (`62b0cf1`..`3ea2c61`, merged to `main`, pushed to `origin/main`).
- R-001 (Phase 1 hosted-CI confirmation) closed 2026-07-15.
- Reviewed six `addyosmani/agent-skills` references (incremental-implementation, git-workflow-and-versioning, test-driven-development, code-review-and-quality, planning-and-task-breakdown, documentation-and-adrs) at the user's explicit request to do a lightweight batch, not a full brainstorm/plan pipeline, since the work is documentation-only with no architecture decisions to make.
- Excluded `documentation-and-adrs` entirely — `DECISIONS.md`'s existing ADR template already matches, Documentation Agent already owns README/changelog/decision-log.
- Excluded `code-review-and-quality`'s core five-axis/severity content as a confirmed duplicate of `code-review-gate` (already flagged during Developer Agent's round); kept only its non-overlapping techniques.
- Excluded `incremental-implementation`'s core content as a duplicate of Developer Agent's just-added Incremental Verification Discipline and Scope Discipline rules; kept only its "noticed but not touching" reporting format.
- Added `AGENTS.md` "Change Sizing" subsection under Core Operating Principle 10, with concrete line thresholds (~100/~300/~1000) and three splitting strategies (Stack, Vertical slice, By file group) — the one concept repeated across four of the six references.
- Added a new skill, `git-workflow-and-versioning` (`.agents/skills/`, mirrored to `.claude/skills/` and `.agent/skills/`): atomic commits, type-prefixed commit messages, pre-commit hygiene (diff review + secret scan, backing the existing "Never commit secrets" Boundary), and the Change Summary format (CHANGES MADE / NOTICED BUT NOT TOUCHING / CONCERNS). Registered it in `AGENTS.md`'s Engineering Execution Rules and `docs/operating-model/SKILL_CATALOG.md`.
- Enriched `tdd-implementation` (all three copies): Test Design Rules — test sizing (small/medium/large), mock preference order (real > fake > stub > mock), test state not interactions, DAMP over DRY.
- Enriched `code-review-gate` (all three copies): Structural Remedies (name the fix, not just the problem), Dead Code Hygiene (ask-before-delete format), Dependency Discipline (pre-add checklist, one-dependency-per-upgrade).
- Enriched `implementation-planning` (all three copies): dependency graph mapping, vertical slicing guidance, Task Sizing (concrete over-large signals), checkpoint cadence (every 2-3 tasks), parallelization guidance.
- Deliberately did not add the feature-flag-for-incomplete-work nugget (from `incremental-implementation`) or SemVer/release/changelog content (from `git-workflow-and-versioning`) — both are speculative or belong to a future Release Agent enrichment, not this batch, per the explicit instruction not to over-engineer.
- Added regression coverage for all five changes in `test/validate-contracts.test.mjs`; verified every new test is not tautological (temporarily broke the required phrase in each file, confirmed FAIL, restored, confirmed PASS) — 30/30 tests passing.

## In Progress
- Independent review of the full batch (1 new skill, 3 enriched skills, 1 AGENTS.md section, regression coverage) before commit.

## Blockers / Open Questions
- Two prior commits (`a20311b` Orchestrator Agent, `3b49fca` Developer Agent) are committed locally but not yet pushed to `origin/main` — confirm push plan.
- Three follow-up opportunities remain identified but deliberately deferred, not started: (1) a "Prototype/Spike" workflow route in `AGENTS.md`; (2) a Release Agent enrichment (now with two seeds waiting: DevOps Automator concepts, and this batch's deferred SemVer/tag/changelog-for-humans content); (3) whether a shared cross-role template pattern should be extracted now that seven roles follow the same canonical/adapter structure.
- Four roles remain under-specified in `docs/workflow/role-definitions.md`: Security Reviewer, Config Agent, Data Agent, Release Agent.
- `docs/operating-model/SKILL_CATALOG.md` was found out of sync with `.agents/skills/` during earlier exploration (stale `playwright-qa` path, missing `ba-requirement-analysis`/`sa-architecture-design`/`data-config-change` entries) — still open, not fixed.

## Required Artifacts
- `.agents/skills/git-workflow-and-versioning/SKILL.md` (+ `.claude/skills/`, `.agent/skills/` copies)
- `.agents/skills/tdd-implementation/SKILL.md`, `.agents/skills/code-review-gate/SKILL.md`, `.agents/skills/implementation-planning/SKILL.md` (+ their `.claude/skills/` and `.agent/skills/` copies)
- `.agents/skills/requirement-brainstorming/SKILL.md` (+ copies)
- `AGENTS.md`
- `docs/operating-model/SKILL_CATALOG.md`
- `test/validate-contracts.test.mjs`

## Next Quality Gate
- Reviewer confirms all three-copy skills are identical across `.agents/`, `.claude/`, `.agent/`, that the new skill is correctly registered in both `AGENTS.md` and `SKILL_CATALOG.md`, and that every regression test is meaningful.

## Recommended Next Agent
- Reviewer, then Human to select the next work item, confirm the push plan for the pending local commits, and decide whether to fix the `SKILL_CATALOG.md` drift noted above.

## Notes
- This batch intentionally stayed at "normalize what's clean, skip what needs design work" per explicit user instruction — no brainstorming/planning pipeline was used since there was no architecture decision to make, only documentation additions.
- R-001 is closed; see `RISKS.md` for the closure note.
