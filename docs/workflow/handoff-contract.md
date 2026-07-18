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
- Lifecycle Phase
- Specification Readiness
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
- Acceptance Traceability Matrix URL
- Verified Commit SHA
- Platform Activation Record URL / Status
- QA Evidence URL
- Stop Reason
- Known Limitations
- Open Questions
- QA / Review Focus
- Recommended Next Step
- Next Action
- Next Owner
- Orchestration Turn ID
- Boss Event Required
- Dispatch State
- Source Agent
- Target Agent
- Dispatch Result
- Acknowledgement Evidence
- Boss Event
- Handoff Event ID
- Parent Orchestrator ID
- Child Task ID
- Terminal Result ID
- Completion Event Evidence
- Consumption Evidence
- Timeout / Cancellation Reason

Use `docs/templates/HANDOFF.md`.

## Handoff Rules

1. The receiving agent must verify that required inputs exist.
2. If required inputs are missing, route backward instead of guessing.
3. If the work touches security-sensitive areas, include Security Reviewer.
4. If the work is config/data only, do not route to Developer unless code change is required.
5. Update `PROJECT_STATUS.md` and `TASK_LOG.md` after handoff.
6. For Bug Fix work, validate the `task-state` against `docs/contracts/bug-fix-workflow.yaml` before handoff.
7. Allow at most two verifying -> rework transitions. On the next failed verification, set state to `blocked` with `stop_reason: human_review_required` and hand off to a human.
8. Every terminal handoff declares exactly one `Next Action`: `Dispatch`, `Human review`, or `Blocked`. `Next Owner` is required: a named non-human agent for `Dispatch`, the human gate owner for `Human review`, or the resolution owner for `Blocked`.
9. In the same active Orchestrator turn that consumes a terminal handoff, `Dispatch` requires a dispatch receipt with a target, evidence, and dispatch result. Naming a non-human next agent in prose without this outcome is invalid.
10. `dispatched` means a dispatch attempt was recorded; it is not `acknowledged`. Use `acknowledged` only with target-agent or runtime evidence, and report `acknowledgement pending` honestly when that evidence is unavailable.
11. Every terminal outcome requires a Boss-visible event that states completed work/quality-gate result, next action and owner, receipt state/evidence, and any blocker or decision needed.
12. Dispatch-control states (`pending`, `dispatched`, `acknowledged`, `awaiting_terminal`, `completed`, `cancelled`, `timed_out`, `blocked`) are not lifecycle labels and do not replace existing phase/status evidence. A Human review action records `Dispatch State: blocked` with `Stop Reason: human_review_required`; it must not bypass the human gate.
13. Each terminal handoff has a stable `Handoff Event ID`, `Parent Orchestrator ID`, and `Child Task ID`. For an asynchronous `Dispatch`, after target invocation succeeds and before the parent ends or yields, the parent registers a native child-terminal receipt/await callback and records its `Completion Event Evidence`.
14. A native completion event identifies one immutable `Terminal Result ID`. The resumed parent consumes `(Handoff Event ID, Terminal Result ID)` exactly once, records `Consumption Evidence`, emits the Boss event, routes one permitted successor or stops, then closes the receipt. Duplicate or late events retain the first result and do not re-dispatch or emit another Boss event.
15. A host that cannot retain and resume the parent records `Dispatch State: blocked`, `Stop Reason: host_completion_unavailable`, and a Boss event; it must not claim automatic continuation. Deadline expiry and explicit cancellation are terminal outcomes: record `timed_out` or `cancelled` with `Timeout / Cancellation Reason`, reject stale child output, and do not use schedule/heartbeat polling as a substitute.
