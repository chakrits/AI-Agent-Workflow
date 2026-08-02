# CP-1 Software Design — Issue #132 Progressive Context Compatibility

## Metadata

- Work Item ID: GitHub Issue #132
- Title: Progressive context loading — CP-1 measurable compatibility contract
- Owner: SA Agent
- Status: CP-1 architecture evidence; Human review required before specification readiness
- Change type / risk: Framework / Meta; Medium
- Contract version: `context-compatibility/v1`
- Evidence commit: `f215735` on `132-feature-progressive-context-loading-strategy-worktree-scoped-status-architecture`

## Context and evidence boundary

The approved design requires legacy-authoritative, read-only shadow comparison and host-native token measurement. Repository adapter files prove that host-specific instructions exist; they do not prove what a host loads before its first task action or that token telemetry is available. All host activation claims below therefore remain either confirmed repository facts or explicitly unknown future evidence.

Authoritative constraints are in `docs/superpowers/specs/2026-07-31-progressive-context-and-worktree-status-compatibility-design.md:1-124`; CP-1 outputs are required by `docs/records/implementation-plan/2026-07-31-progressive-context-and-worktree-status.md:21-26,37-39`.

## Goals / non-goals

### Goals

- Freeze one versioned 36-case normalized fixture contract for Slice A.
- Freeze paired host-native token measurement and telemetry-adapter behavior.
- Record an evidence-backed initial host matrix without inferring support.
- Define fallback and N/A rules that preserve legacy behavior and prevent mutation.

### Non-goals

- No adapter, pack, comparator, fixture implementation, live measurement, activation, or host-support approval.
- No claim that repository file size equals host input tokens.
- No `status:spec-ready`, Developer approval, or Go/No-Go decision.

## Normalized comparison record v1

Every full-context and progressive run emits the following logical record. Serialization is canonical UTF-8 JSON with object keys sorted lexicographically, arrays in contract-defined order, no insignificant whitespace, and SHA-256 over those bytes. Missing required fields are comparator errors; `null` is allowed only where the fixture explicitly says N/A.

| Field | Required normalized value |
|---|---|
| `contractVersion`, `fixtureId`, `slice` | `context-compatibility/v1`, stable fixture ID below, `context` |
| `changeType`, `risk` | Canonical classification values |
| `workflow`, `roles`, `skills`, `artifacts`, `gates` | Selected workflow and ordered canonical identifiers |
| `lifecyclePhase`, `nextOwner` | Resulting phase and exact owner |
| `stopBackwardReworkResult` | `continue`, named backward route, named Human stop, retry/circuit result, or fail-closed result |
| `dispatchMandatoryFields` | Presence/value map for every required dispatch/handoff field |
| `acknowledgement`, `terminalConsumption` | Explicit state, evidence ID or `null`, exactly-once outcome |
| `statusSet`, `projectionDigest` | Status values and digest unchanged from legacy; for Slice A an inapplicable projection is `null` with unchanged behavior asserted |
| `contextManifest` | Ordered entries: source path, source hash/version, approximate diagnostic tokens, trigger reason, load result |
| `authority`, `mutationAttempted` | `legacy`, always `false` during shadow |
| `resultDigest` | SHA-256 of the normalized record excluding this field |

Critical fields are every field above except diagnostic `contextManifest[].approximateTokens`. Any other divergence is non-critical only after Reviewer documents why it cannot affect routing, gates, dispatch, consumption, lifecycle, or status.

## Frozen 36-case fixture catalog

Each fixture has two inputs (`full`, `progressive`) pinned to the same commit, task payload, host, model/configuration, and adapter version. Expected result is exact normalized equality unless the row states a fail-closed outcome. Fixture bodies must be versioned; changing an expected value requires a new contract version, not an in-place rewrite.

