# Requirement Discovery: Control-Plane State Integrity & Architecture Remediation

## 1. Request Summary

| Item | Detail |
|---|---|
| Change Type | Framework / Meta Architecture Remediation (Package 1) |
| Business Goal | Remediate critical control-plane state integrity, security, and concurrency vulnerabilities discovered in dynamic workflow state management: eliminate legacy v1 vs v2 schema discrepancies, enforce strict actor authorization matrix checks during state transitions, mandate cryptographic SHA-256 CAS digest verification on every state mutation, harden the status projection pipeline with fail-closed shard ingestion and atomic writes, and establish archival reconciliation for terminal tasks. |
| Target Users / Actors | AI Agents (Orchestrator, BA, SA, Developer, QA, PM, Config, Documentation, Release, Security, Data), Human Maintainer / Boss, CI Pipeline |
| Business Criticality | High |
| Code Change Required | Yes (Architecture & Framework Control Plane) |
| Security/Data Sensitivity | Yes (Access Control, Actor Policy Validation, State Tampering & Concurrency Integrity) |

---

## 2. Confirmed Facts

| # | Fact | Source / Reference |
|---|---|---|
| 1 | **Schema Discrepancy (F-01):** Two conflicting schemas exist in `docs/contracts/schemas/`: legacy `task-state.schema.json` enforces a 7-state model (`intake`, `investigating`, `implementing`, `verifying`, `rework`, `handoff`, `blocked`) restricted to `bug-fix`, while `durable-task-envelope.schema.json` defines the canonical v2 11-state model (`intake`, `investigating`, `designing`, `planning`, `implementing`, `verifying`, `rework`, `handoff`, `blocked`, `completed`, `cancelled`) supporting multi-workflow types (`bug-fix`, `new-feature`, `framework-meta`, `config-change`, `data-change`). Existing active shards (`issue-249`, `issue-275`) still carry legacy `contract_version: 1`. | `docs/contracts/schemas/durable-task-envelope.schema.json`<br>`docs/contracts/schemas/task-state.schema.json`<br>`docs/records/work-items/issue-249/task-state.json` |
| 2 | **Actor Authorization Bypass (F-02):** In `scripts/lib/task-state-machine.mjs`, `TRANSITION_MATRIX` defines permitted `actors` per state (e.g. `verifying` only allows `qa-agent`, `designing` only allows `sa-agent`, `blocked` requires `human`/`orchestrator`), but `transitionTaskState()` never validates the incoming `actor` parameter against `matrixEntry.actors`. Any role (or undeclared string) can execute any transition without authorization checks. | `scripts/lib/task-state-machine.mjs` lines 43–89, 217–295 |
| 3 | **Optional CAS Bypass (F-03):** In `scripts/lib/task-state-machine.mjs` (line 232) and CLI `scripts/task-machine-cli.mjs` (lines 102, 120), CAS digest verification is purely optional (`if (expected_digest !== undefined)`). Any caller omitting `--expected-digest` bypasses CAS checks entirely, permitting silent concurrent state overwrites and race conditions. | `scripts/lib/task-state-machine.mjs` lines 161–173, 232–234<br>`scripts/task-machine-cli.mjs` lines 102, 120 |
| 4 | **Projection Shard Fail-Open (W1):** In `scripts/compile-status-projection.mjs` (`discoverActiveShards`), an unparseable or malformed `task-state.json` shard is caught by a `try/catch` block that logs a console error and silently skips the shard. This fails open, dropping corrupted or tampered tasks from `PROJECT_STATUS.md` without failing CI or compilation. | `scripts/compile-status-projection.mjs` lines 47–55 |
| 5 | **Non-Atomic Root Projection Writes (F-10):** In `scripts/compile-status-projection.mjs` (`updateProjectStatusFile`), `PROJECT_STATUS.md` is updated using non-atomic `fs.writeFileSync(filePath, newContent, 'utf8')`. A mid-write crash or process interruption leaves `PROJECT_STATUS.md` truncated or corrupted, violating crash durability invariants. | `scripts/compile-status-projection.mjs` line 152 |
| 6 | **Projection & Archival Reconciliation Gap (F-10):** `scripts/compile-status-projection.mjs` discovers any active shard regardless of its `state`, continuing to project `completed` or `cancelled` tasks until manually archived by `scripts/archive-work-item.mjs`. Conversely, if `archive-work-item.mjs` moves a shard to `archive/`, `updateProjectStatusFile` is not automatically re-run, leaving stale entries in `PROJECT_STATUS.md`. | `scripts/compile-status-projection.mjs` lines 32–61<br>`scripts/archive-work-item.mjs` lines 16–80 |

