# Task Brief — IMP-003 T2-A Pure CAS and Record Validation

| Field | Value |
|---|---|
| Work Item / Task ID | GitHub Issue #133 / IMP-003 T2-A |
| Objective | Define one bounded implementation slice for a pure, fail-closed CAS decision and transition/correction record validation over data only. |
| Base SHA | `9025151c84ce82209f73e7397842dd6be43e6841` |
| Dependencies | Merged T1 `status-audit/v1` helpers; existing T1 schemas/tests; Human-approved T2 scope split; SA review of this exact revision |
| Required reviewer mode | SA specification review, Human specification approval, independent Code Review, Security Review, fresh independent QA, Human approval |
| Human decision evidence (addressable URL) | Issue #133: https://github.com/chakrits/AI-Agent-Workflow/issues/133 — exact approval comment for this revision is required before `status:spec-ready` |

## Scope classification and reset rule

This is a documentation-only planning revision for a new bounded T2-A review cycle. It is not a continuation of, or rework round 3 after, the prior combined T2 implementation/rework packet. The parent Issue #133 remains open. T2-B is a later separate contract/package and is not part of the current acceptance criteria.

## Allowed Scope

- Write set for this documentation task: this Task Brief, its paired Implementation Plan, and the minimal `PROJECT_STATUS.md`/`TASK_LOG.md` planning-state entries.
- Future implementation write set, only after SA and Human approval: `scripts/lib/status-cas-decision.mjs`; new/updated CAS, transition, and correction JSON Schemas; `test/status-cas-decision.test.mjs`; and an actually executed `test/fixtures/status-cas/v1/` manifest/corpus. T1 helpers remain unchanged unless SA approves a narrowly proven compatibility seam.
- Pure CAS decision over expected/observed `(C, M, S, H)`; record/digest validation; data-only fixtures and runtime/schema parity.

### Explicit exclusions from T2-A

T2-A must not define acceptance criteria, implementation tasks, fixtures, or runtime seams for:

- writer intent, writer profiles, or writer activation;
- publication paths or candidate/archive/manifest/projection/Git-ref publication;
- interruption or rollback stages;
- TOCTOU or race harnesses;
- production authority, real refs, credentials, or live repository mutation;
- dispatch, relay, terminal-result, orchestration, lifecycle, migration, or Go/No-Go changes.

## Sources and Acceptance Criteria

| Source / AC | Required outcome |
|---|---|
| A-01 — Pure CAS boundary | A pure callable accepts only data, performs no filesystem/Git/network/credential/orchestration access, and returns a deterministic accepted decision or code-only rejection. A no-I/O fixture proves no observable side effect. |
| A-02 — Complete tuple validation | Expected and observed tuples contain exactly `C` (commit SHA), `M` (manifest digest), `S` (set digest), and `H` (head digest); missing, malformed, extra, or stale members are rejected with stable, field-specific codes. |
| A-03 — Five result digests | An accepted result contains exactly manifest, set, head, projection, and content-tree digests. Each is calculated from its supplied data using unchanged T1 helpers and fixed digest vectors; alternate or forged preimages are rejected. |
| A-04 — Transition/correction schemas | Transition and correction records are distinct versioned closed schemas with explicit required fields, operation rules, predecessor, proposal, successor, expected tuple, changed paths, approval, and record digest. Unknown/missing fields and cross-kind operations fail deterministically. |
| A-05 — Canonical record digest | Runtime validation computes the canonical digest over the complete record preimage and accepts only the exact digest encoded in the record; changing any bound field makes validation fail. |
| A-06 — Exact data-only binding | Validation binds proposal, predecessor, successor, and approval values exactly to the record and expected tuple. It does not authorize, publish, consume, dispatch, or mutate any resource. |
| A-07 — Malformed/forged/replay corpus | An executable fixture manifest covers malformed tuples/records, forged digest/preimage data, wrong proposal/predecessor/successor/approval, replayed record/approval inputs, and deterministic error precedence. |
| A-08 — Unknown-field closure | Every public CAS, digest, record, and validation input/output boundary rejects unknown fields and wrong container types; schemas and runtime return matching closed shapes and error codes. |
| A-09 — No-side-effect evidence | Every rejected fixture, including forged and replay inputs, proves unchanged in-memory input/state snapshots and proves the pure decision never opens or mutates external resources. |
| A-10 — Schema/runtime parity | A distinct CAS request contract is added when the request shape is not already represented. The fixture suite validates the same accepted/rejected shapes against JSON Schema and runtime, with no schema-only or runtime-only behavior. |
| A-11 — Fixture manifest execution | The checked-in manifest is consumed by the test command; every listed fixture executes and asserts its expected result/error, with a count and digest/manifest integrity check preventing silent omission. |
| A-12 — T1 compatibility | Existing T1 status-audit, loader, JCS, lineage, resource, and full regression tests pass without changing T1 helpers, T1 authority, consumers, projection behavior, or lifecycle/orchestration contracts. |

## T2-B deferred follow-up (not current AC)

T2-B is a future separate contract/package for publication-boundary behavior. Its scope may be refined only after T2-A is reviewed and approved. It may later address writer intent, disposable publication modeling, candidate/archive/manifest/projection/ref boundaries, interruption/rollback, and race/TOCTOU evidence. Those topics are named only to preserve the split; they are not T2-A requirements, current acceptance criteria, implementation files, or approval for authority or production access.

## Verification and Stop Condition

- Documentation checks: `git diff --check`; `npm run validate:project-state`; `npm run validate:contracts`; `npm run validate:skill-usage`; `npm run validate:context-budget`.
- Planning-only checks: inspect the diff for exactly two new T2-A records plus minimal project-state entries; confirm no code/test/schema implementation files changed and no T2-B criterion appears in the A-01..A-12 table.
- Future implementation checks: failing-test evidence before implementation; focused CAS/record/fixture tests; `npm test`; all project validators above; fresh independent Code Review, Security Review, QA, and Human approval. Do not claim these implementation checks from this planning task.
- Stop and route to SA for contract/preimage/schema ambiguity; Security for untrusted-input, canonicalization, replay, or side-effect control findings; Human for scope, authority, credentials, lifecycle, migration, release, or Go/No-Go decisions; Developer/QA only after approved implementation evidence exists.

Rollback for this planning task is a documentation-only revert before approval. No runtime state, authority, ref, credential, or production data is created or changed.

Next handoff: SA Agent review of this exact Task Brief and paired Implementation Plan. `status:spec-ready` and Developer dispatch remain withheld until Human approval.
