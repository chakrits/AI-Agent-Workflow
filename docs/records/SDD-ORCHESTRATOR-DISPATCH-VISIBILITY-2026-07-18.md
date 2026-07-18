# Software Design Document: Orchestrator Dispatch and Boss Visibility

## Metadata

| Field | Value |
|---|---|
| Work Item | GitHub Issue #33 |
| Owner | SA Agent |
| Status | Revised — event-driven parent/child completion is the canonical design |
| Scope | P0/P1 dispatch contract plus native parent-owned child-completion lifecycle; autonomous repository dispatcher deferred |

## Context

The P0/P1 contract distinguished an announced next owner from a real dispatch, but live QA demonstrated that a terminal child result can remain unconsumed after the Root Orchestrator ends its turn. The earlier P0.5 heartbeat proposal was a bounded polling fallback; it does not meet the intended ownership model and must not be represented as the solution.

The correct goal is event-driven parent/child completion: an Orchestrator that dispatches a child retains ownership of that child receipt, waits for its terminal receipt, validates it, routes the successor, and emits one Boss-visible result before ending its own task. GitHub/GitLab Issues and labels remain evidence stores, not an execution engine.

## Goals / Non-goals

### Goals

- Make a terminal child receipt an event that resumes its owning Orchestrator, without schedule/heartbeat polling on the happy path.
- Keep ownership, validation, routing, and Boss visibility with the dispatching Orchestrator.
- Preserve independent agent ownership, human gates, and QA judgment.
- Distinguish attempted dispatch from accepted/acknowledged work.
- Keep the contract portable across Codex, Claude, Antigravity, GitHub, and GitLab adapters.

### Non-goals

- Build a webhook, queue, scheduler, bot, persistent worker, or repository event listener.
- Add credentials, permissions, or repository automation triggers.
- Guarantee an elapsed dispatch-latency SLA.
- Replace Issue/PR lifecycle status or evidence.
- Let an event callback judge QA, merge, approve, or bypass a human gate.
- Treat heartbeat/schedule polling as the canonical implementation or acceptance evidence.

## Architecture Overview

```text
Terminal Agent Handoff
  -> Parent Orchestrator validates and dispatches child
  -> Durable-in-session Child Receipt registered to Parent
  -> Parent awaits native terminal-receipt event
  -> Parent continuation validates receipt once
  -> Parent routes one permitted successor OR stops at human/blocked gate
  -> Parent emits one Boss event, then closes the receipt
```

The parent Orchestrator owns the receipt lifecycle until it has consumed a terminal result. The child owns its work and structured terminal handoff. A host-native completion callback/wait primitive only delivers the receipt event; it has no workflow decision authority. Boss owns every human-review decision. A GitHub/GitLab Issue may store evidence links but cannot execute or acknowledge routing.

## Component Design

### 1. Terminal Handoff

Extend the existing handoff with:

| Field | Meaning |
|---|---|
| `Next Action` | Exactly one of `Dispatch`, `Human review`, `Blocked`. |
| `Next Owner` | Required for every action; a named non-human agent for `Dispatch`, a human gate owner for `Human review`, or resolution owner for `Blocked`. |
| `Orchestration Turn ID` | Identifier for the active Orchestrator run; binds terminal handoff and receipt. |
| `Boss Event Required` | `Yes` for every terminal outcome. |

### 2. Parent-owned Child Receipt

The receipt is a structured section within the handoff record, Issue comment, or platform-native equivalent:

| Field | Meaning |
|---|---|
| `Handoff Event ID` | Stable identity for one parent-to-child dispatch. |
| `Parent Orchestrator ID` / `Child Task ID` | Owning parent and dispatched child identity. |
| `Dispatch State` | `pending`, `dispatched`, `acknowledged`, `awaiting_terminal`, `completed`, `cancelled`, `timed_out`, or `blocked`. |
| `Work Item` / `Change Request` | Stable URLs or `N/A — reason`. |
| `Evidence References` | Required artifacts/checks supplied to the receiver. |
| `Dispatch Result` | Runtime/tool result, or explicit reason dispatch was not possible. |
| `Acknowledgement Evidence` | Target-agent receipt/result; absent only while honestly `dispatched`. |
| `Terminal Result ID` | Immutable child terminal-receipt identity once delivered. |
| `Completion Event Evidence` | Native await/callback receipt binding parent, child, handoff event, and terminal result. |
| `Consumption Evidence` | Parent continuation evidence: validation decision, route/stop outcome, Boss event ID, and closed receipt. |
| `Timeout / Cancellation Reason` | Required for `timed_out`, `cancelled`, or `blocked`. |