---

## 3. Assumptions

| # | Assumption | Impact if Wrong | Validation Needed |
|---|---|---|---|
| 1 | Upgrading all active shards (`issue-249`, `issue-275`) to canonical envelope schema v2 (`contract_version: 2`, 11-state vocabulary, sequence number, digest) will not break downstream readers if legacy `task-state.schema.json` is preserved as a deprecated redirect or compatibility schema. | Legacy test suites or external scripts expecting v1 7-state structure might fail schema validation. | Run `npm run validate:contracts` and contract test suite across all fixture shards. |
| 2 | Enforcing `matrixEntry.actors` strictly validates transition policy against caller-declared role identity without requiring cryptographic agent signatures. | Overly rigid actor checks could reject emergency overrides or legitimate backward routing handoffs. | Explicitly verify actor matrix covers orchestrator and human override roles where permitted in `TRANSITION_MATRIX`. Document residual trust boundary risk. |
| 3 | Making `expected_digest` mandatory on all state transitions and resumes, paired with per-shard lockfiles (`.lock` via `wx`) and re-reading disk state under lock, will eliminate two-process lost updates. | Scripts performing transitions without reading the current state first will be rejected with `MISSING_EXPECTED_DIGEST` or `CAS_CONFLICT`. | Validate `task-machine-cli.mjs` caller workflow and automated concurrency test harnesses. |
| 4 | Failing closed on malformed shards in `compileStatusProjection` via a shared validation seam (`validateEnvelopeSchema`) will prevent corrupt data from being silently excluded from project status. | A single malformed test file or scratch shard could block compiler runs across unrelated shards. | Ensure test fixtures create isolated temporary mock workspaces during unit tests. |

---

## 4. Open Questions

| # | Question | Owner | Blocks Progress? |
|---|---|---|---|
| 1 | Should legacy `task-state.schema.json` be permanently deprecated and retained strictly for historical archive audit, while `durable-task-envelope.schema.json` serves as the sole canonical authority for active control plane? | SA / Human | Resolved: Retain v1 strictly for historical audit; mandate v2 envelope for all active shards (ADR-0026). |
| 2 | For CLI commands (`scripts/task-machine-cli.mjs`), should an optional `--force` flag exist for emergency Human Maintainer bypass of CAS digests, or must CAS always be strictly computed and supplied? | Security / SA | Resolved: CAS must always be strictly supplied; provide `inspect` command to display current digest for auditability without blind bypasses. |
| 3 | When `scripts/archive-work-item.mjs` moves a terminal shard, should it execute transactional archival with compensating rollback if status projection fails? | SA / Dev | Resolved: Implement two-phase archival with compensating directory restoration (ADR-0029). |

---

## 5. Scope

