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

Before beginning production code changes, the following requirements from BA Discovery (`docs/records/requirements/2026-09-12-control-plane-state-integrity-discovery.md`) and SA SDD (`docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md`) are locked as non-negotiable verification gates:

- [ ] **AC-001 (Active Shards Conform to Canonical v2 Envelope)**: All active work item shards in `docs/records/work-items/{issue-id}/task-state.json` validate against `docs/contracts/schemas/durable-task-envelope.schema.json` with `contract_version: 2`, 11-state enum, valid 64-character hex `state_digest`, and integer `sequence_number >= 1`.
- [ ] **AC-002 (Legacy v1 & 7-State Shards Rejected)**: The state machine and contract validators strictly reject any active shard declaring `contract_version: 1` or restricted 7-state structure with diagnostic schema errors requiring migration.
- [ ] **AC-003 (Unauthorized Actor Rejection)**: Any state transition attempted by an actor not declared in `TRANSITION_MATRIX[fromState].actors` (e.g. `developer-agent` attempting `verifying -> handoff`) is rejected with error code `UNAUTHORIZED_ACTOR`, status `REJECTED`, and the state file remains 0% modified.
- [ ] **AC-004 (Authorized Actor State Transition)**: Permitted transitions initiated by authorized actors in `TRANSITION_MATRIX` succeed, increment `sequence_number`, append historical transition event, and recompute RFC 8785 JCS SHA-256 `state_digest`.
- [ ] **AC-005 (Mandatory CAS Digest Enforcement on Transition & Resume)**: State transition or resume requests omitting `expected_digest` or providing an empty string abort immediately with error code `MISSING_EXPECTED_DIGEST`, status `REJECTED`, without file mutation.
- [ ] **AC-006 (True Atomic CAS Concurrency & Conflict Abort)**: Mutating operations execute under per-shard mutual exclusion file lock (`.lock` via `wx`) with disk re-read under lock. Concurrent requests targeting the same digest result in exactly one success and one `CAS_CONFLICT` abort, returning both `current_digest` and `expected_digest` with state file untouched.
- [ ] **AC-007 (Fail-Closed Status Projection Compilation)**: `compileStatusProjection` and `validate:status-projection` abort fail-closed with error code `MALFORMED_SHARD` and exit code `1` if any shard in `work-items/*` contains unparseable JSON or schema violations, using the shared `validateEnvelopeSchema` seam.
- [ ] **AC-008 (POSIX Crash-Durable Writes & Transactional Archival)**: `atomicWriteFileSync` writes files using collision-safe `.tmp` (`wx`), `fsyncSync` data flush, atomic rename, and directory sync. `archiveWorkItem` executes two-phase archival with compensating rollback if status projection fails.
- [ ] **QG-001 (Review Gate Script Enforcement)**: Any PR diff modifying or adding `.mjs`/`.js` scripts includes matching `docs/records/qa/*-code-review.md` records per `scripts/validate-review-gate.mjs`.
- [ ] **BR-001 (Canonical Durable Envelope Authority)**: `durable-task-envelope.schema.json` is the sole canonical authority; `task-state.schema.json` is deprecated for active tasks.
- [ ] **BR-002 (Strict Matrix Actor Authorization)**: Actor strings canonicalize to lowercase kebab-case against `ROLE_REGISTRY`; unauthorized transitions fail closed.
- [ ] **BR-003 (Mandatory Cryptographic CAS & Shard Lock)**: Elimination of optional CAS bypass across library and CLI; per-shard file lock (`.lock` via `wx`).
- [ ] **BR-004 (Fail-Closed Projection & Transactional Durability)**: No silent skipping of corrupt shards; atomic file writes; compensating archival rollback.

---

## 2. Inputs Reviewed

| Artifact | Status | Notes |
|---|---|---|
| REQUIREMENT_DISCOVERY.md | Available (`docs/records/requirements/2026-09-12-control-plane-state-integrity-discovery.md`) | Authoritative BA discovery defining US-001–US-004, AC-001–AC-008, BR-001–BR-004, and R-001–R-005. |
| SDD.md | Available (`docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md`) | Approved SA design document defining the 5 core components, API contracts, error handling, per-shard locking, and ADRs (ADR-0026..ADR-0029). |
| SECURITY_REVIEW.md | Available (`docs/records/security-review/2026-09-12-issue-277-security-review.md`) | Approved Security Review confirming trust boundaries, actor policy validation, and concurrency safety. |
| TEST_PLAN.md | Available (`docs/records/qa/2026-09-12-issue-277-test-plan.md`) | QA test plan detailing acceptance traceability and test cases. |

---

## 3. Affected Areas

