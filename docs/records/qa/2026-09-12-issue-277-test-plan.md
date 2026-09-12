# TEST_PLAN.md: Control-Plane State Integrity & Architecture Remediation

## Metadata

- Work Item ID: Issue #277
- Title: Control-Plane State Integrity & Architecture Remediation (Package 1)
- Owner: QA Lead (`qa-agent`)
- Date: 2026-09-12
- Status: Draft (Rework Round 4 — Addressing Maintainer Review #5644452415) — **Full Mode** (high-risk framework change)
- Governing SDD: `docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md` (Round 4, Draft)
- Governing Requirements: `docs/records/requirements/2026-09-12-control-plane-state-integrity-discovery.md` (AC-001..AC-010, BR-001..BR-005)

---

## 1. Scope

### In-Scope
- Two-layer contract model: envelope v2 storage shape over workflow policy v1 behaviour, bound by `policy_contract_version`.
- Envelope hashing (`digestTaskEnvelope`) with `state_digest` self-exclusion and stored-digest equality on load.
- Actor policy validation, terminal-state closure, and the fail-closed `UNKNOWN_SOURCE_STATE` guard.
- Mandatory CAS under the fail-closed per-shard lock, inside `mutateTaskStateOnDisk`.
- Abandoned-lock refusal and the nonce-verified `unlock` recovery surface.
- POSIX crash-durable atomic writing with temp cleanup.
- Projection purity: zero bytes written by `compileStatusProjection`, `detectArchivedShardDrift`, and `--check`.
- Projection transaction: projection lock, post-acquisition recompile, total lock order.
- Transactional archival with compensation, and compensation-failure reporting.
- Evidence-bound migration of issue-249 and issue-275.

### Out-of-Scope
- Cryptographic agent identity verification (process signing) — NG-001.
- Unbacked numeric latency/throughput NFR benchmarks — NG-002.
- External database integrations — NG-003.
- Automatic abandoned-lock recovery — NG-004, explicitly rejected by ADR-0027; tested only as a *refusal*.

---

## 2. Business Flow & IPO Analysis

### 2.1 Business Flow

```text
Agent decides a transition
  -> inspect (read digest + lock holder)
  -> mutateTaskStateOnDisk(shard, {to, actor, expected_digest, evidence})
       -> acquire shard lock            [refuse if abandoned]
       -> re-read + validate envelope   [refuse if malformed / digest mismatch]
       -> CAS compare                   [refuse if stale]
       -> matrix ∩ policy legality      [refuse if illegal / unauthorized / evidence missing]
       -> pure transition + atomic write
       -> release lock
  -> (terminal) archiveWorkItem
       -> reconcile preflight -> move shard -> updateProjectStatusFile [projection lock] -> compensate on failure
  -> CI: validate:status-projection --check  [read-only; drift => exit 1 + recovery command]
```

### 2.2 IPO Matrix

| # | Process | Input | Processing | Output | Failure Output |
|---|---|---|---|---|---|
| IPO-1 | `digestTaskEnvelope` | Envelope object | Shallow copy, delete `state_digest`, RFC 8785 JCS SHA-256 | 64-hex digest; argument unmodified | `Invalid envelope object` on non-object |
| IPO-2 | `validateEnvelopeSchema` | Envelope object | Ajv envelope schema, then `stored === computed` | Validated envelope | `MALFORMED_SHARD`, `DIGEST_INTEGRITY_MISMATCH` (with both digests) |
| IPO-3 | `acquireShardLock` | Shard dir | `openSync('wx')`; on EEXIST inspect age and PID | Nonce | `LOCK_ACQUISITION_TIMEOUT`, `LOCK_ABANDONED` (lock left intact) |
| IPO-4 | `mutateTaskStateOnDisk` | Shard path, `{to, actor, expected_digest, evidence, mode}` | Lock, re-read, validate, CAS, legality, pure transition, atomic write, release | New envelope on disk, `sequence_number + 1` | `MISSING_EXPECTED_DIGEST`, `CAS_CONFLICT`, `UNAUTHORIZED_ACTOR`, `ILLEGAL_TRANSITION_REJECTED`, `UNKNOWN_SOURCE_STATE`, `MISSING_REQUIRED_EVIDENCE` |
| IPO-5 | `compileStatusProjection` | Root dir | Read + validate every active shard, render table | `{markdown, digest}`; **no writes** | `MALFORMED_SHARD` |
| IPO-6 | `detectArchivedShardDrift` | Root dir | Compare archive/, work-items/, `PROJECT_STATUS.md` | `{drifted, findings[]}`; **no writes** | — |
| IPO-7 | `updateProjectStatusFile` | Root dir | Acquire projection lock, **then** compile, atomic write, release | `{updated, digest}` | `LOCK_ABANDONED`, `LOCK_ACQUISITION_TIMEOUT`, `MALFORMED_SHARD` |
| IPO-8 | `archiveWorkItem` | Issue id | Preflight reconcile, move shard, update projection, compensate on throw | Shard under `archive/`, projection current | `ARCHIVE_RECONCILIATION_FAILED` (+ `compensation_failed` when the rename back also fails) |
| IPO-9 | `checkProjectStatusSync` | Root dir | Pure compile + pure detect | `{inSync, digest}` or `{inSync:false, reason, recovery}` | exit 1, zero bytes changed |
| IPO-10 | `backfillTaskStateV2` | v1 shard path | Add `contract_version: 2`, `policy_contract_version`, `sequence_number`, digest | v2 shard; idempotent | `--rollback` restores the byte-identical original |

---

## 3. State Transition Matrix (Envelope Layer, Complete)

Rows = source state, columns = destination. `Y` permitted by `TRANSITION_MATRIX`; `-` rejected with
`ILLEGAL_TRANSITION_REJECTED`. A source state absent from the matrix rejects with `UNKNOWN_SOURCE_STATE`.

| from \ to | intake | investigating | designing | planning | implementing | verifying | rework | handoff | blocked | completed | cancelled |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **intake** | - | Y | Y | - | - | - | - | - | - | - | Y |
| **investigating** | - | - | Y | Y | - | - | - | - | Y | - | Y |
| **designing** | - | - | - | Y | - | - | - | - | Y | - | Y |
| **planning** | - | - | - | - | Y | - | - | - | Y | - | Y |
| **implementing** | - | - | - | - | - | Y | - | - | Y | - | Y |
| **verifying** | - | - | - | - | - | - | Y | Y | Y | - | Y |
| **rework** | - | - | - | - | Y | - | - | - | Y | - | Y |
| **handoff** | - | - | - | - | - | - | - | - | Y | Y | Y |
| **blocked** | Y | Y | Y | Y | Y | Y | Y | Y | - | Y | Y |
| **completed** | - | - | - | - | - | - | - | - | - | - | - |
| **cancelled** | - | - | - | - | - | - | - | - | - | - | - |

**Policy overlay (narrowing).** Effective legality is the intersection of this matrix with the shard's
workflow policy. For `bug-fix` after the Task 1 amendment, the permitted set is
`intake->investigating`, `investigating->implementing`, `investigating->blocked`,
`implementing->verifying`, `verifying->handoff`, `verifying->rework`, `verifying->blocked`,
`rework->implementing`, `handoff->completed`, and `* ->cancelled`. Pairs that the matrix permits but the
policy omits — for example `intake->designing` on a bug-fix shard — must be rejected; TC-024 covers this
intersection explicitly, because a matrix-only check would silently allow them.

### Invalid-Transition Classes

| Class | Example | Expected | Case |
|---|---|---|---|
| Terminal outgoing | `completed -> handoff`, `cancelled -> implementing` | `ILLEGAL_TRANSITION_REJECTED` | TC-021 (all 20 pairs) |
| Unknown source state | `state: "archived"` | `UNKNOWN_SOURCE_STATE` | TC-022 |
| Self-transition | `verifying -> verifying` | `ILLEGAL_TRANSITION_REJECTED` | TC-023 |
| Matrix-permitted, policy-forbidden | `intake -> designing` on `workflow_id: bug-fix` | `ILLEGAL_TRANSITION_REJECTED` | TC-024 |
| Unknown workflow | `workflow_id: "made-up"` | fail closed | TC-024 |
| Stage skip | `intake -> verifying` | `ILLEGAL_TRANSITION_REJECTED` | TC-023 |

---

## 4. Guard Decision Table

Evaluation order is normative — each guard is tested both in isolation and for ordering, since a guard
that runs after a mutation is worthless.

| Order | Guard | Condition | Reject Code | Case |
|---|---|---|---|---|
| 1 | Lock acquisition | Lock held and live | `LOCK_ACQUISITION_TIMEOUT` | TC-013 |
| 1b | Lock abandonment | Lock stale > 30 s or PID dead | `LOCK_ABANDONED` (lock left intact) | TC-014 |
| 2 | Envelope schema | Ajv failure | `MALFORMED_SHARD` | TC-003, TC-015 |
| 3 | Digest integrity | `stored !== digestTaskEnvelope(data)` | `DIGEST_INTEGRITY_MISMATCH` | TC-002, TC-016 |
| 4 | CAS presence | `expected_digest` missing or empty | `MISSING_EXPECTED_DIGEST` | TC-009, TC-010 |
| 5 | CAS equality | `expected_digest !== stored` | `CAS_CONFLICT` | TC-011, TC-012 |
| 6 | Source state known | No matrix entry | `UNKNOWN_SOURCE_STATE` | TC-022 |
| 7 | Destination legality | Not in matrix ∩ policy | `ILLEGAL_TRANSITION_REJECTED` | TC-021, TC-023, TC-024 |
| 8 | Actor authorization | Canonical actor not in `actors` | `UNAUTHORIZED_ACTOR` | TC-005, TC-006 |
| 9 | Evidence | Policy-required key missing or empty | `MISSING_REQUIRED_EVIDENCE` | TC-007 |
| 9b | Terminal evidence | `cancellation_reason` / `stop_reason` missing | `MISSING_REQUIRED_EVIDENCE` | TC-025 |
| 10 | Rework ceiling | `rework_count >= max_rework_attempts` | ceiling rejection | existing regression |
| 11 | Human gate | Leaving `blocked` without human actor + approver | `HUMAN_APPROVAL_REQUIRED` | existing regression |

Every reject path asserts the shard file is byte-identical afterwards.

---

## 5. Risk Ranking (Test Prioritization)

| Rank | Risk | Likelihood | Impact | Priority | Cases |
|---|---|---|---|---|---|
| 1 | Lost update to `PROJECT_STATUS.md` via read-compile-write interleaving | Medium | High — recreates the ghost entry AC-008 exists to remove | P0 | TC-026, TC-027 |
| 2 | Terminal-state escape through the absent-matrix-entry hole | Medium | High — a completed task re-enters the pipeline | P0 | TC-021, TC-022 |
| 3 | Repairing `--check` hides the drift CI exists to detect | Medium | High — silent governance failure | P0 | TC-020, TC-028 |
| 4 | Lost update on a shard (CAS or lock defect) | Low | High | P0 | TC-011, TC-012 |
| 5 | Digest self-reference or tampering undetected | Low | High | P0 | TC-001, TC-002, TC-016 |
| 6 | Backfill breaks the two live shards | Medium | Medium — recoverable from backup | P1 | TC-004, TC-029 |
| 7 | Matrix and policy drift apart after this change | Medium | Medium | P1 | TC-024 |
| 8 | Abandoned lock wedges CI (accepted risk) | Low | Medium | P1 | TC-014, TC-030 |
| 9 | Temp or lock file leakage | Low | Low | P2 | TC-017, TC-031 |

---

## 6. Test Types In Scope

- [ ] Unit — hasher, guards, matrix, writer
- [ ] Contract — envelope v2, `policy_contract_version` binding, policy amendment, existing fixtures
- [ ] Concurrency & Contention — barrier-synchronized multi-process, lock order
- [ ] Fault Injection & Crash Boundaries — write failure, archival compensation, compensation failure
- [ ] Read-Only Assertion — whole-tree byte equality
- [ ] CLI — mandatory CAS flags, `inspect`, `unlock`
- [ ] Integration — projection, archival, reconcile idempotency, backfill
- [ ] Regression — full repository suite
- [ ] Review Gate Governance — QG-001

---

## 7. Environment

- Node.js >= 22, ESM, `node:test` + `node:assert/strict`.
- Fixtures in isolated `os.tmpdir()` workspaces; no test touches the real repository tree.
- Multi-process cases use `child_process.spawn` on a fixture-scoped harness script, never on repository state.

### Synchronization Harness (used by every multi-process case)

Barriers are filesystem sentinels inside the fixture directory, polled at 5 ms with a 10 s ceiling that
fails the test rather than hanging:

| Barrier file | Meaning |
|---|---|
| `barriers/observed` | Child has read the shard and holds its `expected_digest` |
| `barriers/released` | Parent permits children to proceed into the mutation |
| `barriers/a-done` | Child A has completed its write and released its lock |
| `barriers/b-attempt` | Child B is about to attempt its mutation |

Child command shape, identical across TC-012, TC-026 and TC-027:

```bash
node test/fixtures/issue-277/concurrent-mutator.mjs \
  --root "$FIXTURE_ROOT" \
  --task issue-fixture \
  --to investigating \
  --actor ba-agent \
  --wait-barrier observed \
  --release-barrier released \
  --emit-json
```

The harness exits `0` on success and `1` on rejection, printing `{"code": "...", "sequence_number": N}`
on stdout so the parent asserts on the code rather than on a message string.

---

## 8. Entry Criteria

- [x] Round 4 Requirement Discovery available.
- [x] Round 4 SDD available (**Draft** — not yet approved).
- [x] Round 4 Security Review available (Conditional).
- [x] Round 4 Implementation Plan available.
- [ ] Human Maintainer approval of the Round 4 blueprint.
- [ ] ADR-0026..ADR-0030 recorded in `DECISIONS.md`.

## 9. Exit Criteria

- [ ] AC-001..AC-010 each verified by at least one passing automated case.
- [ ] Deterministic invariants proven: zero lost updates on shard **and** projection, crash durability, zero temp leaks, zero lock leaks, zero ghost entries, zero bytes written by any read-only path.
- [ ] Mutation ledger: every listed mutation killed by its named case.
- [ ] Full regression green with no test weakening and no unrelated test file modified.
- [ ] `validate:contracts`, `validate:ci-parity`, `validate:project-state`, `validate:review-gate`, `validate:status-projection` all pass.
- [ ] issue-249 and issue-275 migrated with the real closeout evidence recorded in the plan, archived, and absent from `PROJECT_STATUS.md`.

---

## 10. Detailed Executable Test Case Definitions

### TC-001: Envelope v2 & Self-Exclusion Digest
- **Priority:** P0 | **Source:** AC-001, ADR-0028
- **Precondition:** Isolated `os.tmpdir()` workspace; envelope with `contract_version: 2`, `policy_contract_version: 1`, `workflow_id: bug-fix`, `sequence_number: 1`.
- **Action:** Compute `digestTaskEnvelope(envelope)` with `state_digest` absent, empty, and set to an unrelated value.
- **Assertion:** All three digests are identical; the argument object is not mutated; `validateEnvelopeSchema` accepts the envelope once `state_digest` is assigned.
- **Cleanup:** `fs.rmSync(mockDir, { recursive: true, force: true })`.

### TC-002: Stored Digest Tampering Detection
- **Priority:** P0 | **Source:** AC-001, ADR-0028
- **Injected Fault:** Change `state` on disk without recomputing `state_digest`.
- **Action:** `loadTaskState(shardPath)`.
- **Assertion:** Throws `DIGEST_INTEGRITY_MISMATCH` with both `stored_digest` and `recomputed_digest`.
- **Cleanup:** Remove workspace.

### TC-003: Legacy v1 Shard Rejection
- **Priority:** P1 | **Source:** AC-002, BR-001
- **Action:** `validateEnvelopeSchema()` on a `contract_version: 1` shard.
- **Assertion:** Rejected with a schema error naming `contract_version` const 2.
- **Cleanup:** Remove workspace.

### TC-004: Backfill Functionality, Idempotency & Rollback
- **Priority:** P1 | **Source:** AC-002, ADR-0026
- **Action:** `backfillTaskStateV2(shardPath)` on a v1 shard; run again; then `--rollback`.
- **Assertion:** First run yields `contract_version: 2`, `policy_contract_version: 1`, `sequence_number` equal to `history.length`, and a matching digest. Second run is byte-identical. `--rollback` restores the pre-migration bytes exactly (SHA-256 compared).
- **Cleanup:** Remove workspace.

### TC-005: Unauthorized Actor Rejection
- **Priority:** P0 | **Source:** AC-003, BR-002
- **Action:** From `verifying` (`actors: ['qa-agent']`), transition to `handoff` as `developer-agent` with otherwise valid evidence.
- **Assertion:** `UNAUTHORIZED_ACTOR`, status `REJECTED`; shard byte-identical.
- **Cleanup:** Remove workspace.

### TC-006: Actor Normalization & Unregistered Role
- **Priority:** P1 | **Source:** AC-003, BR-002
- **Action:** From `intake`, transition as `'BA Agent'`; then as `'rogue-bot'`.
- **Assertion:** `'BA Agent'` normalizes to `ba-agent` and succeeds; `'rogue-bot'` throws `UNAUTHORIZED_ACTOR`.
- **Cleanup:** Remove workspace.

### TC-007: Permitted Transition & Policy-Sourced Evidence
- **Priority:** P0 | **Source:** AC-004, BR-001, BR-002
- **Action:** `investigating -> implementing` on a bug-fix shard without `fail_path`; then with the policy's full required set.
- **Assertion:** First throws `MISSING_REQUIRED_EVIDENCE` naming the **policy** key, not a matrix key. Second succeeds, increments `sequence_number`, appends history, recomputes the digest.
- **Cleanup:** Remove workspace.

### TC-008: Immutable History Trail
- **Priority:** P1 | **Source:** AC-004
- **Assertion:** New entry has `from`, `to`, ISO-8601 `at`, `actor`, `evidence_refs`; prior entries are deep-equal to their pre-transition values.
- **Cleanup:** Remove workspace.

### TC-009 / TC-010: Mandatory `expected_digest` on Transition and Resume
- **Priority:** P0 | **Source:** AC-005, BR-003
- **Action:** `mutateTaskStateOnDisk` with `expected_digest` omitted, then `""`, in `transition` and `resume` mode.
- **Assertion:** All four throw `MISSING_EXPECTED_DIGEST`; shard byte-identical; no `.lock` remains.
- **Cleanup:** Remove workspace.

### TC-011: CAS Conflict on Stale Digest
- **Priority:** P0 | **Source:** AC-006, BR-003
- **Assertion:** `CAS_CONFLICT` carrying both `current_digest` and `expected_digest`; shard byte-identical.
- **Cleanup:** Remove workspace.

### TC-012: Two-Process Lost-Update Prevention
- **Priority:** P0 | **Source:** AC-006, ADR-0027
- **Precondition:** Fixture shard in `intake` with digest `D1`; barrier directory present.
- **Action:** Spawn two `concurrent-mutator.mjs` children (command shape in §7) targeting `investigating` and `designing`, both passing `--expected-digest D1`. Both wait on `barriers/observed`; the parent then creates `barriers/released`.
- **Assertion:** Exactly one child exits 0; the other exits 1 printing `CAS_CONFLICT`. Final `sequence_number` is exactly 2. The shard equals the winner's expected content. No `.lock` file remains.
- **Cleanup:** Remove workspace.

### TC-013: Live Lock Contention and Nonce-Safe Release
- **Priority:** P1 | **Source:** ADR-0027
- **Precondition:** `.lock` holding `nonce-A`, `created_at` = now, PID of a live process.
- **Action:** (a) `acquireShardLock` from another caller; (b) `releaseShardLock(dir, 'nonce-B')`.
- **Assertion:** (a) retries and throws `LOCK_ACQUISITION_TIMEOUT` after the 5 s ceiling; (b) the lock is **not** unlinked and still holds `nonce-A`.
- **Cleanup:** Remove workspace.

### TC-014: Abandoned Lock Is Refused, Never Reclaimed
- **Priority:** P0 | **Source:** ADR-0027 (**replaces the Round 3 atomic-takeover case**)
- **Precondition:** `.lock` with `created_at` 60 s in the past and a PID known dead.
- **Action:** Two callers, A and B, attempt acquisition simultaneously through the barrier harness. Then an operator runs `unlock --task T --nonce <observed>`. Then `unlock` is attempted a second time with the now-stale nonce after a new owner has acquired the lock.
- **Assertion:**
  1. Both A and B throw `LOCK_ABANDONED`; the message contains the literal `unlock --task`.
  2. The lock file is **byte-identical** after both attempts — SHA-256 compared. No reclaim path exists.
  3. The first `unlock` with the matching nonce removes it; acquisition then succeeds.
  4. The second `unlock` with the stale nonce throws `LOCK_NONCE_MISMATCH` and leaves the new owner's lock intact.
- **Structural note:** under fail-closed locking, "a live lock never leaves the canonical path while its owner is active" holds by construction — no code path removes a lock the caller does not own or has not nonce-verified. Assertion 2 is the direct evidence.
- **Cleanup:** Remove workspace.

### TC-015 / TC-016: Fail-Closed Projection on Corrupt JSON and Digest Mismatch
- **Priority:** P0 | **Source:** AC-007, BR-004
- **Action:** `compileStatusProjection()` against a fixture holding (a) unparseable JSON, (b) valid JSON with a wrong `state_digest`.
- **Assertion:** Both throw `MALFORMED_SHARD`; CLI exits 1; `PROJECT_STATUS.md` byte-identical.
- **Cleanup:** Remove workspace.

### TC-017: Atomic Writer Durability & Temp Cleanup
- **Priority:** P0 | **Source:** AC-008, BR-004
- **Injected Fault:** `fs.writeSync` throws mid-write.
- **Assertion:** The error propagates; no `.tmp-*` entry survives in the directory listing; the target file is byte-identical.
- **Cleanup:** Remove workspace.

### TC-018: Archival Wires the Projection Writer
- **Priority:** P1 | **Source:** AC-008, ADR-0029
- **Assertion:** Shard moved to `archive/`; `updateProjectStatusFile()` called once; the archived issue no longer appears in `PROJECT_STATUS.md`.
- **Cleanup:** Remove workspace.

### TC-019: Archival Compensation, and Compensation Failure
- **Priority:** P0 | **Source:** AC-008, ADR-0029
- **Injected Fault:** (a) `updateProjectStatusFile()` throws; (b) additionally, the compensating rename throws.
- **Assertion:** (a) the shard is restored to `work-items/{id}` and `ARCHIVE_RECONCILIATION_FAILED` is raised; (b) the raised error carries `compensation_failed: true` and names manual reconciliation — the caller is never told the repository is clean when it is not.
- **Cleanup:** Remove workspace.

### TC-020: Drift Detection Is Read-Only; Repair Is Explicit
- **Priority:** P0 | **Source:** AC-010, ADR-0029 (**replaces the Round 3 auto-preflight case**)
- **Precondition:** Shard present under `archive/` but still listed in `PROJECT_STATUS.md`.
- **Action:** Run `--check`; then run `--reconcile`; then run `--reconcile` again.
- **Assertion:**
  1. `--check` exits 1, reports the drift, names `--reconcile` in its recovery string, and changes **zero bytes** (TC-028 method).
  2. `--reconcile` repairs `PROJECT_STATUS.md` atomically.
  3. The second `--reconcile` is a byte-identical no-op.
- **Cleanup:** Remove workspace.

### TC-021: Every Terminal Outgoing Transition Is Rejected
- **Priority:** P0 | **Source:** AC-009
- **Action:** For each of `completed` and `cancelled`, attempt a transition to each of the other ten states — 20 cases, generated from `STATES`, not hand-listed.
- **Assertion:** All 20 throw `ILLEGAL_TRANSITION_REJECTED`; shard byte-identical in every case.
- **Cleanup:** Remove workspace.

### TC-022: Unknown Source State Fails Closed
- **Priority:** P0 | **Source:** AC-009
- **Precondition:** Envelope whose `state` has no `TRANSITION_MATRIX` entry (injected past the schema by calling the engine directly).
- **Action:** Attempt any transition.
- **Assertion:** Throws `UNKNOWN_SOURCE_STATE`. Mutation testing note: with the guard removed, this case must fail — it is the only case that detects the skip-validation hole.
- **Cleanup:** Remove workspace.

### TC-023: Self-Transition and Stage Skip
- **Priority:** P1 | **Source:** AC-009
- **Assertion:** `verifying -> verifying` and `intake -> verifying` both throw `ILLEGAL_TRANSITION_REJECTED`.
- **Cleanup:** Remove workspace.

### TC-024: Matrix ∩ Policy Intersection and Unknown Workflow
- **Priority:** P1 | **Source:** BR-001, ADR-0026
- **Action:** On a `bug-fix` shard, attempt `intake -> designing` (matrix-permitted, policy-silent); then load a shard with `workflow_id: 'made-up'`.
- **Assertion:** The first throws `ILLEGAL_TRANSITION_REJECTED` — a matrix-only check would have allowed it. The second fails closed with an unknown-workflow error. A companion parity assertion enumerates every matrix destination pair and requires each to be either policy-backed or listed in an explicit envelope-only allowlist.
- **Cleanup:** Remove workspace.

### TC-025: Terminal Evidence Is Required
- **Priority:** P1 | **Source:** AC-009, Guard 9b
- **Action:** Transition to `cancelled` without `cancellation_reason`; to `blocked` without `stop_reason`.
- **Assertion:** Both throw `MISSING_REQUIRED_EVIDENCE`. These previously passed through the evidence bypass.
- **Cleanup:** Remove workspace.

### TC-026: Archive-vs-Projection Interleaving (Lost Update Prevention)
- **Priority:** P0 | **Source:** AC-008, BR-005, ADR-0030
- **Precondition:** Fixture with two active shards, one of them terminal.
- **Action:** Child C calls `updateProjectStatusFile()` and blocks on `barriers/released` immediately after entering the function but before the projection lock is acquired. Child A runs `archiveWorkItem()` on the terminal shard to completion, creating `barriers/a-done`. The parent then releases C.
- **Assertion:** The final `PROJECT_STATUS.md` matches filesystem reality — the archived shard is absent. C must have recompiled after acquiring the lock; a compile-then-lock implementation reintroduces the ghost entry and fails this case.
- **Cleanup:** Remove workspace.

### TC-027: Projection Lock Order and Mutual Exclusion
- **Priority:** P0 | **Source:** BR-005, ADR-0030
- **Action:** (a) Two concurrent `updateProjectStatusFile()` children; (b) instrument `acquireShardLock` and `acquireProjectionLock` to record order and assert no shard lock is acquired while the projection lock is held; (c) an abandoned `.projection.lock`.
- **Assertion:** (a) both complete, the second waits, and the final projection matches reality with neither output lost; (b) no inversion is recorded during the full suite; (c) `LOCK_ABANDONED` names `unlock --projection` and the lock file is byte-identical afterwards.
- **Cleanup:** Remove workspace.

### TC-028: Whole-Tree Byte Equality for Read-Only Paths
- **Priority:** P0 | **Source:** AC-010, BR-004
- **Method:** Walk the fixture root, recording path, size, mtime and SHA-256 for every file. Run `compileStatusProjection()`, `detectArchivedShardDrift()`, `checkProjectStatusSync()`, and the `--check` CLI. Re-walk.
- **Assertion:** The two manifests are deep-equal — not just `PROJECT_STATUS.md`, the whole tree, so a stray lock, temp file or log cannot slip through.
- **Cleanup:** Remove workspace.

### TC-029: Migration Dry Run on Real Shard Copies
- **Priority:** P1 | **Source:** AC-002, Plan Task 9
- **Precondition:** Byte-copies of the real `issue-249` and `issue-275` shards in a fixture workspace.
- **Action:** Backfill, then the two terminal hops with the actors the matrix requires (`qa-agent` for `verifying -> handoff`, `orchestrator` for `handoff -> completed`) and the recorded closeout evidence, then archive.
- **Assertion:** Every step succeeds; a single actor attempting both hops is rejected with `UNAUTHORIZED_ACTOR`; the final shards validate against the envelope schema and are absent from the projection.
- **Cleanup:** Remove workspace.

### TC-030: Lock Recovery Surface Is Read-Only Where It Claims to Be
- **Priority:** P1 | **Source:** ADR-0027, R-002
- **Action:** Run `inspect` against a locked shard.
- **Assertion:** Prints the holder's `pid`, `nonce`, `created_at` and the shard's current digest; whole-tree byte equality holds across the call (TC-028 method).
- **Cleanup:** Remove workspace.

### TC-031: Zero Lock and Temp Leakage Across All Failure Paths
- **Priority:** P2 | **Source:** QG-002
- **Action:** Drive every reject code in §4 once, then list the fixture tree.
- **Assertion:** No `.lock`, `.projection.lock`, `.reclaim*` or `.tmp-*` entry survives any path in which the caller held the lock.
- **Cleanup:** Remove workspace.

---

## 11. Exploratory Charter

| Charter | Scope | Timebox | Rationale |
|---|---|---|---|
| EC-01 | Hand-drive `task-machine-cli.mjs` through `inspect` → `transition` → `unlock` on a scratch shard, deliberately mistyping digests, nonces and actors, and judge whether each error message tells an operator what to do next | 45 min | The fail-closed design trades automatic recovery for operator action (ADR-0027). If the diagnostics are unclear, the accepted risk in R-006 becomes an unacceptable one. Scripted cases assert error *codes*; only exploration judges *usability*. |
| EC-02 | Interrupt (`SIGKILL`) a transition and an archival at varied points and inspect the resulting tree | 45 min | Crash points between rename, write and release are combinatorial; exploration finds the interleavings the scripted fault injections did not think to model. |

Exploratory testing is **not** N/A for this change: both charters target properties the deterministic
suite cannot assert.

---

## 12. Mutation Ledger

| Guard | Deliberate Mutation | Killing Case |
|---|---|---|
| Self-exclusion digest | Remove `delete normalized.state_digest` | TC-001 |
| Digest equality | Remove `data.state_digest === expected` | TC-002, TC-016 |
| Actor authorization | Remove `matrixEntry.actors.includes(canonicalActor)` | TC-005 |
| Actor canonicalization | Drop the kebab-case normalization | TC-006 |
| Mandatory CAS | Restore `if (expected_digest !== undefined)` | TC-009, TC-010 |
| CAS comparison | Invert `expected !== current` | TC-011, TC-012 |
| Fail-closed source guard | Restore `if (matrixEntry) { ... }` | TC-022 |
| Terminal destinations | Give `completed` a non-empty `destinations` | TC-021 |
| Policy evidence sourcing | Read `requires` from the matrix instead of the policy | TC-007 |
| Matrix ∩ policy | Check only the matrix | TC-024 |
| Terminal evidence | Restore the `to !== 'cancelled'` bypass | TC-025 |
| Nonce-safe release | Change `parsed.nonce === nonce` to `true` | TC-013 |
| Abandoned-lock refusal | Replace the `LOCK_ABANDONED` throw with `unlinkSync(lockPath)` | TC-014 |
| `unlock` nonce check | Skip the nonce comparison in `unlock` | TC-014 |
| Writer temp cleanup | Remove `unlinkSync(tmpPath)` from the catch | TC-017 |
| Archival compensation | Remove the compensating rename | TC-019 |
| Compensation honesty | Swallow a failed compensating rename | TC-019 |
| Projection purity | Make `compileStatusProjection` write its output | TC-028 |
| Read-only check | Let `checkProjectStatusSync` repair | TC-020, TC-028 |
| Projection lock ordering | Compile **before** acquiring the projection lock | TC-026 |
| Projection lock presence | Remove the projection lock entirely | TC-026, TC-027 |
| Lock order | Acquire a shard lock while holding the projection lock | TC-027 |

---

## 13. Quality Gate & Governance Invariants

1. **QG-001 Review Gate:** every commit touching `.mjs`/`.js` carries a matching `docs/records/qa/*-code-review.md`, authored by the non-implementer.
2. **CI Parity:** 1:1 validation mirroring between `.github/workflows/validate-contracts.yml` and `.gitlab-ci.yml`.
3. **QG-002 Deterministic Invariants:** zero lost updates on shard and projection; crash durability; zero temp leaks; zero lock leaks; zero ghost entries; zero bytes written by any read-only path.
4. **Zero Test Weakening:** no unrelated test file is modified, and no existing assertion is relaxed.

---

## 14. QA Handoff

| To | When | Evidence QA Delivers | Evidence QA Requires Back |
|---|---|---|---|
| Developer Agent | On any failing case | Failing case id, exact command, observed vs expected, fixture path | Fix plus the case turning green without weakening it |
| Security Reviewer | After Checkpoint 2 | TC-012, TC-014, TC-026, TC-027, TC-028 output; lock-order instrumentation log | Recheck of the four ADR-0027/0030 conditions |
| Documentation Agent | After Human approval | Final AC-to-case traceability table | ADR-0026..ADR-0030 recorded in `DECISIONS.md` |
| Human Maintainer | Before merge | Full suite result, mutation ledger outcomes, gate results, migration evidence | Merge decision |

**Rework ceiling:** two verifying → rework cycles. A third requires an explicitly recorded Human
Maintainer decision (Issue #210 precedent).
