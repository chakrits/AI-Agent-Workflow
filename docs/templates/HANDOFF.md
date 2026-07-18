# Agent Handoff

## From Agent


## To Agent


## Work Item


## Work Item URL


## Change Request URL


## Change Type


## Risk Level

Low / Medium / High / Critical

## Lifecycle Phase

`phase:requirements` / `phase:design` / `phase:planning` / `phase:development` / `phase:verification` / `phase:human-review` / `phase:blocked`

## Specification Readiness

Required specification: Lightweight / SDD-design / N/A
Evidence and approval reference:

## Current Stage


## Task State


## Contract Version


## Rework Count


## Completed Work

- 

## Artifacts Produced

- 

## Files Changed

- 

## Verification Performed

- 

## Evidence References

-

## Acceptance Criteria Verification Status

## Acceptance Traceability Matrix URL

## Verified Commit SHA

## Platform Activation Record URL / Status


## QA Evidence URL


## Stop Reason


## Known Limitations

- 

## Open Questions

- 

## QA / Review Focus

- 

## Recommended Next Step

## Next Action

Exactly one: `Dispatch` / `Human review` / `Blocked`

## Next Owner

Named non-human agent for `Dispatch`; human gate owner for `Human review`; resolution owner for `Blocked`.

## Orchestration Turn ID

## Boss Event Required

Yes — every terminal outcome

## Dispatch State

`pending` / `dispatched` / `acknowledged` / `awaiting_terminal` / `completed` / `cancelled` / `timed_out` / `blocked`

## Source Agent

## Target Agent

## Dispatch Result

Record the active-turn dispatch result, or why dispatch was not possible.

## Acknowledgement Evidence

Target-agent/runtime receipt. If unavailable while dispatched, state `acknowledgement pending`.

## Boss Event

Concise user-visible result: completed work and gate result; next action/owner; receipt state/evidence; blocker or decision needed.

## Handoff Event ID

Stable ID for this terminal handoff. Required for every terminal handoff.

## Parent Orchestrator ID

Identity of the Orchestrator that owns this child receipt. Required for asynchronous `Dispatch`; otherwise `N/A — synchronous or blocked route`.

## Child Task ID

Identity of the dispatched child/task. Required for asynchronous `Dispatch`; otherwise `N/A — synchronous or blocked route`.

## Terminal Result ID

Immutable child terminal-result identity once delivered; otherwise `pending` or `N/A`.

## Completion Event Evidence

Native await/callback receipt binding parent, child, handoff event, and terminal result. Required before the parent ends or yields for asynchronous `Dispatch`; otherwise `N/A — synchronous or blocked route`.

## Consumption Evidence

Parent-continuation evidence: validation decision, one Boss event ID, one route/stop outcome, and closed receipt. Required before claiming `completed`.

## Timeout / Cancellation Reason

Required for `cancelled`, `timed_out`, or blocked `host_completion_unavailable` outcomes; otherwise `N/A`.