### In Scope
- **Core Pain Point 1 (State Contract & Schema Layering - F-01, ADR-0026):** Establish `durable-task-envelope.schema.json` as the canonical authority for durable task storage envelope. Decouple domain workflow policies (e.g. `bug-fix-workflow.yaml`) from storage envelope. Require all active task state shards to adhere to canonical v2 envelope schema (`contract_version: 2`, 64-char hex SHA-256 `state_digest`, strictly incremented `sequence_number`, 11-state lifecycle).
- **Core Pain Point 2 (Actor Policy Validation & Trust Boundaries - F-02):** Mandate enforcement of `matrixEntry.actors` check in `transitionTaskState()` for every transition against canonical `ROLE_REGISTRY`. Reject unauthorized role attempts with `UNAUTHORIZED_ACTOR` error code. Clarify scope as caller-declared role authorization and document residual risk.
- **Core Pain Point 3 (True Atomic CAS & Mutual Exclusion - F-03, ADR-0027, ADR-0028):** Make `expected_digest` mandatory for state transitions and resumes. Implement per-shard mutual exclusion file lock (`.lock` via `wx`) with disk re-read under lock to eliminate two-process lost updates. Unify hashing with canonical RFC 8785 JCS in `scripts/lib/status-jcs.mjs`.
- **Core Pain Point 4 (Fail-Closed Projection & Transactional Archival - W1, F-10, ADR-0029):**
  - Unified validation seam: implement `validateEnvelopeSchema(data)` shared across state machine, compiler, and backfill tools. Throw `MALFORMED_SHARD` on unparseable or schema-violating shards.
  - POSIX crash-durable atomic writes: implement `atomicWriteFileSync` with collision-safe `wx` temp files, `fsyncSync` data flush, atomic rename, and directory sync.
  - Transactional archival: implement two-phase `archiveWorkItem` with compensating rollback if projection compilation fails.

### Out of Scope
- Cryptographic agent identity verification or process authentication (caller-declared role policy validation only; full signature infrastructure deferred).
- Modifying production application business code or schemas outside control-plane state management.
- Modifying token budgets or Core Bootloader Tier 1 context limits ($\le 3,500$ tokens).
- Relaxing the 2-cycle rework retry ceiling or human approval gate invariants.
- Introducing external database engines or distributed network consensus mechanisms (remains Local-First, Git-Native, POSIX file-based).

---

## 6. User Stories

| Story ID | As a | I want | So that | Priority |
|---|---|---|---|---|
| US-001 | Control Plane Orchestrator | A unified, canonical 11-state durable task envelope contract for all workflows | State shards across bug-fix, feature, meta, config, and data changes adhere to a single consistent contract version without 7-state vs 11-state schema conflicts. | High |
| US-002 | Security & Governance Guardian | State machine transitions to strictly validate the acting role against authorized actors in the transition matrix | Unauthorized agents or rogue processes cannot execute illegal state transitions or impersonate specialized roles (such as self-approving QA or skipping human gates). | High |
| US-003 | Workflow Concurrency Engine | Every state transition to require and enforce CAS expected digest verification under per-shard mutual exclusion | Concurrent agent operations or stale turn resumes cannot overwrite task state blindly or corrupt state history. | High |
| US-004 | Project Maintainer & CI Pipeline | Status projection compilation and archival to operate fail-closed with atomic file operations and compensation | Malformed shards fail CI loudly, `PROJECT_STATUS.md` is never corrupted mid-write, and terminal tasks are reconciled cleanly without ghost entries. | High |

---

## 7. Acceptance Criteria