| ID | Group | Input focus | Expected normalized result |
|---|---|---|---|
| CTX-R01 | Routing | Feature / low risk | Feature workflow, required roles/artifacts/gates, no weakened gate |
| CTX-R02 | Routing | Feature / high risk | High-risk route and Human gates preserved |
| CTX-R03 | Routing | Bug Fix | Bug-fix contract route preserved |
| CTX-R04 | Routing | Config | Config route; Developer skipped when no code |
| CTX-R05 | Routing | Data/reference data | Data route and validation/rollback artifacts |
| CTX-R06 | Routing | API contract | BA → SA → Developer → QA route |
| CTX-R07 | Routing | Test-only | QA → Reviewer route |
| CTX-R08 | Routing | Documentation-only | Documentation → Reviewer route |
| CTX-R09 | Routing | Framework/meta | Orchestrator → Documentation → Reviewer/QA → Human |
| CTX-R10 | Routing | Security-sensitive | Security Reviewer included; Human stop retained |
| CTX-R11 | Routing | Unclassified | Stop for Human classification; no dispatch/mutation |
| CTX-R12 | Routing | Explicit backward-route ambiguity | Same BA/SA receiving owner as legacy |
| CTX-D01 | Dispatch | Complete packet shape | All mandatory fields equal |
| CTX-D02 | Dispatch | Missing mandatory field | Rejected before dispatch |
| CTX-D03 | Dispatch | Invocation recorded | `dispatched` distinct from acknowledgement |
| CTX-D04 | Dispatch | Acknowledgement received | Evidence ID preserved |
| CTX-D05 | Dispatch | Terminal PASS | PASS consumed once, one successor/Boss event |
| CTX-D06 | Dispatch | Terminal BLOCKED | Block reason/owner preserved, no successor |
| CTX-D07 | Dispatch | Timeout | `timed_out`, stale output rejected |
| CTX-D08 | Dispatch | Cancellation | `cancelled`, stale output rejected |
| CTX-D09 | Dispatch | Duplicate terminal result | First immutable result retained; no redispatch/event |
| CTX-D10 | Dispatch | Late terminal result | Late result rejected; no redispatch/event |
| CTX-S01 | Stop/backward/rework | Scope/architecture Human gate | Human stop preserved |
| CTX-S02 | Stop/backward/rework | Auth/secrets/privacy/payment gate | Security + Human stop preserved |
| CTX-S03 | Stop/backward/rework | QA → BA | Acceptance ambiguity routes backward |
| CTX-S04 | Stop/backward/rework | Developer → SA | Architecture/contract gap routes backward |
| CTX-S05 | Stop/backward/rework | QA → Developer | Implementation failure routes backward |
| CTX-S06 | Stop/backward/rework | Security → SA/Developer | Trust/control gap route preserved |
| CTX-S07 | Stop/backward/rework | Retry exhaustion | Human-review block at governed limit |
| CTX-S08 | Stop/backward/rework | Circuit/host completion unavailable | Fail closed; no claimed continuation |
| CTX-E01 | Fallback/error | Unknown role | Invalid manifest; safe legacy fallback or owner stop |
| CTX-E02 | Fallback/error | Unknown skill | Invalid manifest; safe legacy fallback or owner stop |
| CTX-E03 | Fallback/error | Stale source hash | Pack rejected; safe legacy fallback or owner stop |
| CTX-E04 | Fallback/error | Missing pack/source | Pack rejected; safe legacy fallback or owner stop |
| CTX-E05 | Fallback/error | Malformed/duplicate manifest entry | Manifest rejected before task action |
| CTX-E06 | Fallback/error | Comparator/telemetry adapter error | No parity claim; legacy result preserved; owner-visible reason |

The first 30 cases assert the same routing/dispatch/stop contract as Slice B but are independent fixtures and executions. The six Slice A error cases are context-specific. `projectionDigest: null` is an evidence-backed N/A only for Slice A and still asserts that no status projection changed.

## Paired-token measurement protocol and telemetry adapter

### Pair identity and ordering

One pair key is SHA-256 of `{commit, fixtureVersion, fixtureId, hostId, hostVersion, modelId, modelConfigurationDigest, adapterId, adapterVersion}`. Full and progressive legs run in randomized, recorded order in fresh equivalent sessions. A pair is invalid if any identity field differs, either leg is retried without its mate, the first task-specific action boundary cannot be identified, or native input-token telemetry is absent.

### Required adapter output

| Field | Rule |
|---|---|
| `adapterId`, `adapterVersion`, `hostId`, `hostVersion` | Non-empty versioned identifiers |
| `pairKey`, `fixtureId`, `mode` | Stable pair; mode is `full` or `progressive` |
| `commit`, `modelId`, `modelConfigurationDigest` | Exact-match pairing fields |
| `sessionStartedAt`, `firstTaskActionAt` | RFC 3339 UTC; boundary semantics documented by host owner |
| `nativeInputTokensBeforeFirstTaskAction` | Non-negative integer from host-native telemetry; never chars/4 |
| `telemetrySource`, `telemetryEventId` | Native API/event name and immutable evidence reference |
| `manifestDigest`, `normalizedResultDigest` | Exact artifacts compared |
| `fallbackInvoked`, `fallbackReason`, `adversarialFixture` | Explicit denominator controls |
| `valid`, `invalidReason` | Adapter must reject—not estimate—missing/ambiguous evidence |

