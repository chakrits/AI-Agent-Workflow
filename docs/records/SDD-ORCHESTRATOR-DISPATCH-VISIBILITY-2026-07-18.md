# Software Design Document: Orchestrator Dispatch and Boss Visibility

## Metadata

| Field | Value |
|---|---|
| Work Item | GitHub Issue #33 |
| Owner | SA Agent |
| Status | Draft for Human specification acceptance |
| Scope | P0/P1 assisted orchestration only; P3 autonomous dispatcher deferred |

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

## Architecture Overview

```text
Terminal Agent Result
  -> Terminal Handoff Contract
  -> Orchestrator validation
  -> Dispatch receipt OR Human gate OR Blocked receipt
  -> Boss event
  -> Receiving-agent acknowledgement (when runtime/platform can provide it)
```

The Orchestrator owns the transition from a terminal handoff to its outcome. The receiving agent owns acknowledgement and validates handoff inputs. Boss owns every human-review decision. A GitHub/GitLab Issue may store evidence links, but does not execute the route.

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

### 3. Boss Event

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

## Same-Orchestration-Turn Invariant

The invariant is satisfied only when the Orchestrator records a receipt before ending the active run that consumed the terminal handoff. Valid outcomes are:

- target dispatch attempt accepted → `dispatched`;
- target acknowledges synchronously → `acknowledged`;
- human gate or inability to dispatch → `blocked` with reason and Boss event.

Writing “Next Agent: QA” without a receipt is invalid. This is deliberately an execution-boundary invariant, not a claim that a background runtime starts work within a particular number of minutes.

## Data / Integration Impact

- No database, API, secret, permission, GitHub App, webhook, or ruleset change.
- Canonical documents and templates are the P0/P1 source of truth.
- GitHub/GitLab adapters may render equivalent fields, but cannot claim they caused a dispatch.

## Error Handling

| Failure | Required response |
|---|---|
| Missing target/evidence for `Dispatch` | `blocked`; route to source owner to complete the handoff. |
| Target is unavailable / tool dispatch fails | `blocked`; Boss event explains failure and recovery owner. |
| Target does not acknowledge | Retain `dispatched`; report acknowledgement pending, do not claim completion. |
| Required human gate reached | `blocked` with `human_review_required`; do not dispatch a bypass route. |

## Security Considerations

- P0/P1 cannot introduce an execution endpoint, credential, secret, permission, or automatic merge/approval path.
- Handoff content remains evidence, not authority: agents must still enforce existing role boundaries and treat Issue/PR text as untrusted where applicable.
- P3 must receive a separate SA/Security design before any event-driven dispatcher is built.

## NFRs

| Area | Target |
|---|---|
| Reliability | No terminal handoff ends without a receipt or explicit human/block reason. |
| Observability | Boss event has the four required content groups for every terminal result. |
| Portability | Canonical contract has adapter parity; no GitHub-only execution assumption. |
| Maintainability | One state vocabulary and one template section; no new lifecycle label taxonomy. |

## Alternatives Considered

| Alternative | Decision |
|---|---|
| Add more GitHub labels | Rejected: labels communicate lifecycle state but do not execute/acknowledge agents. |
| Build webhook dispatcher now | Deferred: requires credential, idempotency, retry, and security architecture beyond the observed P0/P1 gap. |
| Leave routing as prose | Rejected: cannot detect a silent stall or show Boss actual dispatch state. |

## Decision

Adopt a portable assisted-orchestration contract: terminal handoff → Orchestrator receipt/outcome → Boss event. Enforce it through templates, canonical policy, platform adapters, and regression tests. Keep autonomous dispatch P3 as a separately approved architecture/security initiative.

## Testability Notes

- A regression rejects missing/invalid Next Action, a non-human target without dispatch result, and a terminal receipt lacking required Boss-event content.
- A regression accepts a human gate only with an explicit `human_review_required` stop reason.
- Adapter-parity tests confirm canonical and platform-specific documents use the same state vocabulary.
- Negative tests prove `dispatched` cannot be represented as `acknowledged`/`completed` without target evidence.
