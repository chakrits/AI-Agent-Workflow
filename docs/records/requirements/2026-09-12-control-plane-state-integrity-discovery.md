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
| 1 | Upgrading active shards to envelope v2 does not conflict with the workflow policies, because the two version numbers govern different layers: the shard carries `contract_version: 2` (envelope) and `policy_contract_version: 1` (policy), and the validator cross-checks only the latter. | If the validator keeps comparing `contract_version` against `policy.contract_version`, every backfilled shard fails validation immediately. | Run `npm run validate:contracts` over both the eleven example fixtures and the migrated active shards. |
| 2 | Enforcing `matrixEntry.actors` strictly validates transition policy against caller-declared role identity without requiring cryptographic agent signatures. | Overly rigid actor checks could reject emergency overrides or legitimate backward routing handoffs. | Explicitly verify actor matrix covers orchestrator and human override roles where permitted in `TRANSITION_MATRIX`. Document residual trust boundary risk. |
| 3 | Mandatory `expected_digest` plus a per-shard `wx` lock that is never force-reclaimed, with disk state re-read inside `mutateTaskStateOnDisk`, eliminates two-process lost updates on a shard. The equivalent guarantee for `PROJECT_STATUS.md` requires the separate projection lock of BR-005; the shard lock alone does not provide it. | Scripts transitioning without reading current state first are rejected with `MISSING_EXPECTED_DIGEST` or `CAS_CONFLICT`; an abandoned lock stops that shard until an operator runs `unlock`. | Deterministic barrier-synchronized multi-process tests for both locks, plus the lock-order test. |
| 4 | Failing closed on malformed shards in `compileStatusProjection` via a shared validation seam (`validateEnvelopeSchema`) will prevent corrupt data from being silently excluded from project status. | A single malformed test file or scratch shard could block compiler runs across unrelated shards. | Ensure test fixtures create isolated temporary mock workspaces during unit tests. |

---

## 4. Open Questions

| # | Question | Owner | Blocks Progress? |
|---|---|---|---|
| 1 | Is the durable envelope the sole contract authority, or does it layer over the existing `*-workflow.yaml` policies that `AGENTS.md` names canonical? | SA / Human | Resolved (Round 4): Layered, not sole. Envelope owns storage shape at `contract_version: 2`; policies keep owning transitions, evidence and retry budget at `contract_version: 1`; the envelope's new `policy_contract_version` binds the two and is what the validator cross-checks (ADR-0026). Legacy `task-state.schema.json` is retained for historical audit only. |
| 2 | For CLI commands (`scripts/task-machine-cli.mjs`), should an optional `--force` flag exist for emergency Human Maintainer bypass of CAS digests, or must CAS always be strictly computed and supplied? | Security / SA | Resolved: CAS must always be strictly supplied; provide `inspect` command to display current digest for auditability without blind bypasses. |
| 3 | When `scripts/archive-work-item.mjs` moves a terminal shard, should it execute transactional archival with compensating rollback if status projection fails? | SA / Dev | Resolved: Implement two-phase archival with compensating directory restoration (ADR-0029). |
| 4 | Should an abandoned shard lock be reclaimed automatically after a staleness threshold? | SA / Security | Resolved (Round 4): No. No `fs` primitive makes removal conditional on the observed lock, so every automatic-reclaim variant can remove a live replacement owner. Fail closed with `LOCK_ABANDONED` and an explicit nonce-verified `unlock` command (ADR-0027). |
| 5 | Is atomic replacement of `PROJECT_STATUS.md` sufficient to prevent lost updates to the root projection? | SA / Human | Resolved (Round 4): No. Atomicity prevents torn bytes, not read-compile-write interleaving. A projection-level mutation lock with a declared total lock order is required (ADR-0030). |

---

## 5. Scope

