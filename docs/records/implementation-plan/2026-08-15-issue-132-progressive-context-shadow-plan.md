# Implementation Plan: IMP-002 Progressive Context Loading Shadow Experiment

> Work item: [Issue #132](https://github.com/chakrits/AI-Agent-Workflow/issues/132)
> Status: **Draft — Human approval and `status:spec-ready` are required before Developer implementation.**
> Roadmap: [IMP-002](https://github.com/chakrits/AI-Agent-Workflow/blob/main/docs/superpowers/plans/2026-08-15-framework-improvement-roadmap.md#imp-002-run-progressive-context-loading-as-a-shadow-only-experiment)

## Objective and decision boundary

Measure whether role-scoped/progressive context reduces unnecessary loading while preserving the current workflow. The legacy context path remains authoritative throughout.

This plan does not authorize an authority switch, consumer migration, release, compatibility removal, lifecycle/retry/dispatch-contract change, human-gate change, durable orchestration, or a final Go decision. The initial `Tier 1 <= 4,000` and `skill <= 500` targets are not used: current repository evidence makes them unsatisfiable as universal limits. The experiment measures boot composition and on-demand activation instead.

## Current repository evidence

The bounded `context-compatibility/v1` foundation merged through PR #137 as `afe8091b0f2585c4472ff26c6f73a99b76d76869`:

- `scripts/lib/context-compatibility.mjs` provides manifest validation, canonical digests, fail-closed records, and comparison differences.
- `test/context-compatibility.test.mjs` and `test/fixtures/context-compatibility-v1.json` execute 36 frozen cases: 12 routing, 10 dispatch, 8 stop/backward/rework, and 6 fallback/error.
- The comparator ignores only `contextManifest[].approximateTokens`; routing, roles, gates, owners, stop outcomes, dispatch evidence, and fallback semantics remain comparable.
- The seam requires `authority: legacy` and `mutationAttempted: false`.
- Existing QA explicitly says the fixtures do not prove a concrete host loads progressive context or supplies native token telemetry.
- IMP-001 freezes evidence ownership, paired measurements, denominators, `N/A` rules, rollback evidence, and host-telemetry boundaries.
- IMP-001 deliberately leaves the `workflow-evidence/v1` JSON schema, runtime writer, and validator as a later implementation seam. Issue [#183](https://github.com/chakrits/AI-Agent-Workflow/issues/183) is the named prerequisite consumed by this plan; no measurement run may start before its exact artifacts are merged and independently verified.

The context-budget validator is an approximate repository baseline, not host-native token usage. `chars / 4` must not be presented as model telemetry or proof that every canonical file is loaded at session boot.

## Classification, route, and scope

| Field | Decision |
|---|---|
| Change type | Framework / Meta — shadow compatibility experiment |
| Risk | Medium/High: false equivalence could weaken routing, stop gates, or Human approval |
| Route | Orchestrator → SA → Documentation Agent → Human approval → Developer → Code Review → QA → Human review |
| Runtime authority | Legacy only; candidate path is observational/shadow |
| TDD | Required for behavior-changing loader/adapter code |
| Security | Conditional; required if credentials, remote telemetry, or hosted mutation is introduced |

In scope: the existing compatibility seam, a versioned progressive manifest/loader adapter if approved, host activation/evidence adapters, paired comparison/fallback/rollback evidence, and the measurement record. Out of scope: `docs/contracts/bug-fix-workflow.yaml`, lifecycle/retry/receipt semantics, Issue #133 status migration, changes to `docs/records/qa/`, and claims of host support without host evidence.

## Acceptance criteria

| ID | Criterion | Required evidence |
|---|---|---|
| AC-01 | The 36-case corpus is frozen by a versioned manifest/source hash and executes unchanged through full and candidate paths. | Named corpus manifest, count/hash validator, exact commit. |
| AC-02 | Candidate context uses the exact `context-pack/v1` manifest contract and role/load-mode required-source matrix defined below: SHA-256 source hashes, explicit run-level authority/role/load mode/measurement status, entry-level source/trigger/load/fallback fields, `minItems`, unique paths, and rejected unknown fields. | Closed JSON Schema, matrix, negative tests, vectors, validator output, and mapping to `workflow-evidence/v1`. |
| AC-03 | Full and candidate runs use identical paired inputs and compare normalized result digests, excluding only diagnostic token fields. | Pair IDs and input/legacy/candidate digests; 36/36 results. |
| AC-04 | Routing, required roles, stop/backward/rework outcomes, dispatch/terminal/consumption evidence, Human gates, and fallback/error behavior remain equivalent; any unexplained mismatch blocks the result. | Matrix plus independent QA reproduction. |
| AC-05 | Host activation is evidenced separately from repository simulation. A host is supported only with native activation evidence and at least 36 valid paired observations; otherwise record unknown/unsupported/unavailable/N/A with reason. | Per-host activation record, capability matrix, native measurement or reason. |
| AC-06 | Measurement reports per-host fallback rate, reduction distribution, token availability, unsupported/unavailable counts, mismatches, and denominators using the IMP-001 evidence seam. Operational fallback excludes deliberate fallback fixtures and maps `<=5%` to Go, `>5%–10%` to Conditional Go, and `>10%` to No-Go. | `workflow-evidence/v1` records, fallback classification, thresholds, and reproducible commands. |
| AC-07 | Historical replay and live-shadow evidence are separate. Exactly 20 valid historical replays are required; if 20 cannot be proven, the result is `BLOCKED` and requires a Human decision. Live shadow completes 10 consecutive real work items **or** 14 calendar days, whichever is later; Human Go/No-Go occurs by day 30. Fewer than 10 qualifying live items at day 30 is `BLOCKED`, not a pass. | Replay validity records; live count/window/denominator, Go/No-Go evidence, and explicit blocked result. |
| AC-08 | Invalid pack, stale source, comparator/telemetry error, or host limitation fails closed, records a reason, and leaves legacy behavior authoritative. | Negative tests and rollback rehearsal with paired input. |
| AC-09 | No default activation, authority switch, consumer migration, release, or final Go claim occurs in this increment. | Diff/scope audit, QA negative-scope check, Human gate record. |

## Task breakdown

### Task 0 — Complete the evidence-runtime prerequisite

**Owner:** SA + Developer + QA. **Depends on:** IMP-001 specification and Issue #183 approval.
**Targets:** `docs/contracts/schemas/workflow-evidence.schema.json`, `scripts/lib/workflow-evidence.mjs` (canonical writer/API), `scripts/validate-workflow-evidence.mjs` (CLI validator), `test/workflow-evidence.test.mjs` (writer/API tests), `test/validate-workflow-evidence.test.mjs` (validator tests), `package.json` validation script, and `.github/workflows/validate-contracts.yml` registration if required by the approved Issue #183 plan.

Implement and independently verify the minimum `workflow-evidence/v1` schema/validator/writer seam required by this plan. `writeEvidence(record, destination)` in `scripts/lib/workflow-evidence.mjs` is the named API; it must canonicalize, validate, and append one record without mutating dispatch receipts. `npm run validate:workflow-evidence <path>` is the named validator command. The existing dispatch receipt remains a ledger and is not extended with analytics fields. Issue #183 must validate event type, source, authority, correlation IDs, outcome/reason rules, digest/evidence references, and the context/shadow events used here. #132 cannot enter replay/live-shadow execution until Issue #183 is merged and its commit/evidence URL is referenced.

**Verify:** focused evidence tests, `npm run validate:contracts`, negative cases for missing reason/digest/correlation and unsupported token status, and independent QA.

**Checkpoint 0:** no Task 1–6 replay or live-shadow work is authorized while this prerequisite is incomplete.

### Task 1 — Freeze corpus and evidence contract

**Owner:** SA + Documentation Agent. **Depends on:** Human approval of this plan.
**Targets:** `test/fixtures/context-compatibility-v1.json`, `test/fixtures/context-compatibility-v1.manifest.json`, `scripts/validate-context-compatibility.mjs`, `test/context-compatibility.test.mjs`, `test/validate-context-compatibility.test.mjs`, package validation script, measurement record.

Create `test/fixtures/context-compatibility-v1.manifest.json` with `schemaVersion: context-corpus/v1`, exact fixture path, UTF-8 SHA-256 of `test/fixtures/context-compatibility-v1.json`, `fixtureCount: 36`, group counts `{routing:12, dispatch:10, stopBackwardRework:8, fallbackError:6}`, source commit, and canonicalization identifier. `scripts/validate-context-compatibility.mjs` is the named validator command and must reject count/hash/group drift. Record pair IDs, input/legacy/candidate digests, model/configuration digest, measurement IDs, host IDs, first-action boundary, and explicit `N/A` reasons. An invalid pair is one missing any required digest, pair ID, host/configuration identity, or first-action observation; invalid pairs remain in the denominator and cannot count toward a supported-host threshold. Define semantic fields versus the sole diagnostic exclusion (`approximateTokens`) without changing expected fixture behavior.

**Verify:** focused compatibility test, fixture count/hash check, `npm run validate:contracts`, `git diff --check`.

### Task 2 — Define boot/role-pack contract and fail-closed rules

**Owner:** SA + Documentation Agent. **Depends on:** Task 1.
**Targets:** `docs/contracts/schemas/context-pack-v1.schema.json`, `test/fixtures/context-pack-v1/required-source-matrix.json`, `test/fixtures/context-pack-v1/vectors.json`, approved design record, and candidate manifest/loader surface only.

Decide whether `AGENTS.md` decomposition is necessary after measuring actual boot behavior. If decomposed, preserve Required Reading, stop conditions, Human gates, and canonical-source ownership. Define boot versus role-triggered context, source/hash validation, unknown role/skill behavior, legacy fallback, and owner-visible failure evidence. Do not impose a universal skill-size limit.

The exact candidate manifest is `context-pack/v1`, encoded by the repository's existing `canonicalizeJcs` implementation in `scripts/lib/status-jcs.mjs` and hashed with SHA-256 over its returned UTF-8 bytes. The implementation sorts object keys, preserves array order, rejects invalid Unicode/unsafe numbers, emits no trailing newline, and applies the existing canonical-byte limit. The frozen JCS vectors under `test/fixtures/work-item-status/v1/` are the reference vectors; `test/fixtures/context-pack-v1/vectors.json` is the required pack-specific vector artifact and must be validated before implementation is accepted.

```text
pack = {
  schemaVersion: "context-pack/v1",
  packId: non-empty artifact identifier,
  authority: "legacy",
  role: one of the 11 role-definition headings,
  loadMode: "boot" | "on-demand",
  measurementStatus: "available" | "unsupported" | "unavailable" | "not_requested",
  fallbackReason: non-empty string when any source has loadResult fallback/rejected, otherwise null,
  sources: [sourceEntry, ...]
}
sourceEntry = {
  path: an allowed canonical source path,
  sha256: 64 lowercase hex characters over exact UTF-8 source bytes,
  triggerReason: non-empty string,
  loadResult: "loaded" | "fallback" | "rejected",
  fallbackReason: non-empty string when loadResult is fallback/rejected, otherwise null
}
```

The closed role enum is: `Orchestrator Agent`, `PM Agent`, `BA Agent`, `SA Agent`, `Developer Agent`, `QA Agent`, `Security Reviewer`, `Config Agent`, `Data Agent`, `Release Agent`, and `Documentation Agent`, owned by `docs/workflow/role-definitions.md`. The closed source allowlist is the exact `CANONICAL_FILES` export from `scripts/validate-context-budget.mjs` for boot sources, plus skill files whose paths are registered in `docs/operating-model/SKILL_CATALOG.md` and resolve only under `.agents/skills/`, `.claude/skills/`, or `.agent/skills/`; arbitrary repository paths are invalid.

The required-source matrix is a required future artifact at `test/fixtures/context-pack-v1/required-source-matrix.json`; it is not present in this plan-only PR and must be created/validated before `status:spec-ready` or implementation:

| `loadMode` | Required source set |
|---|---|
| `boot` | Exactly `AGENTS.md`, `docs/operating-model/AGENT_OPERATING_MODEL.md`, and `docs/workflow/dynamic-routing.md`; no role or skill content is loaded at boot |
| `on-demand` | A cumulative pack containing the boot set plus `docs/workflow/role-definitions.md`, `docs/workflow/quality-gates.md`, `docs/workflow/handoff-contract.md`, `docs/operating-model/AGENT_EVALUATION_CHECKLIST.md`, `docs/operating-model/SKILL_CATALOG.md`, the route-specific workflow/contract sources, and exactly the triggered skill paths registered in `SKILL_CATALOG.md` |

Each of the 11 roles has one matrix row naming the role, allowed trigger reasons, route-specific source paths, and allowed skill paths. `boot` and `on-demand` have separate exact sets; `sources` must have `minItems: 3`, unique `path` values, no unknown properties, and exact set equality with the selected row. On-demand is intentionally cumulative: it contains the boot sources plus role/route/skill sources, while its `loadMode` remains `on-demand`; “no mix” means a pack must not claim `boot` while using the on-demand row or vice versa. A candidate may not perform a first task action from the boot set alone: it must complete the cumulative on-demand load and comparison before that action, or fail closed to legacy. `packId` identifies the pack artifact and is carried by `evidence_ref`; it is not a correlation ID. `measurement_id` is a separate non-empty run correlation ID. The canonical SHA-256 digest of the complete pack bytes is the sole `context_loaded.attributes.source_manifest_digest`. Map `measurementStatus` to `context_loaded.attributes.token_measurement_status` and fallback reasons to the envelope `reason`. No token count is inserted when status is unsupported/unavailable. Duplicate paths, unknown roles/paths, stale hashes, malformed enums, authority other than `legacy`, and required-source set mismatch fail closed. If preserving the existing AGENTS Required Reading semantics requires a core decomposition, Task 2 must add that decomposition and an equivalence test before the candidate is eligible; otherwise the candidate falls back to the legacy full-context path.

**Verify:** SA review against `AGENTS.md`, `docs/operating-model/AGENT_OPERATING_MODEL.md`, `docs/workflow/dynamic-routing.md`, role definitions, and skill catalog; context-budget check without raising the target.

**Checkpoint 1:** Human approves the contract and exact file scope before code changes.

### Task 3 — Implement repository-owned shadow adapter

**Owner:** Developer Agent. **Depends on:** Tasks 1–2, `status:spec-ready`.
**Targets:** approved compatibility/loader files, fixtures, and focused tests.

Implement an explicit candidate path without replacing or mutating legacy loading. Emit a complete manifest and structured fallback/mismatch evidence. Reuse the existing canonical comparator. Add tests first for valid pack, stale/missing/duplicate source, unknown role/skill, comparator error, and fallback-to-legacy.

**Verify:** focused tests, `npm test`, `npm run validate:context-budget`, `npm run validate:contracts`, and `npm run validate:review-gate` against actual merge-base.

### Task 4 — Add host activation and measurement adapters

**Owner:** SA + Developer with host-owner evidence. **Depends on:** Task 3.
**Targets:** approved host adapter/evidence files; no unverified host-specific claim.

Keep Codex, Claude, Gemini, Cursor, and Antigravity `unknown` until native activation and token evidence exists. A capability record is frozen as `{host, hostOwner, adapterVersion, activationEvidenceRef, tokenEvidenceRef, tokenMeasurementStatus, observedAt, capabilityDecision}`; `hostOwner` must be a named Human/host owner before a host can be measured. Record `unsupported`/`unavailable`/`N/A` with reason when the host cannot provide it. Separate host evidence from fixture simulation. Preserve `operator_wait` as a wait-policy value; it does not erase `timed_out` or `host_completion_unavailable`.

**Verify:** host adapter tests, evidence validation, a negative test proving simulation cannot mark a host supported, and one existing `human_approval` evidence event with `decision: approved` and an evidence reference to the host capability record. The event's UTC `observed_at` is the only observation-window start anchor; no new evidence event type is added to IMP-001/#183.

**Checkpoint 2:** review host matrix and denominators before live-shadow observation.

### Task 5 — Execute paired replay and bounded live shadow

**Owner:** QA Agent. **Depends on:** Tasks 1–4 and Human approval to observe.
**Targets:** measurement/QA evidence only; no authority or consumer changes.

Run all 36 cases and exactly 20 valid historical replays. A replay is valid only when its source work-item/record reference, input digest, legacy/candidate result digests, host/configuration identity, and replay timestamp are present; if 20 cannot be proven, record `BLOCKED` and stop for Human decision. Live shadow starts only after an existing IMP-001 `human_approval` evidence event with `decision: approved` and an evidence reference to the host capability record. That event's UTC `observed_at` is the sole `observation_started_at`; the 14-day completion and day-30 Human decision deadlines are calculated from it. The window ends under the Issue's exact rule: 10 consecutive real work items **or** 14 calendar days, whichever is later. A qualifying live item is one candidate attempt with the same input digest on legacy and candidate paths, native token measurement available, comparison evidence recorded before the first task action, and no unresolved fallback/mismatch. The live denominator is every candidate attempt in the window; unsupported/unavailable attempts remain separately reported and do not become successes. Operational fallback is a non-adversarial progressive activation that cannot produce a valid manifest/decision and invokes legacy; deliberate fallback fixtures are excluded. Report fallback by host and overall: `<=5%` Go, `>5%–10%` Conditional Go, `>10%` No-Go. Record count, duration, denominator, reduction distribution, unsupported hosts, and every mismatch. Stop on unexplained semantic or stop-gate mismatch.

**Verify:** QA recomputes digests/denominators from exact commit/range; full suite and all applicable validators pass.

### Task 6 — Rollback and evidence package

**Owner:** QA + Orchestrator. **Depends on:** Task 5.

Disable candidate loading and rerun paired inputs through the full-context legacy path without deleting comparison evidence. Block any rollback claim if retained pack/shard digest/version does not match the predecessor. Report `N/A`, `BLOCKED`, and `inconclusive` distinctly. Ten fallback-free live work items are only a prerequisite for a later compatibility-removal proposal; removal itself is out of scope and requires a separate Human approval. Recommend only continue-shadow, terminate, or prepare a separate authority proposal.

**Verify:** independent QA PASS/NEEDS_REVISION, fresh evidence URLs, and Human review. This task cannot authorize Go.

## Proposed guardrails for Human approval

- 36/36 semantic equivalence per supported host and at least 36 valid paired host observations.
- Median reduction ≥50% and 5th-percentile reduction ≥40% per host, using native input tokens where available.
- Fallback rate with a real denominator; unsupported telemetry is not silently excluded.
- Zero unexplained Critical/Major routing, stop-gate, Human-approval, semantic, or rollback mismatch.
- Successful rollback rehearsal for each claimed host/path.
- Exactly 20 valid historical replays are required; fewer is `BLOCKED` and requires a Human decision.
- Live shadow starts only at the recorded `human_approval.observed_at`, follows the Issue's exact rule of 10 consecutive real work items or 14 calendar days, whichever is later, and requires Human Go/No-Go by `observation_started_at + 30 calendar days`. Fewer than 10 qualifying live items at that deadline is `BLOCKED`.
- A qualifying live item requires identical input digest, native token measurement, legacy/candidate result evidence, comparison before first task action, and no unresolved fallback.
- Operational fallback excludes deliberate fallback fixtures and maps `<=5%` to Go, `>5%–10%` to Conditional Go, and `>10%` to No-Go.

These are experiment decision guardrails, not automatic authority gates. A later authority switch needs a separate Human-approved decision record.

## Verification command set

```bash
npm test
npm run validate:contracts
npm run validate:project-state
npm run validate:dispatch-receipts
npm run validate:skill-parity
npm run validate:skill-usage
npm run validate:review-gate
npm run validate:risk-register
npm run validate:metrics
npm run validate:context-budget
npm run adr:audit
git diff --check
```

For `.mjs`/`.js` changes, add a new `docs/records/qa/*-code-review.md` record in the same PR and use the actual merge-base range. `docs/records/qa/` is not a migration target.

## Rollback and stop conditions

| Condition | Action |
|---|---|
| Missing/stale/unknown pack | Reject candidate, record reason, use legacy |
| Semantic/stop-gate mismatch | Stop shadow run; route to QA/SA/Human |
| No host activation/native telemetry | Mark unknown/unsupported/unavailable; no reduction claim |
| Comparator/telemetry failure | Record inconclusive or fallback; no equivalence claim |
| Fewer than 10 live qualifying items | Block and request a new observation decision |
| Rollback digest/version mismatch | Block legacy-restoration claim until reconciled |
| Context budget exceeds target | Reduce duplicate prose via approved design; never raise silently |

## Handoff and open decisions

The next handoff is Orchestrator → SA for review of this Draft. Then Documentation Agent prepares the approved artifacts, Human Maintainer decides `status:spec-ready`, and only then may Developer implementation begin. QA remains independent.

The current PR readiness evidence is deliberately recorded as a workflow gap: PR #182's `work-item-readiness-freshness` check failed because the linked Issue #132 is correctly `phase:planning` without `status:spec-ready`, while the validator requires `status:spec-ready` even for a Draft planning PR. The plan and PR must retain this evidence and the no-bypass rule; no label is to be added merely to make the check green. The repository's actual current phase is `phase:planning`, not `phase:requirements`.

SA/Human must decide:

1. Which hosts can actually provide native activation and input-token evidence in this environment?
2. Is `AGENTS.md` decomposition necessary, or is a role-pack adapter sufficient after measurement?
3. Does Human Maintainer accept the Issue's existing live gate — 10 consecutive real work items or 14 calendar days, whichever is later, with day-30 Go/No-Go and day-30 `<10` block — or explicitly reject it for a separately revised plan? This is not an open duration choice during implementation.
4. Which named host owners and capability records are approved for the initial matrix?

## Definition of done

The plan is independently reviewed and Human-approved; the IMP-001 evidence prerequisite is complete; `status:spec-ready` is present before implementation; exact file scope, manifest schema/canonicalization vectors, replay validity rule, Issue-compatible live-shadow gate, fallback thresholds, and host capability matrix are frozen; all tests/evidence are tied to exact commits/ranges; independent QA verifies semantic equivalence, fail-closed behavior, fallback, rollback, and negative scope; and project state records that legacy remains authoritative with no final Go claim.
