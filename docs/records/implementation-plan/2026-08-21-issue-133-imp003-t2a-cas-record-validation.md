# IMP-003 T2-A Pure CAS and Record Validation Implementation Plan

> **For agentic workers:** Implement only after SA review and Human approval of the paired T2-A Task Brief plus `status:spec-ready`. This plan is a bounded contract/test slice; it does not authorize T2-B, publication, or authority changes.

**Goal:** Implement and verify a pure data-only CAS decision boundary and closed transition/correction record validation while preserving T1 behavior.

**Architecture:** Keep the CAS evaluator and record validators side-effect-free. Validate exact expected/observed `(C, M, S, H)` tuples, derive five result digests through unchanged T1 helpers, and bind canonical record fields/digests in data only. JSON Schema and runtime must share closed shapes and deterministic errors; an executable fixture manifest is the single corpus source for malformed, forged, replay, unknown-field, and no-side-effect cases.

**Tech Stack:** Node.js ESM, JSON Schema/Ajv as already used by the repository, Node test runner, existing T1 JCS/SHA-256 helpers, and checked-in JSON fixtures. No writer, Git, filesystem, network, credential, or orchestration dependency is permitted.

**Spec:** `docs/records/task-brief/2026-08-21-issue-133-t2a-cas-record-validation.md`

## Global Constraints

- T2-A is a new bounded scope reset, not rework round 3; the parent Issue remains open.
- Only pure CAS/record/digest validation over data is in scope.
- Expected and observed CAS tuples are exactly `(C, M, S, H)` and all five result digests are data-bound to unchanged T1 helpers.
- Transition and correction records remain distinct, closed, canonically digested, and exact-field bound.
- Every malformed, forged, replayed, unknown-field, and rejected input returns deterministic code-only evidence and leaves observable state unchanged.
- No writer intent, publication, interruption/rollback, TOCTOU race, production authority, real ref, credential, dispatch/relay, terminal-result, orchestration, lifecycle, migration, or Go/No-Go work is authorized.

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | GitHub Issue #133 / IMP-003 T2-A |
| Change Type | Framework / Meta; bounded contract and test implementation slice |
| Risk Level | High — untrusted input, canonical digest, replay, and authority-boundary semantics |
| Owner | Developer Agent after SA and Human approval; Documentation Agent owns this plan |
| Target Branch / Ticket | New clean `codex/` branch from approved implementation head; Issue #133 |
| Rework policy | New T2-A scope-reset review cycle; not rework round 3 and not a continuation of the combined T2 implementation packet |

## 2. Inputs Reviewed

| Artifact | Status | Notes |
|---|---|---|
| T2-A Task Brief | Available | Paired record with A-01..A-12 and explicit T2-B deferral |
| Prior T2 brief/plan | Superseded for this slice | Combined writer/publication/TOCTOU scope is not copied into T2-A current AC |
| T1 task brief and helpers | Available | Reuse existing `status-audit/v1` digest/preimage helpers; no T1 behavior change |
| Prior Code/Security blocked route | Available | Findings motivate narrower pure/data-only scope; this plan does not claim the prior implementation review passed |
| Required approval | Pending | SA review first, then Human specification approval; `status:spec-ready` withheld |

## 3. Affected Areas and Explicit Exclusions

| Area | Files / Components | Expected T2-A change |
|---|---|---|
| Pure runtime | `scripts/lib/status-cas-decision.mjs` | Add/align data-only tuple, result, record, digest, binding, and deterministic-error validation |
| Schemas | `docs/contracts/schemas/status-cas-decision.schema.json`, `status-transition-record.schema.json`, `status-correction-record.schema.json`, and a distinct CAS request schema if needed | Closed schemas with required fields and runtime-parity rules |
| Tests | `test/status-cas-decision.test.mjs` | RED-first unit/contract tests for every A-01..A-12 behavior, including no-I/O assertions |
| Fixtures | `test/fixtures/status-cas/v1/**` | Executable manifest, valid vectors, malformed/forged/replay/unknown/no-side-effect cases |
| T1 compatibility | Existing T1 test/helpers only | Read-only regression proof; modification requires SA-approved compatibility seam |
| Project state | `PROJECT_STATUS.md`, `TASK_LOG.md` | Planning/handoff state only |