### 3. Native Completion Lifecycle

```text
dispatch accepted
  -> parent registers receipt and await/callback before ending
  -> child runs (`awaiting_terminal`)
  -> child terminal receipt event resumes parent
  -> parent validates and consumes once
  -> successor dispatch OR human/blocked stop
  -> one Boss event; receipt closed (`completed`)

cancellation -> parent records `cancelled` + one Boss event
deadline exceeded -> parent records `timed_out` + one Boss event
host cannot retain/resume parent -> `blocked: host_completion_unavailable` + one Boss event
```

The parent must register the native completion wait/callback after successful child invocation and before the parent can end. The host delivers the terminal receipt by resuming the owning parent; a polling loop is not a substitute. A timeout is an event/deadline owned by the same receipt, not repeated status polling.

### 4. Completion Consumption and Routing

When a native terminal-receipt event arrives, the resumed parent must:

1. load the receipt by `Handoff Event ID` and verify the parent/child/result identities;
2. validate required handoff evidence and the applicable quality gate;
3. record one authoritative consumption outcome;
4. emit the required Boss-visible event in that continuation turn;
5. either dispatch the next permitted non-human owner with its own receipt, stop for Human review, or mark the route blocked; and
6. close the receipt with completion, cancellation, timeout, or block evidence.

The parent must not end after dispatch while the child is outstanding unless the host durably retains and resumes that parent receipt. If that capability is absent, it must state the limitation and stop; it must not claim automatic continuation or silently rely on a future Boss message.

### 5. Exactly-once and Idempotency

The consumption key is `(Handoff Event ID, Terminal Result ID)`. The first valid parent continuation writes the authoritative route/stop outcome and one Boss event identifier. A duplicate terminal receipt, duplicate callback, late delivery after cancellation, or parent resume retry must return the stored outcome without another successor dispatch or Boss event.

`acknowledged` proves receipt by the child/runtime. `completed` requires parent consumption. A child terminal comment alone is not evidence that Boss was informed or that the next agent was actually invoked.

### 6. Timeouts, Cancellation, and Capability Limit

- A parent may set a bounded receipt deadline before waiting. Deadline expiry resumes/returns control to the parent as `timed_out`; it does not poll the child.
- An explicit child cancellation is a terminal event. The parent records `cancelled`, does not route a successor from stale output, and emits one Boss event.
- If the host cannot preserve a parent-owned wait or resume the parent on child completion, record `blocked` with `host_completion_unavailable`, include the exact missing primitive and any child state known now, and request a human/SA capability decision.
- A heartbeat may be used only as an operator-invoked emergency diagnostic for an already-blocked receipt. It is not an acceptance-path mechanism, may not make routing decisions, and may not convert an unavailable capability into a completion claim.

### 7. Boss Event

Every terminal outcome emits one concise, user-visible event containing:

1. completed work and quality-gate result;
2. next action and named owner;
3. receipt state and evidence link(s);
4. blocker or decision required, if any.

This is a communication contract. It does not promise a third-party notification delivery mechanism outside the active agent session.

## State Model

```text
pending -> dispatched -> acknowledged -> awaiting_terminal -> completed
pending -> blocked
dispatched|acknowledged|awaiting_terminal -> cancelled|timed_out|blocked
```

- `pending`: terminal handoff validated; Orchestrator outcome not yet recorded.
- `dispatched`: Orchestrator made a target-agent dispatch attempt in the same active turn and retains its result.
- `acknowledged`: target agent/runtime confirmed receipt.
- `awaiting_terminal`: parent has registered native completion ownership and is waiting for a child terminal event.
- `completed`: parent consumed the child terminal result and completed its own route/stop event.
- `blocked`: a dispatch attempt cannot proceed or a human gate/required input prevents continuation.

