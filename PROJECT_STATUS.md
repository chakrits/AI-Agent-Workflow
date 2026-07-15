# PROJECT_STATUS.md

## Current Work Item
- ID: DEVELOPER-AGENT-INSTRUCTION-2026-07-15
- Title: Enrich Developer Agent with architecture compliance, definition-of-done restatement, incremental verification, escalation, and scope discipline rules
- Owner: Developer / Implementation Agent
- Status: Implemented, uncommitted — pending review

## Current Stage
- Developer Agent Instruction / Reviewer Gate

## Change Classification
- Change Type: Documentation and process-governance change with regression coverage
- Risk Level: Low
- Code Change Required: Yes — scoped Node regression coverage for the new rules
- Architecture Change Required: No — restates and cross-references SA Agent's existing rules rather than defining new architecture
- Security Review Required: No

## Completed
- QA Agent instruction (`62b0cf1`..`3ea2c61`, merged to `main`, pushed to `origin/main`).
- README onboarding rework (`5b56e3c`).
- R-001 (Phase 1 hosted-CI confirmation) closed 2026-07-15.
- Reviewed three external references (Senior Developer, two Code Reviewer personas) for the Developer Agent role. Extracted structural concepts, not stack-specific content: "verify as you build" (from the Senior Developer's staged Implementation Process) and "restate the definition of done before starting" (from its Success Criteria section). Excluded both Code Reviewer references' review-dimension/severity content entirely — this repo's existing `code-review-gate` skill already covers the same ground (10 review dimensions, Critical/Major/Minor/Question taxonomy); adopted only their "read the spec/tests before touching code" and "don't silently act outside your role, escalate instead" structural ideas.
- Added five rules to the canonical Developer Agent section in `docs/workflow/role-definitions.md`: Architecture & Contract Compliance, Definition-of-Done Restatement, Incremental Verification Discipline, Escalation Discipline, Scope Discipline.
- Restated the same five rules (briefly, without redefining) in `.claude/agents/developer-agent.md`, matching the SA/BA/QA adapter pattern.
- Added regression coverage in `test/validate-contracts.test.mjs`; verified it is not tautological (temporarily broke the Scope Discipline phrase, confirmed FAIL, restored, confirmed PASS).

## In Progress
- Independent review of the Developer Agent rules and regression coverage before commit.

## Blockers / Open Questions
- Three follow-up opportunities remain identified but deliberately deferred, not started: (1) a "Prototype/Spike" workflow route in `AGENTS.md`; (2) a Release Agent enrichment from a DevOps Automator reference; (3) whether a shared cross-role template pattern should be extracted now that seven roles (Documentation, PM, Orchestrator, SA, BA, QA, Developer) follow the same canonical/adapter structure.
- Four roles remain under-specified in `docs/workflow/role-definitions.md`: Security Reviewer, Config Agent, Data Agent, Release Agent.

## Required Artifacts
- `docs/workflow/role-definitions.md` (canonical Developer Agent section)
- `.claude/agents/developer-agent.md`
- `test/validate-contracts.test.mjs`

## Next Quality Gate
- Reviewer confirms the canonical rule and Claude adapter agree, that Architecture & Contract Compliance correctly cross-references SA Agent's existing rules rather than redefining them, and that the regression test is meaningful.

## Recommended Next Agent
- Reviewer, then Human to select the next work item (remaining under-specified roles or deferred follow-up ideas).

## Notes
- This work item intentionally excluded both Code Reviewer references' review-dimension and severity-taxonomy content — already covered by the existing `code-review-gate` skill; importing it into Developer Agent would have duplicated that skill.
- R-001 is closed; see `RISKS.md` for the closure note.
