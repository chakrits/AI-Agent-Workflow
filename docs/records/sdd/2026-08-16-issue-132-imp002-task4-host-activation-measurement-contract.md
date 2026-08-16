# Software Design Document: IMP-002 Task 4 Host Activation and Measurement Contract

## Metadata

- Work Item ID: GitHub Issue #132 / IMP-002 Task 4
- Title: Host activation and native measurement contract for progressive-context shadowing
- Owner: SA Agent with Developer implementation handoff
- Status: Approved design candidate — Human review required before implementation
- Base: `251066b` on `codex/imp-002-task-3-shadow-adapter`
- Authority boundary: `legacy` remains the only runtime authority

## Context

Task 3 provides a repository-owned, non-authoritative `context-pack/v1` shadow adapter. Its
fixture and adapter tests prove repository behavior, but they do not prove that a host can
activate the candidate path, expose native token measurements, or deliver terminal results
with the workflow semantics required by this experiment. Task 4 therefore defines the
evidence and adapter boundary before any host-specific implementation is written.

The existing `workflow-evidence/v1` seam is authoritative for evidence event types and
outcomes. The existing `human_approval` event is the observation-window approval anchor.
Repository fixture/simulation evidence and host-native evidence are separate evidence classes;
one cannot be substituted for the other.

## Goals / Non-goals

### Goals

- Freeze a host-neutral capability record and host matrix for Codex, Claude, Gemini, Cursor,
  and Antigravity.
- Define the minimum native activation, token measurement, timestamp, identity, and owner
  evidence required before a host can be measured or considered supported.
- Preserve the existing `workflow-evidence/v1` event model, including terminal outcomes and
  the `human_approval` observation anchor.
- Specify fail-closed behavior, legacy fallback, rollback, privacy boundaries, and tests for
  the future Task 4 implementation.

### Non-goals

- No runtime host adapter, native activation, token collection, replay, live-shadow execution,
  Go/No-Go decision, or authority switch is implemented by this design record.
- No change to routing, dispatch, lifecycle, retry, worktree, receipt, or wait semantics.
- No claim that any listed host is currently supported. Every host remains `unknown` until
  native evidence is collected and independently verified.
- No new `workflow-evidence/v1` event type and no change to the existing schema in this task.

## Architecture Overview

```text
host-native activation + token probe
              |
              v
     capability record (host evidence)
              |
              +----> host adapter eligibility / fail closed
              |
              +----> existing human_approval evidence anchor
                              |
                              v
                  bounded Task 5 observation window

repository fixtures + context-pack/v1 simulation remain a separate evidence source
and cannot upgrade a host capability decision.
```

The candidate adapter remains observational. It may produce host evidence and a structured
fallback record, but it must never replace the legacy result, mutate workflow authority, or
infer host support from fixture results.

## Component Design

### 1. Capability record

The future host adapter must emit one immutable, addressable capability record per observed
host/version. The record has exactly these normative fields:

| Field | Required meaning | Fail-closed condition |
|---|---|---|
| `host` | Closed host identity: `Codex`, `Claude`, `Gemini`, `Cursor`, or `Antigravity` | Missing or unknown host |
| `hostOwner` | Named Human or host owner responsible for the activation evidence | Missing, anonymous, or not addressable |
| `adapterVersion` | Version of the repository/host adapter that produced the record | Missing or non-immutable version |
| `activationEvidenceRef` | Addressable evidence proving native activation in the named host | Missing, fixture-only, or unverifiable reference |
| `tokenEvidenceRef` | Addressable native token evidence, or an explicit evidence reference for its absence | Missing when a token status is not `unsupported`, `unavailable`, or `N/A` |
| `tokenMeasurementStatus` | `available`, `unsupported`, `unavailable`, or `N/A` | Missing or unsupported value |
| `observedAt` | UTC ISO-8601 observation timestamp | Missing, malformed, or not tied to the record |
| `capabilityDecision` | `unknown`, `supported`, `unsupported`, `unavailable`, or `N/A` | Missing; `supported` without all evidence above |

