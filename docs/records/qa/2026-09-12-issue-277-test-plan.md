# TEST_PLAN.md: Control-Plane State Integrity & Architecture Remediation

## Metadata

- Work Item ID: Issue #277
- Title: Control-Plane State Integrity & Architecture Remediation (Package 1)
- Owner: QA Lead (`qa-agent`)
- Date: 2026-09-12
- Status: Draft (Rework Round 2 — Awaiting Maintainer Approval)
- Governing SDD: `docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md` (Round 2 Rework)
- Governing Requirements: `docs/records/requirements/2026-09-12-control-plane-state-integrity-discovery.md` (AC-001..AC-008, BR-001..BR-004)

---

## Scope

### In-Scope
- State contract and two-layer schema/policy composition (`durable-task-envelope.schema.json` v2 + `bug-fix-workflow.yaml` v1).
- Dedicated envelope hashing (`digestTaskEnvelope`) with top-level `state_digest` self-exclusion and digest equality verification on load.
- Strict actor policy validation dynamically evaluated against workflow policies.
- True atomic CAS concurrency enforcement under nonce-based per-shard mutual exclusion file locking (`{pid, nonce, created_at}`).
- Concurrency race condition prevention: verifying two parallel processes attempting concurrent transitions on the same digest result in zero lost updates (exactly 1 success, 1 `CAS_CONFLICT`).
- ABA lock protection and compare-before-delete stale lock recovery.
- POSIX crash-durable atomic writing (`atomicWriteFileSync`) with write loops, temp cleanup on failure, and parent directory fsync.
- Status projection compilation fail-closed behavior using shared validation seam.
- Transactional archival with explicit `updateProjectStatusFile()` call, exception compensation rollback, and post-crash deterministic reconciliation.
- Independent QA verification across all 8 Acceptance Criteria.

### Out-of-Scope
- Cryptographic agent identity verification (process signing).
- Unbacked numeric latency/conflict NFR benchmarks.
- External database integrations.

---

## Test Types In Scope

- [ ] Unit (State machine transitions, actor guards, digest hasher, atomic file writers)
- [ ] Concurrency & Contention (Two-process lost-update race, ABA lock ownership, stale lock recovery)
- [ ] Fault Injection & Crash Boundaries (Temp cleanup on write failure, archival compensation on projection throw, post-crash reconciliation)
- [ ] API / CLI (Task machine CLI interface, mandatory CAS flags across transition and resume, inspect commands)
- [ ] Integration (Dynamic workflow policy composition, status projection compilation, archival lifecycle)
- [ ] Regression (Full test suite across repository)
- [ ] Contract Validation (JSON Schema Draft 2020-12 and policy YAML composition)
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
- [ ] Human Maintainer Approval of Round 2 Blueprint.

---

## Exit Criteria

- [ ] 100% of Acceptance Criteria (AC-001 through AC-008) verified by passing automated test cases (TC-001..TC-018) with targeted mutation checks.
- [ ] All deterministic functional invariants verified (zero lost updates, crash durability, temp file zero-leak, lock zero-leak, zero ghost active entries).
- [ ] Full regression test suite passing green without test weakening.
- [ ] All repository quality gates pass (`validate:contracts`, `validate:ci-parity`, `validate:project-state`, `validate:review-gate`, `validate:status-projection`).
- [ ] Active legacy shards (`issue-249`, `issue-275`) successfully reconciled, transitioned, and archived without ghost records.

---

## Detailed Executable Test Case Definitions (TC-001 to TC-018)

