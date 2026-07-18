# Software Design Document: Orchestrator Dispatch and Boss Visibility

## Metadata

| Field | Value |
|---|---|
| Work Item | GitHub Issue #33 |
| Owner | SA Agent |
| Status | Amended for P0.5 Human design acceptance |
| Scope | P0/P1 contract plus P0.5 supervised completion monitoring; P3 autonomous dispatcher deferred |

## Context

The repository has a valid routing policy and handoff template, but no enforceable distinction between an announced next owner and a dispatched next owner. Agent terminal results may also fail to reach Boss promptly. The design adds an observable, portable control contract without pretending GitHub/GitLab labels execute agents.

## Goals / Non-goals

### Goals

- Make terminal routing deterministic and visible.
- Preserve independent agent ownership, human gates, and QA judgment.
- Distinguish attempted dispatch from accepted/acknowledged work.
- Keep the contract portable across Codex, Claude, Antigravity, GitHub, and GitLab adapters.

### Non-goals

- Build a webhook, queue, scheduler, bot, or background execution runtime.
- Add credentials, permissions, or repository automation triggers.
- Guarantee an elapsed dispatch-latency SLA.
- Replace Issue/PR lifecycle status or evidence.
- Let a monitor make QA judgement, merge, approve, or bypass a human gate.

## Architecture Overview

```text
Terminal Agent Result
  -> Terminal Handoff Contract
  -> Orchestrator validation and target invocation
  -> Dispatch receipt + temporary completion monitor registration
  -> Root may yield while monitor observes the target terminal result
  -> Monitor wake-up event
  -> Orchestrator continuation consumes terminal proof
  -> Boss event + next permitted route OR human/blocked stop
```

The Orchestrator owns the transition from a terminal handoff to its outcome and from a monitored terminal receipt to its next permitted action. The receiving agent owns acknowledgement and validates handoff inputs. The monitor is a host-native, temporary supervisory primitive: it observes completion and wakes the Orchestrator, but it does not make delivery decisions. Boss owns every human-review decision. A GitHub/GitLab Issue may store evidence links, but does not execute the route.

## Component Design

### 1. Terminal Handoff

Extend the existing handoff with:

| Field | Meaning |
|---|---|
| `Next Action` | Exactly one of `Dispatch`, `Human review`, `Blocked`. |
| `Next Owner` | Required for every action; a named non-human agent for `Dispatch`, a human gate owner for `Human review`, or resolution owner for `Blocked`. |
| `Orchestration Turn ID` | Identifier for the active Orchestrator run; binds terminal handoff and receipt. |
| `Boss Event Required` | `Yes` for every terminal outcome. |

### 2. Dispatch Receipt

The receipt is a structured section within the handoff record, Issue comment, or platform-native equivalent:

| Field | Meaning |
|---|---|
| `Dispatch State` | `pending`, `dispatched`, `acknowledged`, `completed`, or `blocked`. |
| `Source Agent` / `Target Agent` | Origin and intended receiver. |
| `Work Item` / `Change Request` | Stable URLs or `N/A — reason`. |
| `Evidence References` | Required artifacts/checks supplied to the receiver. |
| `Dispatch Result` | Runtime/tool result, or explicit reason dispatch was not possible. |
| `Acknowledgement Evidence` | Target-agent receipt/result; absent only while honestly `dispatched`. |
| `Stop Reason` | Required for `blocked` or `Human review`. |

### 3. Temporary Completion Monitor (P0.5)

A `Dispatch` receipt is not complete merely because a target invocation was accepted. Before the Orchestrator yields, it must register one temporary host-native heartbeat/monitor for that receipt whenever the target can complete asynchronously.

| Field | Meaning |
|---|---|
| `Monitor ID` | Stable, receipt-scoped host-monitor identity; unique for a handoff event. |
| `Monitor Owner` | `Orchestrator`; the monitor has no independent workflow authority. |
| `Monitor Target` | The dispatched target-agent/task identity that the monitor observes. |
| `Monitor State` | `registered`, `waiting`, `wake-pending`, `consumed`, `cancelled`, `expired`, or `failed`. |
| `Terminal Result ID` | Immutable target terminal-receipt/result identity once observed. |
| `Terminal Consumption Evidence` | Continuation-turn evidence that binds `Monitor ID`, `Terminal Result ID`, the resulting receipt state, and the Boss event. |
| `Expiry / Cancellation Reason` | Required for `cancelled`, `expired`, or `failed`. |

