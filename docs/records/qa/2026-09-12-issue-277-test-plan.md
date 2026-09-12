# TEST_PLAN.md: Control-Plane State Integrity & Architecture Remediation

## Metadata

- Work Item ID: Issue #277
- Title: Control-Plane State Integrity & Architecture Remediation (Package 1)
- Owner: QA Lead (`qa-agent`)
- Date: 2026-09-12
- Status: Draft (Rework Round 3 — Awaiting Maintainer Approval)
- Governing SDD: `docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md` (Round 3 Rework)
- Governing Requirements: `docs/records/requirements/2026-09-12-control-plane-state-integrity-discovery.md` (AC-001..AC-008, BR-001..BR-004)

---

## Scope

### In-Scope
- State contract authority under `durable-task-envelope.schema.json` (v2, 11-state model) and deprecation of legacy `task-state.schema.json`.
- Dedicated envelope hashing (`digestTaskEnvelope`) with top-level `state_digest` self-exclusion and digest equality verification on load.
- Strict actor policy validation against `TRANSITION_MATRIX.actors`.
- True atomic CAS concurrency enforcement under nonce-based per-shard mutual exclusion file locking (`{pid, nonce, created_at}`).
- Concurrency race condition prevention: verifying two parallel processes attempting concurrent transitions on the same digest result in zero lost updates (exactly 1 success, 1 `CAS_CONFLICT`).
- Atomic stale-lock takeover via `renameSync` to eliminate TOCTOU/ABA lock races.
- POSIX crash-durable atomic writing (`atomicWriteFileSync`) with write loops, temp cleanup on failure, and parent directory fsync.
- Status projection compilation fail-closed behavior using shared validation seam.
- Transactional archival with explicit `updateProjectStatusFile()` call, exception compensation rollback, and mandatory preflight drift reconciliation.
- Independent QA verification across all 8 Acceptance Criteria.

### Out-of-Scope
- Cryptographic agent identity verification (process signing).
- Unbacked numeric latency/conflict NFR benchmarks.
- External database integrations.

---

## Test Types In Scope

- [ ] Unit (State machine transitions, actor guards, digest hasher, atomic file writers)
- [ ] Concurrency & Contention (Two-process lost-update race, atomic rename stale takeover, barrier synchronization)
- [ ] Fault Injection & Crash Boundaries (Temp cleanup on write failure, archival compensation on projection throw, post-crash reconciliation)
- [ ] API / CLI (Task machine CLI interface, mandatory CAS flags across transition and resume, inspect commands)
- [ ] Integration (Status projection compilation, archival lifecycle, preflight drift repair)
- [ ] Regression (Full test suite across repository)
- [ ] Contract Validation (JSON Schema Draft 2020-12 validation against durable envelope v2)
- [ ] Review Gate Governance (QG-001 review record verification)

---

## Environment

- Target environment: Local development & CI runners (Node.js >= 22, ESM).
- Test data source: Isolated mock workspaces in `os.tmpdir()` and repository shards in `docs/records/work-items/`.
- Tools: `node:test`, `node:assert/strict`, `scripts/validate-contracts.mjs`, `scripts/validate-review-gate.mjs`.

---

## Entry Criteria

- [x] Approved Requirement Discovery (`docs/records/requirements/2026-09-12-control-plane-state-integrity-discovery.md`).
- [x] Reworked System Design Document (`docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md`).
- [x] Conditional Approval Security Review (`docs/records/security-review/2026-09-12-issue-277-security-review.md`).
- [x] Reworked Implementation Plan (`docs/records/implementation-plan/2026-09-12-control-plane-state-integrity-plan.md`).
- [ ] Human Maintainer Approval of Round 3 Blueprint.

---

## Exit Criteria

- [ ] 100% of Acceptance Criteria (AC-001 through AC-008) verified by passing automated test cases (TC-001..TC-020).
- [ ] All deterministic functional invariants verified (zero lost updates, crash durability, temp file zero-leak, lock zero-leak, zero ghost active entries).
- [ ] Mutation ledger proves all guard mutations are killed by test cases.
- [ ] Full regression test suite passing green without test weakening.
- [ ] All repository quality gates pass (`validate:contracts`, `validate:ci-parity`, `validate:project-state`, `validate:review-gate`, `validate:status-projection`).
- [ ] Active legacy shards (`issue-249`, `issue-275`) successfully reconciled, transitioned, and archived without ghost records.

---

## Detailed Executable Test Case Definitions (TC-001 to TC-020)

