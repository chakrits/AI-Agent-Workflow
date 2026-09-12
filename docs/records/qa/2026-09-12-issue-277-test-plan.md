# TEST_PLAN.md: Control-Plane State Integrity & Architecture Remediation

## Metadata

- Work Item ID: Issue #277
- Title: Control-Plane State Integrity & Architecture Remediation (Package 1)
- Owner: QA Lead (`qa-agent`)
- Date: 2026-09-12
- Status: Draft (Awaiting Maintainer Approval)
- Governing SDD: `docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md`
- Governing Requirements: `docs/records/requirements/2026-09-12-control-plane-state-integrity-discovery.md` (AC-001..AC-008, BR-001..BR-004)

---

## Scope

### In-Scope
- State contract and schema reconciliation: validation of active shards against canonical `durable-task-envelope.schema.json` (v2, 11-state model) and deprecation of legacy `task-state.schema.json`.
- Strict actor policy validation in `scripts/lib/task-state-machine.mjs` against `TRANSITION_MATRIX[fromState].actors` with role canonicalization against `ROLE_REGISTRY`.
- True atomic CAS concurrency enforcement: per-shard mutual exclusion locking (`.lock` via `wx`), disk re-read under lock, and mandatory `--expected-digest` rejecting mismatches with `CAS_CONFLICT`.
- Concurrency race condition prevention: verifying that two competing processes attempting concurrent transitions on the same digest result in zero lost updates (exactly 1 success, 1 `CAS_CONFLICT`).
- Hardened status projection compilation: fail-closed shard discovery with `MALFORMED_SHARD` using shared validation seam (`validateEnvelopeSchema`) and POSIX atomic writing via `atomicWriteFileSync` with `fsync` and directory sync.
- Archival lifecycle reconciliation: two-phase transactional archival in `scripts/archive-work-item.mjs` with compensating rollback if status projection compilation fails.
- Verification of deterministic functional invariants (zero lost updates, crash resilience, lock zero-leak, zero ghost entries).

### Out-of-Scope
- Production business code outside of control-plane scripts and schemas.
- Core Bootloader Tier 1 context token budget limits (remains <= 3,500 tokens).
- External database integrations or network consensus protocols.

---

## Test Types In Scope

- [ ] Unit (State machine transitions, actor guards, CAS engine, atomic file writers)
- [ ] Concurrency & Fault Injection (Two-process lost-update race, archival compensation rollback, stale lock recovery)
- [ ] API / CLI (Task machine CLI interface, mandatory CAS flags, inspect commands)
- [ ] Integration (Status projection compilation, archival workflow reconciliation)
- [ ] Regression (Full test suite across repository)
- [ ] Contract Validation (JSON Schema 2020-12 validation against durable envelope v2)
- [ ] Review Gate Governance (QG-001 review record verification)

---

## Environment

- Target environment: Local development & CI runners (Node.js >= 22, ESM).
- Test data source: Isolated mock workspaces in `os.tmpdir()` and repository shards in `docs/records/work-items/`.
- Tools: `node:test`, `node:assert/strict`, `scripts/validate-contracts.mjs`, `scripts/validate-review-gate.mjs`.

---

## Entry Criteria

- [x] Approved Requirement Discovery (`docs/records/requirements/2026-09-12-control-plane-state-integrity-discovery.md`).
- [x] Approved System Design Document (`docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md`).
- [x] Approved Security Review (`docs/records/security-review/2026-09-12-issue-277-security-review.md`).
- [x] Approved Implementation Plan (`docs/records/implementation-plan/2026-09-12-control-plane-state-integrity-plan.md`).
- [ ] Human Maintainer Approval of Package 1 Blueprint.

---

## Exit Criteria

- [ ] 100% of Acceptance Criteria (AC-001 through AC-008) verified by passing test cases (TC-001..TC-018).
- [ ] All deterministic functional invariants verified (zero lost updates, crash durability, lock zero-leak).
- [ ] Full regression test suite passing green.
- [ ] All repository quality gates pass (`validate:contracts`, `validate:ci-parity`, `validate:project-state`, `validate:review-gate`, `validate:status-projection`).
- [ ] Active legacy shards (`issue-249`, `issue-275`) successfully reconciled, transitioned, and archived without ghost records.

---

## Deterministic Functional Invariants Under Test

| Invariant | SDD Reference | Validation Method |
|---|---|---|
| **INV-01 (Zero Lost Updates)** | SDD §388, ADR-0027 | Concurrency test with two parallel processes attempting transition on identical digest |
| **INV-02 (Crash Resilience)** | SDD §232, ADR-0029 | Simulated write interruption; target file verified to contain 100% old or 100% new content |
| **INV-03 (Lock Zero-Leak)** | SDD §391, ADR-0027 | Assert `.lock` file unlinked across both success and failure/exception paths |
| **INV-04 (Archival Compensation)** | SDD §241, ADR-0029 | Fault-injection: mock compilation failure during archival; assert shard restored to original path |

---

## Acceptance Traceability Matrix (AC-001 to AC-008 -> TC-001 to TC-018)

