# IMP-002 Task 1/2 Contract Freeze

## Metadata

- Work Item ID: Issue #132 / IMP-002
- Title: Progressive Context Loading — corpus, evidence, and `context-pack/v1` contract
- Owner: SA Agent
- Status: SA decision package — Human checkpoint required before Developer implementation
- Contract version: `context-compatibility/v1` + `context-pack/v1`
- Rework count: 0 for this Task 1/2 handoff

## Context and source-of-truth order

The approved implementation plan is `docs/records/implementation-plan/2026-08-15-issue-132-progressive-context-shadow-plan.md`. Issue #132 comments confirm that the earlier plan flaws were accepted and that the current slice is limited to the progressive-context contract; the worktree-scoped status slice is separate.

Repository evidence inspected:

- `scripts/lib/context-compatibility.mjs` — current normalized-record validation, canonical result digest, diagnostic-token exclusion, manifest validation, and `authority: legacy` / `mutationAttempted: false` assertions.
- `test/fixtures/context-compatibility-v1.json` — the existing 36-case corpus.
- `test/context-compatibility.test.mjs` — current executable compatibility seam.
- `scripts/lib/status-jcs.mjs` — existing canonical byte and SHA-256 implementation.
- `scripts/validate-context-budget.mjs` — repository-size diagnostic and current canonical file list.
- `docs/workflow/role-definitions.md` and `docs/operating-model/SKILL_CATALOG.md` — role and skill ownership.
- `docs/workflow/quality-gates.md`, `docs/workflow/handoff-contract.md`, and `docs/workflow/dispatch-packet-contract.md` — handoff and gate obligations.
- `docs/records/qa/2026-08-01-issue-132-context-qa.md` — independent evidence that the current seam does not prove host activation or native telemetry.

The Issue comments were read with:

```bash
gh issue view 132 --repo chakrits/AI-Agent-Workflow --comments
```

The issue's earlier token targets are rejected as universal acceptance criteria. The current repository measurement is diagnostic only: `npm run validate:context-budget` reports `29,937/30,000` approximate tokens for the existing eight-file canonical corpus. The proposed three-file boot set is approximately `7,973` tokens (`AGENTS.md` 4,130 + operating model 1,512 + dynamic routing 2,331), but this does not prove what any host loads at runtime.

## Goals

- Freeze a reproducible 36-case compatibility corpus and pair-evidence contract.
- Define a closed, versioned `context-pack/v1` manifest that can be validated before any candidate first action.
- Preserve legacy loading as the sole authority and make every invalid candidate input fail closed to legacy.
- Give Documentation Agent an exact artifact and test map.
- Keep host activation, runtime loader, replay/live-shadow, migration, consumer changes, and Go/No-Go out of this slice.

## Non-goals

- No runtime loader, adapter, CLI, host activation, or consumer migration.
- No change to routing, dispatch, lifecycle, retry, worktree, Human approval, or status contracts.
- No authority switch, performance/reduction claim, replay/live-shadow run, release, or final Go/No-Go.
- No universal maximum size for a skill file.
- No decomposition of `AGENTS.md` in this slice unless a later measured host activation proves it is necessary and Human approves the resulting policy change.

## Decision 1 — Task 1 corpus and evidence contract

### Frozen corpus manifest

Documentation Agent must create `test/fixtures/context-compatibility-v1.manifest.json` with exactly these top-level fields and no unregistered fields:

```json
{
  "schemaVersion": "context-corpus/v1",
  "fixturePath": "test/fixtures/context-compatibility-v1.json",
  "fixtureSha256": "<64 lowercase hex over exact UTF-8 bytes>",
  "fixtureCount": 36,
  "groupCounts": {
    "routing": 12,
    "dispatch": 10,
    "stopBackwardRework": 8,
    "fallbackError": 6
  },
  "sourceCommit": "<40 lowercase hex commit that contains the frozen fixture>",
  "canonicalization": "sha256-exact-utf8-bytes-v1"
}
```

`fixturePath` is repository-relative and must resolve exactly to the named fixture. `fixtureSha256` is calculated from the file's exact UTF-8 bytes, including its current newline bytes. `sourceCommit` pins the commit at which the manifest and fixture were frozen; it is provenance, not a substitute for checking the working bytes. `canonicalization` is an explicit identifier so a future hash procedure cannot silently replace v1.