### TC-001: Canonical Envelope v2 & Self-Exclusion Digest Calculation
- **Priority:** P0 (Critical) | **Source:** AC-001, ADR-0028
- **Precondition:** Isolated mock directory in `os.tmpdir()` with a newly initialized task envelope.
- **Fixture:** `docs/records/work-items/test-task/task-state.json` containing valid fields (`task_id: "test-task"`, `workflow_id: "bug-fix"`, `contract_version: 2`, `sequence_number: 1`).
- **Action:** Compute `digest = digestTaskEnvelope(envelope)`. Assign `envelope.state_digest = digest`. Validate via `validateEnvelopeSchema(envelope)`.
- **Assertion:** `validateEnvelopeSchema` returns valid object. Mutating any field without updating `state_digest` causes validation to throw `DIGEST_INTEGRITY_MISMATCH`. Input envelope is not mutated by `digestTaskEnvelope()`.
- **Cleanup:** `fs.rmSync(mockDir, { recursive: true, force: true })`.

### TC-002: Stored Digest Tampering Detection
- **Priority:** P0 (Critical) | **Source:** AC-001, ADR-0028
- **Precondition:** Valid envelope on disk in mock workspace.
- **Injected Fault:** Manually modify `state` from `intake` to `implementing` directly in file without recomputing `state_digest`.
- **Action:** Execute `loadTaskState(shardPath)`.
- **Assertion:** Throws `DIGEST_INTEGRITY_MISMATCH`, status `ERROR`; error details contain both `stored_digest` and `recomputed_digest`.
- **Cleanup:** Unlink mock workspace.

### TC-003: Legacy v1 Shard Rejection
- **Priority:** P1 (High) | **Source:** AC-002, BR-001
- **Precondition:** Shard on disk declaring `contract_version: 1` and 7-state structure.
- **Action:** Pass shard to `validateEnvelopeSchema()`.
- **Assertion:** Rejection with schema error indicating `contract_version: 2` is required.
- **Cleanup:** Unlink mock workspace.

### TC-004: Migration Backfill Functionality & Idempotency
- **Priority:** P1 (High) | **Source:** AC-002, ADR-0026
- **Precondition:** Shard with legacy v1 format.
- **Action:** Run `backfillTaskStateV2(shardPath)`. Note output digest. Run backfill a second time on the same file.
- **Assertion:** First run upgrades to v2 with valid `state_digest` matching `digestTaskEnvelope(data)`. Second run is a no-op returning identical digest (idempotent). Running with `--rollback` restores v1.
- **Cleanup:** Unlink mock workspace.

### TC-005: Unauthorized Actor Policy Rejection
- **Priority:** P0 (Critical) | **Source:** AC-003, BR-002
- **Precondition:** Task in `verifying` where `TRANSITION_MATRIX.verifying.actors` is `['qa-agent']`.
- **Action:** Call `transitionTaskState(currentState, { to: 'handoff', actor: 'developer-agent', expected_digest, evidence: { test_evidence: 'pass', qa_report_ref: 'qa.md' } })`.
- **Assertion:** Throws `UNAUTHORIZED_ACTOR`, status `REJECTED`; state file is 0% modified.
- **Cleanup:** Unlink mock workspace.

### TC-006: Actor String Normalization & Unregistered Role Handling
- **Priority:** P1 (High) | **Source:** AC-003, BR-002
- **Precondition:** Task in `intake` (`actors: ['orchestrator', 'ba-agent']`).
- **Action:** Attempt transition with `actor: 'BA Agent'` (mixed case with space) to `investigating` with valid evidence. Then attempt with `actor: 'rogue-bot'` (unregistered role).
- **Assertion:** `'BA Agent'` normalizes to `'ba-agent'` and succeeds. `'rogue-bot'` throws `UNAUTHORIZED_ACTOR`.
- **Cleanup:** Unlink mock workspace.

### TC-007: Permitted Transition & Actor Matrix Execution
- **Priority:** P0 (Critical) | **Source:** AC-004, BR-002
- **Precondition:** Valid task in `investigating` under `TRANSITION_MATRIX`.
- **Action:** Attempt transition to `planning` without `root_cause_analysis`. Then attempt with `actor: 'developer-agent'` and `evidence: { root_cause_analysis: 'rca.md' }`.
- **Assertion:** First attempt throws `MISSING_REQUIRED_EVIDENCE`. Second attempt succeeds, increments `sequence_number`, appends history, and computes new `digestTaskEnvelope`.
- **Cleanup:** Unlink mock workspace.

