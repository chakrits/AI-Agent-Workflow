# Task Brief — IMP-003 T2-A Pure CAS and Record Validation

| Field | Value |
|---|---|
| Work Item / Task ID | GitHub Issue #133 / IMP-003 T2-A |
| Objective | Define one bounded implementation slice for a pure, fail-closed CAS decision and transition/correction record validation over data only. |
| Base SHA | `56e99b58202134fb7edb2ded4a1068abccbc2bf3` |
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

## Normative T2-A data contract

The following tables are the implementation contract. They describe data shapes and validation only; they do not authorize a writer, publication, authority decision, or resource access. Object boundaries are closed (`additionalProperties: false`) and arrays/strings are validated as containers before member access.

### Public CAS request and response

| Boundary | Exact fields | Normative rule |
|---|---|---|
| CAS request | `expected`, `observed`, `result`, `resultData` | Top-level object with exactly these four fields. `expected` and `observed` are C/M/S/H tuples; `result` is the five-digest result; `resultData` supplies the five in-memory preimage inputs. No `schemaVersion` is added unless SA identifies an existing T1 version contract that requires it. |
| Accepted response | `accepted`, `observed`, `result` | Exactly these fields; `accepted` is `true`, and `observed`/`result` are copies of validated data. No error field. |
| Rejected response | `accepted`, `error` | Exactly these fields; `accepted` is `false`, and `error` contains exactly `code`. No partial observed/result data. |
| Result data | `manifest`, `set`, `head`, `projection`, `contentTree` | Exactly these five in-memory containers. Their member shapes remain the shapes consumed by the unchanged T1 helpers; any additional member required by a helper is an SA decision point and must be recorded before implementation. |

### C/M/S/H tuple and result digests

| Symbol / field | Type and binding | Rejection condition |
|---|---|---|
| `C` / `commitSha` | Lowercase hexadecimal 40-character commit identifier | Missing, extra, wrong container, uppercase, or wrong length → `INVALID_TUPLE` or `INVALID_COMMIT` per error precedence below. T2-A treats it as data; it is not dereferenced as a Git ref. |
| `M` / `manifestDigest` | Lowercase hexadecimal SHA-256 digest, 64 characters | Invalid member → `INVALID_MANIFEST`; expected/observed difference → `CAS_MANIFEST_MISMATCH`. |
| `S` / `setDigest` | Lowercase hexadecimal SHA-256 digest, 64 characters | Invalid member → `INVALID_SET`; expected/observed difference → `CAS_SET_MISMATCH`. |
| `H` / `headDigest` | Lowercase hexadecimal SHA-256 digest, 64 characters | Invalid member → `INVALID_HEAD`; expected/observed difference → `CAS_HEAD_MISMATCH`. |
| Five result fields | Exactly `manifestDigest`, `setDigest`, `headDigest`, `projectionDigest`, `contentTreeDigest` | All five are recomputed from supplied `resultData` through unchanged T1 helpers. Any mismatch → `RESULT_DIGEST_MISMATCH`; no caller-supplied digest is trusted. |

The five fixed vector IDs are `T2A-DIGEST-001/MANIFEST`, `T2A-DIGEST-001/SET`, `T2A-DIGEST-001/HEAD`, `T2A-DIGEST-001/PROJECTION`, and `T2A-DIGEST-001/CONTENT-TREE`. Their input values and expected lowercase hex outputs must be copied from the T1 helper contracts or recorded as an SA decision point; the Developer must not choose replacement preimages.

### Transition, correction, and approval records