`capabilityDecision: supported` is valid only when native activation, named ownership, an
adapter version, an addressable token-evidence decision, and a valid observation timestamp
are all present. `unsupported`, `unavailable`, and `N/A` require a non-empty reason in the
associated evidence record and never count toward the supported-host threshold. `unknown` is
the initial state and remains the state when evidence is incomplete.

The capability record is host evidence. It is not a `context-pack/v1` manifest, a fixture
result, a token estimate, a dispatch receipt, or a correlation ID. The record reference may
be used as `evidence_ref`; measurement/run IDs remain separate identities.

### 2. Host matrix

The initial matrix is deliberately conservative:

| Host | Initial decision | Required before any supported claim |
|---|---|---|
| Codex | `unknown` | Native activation evidence, named host owner, adapter version, token evidence/status, UTC observation |
| Claude | `unknown` | Same requirements |
| Gemini | `unknown` | Same requirements |
| Cursor | `unknown` | Same requirements |
| Antigravity | `unknown` | Same requirements |

Repository simulation, a passing `context-pack/v1` fixture, documentation parity, or a
successful injected candidate-loader test cannot change a row from `unknown` to `supported`.
An unavailable host capability is recorded explicitly and remains out of the supported-host
denominator. The matrix must retain the reason and evidence reference for every non-supported
decision.

### 3. Evidence separation and measurement identity

Task 4 must keep these evidence classes separate:

1. `context-pack/v1` and the 36 frozen compatibility fixtures prove repository contract
   behavior only.
2. The capability record proves host-native activation and the host's measurement capability.
3. `workflow-evidence/v1` records a measurement event, pair/shadow result, fallback, or
   existing Human approval with its own correlation and evidence references.

The host adapter must not merge or relabel fixture evidence as host telemetry. Every native
measurement has a non-empty `measurement_id`, host identity, adapter/configuration identity,
and UTC `observed_at`. `packId`, `measurement_id`, `evidence_id`, `event_id`, and
`activationEvidenceRef` remain distinct values even when they refer to the same observation.

The existing `context_loaded` event remains the place for the context manifest digest and
`token_measurement_status`. The existing `shadow_compared`/`shadow_fallback` events remain
the places for pair results and fallback reasons. The host capability record is referenced,
not embedded as a replacement for those event contracts.

### 4. Wait and terminal-result semantics

`operator_wait` is a wait-policy value describing that an operator requested continued
consumption of a child terminal result without an agent-imposed timeout. It does not rewrite,
erase, or reinterpret canonical workflow outcomes.

The adapter/evidence boundary must preserve:

- `timed_out` when the governed wait deadline expires;
- `host_completion_unavailable` when the host cannot deliver the required terminal result in
  the active turn; and
- the original terminal result identity and timestamp when it is delivered.

An operator's request to “wait until terminal result” therefore cannot turn a timed-out or
host-unavailable observation into success, cannot consume stale output, and cannot silently
redispatch. The existing handoff and workflow-evidence contracts remain authoritative for
these outcomes.

### 5. Human approval anchor

Task 4 reuses the existing `workflow-evidence/v1` `human_approval` event. The record must have
`decision: approved` and an `evidence_ref` pointing to the host capability record before a
future Task 5 observation window can start. No new evidence event type is introduced.

The event's UTC `observed_at` is the sole `observation_started_at` anchor. Operator wait
activity, fixture timestamps, branch creation time, or a later host log cannot replace it.
If this event is absent, malformed, not approved, or not linked to a valid capability record,
Task 5 must remain blocked and legacy remains authoritative.

## API Contract

Task 4 implementation must expose a repository-owned, host-neutral adapter boundary. The
exact module API is left to the Developer within this contract, but its returned capability
record must be structurally equivalent to:

```text
{
  host,
  hostOwner,
  adapterVersion,
  activationEvidenceRef,
  tokenEvidenceRef,
  tokenMeasurementStatus,
  observedAt,
  capabilityDecision,
  reason: required for unknown/unsupported/unavailable/N/A
}
```

