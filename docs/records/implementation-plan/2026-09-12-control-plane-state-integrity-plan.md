# Implementation Plan: Control-Plane State Integrity & Architecture Remediation

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | Issue #277 — Control-Plane State Integrity & Architecture Remediation (Package 1) |
| Change Type | Framework / Meta Architecture Remediation (`framework-meta`) |
| Risk Level | High |
| Owner | Developer Agent (`implementation-planning`) |
| Target Branch / Ticket | `feat/control-plane-state-integrity` / Issue #277 |

---

## 2. Inputs Reviewed

| Artifact | Status | Notes |
|---|---|---|
| REQUIREMENT_DISCOVERY.md | Available (`docs/records/requirements/2026-09-12-control-plane-state-integrity-discovery.md`) | Authoritative BA discovery. |
| SDD.md | Available (`docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md`) | Approved SA design document (Round 3 Rework). |
| SECURITY_REVIEW.md | Available (`docs/records/security-review/2026-09-12-issue-277-security-review.md`) | Conditional Approval; threat model and atomic takeover protocol defined. |
| TEST_PLAN.md | In Progress (`docs/records/qa/2026-09-12-issue-277-test-plan.md`) | QA test plan and automation-ready test case definitions. |

---

## 3. Affected Areas

| Area | Files / Components | Expected Change |
|---|---|---|
| **Contracts & Schemas** | `docs/contracts/schemas/durable-task-envelope.schema.json`<br>`docs/contracts/schemas/task-state.schema.json` | Designate `durable-task-envelope.schema.json` as sole authority (`contract_version: 2`); deprecate `task-state.schema.json`. |
| **State Machine Engine** | `scripts/lib/task-state-machine.mjs`<br>`scripts/task-machine-cli.mjs` | Implement `digestTaskEnvelope()`; implement nonce locking with atomic rename takeover; enforce actor policy validation; mandate `--expected-digest` across transition/resume. |
| **Projection & Archival** | `scripts/compile-status-projection.mjs`<br>`scripts/archive-work-item.mjs` | Fail-closed shard discovery with digest validation; implement `atomicWriteFileSync` with temp cleanup; wire `updateProjectStatusFile` into `archiveWorkItem` with compensation and preflight reconciliation. |
| **Migrations & Operations** | `scripts/backfill-task-state-v2.mjs`<br>`docs/records/work-items/issue-249/task-state.json`<br>`docs/records/work-items/issue-275/task-state.json` | Backfill tool and operational migration of active shards with backup/rollback evidence. |
| **QA Records** | `docs/records/qa/2026-09-12-control-plane-state-integrity-code-review.md` | Mandatory QA code review record satisfying `validate:review-gate` (QG-001). |
| **Tests** | `test/task-state-machine.test.mjs`<br>`test/compile-status-projection.test.mjs`<br>`test/archive-work-item.test.mjs`<br>`test/contracts.test.mjs` | Automation-ready test suite covering concurrency, atomic takeover, temp cleanup, and archival drift. |

---

## 4. Task Breakdown (Reviewable Slices with Checkpoints)

### Phase 4A: Core State Machine & Hashing Engine

#### Task 1: Self-Excluding Hasher & Envelope Schema Validator
- **Owner**: `developer-agent`
- **Prerequisite**: None.
- **Files**: `docs/contracts/schemas/durable-task-envelope.schema.json`, `scripts/lib/task-state-machine.mjs`, `test/task-state-machine.test.mjs`.
- **TDD Failing Step**: Add failing tests in `test/task-state-machine.test.mjs` asserting `digestTaskEnvelope()` removes top-level `state_digest` and computes identical hash whether `state_digest` was present or empty; and `validateEnvelopeSchema()` throws `DIGEST_INTEGRITY_MISMATCH` when content is modified without updating digest.
- **Implementation**:
  - Update `docs/contracts/schemas/durable-task-envelope.schema.json` to const `contract_version: 2`.
  - Implement `digestTaskEnvelope(envelope)` in `scripts/lib/task-state-machine.mjs`.
  - Implement `validateEnvelopeSchema(envelope)` checking Ajv schema and `stored === digestTaskEnvelope(envelope)`.
- **Verification**: `node --test test/task-state-machine.test.mjs` passes new hashing and integrity tests.
- **Rollback**: Revert changes to `durable-task-envelope.schema.json` and `task-state-machine.mjs`.

