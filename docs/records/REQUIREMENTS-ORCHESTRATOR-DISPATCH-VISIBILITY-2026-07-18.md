# Requirements: Orchestrator Dispatch and Boss Visibility

## Metadata

| Field | Value |
|---|---|
| Work Item | GitHub Issue #33 |
| Change Type | Workflow/process architecture correction |
| Risk | Medium |
| Status | Revised for event-driven parent/child completion design |

## Confirmed Facts

1. The current workflow records a `Recommended Next Step`, but it does not require an actual dispatch result when the next owner is non-human.
2. A child agent may finish after the Root Orchestrator has ended its turn, leaving a result unconsumed and Boss unnotified.
3. Recurring heartbeat/schedule polling is an interim diagnostic, not the intended ownership model; its unknown duration consumes tokens and does not make the parent await its child.
4. GitHub/GitLab lifecycle labels are work-item evidence, not an agent execution engine.
5. Human approval, QA judgment, and security gates must remain explicit.

## Assumptions

1. The host may expose native child-completion wait/resume primitives; Developer must prove their actual semantics rather than infer them from documentation.
2. A platform that cannot retain/resume the parent remains honest: it blocks with `host_completion_unavailable` rather than claiming automated continuation.

## Scope

### In scope

- Parent-owned dispatch receipts and native child-terminal completion events.
- Event-driven parent resumption, receipt validation, one successor route or stop, and one Boss event.
- Exactly-once, timeout, cancellation, host-capability, observability, template, canonical workflow, adapter, and regression requirements.
- A controlled live-host acceptance proof.

### Out of scope

- Heartbeat/schedule polling as normal workflow operation.
- Webhook-, queue-, GitHub/GitLab-event-, or persistent-worker-driven execution.
- Secrets, permissions, GitHub App, ruleset, or CI changes.
- Automatic QA acceptance or human-approval bypass.
- New lifecycle labels.

## User Stories

| ID | As a | I want | So that |
|---|---|---|---|
| US-33-01 | Boss | one evidence-backed report after each child terminal result | I do not need to poll hidden task state or send a new message to restart routing. |
| US-33-02 | Orchestrator | to retain ownership of every child it dispatches until the terminal receipt is consumed | no route silently stalls between agents. |
| US-33-03 | Receiving Agent | a complete, traceable dispatch receipt | I can validate inputs rather than rediscovering work context. |
| US-33-04 | Maintainer | truthful blocked behavior on an unsupported host | a missing callback/resume primitive is not misrepresented as automation. |

## Business Rules

| ID | Rule |
|---|---|
| BR-33-01 | A terminal handoff declares exactly one Next Action: `Dispatch`, `Human review`, or `Blocked`. |
| BR-33-02 | `Dispatch` requires a named non-human target, accepted invocation evidence, a stable parent-owned `Handoff Event ID`, and native await/callback registration before parent completion. |
| BR-33-03 | A child terminal result must resume its owning parent; the parent validates and consumes it before claiming route completion. |
| BR-33-04 | A receipt has one authoritative consumption key `(Handoff Event ID, Terminal Result ID)`; duplicates must not re-route or re-notify Boss. |
| BR-33-05 | Every consumed, cancelled, timed-out, or blocked receipt emits one Boss event with outcome, evidence, next action, and decision need. |
| BR-33-06 | If native parent retention/resumption is unavailable, record `blocked: host_completion_unavailable`; do not use heartbeat polling to claim completion. |
| BR-33-07 | A Human review action stops autonomous routing; the Orchestrator may prepare context but must not merge, approve, or continue beyond that gate. |
| BR-33-08 | Handoff-control states are not lifecycle labels and must not replace phase/status evidence. |

## Acceptance Criteria

The canonical Issue #33 Acceptance Traceability Matrix owns `ORCH-01` through `ORCH-08`. The revised, testable matrix is recorded in the linked Issue comment and is normative over any earlier heartbeat-monitor wording.

## Risks and Open Questions

| Item | Status | Handling |
|---|---|---|
| Host may not retain/resume parent after child completion | Known capability risk | Block honestly and route SA/Human; do not simulate success with polling. |
| Native wait only works while parent remains active | Open | Developer must prove actual host behavior or surface the limitation; no inferred capability. |
| Future cross-session durability needs more than an in-session callback | Deferred | Separate P3 SA/Security/human architecture decision. |
| Duplicate terminal receipts may route twice | Controlled | Stable consumption key and live duplicate test. |

## Recommended Next Step

Developer Agent implements only after this revised SDD/AC has human design acceptance. If the host cannot provide the required native capability, Developer routes back to SA/Human with direct evidence rather than implementing a polling substitute.