`Human review` is a terminal routing action, not a `Dispatch State`; its receipt is `blocked` with `stop_reason: human_review_required` until Boss acts.

`completed` requires parent consumption evidence. Receipt state is not a work-item lifecycle label and does not replace `phase:` / `status:` evidence.

## Same-Orchestration-Turn Invariant

The P0/P1 invariant is satisfied only when the Orchestrator records a receipt before ending the active run that consumed the terminal handoff. The event-driven extension requires an asynchronous target to have a parent-owned native await/callback receipt before the parent can end. Valid outcomes are:

- target dispatch attempt accepted and native parent await registered → `awaiting_terminal`;
- target acknowledges synchronously → `acknowledged`;
- human gate or inability to dispatch → `blocked` with reason and Boss event.

Writing “Next Agent: QA” without a receipt is invalid. This is deliberately an execution-boundary invariant, not a claim that a background runtime starts work within a particular number of minutes.

## Data / Integration Impact

- No database, API, secret, permission, GitHub App, webhook, or ruleset change.
- Canonical documents and templates are the P0/P1 source of truth.
- GitHub/GitLab adapters may render equivalent fields, but cannot claim they caused a dispatch.
- The event-driven path uses only an interactive host's native parent/child wait and resume capability. It does not use hosted-repository events or create a persistent execution plane.

## Error Handling

| Failure | Required response |
|---|---|
| Missing target/evidence for `Dispatch` | `blocked`; route to source owner to complete the handoff. |
| Target is unavailable / tool dispatch fails | `blocked`; Boss event explains failure and recovery owner. |
| Target does not acknowledge | Retain `dispatched`; report acknowledgement pending, do not claim completion. |
| Required human gate reached | `blocked` with `human_review_required`; do not dispatch a bypass route. |
| Parent completion capability unavailable | `blocked` with `host_completion_unavailable`; disclose the limitation and route SA/Human. |
| Receipt deadline expires | `timed_out`; one Boss event requires explicit next action. |
| Child is cancelled | `cancelled`; reject stale result and report one terminal outcome. |
| Duplicate/late terminal receipt | Match the consumption key and return stored outcome without duplicate route/event. |

## Security Considerations

- P0/P1 cannot introduce an execution endpoint, credential, secret, permission, or automatic merge/approval path.
- Handoff content remains evidence, not authority: agents must still enforce existing role boundaries and treat Issue/PR text as untrusted where applicable.
- Native callback input is restricted to host task/thread identities and terminal receipt metadata; it must not execute child-provided content or impersonate an agent.
- A durable external dispatcher, cross-session persistence, or external callback integration requires a separate SA/Security threat-model and human approval.

## NFRs

| Area | Target |
|---|---|
| Reliability | No terminal handoff ends without a receipt or explicit human/block reason. |
| Event-driven completion | Happy path uses a native child-terminal receipt to resume its parent; no schedule/heartbeat polling. |
| Idempotency | One receipt terminal result produces at most one successor route and one Boss event. |
| Observability | Evidence links parent, child, handoff event, terminal result, outcome, and Boss event. |
| Portability | Canonical contract has adapter parity; no GitHub-only execution assumption. |
| Maintainability | One state vocabulary and one template section; no new lifecycle label taxonomy. |

## Alternatives Considered

| Alternative | Decision |
|---|---|
| Add more GitHub labels | Rejected: labels communicate lifecycle state but do not execute/acknowledge agents. |
| Build webhook dispatcher now | Deferred: requires credential, idempotency, retry, and security architecture beyond the observed P0/P1 gap. |
| Treat a target terminal result as a Boss event | Rejected: a result can sit in an idle Root mailbox; consumption and user-visible reporting must be proved separately. |
| Recurring heartbeat/schedule polling | Rejected for happy path: consumes tokens, has unknown completion latency, and breaks parent ownership. |
| No continuation on unsupported host | Accepted as truthful blocked behavior, not as a successful automation result. |
| Leave routing as prose | Rejected: cannot detect a silent stall or show Boss actual dispatch state. |

## Decision

