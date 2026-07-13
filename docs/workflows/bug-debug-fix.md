# Workflow: Bug Debug Fix

Use when a bug, failed test, CI failure, regression, flaky behavior, stack trace, or runtime error is reported.

## Primary Flow

```text
Failure Intake
  ↓
Debugging Discipline
  ↓
Classify Failure Type
  ↓
Fix Owner
  ↓
Validation
  ↓
Postmortem if learning value exists
```

## Required Agents

| Step | Agent / Skill | Output |
|---|---|---|
| Failure intake | Orchestrator / QA Agent | Failure classification |
| Debug | `debugging-discipline` | Debug ledger, repro, hypothesis matrix |
| Product fix | Developer Agent | Code fix, unit tests |
| Test fix | QA Agent / Automation skill | Test correction |
| Requirement ambiguity | BA Agent | Updated acceptance criteria |
| Architecture gap | SA Agent | Updated design/API contract |
| Security-sensitive bug | Security Reviewer | Security review |
| Validation | QA Agent | Test report / validation evidence |
| Learning | `engineering-postmortem` | Bug postmortem |

## Gate Rules

- Do not propose a fix before repro and fail path evidence exist.
- Do not change tests merely to pass CI.
- Do not close as fixed until original repro passes.
- Use `docs/contracts/bug-fix-workflow.yaml` as the canonical Bug Fix policy and validate the current `task-state` before each handoff.
- Allow at most two verifying -> rework transitions. On the next failed verification, set state to `blocked` with `stop_reason: human_review_required` and hand off to a human.
- Route back to BA if expected behavior is unclear.
- Route to Security Reviewer if auth, permission, secrets, sensitive data, financial logic, or trust boundary is involved.

## Handoff: Debug → Developer

Include:

- failing command/test
- repro reliability
- failing behavior
- fail path
- accepted and rejected hypotheses
- proposed fix direction
- validation plan

## Handoff: Developer → QA

Include:

- PR/commit/branch
- changed files
- root cause summary
- original repro
- validation instructions
- regression focus

## Completion

Bug workflow is complete only when:

- root cause is known or unresolved status is explicit
- fix is validated or issue is handed off as unresolved
- task log/test report updated
- postmortem created when warranted
