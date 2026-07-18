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

## Specification Readiness Gate

- Feature and Enhancement work has exactly one current `phase:` label.
- `status:spec-ready` exists before Developer implementation begins.
- The Work Item identifies whether a lightweight specification or an approved SDD/design is required and links the applicable artifact.
- A route that requires SDD/design cannot advance while that artifact is Draft or Review.
- Documentation-only work and Bug Fix work use their established routes; this gate does not invent a specification or replace `docs/contracts/bug-fix-workflow.yaml`.

## Dev -> QA Gate

- Build passes or failure is documented
- Unit tests pass or are not applicable
- Lint/static checks pass or are not applicable
- Changed files are listed
- Known limitations are documented
- Test data and environment notes are provided
- Terminal handoff has exactly one `Next Action` and a valid `Next Owner`.
- For a non-human `Dispatch`, the active Orchestrator turn records a dispatch receipt/result; prose-only routing is incomplete.
- The receipt distinguishes `dispatched` from `acknowledged`; missing callback evidence is reported as `acknowledgement pending`.
- A Boss-visible event records the completed work/gate result, next action/owner, receipt evidence, and any blocker or decision need.
- For an asynchronous dispatch, before the Root yields, one bounded monitor registration records `Handoff Event ID`, `Monitor ID`, target, and monitor state.
- Root consumes a terminal result exactly once, emits the Boss event without a new Boss message, and records cancellation evidence; `monitor_unavailable`, `monitor_expired`, and `monitor_failed` block rather than silently stall.

## Orchestrator Dispatch Gate

- Every terminal handoff chooses exactly one action: `Dispatch`, `Human review`, or `Blocked`.
- A dispatch receipt includes `Dispatch State`, `Source Agent`, `Target Agent`, `Dispatch Result`, and `Acknowledgement Evidence`.
- The Orchestrator records the receipt in the same active Orchestrator turn that consumes the handoff.
- `Human review` records `Dispatch State: blocked` and `Stop Reason: human_review_required`; it does not continue through an autonomous route.
- Dispatch-control states are not lifecycle labels and do not replace phase/status evidence.
- Monitor state is separate from dispatch/lifecycle state. Duplicate or late wake-ups are idempotent no-ops after the first terminal consumption.

## QA Acceptance Criteria Gate

- For medium-risk workflow/platform work, QA verifies the single Work Item `Acceptance Traceability Matrix`; every approved Issue/design/contract criterion has an ID, exact-commit evidence, or an evidence-backed N/A result.
- Platform activation is separately recorded with owner, least-privilege permissions, required-check source, smoke evidence, and rollback/disable action; it is not a lifecycle label.
- Developer supplies `status:spec-ready`, implementation evidence, and `status:development-done` before QA handoff.
- Work Item URL and Draft Change Request URL are recorded
- QA verifies every Issue Acceptance Criteria item against the exact PR/MR and evidence
- QA, not Developer Agent, records the Acceptance Criteria Verification Status and QA Evidence URL
- Unverified or failed criteria route backward; only a complete QA pass can move the Draft PR/MR to human review
- QA evidence does not replace human merge approval
- On complete QA evidence, QA adds `status:verification-done` and moves the Work Item to `phase:human-review`; failures route the current phase backward to the responsible owner.
- Platform operations, including GitHub's App-owned linked-Issue re-evaluation and GitLab's manual/API boundary, are defined in `docs/workflow/platform-readiness.md`. Do not claim a native pull-request label event observes a linked Issue label change.

## Post-Merge Closeout Gate

- Developer adds `status:development-done` only after implementation evidence and local checks are ready.
- QA adds `status:verification-done` only after the Work Item and Change Request evidence locations are synchronized.
- A successful default-branch audit emits one temporary `post-merge-closeout` signal on the source Change Request; it creates no Issue.
- Documentation Agent completes the signal with a marked closeout Change Request that updates project state/history; its merge removes the source signal and emits no second closeout signal.
- A failed audit creates the `documentation-sync` exception Issue and does not emit the normal closeout signal.

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