Excluded files/components include writer harnesses, publication schemas/paths, candidate/archive/manifest/projection/ref mutation, interruption/rollback code, TOCTOU/race harnesses, production credentials/refs, dispatch/relay/terminal-result/orchestration/lifecycle/migration/Go artifacts, and any T1 authority change.

## 3A. Frozen contract for implementation

The Developer must implement the paired Task Brief literally. The public runtime inventory is `evaluateCasDecision(input)`, `deriveResultDigests(input)`, `recordDigest(record)`, `createTransitionRecord(input)`, `createCorrectionRecord(input)`, `validateRecord(record)`, and `approveRecord(input)`. The schema inventory is a distinct CAS request schema, CAS response schema, `status-transition-record/v1`, and `status-correction-record/v1`. Every boundary is a closed object; wrong containers return the documented code-only result and never throw.

| Contract | Frozen shape and behavior |
|---|---|
| CAS request/response | Request exactly `expected`, `observed`, `result`, `resultData`; accepted response exactly `accepted`, `observed`, `result`; rejected response exactly `accepted`, `error`. `resultData` exactly `manifest`, `set`, `head`, `projection`, `contentTree`. |
| Tuple | Exactly `commitSha`, `manifestDigest`, `setDigest`, `headDigest`; C is lowercase 40-hex and M/S/H are lowercase 64-hex. Compare C, M, S, H in that order. |
| Results | Exactly `manifestDigest`, `setDigest`, `headDigest`, `projectionDigest`, `contentTreeDigest`, recomputed with unchanged T1 `manifestDigest`, `setDigest`, `headDigest`, `projectionDigest`, and `contentTreeDigest` helpers. |
| Records | Both record kinds exactly `schemaVersion`, `operation`, `identity`, `predecessor`, `proposal`, `successor`, `expected`, `changedPaths`, `approval`, `recordDigest`; predecessor exactly `digest`, `authenticatedBy`. Transition operations remain the existing set; correction operation is exactly `correction`. |
| Approval | Validate record first, require `independent:false`, bind identity to `predecessor.authenticatedBy` and proposal/predecessor/result to record values. Public JSON and fixtures represent `consumedRecordDigests` as `string[]` only; the runtime boundary copies it into a fresh internal `Set` for this call. Null, missing, non-array, or malformed-member values return `INVALID_RECORD`; duplicate entries are accepted and deduplicated; order is ignored; the source array is not mutated; and no store is maintained. |

### Preimages, vectors, and precedence

Record digest is SHA-256 of JCS canonical UTF-8 for the complete record excluding only `recordDigest`; schema version is included. Result digests use only the corresponding T1 helper preimage. CAS tuple comparison excludes result/resultData. Encoding is lowercase hexadecimal; no Base64, locale, line-ending, filesystem, Git, or network normalization is permitted. Fixed vector IDs are `T2A-DIGEST-001/MANIFEST`, `/SET`, `/HEAD`, `/PROJECTION`, and `/CONTENT-TREE`, and their exact payloads/preimages/digests are checked into `test/fixtures/status-cas/v1/digest-vectors.json`.

The error inventory is closed and normative: resolver/manifest uses `INVALID_FIXTURE_REFERENCE_SYNTAX`, `FIXTURE_NOT_FOUND`, `INVALID_JSON_POINTER`, `FIXTURE_TARGET_NOT_FOUND`, `FIXTURE_ALIAS_CYCLE`, `DUPLICATE_CASE_ID`, `UNSORTED_CASE_ID`, `CASE_COUNT_MISMATCH`, and `MANIFEST_DIGEST_MISMATCH`; CAS/result uses `INVALID_INPUT`, `UNKNOWN_FIELD`, `INVALID_TUPLE`, `INVALID_COMMIT`, `INVALID_MANIFEST`, `INVALID_SET`, `INVALID_HEAD`, `CAS_COMMIT_MISMATCH`, `CAS_MANIFEST_MISMATCH`, `CAS_SET_MISMATCH`, `CAS_HEAD_MISMATCH`, `INVALID_RESULT`, `INVALID_DIGEST_INPUT`, and `RESULT_DIGEST_MISMATCH`; record/approval uses `INVALID_RECORD_INPUT`, `INVALID_RECORD`, `UNKNOWN_FIELD`, `MISSING_FIELD`, `INVALID_OPERATION`, `INVALID_SCHEMA_KIND`, `INVALID_NESTED_SHAPE`, `RECORD_DIGEST_MISMATCH`, `INDEPENDENT_APPROVAL_NOT_ALLOWED`, `APPROVAL_IDENTITY_MISMATCH`, `APPROVAL_BINDING_MISMATCH`, and `APPROVAL_REPLAY`. Precedence is resolver syntax/file/pointer/target/cycle, manifest duplicate/order/count/digest, CAS outer/unknown/tuple/format/mismatch/result/input/digest, record closure/kind/operation/nested/binding/digest, and approval record/independent/identity/binding/replay. No open regex or implementation-defined code is allowed.