| AC ID | Related Story | Given | When | Then | Testable? |
|---|---|---|---|---|---|
| **AC-001** | US-001 | An active work item shard in `docs/records/work-items/{issue-id}/task-state.json` | Validated against repository contracts and schema rules | Shard validates successfully against canonical `durable-task-envelope.schema.json` with `contract_version: 2`, 11-state enum, valid 64-character hex `state_digest`, and integer `sequence_number` $\ge 1$. | Yes |
| **AC-002** | US-001 | An active or proposed task state shard declaring legacy `contract_version: 1` or restricted 7-state vocabulary | Loaded or evaluated by the state machine engine or contract validator | Engine or validator flags or rejects the shard, requiring migration to canonical v2 envelope schema with clear diagnostic error. | Yes |
| **AC-003** | US-002 | A task currently in state `verifying` where authorized actors are `['qa-agent']` | An actor other than `qa-agent` (e.g. `developer-agent` or `unauthorized-agent`) attempts to execute `transitionTaskState` to `handoff` | Transition is strictly rejected with error code `UNAUTHORIZED_ACTOR`, status `REJECTED`, and the state file remains completely unmutated. | Yes |
| **AC-004** | US-002 | A task in any state defined in `TRANSITION_MATRIX` | An authorized actor listed in `matrixEntry.actors` (or an authorized human/orchestrator where designated) initiates a permitted transition with all mandatory evidence | Transition succeeds, recording the actor in history, incrementing sequence number, and computing new CAS digest. | Yes |
| **AC-005** | US-003 | A state transition or resume request submitted to `task-state-machine` or `task-machine-cli.mjs` | The request omits `expected_digest` or provides an empty string | Operation is rejected immediately with error code `MISSING_EXPECTED_DIGEST`, status `REJECTED`, and no state modification occurs. | Yes |
| **AC-006** | US-003 | A state transition request submitted with an `expected_digest` that does not match the disk state's SHA-256 JCS digest, or two processes attempt concurrent transitions on the same digest | Mutating operation executes under per-shard lock | One operation succeeds; the second throws `CAS_CONFLICT`, returning both `current_digest` and `expected_digest` with state file untouched. | Yes |
| **AC-007** | US-004 | A work item directory in `docs/records/work-items/` contains an unparseable or schema-invalid `task-state.json` file | `compileStatusProjection` or `validate:status-projection` is executed | Process aborts fail-closed with error code `MALFORMED_SHARD` and exit code `1`, refusing to emit a partial or deceptive projection. | Yes |
| **AC-008** | US-004 | `updateProjectStatusFile` writes to `PROJECT_STATUS.md` or `archiveWorkItem` moves a terminal shard | Writing content to disk or archiving terminal shard | Markdown content is written via POSIX atomic file writing (`.tmp` + `fsyncSync` + atomic `rename` + dir sync); if projection compilation fails during archival, shard directory move is rolled back with compensation. | Yes |

---

## 8. Business Rules

| Rule ID | Rule | Source | Impacted Area |
|---|---|---|---|
| **BR-001** | **Canonical Durable Envelope Authority:** `docs/contracts/schemas/durable-task-envelope.schema.json` is the sole canonical authority for durable task states in the control plane. All active task states must declare `contract_version: 2` and adhere to the 11-state lifecycle model. Legacy `task-state.schema.json` is deprecated. | Audit F-01, ADR-0026 | Task State Machine, JSON Schemas, Shard Validator |
| **BR-002** | **Strict Matrix Actor Authorization:** Every state transition must enforce actor authorization against `TRANSITION_MATRIX[fromState].actors`. Canonicalize actor identifiers to lowercase kebab-case against `ROLE_REGISTRY`. Unauthorized transitions fail closed with `UNAUTHORIZED_ACTOR`. | Audit F-02, Least Privilege Principle | `scripts/lib/task-state-machine.mjs`, CLI |
| **BR-003** | **Mandatory Cryptographic CAS Verification & Shard Lock:** All state modifications and resumes must supply `expected_digest` matching the current RFC 8785 JCS SHA-256 digest of the state. Transitions acquire a per-shard `.lock` via `wx` and re-read disk state under lock. Concurrent or stale mutations must be rejected with `CAS_CONFLICT`. | Audit F-03, ADR-0027, ADR-0028 | `task-state-machine.mjs`, `task-machine-cli.mjs` |
| **BR-004** | **Fail-Closed Projection & Transactional Durability:** Projection compilation must never skip malformed or unreadable shards silently. Corrupted shards must fail CI and CLI compilation immediately. All updates to `PROJECT_STATUS.md` must use POSIX atomic file writing. Archival failure must trigger compensating rollback. | Audit W1, F-10, ADR-0029 | `compile-status-projection.mjs`, `archive-work-item.mjs` |

---

## 9. Risk / Edge Case Notes