Adopt native event-driven parent/child completion as the only canonical happy path: dispatch → parent-owned receipt and await → child terminal event resumes parent → validate → route/stop → one Boss event. Heartbeat/schedule polling is non-canonical emergency diagnostics only. A host that cannot retain and resume its parent is explicitly `blocked`, with the capability limitation routed to SA/Human.

## Controlled End-to-End Proof Plan

QA must observe one live host run, without a new Boss message after dispatch:

1. Parent dispatches a real child and records `Handoff Event ID`, child identity, and native await/callback registration before ending.
2. Child reaches a real terminal result.
3. Host resumes the same parent from the child-terminal event, with immutable terminal-result identity.
4. Parent validates/consumes exactly once, routes the required successor or stops at the required gate, and emits one Boss event.
5. A deliberate duplicate delivery proves no second route or Boss event.
6. A cancellation and a deadline case prove one terminal event each with no stale route.
7. On a host lacking this capability, QA verifies the explicit `host_completion_unavailable` block and no claim of automatic dispatch.

## Testability Notes

- A regression rejects missing/invalid Next Action, a non-human target without dispatch result, and a terminal receipt lacking required Boss-event content.
- A regression accepts a human gate only with an explicit `human_review_required` stop reason.
- Adapter-parity tests confirm canonical and platform-specific documents use the same state vocabulary.
- Negative tests prove `dispatched` cannot be represented as `acknowledged`/`completed` without target evidence.
- The live proof above is mandatory; a simulated transcript, prose handoff, or a monitor registration alone cannot pass `ORCH-02`, `ORCH-04`, or `ORCH-06`.
- Negative scenarios prove unsupported-host block, deadline expiry, cancellation, and duplicate terminal notification become evidence-backed terminal outcomes rather than a silent stall.

## SA Capability Decision — 2026-07-19

### QA Escalation

QA's final recheck on Issue #33 (comment 5012113857) failed `ORCH-02`, `ORCH-04`, and `ORCH-06` with `Stop Reason: host_completion_unavailable`. QA's finding, verified live: `collaboration.wait_agent` only works during an active turn; once Root yields, nothing in this host resumes it. No repository-only Developer change can create a native same-parent resume primitive. QA escalated to SA for one of two outcomes: provide a host capability that keeps and resumes the parent, or explicitly defer the event-driven orchestration goal to a separately approved durable control-plane design. QA also ruled that heartbeat/schedule polling must not be reinstated as acceptance evidence — the Codex heartbeat adapter change in commit `ca311e5` had reintroduced polling as a happy path and is rejected.

### Decision

No native same-parent resume primitive exists on this host, and building one is out of scope for a documentation/contract change. The prior "event-driven completion" design (Sections 3–4, "Same-Orchestration-Turn Invariant") is superseded. The revised, human-approved (Boss) decision:

1. **Supervision is in-turn only.** Root may declare `Next Action: Dispatch` only when it will invoke the child and await its terminal receipt within the same active turn, for the whole chain (e.g., Root → Security → consume receipt → dispatch QA → consume receipt → one Boss event → stop at the human-review gate). Fire-and-forget dispatch is forbidden in every case. If Root cannot await in-turn, it must declare `Dispatch State: blocked`, `Stop Reason: host_completion_unavailable`, with a Boss-visible event in the current turn.
2. **Cross-turn / event-driven orchestration is explicitly deferred** to GitHub Issue #35, "feat(P3): durable event-driven agent dispatcher — design proposal." It is out of scope for this contract and is not acceptance evidence for `ORCH-02`, `ORCH-04`, or `ORCH-06`.
3. **The Codex heartbeat mechanism is demoted to an operator-invoked emergency diagnostic only** — never a happy path, never acceptance evidence. `.codex/orchestrator-supervision.md` is amended: in-turn `collaboration.wait_agent` is the only supervision mechanism, and heartbeat text is reduced to the diagnostic caveat only.
4. **P0.5 receipt semantics that survive:** `Handoff Event ID`, parent/child identity, the exactly-once key `(Handoff Event ID, Terminal Result ID)`, duplicate no-op, bounded in-turn wait with expiry recorded as `timed_out`/`cancelled`, and one Boss event per consumed receipt. These now apply within a single active turn rather than across a yield/resume boundary.