#### Task 2: Strict Actor Policy Validation Guard
- **Owner**: `developer-agent`
- **Prerequisite**: Task 1.
- **Files**: `scripts/lib/task-state-machine.mjs`, `test/task-state-machine.test.mjs`.
- **TDD Failing Step**: Add failing tests asserting `transitionTaskState()` throws `UNAUTHORIZED_ACTOR` if actor is not in `TRANSITION_MATRIX[fromState].actors`, and normalizes `'Developer Agent'` to `'developer-agent'`.
- **Implementation**:
  - Define `actors` explicitly in `TRANSITION_MATRIX` across all 11 states.
  - In `transitionTaskState()`, canonicalize actor string and assert `matrixEntry.actors.includes(canonicalActor)`.
- **Verification**: `node --test test/task-state-machine.test.mjs` passes actor authorization tests.
- **Rollback**: Revert actor check in `task-state-machine.mjs`.

#### Task 3: Nonce Lock with Atomic Stale Takeover & Mandatory CAS
- **Owner**: `developer-agent`
- **Prerequisite**: Task 1, Task 2.
- **Files**: `scripts/lib/task-state-machine.mjs`, `scripts/task-machine-cli.mjs`, `test/task-state-machine.test.mjs`.
- **TDD Failing Step**: Add failing tests asserting:
  1. Missing `--expected-digest` throws `MISSING_EXPECTED_DIGEST` across transition and resume.
  2. Stale CAS throws `CAS_CONFLICT`.
  3. Atomic stale lock takeover uses `fs.renameSync(lockPath, reclaimPath)` to prevent ABA deletion.
  4. Concurrent child processes on same digest result in exactly 1 success and 1 `CAS_CONFLICT`.
- **Implementation**:
  - Implement `acquireShardLock` and `releaseShardLock` with `{ pid, nonce, created_at }` and atomic rename takeover.
  - Require non-empty `expected_digest` in `transitionTaskState` and `resumeTaskState`.
  - Update `scripts/task-machine-cli.mjs` to require `--expected-digest`.
- **Verification**: `node --test test/task-state-machine.test.mjs` passes concurrency and takeover tests.
- **Rollback**: Revert lock and CAS changes.

> **🛑 Checkpoint 1:** Core engine and concurrency primitives pass all unit tests. Verify zero lock leaks.

---

### Phase 4B: Crash-Durable I/O & Projection Pipeline

#### Task 4: Crash-Durable Atomic Writer with Failure Cleanup
- **Owner**: `developer-agent`
- **Prerequisite**: Checkpoint 1.
- **Files**: `scripts/lib/task-state-machine.mjs`, `test/task-state-machine.test.mjs`.
- **TDD Failing Step**: Add failing tests asserting `atomicWriteFileSync()` loops until full write, unlinks `.tmp-*` in catch block upon simulated write failure, flushes file `fsyncSync`, executes rename, and flushes directory `fsyncSync`.
- **Implementation**: Implement `atomicWriteFileSync` in `scripts/lib/task-state-machine.mjs`.
- **Verification**: `node --test test/task-state-machine.test.mjs` passes durability and cleanup tests.
- **Rollback**: Revert writer implementation.

#### Task 5: Status Projection Compiler & Preflight Drift Reconciliation
- **Owner**: `developer-agent`
- **Prerequisite**: Task 4.
- **Files**: `scripts/compile-status-projection.mjs`, `scripts/archive-work-item.mjs`, `test/compile-status-projection.test.mjs`, `test/archive-work-item.test.mjs`.
- **TDD Failing Step**: Add failing tests asserting:
  1. `compileStatusProjection()` fails closed with `MALFORMED_SHARD` on corrupt JSON or digest mismatch.
  2. `archiveWorkItem()` calls `updateProjectStatusFile()`.
  3. Projection throw triggers compensating rollback restoring shard.
  4. Mandatory preflight `reconcileArchivedShards()` automatically detects and repairs post-crash drift.
- **Implementation**:
  - Update `scripts/compile-status-projection.mjs` to use `validateEnvelopeSchema` and `atomicWriteFileSync`.
  - Wire `updateProjectStatusFile()` into `scripts/archive-work-item.mjs` with exception compensation.
  - Implement `reconcileArchivedShards()` as preflight check in projection and archival scripts.
- **Verification**: `node --test test/compile-status-projection.test.mjs` and `test/archive-work-item.test.mjs` pass green.
- **Rollback**: Revert changes to compiler and archival scripts.

> **🛑 Checkpoint 2:** Projection and archival durability validated with failure injection.

---

### Phase 4C: Contract Validation, Migrations & Operational Closeout

