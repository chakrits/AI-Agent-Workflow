# PROJECT_STATUS.md

## Current Work Item
- ID: PM-AGENT-INSTRUCTION-2026-07-14
- Title: Give PM Agent a complete, machine-checkable business-framing instruction
- Owner: Developer / Implementation Agent
- Status: Ready for Review

## Current Stage
- PM Agent Instruction / Reviewer Gate

## Change Classification
- Change Type: Documentation and process-governance change with regression coverage
- Risk Level: Medium
- Code Change Required: Yes — scoped Node regression coverage for the PM Agent rule
- Architecture Change Required: No — implements the approved PM Agent instruction design
- Security Review Required: No

## Completed
- Approved the PM Agent instruction design informed by external agency-agents research.
- Added the canonical PM Agent rule (trigger, mandatory assessment, critical rules, completion/escalation rules).
- Expanded `PROJECT_BRIEF.md` with one section per mandatory-assessment dimension and a measurable Success Metric table.
- Aligned the Claude PM Agent adapter with the canonical rule.
- Added regression coverage for the trigger, six mandatory dimensions, critical rules, and template headings.

## In Progress
- Independent review of the PM Agent instruction, template, and regression coverage.

## Blockers / Open Questions
- None for this work item. R-001 (Phase 1 hosted-CI confirmation) remains a separate open item owned by Reviewer / QA Agent.

## Required Artifacts
- `docs/superpowers/specs/2026-07-14-pm-agent-instruction-design.md`
- `docs/superpowers/plans/2026-07-14-pm-agent-instruction.md`
- `docs/templates/PROJECT_BRIEF.md`
- `docs/records/PM-AGENT-INSTRUCTION-2026-07-14-COMPLETION.md`

## Next Quality Gate
- Reviewer confirms the canonical rule, Claude adapter, template, and regression test agree.

## Recommended Next Agent
- Reviewer, then Reviewer / QA Agent for the outstanding Phase 1 hosted-CI confirmation (R-001)

## Notes
- This work item defines the PM Agent instance only. Extracting a shared cross-role pattern from the Documentation Agent and PM Agent precedents is a separate, future decision.
- R-001 (Phase 1 hosted-CI confirmation) is unaffected by this work item and remains open.