### In Scope
- **Core Pain Point 1 (Two-Layer Contract Model - F-01, ADR-0026):** Establish an explicit two-layer contract model rather than a single authority. The **storage envelope** layer (`docs/contracts/schemas/durable-task-envelope.schema.json`, `contract_version: 2`) owns file shape: 11-state vocabulary, 64-char hex SHA-256 `state_digest`, strictly incremented `sequence_number`, history record shape. The **workflow behaviour** layer (`docs/contracts/{bug-fix,new-feature,config-change,data-change}-workflow.yaml`, `contract_version: 1`, unchanged) keeps owning allowed transitions, required evidence and retry budget, exactly as `AGENTS.md` states today. The envelope records `policy_contract_version` binding it to its governing policy, and `scripts/validate-contracts.mjs` cross-checks that field instead of `contract_version`. `bug-fix-workflow.yaml` is amended additively with `completed`/`cancelled` states and a `handoff -> completed` transition so that terminal migration is legal under policy. `AGENTS.md` is amended to state the split explicitly.
- **Core Pain Point 2 (Actor Policy Validation & Trust Boundaries - F-02):** Mandate enforcement of `matrixEntry.actors` check in `transitionTaskState()` for every transition against canonical `ROLE_REGISTRY`. Reject unauthorized role attempts with `UNAUTHORIZED_ACTOR` error code. Clarify scope as caller-declared role authorization and document residual risk.
- **Core Pain Point 3 (True Atomic CAS & Mutual Exclusion - F-03, ADR-0027, ADR-0028):** Make `expected_digest` mandatory for state transitions and resumes. Implement per-shard mutual exclusion file lock (`.lock` via `wx`) with **fail-closed abandonment**: the engine never reclaims a lock automatically, because no available filesystem primitive can make removal conditional on the lock that was observed. An abandoned lock raises `LOCK_ABANDONED` naming an explicit operator `unlock` command that re-verifies the nonce. Disk state is re-read under the lock inside a disk-bound mutation wrapper (`mutateTaskStateOnDisk`). Implement dedicated `digestTaskEnvelope(envelope)` which excludes top-level `state_digest` and computes canonical RFC 8785 JCS SHA-256 via `scripts/lib/status-jcs.mjs`.
- **Core Pain Point 4 (Fail-Closed Projection & Transactional Archival - W1, F-10, ADR-0029):**
  - Unified validation seam: implement `validateEnvelopeSchema(data)` shared across state machine, compiler, and backfill tools. Enforce schema structure and `stored state_digest === digestTaskEnvelope(data)`. Throw `MALFORMED_SHARD` on unparseable, invalid, or digest-mismatched shards.
  - POSIX crash-durable atomic writes: implement `atomicWriteFileSync` with collision-safe `wx` temp files, write completion loops, failure cleanup (`unlinkSync`), `fsyncSync` data flush, atomic rename, and directory sync.
  - Pure projection with explicit repair: `compileStatusProjection()` and `detectArchivedShardDrift()` are pure and write nothing; repair lives only in `reconcileArchivedShards()`, reachable from archival preflight and an explicit `--reconcile` flag. `--check` writes zero bytes and exits 1 naming a recovery command.
  - Projection transaction: serialize `PROJECT_STATUS.md` mutation behind a projection-level lock and re-read active shards only after acquiring it, under the declared total lock order shard lock -> projection lock.
  - Transactional archival & crash recovery: implement two-phase `archiveWorkItem` with compensating rollback if projection compilation fails, plus preflight drift reconciliation (`reconcileArchivedShards`).

### Out of Scope
- Cryptographic agent identity verification or process authentication (caller-declared role policy validation only; full signature infrastructure deferred).
- Modifying production application business code or schemas outside control-plane state management.
- Modifying token budgets or Core Bootloader Tier 1 context limits ($\le 3,500$ tokens).
- Relaxing the 2-cycle rework retry ceiling or human approval gate invariants.
- Introducing external database engines or distributed network consensus mechanisms (remains Local-First, Git-Native, POSIX file-based).
- Automatic recovery from abandoned locks. Explicitly rejected in ADR-0027: recovery is an operator action.

---

## 6. User Stories