#### Task 6: Contract Validator Update & Backfill Tool
- **Owner**: `developer-agent`
- **Prerequisite**: Checkpoint 2.
- **Files**: `scripts/backfill-task-state-v2.mjs`, `scripts/validate-contracts.mjs`, `test/contracts.test.mjs`.
- **TDD Failing Step**: Add failing tests asserting `validate-contracts.mjs` validates active shards against `durable-task-envelope.schema.json` and `backfill-task-state-v2.mjs` upgrades shards idempotently with `--rollback` support.
- **Implementation**:
  - Author `scripts/backfill-task-state-v2.mjs`.
  - Update `scripts/validate-contracts.mjs` to validate active shards with `validateEnvelopeSchema`.
- **Verification**: `node --test test/contracts.test.mjs` and `npm run validate:contracts` pass.
- **Rollback**: Revert validator changes and remove backfill script.

#### Task 7 (Operational Step): Active Shard Migration & Archival
- **Owner**: `developer-agent` (Separately Approved Operational Execution)
- **Prerequisite**: Task 6.
- **Files**: `docs/records/work-items/issue-249/task-state.json`, `docs/records/work-items/issue-275/task-state.json`, `PROJECT_STATUS.md`.
- **Execution**:
  - Backup active shards to scratch directory.
  - Run `scripts/backfill-task-state-v2.mjs` on `issue-249` and `issue-275`.
  - Transition terminal shards (`verifying -> handoff -> completed`).
  - Run `scripts/archive-work-item.mjs` to archive shards and reconcile `PROJECT_STATUS.md`.
- **Verification**: `npm run validate:project-state` and `npm run compile:status-projection -- --check` pass.
- **Rollback**: Restore backed-up shards if migration fails.

#### Task 8: Review Gate Governance & QA Record
- **Owner**: `developer-agent` & `qa-agent`
- **Prerequisite**: Tasks 1–7.
- **Files**: `docs/records/qa/2026-09-12-control-plane-state-integrity-code-review.md`.
- **Implementation**: Author QA code review record covering all `.mjs` changes satisfying `scripts/validate-review-gate.mjs`.
- **Verification**: `npm run validate:review-gate` passes.

---

## 5. Test Strategy

| Test Type | Required? | Scope | Owner |
|---|---|---|---|
| Unit Test | Yes | Self-excluding hasher, actor guards, CAS conflict, atomic writer cleanup | `developer-agent` |
| Concurrency Test | Yes | Two-process lost-update race, atomic rename stale takeover | `developer-agent` / `qa-agent` |
| Fault Injection | Yes | Write failure temp cleanup, archival exception compensation, post-crash drift | `qa-agent` |
| Integration | Yes | Fail-closed projection, archival reconciliation, backfill idempotency | `qa-agent` |
| Contract Validation | Yes | Envelope v2 schema validation, legacy v1 rejection | `qa-agent` |
| Review Gate | Yes | Verification of QA code review record (`QG-001`) | `qa-agent` |

---

## 6. Verification Commands

```bash
# 1. State Machine, Hashing & Concurrency (Phase 4A)
node --test test/task-state-machine.test.mjs

# 2. Projection, Durability & Archival (Phase 4B)
node --test test/compile-status-projection.test.mjs
node --test test/archive-work-item.test.mjs

# 3. Contract Validation & Backfill (Phase 4C)
node --test test/contracts.test.mjs
npm run validate:contracts

# 4. Quality Gates & Full Regression
npm run validate:review-gate
npm run validate:project-state
npm run validate:ci-parity
npm test
```

---

## 7. Rollback / Fallback Plan

| Scenario | Rollback / Fallback Action | Owner |
|---|---|---|
| Engine or Concurrency Test Failure | Revert code changes on branch; tests remain green on previous commit | `developer-agent` |
| Shard Backfill Failure | Execute `node scripts/backfill-task-state-v2.mjs --rollback` or restore from backup | `developer-agent` |
| Archival Reconciliation Failure | Automatic compensation restores shard directory; run `reconcileArchivedShards()` | `developer-agent` |

---

## 8. Risks / Blockers

| Risk / Blocker | Impact | Mitigation / Next Action |
|---|---|---|
| Manual Shard Tampering | CAS conflict on subsequent mutation | Documented CLI inspect command displays valid digest |
| Dead PID on Stale Lock | Blocked transitions | Atomic rename takeover reclaims locks safely without ABA risk |
| Post-Crash Projection Drift | Stale `PROJECT_STATUS.md` | Mandatory preflight `reconcileArchivedShards` repairs drift automatically |

---

## 9. Handoff

| To | Reason | Required Evidence |
|---|---|---|
| Code Review Gate | Review all production script modifications | Diff, unit tests, code review record |
| QA Verifier | Independent verification of all ACs and invariants | Full test run, mutation evidence, gate passes |
| Security Reviewer | Final security review of concurrency and takeover | Multi-process concurrency evidence |
| Human Maintainer | Final merge approval | Clean CI run, approved reviews, zero gate failures |
