# Implementation Plan: Control-Plane State Integrity & Architecture Remediation

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | Issue #277 — Control-Plane State Integrity & Architecture Remediation (Package 1) |
| Change Type | Framework / Meta Architecture Remediation (`framework-meta`) |
| Risk Level | High |
| Owner | Developer Agent (`implementation-planning`) |
| Target Branch / Ticket | `feat/control-plane-state-integrity` / Issue #277 |

### Acceptance Criteria & NFR Restatement Checklist

Before beginning production code changes, the following requirements from BA Discovery (`docs/records/requirements/2026-09-12-control-plane-state-integrity-discovery.md`) and SA SDD (`docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md`) are locked as non-negotiable verification gates:

- [ ] **AC-001 (Active Shards Conform to Canonical v2 Envelope)**: All active work item shards in `docs/records/work-items/{issue-id}/task-state.json` validate against `docs/contracts/schemas/durable-task-envelope.schema.json` with `contract_version: 2`, 11-state enum, valid 64-character hex `state_digest`, and integer `sequence_number >= 1`.
- [ ] **AC-002 (Legacy v1 & 7-State Shards Rejected)**: The state machine and contract validators strictly reject any active shard declaring `contract_version: 1` or restricted 7-state structure with diagnostic schema errors requiring migration.
- [ ] **AC-003 (Unauthorized Actor Rejection)**: Any state transition attempted by an actor not declared in `TRANSITION_MATRIX[fromState].actors` (e.g. `developer-agent` attempting `verifying -> handoff`) is rejected with error code `UNAUTHORIZED_ACTOR`, status `REJECTED`, and the state file remains 0% modified.
- [ ] **AC-004 (Authorized Actor State Transition)**: Permitted transitions initiated by authorized actors in `TRANSITION_MATRIX` succeed, increment `sequence_number`, append historical transition event, and recompute RFC 8785 JCS SHA-256 `state_digest`.
- [ ] **AC-005 (Mandatory CAS Digest Enforcement)**: State transition requests omitting `expected_digest` or providing an empty string abort immediately with error code `MISSING_EXPECTED_DIGEST`, status `REJECTED`, without file mutation.
- [ ] **AC-006 (Cryptographic CAS Conflict Abort)**: State transition requests with an `expected_digest` that does not match the disk state's SHA-256 JCS digest abort with `CAS_CONFLICT`, returning both `current_digest` and `expected_digest` with state file untouched.
- [ ] **AC-007 (Fail-Closed Status Projection Compilation)**: `compileStatusProjection` and `validate:status-projection` abort fail-closed with error code `MALFORMED_SHARD` and exit code `1` if any shard in `work-items/*` contains unparseable JSON or schema violations.
- [ ] **AC-008 (POSIX Atomic Root Projection Writing & Archival Reconciliation)**: `updateProjectStatusFile` writes `PROJECT_STATUS.md` using POSIX atomic writing (`.tmp` + `fsyncSync` + `renameSync`), achieving 0.0% mid-write corruption; `archiveWorkItem` automatically triggers projection reconciliation upon moving terminal shards.
- [ ] **AC-010 Constraint (Review Gate Script Enforcement)**: Any PR diff modifying or adding `.mjs`/`.js` scripts includes matching `docs/records/qa/*-code-review.md` records per `scripts/validate-review-gate.mjs`.
- [ ] **BR-001 (Canonical Durable Envelope Authority)**: `durable-task-envelope.schema.json` is the sole canonical authority; `task-state.schema.json` is deprecated.
- [ ] **BR-002 (Strict Matrix Actor Authorization)**: Actor strings canonicalize to lowercase kebab-case against `ROLE_REGISTRY`; unauthorized transitions fail closed.
- [ ] **BR-003 (Mandatory Cryptographic CAS Verification)**: Elimination of optional CAS bypass across library and CLI.
- [ ] **BR-004 (Fail-Closed Projection & Atomic Durability)**: No silent skipping of corrupt shards; atomic markdown writes.

---

## 2. Inputs Reviewed