| Boundary | Exact fields | Normative rule |
|---|---|---|
| Transition record | `schemaVersion`, `operation`, `identity`, `predecessor`, `proposal`, `successor`, `expected`, `changedPaths`, `approval`, `recordDigest` | `schemaVersion` is `status-transition-record/v1`; `operation` is one of the existing transition operations (`create`, `update`, `archive`, `rollback`). The record is closed and has the exact field set. |
| Correction record | Same exact field set | `schemaVersion` is `status-correction-record/v1`; `operation` is exactly `correction`. It is a distinct schema/kind, never accepted as a transition by kind confusion. |
| `predecessor` | `digest`, `authenticatedBy` | Closed object; both values are bound as data. `authenticatedBy` is not an authority check. |
| Approval binding input | `record`, `identity`, `independent`, `proposal`, `predecessor`, `result`, `consumedRecordDigests` | `record` must validate first; `independent` must be `false`; identity equals `record.predecessor.authenticatedBy`; proposal/predecessor/result equal record proposal/predecessor.digest/successor. `consumedRecordDigests` is an optional caller-supplied data set used only to detect duplicate/reuse in this call. |
| Approval result | `accepted`, `event` or `accepted`, `error` | Accepted event contains only `type`, `independent`, `recordDigest`, `proposal`, `predecessor`, `result`, `identity`. It is not an approval store or consumption mutation. |

`recordDigest` is SHA-256 over the JCS UTF-8 canonical serialization of the complete record preimage with only `recordDigest` excluded. All other fields, including `schemaVersion`, operation, paths, approval, predecessor, proposal, successor, and expected tuple, are included. JCS key ordering, UTF-8 encoding, lowercase hexadecimal output, and the T1 lone-surrogate/number rejection rules are normative. If T1 does not expose the exact helper preimage bytes, SA must decide and record the vector before implementation.

### Deterministic error codes and precedence

For single-result boundaries, the first applicable rule wins: (1) wrong outer container → `INVALID_INPUT`/boundary-specific `INVALID_RECORD_INPUT` or `INVALID_RECORD`; (2) unknown top-level field → `UNKNOWN_FIELD`; (3) missing or extra tuple member → `INVALID_TUPLE`; (4) tuple member format in C, M, S, H order → `INVALID_COMMIT`, `INVALID_MANIFEST`, `INVALID_SET`, `INVALID_HEAD`; (5) tuple mismatch in C, M, S, H order → `CAS_COMMIT_MISMATCH`, `CAS_MANIFEST_MISMATCH`, `CAS_SET_MISMATCH`, `CAS_HEAD_MISMATCH`; (6) result shape → `INVALID_RESULT`; (7) result-data/preimage shape or helper failure → `INVALID_DIGEST_INPUT`; (8) result digest mismatch → `RESULT_DIGEST_MISMATCH`. Record validation returns an ordered code list in this order: closure/missing fields, operation/kind, identity, predecessor, proposal/successor/approval, expected tuple, changed paths, record digest. Approval returns `INVALID_RECORD`, `INDEPENDENT_APPROVAL_NOT_ALLOWED`, `APPROVAL_IDENTITY_MISMATCH`, `APPROVAL_BINDING_MISMATCH`, then `APPROVAL_REPLAY` in that order. Any code not derivable from the existing T1/runtime contract is an SA decision point, not a Developer choice.

## Canonicalization, replay, and boundary inventory

### Frozen preimage rules

- CAS tuple comparison includes only `expected` and `observed` fields `commitSha`, `manifestDigest`, `setDigest`, and `headDigest`; result fields and `resultData` are not tuple members.
- Result preimages include only the data passed to the corresponding unchanged T1 helper: `manifest`, `set`, `head`, `projection`, or `contentTree`. Caller-supplied result digests, request envelope fields, and error fields are excluded.
- Record preimage includes every record field except `recordDigest`; approval event preimage is not separately digested in T2-A.
- Schema version is included in record preimages and is a fixed `.../v1` discriminator. It is not silently omitted or normalized.
- JCS canonical UTF-8 bytes are hashed with SHA-256 and encoded as lowercase hexadecimal. No Base64, host locale, path lookup, Git lookup, or line-ending substitution is allowed.
- The fixed vector IDs above and their exact canonical bytes/digests must be checked into the fixture manifest. Missing helper-derived bytes are an SA decision point.

Replay means only validating a duplicate/reused record or approval input against caller-supplied data such as `consumedRecordDigests`. T2-A must not create or read a replay store, mutate a consumed/used flag, track publication state, or perform an authority/identity capability check. A repeated input is rejected as `APPROVAL_REPLAY` only when the supplied data says its digest is already present; the pure function does not add it.

