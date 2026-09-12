# Implementation Plan: Control-Plane State Integrity & Architecture Remediation

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | Issue #277 — Control-Plane State Integrity & Architecture Remediation (Package 1) |
| Change Type | Framework / Meta Architecture Remediation (`framework-meta`) |
| Risk Level | High |
| Owner | Developer Agent (`implementation-planning`) |
| Target Branch / Ticket | `feat/control-plane-state-integrity` / Issue #277 |

### Acceptance Criteria & Invariant Checklist

Before beginning production code changes, the following requirements from BA Discovery, SA SDD, and Security Review are locked as non-negotiable verification gates:

- [ ] **AC-001 (Active Shards Conform to Canonical v2 Envelope & Valid Digest)**: All active work item shards validate against `docs/contracts/schemas/durable-task-envelope.schema.json` with `envelope_version: 2`, integer `sequence_number >= 1`, and valid 64-char hex `state_digest` verified by `digestTaskEnvelope()`.
- [ ] **AC-002 (Legacy v1 Shards Rejected & Backfilled Idempotently)**: Active shards declaring legacy format are rejected with diagnostic errors; `scripts/backfill-task-state-v2.mjs` upgrades shards idempotently.
- [ ] **AC-003 (Actor Policy Validation Rejection)**: Any state transition attempted by an actor not permitted by the workflow policy is rejected with `UNAUTHORIZED_ACTOR`, leaving the disk file unmutated.
- [ ] **AC-004 (Dynamic Policy-Driven Transition Execution)**: Permitted transitions evaluated against the workflow policy succeed, increment `sequence_number`, append historical transition event, and recompute `digestTaskEnvelope()`.
- [ ] **AC-005 (Mandatory CAS Digest Enforcement on Transition & Resume)**: State transition or resume requests omitting `--expected-digest` abort immediately with `MISSING_EXPECTED_DIGEST`, without file mutation.
- [ ] **AC-006 (True Atomic CAS Concurrency under Nonce Lock)**: Mutating operations acquire per-shard lock (`.lock` via `wx`) storing `{pid, nonce, created_at}` and re-read disk state under lock. Competing parallel requests result in exactly one success and one `CAS_CONFLICT`.
- [ ] **AC-007 (Fail-Closed Status Projection Compilation)**: `compileStatusProjection` aborts fail-closed with error code `MALFORMED_SHARD` and exit code `1` if any shard contains unparseable JSON, schema violations, or digest mismatches.
- [ ] **AC-008 (POSIX Atomic Durability, Archival Compensation & Crash Reconciliation)**: `atomicWriteFileSync` writes files with temp cleanup and directory sync. `archiveWorkItem` calls `updateProjectStatusFile()`, rolls back directory move on exception, and supports `--reconcile-all` for crash recovery.
- [ ] **QG-001 (Review Gate Script Enforcement)**: Any PR diff modifying or adding `.mjs`/`.js` scripts includes matching `docs/records/qa/*-code-review.md` records per `scripts/validate-review-gate.mjs`.

---

## 2. Inputs Reviewed

| Artifact | Status | Notes |
|---|---|---|
| REQUIREMENT_DISCOVERY.md | Available (`docs/records/requirements/2026-09-12-control-plane-state-integrity-discovery.md`) | Authoritative BA discovery. |
| SDD.md | Available (`docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md`) | Approved SA design document (Round 2 Rework). |
| SECURITY_REVIEW.md | Available (`docs/records/security-review/2026-09-12-issue-277-security-review.md`) | Conditional Approval; threat model and trust boundaries defined. |
| TEST_PLAN.md | In Progress (`docs/records/qa/2026-09-12-issue-277-test-plan.md`) | QA test plan and detailed executable test case definitions. |

---

## 3. Affected Areas

| Area | Files / Components | Expected Change |
|---|---|---|
| **Contracts & Schemas** | `docs/contracts/schemas/durable-task-envelope.schema.json`<br>`docs/contracts/schemas/task-state.schema.json` | Designate `durable-task-envelope.schema.json` as envelope authority with `envelope_version: 2`; compose with `workflow_contract_version: 1`. |
| **Migrations & Tooling** | `scripts/backfill-task-state-v2.mjs`<br>`scripts/validate-contracts.mjs` | Migration script to backfill active shards (`issue-249`, `issue-275`); update contract validator to verify two-layer composition and envelope digest integrity. |
| **State Machine Engine** | `scripts/lib/task-state-machine.mjs`<br>`scripts/task-machine-cli.mjs` | Implement `digestTaskEnvelope()`; implement nonce-based per-shard locking with compare-before-delete; implement dynamic workflow policy loader; enforce actor policy validation; require mandatory `--expected-digest` across transition and resume. |
| **Projection & Archival** | `scripts/compile-status-projection.mjs`<br>`scripts/archive-work-item.mjs` | Fail-closed shard discovery; implement `atomicWriteFileSync` with full write loops, failure cleanup, and directory sync; wire `updateProjectStatusFile()` into `archiveWorkItem` with compensating rollback and `--reconcile-all` crash recovery. |
| **Active Shards & Root Status** | `docs/records/work-items/issue-249/task-state.json`<br>`docs/records/work-items/issue-275/task-state.json`<br>`PROJECT_STATUS.md` | Backfill active shards to v2 envelope; transition and archive terminal shards; atomically reconcile `PROJECT_STATUS.md`. |
| **QA Records** | `docs/records/qa/2026-09-12-control-plane-state-integrity-code-review.md` | Mandatory QA code review record covering all `.mjs` script modifications to satisfy `validate:review-gate` (QG-001). |
| **Tests** | `test/task-state-machine.test.mjs`<br>`test/compile-status-projection.test.mjs`<br>`test/archive-work-item.test.mjs`<br>`test/contracts.test.mjs` | Detailed automation-ready test cases for concurrency, nonce locking, self-exclusion digests, temp cleanup, and archival recovery. |