| AC ID | Focus Area | Test Case ID | Test Type | Expected Outcome | Owner |
|---|---|---|---|---|---|
| **AC-001** | Canonical Envelope v2 Validation | `TC-001` | Positive / Schema | Active work-item shards validate cleanly against `durable-task-envelope.schema.json` with `contract_version: 2`. | `qa-agent` |
| **AC-001** | Integer Sequence & Digest Invariant | `TC-002` | Contract Invariant | Shard fails schema if `sequence_number < 1` or `state_digest` is not 64-character hex. | `qa-agent` |
| **AC-002** | Legacy v1 Shard Rejection | `TC-003` | Negative / Fail-Closed | Shard with `contract_version: 1` or 7-state model is rejected with diagnostic migration error. | `qa-agent` |
| **AC-002** | Backfill Migration Functionality | `TC-004` | Integration / Migration | `backfill-task-state-v2.mjs` converts legacy shards to valid v2 envelopes with computed digests. | `developer-agent` |
| **AC-003** | Unauthorized Actor Rejection | `TC-005` | Negative / Security | Attempted transition by actor not in `matrixEntry.actors` throws `UNAUTHORIZED_ACTOR`; state file untouched. | `qa-agent` |
| **AC-003** | Actor String Normalization | `TC-006` | Boundary / Normalization | Case-insensitive and spaced actor strings normalise to kebab-case; unregistered roles fail closed. | `developer-agent` |
| **AC-004** | Permitted Actor Transition Execution | `TC-007` | Positive / Transition | Authorized actor executes valid transition; sequence number increments, new SHA-256 digest computed. | `developer-agent` |
| **AC-004** | Immutable History Trail | `TC-008` | Audit Trail | Transition appends history entry recording from, to, at, actor, and evidence references. | `qa-agent` |
| **AC-005** | Mandatory `expected_digest` on Transition | `TC-009` | Negative / Fail-Closed | Missing or empty `expected_digest` on transition aborts immediately with `MISSING_EXPECTED_DIGEST`. | `qa-agent` |
| **AC-005** | Mandatory `expected_digest` on Resume | `TC-010` | Negative / Fail-Closed | Missing `expected_digest` on resume aborts with `MISSING_EXPECTED_DIGEST`; state untouched. | `qa-agent` |
| **AC-006** | CAS Conflict Detection | `TC-011` | Concurrency Conflict | Stale or mismatched `expected_digest` throws `CAS_CONFLICT`, returning both current and expected digests. | `qa-agent` |
| **AC-006** | Two-Process Lost-Update Prevention | `TC-012` | Concurrency Invariant | Two parallel processes targeting same digest: exactly 1 succeeds, 1 aborts with `CAS_CONFLICT`. | `qa-agent` |
| **AC-006** | Stale Lock Recovery | `TC-013` | Concurrency Resilience | Abandoned `.lock` older than 30s with dead PID is cleared and recovered safely. | `developer-agent` |
| **AC-007** | Fail-Closed Projection on Corrupt JSON | `TC-014` | Negative / Fail-Closed CI | Malformed JSON shard causes `compileStatusProjection` to abort with `MALFORMED_SHARD` exit 1. | `qa-agent` |
| **AC-007** | Fail-Closed Projection on Invalid Schema | `TC-015` | Negative / Schema | Shard violating v2 schema aborts projection compilation immediately with `MALFORMED_SHARD`. | `qa-agent` |
| **AC-008** | POSIX Atomic Durability & Directory Sync | `TC-016` | Reliability / Durability | `atomicWriteFileSync` utilizes `.tmp` with `wx` + `fsyncSync` + atomic `rename` + dir sync; zero byte corruption. | `qa-agent` |
| **AC-008** | Archival Lifecycle Reconciliation | `TC-017` | Lifecycle Integration | Archiving terminal shard automatically updates `PROJECT_STATUS.md`, excluding archived issue. | `developer-agent` |
| **AC-008** | Archival Compensating Rollback | `TC-018` | Fault-Injection / Compensation | If projection fails during archival, shard directory is restored to original path. | `qa-agent` |

---

## Verification Matrix Aligned with Implementation Packages

| Package | Covered ACs | Covered Test Cases | Primary Verification Command |
|---|---|---|---|
| **IMP-001** (Schema & State Model) | AC-001, AC-002 | TC-001, TC-002, TC-003, TC-004 | `node --test test/contracts.test.mjs` |
| **IMP-002** (Actor Authorization Guard & Locking) | AC-003, AC-004 | TC-005, TC-006, TC-007, TC-008, TC-013 | `node --test test/task-state-machine.test.mjs` |
| **IMP-003** (Mandatory Cryptographic CAS & Concurrency) | AC-005, AC-006 | TC-009, TC-010, TC-011, TC-012 | `node --test test/task-state-machine.test.mjs` |
| **IMP-004** (Projection, Durability & Transactional Archival) | AC-007, AC-008 | TC-014, TC-015, TC-016, TC-017, TC-018 | `node --test test/compile-status-projection.test.mjs`<br>`node --test test/archive-work-item.test.mjs` |

---

## Quality Gate & Governance Invariants

1. **Review Gate Verification (QG-001)**: Every commit modifying or adding `.mjs`/`.js` files must include a matching QA code review record under `docs/records/qa/` to satisfy `npm run validate:review-gate`.
2. **CI Parity**: Exact 1:1 validation mirroring between `.github/workflows/validate-contracts.yml` and `.gitlab-ci.yml`.
3. **Full Regression Zero-Breakage**: All existing tests must pass 100% green without modification to unrelated test files.