| Story ID | As a | I want | So that | Priority |
|---|---|---|---|---|
| US-001 | Control Plane Orchestrator | A unified, canonical 11-state durable task envelope contract for all workflows | State shards across bug-fix, feature, meta, config, and data changes adhere to a single consistent contract version without 7-state vs 11-state schema conflicts. | High |
| US-002 | Security & Governance Guardian | State machine transitions to strictly validate the acting role against authorized actors in the transition matrix | Unauthorized agents or rogue processes cannot execute illegal state transitions or impersonate specialized roles (such as self-approving QA or skipping human gates). | High |
| US-003 | Workflow Concurrency Engine | Every state transition to require and enforce CAS expected digest verification under per-shard mutual exclusion | Concurrent agent operations or stale turn resumes cannot overwrite task state blindly or corrupt state history. | High |
| US-004 | Project Maintainer & CI Pipeline | Status projection compilation and archival to operate fail-closed with atomic file operations, compensation, and crash recovery | Malformed shards fail CI loudly, `PROJECT_STATUS.md` is never corrupted mid-write, and terminal tasks are reconciled cleanly without ghost entries. | High |

---

## 7. Acceptance Criteria

| AC ID | Related Story | Given | When | Then | Testable? |
|---|---|---|---|---|---|
| **AC-001** | US-001 | An active work item shard in `docs/records/work-items/{issue-id}/task-state.json` | Validated against repository contracts and schema rules | Shard validates successfully against `durable-task-envelope.schema.json` with `contract_version: 2`, 11-state enum, valid 64-character hex `state_digest` matching `digestTaskEnvelope(shard)`, integer `sequence_number` $\ge 1$, and a `policy_contract_version` matching its governing workflow policy's `contract_version`. | Yes |
| **AC-002** | US-001 | An active or proposed task state shard declaring legacy `contract_version: 1` or restricted 7-state vocabulary | Loaded or evaluated by the state machine engine or contract validator | Engine or validator flags or rejects the shard, requiring migration to canonical v2 envelope schema with clear diagnostic error. | Yes |
| **AC-003** | US-002 | A task currently in state `verifying` where authorized actors in `TRANSITION_MATRIX` are `['qa-agent']` | An actor other than `qa-agent` (e.g. `developer-agent` or `unauthorized-agent`) attempts to execute `transitionTaskState` to `handoff` | Transition is strictly rejected with error code `UNAUTHORIZED_ACTOR`, status `REJECTED`, and the state file remains completely unmutated. | Yes |
| **AC-004** | US-002 | A task in any state defined in `TRANSITION_MATRIX` | An authorized actor listed in `matrixEntry.actors` (or an authorized human/orchestrator where designated) initiates a permitted transition with all mandatory evidence | Transition succeeds, recording the actor in history, incrementing sequence number, and computing new CAS digest via `digestTaskEnvelope()`. | Yes |
| **AC-005** | US-003 | A state transition or resume request submitted to `task-state-machine` or `task-machine-cli.mjs` | The request omits `expected_digest` or provides an empty string | Operation is rejected immediately with error code `MISSING_EXPECTED_DIGEST`, status `REJECTED`, and no state modification occurs. | Yes |
| **AC-006** | US-003 | A state transition request submitted with an `expected_digest` that does not match the disk state's SHA-256 JCS digest, or two processes attempt concurrent transitions on the same digest | Mutating operation executes inside `mutateTaskStateOnDisk` under the per-shard lock | One operation succeeds; the second throws `CAS_CONFLICT`, returning both `current_digest` and `expected_digest` with state file untouched. | Yes |
| **AC-007** | US-004 | A work item directory in `docs/records/work-items/` contains an unparseable, schema-invalid, or digest-mismatched `task-state.json` file | `compileStatusProjection` or `validate:status-projection` is executed | Process aborts fail-closed with error code `MALFORMED_SHARD` and exit code `1`, refusing to emit a partial or deceptive projection. | Yes |
| **AC-008** | US-004 | `updateProjectStatusFile` writes to `PROJECT_STATUS.md` or `archiveWorkItem` moves a terminal shard | Writing content to disk or archiving terminal shard | Markdown content is written via POSIX atomic file writing (`.tmp` + write loop + temp cleanup + `fsyncSync` + atomic `rename` + dir sync) while holding the projection lock, with active shards re-read after acquisition; archival explicitly calls `updateProjectStatusFile()` with exception rollback; post-crash drift is repaired by archival preflight or explicit `--reconcile`. | Yes |
| **AC-009** | US-002 | A task in a terminal state (`completed` or `cancelled`), or in a state with no `TRANSITION_MATRIX` entry | Any outgoing transition is attempted | Terminal states reject with `ILLEGAL_TRANSITION_REJECTED` (empty `destinations`); a source state with no matrix entry rejects with `UNKNOWN_SOURCE_STATE` rather than skipping matrix validation. State file remains unmutated. | Yes |
| **AC-010** | US-004 | `npm run validate:status-projection` (`--check`) is executed against a repository with projection drift | The check runs to completion | Exit code is 1 with a diagnostic naming `npm run compile:status-projection -- --reconcile`, and **zero bytes change anywhere under the repository root** — the check performs no repair. | Yes |