| Public boundary | Schema/runtime contract | Wrong-container behavior |
|---|---|---|
| `evaluateCasDecision(input)` | Distinct request schema plus response schema; exact four-field request and conditional accepted/rejected response | Code-only `{accepted:false,error:{code:"INVALID_INPUT"}}` |
| `deriveResultDigests(input)` | In-memory five-container result-data shape; five T1-derived digest fields | Code-only `INVALID_DIGEST_INPUT` |
| `recordDigest(record)` | Closed complete record shape; returns canonical digest or boundary error | Code-only `INVALID_RECORD` |
| `createTransitionRecord(input)` | Closed record-input constructor; fixes transition schema version and operation set | Code-only `INVALID_RECORD_INPUT` |
| `createCorrectionRecord(input)` | Closed record-input constructor; fixes correction schema version and operation | Code-only `INVALID_RECORD_INPUT` |
| `validateRecord(record)` | Both versioned closed record schemas; ordered code list | `[{"code":"INVALID_RECORD"}]`, never a throw |
| `approveRecord(input)` | Closed approval-binding input and conditional approval event/error response | Code-only `INVALID_RECORD`, never a throw |
| JSON Schema boundaries | CAS request, CAS response, transition record, correction record; runtime must exercise each same shape | Schema rejection must map to the runtime code for the same case; wrong containers are invalid, never coerced |

The implementation must enumerate these seven runtime exports and four schema boundaries in its handoff. Constructors, validators, approval binding, result-data derivation, and fixture-manifest validation are all public contract surfaces even when invoked only by tests.

## Fixture manifest and omission detection

The authoritative executable manifest is `test/fixtures/status-cas/v1/manifest.json`, encoded as UTF-8 JSON. It has exactly `schemaVersion`, `caseCount`, `manifestDigest`, and `cases`; each case has exactly `id`, `kind`, `input`, and `expected`, where `expected` has exactly `accepted` plus either `output` or `error`. `kind` identifies one of `cas`, `digest`, `transition`, `correction`, `record`, or `approval`. `manifestDigest` is SHA-256 over the JCS UTF-8 manifest preimage excluding only `manifestDigest`; its fixed value and approved numeric `caseCount` are frozen in the Human-approved fixture decision and must not be inferred at runtime.

Every listed case must run through both its applicable JSON Schema and runtime boundary. The test command must assert: manifest path exists; manifest digest matches; `caseCount === cases.length`; IDs are unique and sorted by the manifest rule; every case has the required fields; every case produces exactly its expected output/error; and the executed-ID set equals the manifest-ID set. A test that discovers files without consuming this manifest is insufficient. Omission detection is therefore a count check, digest check, unique-ID check, and executed-ID equality check; a missing case fails closed.

Required case categories are: accepted CAS, malformed/wrong-container CAS, each missing/extra/invalid/stale C/M/S/H member, forged result/preimage, valid transition, valid correction, cross-kind operation, unknown/missing record fields, wrong proposal/predecessor/successor/approval, duplicate/reused record and approval data, and no-side-effect rejection snapshots. The final count and any category-to-ID mapping are frozen by SA before Developer dispatch.

## No-side-effect proof and implementation rollback

The pure module may import only `node:crypto` and approved T1 in-memory helpers. Static and runtime proof must show no filesystem, Git, network, credential/secret, subprocess, child-process, orchestration, dispatch/relay, or lifecycle imports/calls. Each manifest case snapshots the input graph and all supplied in-memory state before and after invocation; deep equality and digest checks must be unchanged. Rejected malformed, forged, replay, unknown-field, and wrong-container cases must not mutate inputs, add replay entries, consume approvals, set publication state, or hide mutation behind a helper.

If implementation evidence fails, stop before QA, preserve the RED evidence, revert only the T2-A implementation/schema/fixture changes, and rerun the unchanged T1 status-audit, loader, JCS, lineage, resource, and full regression checks. T1 helpers, authority, consumers, and lifecycle contracts must remain byte-for-byte unchanged unless SA approves a named compatibility seam. There is no runtime/resource state, replay store, publication state, Git ref, credential, or production data created by T2-A to roll back.

