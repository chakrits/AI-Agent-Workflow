# PROJECT_STATUS.md

## Current Work Item
- ID: BA-AGENT-INSTRUCTION-2026-07-14
- Title: Give BA Agent an illustrative, non-binding UX sketch capability with an explicit boundary against SA Agent's design work
- Owner: Developer / Implementation Agent
- Status: Ready for Review

## Current Stage
- BA Agent Instruction / Reviewer Gate

## Change Classification
- Change Type: Documentation and process-governance change with regression coverage
- Risk Level: Medium
- Code Change Required: Yes — scoped Node regression coverage for the BA rule
- Architecture Change Required: No — extends the existing BA role definition and requirement-discovery template
- Security Review Required: No

## Completed
- Orchestrator Agent and SA Agent instructions committed to `main` (`28af98e`): unclassified-request rule, escalation tiers, decision routing checklist (Orchestrator); architecture pattern selection, dependency boundary, API contract governance, migration safety (SA); both regression-tested.
- Reviewed five external agent-persona references (Developer Advocate, Business Strategist, UX Architect, UX Researcher, UI Designer) for concepts applicable to BA Agent; excluded Developer Advocate (DX/community/content marketing) and Business Strategist (exec-level strategy frameworks that would overlap PM Agent) entirely; excluded UI Designer's design-system ownership (color tokens, WCAG contrast, component library) as out of scope for BA.
- Consulted the advisor tool for a second opinion; it was unavailable, so self-critiqued the initial plan and found three gaps before implementing: (1) no boundary against SA Agent's Component Design, (2) no rule for when a sketch is skipped, (3) no escalation path when a sketch isn't enough.
- Confirmed the repo's existing diagram convention (plain ` ```text ` fenced arrow diagrams, used throughout `docs/workflow/` and `docs/workflows/`, no Mermaid) before choosing the sketch format, to stay consistent.
- Added an Illustrative Draft Rule: BA Agent may sketch a low-fidelity screen or `->` flow diagram, using the existing plain-text convention, only when the requirement has user-facing interaction.
- Added a Sketch Boundary: a BA sketch stops at what appears and in what order — no layout, component hierarchy, or visual detail; every sketch is labeled `Illustrative — not a UI spec`.
- Added a Production UI/UX Escalation rule: if real UI/UX design work is needed, BA Agent escalates to Human rather than deciding to create a new role itself.
- Added section 11 ("Illustrative UX Sketch (Optional)") to `docs/templates/REQUIREMENT_DISCOVERY.md`.
- Aligned the Claude BA adapter with the canonical rule.
- Added regression coverage for the illustrative-draft rule, the sketch boundary, and the escalation rule; verified the test fails when a required phrase is removed and passes when restored.

## In Progress
- Independent review of the BA Agent instruction, adapter, template change, and regression coverage (uncommitted).

## Blockers / Open Questions
- Two follow-up opportunities remain identified but deliberately deferred, not started: (1) a new "Prototype/Spike" workflow route in `AGENTS.md` Dynamic Routing Rules; (2) a Release Agent enrichment using CI/CD, deployment-strategy, and observability concepts. Neither is scheduled.
- No UI/UX design role exists in this workflow. If a real production design need surfaces, it currently has nowhere defined to go beyond "escalate to Human" — tracked here as a known gap, not yet a blocker.
- R-001 (Phase 1 hosted-CI confirmation) remains a separate open item owned by Reviewer / QA Agent.

## Required Artifacts
- `docs/workflow/role-definitions.md` (canonical BA Agent section)
- `.claude/agents/ba-agent.md`
- `docs/templates/REQUIREMENT_DISCOVERY.md`
- `test/validate-contracts.test.mjs`

## Next Quality Gate
- Reviewer confirms the canonical rule and Claude adapter agree, that the sketch boundary against SA Agent is unambiguous, and that the regression test is meaningful.

## Recommended Next Agent
- Reviewer, then Reviewer / QA Agent for the outstanding Phase 1 hosted-CI confirmation (R-001)

## Notes
- BA Agent's sketch capability intentionally does not adopt the UX Researcher reference's formal research methodology (usability testing protocols, statistically-sized samples, empirical personas) — too heavy for this repo's current process; only the lightweight "flow sketch" shape was kept.
- BA Agent's sketch capability intentionally does not adopt the UX Architect reference's CSS/theme-system code — that is Developer/SA implementation detail, not requirement illustration.
- R-001 (Phase 1 hosted-CI confirmation) is unaffected by this work item and remains open.