The validator must reject missing/extra top-level fields, a path mismatch, a missing file, invalid SHA-256 syntax, count drift, group-count drift, unsupported schema/canonicalization, or a source commit that cannot be resolved. Group membership is derived from the fixture, not trusted solely from the manifest. The fixture content itself is not reformatted as part of this task.

### Pair and denominator contract

Every paired observation must provide:

| Field | Rule |
|---|---|
| `pairId` | Non-empty stable identifier unique within the measurement set |
| `fixtureId` / work-item reference | Identifies the exact input case or work item |
| `inputDigest` | SHA-256 digest of the exact normalized input bytes shared by both paths |
| `legacyResultDigest` | Digest of the legacy normalized result |
| `candidateResultDigest` | Digest of the candidate normalized result |
| `modelIdentity` | Host/model identity, or explicit `N/A` reason if unavailable |
| `configurationDigest` | Digest/identity of relevant run configuration, or explicit `N/A` reason |
| `measurementId` | Run-level correlation identity, separate from `packId` |
| `hostId` | Host identity, or explicit `N/A` reason |
| `firstActionBoundary` | Evidence that comparison/loading completed before the first task action, or explicit `N/A` reason |

An observation is **valid** only when all required identities, both result digests, the shared input digest, and the first-action observation are present. An explicit `N/A` reason is evidence of an unavailable capability; it does not make the pair valid. Invalid pairs remain in the denominator, are reported separately, and cannot count toward a supported-host threshold. A missing field is not equivalent to a valid `N/A` value.

The semantic comparison remains the existing comparator behavior: all routing, roles, gates, owners, stop/backward/rework outcomes, dispatch/handoff/terminal/consumption evidence, Human gates, and fallback/error semantics are comparable. The sole diagnostic exclusion is `contextManifest[].approximateTokens`; it cannot rescue a missing pair identity or invalid result digest.

### Digest and drift rules

- Use SHA-256 over exact UTF-8 bytes for the fixture and all explicitly byte-defined artifacts.
- Use the existing comparator's canonical result digest for normalized records; do not introduce a second result-digest algorithm.
- Validate the manifest against the current bytes before executing the corpus.
- Drift is fail-closed: no compatibility result is accepted when hash, count, group membership, source commit, required digest, or first-action evidence differs.
- The validator is read-only and must not rewrite fixture or manifest files.

### Task 1 artifacts and verification

Documentation Agent owns the following additions/updates:

1. `test/fixtures/context-compatibility-v1.manifest.json`
2. `scripts/validate-context-compatibility.mjs` (read-only CLI validator)
3. `test/validate-context-compatibility.test.mjs` (validator tests)
4. `test/context-compatibility.test.mjs` (only additive assertions needed to bind the manifest and pair rules; do not change expected semantics)
5. `package.json` validator script, if the repository convention requires registration
6. A measurement/contract record that links the exact manifest and validator evidence

Required negative partitions: changed fixture byte, changed count, changed group classification, stale/malformed source commit, missing/invalid pair identity, missing digest, missing first-action evidence, duplicate pair ID, and diagnostic-token-only difference. The fixture file must remain unchanged.

Required checks after artifact creation:

```bash
node --test test/context-compatibility.test.mjs test/validate-context-compatibility.test.mjs
npm run validate:context-compatibility
npm run validate:contracts
git diff --check
```

The full suite and project-state/review gates remain required at the Documentation Agent handoff boundary. A changed `.mjs` file also requires a same-PR `docs/records/qa/*-code-review.md` record.

## Decision 2 — Task 2 `context-pack/v1`

### Closed manifest schema

The schema is closed (`additionalProperties: false`) and has this shape:

```json
{
  "schemaVersion": "context-pack/v1",
  "packId": "<non-empty artifact identity>",
  "authority": "legacy",
  "role": "<one closed role value>",
  "loadMode": "boot | on-demand",
  "measurementStatus": "available | unsupported | unavailable | not_requested",
  "fallbackReason": "<non-empty string when fallback/rejected, otherwise null>",
  "sources": [
    {
      "path": "<allowed canonical source path>",
      "sha256": "<64 lowercase hex over exact UTF-8 bytes>",
      "triggerReason": "<non-empty reason>",
      "loadResult": "loaded | fallback | rejected",
      "fallbackReason": "<non-empty string for fallback/rejected, otherwise null>"
    }
  ]
}
```

Required constraints:

- `sources` has at least three entries, unique paths, and no unknown properties.
- `authority` can only be `legacy` in this experiment.
- `role` is one of: `Orchestrator Agent`, `PM Agent`, `BA Agent`, `SA Agent`, `Developer Agent`, `QA Agent`, `Security Reviewer`, `Config Agent`, `Data Agent`, `Release Agent`, `Documentation Agent`.
- `loadMode` and the selected matrix row must agree; `on-demand` is cumulative and includes the boot set.
- `fallbackReason` is non-empty whenever the pack or any source is `fallback`/`rejected`; it is `null` for a fully loaded pack.
- A source hash is SHA-256 over exact UTF-8 source bytes. Stale, missing, duplicate, or unknown paths are invalid.
- `packId` identifies the pack artifact and is carried as an `evidence_ref`; it is not a correlation ID.
- `measurementId` is not a field in the pack. It belongs to the evidence envelope and identifies a run.

### Required-source matrix

Documentation Agent must create `test/fixtures/context-pack-v1/required-source-matrix.json` with one row for each of the 11 closed roles and two load modes. Each row must enumerate exact paths, allowed trigger reasons, and allowed skill IDs. A row is authoritative only after the validator resolves each path and verifies its hash.

The common exact sets are:

| Mode | Required source set |
|---|---|
| `boot` | `AGENTS.md`; `docs/operating-model/AGENT_OPERATING_MODEL.md`; `docs/workflow/dynamic-routing.md` |
| `on-demand` | The complete boot set plus `docs/workflow/role-definitions.md`, `docs/workflow/quality-gates.md`, `docs/workflow/handoff-contract.md`, `docs/operating-model/AGENT_EVALUATION_CHECKLIST.md`, `docs/operating-model/SKILL_CATALOG.md`, route-specific workflow/contract sources, and exactly the skill paths triggered and registered in `SKILL_CATALOG.md` |

The on-demand row is cumulative, not a replacement set. “No mix” means a pack cannot claim `boot` while using an on-demand row, nor claim `on-demand` while omitting its boot sources. Source-set equality is exact: no extra repository files and no missing required path.

Route-specific sources must be selected from the canonical `docs/workflow/` and `docs/contracts/` sources named by the route. Skill paths must be registered in `docs/operating-model/SKILL_CATALOG.md` and resolve under `.agents/skills/`, `.claude/skills/`, or `.agent/skills/`. Arbitrary repository paths and unregistered skills are rejected.

### Load and fail-closed behavior

The candidate is not eligible to perform its first task action from the boot set alone. It must load the applicable cumulative on-demand row and complete comparison before the first action. If that cannot be proven, the candidate records a structured reason and the legacy path remains authoritative.

Fail-closed conditions include:

- malformed schema or enum;
- unknown role, source, route, or skill;
- duplicate source path or duplicate matrix row;
- stale/missing source hash;
- authority other than `legacy`;
- source-set mismatch, load-mode mismatch, or missing boot source;
- missing/invalid fallback reason;
- JCS/domain/size failure while canonicalizing the pack;
- comparator, evidence, or first-action-boundary failure.

The fallback must be owner-visible, must not mutate legacy state, and must map its reason to the evidence envelope. Legacy behavior is the result of the operation; a fallback record is not a candidate success.

### Canonicalization and evidence mapping

Use `canonicalizeJcs` and `digestJcs` from `scripts/lib/status-jcs.mjs`. The implementation already sorts object keys, preserves array order, rejects invalid Unicode, unsafe numbers, cycles/domain violations, and oversized canonical bytes, and emits UTF-8 bytes with no trailing newline. Task 2 must add pack-specific vectors in `test/fixtures/context-pack-v1/vectors.json`; the existing JCS vectors remain reference coverage.

The digest of the complete canonical pack bytes is the only `context_loaded.attributes.source_manifest_digest`. Map `measurementStatus` to `context_loaded.attributes.token_measurement_status`. Do not insert a token count when status is `unsupported` or `unavailable`. Map fallback/rejection reason to the evidence envelope's `reason`. Preserve `packId`, `measurementId`, correlation IDs, and evidence references as distinct identities.

### AGENTS.md decomposition decision

**Decision: not required for Task 2 and not authorized in this slice.**

Evidence:

- `AGENTS.md` is 16,521 characters / approximately 4,130 `chars / 4` tokens.
- The current repository-wide canonical diagnostic is 29,937/30,000 tokens.
- The proposed boot sources are approximately 7,973 diagnostic tokens, so role-pack loading can remove role, gate, checklist, catalog, and skill content from boot without rewriting `AGENTS.md`.
- `AGENTS.md` owns Required Reading, Stop Conditions, Human gates, canonical ownership, and fallback boundaries. Splitting it before a host measurement would create a policy migration and a second source-of-truth risk.