The monitor is created only after target invocation succeeds and before Root ends the turn. It waits for either a target terminal result, an explicit target cancellation/failure, or its bounded expiry. On one of those events it requests a Root continuation turn. It must be cancelled immediately after successful terminal consumption; it must never survive as an unbounded recurring poll.

### 4. Monitor Lifecycle and Ownership

```text
dispatch accepted
  -> register monitor (`registered`)
  -> Root yields (`waiting`)
  -> target terminal result / cancellation / expiry (`wake-pending`)
  -> Root continuation validates and consumes exactly once (`consumed`)
  -> monitor cancellation proof (`cancelled`)

registration failure -> `blocked` + Boss event
wake/continuation failure -> monitor remains `waiting` or records `failed`/`expired`
expiry -> `blocked` + Boss event; Boss may choose a new supervised route
```

The host monitor may use its native task/thread completion wait and wake capability. It is not a repository service, GitHub/GitLab event listener, webhook, queue, background worker, or external scheduler. The monitor has no GitHub/GitLab credentials and cannot change repository state.

### 5. Wake-up and Terminal Consumption

On a monitor event, the host wakes the Root Orchestrator with the monitor identity and target terminal-result identity. The continuation turn must:

1. load the receipt by `Handoff Event ID` / `Monitor ID`;
2. verify target/result identity and all required handoff evidence;
3. atomically record one terminal-consumption outcome;
4. emit the required Boss-visible event in that continuation turn;
5. either dispatch the next permitted non-human owner and register its monitor, stop for Human review, or mark the route blocked; and
6. cancel the consumed monitor and retain cancellation evidence.

If a host cannot provide both a monitor registration receipt and a Root wake-up primitive, the Orchestrator must not claim P0.5 supervision. It records `blocked` with `monitor_unavailable`, emits a Boss event in the current turn, and asks Boss for the next action.

### 6. Idempotency and De-duplication

Each terminal handoff has a stable `Handoff Event ID`; each monitor is bound to exactly one such event. The consumption key is `(Handoff Event ID, Terminal Result ID)`. The first valid continuation records the terminal-consumption outcome and Boss event identifier. Repeated completion notifications, duplicate wake-ups, late callbacks after cancellation, or a resumed Root turn with the same key must return the recorded outcome without emitting another Boss event or dispatching another next owner.

`acknowledged` remains target receipt evidence; `completed` is not set until the target terminal result is consumed by Root. A target agent's terminal comment/result alone is therefore not proof that Boss has been notified.

### 7. Boss Event

Every terminal outcome emits one concise, user-visible event containing:

1. completed work and quality-gate result;
2. next action and named owner;
3. receipt state and evidence link(s);
4. blocker or decision required, if any.

This is a communication contract. It does not promise a third-party notification delivery mechanism outside the active agent session.

## State Model

```text
pending -> dispatched -> acknowledged -> completed
pending -> blocked
dispatched -> blocked
```

- `pending`: terminal handoff validated; Orchestrator outcome not yet recorded.
- `dispatched`: Orchestrator made a target-agent dispatch attempt in the same active turn and retains its result.
- `acknowledged`: target agent/runtime confirmed receipt.
- `completed`: target agent produced a terminal result; it starts its own terminal-handoff cycle.
- `blocked`: a dispatch attempt cannot proceed or a human gate/required input prevents continuation.

`Human review` is a terminal routing action, not a `Dispatch State`; its receipt is `blocked` with `stop_reason: human_review_required` until Boss acts.

The receipt carries the companion monitor lifecycle. `completed` requires terminal-consumption evidence. Monitor state is not a work-item lifecycle label and does not replace `phase:` / `status:` evidence.

## Same-Orchestration-Turn Invariant

The P0/P1 invariant is satisfied only when the Orchestrator records a receipt before ending the active run that consumed the terminal handoff. P0.5 extends it: an asynchronous target must also have a monitor-registration receipt before Root yields. Valid outcomes are:

- target dispatch attempt accepted and monitor registered → `dispatched` / `waiting`;
- target acknowledges synchronously → `acknowledged`;
- human gate or inability to dispatch → `blocked` with reason and Boss event.

Writing “Next Agent: QA” without a receipt is invalid. This is deliberately an execution-boundary invariant, not a claim that a background runtime starts work within a particular number of minutes.

