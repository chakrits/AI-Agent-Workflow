# Quality Gates

## Intake Gate

- Change type identified
- Risk level identified
- Required agents listed
- Skipped agents justified
- Required artifacts listed

## PM -> BA Gate

- Business problem is clear
- Target users are clear
- Success metrics are clear
- Scope and out-of-scope are explicit
- Priority is defined

## BA -> SA Gate

- User stories exist
- Acceptance criteria exist
- Business rules are explicit
- Happy path and exception paths are documented
- Open questions are listed

## SA -> Dev Gate

- Architecture/design is clear
- API contract is clear when relevant
- Data model or data impact is clear
- Error model is defined
- Security constraints are documented
- Testability is considered

## Dev -> QA Gate

- Build passes or failure is documented
- Unit tests pass or are not applicable
- Lint/static checks pass or are not applicable
- Changed files are listed
- Known limitations are documented
- Test data and environment notes are provided

## Bug Fix Contract Gate

- `docs/contracts/bug-fix-workflow.yaml` is the policy reference
- Current `task-state` passes validation before handoff
- State transition evidence references are included
- Rework count records verifying -> rework transitions
- Allow at most two verifying -> rework transitions
- On the next failed verification, state is `blocked` with `stop_reason: human_review_required` and work is handed to a human

## Config/Data -> QA Gate

- Business approval exists
- Target environment is clear
- Config/data values are listed
- Validation query or verification method exists
- Rollback method exists
- Duplicate/constraint risk reviewed

## QA -> Release Gate

- Acceptance criteria coverage is documented
- Critical path tests passed
- Regression scope is documented
- Known defects are listed
- Release recommendation is clear

## Security Gate

- Auth/authz impact reviewed
- Secrets reviewed
- Sensitive data handling reviewed
- Input validation reviewed
- Dependency risk reviewed
- Abuse cases considered
- Findings are triaged by severity

## Release Gate

- Deployment steps documented
- Rollback steps documented
- Approvals documented
- Monitoring/verification plan documented
- Owner assigned
