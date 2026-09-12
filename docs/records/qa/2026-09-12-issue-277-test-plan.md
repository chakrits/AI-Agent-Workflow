# TEST_PLAN.md: Control-Plane State Integrity & Architecture Remediation

## Metadata

- Work Item ID: Issue #277
- Title: Control-Plane State Integrity & Architecture Remediation (Package 1)
- Owner: QA Lead (`qa-agent`)
- Date: 2026-09-12
- Status: Approved
- Governing SDD: `docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md`
- Governing Requirements: `docs/records/requirements/2026-09-12-control-plane-state-integrity-discovery.md` (AC-001..AC-008, BR-001..BR-004)

---

## Scope

### In-Scope
- State contract and schema reconciliation: validation of active shards against canonical `durable-task-envelope.schema.json` (v2, 11-state model) and deprecation of legacy `task-state.schema.json`.
- Strict actor authorization enforcement in `scripts/lib/task-state-machine.mjs` against `TRANSITION_MATRIX[fromState].actors` with role canonicalization.
- Mandatory cryptographic CAS concurrency enforcement: requiring non-empty `expected_digest` and rejecting mismatches with `CAS_CONFLICT`.
- Hardened status projection compilation: fail-closed shard discovery with `MALFORMED_SHARD` and POSIX atomic markdown writing via `atomicWriteTextSync`.
- Archival lifecycle reconciliation: automated projection updates upon archiving terminal shards.
- Verification of 4 NFR targets (latency, compilation speed, atomic durability, merge conflict rate).

### Out-of-Scope
- Production business code outside of control-plane scripts and schemas.
- Core Bootloader Tier 1 context token budget limits (remains <= 3,500 tokens).
- External database integrations.

---

## Test Types In Scope

- [x] Unit (State machine transitions, actor guards, CAS engine, atomic file writers)
- [x] API / CLI (Task machine CLI interface, error codes, inspect commands)
- [x] Integration (Status projection compilation, archival workflow reconciliation)
- [x] Regression (Full test suite 764+ tests)
- [x] Performance / NFR (Latency benchmark < 5ms, projection compile < 100ms)
- [x] Contract Validation (JSON Schema 2020-12 validation against durable envelope v2)
- [x] Review Gate Governance (AC-010 review record verification)

---

## Environment

- Target environment: Local development & CI runners (Node.js >= 22, ESM).
- Test data source: Isolated mock workspaces in `os.tmpdir()` and repository shards in `docs/records/work-items/`.
- Tools: `node:test`, `node:assert/strict`, `scripts/validate-contracts.mjs`, `scripts/validate-review-gate.mjs`.

---

## Entry Criteria

- [x] Approved Requirement Discovery (`docs/records/requirements/2026-09-12-control-plane-state-integrity-discovery.md`).
- [x] Approved System Design Document (`docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md`).
- [x] Approved Implementation Plan (`docs/records/implementation-plan/2026-09-12-control-plane-state-integrity-plan.md`).

---

## Exit Criteria

- [x] 100% of Acceptance Criteria (AC-001 through AC-008) verified by passing test cases (TC-001..TC-016).
- [x] All 4 NFR targets met and measured.
- [x] Full regression test suite passing green (764/764+ tests).
- [x] All repository quality gates pass (`validate:contracts`, `validate:ci-parity`, `validate:project-state`, `validate:review-gate`, `validate:status-projection`).
- [x] Zero Git merge conflicts and 0.0% mid-write corruption confirmed.

---

## NFR Targets Under Test

| Target | SDD Reference | Validation Method |
|---|---|---|
| **NFR-01** (State transition latency < 5ms) | SDD §10 | Benchmark timer in `test/task-state-machine.test.mjs` |
| **NFR-02** (Projection compilation for 50 shards < 100ms) | SDD §10 | Benchmark harness in `test/compile-status-projection.test.mjs` |
| **NFR-03** (Atomic write corruption rate = 0.0%) | SDD §10 | Mocked write interruption and process kill simulation |
| **NFR-04** (Worktree merge conflict rate = 0.0%) | SDD §10 | Dual synthetic git worktrees merging distinct shards |

---

## Acceptance Traceability Matrix (AC-001 to AC-008 -> TC-001 to TC-016)