---

## 4. Task Breakdown

### IMP-001: Two-Layer Contract Composition & Self-Excluding Hasher (AC-001, AC-002, ADR-0026, ADR-0028)
- **Owner**: `developer-agent`
- **Objective**: Designate `durable-task-envelope.schema.json` as envelope authority (`envelope_version: 2`); implement `digestTaskEnvelope(envelope)` in `scripts/lib/task-state-machine.mjs` excluding top-level `state_digest`; implement shared `validateEnvelopeSchema` verifying both schema shape and digest equality; author `scripts/backfill-task-state-v2.mjs`; update `scripts/validate-contracts.mjs` to validate composition.
- **Detailed Subtasks**:
  1. **Subtask 1.1**: Update `docs/contracts/schemas/durable-task-envelope.schema.json` to define `envelope_version: 2` and `workflow_contract_version: 1`, with 11-state enum and 64-char hex digest.
  2. **Subtask 1.2**: Implement `digestTaskEnvelope(envelope)` using `digestJcs()` from `scripts/lib/status-jcs.mjs`, copying the object and removing top-level `state_digest`.
  3. **Subtask 1.3**: Implement shared `validateEnvelopeSchema(data)`: validates Ajv schema and verifies `data.state_digest === digestTaskEnvelope(data)`.
  4. **Subtask 1.4**: Author `scripts/backfill-task-state-v2.mjs`: upgrades shards to v2 envelope, computes `digestTaskEnvelope`, and provides idempotent reruns and `--rollback`.
  5. **Subtask 1.5**: Update `scripts/validate-contracts.mjs` to compose envelope schema with policy YAML.

### IMP-002: Dynamic Policy-Driven State Machine & Nonce Lock (AC-003, AC-004, ADR-0027)
- **Owner**: `developer-agent`
- **Objective**: Implement dynamic workflow policy loader in `scripts/lib/task-state-machine.mjs`; implement nonce-based per-shard file locking with compare-before-delete; enforce actor policy validation.
- **Detailed Subtasks**:
  1. **Subtask 2.1**: Implement `loadWorkflowPolicy(workflowId)` to read `docs/contracts/${workflowId}-workflow.yaml` dynamically.
  2. **Subtask 2.2**: Implement `acquireShardLock(shardDir)`:
     - Creates `.lock` with `{ pid, nonce, created_at }` via `openSync('wx')`.
     - Stale lock recovery: if > 30s and dead PID, compare-before-delete and reacquire.
     - Retries with backoff up to 5s.
  3. **Subtask 2.3**: Implement `releaseShardLock(shardDir, nonce)`: reads `.lock` and unlinks only if nonce matches.
  4. **Subtask 2.4**: In `transitionTaskState`: validate canonicalized actor against policy's allowed actors; enforce required evidence.

### IMP-003: Mandatory Cryptographic CAS & True Atomic Concurrency (AC-005, AC-006, ADR-0027, ADR-0028)
- **Owner**: `developer-agent`
- **Objective**: Enforce mandatory `--expected-digest` across transition and resume; re-read disk state under lock; assert CAS equality; prevent lost updates.
- **Detailed Subtasks**:
  1. **Subtask 3.1**: Enforce mandatory `expected_digest` in `transitionTaskState` and `resumeTaskState`.
  2. **Subtask 3.2**: Under shard lock, re-read disk state, validate schema and digest integrity, and compare `expected_digest === currentState.state_digest`.
  3. **Subtask 3.3**: Update `scripts/task-machine-cli.mjs` to require `--expected-digest` across `transition` and `resume`.

### IMP-004: Crash-Durable Atomic Writer & Transactional Archival (AC-007, AC-008, ADR-0029)
- **Owner**: `developer-agent`
- **Objective**: Implement `atomicWriteFileSync` with temp cleanup and directory sync; wire `updateProjectStatusFile` into `archiveWorkItem` with exception rollback and `--reconcile-all` crash recovery; archive active terminal shards.
- **Detailed Subtasks**:
  1. **Subtask 4.1**: Implement `atomicWriteFileSync(targetPath, content)` with write loops, temp cleanup on failure, data fsync, atomic rename, and directory fsync.
  2. **Subtask 4.2**: In `scripts/compile-status-projection.mjs`, fail closed on unparseable, invalid, or digest-mismatched shards using `validateEnvelopeSchema`.
  3. **Subtask 4.3**: In `scripts/archive-work-item.mjs`, move shard, call `updateProjectStatusFile()`, and compensate on exception by moving shard back. Implement `reconcileArchivedShards()` for post-crash reconciliation.
  4. **Subtask 4.4**: Author QA code review record `docs/records/qa/2026-09-12-control-plane-state-integrity-code-review.md` satisfying `validate:review-gate` (QG-001).

---

## 5. Verification Commands

```bash
# 1. Contract & Schema Validation (IMP-001)
node --test test/contracts.test.mjs
npm run validate:contracts

# 2. State Machine, Actor Authorization, Concurrency & CAS (IMP-002, IMP-003)
node --test test/task-state-machine.test.mjs

# 3. Status Projection, Atomic Durability & Archival (IMP-004)
node --test test/compile-status-projection.test.mjs
node --test test/archive-work-item.test.mjs
npm run compile:status-projection -- --check

# 4. Review Gate & Full Test Suite
npm run validate:review-gate
npm run validate:ci-parity
npm run validate:project-state
npm test
```