| Artifact | Status | Notes |
|---|---|---|
| REQUIREMENT_DISCOVERY.md | Available (`docs/records/requirements/2026-09-12-control-plane-state-integrity-discovery.md`) | Authoritative BA discovery defining US-001–US-004, AC-001–AC-008, BR-001–BR-004, and R-001–R-005. |
| SDD.md | Available (`docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md`) | Approved SA design document defining the 4 core components, API contracts, error handling, and ADR candidates (ADR-0026..ADR-0029). |
| TECHNICAL_DESIGN.md | N/A | Fully subsumed by the approved SDD document. |
| API_CONTRACT.md | Available (`docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md` §205–§262) | Signatures for `transitionTaskState`, `verifyCasAndComputeDigest`, `atomicWriteTextSync`, and CLI command interface. |
| TEST_PLAN.md | In progress (QA Agent) | Test strategy and acceptance verification matrices outlined herein to feed QA Agent test plan authoring. |

---

## 3. Affected Areas

| Area | Files / Components | Expected Change |
|---|---|---|
| **Contracts & Schemas** | `docs/contracts/schemas/durable-task-envelope.schema.json`<br>`docs/contracts/schemas/task-state.schema.json` | Designate `durable-task-envelope.schema.json` as canonical v2 authority (update title, remove draft constraints); deprecate `task-state.schema.json` for active tasks. |
| **Migrations & Tooling** | `scripts/backfill-task-state-v2.mjs`<br>`scripts/validate-contracts.mjs` | New migration/backfill script to upgrade active shards (`issue-249`, `issue-275`) to v2; update contract validator to enforce v2 schema on active work-item shards. |
| **State Machine Engine** | `scripts/lib/task-state-machine.mjs`<br>`scripts/task-machine-cli.mjs` | Enforce actor authorization against `TRANSITION_MATRIX[fromState].actors`; eliminate optional CAS bypass; require non-empty `expected_digest`; canonicalize actor strings. |
| **Projection & Archival** | `scripts/compile-status-projection.mjs`<br>`scripts/archive-work-item.mjs` | Fail-closed shard discovery with `MALFORMED_SHARD`; implement `atomicWriteTextSync` with `fsyncSync` + `renameSync`; invoke projection update on successful shard move. |
| **Active Shards & Root Status** | `docs/records/work-items/issue-249/task-state.json`<br>`docs/records/work-items/issue-275/task-state.json`<br>`PROJECT_STATUS.md` | Backfill active shards to v2 format; archive completed shards; atomically reconcile `PROJECT_STATUS.md`. |
| **QA Records** | `docs/records/qa/2026-09-12-control-plane-state-integrity-code-review.md` | Mandatory QA code review record covering all `.mjs` script modifications to satisfy `validate:review-gate` (AC-010). |
| **Tests** | `test/task-state-machine.test.mjs`<br>`test/compile-status-projection.test.mjs`<br>`test/archive-work-item.test.mjs`<br>`test/contracts.test.mjs` | Unit and integration tests for actor guards, mandatory CAS, fail-closed projection, atomic markdown writes, and archival reconciliation. |

---

## 4. Task Breakdown

### IMP-001: Schema & State Model Unification (AC-001, AC-002, BR-001, ADR-0026)
- **Owner**: `developer-agent`
- **Objective**: Designate `durable-task-envelope.schema.json` as sole canonical authority for active shards; deprecate `task-state.schema.json`; backfill active shards (`issue-249`, `issue-275`) to v2 format; update `scripts/validate-contracts.mjs` to require v2 envelope schema for active work items.
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
     - Computes canonical RFC 8785 JCS SHA-256 `state_digest`.
     - Atomically writes updated v2 shard.
  4. **Subtask 1.4**: Run backfill on `docs/records/work-items/issue-249/task-state.json` and `docs/records/work-items/issue-275/task-state.json`.
  5. **Subtask 1.5**: Update `scripts/validate-contracts.mjs` to validate any active work-item shard against `durable-task-envelope.schema.json` and reject `contract_version: 1` or 7-state structures with diagnostic error `LEGACY_CONTRACT_VERSION_DEPRECATED`.
  6. **Subtask 1.6**: Add tests in `test/contracts.test.mjs` asserting active shards validate against v2 and v1 shards fail closed.