---

## 8. Business Rules

| Rule ID | Rule | Source | Impacted Area |
|---|---|---|---|
| **BR-001** | **Two-Layer Contract Authority:** `durable-task-envelope.schema.json` is the sole authority for the storage envelope (`contract_version: 2`, 11-state vocabulary, digest, sequence). The `*-workflow.yaml` policies remain the sole authority for allowed transitions, required evidence and retry budget at `contract_version: 1`. A transition is legal only when permitted by **both** `TRANSITION_MATRIX.destinations` and the workflow policy; required evidence is taken from the policy. Unknown `workflow_id` fails closed. Legacy `task-state.schema.json` is retained for historical audit only. | Audit F-01, ADR-0026, AGENTS.md L274-276 | Task State Machine, JSON Schemas, Workflow Policies, `validate-contracts.mjs`, AGENTS.md |
| **BR-002** | **Strict Matrix Actor Authorization:** Every state transition must enforce actor authorization against `TRANSITION_MATRIX[fromState].actors`. Canonicalize actor identifiers to lowercase kebab-case against `ROLE_REGISTRY`. Unauthorized transitions fail closed with `UNAUTHORIZED_ACTOR`. | Audit F-02, Least Privilege Principle | `scripts/lib/task-state-machine.mjs`, CLI |
| **BR-003** | **Mandatory CAS Verification & Fail-Closed Shard Lock:** All state modifications and resumes must supply `expected_digest` matching `digestTaskEnvelope()`, and must run inside `mutateTaskStateOnDisk`, which acquires a per-shard `.lock` via `wx`, re-reads disk state under the lock, and releases in `finally`. The engine never removes a lock it does not own: an abandoned lock raises `LOCK_ABANDONED` and requires a nonce-verified operator `unlock`. Concurrent or stale mutations are rejected with `CAS_CONFLICT`. | Audit F-03, ADR-0027, ADR-0028 | `task-state-machine.mjs`, `task-machine-cli.mjs` |
| **BR-004** | **Fail-Closed Projection & Read-Only Checks:** Projection compilation must never skip malformed, invalid, or digest-mismatched shards silently. `compileStatusProjection()` and `detectArchivedShardDrift()` are pure and write nothing; repair exists only in `reconcileArchivedShards()`, reachable from archival preflight and explicit `--reconcile`. `--check` writes zero bytes and exits 1 with a named recovery command. Archival failure triggers compensating rollback. | Audit W1, F-10, ADR-0029 | `compile-status-projection.mjs`, `archive-work-item.mjs` |
| **BR-005** | **Projection Transaction & Total Lock Order:** Every mutation of `PROJECT_STATUS.md` must hold the projection lock and must recompile active shards **after** acquiring it. The total lock order is shard lock -> projection lock; no path may invert it. The projection lock uses the same fail-closed abandonment policy as the shard lock. | Round 4 Blocker 4, ADR-0030 | `compile-status-projection.mjs`, `archive-work-item.mjs` |

---

## 9. Risk / Edge Case Notes