The adapter must reject missing owner/evidence/status/timestamp, unknown host values, stale
or mismatched evidence references, and any attempt to mark simulation as native. Rejection
returns an owner-visible structured reason and leaves the legacy path authoritative. The
adapter must not accept a caller-provided `supported` flag as proof.

## Data Model / Data Impact

- Schema change summary: None in Task 4 design; reuse existing `workflow-evidence/v1`.
- New design artifact: this SDD record only.
- Future implementation records: capability record, host adapter evidence, and tests listed
  below. They must be versioned and addressable; no mutable in-place overwrite of prior
  observations.
- Migration strategy: additive shadow evidence only; no consumer migration or authority
  switch.
- Backfill plan: none. Historical fixture results cannot be backfilled as host-native evidence.
- Rollback plan: disable candidate host activation, preserve all evidence, and run the legacy
  context path. A rollback claim is blocked if the predecessor pack/adapter digest or version
  cannot be reconciled.

## Error Handling and Fail-Closed Rules

The following conditions fail closed to legacy and produce an owner-visible reason:

- missing or anonymous `hostOwner`;
- missing, stale, fixture-only, or unaddressable activation evidence;
- missing token evidence or an unclassified token measurement status;
- unknown host, adapter version, measurement ID, or timestamp;
- simulation/fixture evidence presented as native host evidence;
- missing or unapproved `human_approval` event reference;
- terminal result unavailable in the active turn, recorded as `host_completion_unavailable`;
- governed deadline expiry, recorded as `timed_out`;
- comparator, evidence writer, or capability-record validation failure.

Fallback must retain the legacy result, `authority: legacy`, `mutationAttempted: false`,
the fallback reason, and the relevant evidence references. It must not report a supported
host or a token reduction from an invalid/fallback observation.

## Security and Privacy Considerations

- Do not record credentials, access tokens, prompt bodies, customer data, or raw sensitive
  host payloads in capability records or workflow evidence.
- Store only minimal digests, identifiers, statuses, timestamps, and addressable evidence
  references. Native token evidence must expose the minimum measurement needed for the
  experiment and respect host/platform retention rules.
- `hostOwner` is accountability metadata, not an authorization grant. It must not be used to
  bypass Human approval or validation.
- Host-specific adapters must not gain arbitrary command execution, filesystem mutation,
  credential access, or authority to change routing/dispatch/lifecycle state.
- If activation requires credentials, remote telemetry, or production access, stop and route
  the concrete implementation to Security Reviewer before activation evidence is accepted.

## NFRs

- Reliability: invalid or incomplete host evidence must deterministically fall back to legacy;
  no silent success or unsupported-host promotion.
- Observability: every decision and fallback has an addressable evidence reference, UTC
  timestamp, reason where required, and separate host/measurement identity.
- Determinism: same capability input and evidence set yields the same decision; no wall-clock
  inference other than validating the recorded UTC timestamp.
- Compatibility: no change to existing dispatch receipt, lifecycle, retry, worktree, or
  terminal-result semantics.
- Privacy: no raw sensitive host content in repository records; hashes/references only.

## Future Task 4 File and Test Scope

The Developer may implement only the following approved categories after Human approval of
this SDD:

- a host-neutral capability/activation adapter module under `scripts/lib/`;
- a validator or evidence-mapping module under `scripts/` only if required to enforce this
  record and the existing `workflow-evidence/v1` contract;
- focused unit tests under `test/` for valid capability, unknown host, missing owner,
  missing/stale/fixture-only evidence, each explicit token status, simulation-versus-native
  separation, invalid Human approval reference, `operator_wait` preservation, `timed_out`,
  `host_completion_unavailable`, and legacy fallback;
- a bounded host/evidence record under `docs/records/` if required by the implementation
  contract; no edits to existing QA records.

Required negative tests must prove that simulation cannot mark a host `supported`, missing
native token evidence cannot count toward support, operator wait cannot erase terminal
outcomes, and fallback preserves the legacy result and authority.

## Rollback / Fallback