## Data / Integration Impact

- No database, API, secret, permission, GitHub App, webhook, or ruleset change.
- Canonical documents and templates are the P0/P1 source of truth.
- GitHub/GitLab adapters may render equivalent fields, but cannot claim they caused a dispatch.
- P0.5 uses only the interactive host's temporary agent/thread monitor and continuation capability. It does not use hosted-repository events or create a persistent execution plane.

## Error Handling

| Failure | Required response |
|---|---|
| Missing target/evidence for `Dispatch` | `blocked`; route to source owner to complete the handoff. |
| Target is unavailable / tool dispatch fails | `blocked`; Boss event explains failure and recovery owner. |
| Target does not acknowledge | Retain `dispatched`; report acknowledgement pending, do not claim completion. |
| Required human gate reached | `blocked` with `human_review_required`; do not dispatch a bypass route. |
| Monitor registration unavailable | `blocked` with `monitor_unavailable`; emit Boss event in the current turn and do not yield with a false supervision claim. |
| Monitor expiry before a terminal result | `blocked` with `monitor_expired`; wake/report Boss and require an explicit supervised next step. |
| Duplicate/late completion notification | Match the consumption key; retain the first outcome without duplicate Boss event or dispatch. |
| Root continuation cannot consume result | Keep monitor active only within its bounded lifetime; retry through the host primitive when available, otherwise record `monitor_failed`/`monitor_expired` and notify Boss. |

## Security Considerations

- P0/P1 cannot introduce an execution endpoint, credential, secret, permission, or automatic merge/approval path.
- Handoff content remains evidence, not authority: agents must still enforce existing role boundaries and treat Issue/PR text as untrusted where applicable.
- P0.5 monitor input is limited to host task/thread metadata and terminal receipt identity. It does not execute target content, impersonate an agent, or mutate GitHub/GitLab state.
- P3 must receive a separate SA/Security design before any event-driven dispatcher is built.

## NFRs

| Area | Target |
|---|---|
| Reliability | No terminal handoff ends without a receipt or explicit human/block reason. |
| Completion supervision | A dispatched asynchronous handoff has one temporary monitor registration before Root yields, and one consumption/cancellation outcome. |
| Observability | Boss event has the four required content groups for every terminal result and is emitted from the consumption continuation without a new Boss message. |
| Portability | Canonical contract has adapter parity; no GitHub-only execution assumption. |
| Maintainability | One state vocabulary and one template section; no new lifecycle label taxonomy. |

## Alternatives Considered

| Alternative | Decision |
|---|---|
| Add more GitHub labels | Rejected: labels communicate lifecycle state but do not execute/acknowledge agents. |
| Build webhook dispatcher now | Deferred: requires credential, idempotency, retry, and security architecture beyond the observed P0/P1 gap. |
| Treat a target terminal result as a Boss event | Rejected: a result can sit in an idle Root mailbox; consumption and user-visible reporting must be proved separately. |
| Leave a permanent polling loop | Rejected: creates a hidden execution runtime and leak risk; P0.5 monitor is per-handoff, bounded, and cancelled after consumption. |
| Leave routing as prose | Rejected: cannot detect a silent stall or show Boss actual dispatch state. |

## Decision

Adopt a portable assisted-orchestration contract: terminal handoff → Orchestrator receipt/outcome → temporary host-native completion monitor → Root terminal consumption → Boss event. Enforce the P0/P1 contract and P0.5 supervision semantics through templates, canonical policy, adapters, and regression tests. Keep autonomous dispatch P3 as a separately approved architecture/security initiative.

## Testability Notes

- A regression rejects missing/invalid Next Action, a non-human target without dispatch result, and a terminal receipt lacking required Boss-event content.
- A regression accepts a human gate only with an explicit `human_review_required` stop reason.
- Adapter-parity tests confirm canonical and platform-specific documents use the same state vocabulary.
- Negative tests prove `dispatched` cannot be represented as `acknowledged`/`completed` without target evidence.
- An end-to-end host scenario proves: Root dispatches and registers a monitor, Root yields, the target completes, the host wakes Root, Root consumes the target result once, Boss receives an event without sending a new message, and the monitor is cancelled.
- Negative scenarios prove monitor registration failure, expiry, and duplicate terminal notification become an evidence-backed block/idempotent no-op rather than a silent stall.