This is a repository evidence decision, not a claim about native host boot behavior. If later native activation shows that `AGENTS.md` itself must be decomposed to meet an approved target, that is a separate Human-approved policy change. The candidate must preserve the existing Required Reading semantics and must add an equivalence test before becoming eligible.

## Exact Documentation Agent artifact map

| Artifact | Purpose | Owner in next handoff |
|---|---|---|
| `test/fixtures/context-compatibility-v1.manifest.json` | Frozen corpus provenance/count/hash | Documentation Agent |
| `scripts/validate-context-compatibility.mjs` | Read-only corpus/manifest/pair validator | Documentation Agent |
| `test/validate-context-compatibility.test.mjs` | Drift, denominator, and fail-closed regression tests | Documentation Agent |
| `docs/contracts/schemas/context-pack-v1.schema.json` | Closed machine-readable pack contract | Documentation Agent |
| `test/fixtures/context-pack-v1/required-source-matrix.json` | Exact boot/on-demand rows for all 11 roles | Documentation Agent |
| `test/fixtures/context-pack-v1/vectors.json` | Pack-specific JCS and rejection vectors | Documentation Agent |
| `docs/records/implementation-plan/...` | Link frozen artifact set and checkpoint | Orchestrator/Documentation Agent |
| `docs/records/handoff/...` | Terminal handoff and receipt evidence | SA/Orchestrator |

Task 2 must not add a runtime loader or candidate host adapter. The phrase “candidate manifest/loader surface only” in the approved plan means contract-facing names and test seams may be reserved; implementation remains Task 3.

## Test and verification plan

Documentation Agent must add deterministic tests for:

1. Valid manifest, exact count/group/hash, and source-commit pinning.
2. Every manifest drift and malformed pair case listed under Task 1.
3. Valid pack for boot and cumulative on-demand mode.
4. Unknown role/path/skill, duplicate path, stale hash, extra property, missing source, mode mismatch, authority mismatch, invalid fallback reason, invalid enum, malformed JCS, and oversized pack.
5. `packId` versus `measurementId` separation and digest mapping.
6. No first action from boot-only context; invalid candidate falls back to legacy without mutation.
7. `approximateTokens` remains the only comparator diagnostic exclusion.

At the documentation handoff, run:

```bash
npm test
npm run validate:contracts
npm run validate:project-state
npm run validate:review-gate
npm run validate:context-budget
git diff --check
```

No host activation, native token measurement, historical replay, live shadow, or Go/No-Go evidence may be reported by these tests.

## Trade-offs, risks, and fallback

| Decision / risk | Trade-off | Mitigation / fallback |
|---|---|---|
| Keep `AGENTS.md` intact | Boot remains larger than an eventual decomposed policy | Measure native host behavior first; preserve one source of truth |
| Cumulative on-demand pack | A role action loads more than only its role paragraph | Prevents missing gates and preserves Required Reading semantics |
| Exact source hashes | Edits require a deliberate manifest refresh | Stale hashes fail closed; legacy remains usable |
| No universal skill-size limit | Reduction is measured by activation, not a fixed token promise | Skills are zero at boot and loaded only by trigger |
| `N/A` is not valid-pair success | Supported-host denominator may remain low | Report unsupported/unavailable separately; do not infer support |
| Legacy authority | No immediate context reduction in production | Candidate is observational until later Human-approved activation |

Rollback for this slice is artifact-level: reject or remove the candidate contract artifacts from the pending implementation branch; do not alter legacy files or runtime. At runtime in a later task, any invalid pack or evidence failure must invoke legacy fallback and preserve the reason.

## Open decisions requiring Human Maintainer

No unresolved technical ambiguity blocks Documentation Agent from creating the Task 1/2 artifacts. The following are explicit gates, not decisions silently made by SA:

- Human must approve the exact artifact set before Task 3 Developer implementation.
- Host owners and native activation support remain unknown until host evidence exists.
- Any future `AGENTS.md` decomposition requires a separate policy/architecture approval.
- Live-shadow sample/duration and final Go/No-Go remain governed by the approved plan; this contract does not authorize them.