| Risk ID | Risk / Edge Case | Impact | Suggested Coverage |
|---|---|---|---|
| **R-001** | **Legacy Active Shard Incompatibility:** Shards for `issue-249` and `issue-275` currently have `contract_version: 1` and lack `sequence_number` and `state_digest`. | High | Provide a deterministic migration / reconciliation backfill script to upgrade active shards to v2 format prior to activating strict schema gates. |
| **R-002** | **CLI Tool Usability Friction with Mandatory CAS:** Requiring `expected_digest` on manual CLI invocations could make quick developer testing cumbersome. | Medium | Provide an `inspect` helper command that displays the current digest and any lock holder without mutating anything, so callers can supply the digest explicitly. |
| **R-003** | **Actor Name Formatting Drift:** Actor names may be supplied as `developer-agent` or `Developer Agent` (capitalized with spaces). | Medium | Canonicalize actor identifiers to lowercase kebab-case (`ROLE_REGISTRY`) before matching against `matrixEntry.actors`. |
| **R-004** | **Mid-Write Crash on File Operations:** Interrupting writes leaves files corrupted or truncated, or leaks temp files. | High | Implement `atomicWriteFileSync(targetPath, content)` with collision-safe `wx` temp files, catch-block temp unlink, `fsyncSync`, atomic rename, and directory sync. |
| **R-005** | **Archival Desynchronization & Crash Drift:** If process is killed between shard move and status file update, repository is left in drift. | High | Two-phase archival with compensating rollback on exception, plus preflight `reconcileArchivedShards` on archival and an explicit `--reconcile` flag. Detection runs on every `--check`; repair never does. |
| **R-006** | **Abandoned Lock Blocks Progress:** A SIGKILL inside the critical section leaves a shard (or, worse, the repository-wide projection) unable to mutate until an operator intervenes. | Medium (shard) / High (projection) | Accepted deliberately (ADR-0027, ADR-0030). The critical section is read-validate-write with no waits; the failure is loud, names its recovery command, and the nonce-verified `unlock` cannot remove a replacement owner. |
| **R-007** | **Terminal-State Escape:** `completed` and `cancelled` have no matrix entry today, and the engine skips matrix validation when the source entry is absent, so a terminal task can transition onward. | High | Define empty-destination terminal entries and invert the guard to throw `UNKNOWN_SOURCE_STATE`; negative test every terminal outgoing transition (AC-009). |
| **R-008** | **Policy Gap Blocks Terminal Migration:** `bug-fix-workflow.yaml` defines neither `completed` nor `handoff -> completed`, so migrating issue-249 / issue-275 to a terminal state is illegal under current policy. | High | Additive policy amendment adding `completed`/`cancelled` and `handoff -> completed` (requires `closeout_evidence`), leaving `contract_version: 1` and all eleven example fixtures untouched. |

---

## 10. Quality Governance Invariants

| Invariant ID | Governance Invariant | Source | Verification |
|---|---|---|---|
| **QG-001** | **Review Gate Enforcement:** Any commit modifying or adding `.mjs`/`.js` files must include a corresponding QA code review record under `docs/records/qa/*-code-review.md`. | Repository CI Gate | `npm run validate:review-gate` |
| **QG-002** | **Deterministic Functional Invariants:** Zero lost updates on concurrent mutations; crash resilience (file contains 100% old or 100% new content); zero temp leaks; zero lock leaks across both success and failure paths. | ADR-0027, ADR-0029 | Integration test suite in `test/` |

---

## 11. Recommended Next Step

| Next Agent / Skill | Reason | Required Input |
|---|---|---|
| **SA Agent (`sa-architecture-design`)** | Finalize SDD with the two-layer contract model, fail-closed locking, the acyclic projection call graph, and the projection transaction with its total lock order. | Requirement Discovery artifact |
| **Security Reviewer (`security-review`)** | Conditional review updated for atomic lock takeover and digest integrity scope. | Updated SDD |
| **Developer Lead (`implementation-planning`)** | Structure sliced implementation plan following template with checkpoints. | Approved SDD |
| **QA Lead (`functional-test-design`)** | Build the Full Mode test plan: IPO/business-flow analysis, complete valid/invalid transition matrix, guard decision table, risk ranking, exploratory charter, handoff, and a mutation ledger, with explicit fixtures and synchronization barriers. | Approved SDD |