### TC-001: Canonical Envelope v2 & Self-Exclusion Digest Calculation
- **Precondition:** Isolated mock directory with a newly initialized task envelope.
- **Input:** Envelope object containing `task_id: "task-001"`, `workflow_id: "bug-fix"`, `envelope_version: 2`, `workflow_contract_version: 1`.
- **Action:** Compute `digest = digestTaskEnvelope(envelope)`. Assign `envelope.state_digest = digest`. Validate via `validateEnvelopeSchema(envelope)`.
- **Assertion:** `validateEnvelopeSchema` returns valid; mutating any property without updating `state_digest` causes validation to throw `DIGEST_INTEGRITY_MISMATCH`. Modifying original envelope does not alter digest output.
- **Cleanup:** Unlink temp directory.

### TC-002: Stored Digest Tampering Detection
- **Precondition:** Valid envelope on disk.
- **Injected Fault:** Manually edit `state` from `intake` to `implementing` directly in file without recomputing `state_digest`.
- **Action:** Execute `loadTaskState()` or `validateEnvelopeSchema()`.
- **Assertion:** Aborts fail-closed throwing `DIGEST_INTEGRITY_MISMATCH` with diagnostic details showing stored vs recomputed digest.

### TC-003: Legacy v1 Shard Rejection
- **Precondition:** Task shard declaring legacy `contract_version: 1` and restricted 7-state model.
- **Action:** Pass to `validateEnvelopeSchema()` and `scripts/validate-contracts.mjs`.
- **Assertion:** Rejection with diagnostic error requiring migration to v2 envelope.

### TC-004: Migration Backfill Functionality & Idempotency
- **Precondition:** Shard with legacy v1 format.
- **Action:** Run `backfillTaskStateV2(shardFile)`. Verify output. Run backfill a second time on the already migrated shard.
- **Assertion:** First run upgrades to v2 with valid `digestTaskEnvelope` and sequence number. Second run is a no-op returning identical digest (idempotent). Running with `--rollback` restores v1.

### TC-005: Unauthorized Actor Policy Rejection
- **Precondition:** Task in `verifying` where policy specifies `actors: ['qa-agent']`.
- **Action:** `transitionTaskState` invoked with `actor: 'developer-agent'` and valid evidence.
- **Assertion:** Throws `UNAUTHORIZED_ACTOR`, status `REJECTED`; disk state is 0% modified.

### TC-006: Actor String Normalization & Unregistered Role Handling
- **Precondition:** Task in `intake` where policy specifies `actors: ['orchestrator', 'ba-agent']`.
- **Action:** Attempt transition with `actor: 'BA Agent'` (mixed case with space), and subsequently with `actor: 'rogue-bot'` (unregistered).
- **Assertion:** `'BA Agent'` is normalized to `'ba-agent'` and succeeds. `'rogue-bot'` is rejected with `UNAUTHORIZED_ACTOR`.

### TC-007: Dynamic Policy-Driven Transition Execution
- **Precondition:** Valid task in `investigating` under `bug-fix-workflow.yaml`.
- **Action:** Attempt transition to `implementing` without `fail_path`. Then attempt with all required evidence.
- **Assertion:** First attempt throws `MISSING_REQUIRED_EVIDENCE` naming missing key. Second attempt succeeds, increments `sequence_number`, appends history, and computes new `digestTaskEnvelope`.

### TC-008: Immutable History Trail Verification
- **Precondition:** State machine transition executed.
- **Action:** Inspect `history` array in returned envelope.
- **Assertion:** Contains new entry with `from`, `to`, `at` (ISO 8601), `actor`, and `evidence_refs`. Previous history entries remain strictly unmodified.

### TC-009: Mandatory `expected_digest` on Transition
- **Precondition:** Task in `intake`.
- **Action:** Call `transitionTaskState` omitting `expected_digest` or passing `""`.
- **Assertion:** Throws `MISSING_EXPECTED_DIGEST`, status `REJECTED`; state file untouched.

### TC-010: Mandatory `expected_digest` on Resume
- **Precondition:** Task in `blocked`.
- **Action:** Call `resumeTaskState` or CLI `resume` omitting `expected_digest`.
- **Assertion:** Throws `MISSING_EXPECTED_DIGEST`, status `REJECTED`; state file untouched.