`recordDigest({})` must return `INVALID_RECORD`, never a digest or throw. Developer must add the failing TDD case before implementation and QA must verify it. Runtime/schema parity remains a Developer implementation requirement plus independent Code Review and QA gate; this documentation/fixture commit does not prove parity.

### Replay and no-side-effect boundary

Replay is a data-only duplicate/reuse check over caller-supplied values. No replay store, consumed flag, publication state, authority check, credential check, writer identity capability, dispatch, or lifecycle state is permitted. The pure module may import only `node:crypto` and approved T1 in-memory helpers. Static and runtime evidence must show no filesystem/Git/network/credential/secret/subprocess/orchestration imports or calls. Every fixture snapshots input and in-memory state before/after; rejected malformed, forged, replay, unknown-field, and wrong-container cases must leave snapshots and supplied replay data unchanged.

### Executable manifest

The sole authoritative corpus is `test/fixtures/status-cas/v1/manifest.json` (UTF-8 JSON), with exactly `schemaVersion`, `testOnly: true`, `caseCount`, `manifestDigest`, and `cases`. Each case has exactly `id`, `kind`, `input`, and `expected`; expected has exactly `accepted` plus either `output` or `error`. Every fixture reference uses `<relative-file>#<RFC-6901-json-pointer>` rooted at the manifest directory; `#` selects a file root, `~1`/`~0` are decoded, and bare/absolute/parent-traversing references are invalid. `input.fixture` and `expected.output.fixture` resolve payloads; an object containing only `fixture` is recursively resolved with cycle detection; `expected.error` is inline code-only evidence. The corpus index `test/fixtures/status-cas/v1/corpus.json` has `fixtureVersion`, `testOnly: true`, and marked case entries. The checked-in manifest is `caseCount: 52`, with manifest digest `ad354f1cde4076127053ec22e3030c3b748e4878954c3687a57c587716029e63`; the digest is SHA-256 JCS over the manifest excluding only `manifestDigest`. IDs are sorted by UTF-8 byte order. Tests must verify path, digest, count equals array length, unique/sorted IDs, required fields, explicit test-only markers, every reference resolves, schema/runtime expected output, and executed-ID set equals manifest-ID set. File discovery without manifest consumption is a failure. T2-B writer/publication/harness cases are excluded.

### Rollback and T1 preservation

If implementation or parity evidence fails, stop before review, preserve RED evidence, and revert only T2-A runtime/schema/fixture changes. Re-run unchanged T1 status-audit, loader, JCS, lineage, resource, and full regression checks. No T2-A runtime/resource state exists to roll back: it creates no replay store, publication state, Git ref, credential, authority state, or production data. T1 helpers, authority, consumers, and lifecycle contracts remain unchanged unless SA approves a named compatibility seam.

## 4. Task Breakdown

