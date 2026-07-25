# Workflow: New Feature

```text
PM/BA -> SA -> Developer -> QA -> Security if relevant -> Release
```

## Canonical Contract

Use `docs/contracts/new-feature-workflow.yaml` as the canonical New Feature policy.
Before each handoff, validate the work item's `task-state`; the contract defines
the allowed states, transitions, evidence requirements, and rework budget (1 rework).

## Backward Routing

Use `docs/contracts/new-feature-workflow.yaml` as the source of truth for the
complete transition/evidence matrix. The playbook should summarize only these
common routes:

- Requirement gap → BA / discovery
- Architecture or API contract gap → SA / designing
- Plan gap → planning
- Verification failure → rework, with the contract's one-rework limit before blocked

## Required Outputs

- PROJECT_BRIEF.md or user story
- REQUIREMENT_DISCOVERY.md
- SDD.md
- TECHNICAL_DESIGN.md if needed
- TEST_PLAN.md
- TEST_REPORT.md
- RELEASE_PLAN.md