Rollback is observational and reversible: disable the candidate activation flag/adapter,
retain capability and workflow evidence, and route all subsequent loads through the existing
legacy loader. Do not delete or rewrite evidence to make a host appear unsupported. If a
capability record, pack digest, or predecessor adapter version cannot be reconciled, report
`inconclusive`/`blocked` and stop; do not claim a successful rollback or continue to Task 5.

## Alternatives Considered

1. **Treat fixture compatibility as host support.** Rejected: it conflates repository
   simulation with native activation and token evidence, creating an unsupported Go signal.
2. **Add a new host-approval evidence event.** Rejected: the existing `human_approval` event
   already provides the required decision and observation anchor; a second event type would
   create competing sources of truth.
3. **Let operator wait override timeout/unavailable outcomes.** Rejected: it would erase
   canonical failure evidence and permit stale or incomplete terminal output to be consumed.
4. **Implement host adapters before freezing the evidence contract.** Rejected: host-specific
   behavior would define its own evidence semantics and make cross-host comparison unreliable.

## Decision

Adopt the capability record and fail-closed host matrix above as the Task 4 contract. Keep all
five hosts `unknown` until native activation and token evidence are independently recorded.
Reuse `workflow-evidence/v1` and its existing `human_approval` event. Keep host evidence
separate from fixture simulation, preserve `operator_wait` without erasing `timed_out` or
`host_completion_unavailable`, and keep legacy as the sole authority. This design authorizes
the next Developer handoff only after Human review; it does not authorize Task 5.

## Testability Notes

The implementation must test behavior at the adapter boundary with injected evidence
providers, not by relying on a live host being available in CI. Live activation evidence is a
separate Human/host-owner artifact and cannot be synthesized by unit tests. QA must inspect
the exact changed range, independently recompute evidence references, and verify that no host
row is promoted by repository fixtures alone.

## Related Artifacts / Links

| Artifact | Purpose | URL / Repository Path |
|---|---|---|
| IMP-002 progressive context plan | Governing Task 4 scope and gates | `docs/records/implementation-plan/2026-08-15-issue-132-progressive-context-shadow-plan.md` |
| Task 1/2 contract freeze | Corpus, context-pack, evidence, and fail-closed foundations | `docs/records/sdd/2026-08-16-issue-132-imp002-task1-2-contract-freeze.md` |
| Task 3 code review | Existing shadow adapter boundary and concerns | `docs/records/qa/2026-08-16-issue-132-imp002-task3-code-review.md` |
| Workflow evidence schema | Existing event types, outcomes, and Human approval contract | `docs/contracts/schemas/workflow-evidence.schema.json` |
| Workflow evidence QA | Independent verification of the evidence seam | `docs/records/qa/2026-08-16-issue-183-workflow-evidence-qa.md` |
| Context shadow adapter | Legacy-authoritative Task 3 implementation | `scripts/lib/context-shadow-adapter.mjs` |
| Dynamic routing | Routing, stop, and authority constraints | `docs/workflow/dynamic-routing.md` |
| Handoff contract | Terminal, timeout, and host-unavailable semantics | `docs/workflow/handoff-contract.md` |

## Open Human Questions

1. Which named host owners, if any, are authorized to produce native activation evidence for
   the five initial host rows?
2. Does Human Maintainer approve this contract as the prerequisite for Developer Task 4
   implementation while keeping all host decisions `unknown`?
3. If activation requires credentials, remote telemetry, or production access, which Security
   Reviewer path and retention policy must be completed before evidence collection?

## Handoff

- From Agent: SA Agent
- To Agent: Human Maintainer, then Developer Agent
- Work Item: Issue #132 / IMP-002 Task 4
- Current Stage: Human review of Task 4 contract
- Task State: `spec_ready_pending_human_review`
- Verified Base: `251066b`
- Artifacts Produced: this SDD record
- Files Changed: this SDD record only
- Verification Required Before Handoff: `git diff --check`, `npm run validate:contracts`, `npm run validate:project-state`
- Next Action: Human review; if approved, dispatch Developer for the bounded Task 4 implementation
- Stop Reason: Task 5, host activation claims, and Go/No-Go remain gated
