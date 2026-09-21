# Work Item: Issue #280 — GPT-6 Astra instruction, skill, and autonomy modernization

## Source
- Issue: https://github.com/chakrits/AI-Agent-Workflow/issues/280
- Boss directive: 2026-09-21 — approved planning and issue creation
- External guidance: https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra

## Classification
- Change type: Framework / Meta Change
- Risk level: Medium
- Lifecycle phase: `phase:development`
- Workflow route: Orchestrator → Documentation Agent → Reviewer / QA Agent → Human Approval

## Artifacts
- Requirement / design brief: GitHub Issue #280
- Proposed SDD: [[../sdd/2026-09-21-issue-280-gpt6-astra-modernization-sdd]]
- ADR: ADR-0034 accepted for the default instruction hierarchy; #282 retains its own autonomy-boundary decision
- Implementation plans: Child work items #281–#284
- PRs: Pending
- Closeout PR: Pending

## Sub-tasks
- [ ] #281 — task-triggered instruction-loading hierarchy
- [ ] #282 — safe autonomy, persistence, and proportional verification
- [ ] #283 — skill metadata and catalog rationalization
- [ ] #284 — Astra behavior evaluation and rollout gate

## Status
Open — SDD approved. #281 is implemented locally and awaits independent review; #282–#284 remain separately scoped.