| Area | Files / Components | Expected Change |
|---|---|---|
| **Contracts & Schemas** | `docs/contracts/schemas/durable-task-envelope.schema.json`<br>`docs/contracts/schemas/task-state.schema.json` | Designate `durable-task-envelope.schema.json` as canonical v2 authority; deprecate `task-state.schema.json` for active tasks. |
| **Migrations & Tooling** | `scripts/backfill-task-state-v2.mjs`<br>`scripts/validate-contracts.mjs` | New migration/backfill script to upgrade active shards (`issue-249`, `issue-275`) to v2; update contract validator to enforce v2 schema on active work-item shards. |
| **State Machine Engine** | `scripts/lib/task-state-machine.mjs`<br>`scripts/task-machine-cli.mjs` | Implement per-shard mutual exclusion file locking (`.lock` via `wx`) with disk re-read under lock; implement shared `validateEnvelopeSchema`; enforce actor authorization against `TRANSITION_MATRIX.actors`; eliminate optional CAS bypass across transition and resume. |
| **Projection & Archival** | `scripts/compile-status-projection.mjs`<br>`scripts/archive-work-item.mjs` | Fail-closed shard discovery with `MALFORMED_SHARD` using shared validation seam; implement `atomicWriteFileSync` with `fsync` and directory sync; implement transactional archival with compensating rollback. |
| **Active Shards & Root Status** | `docs/records/work-items/issue-249/task-state.json`<br>`docs/records/work-items/issue-275/task-state.json`<br>`PROJECT_STATUS.md` | Backfill active shards to v2 format; execute transition paths (`verifying -> handoff -> completed`) and archive terminal shards; atomically reconcile `PROJECT_STATUS.md`. |
| **QA Records** | `docs/records/qa/2026-09-12-control-plane-state-integrity-code-review.md` | Mandatory QA code review record covering all `.mjs` script modifications to satisfy `validate:review-gate` (QG-001). |
| **Tests** | `test/task-state-machine.test.mjs`<br>`test/compile-status-projection.test.mjs`<br>`test/archive-work-item.test.mjs`<br>`test/contracts.test.mjs` | Unit and integration tests for per-shard locking, lost-update prevention, actor guards, mandatory CAS, fail-closed projection, atomic markdown writes, and archival compensation. |

---

## 4. Task Breakdown

### IMP-001: Schema & State Model Unification (AC-001, AC-002, BR-001, ADR-0026)
- **Owner**: `developer-agent`
- **Objective**: Designate `durable-task-envelope.schema.json` as sole canonical authority for active shards; deprecate `task-state.schema.json`; author `scripts/backfill-task-state-v2.mjs`; backfill active shards (`issue-249`, `issue-275`) to v2 format; update `scripts/validate-contracts.mjs` to require v2 envelope schema for active work items.
- **Files / Components**:
  - `docs/contracts/schemas/durable-task-envelope.schema.json`
  - `docs/contracts/schemas/task-state.schema.json`
  - `scripts/backfill-task-state-v2.mjs` (new)
  - `scripts/validate-contracts.mjs`
  - `docs/records/work-items/issue-249/task-state.json`
  - `docs/records/work-items/issue-275/task-state.json`
  - `test/contracts.test.mjs`
- **Detailed Subtasks**:
  1. **Subtask 1.1**: Update `docs/contracts/schemas/durable-task-envelope.schema.json` title to `"Durable Task Envelope Schema v2"`, ensure strict 11-state enum validation, integer `sequence_number >= 1`, 64-character hex `state_digest`, and multi-workflow validation.
  2. **Subtask 1.2**: Deprecate `docs/contracts/schemas/task-state.schema.json` by adding a `$comment` / deprecation notice marking it legacy v1 for historical audit purposes only.
  3. **Subtask 1.3**: Author deterministic migration script `scripts/backfill-task-state-v2.mjs`:
     - Reads existing `task-state.json` shard.
     - Upgrades `contract_version` from 1 to 2.
     - Canonicalizes ISO timestamps in `history` to valid date-time.
     - Sets initial `sequence_number = history.length + 1` (or 1 if no history).
     - Computes canonical RFC 8785 JCS SHA-256 `state_digest` via `scripts/lib/status-jcs.mjs`.
     - Atomically writes updated v2 shard.
     - Supports `--rollback` flag.
  4. **Subtask 1.4**: Run backfill on `docs/records/work-items/issue-249/task-state.json` and `docs/records/work-items/issue-275/task-state.json`.
  5. **Subtask 1.5**: Update `scripts/validate-contracts.mjs` to validate any active work-item shard against `durable-task-envelope.schema.json` and reject `contract_version: 1` or 7-state structures with diagnostic error `LEGACY_CONTRACT_VERSION_DEPRECATED`.
  6. **Subtask 1.6**: Add tests in `test/contracts.test.mjs` asserting active shards validate against v2 and v1 shards fail closed.