| Task ID | Task | Owner | Files / Components | Verification |
|---|---|---|---|---|
| T2A-01 | Freeze the T2-A field tables, error-code table, canonical preimages, synthetic record vectors, complete manifest, and AC traceability; identify whether a distinct CAS request schema is required. | SA | T2-A brief, record vectors, manifest | SA re-reviews the exact revision; Human exact-revision approval remains required before `status:spec-ready`. |
| T2A-02 | Add RED tests against the frozen fixture manifest for exact tuple closure, malformed/unknown inputs, and pure no-I/O behavior. | Developer | `test/status-cas-decision.test.mjs`, `test/fixtures/status-cas/v1/**` | Focused tests fail for the intended missing runtime/schema behavior before implementation. |
| T2A-03 | Add RED tests and schemas for five T1-derived result digests, transition/correction distinction, canonical record digest, and exact proposal/predecessor/successor/approval binding. | Developer | CAS/record schemas, tests, fixtures | Schema/runtime tests fail for missing closed fields, forged preimages, wrong bindings, and cross-kind records. |
| T2A-04 | Implement the minimal pure CAS/result/record validators and deterministic code-only errors using unchanged T1 helpers. | Developer | `scripts/lib/status-cas-decision.mjs` and approved schemas | Focused tests pass; static inspection confirms no I/O/import/authority seam; fixture outputs are exact. |
| T2A-05 | Make the fixture manifest authoritative and execute every listed case; add replay and no-side-effect snapshot assertions without introducing publication state. | Developer | Fixture manifest/corpus and tests | Manifest count/integrity test passes; forged/replay/rejected cases preserve snapshots; no T2-B fixtures exist in this package. |
| T2A-06 | Run checkpoint and T1 regression compatibility before handoff. | Developer | T2-A tests and existing T1 suite | Focused suite, full `npm test`, contracts, project state, skill usage, context budget, and diff checks pass. |
| T2A-07 | Perform independent Code Review and Security Review of exact implementation range. | Independent Code Reviewer / Security Reviewer | Pinned diff, schemas, runtime, fixtures | Code Review and Security Review PASS; any blocking finding routes to SA/Developer/Human and blocks QA. |
| T2A-08 | Perform fresh independent QA against A-01..A-12 and T1 regression. | QA Agent | Pinned base/head and fixture manifest | QA records exact AC traceability, schema/runtime parity, deterministic negative evidence, and no-side-effect evidence. |
| T2A-09 | Human reviews the complete evidence and decides the next action. | Human Maintainer | SA, Code, Security, QA records | Human approval or explicit stop; no autonomous merge, authority switch, T2-B start, release, or Go/No-Go claim. |

Tasks T2A-02 and T2A-03 may prepare independent RED fixtures, but T2A-04 depends on T2A-01 through T2A-03. T2A-05 and T2A-06 are sequential checkpoints. Review and QA are strictly after implementation and are not self-review substitutes.

## 5. Failing-Test / TDD Approach

1. Record the exact A-01..A-12 checklist and field/error tables before code changes.
2. Add the executable manifest and RED tests first. Run the focused test command and preserve failure output showing missing or mismatched pure contract behavior.
3. Implement only the smallest runtime/schema changes needed to turn those named failures green. Do not add a writer, publication model, race harness, or external-resource seam.
4. Add/verify fixture-manifest integrity and snapshot assertions, then rerun focused tests.
5. Run the full regression and repository validators before independent review. Any test that requires filesystem/Git/network/credential/orchestration access is a scope failure and must be removed or routed to T2-B planning.

## 6. Test Strategy

| Test Type | Required? | Scope | Owner |
|---|---|---|---|
| Unit/contract | Yes | Pure tuple/result/record/binding validation and deterministic errors | Developer; independent Code Review |
| Schema/runtime parity | Yes | Same closed input/output/error shapes, including distinct CAS request contract if needed | Developer; QA |
| Fixture corpus | Yes | Manifest-executed valid, malformed, forged, replay, unknown-field, and no-side-effect cases | Developer; QA |
| T1 regression | Yes | Existing status-audit/loader/JCS/lineage/resource tests plus full suite | QA |
| Security Review | Yes | Untrusted input, canonicalization, replay, data binding, and proof of no authority/I/O | Security Reviewer before QA |
| Writer/publication/TOCTOU/E2E/hosted | No | Explicitly deferred or excluded from T2-A | N/A |

## 7. Verification Commands

```bash
node --test test/status-cas-decision.test.mjs
npm test
npm run validate:project-state
npm run validate:contracts
npm run validate:skill-usage
npm run validate:context-budget
npm run validate:review-gate
git diff --check
```

The implementation handoff must include RED evidence, focused GREEN output, fixture-manifest execution count, schema/runtime parity output, T1 regression result, exact pinned base/head SHAs, Code/Security review records, and fresh QA evidence. This planning task runs only docs/state checks and must not claim implementation test results.

## 8. Rollback / Fallback Plan

| Scenario | Rollback / Fallback Action | Owner |
|---|---|---|
| SA or Human rejects scope | Revert this docs-only package; retain the parent Issue open and do not dispatch Developer. | Human / Documentation |
| Schema/preimage ambiguity | Stop implementation and route the exact field/vector conflict to SA; no guessed alternate preimage. | Developer / SA |
| Runtime/schema mismatch | Stop before review; preserve RED evidence and correct only the approved T2-A contract. | Developer |
| Security finding | Block QA; route the finding to Security and SA/Developer. Do not add credentials, refs, or authority. | Security Reviewer |
| QA failure | Route by root cause to Developer, SA, or Security; preserve this scope split and do not relabel it as round 3. | QA / Human |
| Human approval absent | Remain `phase:planning`/pending approval; no `status:spec-ready`, dispatch, merge, release, T2-B work, or Go decision. | Human Maintainer |