### TC-008: Immutable History Trail Verification
- **Priority:** P1 (High) | **Source:** AC-004, ADR-0026
- **Precondition:** State machine transition executed.
- **Action:** Inspect `history` array in returned envelope.
- **Assertion:** Contains new entry with `from`, `to`, `at` (ISO 8601), `actor`, and `evidence_refs`. Existing entries are strictly unaltered.
- **Cleanup:** Unlink mock workspace.

### TC-009: Mandatory `expected_digest` on Transition
- **Priority:** P0 (Critical) | **Source:** AC-005, BR-003
- **Precondition:** Task in `intake`.
- **Action:** Call `transitionTaskState` omitting `expected_digest` or passing `""`.
- **Assertion:** Throws `MISSING_EXPECTED_DIGEST`, status `REJECTED`; state file untouched.
- **Cleanup:** Unlink mock workspace.

### TC-010: Mandatory `expected_digest` on Resume
- **Priority:** P0 (Critical) | **Source:** AC-005, BR-003
- **Precondition:** Task in `blocked`.
- **Action:** Call `resumeTaskState` omitting `expected_digest`.
- **Assertion:** Throws `MISSING_EXPECTED_DIGEST`, status `REJECTED`; state file untouched.
- **Cleanup:** Unlink mock workspace.

### TC-011: CAS Conflict Detection on Stale Mutation
- **Priority:** P0 (Critical) | **Source:** AC-006, BR-003
- **Precondition:** Task state with digest `D1`.
- **Action:** Attempt transition providing stale `expected_digest: D0`.
- **Assertion:** Throws `CAS_CONFLICT`, returning both `current_digest` and `expected_digest`; disk file untouched.
- **Cleanup:** Unlink mock workspace.

### TC-012: True Two-Process Concurrency & Lost-Update Prevention
- **Priority:** P0 (Critical) | **Source:** AC-006, ADR-0027
- **Precondition:** Shard on disk with digest `D1` in `intake`.
- **Action:** Launch two concurrent child processes attempting transition to `investigating` and `designing` respectively, using identical `expected_digest: D1`.
- **Assertion:** Exactly one child process exits 0; the other exits 1 with `CAS_CONFLICT`. Shard contains state of winning process; sequence number is exactly 2; zero lost updates.
- **Cleanup:** Unlink mock workspace.

### TC-013: Nonce Lock Ownership Release Safety
- **Priority:** P1 (High) | **Source:** ADR-0027
- **Precondition:** Shard with `.lock` holding `nonce: "nonce-A"`.
- **Action:** Process B attempts `releaseShardLock(shardDir, "nonce-B")`.
- **Assertion:** Lock is NOT deleted; file remains on disk holding `nonce: "nonce-A"`.
- **Cleanup:** Unlink mock workspace.

### TC-014: Atomic Stale-Lock Takeover via Rename
- **Priority:** P0 (Critical) | **Source:** ADR-0027
- **Precondition:** Shard with abandoned `.lock` (> 30s old, dead PID).
- **Action:** Process A and Process B simultaneously attempt takeover. Process A executes `fs.renameSync(lockPath, reclaimPathA)`. Process B attempts `fs.renameSync(lockPath, reclaimPathB)`.
- **Assertion:** Exactly one reclaimer succeeds in rename and unlinks its reclaim file; the other gets `ENOENT` and retries lock acquisition. Zero ABA deletions of active replacement locks.
- **Cleanup:** Unlink mock workspace.

### TC-015: Fail-Closed Projection on Corrupt Shard JSON
- **Priority:** P0 (Critical) | **Source:** AC-007, BR-004
- **Precondition:** Work item directory contains unparseable `task-state.json`.
- **Action:** Execute `compileStatusProjection()`.
- **Assertion:** Throws `MALFORMED_SHARD` and exits 1; projection file not updated.
- **Cleanup:** Unlink mock workspace.

### TC-016: Fail-Closed Projection on Digest Mismatch
- **Priority:** P0 (Critical) | **Source:** AC-007, BR-004
- **Precondition:** Shard has valid JSON schema but `state_digest` differs from `digestTaskEnvelope(data)`.
- **Action:** Execute `compileStatusProjection()`.
- **Assertion:** Throws `MALFORMED_SHARD` (digest mismatch) and exits 1.
- **Cleanup:** Unlink mock workspace.

