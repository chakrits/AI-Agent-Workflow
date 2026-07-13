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

## Required artifacts

- `REQUIREMENT_DISCOVERY.md`
- `REQUIREMENTS.md` or user stories / acceptance criteria
- `SDD.md` / `TDD.md` when architecture or technical design is required
- `IMPLEMENTATION_PLAN.md`

## Gate

Do not proceed to implementation until:

- Change type is classified.
- Acceptance criteria are testable.
- Open questions are resolved or explicitly accepted.
- Implementation plan has verification steps.
