# Requirements: Orchestrator Dispatch and Boss Visibility

## Metadata

| Field | Value |
|---|---|
| Work Item | GitHub Issue #33 |
| Change Type | Workflow/process improvement |
| Risk | Medium |
| Status | Draft for design review |

## Confirmed Facts

1. The current workflow records a `Recommended Next Step`, but it does not require an actual dispatch result when the next owner is non-human.
2. Agent completion can be available in an Issue, PR, or asynchronous agent result without a concise Boss-visible report.
3. GitHub/GitLab lifecycle labels are evidence of work-item state; they are not an agent execution engine.
4. Human approval, QA judgment, and security gates must remain explicit.

## Assumptions

1. P0/P1 may require agents to create structured handoff artifacts and Orchestrator to report/dispatch in its active turn, but may not introduce a background service.
2. “Same orchestration turn” means the active Orchestrator run that accepts a terminal handoff; it does not promise a platform-independent wall-clock SLA.
3. A platform that cannot provide a delivery acknowledgement must remain honest: `dispatched` records an accepted dispatch attempt, while `acknowledged` requires evidence from the target agent/runtime.

## Scope

### In scope

- A portable terminal-handoff and dispatch-receipt contract.
- Deterministic `Dispatch`, `Human review`, and `Blocked` next-action outcomes.
- Boss-visible event content for terminal agent results.
- Canonical workflow/template/adapter changes and regression coverage.

### Out of scope

- Webhook-, queue-, or GitHub/GitLab-event-driven agent execution.
- Secrets, permissions, GitHub App, ruleset, or CI changes.
- Automatic QA acceptance or human-approval bypass.
- New lifecycle labels.

## User Stories

| ID | As a | I want | So that |
|---|---|---|---|
| US-33-01 | Boss | a concise report after each agent terminal result | I can see work, evidence, routing, and required decisions without polling hidden state. |
| US-33-02 | Orchestrator | a mandatory action outcome for every terminal handoff | a known non-human next step cannot silently remain prose-only. |
| US-33-03 | Receiving Agent | a complete, traceable dispatch receipt | I can validate inputs rather than rediscovering work context. |
| US-33-04 | Maintainer | an explicit non-runtime fallback | a platform limitation is not misrepresented as an automated dispatch. |

## Business Rules

| ID | Rule |
|---|---|
| BR-33-01 | A terminal handoff declares exactly one Next Action: `Dispatch`, `Human review`, or `Blocked`. |
| BR-33-02 | `Dispatch` requires a named non-human target and a dispatch receipt in the same active Orchestrator turn. |
| BR-33-03 | If dispatch cannot be initiated, the outcome is `Blocked`, including the failure reason and resolution owner. |
| BR-33-04 | `Dispatched` and `Acknowledged` are distinct; acknowledgement cannot be inferred from a submitted request. |
| BR-33-05 | Every terminal result produces a Boss event with outcome, evidence, next action, dispatch state, and decision need. |
| BR-33-06 | Handoff-control states are not lifecycle labels and must not replace phase/status evidence. |
| BR-33-07 | A Human review action stops autonomous routing; an Orchestrator may prepare context but must not merge, approve, or continue beyond that gate. |

## Acceptance Criteria

The canonical Issue #33 Acceptance Traceability Matrix owns the approved AC IDs `ORCH-01` through `ORCH-08`. This record adds no hidden implementation criteria.

## Risks and Open Questions

| Item | Status | Handling |
|---|---|---|
| Cross-platform acknowledgement support differs | Known | Model the state honestly and make acknowledgement optional only when no callback exists. |
| “Same turn” may be interpreted as a time SLA | Resolved | Define it as an execution-boundary invariant, not elapsed time. |
| Future autonomous dispatcher needs credentials/retries | Deferred | P3 requires separate SA/Security approval. |

## Recommended Next Step

SA Agent records the portable contract, adapter boundary, testability strategy, and implementation slices. Human then approves the SDD before `status:spec-ready` and implementation planning.