## Developer handoff contract

The Developer handoff must be a complete instance of [`docs/templates/HANDOFF.md`](../../templates/HANDOFF.md), with every heading populated: identity/work item and URLs; change type/risk; lifecycle phase/specification readiness/current stage/task state/contract version/rework count; completed work/artifacts/files/verification/evidence; AC verification and traceability URL; verified SHA/platform activation; QA evidence/stop reason/limitations/open questions/review focus/recommended next step; next action/owner/orchestration turn/Boss event; and all dispatch, acknowledgement, terminal-result, completion, consumption, and timeout/cancellation fields. Fields that do not apply must say `N/A — blocked route` with the reason. No abbreviated handoff or free-form replacement is accepted.

## AC traceability ownership

Each assertion has one primary AC owner. A-01 owns pure input/output behavior; A-09 owns the independent no-side-effect proof. A-07 owns the required malformed/forged/replay/error-precedence corpus; A-08 owns closed shape and wrong-container schema/runtime parity. This removes the former A-01/A-09 and A-07/A-08 overlap.

| Assertion | Primary AC | Evidence |
|---|---|---|
| Pure data-only callable and deterministic accepted/rejected result | A-01 | Boundary test and static import audit |
| Exact C/M/S/H closure and mismatch codes | A-02 | Tuple schema/runtime matrix |
| Five helper-derived result digests and forged-preimage rejection | A-03 | Fixed-vector and mismatch cases |
| Distinct transition/correction schemas and operations | A-04 | Schema/runtime record matrix |
| Complete canonical record digest binding | A-05 | Preimage vectors and field-tamper cases |
| Exact proposal/predecessor/successor/approval data binding | A-06 | Approval binding cases |
| Malformed/forged/replay/error-precedence cases are all listed and executed | A-07 | Manifest category and executed-ID report |
| Unknown-field, missing-field, and wrong-container closure/parity | A-08 | Schema/runtime parity report |
| No imports/calls, unchanged snapshots, and no hidden replay mutation | A-09 | Static audit plus before/after snapshot report |
| Distinct request schema and same-case schema/runtime outcomes | A-10 | Request schema and parity report |
| Manifest digest/count/ID equality prevents omission | A-11 | Manifest integrity test output |
| T1 helpers and behavior remain unchanged | A-12 | T1 regression and diff scope evidence |

## T2-B deferred follow-up (not current AC)

T2-B is a future separate contract/package for publication-boundary behavior. Its scope may be refined only after T2-A is reviewed and approved. It may later address writer intent, disposable publication modeling, candidate/archive/manifest/projection/ref boundaries, interruption/rollback, and race/TOCTOU evidence. Those topics are named only to preserve the split; they are not T2-A requirements, current acceptance criteria, implementation files, or approval for authority or production access.

## Verification and Stop Condition

- Documentation checks: `git diff --check`; `npm run validate:project-state`; `npm run validate:contracts`; `npm run validate:skill-usage`; `npm run validate:context-budget`.
- Planning-only checks: inspect the diff for the two synthetic record vectors, the T2-A-only fixture manifest, and minimal project-state entries; confirm no runtime code, runtime schema, or implementation test changed and no T2-B criterion appears in the A-01..A-12 table.
- Future implementation checks: failing-test evidence before implementation; focused CAS/record/fixture tests; `npm test`; all project validators above; fresh independent Code Review, Security Review, QA, and Human approval. Do not claim these implementation checks from this planning task.
- Stop and route to SA for contract/preimage/schema ambiguity; Security for untrusted-input, canonicalization, replay, or side-effect control findings; Human for scope, authority, credentials, lifecycle, migration, release, or Go/No-Go decisions; Developer/QA only after approved implementation evidence exists.

Rollback for this planning task is a documentation-only revert before approval. No runtime state, authority, ref, credential, or production data is created or changed.

Next handoff: SA Agent review of this exact Task Brief and paired Implementation Plan. `status:spec-ready` and Developer dispatch remain withheld until Human approval.

