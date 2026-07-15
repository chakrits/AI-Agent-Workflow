# Handoff Contract

Every handoff must be structured. Do not pass work with vague statements such as "done" or "send to QA".

## Required Fields

- From Agent
- To Agent
- Work Item
- Work Item URL
- Change Request URL
- Change Type
- Risk Level
- Current Stage
- Task State
- Contract Version
- Rework Count
- Completed Work
- Artifacts Produced
- Files Changed
- Verification Performed
- Evidence References
- Acceptance Criteria Verification Status
- QA Evidence URL
- Stop Reason
- Known Limitations
- Open Questions
- QA / Review Focus
- Recommended Next Step

Use `docs/templates/HANDOFF.md`.

## Handoff Rules

1. The receiving agent must verify that required inputs exist.
2. If required inputs are missing, route backward instead of guessing.
3. If the work touches security-sensitive areas, include Security Reviewer.
4. If the work is config/data only, do not route to Developer unless code change is required.
5. Update `PROJECT_STATUS.md` and `TASK_LOG.md` after handoff.
6. For Bug Fix work, validate the `task-state` against `docs/contracts/bug-fix-workflow.yaml` before handoff.
7. Allow at most two verifying -> rework transitions. On the next failed verification, set state to `blocked` with `stop_reason: human_review_required` and hand off to a human.