### IMP-002: Actor Policy Validation Guard & Lock Management (AC-003, AC-004, BR-002, ADR-0027)
- **Owner**: `developer-agent`
- **Objective**: Harden `scripts/lib/task-state-machine.mjs` with per-shard mutual exclusion file locking (`.lock` via `wx`) and actor policy validation against `TRANSITION_MATRIX.actors`.
- **Files / Components**:
  - `scripts/lib/task-state-machine.mjs`
  - `scripts/task-machine-cli.mjs`
  - `test/task-state-machine.test.mjs`
- **Detailed Subtasks**:
  1. **Subtask 2.1**: Implement per-shard mutual exclusion lock helper (`acquireShardLock`, `releaseShardLock`):
     - Acquires `docs/records/work-items/{issue_id}/.lock` via `fs.openSync(lockPath, 'wx')`.
     - Implements stale lock recovery (detects locks older than 30s, verifies dead PID via `process.kill(pid, 0)`).
     - Retries with backoff up to 5 seconds before throwing `LOCK_ACQUISITION_TIMEOUT`.
     - Always releases lock in `finally` block via `fs.unlinkSync(lockPath)`.
  2. **Subtask 2.2**: Implement actor canonicalization function `canonicalizeActor(actor)`:
     - Convert input string to lowercase kebab-case (e.g. `'Developer Agent'` -> `'developer-agent'`).
     - Check membership against `ROLE_REGISTRY`.
  3. **Subtask 2.3**: In `transitionTaskState()`, validate actor:
     - Check `matrixEntry.actors.includes(canonicalActor)`.
     - If unauthorized: throw structured error `UNAUTHORIZED_ACTOR`, status `REJECTED`, leaving disk state unmutated.
  4. **Subtask 2.4**: Preserve emergency human/orchestrator approval gate invariants:
     - When `fromState === 'blocked'` and `stop_reason === 'human_review_required'`, verify actor is either `human` or `orchestrator` and `evidence.approver_id` is supplied.
  5. **Subtask 2.5**: Update CLI `scripts/task-machine-cli.mjs` to enforce `--actor` and validate against `ROLE_REGISTRY`.
  6. **Subtask 2.6**: Author unit tests in `test/task-state-machine.test.mjs` for actor rejection, canonicalization, and lock management.

### IMP-003: Mandatory Cryptographic CAS & True Atomic Concurrency (AC-005, AC-006, BR-003, ADR-0027, ADR-0028)
- **Owner**: `developer-agent`
- **Objective**: Implement true atomic CAS with mandatory `--expected-digest` across transition and resume; eliminate optional CAS bypass; integrate RFC 8785 canonical hashing via `scripts/lib/status-jcs.mjs`; re-read disk state under lock to eliminate two-process lost updates.
- **Files / Components**:
  - `scripts/lib/task-state-machine.mjs`
  - `scripts/task-machine-cli.mjs`
  - `test/task-state-machine.test.mjs`
- **Detailed Subtasks**:
  1. **Subtask 3.1**: Enforce mandatory `expected_digest` in `scripts/lib/task-state-machine.mjs` across *both* `transitionTaskState` and `resumeTaskState`:
     - Throw `MISSING_EXPECTED_DIGEST` if omitted, null, or empty string.
     - Validate 64-character lowercase hex format.
  2. **Subtask 3.2**: Under shard lock, re-read disk state, validate schema via `validateEnvelopeSchema`, and compute `currentDigest = digestJcs(diskState)`.
     - If `expected_digest !== currentDigest`, throw `CAS_CONFLICT` returning `current_digest` and `expected_digest`.
  3. **Subtask 3.3**: Unify all hashing using `scripts/lib/status-jcs.mjs` (`canonicalizeJcs`, `digestJcs`).
  4. **Subtask 3.4**: In `scripts/task-machine-cli.mjs`:
     - Require `--expected-digest <hex>` on `transition` and `resume` commands.
     - In `inspect` command, output `state_digest` to facilitate CLI workflows.
  5. **Subtask 3.5**: Author unit and concurrency tests in `test/task-state-machine.test.mjs`:
     - Missing expected digest throws `MISSING_EXPECTED_DIGEST`.
     - CAS conflict throws `CAS_CONFLICT`.
     - Concurrency test: two simulated parallel processes attempting transitions on the same digest result in exactly 1 success and 1 `CAS_CONFLICT`.

