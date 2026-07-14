# PM Agent Instruction Design

**Date:** 2026-07-14
**Status:** Approved for implementation planning
**Work item:** PM-AGENT-INSTRUCTION-2026-07-14

## Goal

Give the PM Agent a complete, machine-checkable role definition so it produces consistent, non-speculative business framing for every request that reaches it, instead of the current one-sentence stub in `docs/workflow/role-definitions.md` and `.claude/agents/pm-agent.md`.

## Scope

In scope:

- A canonical PM Agent role definition (trigger, mandatory assessment, critical rules, required record, completion rules, escalation rules), mirroring the structure already established for the Documentation Agent.
- An expanded `docs/templates/PROJECT_BRIEF.md` with explicit fields for each mandatory-assessment dimension.
- Parity in the Claude Code adapter (`.claude/agents/pm-agent.md`).
- Regression coverage that fails if the trigger, the six mandatory dimensions, the critical rules, or the template headings are removed.

Out of scope:

- Redesigning the other nine agent roles (BA, SA, Developer, QA, Security, Config, Data, Release, Orchestrator). This spec produces the PM instance only; a reusable pattern may be extracted later from this and the Documentation Agent as prior art, but that extraction is a separate decision.
- Changing `AGENTS.md` Dynamic Routing Rules, Stop Conditions, or the New Feature workflow sequence.
- Adding risk classification to PM Agent — that remains an Orchestrator responsibility.
- Any runtime/automation trigger (e.g., a bot that auto-invokes PM Agent). This spec defines the operating rule an agent follows when invoked, not an event-driven trigger.

## Research Input

Reviewed three externally published agent-persona files for transferable concepts (`msitarzewski/agency-agents`): a senior PM agent, an IT service manager agent, and a prompt-engineer agent. Adopted:

- **Critical Rules as concrete, testable statements** (from the IT Service Manager's "Critical Rules You Must Follow" pattern) rather than general guidance.
- **Explicit, non-vague success-metric discipline** (from the Prompt Engineer's insistence on exact output format and success criteria) — a PM-authored success metric must be measurable, not aspirational language.
- **Field-structured artifact templates over free prose** (from the Senior PM's task-list template with acceptance criteria per item).

Rejected: persona flourishes (emoji, "Identity & Memory" sections, in-character voice) and a role-specific Success Metrics table for the PM Agent's own performance — both are inconsistent with this repository's existing terse, machine-checkable adapter style and would diverge from the Documentation Agent precedent without a clear benefit.

## Trigger

PM Agent is invoked when Orchestrator classifies an incoming request as carrying unresolved business-goal ambiguity — this is normally the first step of the New Feature flow (per `AGENTS.md` Dynamic Routing Rules), and also applies whenever BA or SA routes backward because business scope, priority, or stakeholder impact is unclear. PM Agent is skipped for small approved operational changes per the existing Skip Rules in `AGENTS.md`.

## Mandatory Assessment

For a new work item, PM Agent must produce content for all six dimensions below. For a re-review triggered by backward routing, an unchanged dimension may be recorded as `No update required — <reason>`.

1. Business Goal
2. Scope (In / Out)
3. Stakeholder Impact
4. Success Metric
5. Priority
6. Release Intent / Roadmap Fit

## Critical Rules

1. Do not state a Business Goal, Scope item, or Stakeholder Impact that is not traceable to the original request or stakeholder input. Quote or closely paraphrase the source when recording Business Goal and Scope.
2. A Success Metric must be measurable: a number, threshold, or explicit pass/fail condition, plus how it will be measured. Reject vague phrasing such as "improve UX" or "make it better."
3. Do not set Priority or Release Intent unilaterally when it conflicts with an existing roadmap commitment recorded in project state — escalate to Human instead.
4. Do not hand a brief to BA/SA while an Open Question or an unresolved stakeholder conflict remains unflagged in the brief.
5. PM Agent does not approve architecture, implementation, or release decisions. Its authority is limited to business framing.

## Required Record

PM Agent produces `docs/templates/PROJECT_BRIEF.md`, expanded to carry one section per mandatory-assessment dimension (see Template Changes below) instead of the current generic `Summary` / `Details` free-text sections. `Assumptions`, `Open Questions`, `Risks`, and `Approval / Review` sections are retained from the existing template.

## Template Changes — `docs/templates/PROJECT_BRIEF.md`

New heading order:

```markdown
# Project Brief

## Metadata
## Business Goal
## Scope
### In Scope
### Out of Scope
## Stakeholder Impact
## Success Metric
## Priority
## Release Intent / Roadmap Fit
## Assumptions
## Open Questions
## Risks
## Approval / Review
```

`Success Metric` contains a table with columns `Metric`, `Target`, `Measurement Method` — enforcing Critical Rule 2 structurally.

## Completion Rules

PM Agent may hand off to BA Agent only when:

1. All six mandatory-assessment dimensions have content, or an explicit no-update rationale on re-review.
2. Every Success Metric row satisfies Critical Rule 2 (measurable, with a stated measurement method).
3. Every Open Question is either resolved or explicitly flagged for BA or Human follow-up.
4. A handoff exists using `docs/templates/HANDOFF.md`.
5. `PROJECT_STATUS.md` and `TASK_LOG.md` are updated per the existing Definition of Done in `AGENTS.md`.

## Escalation Rules

| Condition | Route to |
|---|---|
| Requirement ambiguity beyond goal-level business framing | BA Agent |
| Technical feasibility is unknown or disputed | SA Agent |
| Stakeholder priorities conflict, or a request conflicts with an existing roadmap commitment | Human approval gate |
| Scope change is discovered mid-project | Human approval gate (per the Stop Conditions in `AGENTS.md`) |
| The request has release or deployment implications | Release Agent and Human approval |

## Implementation Targets

- Replace the one-sentence `## PM Agent` body in `docs/workflow/role-definitions.md` with the Trigger, Mandatory Assessment, Critical Rules, Required Record, Completion Rules, and Escalation Rules sections above.
- Rewrite `docs/templates/PROJECT_BRIEF.md` to the new heading structure.
- Align `.claude/agents/pm-agent.md` as a faithful adapter, the same way `.claude/agents/documentation-agent.md` links to and restates (without redefining) the canonical rule.
- Add a Node regression test to `test/validate-contracts.test.mjs` named `PM Agent requires the mandatory business assessment and measurable success metrics`, following the structure of the existing Documentation Agent test: read the canonical role definition, the adapter, and the template; assert all six dimension names, the Critical Rules' key phrases (e.g. "must be measurable", "not traceable to the original request"), and all template headings are present in both role documents / the template respectively.

## Acceptance Criteria

1. The PM Agent instruction explicitly requires assessment of all six business dimensions for every new work item.
2. The instruction contains concrete, checkable Critical Rules — not general guidance — including the measurable-success-metric rule.
3. `PROJECT_BRIEF.md` has one section per mandatory-assessment dimension, with a structured `Success Metric` table.
4. The Claude Code adapter (`.claude/agents/pm-agent.md`) matches the canonical rule without redefining it.
5. A regression test fails if the trigger, any of the six dimensions, the critical rules, or the template headings are removed.
6. Documentation changes pass `git diff --check` and the existing `npm test` / `npm run validate:contracts` gates.

## Risks and Constraints

- A stricter PM instruction can slow down trivial requests that don't need full business framing; the Trigger and Skip Rules in `AGENTS.md` already bound when PM Agent is invoked, so this is an accepted trade-off rather than a new risk.
- This spec does not create a reusable cross-role template. If a second role (after Documentation and PM) adopts the same structure, extracting a shared pattern becomes worth a separate design decision.

## Recommended Next Step

Human reviewer confirms this spec. Then the Implementation Planning Agent creates the small execution plan before any instruction/template changes begin.