| AC ID | Focus Area | Test Case ID | Test Type | Expected Outcome | Owner |
|---|---|---|---|---|---|
| **AC-001** | Canonical Envelope v2 Validation | `TC-001` | Positive / Schema | Active work-item shards validate cleanly against `durable-task-envelope.schema.json` with `contract_version: 2`. | `qa-agent` |
| **AC-001** | Integer Sequence & Digest Invariant | `TC-002` | Contract Invariant | Shard fails schema if `sequence_number < 1` or `state_digest` is not 64-character hex. | `qa-agent` |
| **AC-002** | Legacy v1 Shard Rejection | `TC-003` | Negative / Fail-Closed | Shard with `contract_version: 1` or 7-state model is rejected with diagnostic migration error. | `qa-agent` |
| **AC-002** | Backfill Migration Functionality | `TC-004` | Integration / Migration | `backfill-task-state-v2.mjs` converts legacy shards to valid v2 envelopes with computed digests. | `developer-agent` |
| **AC-003** | Unauthorized Actor Rejection | `TC-005` | Negative / Security | Attempted transition by actor not in `matrixEntry.actors` throws `UNAUTHORIZED_ACTOR`; state file untouched. | `qa-agent` |
| **AC-003** | Actor String Sanitization | `TC-006` | Boundary / Normalization | Case-insensitive and spaced actor strings normalise to kebab-case; unregistered roles fail closed. | `developer-agent` |
| **AC-004** | Permitted Actor Transition Execution | `TC-007` | Positive / Transition | Authorized actor executes valid transition; sequence number increments, new SHA-256 digest computed. | `developer-agent` |
| **AC-004** | Immutable History Trail | `TC-008` | Audit Trail | Transition appends history entry recording from, to, at, actor, and evidence references. | `qa-agent` |
| **AC-005** | Mandatory `expected_digest` Requirement | `TC-009` | Negative / Fail-Closed | Missing or empty `expected_digest` aborts immediately with `MISSING_EXPECTED_DIGEST`; state untouched. | `qa-agent` |
| **AC-005** | CLI Mandatory CAS Flag | `TC-010` | CLI Contract | CLI `transition` command exits 1 with error diagnostic if `--expected-digest` is omitted. | `qa-agent` |
| **AC-006** | CAS Conflict Detection | `TC-011` | Concurrency Conflict | Stale or mismatched `expected_digest` throws `CAS_CONFLICT`, returning both current and expected digests. | `qa-agent` |
| **AC-006** | State File Isolation on Conflict | `TC-012` | Concurrency Safety | Disk state file is 0% modified upon `CAS_CONFLICT`. | `qa-agent` |
| **AC-007** | Fail-Closed Projection on Corrupt JSON | `TC-013` | Negative / Fail-Closed CI | Malformed JSON shard causes `compileStatusProjection` to abort with `MALFORMED_SHARD` exit 1. | `qa-agent` |
| **AC-007** | Fail-Closed Projection on Invalid Schema | `TC-014` | Negative / Schema | Shard violating v2 schema aborts projection compilation immediately with `MALFORMED_SHARD`. | `qa-agent` |
| **AC-008** | POSIX Atomic Durability | `TC-015` | Reliability / Durability | `updateProjectStatusFile` utilizes `.tmp` + `fsyncSync` + `renameSync`, zero mid-write corruption. | `qa-agent` |
| **AC-008** | Archival Lifecycle Reconciliation | `TC-016` | Lifecycle Integration | Archiving terminal shard automatically updates `PROJECT_STATUS.md`, excluding archived issue. | `developer-agent` |

---

## Verification Matrix Aligned with Implementation Packages

| Package | Covered ACs | Covered Test Cases | Primary Verification Command |
|---|---|---|---|
| **IMP-001** (Schema & State Model) | AC-001, AC-002 | TC-001, TC-002, TC-003, TC-004 | `node --test test/contracts.test.mjs` |
| **IMP-002** (Actor Authorization Guard) | AC-003, AC-004 | TC-005, TC-006, TC-007, TC-008 | `node --test test/task-state-machine.test.mjs` |
| **IMP-003** (Mandatory Cryptographic CAS) | AC-005, AC-006 | TC-009, TC-010, TC-011, TC-012 | `node --test test/task-state-machine.test.mjs` |
| **IMP-004** (Projection & Archival) | AC-007, AC-008 | TC-013, TC-014, TC-015, TC-016 | `node --test test/compile-status-projection.test.mjs`<br>`node --test test/archive-work-item.test.mjs` |

---

## Quality Gate & Governance Invariants

1. **Review Gate Verification (AC-010)**: Every commit modifying or adding `.mjs`/`.js` files must include a matching QA code review record under `docs/records/qa/` to satisfy `npm run validate:review-gate`.
2. **CI Parity**: Exact 1:1 validation mirroring between `.github/workflows/validate-contracts.yml` and `.gitlab-ci.yml`.
3. **Full Regression Zero-Breakage**: All 764+ existing tests must pass 100% green without modification to unrelated test files.
