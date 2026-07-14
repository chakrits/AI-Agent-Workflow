# PROJECT_STATUS.md

## Current Work Item
- ID: SA-AGENT-INSTRUCTION-2026-07-14
- Title: Give SA Agent architecture pattern discipline, an API contract governance rule, and a Django/Postgres migration-safety rule
- Owner: Developer / Implementation Agent
- Status: Ready for Review

## Current Stage
- SA Agent Instruction / Reviewer Gate

## Change Classification
- Change Type: Documentation and process-governance change with regression coverage
- Risk Level: Medium
- Code Change Required: Yes — scoped Node regression coverage for the SA rule
- Architecture Change Required: No — extends the existing SA role definition and SDD template
- Security Review Required: No

## Completed
- Orchestrator Agent instruction (Unclassified Request Rule, Escalation Tiers, Decision Routing Checklist) implemented and regression-tested — still uncommitted, bundled with this work item since neither was committed or reviewed yet.
- Reviewed four external agent-persona references (Software Architect, Technical Writer, Backend Architect, Backend/DevOps-adjacent) for concepts applicable to SA Agent; excluded one unrelated reference (FP&A Analyst) and one unrelated reference (Growth Hacker) as out of scope for this repo.
- Added Architecture Pattern Selection: default to a Django modular-monolith with a service layer for this project's stack; deviations require a named justification and an ADR in `DECISIONS.md`.
- Added Dependency Boundary Rule: non-trivial business logic lives in a service layer, not in views/serializers/model side effects.
- Added API Contract Governance: every new/changed REST endpoint requires an OpenAPI schema before Developer Agent implements it; the schema is the source Documentation Agent publishes from.
- Added Data Migration Safety: PostgreSQL schema changes affecting existing data must state an expand/contract migration strategy, backfill plan, and rollback plan in the SDD; Data Agent still owns running non-destructive reference/seed data changes.
- Expanded `docs/templates/SDD.md`'s API Contract, Data Model / Data Impact, and NFR sections from blank prose into required, specific fields.
- Aligned the Claude SA adapter with the canonical rule.
- Added regression coverage for architecture pattern selection, the service-layer boundary, API contract governance, migration safety, and the new SDD template fields; verified the test fails when a required phrase is removed and passes when restored.

## In Progress
- Independent review of both the Orchestrator Agent and SA Agent instructions, adapters, template changes, and regression coverage (all still uncommitted).

## Blockers / Open Questions
- Two follow-up opportunities were identified but deliberately deferred, not started: (1) a new "Prototype/Spike" workflow route in `AGENTS.md` Dynamic Routing Rules, surfaced while reviewing a Rapid Prototyper reference; (2) a Release Agent enrichment using CI/CD, deployment-strategy, and observability concepts, surfaced while reviewing a DevOps Automator reference. Neither is scheduled.
- R-001 (Phase 1 hosted-CI confirmation) remains a separate open item owned by Reviewer / QA Agent.

## Required Artifacts
- `docs/workflow/role-definitions.md` (canonical Orchestrator Agent and SA Agent sections)
- `.claude/agents/orchestrator-agent.md`
- `.claude/agents/sa-agent.md`
- `docs/templates/SDD.md`
- `test/validate-contracts.test.mjs`

## Next Quality Gate
- Reviewer confirms the canonical rules and Claude adapters agree for both Orchestrator and SA Agent, and that both regression tests are meaningful, before anything is committed.

## Recommended Next Agent
- Reviewer, then Reviewer / QA Agent for the outstanding Phase 1 hosted-CI confirmation (R-001)

## Notes
- SA Agent's API Contract Governance intentionally stops at producing the OpenAPI schema — it does not adopt the Technical Writer reference's docs-pipeline setup (Docusaurus, versioned doc sites); that stays out of scope unless a future Documentation Agent enrichment picks it up.
- SA Agent's Data Migration Safety intentionally does not absorb Data Agent's responsibility for running reference/seed data changes — SA designs the strategy, Data Agent executes non-destructive data changes.
- SA Agent intentionally does not adopt the Backend Architect reference's mandatory reliability patterns (circuit breakers, bulkheads, dead-letter queues) — those are heavier than this stack currently needs; only a timeout/retry statement for external calls is expected by default.
- R-001 (Phase 1 hosted-CI confirmation) is unaffected by this work item and remains open.