### IMP-004: Hardened Status Projection, POSIX Durability & Transactional Archival (AC-007, AC-008, BR-004, ADR-0029)
- **Owner**: `developer-agent`
- **Objective**: Harden `scripts/compile-status-projection.mjs` with shared `validateEnvelopeSchema` fail-closed shard discovery (`MALFORMED_SHARD`); implement `atomicWriteFileSync` with collision-safe `wx` temp files, `fsyncSync`, and directory sync; implement transactional `archiveWorkItem` with compensating rollback; transition and archive active terminal shards (`issue-249`, `issue-275`).
- **Files / Components**:
  - `scripts/compile-status-projection.mjs`
  - `scripts/archive-work-item.mjs`
  - `PROJECT_STATUS.md`
  - `test/compile-status-projection.test.mjs`
  - `test/archive-work-item.test.mjs`
  - `docs/records/qa/2026-09-12-control-plane-state-integrity-code-review.md` (mandatory review record per QG-001)
- **Detailed Subtasks**:
  1. **Subtask 4.1**: In `scripts/compile-status-projection.mjs` (`discoverActiveShards`), use shared `validateEnvelopeSchema`:
     - If shard unparseable or schema-invalid, throw `MALFORMED_SHARD` and exit 1.
  2. **Subtask 4.2**: Implement `atomicWriteFileSync(targetPath, content)`:
     - Creates temporary file using `openSync(tmpPath, 'wx')`.
     - Writes content and executes `fs.fsyncSync(fd)`.
     - Atomically renames temporary file over `targetPath`.
     - Opens parent directory and executes `fs.fsyncSync(dirFd)` to persist directory pointer.
  3. **Subtask 4.3**: In `scripts/archive-work-item.mjs`, implement two-phase transactional archival:
     - Move shard directory to `archive/{issue_id}`.
     - Call `compileStatusProjection()`.
     - If compilation fails, compensate by moving shard directory back to active and throw `ARCHIVE_RECONCILIATION_FAILED`.
  4. **Subtask 4.4**: Transition active shards (`issue-249`, `issue-275`) along their lifecycle paths (`verifying -> handoff -> completed`) and archive them using `archiveWorkItem`.
  5. **Subtask 4.5**: Author unit and fault-injection tests in `test/compile-status-projection.test.mjs` and `test/archive-work-item.test.mjs`:
     - Malformed shard triggers `MALFORMED_SHARD` fail-closed abort.
     - Atomic write guarantees zero mid-write corruption.
     - Archival compilation failure triggers compensating directory restoration.
  6. **Subtask 4.6**: Author QA code review record `docs/records/qa/2026-09-12-control-plane-state-integrity-code-review.md` satisfying `validate:review-gate` (QG-001).

---

## 5. Test Strategy & Verification Commands

### Test Execution Commands

```bash
# 1. Contract & Schema Validation (IMP-001)
node --test test/contracts.test.mjs
npm run validate:contracts

# 2. State Machine, Actor Authorization, Concurrency & CAS (IMP-002, IMP-003)
node --test test/task-state-machine.test.mjs

# 3. Status Projection Compilation & Archival Lifecycle (IMP-004)
node --test test/compile-status-projection.test.mjs
node --test test/archive-work-item.test.mjs
npm run compile:status-projection -- --check

# 4. Review Gate Governance & Full Repository Quality Gates
npm run validate:review-gate
npm run validate:ci-parity
npm run validate:project-state
npm test
```

---

## 6. Rollback / Fallback Plan

- **Schema & Migration Rollback:** `scripts/backfill-task-state-v2.mjs --rollback` restores `contract_version: 1` and cleans v2 properties if necessary.
- **Git Reversion:** All commits are atomic and isolated to `feat/control-plane-state-integrity`. Reverting the feature branch leaves master unaffected.
- **Archival Compensation:** If archival reconciliation aborts, the two-phase compensating rollback automatically restores the shard to `docs/records/work-items/{issue_id}`.

---

## 7. Risks & Blockers

- **Manual File Tampering Risk:** Manual edits to `task-state.json` without recomputing the SHA-256 digest will cause subsequent automated CAS transitions to fail with `CAS_CONFLICT`. *Mitigation:* Documented operational procedure to inspect and retrieve new digest via CLI.
- **Local Lock File Cleanup:** Unclean kills (e.g. `SIGKILL`) could leave `.lock` files. *Mitigation:* 30-second stale lock detection inspects process PID liveness and cleans abandoned locks safely.

---

## 8. Handoff

- **Next Agent / Skill**: Human Maintainer / Boss Approval Gate, followed by `developer-agent` for TDD Implementation.
- **Handoff Artifacts**:
  - `docs/records/requirements/2026-09-12-control-plane-state-integrity-discovery.md`
  - `docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md`
  - `docs/records/security-review/2026-09-12-issue-277-security-review.md`
  - `docs/records/implementation-plan/2026-09-12-control-plane-state-integrity-plan.md`
  - `docs/records/qa/2026-09-12-issue-277-test-plan.md`