This decision changes the Goals/Non-goals, Architecture Overview, Component Design (Sections 2–6), State Model, Same-Orchestration-Turn Invariant, and Alternatives Considered sections above: any language implying a native parent resume after yield, or heartbeat/schedule as canonical/happy-path evidence, is superseded by the in-turn-only rule stated here and mirrored in `docs/workflow/handoff-contract.md`, `docs/workflow/dynamic-routing.md`, `docs/workflow/role-definitions.md`, `docs/workflow/quality-gates.md`, `docs/templates/HANDOFF.md`, and `.codex/orchestrator-supervision.md` (canonical governs; adapter copies restate only).

### Revised Acceptance Path

QA must observe:

1. **One live transcript proving the full in-turn chain**, without a new Boss message triggering resumption after a yield:
   - Root dispatches Security within the active turn and consumes Security's terminal receipt in that same turn (`Handoff Event ID`, `Terminal Result ID`, `Consumption Evidence`).
   - Root then dispatches QA within the same active turn and consumes QA's terminal receipt in that same turn.
   - A deliberate duplicate delivery of one terminal receipt proves a no-op: no second successor route and no second Boss event.
   - Root emits exactly one Boss-visible event for the full chain and stops at the human-review gate.
2. **One controlled bounded-wait expiry/cancellation demonstration for `ORCH-06`:** a bounded in-turn deadline expires (or an explicit cancellation occurs) during an active `collaboration.wait_agent` wait, and Root records `timed_out` (or `cancelled`) with `Timeout / Cancellation Reason`, rejects any stale child output, and emits one Boss event — all within the same active turn, with no polling loop as a substitute.

A simulated transcript, prose handoff, monitor-registration-only claim, or any reliance on cross-turn resumption or heartbeat polling as evidence does not satisfy `ORCH-02`, `ORCH-04`, or `ORCH-06`.

### Evidence Observability Amendment — 2026-07-19 (Boss-approved)

QA's recheck at `552db00` (Stop Reason: `qa_evidence_unverifiable`) exposed a structural gap in the Revised Acceptance Path: on this host, a QA subagent runs inside the Root turn it is asked to verify and has no tool access to Root's session state, Handoff Event records, or host task registry. Under a literal reading, no QA invocation could ever verify a live in-turn chain, because the chain's evidence necessarily reaches QA secondhand. The human maintainer (Boss) approved this amendment resolving both of QA's proposed remediation paths together:

1. **What "QA observes" means on this host.** QA observes live-chain evidence through two channels, and both together satisfy the observation requirement:
   - **Direct observation:** QA's own invocation — occurring inside the same active Root turn, after the prior receipt in the chain was consumed, without any new Boss message — is direct evidence QA personally attests for the dispatch leg that invoked it.
   - **Durable transcript artifact:** for chain legs QA did not run inside, the acceptance evidence is a durable, Boss-visible transcript posted by Root to the Work Item (GitHub Issue comment) **before or during the QA recheck**, containing the concrete `Handoff Event ID`s, `Terminal Result ID`s, host task identifiers, and host-recorded outcomes (e.g., a host `TaskStop` response and `status: killed` notification for a cancellation). QA must retrieve this artifact itself through a read-only channel (e.g., the GitHub CLI/API), not accept it as text inside its own dispatch prompt.
2. **The exclusion clause is narrowed, not removed.** "A simulated transcript, prose handoff, monitor-registration-only claim, or any reliance on cross-turn resumption or heartbeat polling" still fails `ORCH-02`/`ORCH-04`/`ORCH-06` when it is the only evidence. Narrative text inside QA's dispatch prompt remains non-evidence. The difference: a durable Work Item transcript with concrete receipt identifiers and host-recorded outcomes, retrievable by QA independently, is acceptance evidence — it is auditable by the Boss and any later reviewer, survives the turn, and cannot be silently altered by the dispatch prompt.
3. **Honesty rule preserved.** The transcript is Root-authored; QA must state which rows rest on the durable artifact versus QA's direct observation. A chain whose artifact is missing, lacks receipt identifiers, or contradicts QA's direct observation fails as before.

Reference artifact for this Work Item: Issue #33 comment `5012198523` (Root in-turn chain transcript at `552db00`).