Per valid pair, reduction is `1 - progressive/full`. `full = 0` invalidates the pair. Per host, run all 36 deterministic scenarios and report median and nearest-rank 5th percentile; do not pool hosts. Go requires median at least 50% and p05 at least 40% for each claimed host.

### Fallback denominator

Operational fallback attempts are non-adversarial progressive activations. Deliberate CTX-E01–E06 negative fixtures are excluded and tagged `adversarialFixture: true`. Report per-host and overall `fallback attempts / eligible attempts`; zero eligible attempts is N/A, never 0%. Safe fallback must produce the same normalized legacy result and must not dispatch, consume, advance lifecycle, or mutate status before completion.

## Initial supported/unknown host matrix

| Host | Confirmed repository fact | Native token observability | CP-1 support status | Required future activation evidence / owner |
|---|---|---|---|---|
| Codex | A host dispatch adapter exists at `.codex/orchestrator-supervision.md:1-21`; it specifies in-turn completion, not token telemetry. | Unknown | Unknown / not claimable | Codex platform owner must name the native pre-action token event/API, boundary, adapter version, and provide 36 valid pairs. |
| Claude Code | `CLAUDE.md:3-13` is a host instruction adapter and requires root status/workflow reads; no native token event is defined there. | Unknown | Unknown / not claimable | Claude platform owner must provide the same telemetry contract evidence and 36 valid pairs. |
| Portable / Antigravity-style adapter | `.agents/workflows/dynamic-workflow.md:1-28` defines portable routing behavior, not a native token telemetry surface. | Unknown | Unknown / not claimable | Human/platform owner for the concrete host must identify a native source and provide 36 valid pairs. |

No host is initially marked supported. Repository facts establish candidate adapters only. An unsupported or unobservable host is marked N/A with owner evidence, excluded from another host's activation claim, and blocked from Go for itself.

## Loading, fallback, and fail-closed boundaries

- Boot-safe canonical material contains classification, stop conditions, Human gates, source index, and legacy fallback entry point. Role/skill packs load only after a deterministic trigger.
- A manifest entry binds normalized repository-relative source path to immutable content hash/version. Path escape, symlink escape, unknown trigger, missing source, stale hash, duplicate entry, unknown role/skill, or load/comparator error invalidates progressive activation.
- During shadow, legacy remains authoritative and progressive output is read-only. No shadow component may dispatch, acknowledge, consume, advance phase/task state, or write status.
- If legacy can be read safely, fallback occurs before any side effect and its normalized digest must equal the baseline. If legacy is unavailable or equality cannot be established, stop with an owner-visible reason.
- Diagnostic chars/4 estimates may be recorded but cannot make a pair valid or satisfy Go.

## NFRs, security, rollback, and testability

- Reliability: 100% critical-field equivalence; safe fallback at most 5%; above 5% through 10% is Conditional Go/non-default; above 10% is No-Go.
- Observability: immutable pair/event IDs, manifest/result digests, invalid reasons, per-host distributions, and fallback numerator/denominator.
- Security: packs are repository-local derived data; reject path traversal/symlink escape and never load executable content as instructions outside the canonical allow-list. No secrets or task content belong in telemetry.
- Rollback: before authority switch, disable shadow; legacy is unchanged. Compatibility removal requires separate Human approval after the approved fallback-free period.
- Testability: each fixture asserts exact normalized JSON and no-side-effect probes; QA executes rather than SA self-certifying results.

## Decisions, assumptions, and open evidence

- Decision: freeze `context-compatibility/v1` and the 36 IDs above.
- Decision: support is per concrete host; no pooled activation claim.
- Assumption: SHA-256 and canonical JSON are available to a future implementation; this is a design choice, not observed activation evidence.
- Unresolved evidence: native token telemetry and first-action boundary for every candidate host; actual 36-pair measurements; 20 preselected historical replays; independent Reviewer/QA evidence; Human activation decision.
- Human gate: the Human Maintainer/platform owner must approve each host adapter and eventual Go/No-Go. This record does not authorize `status:spec-ready`.

## Related artifacts

| Artifact | Purpose | Repository path |
|---|---|---|
| Approved compatibility design | Governing constraints | `docs/superpowers/specs/2026-07-31-progressive-context-and-worktree-status-compatibility-design.md` |
| Implementation plan | CP-1 and later checkpoints | `docs/records/implementation-plan/2026-07-31-progressive-context-and-worktree-status.md` |