## SA closeout addendum — T1-derived freezes and context stop

This addendum is the authoritative clarification for the remaining SA findings. It is planning evidence only; it does not add implementation authority.

### Exact public shapes and operand semantics

| Value | Exact shape/type | Equality and normalization |
|---|---|---|
| `identity` | A non-empty string matching the existing T1 identity grammar `^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$`; no object or array form | Exact code-point equality; no trim, case-fold, URL/email normalization, or capability lookup. |
| `proposal` | A lowercase 64-hex digest string | Exact string equality. It is data, not an authorization token. |
| `predecessor` | Closed object `{ "digest": string, "authenticatedBy": string }`; both digest and identity use the types above | Exact member equality; `authenticatedBy` is a binding value, not an authority check. |
| `successor` | A lowercase 64-hex digest string | Exact string equality. |
| Record `approval` | A lowercase 64-hex digest string in each transition/correction record | Exact string equality; it is the bound approval-event digest, not an approval object or store. |
| `changedPaths` | Non-empty array of unique repository-path strings, each 1–255 characters, using the existing T2 schema path rule; no object members | Array order is significant because it is included in the record preimage. No sorting, path resolution, slash conversion, or case normalization is applied by T2-A. |
| Approval input | Closed object `{ record: object, identity: string, independent: boolean, proposal: string, predecessor: string, result: string, consumedRecordDigests: string[] }`; `proposal`, `predecessor`, and `result` are lowercase 64-hex digests; `consumedRecordDigests` is an array of lowercase 64-hex digests | `record` validates first. `independent` must be exactly `false`. Digest and identity comparisons are exact. `consumedRecordDigests` is read as a membership set for this call only; the input array is not sorted, deduplicated, or mutated. |
| `resultData` | Closed object with exactly `{ manifest, set, head, projection, contentTree }` | Each member is passed unchanged to its named T1 helper. The helper alone defines its internal canonical sorting/line-ending behavior. T2-A does not normalize the container before calling it. |

The accepted CAS condition is exact: the four expected and observed tuple members `C/M/S/H` all match, and all five recomputed result digests `manifestDigest`, `setDigest`, `headDigest`, `projectionDigest`, and `contentTreeDigest` match the caller-provided result. Any one mismatch rejects. Tuple operands are compared in the order `commitSha`, `manifestDigest`, `setDigest`, `headDigest`; strings must already be lowercase canonical forms. JSON object key order is irrelevant only to JCS digest canonicalization; no other operand normalization is permitted.

### Frozen T1 digest vectors

The following values are copied from `test/status-audit.test.mjs:233-271` at base `56e99b5`; the helper source is `scripts/lib/status-audit.mjs:259-340`. The copied canonical strings are the exact UTF-8 bytes (the corresponding SHA-256 output is lowercase hex). These are the five stable vector IDs required by A-03.