The readiness-validator red condition recorded in Issue #132 is a workflow-contract concern. It must not be “fixed” by adding `status:spec-ready` prematurely and does not change this Task 1/2 contract.

## SA handoff

**From Agent:** SA Agent

**To Agent:** Documentation Agent

**Work Item:** Issue #132 / IMP-002 Task 1/2

**Work Item URL:** https://github.com/chakrits/AI-Agent-Workflow/issues/132

**Change Request URL:** N/A — SA design artifact; no PR opened by this child

**Change Type:** Framework / Meta — shadow compatibility contract

**Risk Level:** Medium/High

**Lifecycle Phase:** `phase:development` (approved plan; Task 3 implementation still gated)

**Specification Readiness:** SDD-design; Human checkpoint required before Developer dispatch

**Current Stage:** Task 1/2 contract freeze

**Task State:** `implementing` for SA design; Documentation Agent next

**Contract Version:** `context-compatibility/v1` + `context-pack/v1`

**Rework Count:** 0

**Completed Work:** Frozen corpus/evidence rules, context-pack schema/matrix/fail-closed rules, decomposition decision, artifact map, tests, fallback, and handoff boundary.

**Artifacts Produced:** This SDD; no runtime artifact.

**Files Changed:** This SDD only; pre-existing `.github/pull_request_template.md` modification was not touched.

**Verification Performed:** `npm run validate:context-budget` PASS (`29,937/30,000`); repository source and tests inspected; `gh issue view 132 --repo chakrits/AI-Agent-Workflow --comments` read successfully.

**Evidence References:** `scripts/lib/context-compatibility.mjs`, `scripts/lib/status-jcs.mjs`, `scripts/validate-context-budget.mjs`, `test/fixtures/context-compatibility-v1.json`, `docs/records/qa/2026-08-01-issue-132-context-qa.md`.

**Acceptance Criteria Verification Status:** SA Task 1/2 contract criteria PASS; runtime/host/replay criteria NOT APPLICABLE and explicitly out of scope.

**Acceptance Traceability Matrix URL:** N/A — Documentation Agent must create/update the Task 1/2 traceability entry.

**Verified Commit SHA:** Pending commit of this SDD.

**Platform Activation Record URL / Status:** N/A — no host activation.

**QA Evidence URL:** N/A — QA is not the implementer of this design and must independently review Documentation Agent artifacts.

**Stop Reason:** Human checkpoint before Task 3 Developer implementation.

**Known Limitations:** Native host boot behavior and token telemetry are not proven; current size figures are repository diagnostics only.

**Open Questions:** Human approval of artifact set; future measured need for `AGENTS.md` decomposition; named host owners later.

**QA / Review Focus:** Exact schema closure, source-set equality, hash/JCS vectors, denominator validity, legacy fallback, no runtime scope expansion.

**Recommended Next Step:** Documentation Agent creates and validates the frozen Task 1/2 artifacts, then Orchestrator requests Human review.

**Next Action:** `Dispatch`

**Next Owner:** Documentation Agent

**Orchestration Turn ID:** Parent-owned; supplied by Orchestrator

**Boss Event Required:** Yes — terminal result

**Dispatch State:** `completed`

**Source Agent:** SA Agent

**Target Agent:** Documentation Agent

**Dispatch Result:** SA contract freeze completed; Documentation Agent may package artifacts, but may not implement runtime.

**Acknowledgement Evidence:** Parent terminal consumption required; child cannot supply parent receipt.

**Boss Event:** SA Task 1/2 contract is frozen with no blocking technical ambiguity; dispatch Documentation Agent, then stop at Human checkpoint.

**Handoff Event ID:** Parent-owned; pending Orchestrator receipt

**Parent Orchestrator ID:** Parent-owned; pending Orchestrator receipt

**Child Task ID:** Parent-owned; pending Orchestrator receipt

**Terminal Result ID:** Parent-owned; pending Orchestrator receipt

**Completion Event Evidence:** Parent-owned in-turn await evidence required

**Consumption Evidence:** Parent-owned; must record one terminal consumption and one Boss event

**Timeout / Cancellation Reason:** N/A

## Decision

**DONE_WITH_CONCERNS** — Task 1/2 architecture and contract decisions are complete. The only concerns are explicitly deferred by scope: native host activation, future `AGENTS.md` decomposition, and the Human checkpoint before Task 3. No runtime implementation or authority change is authorized by this result.

Skill Used: `sa-architecture-design`, `implementation-planning`, `verification-before-completion`.