## 9. Risks / Blockers

| Risk / Blocker | Impact | Mitigation / Next Action |
|---|---|---|
| Tuple member or digest preimage omitted | False CAS acceptance or unverifiable result | Closed exact field sets, fixed vectors, per-member negative cases, SA review |
| Runtime/schema drift | Different callers receive inconsistent acceptance/error behavior | Dual validation of every manifest case and parity assertions |
| Forged/replayed record accepted | Incorrect correction or approval binding | Canonical digest over complete preimage, exact field bindings, replay fixtures, no mutation |
| Pure seam gains hidden side effects | Authority or state can change before a later gate | No-I/O spies/snapshots and static import/path review; publication is excluded |
| T2-B leaks back into T2-A | Scope expands and prior blocked concerns recur | Explicit exclusion list, current AC table audit, SA review, Human approval |
| T1 regression | Existing status evidence changes | Reuse unchanged T1 helpers and run full regression |

## 10. Handoff and Required Gates

1. **SA review:** review the exact T2-A brief/plan, A-01..A-12, field/error/preimage tables, and T2-B boundary.
2. **Human specification approval:** approve this exact revision before `status:spec-ready` or Developer dispatch.
3. **Developer:** clean isolated worktree, RED evidence, exact write set, and no external-resource or authority seam.
4. **Independent Code Review:** pinned base/head, pure-boundary, schema/runtime, digest/preimage, and fixture-manifest review.
5. **Security Review:** untrusted input, canonicalization, replay, no-side-effect, and non-authority review; unresolved findings block QA.
6. **Fresh QA:** pinned AC traceability, manifest execution, deterministic negative cases, schema/runtime parity, and T1 regression.
7. **Human approval:** decide merge/next action; no self-approval, T2-B dispatch, release, authority switch, or Go/No-Go claim.

The Developer handoff must be a complete populated copy of [`docs/templates/HANDOFF.md`](../../templates/HANDOFF.md), including every identity, lifecycle, specification, evidence, acceptance-traceability, QA, stop/limitation/open-question, next-action, Boss-event, dispatch receipt, acknowledgement, terminal result, completion, consumption, and timeout/cancellation field. Non-applicable fields must state `N/A — blocked route` and why; abbreviated handoffs are not accepted.

## 11. AC traceability ownership

| Primary AC | Sole assertion owner | Required evidence |
|---|---|---|
| A-01 | Pure data-only request/response behavior | Runtime boundary cases and static import audit |
| A-02 | Exact C/M/S/H closure and mismatch precedence | Tuple schema/runtime matrix |
| A-03 | Five T1-derived result digests | Fixed vectors and forged preimage cases |
| A-04 | Transition/correction schema and operation distinction | Both schema/runtime matrices |
| A-05 | Canonical complete-record digest | Preimage vectors and field-tamper cases |
| A-06 | Exact proposal/predecessor/successor/approval binding | Approval binding cases |
| A-07 | Malformed/forged/replay corpus and error precedence | Manifest category and executed-ID report |
| A-08 | Unknown/missing/wrong-container closure and parity | Schema/runtime parity report |
| A-09 | No-side-effect and unchanged-snapshot proof | Static audit plus before/after snapshots |
| A-10 | Distinct CAS request schema and parity | Request schema cases |
| A-11 | Manifest count/digest/ID omission detection | Manifest integrity output |
| A-12 | T1 preservation | T1 regression and diff scope |

A-01 therefore owns callable semantics while A-09 owns the independent side-effect proof; A-07 owns corpus completeness while A-08 owns closure/parity. No assertion is credited to two primary owners.

Next action: **SA review of the exact T2-A specification.**

## SA closeout addendum — frozen boundary and blocking context

The paired Task Brief addendum is normative for implementation planning. The verified candidate base for this repair is `5b657d3bb1902c0e1db7b24e4b9202ab888444d5`; it is a prior candidate verification point, not the final documentation commit. The accepted CAS predicate is `expected.commitSha === observed.commitSha`, `expected.manifestDigest === observed.manifestDigest`, `expected.setDigest === observed.setDigest`, `expected.headDigest === observed.headDigest`, plus equality of all five recomputed result digests against the supplied result. Values are compared as already-canonical lowercase strings; no trim, case folding, path resolution, locale conversion, or other operand normalization is permitted. JCS key ordering is used only inside the named T1 helper preimages.