### TC-011: CAS Conflict Detection on Stale Mutation
- **Precondition:** Task state with digest `D1`.
- **Action:** Attempt transition providing stale `expected_digest: D0`.
- **Assertion:** Throws `CAS_CONFLICT`, returning both `current_digest` and `expected_digest`; disk file untouched.

### TC-012: True Two-Process Concurrency & Lost-Update Prevention
- **Precondition:** Single shard on disk with digest `D1`.
- **Action:** Launch two concurrent child processes attempting transition to distinct valid states using identical `expected_digest: D1`.
- **Assertion:** Exactly one child process exits 0 (success); the other exits 1 with `CAS_CONFLICT`. Shard contains valid state from the winning process; zero lost updates.

### TC-013: Nonce-Based Lock Ownership & Stale Recovery
- **Precondition:** Shard with existing `.lock`.
- **Action:**
  - Case A (ABA Prevention): Process A holds lock with Nonce A. Process B attempts to release with Nonce B. Assertion: Release ignored; lock remains.
  - Case B (Stale Dead PID): Lockfile > 30s old with non-existent PID. Process C attempts acquisition. Assertion: Lock cleared via compare-before-delete and reacquired.

### TC-014: Fail-Closed Projection on Corrupt Shard JSON
- **Precondition:** Work item directory contains unparseable `task-state.json` (syntax error).
- **Action:** Execute `compileStatusProjection()`.
- **Assertion:** Throws `MALFORMED_SHARD` and CLI exits 1; projection file not updated.

### TC-015: Fail-Closed Projection on Digest Mismatch
- **Precondition:** Work item shard has schema-valid JSON but `state_digest` does not match `digestTaskEnvelope()`.
- **Action:** Execute `compileStatusProjection()`.
- **Assertion:** Throws `MALFORMED_SHARD` (digest mismatch) and exits 1.

### TC-016: POSIX Atomic Durability & Temp Cleanup on Write Failure
- **Precondition:** Write target in temporary directory.
- **Injected Fault:** Mock `fs.writeSync` to throw error mid-write or fail `fsyncSync`.
- **Action:** Call `atomicWriteFileSync()`.
- **Assertion:** Error is propagated; temporary file `.tmp-*` is immediately unlinked in catch block (zero temp file leakage); target file remains untouched. Parent directory fsync executed on success.

### TC-017: Archival Flow Explicit Writer Wiring
- **Precondition:** Terminal task (`completed`) in active `work-items/`.
- **Action:** Execute `archiveWorkItem('task-terminal')`.
- **Assertion:** Shard directory moved to `archive/`; `updateProjectStatusFile()` executed; `PROJECT_STATUS.md` updated without active entry.

### TC-018: Archival Exception Compensation & Crash Recovery
- **Precondition:** Terminal task in active `work-items/`.
- **Injected Fault:** Mock `updateProjectStatusFile()` to throw an exception during archival.
- **Action:** Execute `archiveWorkItem('task-terminal')`.
- **Assertion:** Exception caught; compensating rollback restores shard directory to `work-items/task-terminal`; throws `ARCHIVE_RECONCILIATION_FAILED`.
- **Crash Recovery Check:** Simulate post-rename crash (shard in `archive/`, status un-updated). Run `archiveWorkItem --reconcile-all`. Assertion: Status projection updated to match filesystem reality.

---

## Quality Gate & Governance Invariants

1. **Review Gate Verification (QG-001)**: Every commit modifying or adding `.mjs`/`.js` files must include a matching QA code review record under `docs/records/qa/` to satisfy `npm run validate:review-gate`.
2. **CI Parity**: Exact 1:1 validation mirroring between `.github/workflows/validate-contracts.yml` and `.gitlab-ci.yml`.
3. **Full Regression Zero-Breakage**: All existing tests must pass 100% green without modification to unrelated test files.