| Vector ID | T1 input/source | Exact canonical UTF-8 preimage | Expected digest |
|---|---|---|---|
| `T2A-DIGEST-001/MANIFEST` | `manifest = { schemaVersion: "status-manifest/v1", manifestDigest: "f"×64, nested: { manifestDigest: "keep-me" }, setDigest: "9bea80eaae94dfd06301903d9b5f3d7740221794495160800edac7cbb137f600" }` | `{"nested":{"manifestDigest":"keep-me"},"schemaVersion":"status-manifest/v1","setDigest":"9bea80eaae94dfd06301903d9b5f3d7740221794495160800edac7cbb137f600"}` | `11ee19ff51b96ea45af5080ba14d8b4513772d95219ae21086781f4c58b4c88c` |
| `T2A-DIGEST-001/SET` | The two descriptors at `test/status-audit.test.mjs:237-240` | `[ { issueKey: "chakrits/AI-Agent-Workflow#1", path: "docs/status/active/issue-1.yaml", recordDigest: "a"×64 }, { issueKey: "chakrits/AI-Agent-Workflow#2", path: "docs/status/active/issue-2.yaml", recordDigest: "b"×64 } ]` rendered as the exact JCS string in the source assertion at line 243 | `9bea80eaae94dfd06301903d9b5f3d7740221794495160800edac7cbb137f600` |
| `T2A-DIGEST-001/HEAD` | `head` at `test/status-audit.test.mjs:248-249` using the preceding set digest | `{"activeIssueKeys":["chakrits/AI-Agent-Workflow#1","chakrits/AI-Agent-Workflow#2"],"schemaVersion":"work-item-status/v1","setDigest":"9bea80eaae94dfd06301903d9b5f3d7740221794495160800edac7cbb137f600"}` | `a37343194a1ac035cdfb7fb1c3d94a1abd55b1237777dec27ac702518ebefe8d` |
| `T2A-DIGEST-001/PROJECTION` | Input literal `a\r\nb\r\n` at line 259 | `a\nb\n` (bytes `61 0a 62 0a`) | `911169ddaaf146aff539f58c26c489af3b892dff0fe283c1c264c65ae5aa59a2` |
| `T2A-DIGEST-001/CONTENT-TREE` | Entries at `test/status-audit.test.mjs:211-215`; the audit-path entry is supplied but excluded by the T1 helper | `zeta.txt\0fa7af8bf5fdd704f73beb3adc5612682a98e1af5\0é.txt\09cbe6ea56f225388ae614c419249bfc6d734cc30\0` | `df3e425dec1ba06274a95db2364dfc7e66c769c9a5e3982ff1204fb1452ea45a` |

The SET row's source assertion is the immutable byte source for the full long string; the abbreviated table notation is not an alternate preimage. Implementers must copy the source assertion or its exact UTF-8/hex bytes, not regenerate a different descriptor order.

### Record vectors: Human-approved synthetic test-only decision

T1 has no transition/correction constructor, record schema, or record-digest helper. The existing T2 schemas at `docs/contracts/schemas/status-transition-record.schema.json` and `status-correction-record.schema.json` define the closed field types only. Therefore these are explicitly synthetic planning vectors, not T1 evidence; SA/Human must approve them before they become implementation fixtures. They use the real T1 `auditDigest` from `test/fixtures/status-audit/v1/valid.json` and the real T1 `changedPaths`/tuple values to keep the example data anchored.

- `T2A-RECORD-001/TRANSITION`: schema `status-transition-record/v1`, operation `update`, identity and `predecessor.authenticatedBy` `maintainer@example.com`, predecessor/proposal/approval `9cd30e3d938ae46960dcf8e2ed499f243bd301a0f4667a6d75f9dd22ec71e529`, successor `b`×64, expected `{ commitSha: "c"×40, manifestDigest: "a"×64, setDigest: "a"×64, headDigest: "a"×64 }`, changed paths `PROJECT_STATUS.md`, `docs/status/active/issue-133.yaml`, `docs/status/manifest.yaml`, expected `recordDigest` `c2352178b62c238cf2d6cb596024fd950862bacc4ec4e313e952a069785ea947`.
- `T2A-RECORD-001/CORRECTION`: schema `status-correction-record/v1`, operation `correction`, all fields as above except successor `c`×64, expected `recordDigest` `d206024ddb4893a83f6eca60a5a07184ece187cfe59dca043eec3d73774a6e69`.

For both vectors, the canonical preimage is JCS UTF-8 over the complete record with only `recordDigest` omitted; schema version and every other field are included. The exact preimage bytes are copied below (one line per vector) and are reproducible by `canonicalizeJcs(recordWithoutRecordDigest)` from the T1 helper `scripts/lib/status-jcs.mjs:110-120`:

```text
T2A-RECORD-001/TRANSITION {"approval":"9cd30e3d938ae46960dcf8e2ed499f243bd301a0f4667a6d75f9dd22ec71e529","changedPaths":["PROJECT_STATUS.md","docs/status/active/issue-133.yaml","docs/status/manifest.yaml"],"expected":{"commitSha":"cccccccccccccccccccccccccccccccccccccccc","headDigest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","manifestDigest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","setDigest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},"identity":"maintainer@example.com","operation":"update","predecessor":{"authenticatedBy":"maintainer@example.com","digest":"9cd30e3d938ae46960dcf8e2ed499f243bd301a0f4667a6d75f9dd22ec71e529"},"proposal":"9cd30e3d938ae46960dcf8e2ed499f243bd301a0f4667a6d75f9dd22ec71e529","schemaVersion":"status-transition-record/v1","successor":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}
T2A-RECORD-001/CORRECTION {"approval":"9cd30e3d938ae46960dcf8e2ed499f243bd301a0f4667a6d75f9dd22ec71e529","changedPaths":["PROJECT_STATUS.md","docs/status/active/issue-133.yaml","docs/status/manifest.yaml"],"expected":{"commitSha":"cccccccccccccccccccccccccccccccccccccccc","headDigest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","manifestDigest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","setDigest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},"identity":"maintainer@example.com","operation":"correction","predecessor":{"authenticatedBy":"maintainer@example.com","digest":"9cd30e3d938ae46960dcf8e2ed499f243bd301a0f4667a6d75f9dd22ec71e529"},"proposal":"9cd30e3d938ae46960dcf8e2ed499f243bd301a0f4667a6d75f9dd22ec71e529","schemaVersion":"status-correction-record/v1","successor":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"}
```

Human approved both vectors as synthetic, test-only planning artifacts. They are reproducible with the existing T1 JCS/SHA-256 helper but are not T1 evidence and do not become production authority, runtime state, publication records, migration data, live status records, or approval/identity capability. They do not consume replay state and do not authorize T2-B.

### Frozen T2-A fixture manifest and corpus

The exact path and format are frozen: `test/fixtures/status-cas/v1/manifest.json`, UTF-8 JSON, closed top-level `{ schemaVersion, caseCount, manifestDigest, cases }`, case shape `{ id, kind, input, expected }`, `expected` shape `{ accepted, output | error }`, and IDs sorted by UTF-8 byte order. The checked-in manifest has `caseCount: 34` and `manifestDigest` `c254c2dff962b4b11a21dbaea2bc7f9a6e1c2e9978b21edaa890f765b64bc0c2`; its digest is SHA-256 over the JCS UTF-8 manifest preimage excluding only `manifestDigest`.

| Category | Numbered IDs | Mapping and expected coverage |
|---|---:|---|
| T2A-CAS-001 | 01 | Accepted complete CAS tuple/result |
| T2A-CAS-002 | 01–02 | Wrong outer container; unknown public field |
| T2A-CAS-003 | 01–05 | Missing `C`, `M`, `S`, `H`; extra tuple member |
| T2A-CAS-004 | 01–04 | Invalid `C`, `M`, `S`, `H` in precedence order |
| T2A-CAS-005 | 01–04 | Stale/mismatched `C`, `M`, `S`, `H` in precedence order |
| T2A-CAS-006 | 01–02 | Forged result digest; forged result preimage |
| T2A-CAS-007 | 01 | Valid synthetic transition record |
| T2A-CAS-008 | 01 | Valid synthetic correction record |
| T2A-CAS-009 | 01–04 | Cross-kind operation; unknown record field; missing record field |
| T2A-CAS-010 | 01–04 | Wrong identity, proposal, predecessor, successor binding |
| T2A-CAS-011 | 01–02 | Duplicate/reused record or approval data |
| T2A-CAS-012 | 01–04 | Rejected CAS/record/approval snapshots and unchanged replay input |

The manifest is omission-detectable: future tests must resolve every `input.fixture`, execute every listed ID through its applicable schema and runtime boundary, assert the exact `expected` result/error, verify unique UTF-8-byte-sorted IDs, assert `caseCount === cases.length`, recompute `manifestDigest`, and compare executed IDs with manifest IDs. T2-B writer/publication/harness cases are deliberately absent from this corpus; the prior four-case harness manifest is superseded for T2-A planning.

All synthetic vectors and cases are test-only. They are not production authority, live status records, runtime state, publication records, migration data, credentials, real refs, or approval stores; they do not mutate or consume replay state, and they do not authorize T2-B.