The exact public contract is now closed as follows: identity is a T1-grammar string; proposal, predecessor digest, successor, record approval, result, and every member of `consumedRecordDigests` are lowercase 64-hex digest strings; predecessor is `{digest, authenticatedBy}`; changed paths are a non-empty unique string array with significant order; approval input is `{record, identity, independent, proposal, predecessor, result, consumedRecordDigests}` with `independent === false`; and result data is exactly `{manifest, set, head, projection, contentTree}` passed unchanged to the corresponding T1 helper. `consumedRecordDigests` is serialized as JSON `string[]` at the public and fixture boundary and converted at the Developer runtime boundary to a fresh internal `Set` for this call only. Null, missing, wrong containers, or malformed members return canonical public `INVALID_RECORD`; duplicate entries are accepted idempotently; array order is ignored after validation; the source array is not mutated; and this is data-only replay validation, never a consumption store. Runtime/schema parity is a Developer/TDD acceptance gate, not current implementation evidence.

The canonical public inventory remains exactly 34 unique codes. Existing internal `INVALID_IDENTITY`, `INVALID_PREDECESSOR`, `INVALID_PROPOSAL`, `INVALID_SUCCESSOR`, `INVALID_APPROVAL`, and `INVALID_CHANGED_PATHS` are implementation diagnostics only and reconcile deterministically to public `INVALID_NESTED_SHAPE`; the other existing record/approval names already in the public table retain their canonical names. Developer/TDD must cover every mapping and reject any implementation-only code at the public boundary. This is a required reconciliation test, not a claim of current runtime parity.

Five vectors are frozen from `test/status-audit.test.mjs:211-271` at verified candidate base `5b657d3bb1902c0e1db7b24e4b9202ab888444d5` and `scripts/lib/status-audit.mjs:259-340`, and are materialized with stable IDs, exact canonical strings, and outputs in `test/fixtures/status-cas/v1/digest-vectors.json`: `T2A-DIGEST-001/MANIFEST` → `11ee19ff51b96ea45af5080ba14d8b4513772d95219ae21086781f4c58b4c88c`; `/SET` → `9bea80eaae94dfd06301903d9b5f3d7740221794495160800edac7cbb137f600`; `/HEAD` → `a37343194a1ac035cdfb7fb1c3d94a1abd55b1237777dec27ac702518ebefe8d`; `/PROJECTION` (`a\r\nb\r\n` → `a\nb\n`) → `911169ddaaf146aff539f58c26c489af3b892dff0fe283c1c264c65ae5aa59a2`; `/CONTENT-TREE` → `df3e425dec1ba06274a95db2364dfc7e66c769c9a5e3982ff1204fb1452ea45a`.

T1 has no record constructor or T2 record helper. The transition/correction vectors in the paired brief are therefore explicitly synthetic planning candidates, derived with the existing T1 JCS/SHA-256 helper only to make their preimages reproducible, not claimed as T1 authority. Their proposed expected digests are `c2352178b62c238cf2d6cb596024fd950862bacc4ec4e313e952a069785ea947` and `d206024ddb4893a83f6eca60a5a07184ece187cfe59dca043eec3d73774a6e69`; SA/Human approval is still required.

The Human-approved synthetic record vectors and complete 52-case T2-A manifest are now frozen as test-only artifacts. The closed inventory contains 34 unique expected public error codes; that count is separate from the 52 executable manifest cases. The vectors are derived from the existing T1 canonicalization helper only for reproducibility; they are not production authority, live status records, runtime state, publication records, migration data, or replay state, and they do not authorize T2-B. The next gate is SA re-review of this exact revision, followed by Human exact-revision approval before `status:spec-ready`.

### Revised task dependencies and rollback boundary

`T2A-01` is complete for the Documentation Agent packet and now hands the exact fixture decision to SA re-review. `T2A-02` and `T2A-03` remain implementation work after SA and Human approval; no implementation evidence is claimed here. Rollback remains documentation-only before approval; after approval, revert only T2-A runtime/schema/fixture files and rerun unchanged T1 tests. No writer, publication, ref, authority, replay store, credential, lifecycle, or T2-B boundary is introduced.
