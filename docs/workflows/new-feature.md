# Workflow: New Feature

```text
PM/BA -> SA -> Developer -> QA -> Security if relevant -> Release
```

## Use when

- A new user-facing capability is being added.
- A new API endpoint or integration is being introduced.
- The change adds behavior the system does not have today, rather than fixing
  or adjusting existing behavior.

## Canonical Contract

Use `docs/contracts/new-feature-workflow.yaml` ([[../contracts/new-feature-workflow.yaml|new-feature-workflow.yaml]]) as the canonical New Feature policy.
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

- PROJECT_BRIEF.md ([[../templates/PROJECT_BRIEF.md|PROJECT_BRIEF.md]]) or user story
- REQUIREMENT_DISCOVERY.md ([[../templates/REQUIREMENT_DISCOVERY.md|REQUIREMENT_DISCOVERY.md]])
- SDD.md ([[../templates/SDD.md|SDD.md]])
- TECHNICAL_DESIGN.md ([[../templates/TECHNICAL_DESIGN.md|TECHNICAL_DESIGN.md]]) if needed
- TEST_PLAN.md ([[../templates/TEST_PLAN.md|TEST_PLAN.md]])
- TEST_REPORT.md ([[../templates/TEST_REPORT.md|TEST_REPORT.md]])
- RELEASE_PLAN.md ([[../templates/RELEASE_PLAN.md|RELEASE_PLAN.md]])

## Gate Rules

Full state/evidence rules live in the New Feature contract (see Canonical
Contract above). Before completion, confirm evidence for:

- SDD is approved before implementation starts.
- Acceptance criteria are testable, not aspirational.
- The implementation plan includes verification steps, not just build steps.
- Security review is complete when the feature touches auth, secrets, or PII.

## Handoff

Include:

- PR/commit/branch
- changed files
- test evidence (unit, functional, and/or E2E as applicable)
- regression focus / areas most likely to be affected by this change
- release plan reference