### IMP-002: Strict Actor Authorization Guard (AC-003, AC-004, BR-002, ADR-0027)
- **Owner**: `developer-agent`
- **Objective**: Harden `scripts/lib/task-state-machine.mjs` to strictly enforce actor authorization against `TRANSITION_MATRIX[fromState].actors`, canonicalize actor identifiers against `ROLE_REGISTRY`, throw `UNAUTHORIZED_ACTOR`, and preserve human/orchestrator bypass invariants in `blocked` state.
- **Files / Components**:
  - `scripts/lib/task-state-machine.mjs`
  - `scripts/task-machine-cli.mjs`
  - `test/task-state-machine.test.mjs`
- **Detailed Subtasks**:
  1. **Subtask 2.1**: Implement actor string canonicalization function `canonicalizeActor(actor)` in `scripts/lib/task-state-machine.mjs`:
     - Convert input string to lowercase kebab-case (e.g. `'Developer Agent'` -> `'developer-agent'`).
     - Check membership against `ROLE_REGISTRY`. If not recognized, treat as unauthorized.
  2. **Subtask 2.2**: In `transitionTaskState(currentState, request)`, inspect `matrixEntry = TRANSITION_MATRIX[fromState]`:
     - Canonicalize incoming `actor`.
     - Check `matrixEntry.actors.includes(canonicalActor)`.
     - If unauthorized: throw structured error with `code = 'UNAUTHORIZED_ACTOR'`, `status = 'REJECTED'`, message naming the unauthorized actor and permitted roles for `fromState`.
     - State file remains completely unmutated.
  3. **Subtask 2.3**: Preserve emergency human and orchestrator approval gate invariants:
     - When `fromState === 'blocked'` and `stop_reason === 'human_review_required'`, verify actor is either `human` or `orchestrator` and `evidence.approver_id` is supplied (BR-002, AC-006).
  4. **Subtask 2.4**: Update `scripts/task-machine-cli.mjs` to parse `--actor`, validate against `ROLE_REGISTRY`, and report clear diagnostics on authorization failures.
  5. **Subtask 2.5**: Author test cases in `test/task-state-machine.test.mjs`:
     - Test developer-agent attempting `verifying -> handoff` (must fail with `UNAUTHORIZED_ACTOR`).
     - Test qa-agent executing `verifying -> handoff` (must PASS).
     - Test case-insensitive/spaced actor canonicalization (`'Developer Agent'` -> `'developer-agent'`).
     - Test unregistered actor strings (must fail with `UNAUTHORIZED_ACTOR`).
     - Test human/orchestrator resumption from `blocked` state (must PASS with approver_id).

### IMP-003: Mandatory Cryptographic CAS Concurrency Engine (AC-005, AC-006, BR-003, ADR-0028)
- **Owner**: `developer-agent`
- **Objective**: Eliminate optional CAS bypass in `scripts/lib/task-state-machine.mjs` and `scripts/task-machine-cli.mjs`; require non-empty `expected_digest` parameter; mandate `verifyCasAndComputeDigest` RFC 8785 JCS SHA-256 verification before every state mutation.
- **Files / Components**:
  - `scripts/lib/task-state-machine.mjs`
  - `scripts/task-machine-cli.mjs`
  - `test/task-state-machine.test.mjs`
- **Detailed Subtasks**:
  1. **Subtask 3.1**: In `scripts/lib/task-state-machine.mjs` (`transitionTaskState`), eliminate optional `if (expected_digest !== undefined)`:
     - Require `expected_digest`: if `!expected_digest || typeof expected_digest !== 'string' || expected_digest.trim() === ''`, throw error with `code = 'MISSING_EXPECTED_DIGEST'`, `status = 'REJECTED'`.
     - Require 64-character lowercase hex format: if `!/^[a-f0-9]{64}$/i.test(expected_digest.trim())`, throw `INVALID_EXPECTED_DIGEST`.
  2. **Subtask 3.2**: In `verifyCasAndComputeDigest(stateObj, expectedDigest)`:
     - Compute `currentDigest = computeStateDigest(stateObj)`.
     - If `expectedDigest.toLowerCase() !== currentDigest`, throw error with `code = 'CAS_CONFLICT'`, `status = 'REJECTED'`, `current_digest = currentDigest`, `expected_digest = expectedDigest`.
  3. **Subtask 3.3**: In `scripts/task-machine-cli.mjs`:
     - Require `--expected-digest <hex>` on `transition` command; abort with exit code 1 if omitted.
     - Add `--current-digest` helper output to `inspect` command so callers can retrieve the digest safely.
  4. **Subtask 3.4**: Author test cases in `test/task-state-machine.test.mjs`:
     - Attempt transition without `expected_digest` (must fail with `MISSING_EXPECTED_DIGEST`).
     - Attempt transition with empty string `""` or whitespace (must fail with `MISSING_EXPECTED_DIGEST`).
     - Attempt transition with mismatched digest (must fail with `CAS_CONFLICT` containing both digests).
     - Execute valid transition with matching digest (must PASS, increment sequence number, and compute new digest).

