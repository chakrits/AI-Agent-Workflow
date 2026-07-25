# Workflow: Feature Discovery to Implementation Plan

## Use when

A feature request or business idea needs to become a development-ready plan.

## Flow

```text
User / PM Request
  ↓
requirement-brainstorming
  ↓
BA review / approval
  ↓
SA architecture/API/data review when needed
  ↓
implementation-planning
  ↓
Developer Agent
```

This flow uses the `requirement-brainstorming` ([[../../.agents/skills/requirement-brainstorming/SKILL.md|requirement-brainstorming]]) and
`implementation-planning` ([[../../.agents/skills/implementation-planning/SKILL.md|implementation-planning]]) skills.

## Required artifacts

- `REQUIREMENT_DISCOVERY.md` ([[../templates/REQUIREMENT_DISCOVERY.md|REQUIREMENT_DISCOVERY.md]])
- user stories / acceptance criteria in the canonical `REQUIREMENT_DISCOVERY.md`
- `SDD.md` ([[../templates/SDD.md|SDD.md]]) / `TECHNICAL_DESIGN.md` ([[../templates/TECHNICAL_DESIGN.md|TECHNICAL_DESIGN.md]]) when architecture or technical design is required
- `IMPLEMENTATION_PLAN.md` ([[../templates/IMPLEMENTATION_PLAN.md|IMPLEMENTATION_PLAN.md]])

## Gate

Do not proceed to implementation until:

- Change type is classified.
- Acceptance criteria are testable.
- Open questions are resolved or explicitly accepted.
- Implementation plan has verification steps.