### TC-017: POSIX Atomic Durability & Temp Cleanup on Write Failure
- **Priority:** P0 (Critical) | **Source:** AC-008, BR-004
- **Precondition:** Temporary target directory.
- **Injected Fault:** Mock `fs.writeSync` to throw mid-write error.
- **Action:** Call `atomicWriteFileSync()`.
- **Assertion:** Error is propagated; temporary file `.tmp-*` is immediately unlinked in catch block (zero temp file leakage); target file untouched.
- **Cleanup:** Unlink mock workspace.

### TC-018: Archival Flow Explicit Writer Wiring
- **Priority:** P1 (High) | **Source:** AC-008, ADR-0029
- **Precondition:** Terminal task (`completed`) in active `work-items/`.
- **Action:** Execute `archiveWorkItem('task-terminal')`.
- **Assertion:** Shard directory moved to `archive/`; `updateProjectStatusFile()` executed; `PROJECT_STATUS.md` updated excluding archived issue.
- **Cleanup:** Unlink mock workspace.

### TC-019: Archival Exception Compensation
- **Priority:** P0 (Critical) | **Source:** AC-008, ADR-0029
- **Precondition:** Terminal task in active `work-items/`.
- **Injected Fault:** Mock `updateProjectStatusFile()` to throw exception during archival.
- **Action:** Execute `archiveWorkItem('task-terminal')`.
- **Assertion:** Exception caught; compensating rollback restores shard directory to `work-items/task-terminal`; throws `ARCHIVE_RECONCILIATION_FAILED`.
- **Cleanup:** Unlink mock workspace.

### TC-020: Post-Crash Preflight Archival Drift Reconciliation
- **Priority:** P0 (Critical) | **Source:** AC-008, ADR-0029
- **Precondition:** Shard exists in `archive/` but is still listed in `PROJECT_STATUS.md` (simulating SIGKILL immediately after directory rename).
- **Action:** Execute `compileStatusProjection()` or `archiveWorkItem()` with preflight reconciliation enabled.
- **Assertion:** Preflight detects drift, reconciles `PROJECT_STATUS.md` atomically, and operation proceeds cleanly without ghost records.
- **Cleanup:** Unlink mock workspace.

---

## Mutation Ledger (Guard Mutation vs Killing Test Case)

| Guard Under Test | Deliberate Code Mutation | Expected Killing Test Case |
|---|---|---|
| Self-Exclusion Digest | Remove `delete normalized.state_digest` in `digestTaskEnvelope` | `TC-001` (digest mismatch on non-empty state_digest) |
| Digest Equality Check | Remove `data.state_digest === expected` in `validateEnvelopeSchema` | `TC-002`, `TC-016` (tampered state fails to throw) |
| Actor Authorization | Remove `matrixEntry.actors.includes(canonicalActor)` in `transitionTaskState` | `TC-005` (unauthorized transition passes) |
| Mandatory CAS | Make `expected_digest` optional (`if (expected_digest) ...`) | `TC-009`, `TC-010` (transition without digest passes) |
| CAS Conflict | Invert `expected !== current` to `expected === current` | `TC-011` (valid transition rejected, stale transition passes) |
| Nonce Lock Release | Change `parsed.nonce === nonce` to `true` (unconditional unlink) | `TC-013` (unrelated lock deleted by wrong reclaimer) |
| Atomic Stale Takeover | Replace `renameSync` with direct `unlinkSync` | `TC-014` (concurrent reclaimers delete active lock) |
| Writer Temp Cleanup | Remove `unlinkSync(tmpPath)` in `catch` block of `atomicWriteFileSync` | `TC-017` (surviving `.tmp-*` file detected after write failure) |
| Archival Compensation | Remove compensation `renameSync` in catch block of `archiveWorkItem` | `TC-019` (shard left in `archive/` after projection throw) |
| Preflight Drift Repair | Disable preflight `reconcileArchivedShards()` in compiler | `TC-020` (ghost entry survives in `PROJECT_STATUS.md`) |

---

## Quality Gate & Governance Invariants

1. **Review Gate Verification (QG-001)**: Every commit modifying or adding `.mjs`/`.js` files must include a matching QA code review record under `docs/records/qa/` to satisfy `npm run validate:review-gate`.
2. **CI Parity**: Exact 1:1 validation mirroring between `.github/workflows/validate-contracts.yml` and `.gitlab-ci.yml`.
3. **Full Regression Zero-Breakage**: All existing tests must pass 100% green without modification to unrelated test files.