### IMP-004: Hardened Status Projection Compiler & Archival Lifecycle (AC-007, AC-008, BR-004, ADR-0029)
- **Owner**: `developer-agent`
- **Objective**: Harden `scripts/compile-status-projection.mjs` to fail closed with `MALFORMED_SHARD` on unparseable/schema-violating shards; implement `atomicWriteTextSync()` using POSIX `.tmp` + `fsyncSync` + `renameSync`; update `scripts/archive-work-item.mjs` to trigger automatic projection updates upon successful shard move; archive completed shards (`issue-249`, `issue-275`) to reconcile `PROJECT_STATUS.md`.
- **Files / Components**:
  - `scripts/compile-status-projection.mjs`
  - `scripts/archive-work-item.mjs`
  - `PROJECT_STATUS.md`
  - `test/compile-status-projection.test.mjs`
  - `test/archive-work-item.test.mjs`
  - `docs/records/qa/2026-09-12-control-plane-state-integrity-code-review.md` (mandatory review record per AC-010)
- **Detailed Subtasks**:
  1. **Subtask 4.1**: In `scripts/compile-status-projection.mjs` (`discoverActiveShards`), eliminate silent `try/catch` skip:
     - Read shard JSON: if parsing fails, throw error with `code = 'MALFORMED_SHARD'`, message detailing the file path and JSON error.
     - Validate shard against `durable-task-envelope.schema.json`: if validation fails, throw error with `code = 'MALFORMED_SHARD'`, message detailing schema errors.
     - Process exits with code 1, ensuring CI and CLI fail closed immediately.
  2. **Subtask 4.2**: Implement `atomicWriteTextSync(targetPath, content)` in `scripts/compile-status-projection.mjs`:
     - Ensure parent directory exists (`fs.mkdirSync(dir, { recursive: true })`).
     - Create temp path `.tmp-${baseName}-${process.pid}-${Date.now()}`.
     - Open file descriptor via `fs.openSync(tmpPath, 'w')`.
     - Write content using `fs.writeSync(fd, content, 'utf8')`.
     - Call `fs.fsyncSync(fd)` to flush write cache to disk.
     - Close fd via `fs.closeSync(fd)`.
     - Atomically commit via `fs.renameSync(tmpPath, targetPath)`.
     - Use `atomicWriteTextSync` in `updateProjectStatusFile()`.
  3. **Subtask 4.3**: Update `scripts/archive-work-item.mjs`:
     - Import `updateProjectStatusFile` from `./compile-status-projection.mjs`.
     - After `fs.renameSync(shardDir, targetShardDir)` completes successfully, immediately execute `updateProjectStatusFile(rootDir)` to reconcile `PROJECT_STATUS.md` in the same process.
  4. **Subtask 4.4**: Lifecycle Reconciliation:
     - Mark `issue-249` and `issue-275` terminal (state `completed`), run `scripts/archive-work-item.mjs` to move them to `docs/records/work-items/archive/`, and verify `PROJECT_STATUS.md` active table clears.
  5. **Subtask 4.5**: Author test cases:
     - In `test/compile-status-projection.test.mjs`: assert malformed JSON or schema-invalid shard aborts with `MALFORMED_SHARD` and exit code 1; assert `atomicWriteTextSync` crash-resilience.
     - In `test/archive-work-item.test.mjs`: assert successful archival automatically re-compiles `PROJECT_STATUS.md` and excludes the archived issue.
  6. **Subtask 4.6**: Mandatory QA Review Record (AC-010 Constraint):
     - Author `docs/records/qa/2026-09-12-control-plane-state-integrity-code-review.md` documenting changes to `scripts/lib/task-state-machine.mjs`, `scripts/task-machine-cli.mjs`, `scripts/compile-status-projection.mjs`, `scripts/archive-work-item.mjs`, and `scripts/validate-contracts.mjs`, satisfying `npm run validate:review-gate`.

