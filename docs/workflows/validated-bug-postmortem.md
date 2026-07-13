# Workflow: Validated Bug Postmortem

Use after a bug has been fixed and validated, when an engineering RCA/postmortem is needed.

## Required Input Gate

Do not draft unless all four are present:

- Reliable repro
- Known root cause
- Identified fix
- Validated fix

## Flow

```text
Validated Fix
  ↓
Collect Debug Ledger / PR / Test Evidence
  ↓
Engineering Postmortem Skill
  ↓
Review for accuracy
  ↓
Save / Post with approval
  ↓
Track follow-up actions
```

## Destination

Default:

```text
docs/postmortems/<ticket-or-module>-<YYYYMMDD>.md
```

Other destinations:

- ticket comment
- PR description
- internal wiki
- `TASK_LOG.md` for small issues

## Rules

- Do not write RCA from hypothesis.
- Do not overstate validation coverage.
- Keep code/config/data identifiers.
- Follow-ups must have owner and tracking artifact.
- For production incident/outage, use incident report workflow instead.
