# PROJECT_STATUS.md

## Current Work Item
- ID: QA-AGENT-INSTRUCTION-2026-07-14
- Title: Fix QA Agent's canonical/adapter inversion and add evidence-based reporting, API contract validation, and NFR validation rules
- Owner: Developer / Implementation Agent
- Status: Ready for Review

## Current Stage
- QA Agent Instruction / Reviewer Gate

## Change Classification
- Change Type: Documentation and process-governance change with regression coverage
- Risk Level: Medium
- Code Change Required: Yes — scoped Node regression coverage for the QA rules
- Architecture Change Required: No — restructures existing QA Agent content and extends the SDD/API-contract loop already landed for SA Agent
- Security Review Required: No

## Completed
- BA Agent instruction committed to `main` (`ed1090e`): illustrative draft rule, sketch boundary, production-UI escalation; regression-tested.
- Fixed QA Agent's canonical/adapter inversion: policy that only lived in `.claude/agents/qa-agent.md` (skill routing, dynamic routing, output expectations) now lives in `docs/workflow/role-definitions.md`; the Claude adapter restates without redefining, matching the SA/BA Agent pattern.
- Reviewed eight external testing-persona references; adopted reduced concepts from API Tester, Test Automation Engineer, Evidence Collector, Reality Checker, and Performance Benchmarker; excluded Test Results Analyzer, Tool Evaluator, and Workflow Optimizer as out of scope.
- Added Evidence-Based Reporting: QA claims require attached command-output/screenshot/log evidence; explicitly rejected the "find a minimum of 3-5 issues" quota mechanic as a fantasy-reporting failure mode in disguise.
- Added API Contract Validation: QA validates implementations against SA Agent's OpenAPI schema (from SA's API Contract Governance rule); mismatches are defects routed to Developer or SA Agent.
- Added NFR Validation: QA checks the SDD's stated Performance/Reliability/Observability/Scalability targets were validated, or records `Not validated — <reason>`.
- Expanded `docs/templates/TEST_PLAN.md` from a blank Summary/Details stub into QA-specific fields (Test Types In Scope, Environment, Entry/Exit Criteria, NFR Targets Under Test).
- Added an Automation Discipline section to `.agents/skills/qa-playwright-testing/SKILL.md` (no hard waits, role-based selectors, API-seeded test data, 24-hour flake quarantine with root cause).
- Added regression coverage; verified it is not tautological (fails when a required phrase is removed, passes when restored).

## In Progress
- Independent review of the QA Agent canonical/adapter fix, the three new rules, the template and skill changes, and regression coverage (uncommitted until Task 4 lands).

## Blockers / Open Questions
- Three follow-up opportunities remain identified but deliberately deferred, not started: (1) a "Prototype/Spike" workflow route in `AGENTS.md`; (2) a Release Agent enrichment from a DevOps Automator reference; (3) whether a shared cross-role template pattern should be extracted now that six roles (Documentation, PM, Orchestrator, SA, BA, QA) follow the same canonical/adapter structure. None are scheduled.
- R-001 (Phase 1 hosted-CI confirmation) remains a separate open item owned by Reviewer / QA Agent.

## Required Artifacts
- `docs/superpowers/specs/2026-07-14-qa-agent-instruction-design.md`
- `docs/superpowers/plans/2026-07-14-qa-agent-instruction.md`
- `docs/workflow/role-definitions.md` (canonical QA Agent section)
- `.claude/agents/qa-agent.md`
- `docs/templates/TEST_PLAN.md`
- `.agents/skills/qa-playwright-testing/SKILL.md`
- `test/validate-contracts.test.mjs`

## Next Quality Gate
- Reviewer confirms the canonical rule and Claude adapter agree, that API Contract Validation correctly references SA Agent's existing rule rather than redefining it, and that the regression test is meaningful.

## Recommended Next Agent
- Reviewer, then Reviewer / QA Agent for the outstanding Phase 1 hosted-CI confirmation (R-001)

## Notes
- This work item intentionally did not create a new "Reality Checker" role — that responsibility is folded into QA Agent's own Evidence-Based Reporting rule and the existing Reviewer gate used throughout this session's role-enrichment work.
- This work item intentionally did not adopt statistical/ML defect prediction, tool procurement/TCO evaluation, or generic business-process optimization — all judged disproportionate to or out of scope for this repo.
- R-001 (Phase 1 hosted-CI confirmation) is unaffected by this work item and remains open.