| Risk ID | Risk / Edge Case | Impact | Suggested Coverage |
|---|---|---|---|
| **R-001** | **Legacy Active Shard Incompatibility:** Shards for `issue-249` and `issue-275` currently have `contract_version: 1` and lack `sequence_number` and `state_digest`. | High | Provide a deterministic migration / reconciliation backfill script to upgrade active shards to v2 format prior to activating strict schema gates. |
| **R-002** | **CLI Tool Usability Friction with Mandatory CAS:** Requiring `expected_digest` on manual CLI invocations could make quick developer testing cumbersome. | Medium | Provide an `inspect` helper command that displays the current digest so callers can supply it explicitly. |
| **R-003** | **Actor Name Formatting Drift:** Actor names may be supplied as `developer-agent` or `Developer Agent` (capitalized with spaces). | Medium | Canonicalize actor identifiers to lowercase kebab-case (`ROLE_REGISTRY`) before matching against `matrixEntry.actors`. |
| **R-004** | **Mid-Write Crash on File Operations:** Interrupting writes leaves files corrupted or truncated. | High | Implement `atomicWriteFileSync(targetPath, content)` with collision-safe `wx` temp files, `fsyncSync`, atomic rename, and directory sync. |
| **R-005** | **Archival Desynchronization & Failure:** If projection fails after shard directory move, repository is left in inconsistent state. | High | Implement two-phase archival with compensating rollback: move directory back if compilation throws error. |

---

## 10. Quality Governance Invariants

| Invariant ID | Governance Invariant | Source | Verification |
|---|---|---|---|
| **QG-001** | **Review Gate Enforcement:** Any commit modifying or adding `.mjs`/`.js` files must include a corresponding QA code review record under `docs/records/qa/*-code-review.md`. | Repository CI Gate | `npm run validate:review-gate` |
| **QG-002** | **Deterministic Functional Invariants:** Zero lost updates on concurrent mutations; crash resilience (file contains 100% old or 100% new content); zero lock leaks across both success and failure paths. | ADR-0027, ADR-0029 | Integration test suite in `test/` |

---

## 11. Recommended Next Step

| Next Agent / Skill | Reason | Required Input |
|---|---|---|
| **SA Agent (`sa-architecture-design`)** | Software Design Document (SDD) reworked and approved. | Requirement Discovery artifact |
| **Security Reviewer (`security-review`)** | Conduct formal security audit on actor policy validation, trust boundaries, and per-shard locking. | Requirement Discovery and SDD |
| **Developer Lead (`implementation-planning`)** | Update implementation plan reflecting per-shard locking, shared validation seam, and transactional archival. | Approved SDD |
| **QA Lead (`functional-test-design`)** | Update test plan and traceability matrix reflecting deterministic functional invariants. | Approved SDD |

---

## 12. Illustrative Interaction Sketch

> Illustrative — not a UI spec. Stops at what appears and in what order; no layout, component, or visual detail.

### Hardened Checkpointed State Transition Flow with Per-Shard Lock

```text
[Acting Agent (e.g. qa-agent)]
       │
       ▼ (1. Inspect & Retrieve Current State & Digest)
[task-state.json (Disk)] ──► Digest: 'a1b2c3...64hex'
       │
       ▼ (2. Submit Transition Request with mandatory expected_digest & actor)
[task-state-machine: executeAtomicTransition]
       ├─ Step A: Acquire Shard Lock (.lock via openSync 'wx' with 30s stale recovery)
       ├─ Step B: Re-read disk state under lock
       ├─ Step C: Validate Envelope Schema (shared validateEnvelopeSchema)
       ├─ Step D: CAS Verification (expected_digest === digestJcs(diskState)? If mismatch -> CAS_CONFLICT)
       ├─ Step E: Actor Authorization (canonicalActor in matrixEntry.actors? If no -> UNAUTHORIZED_ACTOR)
       ├─ Step F: Mandatory Evidence Validation (All required keys present? If no -> MISSING_REQUIRED_EVIDENCE)
       ├─ Step G: Rework Budget Check (rework_count < max_rework_attempts)
       ├─ Step H: Construct Next State (seq++, append history, compute new SHA-256 JCS digest)
       ├─ Step I: POSIX Atomic Write (.tmp-wx -> fsync fd -> rename -> fsync dir)
       └─ Step J: Release Shard Lock in finally block (unlinkSync .lock)
       │
       ▼ (3. Status Projection Compilation)
[compile-status-projection]
       ├─ Step A: Scan work-items/* using shared validateEnvelopeSchema (Fail-closed -> MALFORMED_SHARD)
       ├─ Step B: Exclude archive/* and reconcile terminal states
       └─ Step C: POSIX Atomic Write to PROJECT_STATUS.md (.tmp-wx -> fsync fd -> rename -> fsync dir)
```