---

## 5. Test Strategy

| Test Type | Required? | Scope | Owner |
|---|---|---|---|
| Unit Test | Yes | State machine actor authorization, CAS conflict rejection, schema validation, atomic text writer | `developer-agent` |
| Integration Test | Yes | CLI command execution, projection compilation fail-closed behavior, archival auto-update | `developer-agent` |
| Regression Test | Yes | Complete existing test suite (764+ tests) verifying zero breakage of dynamic workflow pipelines | `qa-agent` |
| Schema & Contract Test | Yes | `npm run validate:contracts` across all policies, schemas, and fixture shards | `qa-agent` / `developer-agent` |
| Review Gate Check | Yes | `npm run validate:review-gate` ensuring valid QA code review record added | `developer-agent` / CI |
| CI Parity & Quality Gates | Yes | `npm run validate:ci-parity`, `npm run validate:project-state`, `npm run validate:status-projection` | `qa-agent` |

---

## 6. Verification Commands

```bash
# 1. Backfill active shards to v2 format
node scripts/backfill-task-state-v2.mjs

# 2. Run unit and integration tests for state machine, projection, and archival
node --test test/task-state-machine.test.mjs
node --test test/compile-status-projection.test.mjs
node --test test/archive-work-item.test.mjs
node --test test/contracts.test.mjs

# 3. Validate repository contracts and schemas
npm run validate:contracts

# 4. Check review gate compliance for modified scripts (AC-010)
npm run validate:review-gate

# 5. Check status projection compilation and drift
npm run validate:status-projection

# 6. Verify CI parity between GitHub Actions and GitLab CI
npm run validate:ci-parity

# 7. Verify project state markers
npm run validate:project-state

# 8. Run full test suite across repository
npm test
```

---

## 7. Rollback / Fallback Plan

| Scenario | Rollback / Fallback Action | Owner |
|---|---|---|
| Backfill script corrupts active shards | Revert shards using Git (`git checkout -- docs/records/work-items/`) to restore pre-backfill state | `developer-agent` |
| Strict actor authorization blocks emergency orchestrator intervention | Actor matrix in `TRANSITION_MATRIX` explicitly permits `orchestrator` and `human` in `blocked` state; if regression occurs, verify actor canonicalization maps correctly | `developer-agent` |
| Mandatory CAS blocks CLI automation scripts | Provide `--current-digest` flag helper in CLI inspect command so callers can retrieve observed digest prior to transition | `developer-agent` |
| Fail-closed projection blocks compilation on temporary scratch files | Ensure compiler only scans `docs/records/work-items/*/task-state.json` and excludes `archive/**` and non-directory files; clean up any uncommitted scratch shards | `developer-agent` |

---

## 8. Risks / Blockers

| Risk / Blocker | Impact | Mitigation / Next Action |
|---|---|---|
| **R-001 (Active Shard Incompatibility)** | Shards for `issue-249` and `issue-275` fail v2 schema checks if upgraded prematurely | Execute `scripts/backfill-task-state-v2.mjs` prior to enabling strict v2 schema enforcement in `validate-contracts.mjs`. |
| **R-002 (Actor Identifier Formatting Drift)** | Agents supplying `'Developer Agent'` or `'developer_agent'` could be rejected unexpectedly | Implement robust `canonicalizeActor()` helper normalising whitespace, underscores, and casing to lowercase kebab-case against `ROLE_REGISTRY`. |
| **R-003 (CAS Automation Race Conditions)** | Concurrent transitions on the same shard encounter `CAS_CONFLICT` | CLI and library return structured JSON error with `current_digest`, allowing callers to inspect and retry deterministically. |
| **R-004 (Review Gate Rejection on Script PR)** | PR modifying `.mjs` scripts blocked by `validate:review-gate` | Mandate creation of `docs/records/qa/2026-09-12-control-plane-state-integrity-code-review.md` in the same commit as script changes. |

---

## 9. Handoff

| To | Reason | Required Evidence |
|---|---|---|
| `qa-agent` | Verify implementation plan completeness, acceptance traceability matrix, and author Test Plan for Package 1 Control-Plane State Integrity. | Implementation Plan document, SDD reference, Requirement Discovery reference, Acceptance Traceability Matrix. |
