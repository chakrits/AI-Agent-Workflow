# PROJECT_STATUS.md

## Current Work Item
- ID: None
- Title: No active work item
- Owner: —
- Status: Idle — awaiting next role-enrichment or other work item

## Current Stage
- Between work items. QA Agent instruction (`QA-AGENT-INSTRUCTION-2026-07-14`) and the README onboarding rework (`README-ONBOARDING-2026-07-15`) are both closed and on `main`.

## Change Classification
- N/A — no work item in progress.

## Completed
- BA Agent instruction (`ed1090e`): illustrative draft rule, sketch boundary, production-UI escalation; regression-tested.
- QA Agent instruction (`62b0cf1`..`3ea2c61`, merged to `main`, pushed to `origin/main`): fixed the canonical/adapter inversion (policy moved from `.claude/agents/qa-agent.md` into `docs/workflow/role-definitions.md`); added Evidence-Based Reporting, API Contract Validation, and NFR Validation rules; expanded `docs/templates/TEST_PLAN.md` and `.agents/skills/qa-playwright-testing/SKILL.md`'s Automation Discipline section; regression coverage added and verified non-tautological.
- README onboarding rework (`5b56e3c`): reworked `README.md` as a newcomer-first entry point covering project structure, quick start, routing model, role overview, workflow selection, Bug Fix contract, and validation.
- Role enrichment now covers 6 of 11 roles: Documentation, PM, Orchestrator, SA, BA, QA.
- R-001 (Phase 1 hosted-CI confirmation) closed 2026-07-15 — Human Reviewer confirmed Phase 1 hosted CI is merged and running on `main`. See `RISKS.md`.

## In Progress
- Nothing in progress.

## Blockers / Open Questions
- Three follow-up opportunities remain identified but deliberately deferred, not started: (1) a "Prototype/Spike" workflow route in `AGENTS.md`; (2) a Release Agent enrichment from a DevOps Automator reference; (3) whether a shared cross-role template pattern should be extracted now that six roles (Documentation, PM, Orchestrator, SA, BA, QA) follow the same canonical/adapter structure. None are scheduled.
- Five roles remain under-specified in `docs/workflow/role-definitions.md`: Developer, Security Reviewer, Config Agent, Data Agent, Release Agent.

## Required Artifacts
- None outstanding for the current (idle) state.

## Next Quality Gate
- N/A until the next work item is scoped.

## Recommended Next Agent
- Human, to select the next work item (e.g., one of the remaining under-specified roles, or one of the deferred follow-up ideas).

## Notes
- The QA Agent work item intentionally did not create a new "Reality Checker" role — that responsibility is folded into QA Agent's own Evidence-Based Reporting rule and the existing Reviewer gate used throughout this session's role-enrichment work.
- The QA Agent work item intentionally did not adopt statistical/ML defect prediction, tool procurement/TCO evaluation, or generic business-process optimization — all judged disproportionate to or out of scope for this repo.
- R-001 is closed; see `RISKS.md` for the closure note.
