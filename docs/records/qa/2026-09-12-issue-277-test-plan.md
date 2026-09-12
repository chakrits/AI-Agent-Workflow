# TEST_PLAN.md: Control-Plane State Integrity & Architecture Remediation

## Metadata

- Work Item ID: Issue #277
- Title: Control-Plane State Integrity & Architecture Remediation (Package 1)
- Owner: QA Lead (`qa-agent`)
- Date: 2026-09-12
- Status: Draft (Rework Round 5 — Addressing Maintainer Review #5644601391) — **Full Mode** (high-risk framework change)
- Governing SDD: `docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md` (Round 5, Draft)
- Governing Security Review: `docs/records/security-review/2026-09-12-issue-277-security-review.md` (Round 5, Conditional; SEC-004 Open)
- Governing Requirements: `docs/records/requirements/2026-09-12-control-plane-state-integrity-discovery.md` (AC-001..AC-010, BR-001..BR-005)

---

## 1. Scope

### In-Scope
- Two-layer contract model: envelope v2 storage shape over workflow policy v1 behaviour, bound by `policy_contract_version`.
- **Package 1 composable scope is `bug-fix` only (ADR-0031):** the durable envelope's `workflow_id`/`change_type` enums and the strict active-shard lane admit `bug-fix` and nothing else.
- The single authority rule: legality is the **intersection** of `TRANSITION_MATRIX` and the shard's workflow policy, with evidence sourced from the policy row. No matrix fallback, no envelope-only allowlist, no exception contract.
- Envelope hashing (`digestTaskEnvelope`) with `state_digest` self-exclusion and stored-digest equality on load.
- Actor policy validation, terminal-state closure, and the fail-closed `UNKNOWN_SOURCE_STATE` guard.
- Mandatory CAS under the fail-closed per-shard lock, inside `mutateTaskStateOnDisk`.
- Shard locks in the **stable namespace** `docs/records/work-items/.locks/{task_id}.lock`, keyed by `task_id` and never derived from a directory path; pathname invariance across the archive transaction.
- Three-outcome lock classification (young+live, old+live, dead PID) and the **maintenance-only** `unlock --quiesced` recovery surface, in which nonce verification is an operator-mistake filter and **not** a safety property.
- POSIX crash-durable atomic writing with temp cleanup and zero-progress fault handling.
- Projection purity: zero bytes written by `compileStatusProjection`, `detectArchivedShardDrift`, and `--check`.
- Projection transaction: projection lock, post-acquisition recompile, total lock order.
- Transactional archival with compensation, and compensation-failure reporting.
- Evidence-bound migration of issue-249 and issue-275.

### Out-of-Scope
- Cryptographic agent identity verification (process signing) — NG-001.
- Unbacked numeric latency/throughput NFR benchmarks — NG-002.
- External database integrations — NG-003.
- Automatic abandoned-lock recovery — NG-004, explicitly rejected by ADR-0027; tested only as a *refusal*.
- Durable envelopes for `new-feature`, `config-change`, `data-change` and `framework-meta` — ADR-0031 defers them to a later package. Tested here only as **rejections** (TC-032).
- Race-safety of `unlock` — the claim is withdrawn (Security Review §2, SEC-004). Tested only as a *documented, non-race-safe contract* (TC-014b).
- Wildcard (`<any> -> X`) transition semantics in the validator — out of Package 1 scope per SDD Component 1.

---

## 2. Business Flow & IPO Analysis

### 2.1 Business Flow

```text
Agent decides a transition
  -> inspect (read digest + lock holder; read-only, no quiescence needed)
  -> mutateTaskStateOnDisk(shard, {to, actor, expected_digest, evidence})
       -> read task_id from the envelope
       -> acquire work-items/.locks/{task_id}.lock
            [young+live  => backoff/retry, then LOCK_ACQUISITION_TIMEOUT]
            [old+live    => LOCK_ACQUISITION_TIMEOUT + LOCK_HELD_LONG + holder diagnostics]
            [dead PID    => LOCK_ABANDONED, lock untouched, names unlock --quiesced]
       -> re-read + validate envelope   [refuse if malformed / digest mismatch]
       -> CAS compare                   [refuse if missing or stale]
       -> matrix INTERSECT policy legality, policy-sourced evidence
                                        [refuse if illegal / unauthorized / evidence missing]
       -> pure transition + atomic write
       -> release lock (nonce-matched) in finally, against the stable namespace
  -> (terminal) archiveWorkItem
       -> hold shard lock -> reconcile preflight -> move shard dir
          -> updateProjectStatusFile [projection lock] -> compensate on failure
          -> release shard lock last (pathname unmoved by the rename)
  -> CI: validate:status-projection --check  [read-only; drift => exit 1 + recovery command]

Operator-only, off the normal path:
  unlock --task T --nonce N --quiesced   [maintenance; refuses without --quiesced;
                                          LOCK_NONCE_MISMATCH is a mistake filter, not a race guard]
```

### 2.2 IPO Matrix

| # | Process | Input | Processing | Output | Failure Output |
|---|---|---|---|---|---|
| IPO-1 | `digestTaskEnvelope` | Envelope object | Shallow copy, delete `state_digest`, RFC 8785 JCS SHA-256 | 64-hex digest; argument unmodified | `Invalid envelope object` on non-object |
| IPO-2 | `validateEnvelopeSchema` | Envelope object | Ajv envelope schema (`workflow_id` limited to `bug-fix`), then `stored === computed` | Validated envelope | `MALFORMED_SHARD`, `DIGEST_INTEGRITY_MISMATCH` (with both digests) |
| IPO-3 | `acquireShardLock` | `(rootDir, task_id)` | `openSync('wx')` on `work-items/.locks/{task_id}.lock`; on EEXIST classify holder by PID liveness first, age second | Nonce | `LOCK_ACQUISITION_TIMEOUT` (optionally `LOCK_HELD_LONG` + holder diagnostics), `LOCK_ABANDONED` (lock left intact) |
| IPO-3b | `releaseShardLock` | `(rootDir, task_id, nonce)` | Read the stable-namespace lock; unlink only when `parsed.nonce === nonce` | Lock removed | Silent no-op on nonce mismatch; lock preserved |
| IPO-3c | `unlock` (CLI, maintenance-only) | `--task`/`--projection`, `--nonce`, `--quiesced` | Print holder + consequence, compare nonce, unlink unconditionally on the bytes observed | Lock removed | Refusal without `--quiesced`; `LOCK_NONCE_MISMATCH` on a stale nonce |
| IPO-4 | `mutateTaskStateOnDisk` | Shard path, `{to, actor, expected_digest, evidence, mode}` | Lock by `task_id`, re-read, validate, CAS, intersection legality, pure transition, atomic write, release | New envelope on disk, `sequence_number + 1` | `MISSING_EXPECTED_DIGEST`, `CAS_CONFLICT`, `UNAUTHORIZED_ACTOR`, `ILLEGAL_TRANSITION_REJECTED`, `UNKNOWN_SOURCE_STATE`, `UNKNOWN_WORKFLOW`, `MISSING_REQUIRED_EVIDENCE` |
| IPO-5 | `compileStatusProjection` | Root dir | Read + validate every active shard, render table | `{markdown, digest}`; **no writes** | `MALFORMED_SHARD` |
| IPO-5b | `discoverActiveShards` | Root dir | Enumerate `work-items/*`, **skip dot-prefixed entries before any shard-validity check** | Shard dirs only | — (a dot-prefixed entry must never reach the validity check) |
| IPO-6 | `detectArchivedShardDrift` | Root dir | Compare archive/, work-items/, `PROJECT_STATUS.md` | `{drifted, findings[]}`; **no writes** | — |
| IPO-7 | `updateProjectStatusFile` | Root dir | Acquire projection lock, **then** compile, atomic write, release | `{updated, digest}` | `LOCK_ABANDONED`, `LOCK_ACQUISITION_TIMEOUT`, `MALFORMED_SHARD` |
| IPO-8 | `archiveWorkItem` | Issue id | Hold shard lock, preflight reconcile, move shard, update projection, compensate on throw, release shard lock last | Shard under `archive/`, projection current, no lock at any of the three pathnames | `ARCHIVE_RECONCILIATION_FAILED` (+ `compensation_failed` when the rename back also fails) |
| IPO-9 | `checkProjectStatusSync` | Root dir | Pure compile + pure detect | `{inSync, digest}` or `{inSync:false, reason, recovery}` | exit 1, zero bytes changed |
| IPO-10 | `atomicWriteFileSync` | Target path, content | `wx` temp, write-completion loop rejecting zero progress, `fsync`, rename, dir sync | File replaced atomically | `ATOMIC_WRITE_NO_PROGRESS`, propagated write/rename errors; temp always unlinked |
| IPO-11 | `backfillTaskStateV2` | v1 shard path | Add `contract_version: 2`, `policy_contract_version`, `sequence_number = history.length + 1`, digest | v2 shard; idempotent | `--rollback` restores the byte-identical original |

---

## 3. State Transition Matrix (Envelope Layer, Complete)

Rows = source state, columns = destination. `Y` permitted by `TRANSITION_MATRIX`; `-` rejected with
`ILLEGAL_TRANSITION_REJECTED`. A source state absent from the matrix rejects with `UNKNOWN_SOURCE_STATE`.
This table is the **matrix layer only**; it is never sufficient on its own — see the overlay below.
It already reflects SDD Component 2's amendments: the two terminal rows, the explicitly written-out
`blocked` row, and **`investigating -> implementing`** (bold), which the matrix gains so the `bug-fix`
policy row of the same name has a counterpart to intersect with. Before that widening the intersection
at that hop was empty and the bug-fix happy path was severed at its second transition — see the OQ-1
resolution in §15. TC-034 is the standing guard that makes a recurrence a build failure.

| from \ to | intake | investigating | designing | planning | implementing | verifying | rework | handoff | blocked | completed | cancelled |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **intake** | - | Y | Y | - | - | - | - | - | - | - | Y |
| **investigating** | - | - | Y | Y | **Y** | - | - | - | Y | - | Y |
| **designing** | - | - | - | Y | - | - | - | - | Y | - | Y |
| **planning** | - | - | - | - | Y | - | - | - | Y | - | Y |
| **implementing** | - | - | - | - | - | Y | - | - | Y | - | Y |
| **verifying** | - | - | - | - | - | - | Y | Y | Y | - | Y |
| **rework** | - | - | - | - | Y | - | - | - | Y | - | Y |
| **handoff** | - | - | - | - | - | - | - | - | Y | Y | Y |
| **blocked** | Y | Y | Y | Y | Y | Y | Y | Y | - | Y | Y |
| **completed** | - | - | - | - | - | - | - | - | - | - | - |
| **cancelled** | - | - | - | - | - | - | - | - | - | - | - |

**Policy overlay (narrowing, no fallback).** Effective legality is the **intersection** of this matrix
with the shard's workflow policy, and evidence comes from the policy row. A pair the matrix permits but
the policy omits is illegal; a pair the policy lists but the matrix omits is **also** illegal. There is
no matrix fallback for policy-silent transitions and no envelope-only allowlist (SDD Component 1,
ADR-0031).

The effective `bug-fix` set is **not hand-listed here** — a hand-list is exactly the artifact that
drifted in Rounds 3–4. TC-024 computes it at test time by intersecting `TRANSITION_MATRIX` with the
parsed `bug-fix-workflow.yaml` (including the additive `handoff -> completed`) and asserts the engine
admits precisely that computed set and nothing else.

**`cancelled` has no ingress in Package 1.** `bug-fix-workflow.yaml` enumerates no `-> cancelled` row,
and no wildcard (`<any> -> cancelled`) exists, because the validator performs exact `from -> to` lookup
and Package 1 does not introduce wildcard semantics. `cancelled` is therefore a valid **storage** state
and a declared terminal, but is unreachable by transition. TC-025 asserts the unreachability; TC-021
authors a `cancelled` fixture directly rather than transitioning into it.

### Invalid-Transition Classes

| Class | Example | Expected | Case |
|---|---|---|---|
| Terminal outgoing | `completed -> handoff`, `cancelled -> implementing` | `ILLEGAL_TRANSITION_REJECTED` | TC-021 (pairs discovered from `STATES`) |
| Unknown source state | `state: "archived"` | `UNKNOWN_SOURCE_STATE` | TC-022 |
| Self-transition | `verifying -> verifying` | `ILLEGAL_TRANSITION_REJECTED` | TC-023 |
| Matrix-permitted, policy-silent | `intake -> designing` on `workflow_id: bug-fix` | `ILLEGAL_TRANSITION_REJECTED` | TC-024 |
| Policy-listed, matrix-silent | any policy row whose destination is absent from `TRANSITION_MATRIX[from].destinations` | `ILLEGAL_TRANSITION_REJECTED` | TC-024 step 4 — the set must be **empty** after Component 2's widening; TC-034 asserts the emptiness rather than assuming it |
| Policy-silent terminal | any `-> cancelled` on a bug-fix shard | `ILLEGAL_TRANSITION_REJECTED` | TC-025 |
| Non-`bug-fix` workflow | `workflow_id: new-feature` in a durable envelope | rejected by the envelope enum | TC-032 |
| Unknown workflow | `workflow_id: "made-up"` | fail closed | TC-032 |
| Stage skip | `intake -> verifying` | `ILLEGAL_TRANSITION_REJECTED` | TC-023 |

---

## 4. Guard Decision Table

Evaluation order is normative — each guard is tested both in isolation and for ordering, since a guard
that runs after a mutation is worthless.

| Order | Guard | Condition | Reject Code | Case |
|---|---|---|---|---|
| 1 | Lock acquisition (young + live holder) | Lock held, `created_at` within 30 s, `process.kill(pid, 0)` succeeds | `LOCK_ACQUISITION_TIMEOUT` after the retry ceiling | TC-013 |
| 1b | Lock diagnostics (old + live holder) | Older than 30 s, PID **live** | `LOCK_ACQUISITION_TIMEOUT` carrying `LOCK_HELD_LONG` + holder diagnostics — **never** `LOCK_ABANDONED` | TC-014c |
| 1c | Lock abandonment (dead PID, any age) | `process.kill(pid, 0)` throws `ESRCH` | `LOCK_ABANDONED` (lock left byte-identical; names `unlock --quiesced`) | TC-014, TC-014c |
| 2 | Envelope schema | Ajv failure, including a non-`bug-fix` `workflow_id` | `MALFORMED_SHARD` | TC-003, TC-015, TC-032 |
| 3 | Digest integrity | `stored !== digestTaskEnvelope(data)` | `DIGEST_INTEGRITY_MISMATCH` | TC-002, TC-016 |
| 4 | CAS presence | `expected_digest` missing or empty | `MISSING_EXPECTED_DIGEST` | TC-009, TC-010 |
| 5 | CAS equality | `expected_digest !== stored` | `CAS_CONFLICT` | TC-011, TC-012 |
| 6 | Source state known | No matrix entry | `UNKNOWN_SOURCE_STATE` | TC-022 |
| 7 | Destination legality | Not in matrix **∩** policy | `ILLEGAL_TRANSITION_REJECTED` | TC-021, TC-023, TC-024, TC-025 |
| 8 | Actor authorization | Canonical actor not in `TRANSITION_MATRIX[from].actors` | `UNAUTHORIZED_ACTOR` | TC-005, TC-006 |
| 9 | Evidence (policy-sourced) | Key listed on the **policy** row missing or empty | `MISSING_REQUIRED_EVIDENCE` | TC-007 |
| 9b | Terminal / blocking evidence | `handoff -> completed` without `closeout_evidence`; `-> blocked` without `stop_reason` | `MISSING_REQUIRED_EVIDENCE` | TC-025 |
| 10 | Rework ceiling | `rework_count >= max_rework_attempts` | ceiling rejection | existing regression |
| 11 | Human gate | Leaving `blocked` without human actor + approver | `HUMAN_APPROVAL_REQUIRED` | existing regression |
| W-1 | Atomic write progress | `fs.writeSync` returns `0` | `ATOMIC_WRITE_NO_PROGRESS` (temp unlinked, target untouched) | TC-017b |

The matrix's own `requires` is an authoring aid and is never consulted at validation time; guard 9 must
be observed reading the policy. Every reject path asserts the shard file is byte-identical afterwards
and that no lock survives at `work-items/.locks/{task_id}.lock`.

---

## 5. Risk Ranking (Test Prioritization)

| Rank | Risk | Likelihood | Impact | Priority | Cases |
|---|---|---|---|---|---|
| 1 | Lost update to `PROJECT_STATUS.md` via read-compile-write interleaving | Medium | High — recreates the ghost entry AC-008 exists to remove | P0 | TC-026, TC-027 |
| 2 | Terminal-state escape through the absent-matrix-entry hole | Medium | High — a completed task re-enters the pipeline | P0 | TC-021, TC-022 |
| 3 | Repairing `--check` hides the drift CI exists to detect | Medium | High — silent governance failure | P0 | TC-020, TC-028 |
| 4 | Lost update on a shard (CAS or lock defect) | Low | High | P0 | TC-011, TC-012 |
| 5 | Digest self-reference or tampering undetected | Low | High | P0 | TC-001, TC-002, TC-016 |
| 6 | **Shard lock travels with the archived directory** (Round 5 Blocker 2) — a release against a moved pathname leaks a lock and frees the original name mid-transaction | Medium | High — silent double-entry into a live archive transaction | P0 | TC-019b, TC-031 |
| 7 | **`unlock` removes a replacement lock** — accepted, not prevented. Integrity rests entirely on the unconditional CAS in `mutateTaskStateOnDisk` catching the dispossessed writer | Low (maintenance-only, `--quiesced`) | Medium — aborted transition + availability, **not** silent corruption, *provided* CAS holds | P0 | TC-014b, TC-012 |
| 8 | **Live slow holder routed into a destructive recovery path on age alone** (withdrawn Round 4 predicate, SEC-006) | Medium | High if reintroduced | P0 | TC-014c |
| 9 | Strict active-shard lane trips on `.locks/`, `.gitkeep` or `.projection.lock` | Medium | Medium — CI wedge on a non-shard entry | P1 | TC-033 |
| 10 | Backfill breaks the two live shards, or writes a `sequence_number` that duplicates the last history position | Medium | Medium — recoverable from backup | P1 | TC-004, TC-029 |
| 11 | Matrix and policy drift apart after this change | Medium | Medium | P1 | TC-024, TC-034 |
| 11b | **A policy row has no matrix counterpart, severing a workflow's happy path at design time** (the OQ-1 defect: strict intersection *created* this class, it did not reveal it). Invisible to any case that drives hand-picked hops | Medium | High — the workflow cannot complete at all, and only in production data | P0 | TC-034, TC-007 |
| 12 | Envelope advertises a workflow it cannot represent (Round 5 Blocker 1) | Low (narrowed to `bug-fix`) | Medium | P1 | TC-032 |
| 13 | Abandoned lock wedges one shard or all of CI — **accepted and widened** by the dead-PID-only predicate (SEC-003): an old-but-live lock, and a lock whose writer died off-host while its PID is coincidentally live, now wedge until an operator establishes quiescence | Medium | Medium — availability traded for integrity | P1 | TC-014, TC-014c, TC-027, TC-030 |
| 14 | Temp or lock file leakage, including a zero-progress write spin | Low | Low | P2 | TC-017, TC-017b, TC-031 |

---

## 6. Test Types In Scope

- [ ] Unit — hasher, guards, matrix, writer
- [ ] Contract — envelope v2 (`bug-fix` only), `policy_contract_version` binding, policy amendment, existing example fixtures
- [ ] Active-Shard Composition — real `work-items/` path, not the example-fixture lane
- [ ] Concurrency & Contention — barrier-synchronized multi-process, lock order, lock-pathname invariance
- [ ] Fault Injection & Crash Boundaries — write throw, zero-progress write, archival compensation, compensation failure, forced check/unlink interleaving
- [ ] Read-Only Assertion — whole-tree byte equality
- [ ] CLI — mandatory CAS flags, `inspect`, `unlock --quiesced`
- [ ] Integration — projection, archival, reconcile idempotency, backfill
- [ ] Regression — full repository suite
- [ ] Review Gate Governance — QG-001

---

## 7. Environment

- Node.js >= 22, ESM, `node:test` + `node:assert/strict`.
- Fixtures in isolated `os.tmpdir()` workspaces; no test touches the real repository tree.
- Multi-process cases use `child_process.spawn` on a fixture-scoped harness script, never on repository state.
- Every case that can block carries an explicit `node:test` timeout, so a regression that hangs **fails** rather than stalling CI.

### Synchronization Harness (used by every multi-process case)

Barriers are filesystem sentinels inside the fixture directory, polled at 5 ms with a 10 s ceiling that
fails the test rather than hanging:

| Barrier file | Meaning |
|---|---|
| `barriers/observed` | Child has read the shard and holds its `expected_digest` |
| `barriers/released` | Parent permits children to proceed into the mutation |
| `barriers/a-done` | Child A has completed its write and released its lock |
| `barriers/b-attempt` | Child B is about to attempt its mutation |

**Harness invariant (normative).** Every child invocation must be *otherwise fully valid*: an authorized
actor for the source state, the full policy-required evidence set, and a transition that is legal in
**both** layers. Otherwise the child is rejected by an earlier guard and the guard under test is never
reached — the concurrency assertion would then pass vacuously. Each concurrency case names the single
reject code it is allowed to observe.

Child command shape, identical across TC-012, TC-014b, TC-019b, TC-026 and TC-027:

```bash
node test/fixtures/issue-277/concurrent-mutator.mjs \
  --root "$FIXTURE_ROOT" \
  --task issue-fixture \
  --to investigating \
  --actor ba-agent \
  --expected-digest "$D1" \
  --evidence failure_description=fixture-bug \
  --evidence repro=fixture-repro \
  --wait-barrier observed \
  --release-barrier released \
  --emit-json
```

`intake -> investigating` is chosen because it is legal in both layers for `bug-fix`; `ba-agent` is
authorized for `intake`; `failure_description` and `repro` are the policy row's required keys. The
harness resolves the lock path as `--root`/docs/records/work-items/.locks/`--task`.lock — it never
derives a lock path from the shard directory.

The harness exits `0` on success and `1` on rejection, printing `{"code": "...", "sequence_number": N}`
on stdout so the parent asserts on the code rather than on a message string.

---

## 8. Entry Criteria

- [x] Round 5 Requirement Discovery available.
- [x] Round 5 SDD available (**Draft** — not yet approved).
- [x] Round 5 Security Review available (Conditional; SEC-004 **Open** pending this plan's evidence).
- [x] Round 5 Implementation Plan available.
- [ ] Human Maintainer approval of the Round 5 blueprint.
- [ ] ADR-0026..ADR-0031 recorded in `DECISIONS.md`.
- [x] OQ-1 resolved by SA Agent (matrix widened; see §15). TC-007, TC-024 and TC-029 are unblocked and updated.

## 9. Exit Criteria

- [ ] AC-001..AC-010 each verified by at least one passing automated case.
- [ ] Deterministic invariants proven: zero lost updates on shard **and** projection, crash durability, zero temp leaks, zero lock leaks at any of the three archive-relevant pathnames, zero ghost entries, zero bytes written by any read-only path, no unbounded write loop.
- [ ] **SEC-004 closing set green:** TC-012, TC-014, TC-014b, TC-014c, TC-026, TC-027, TC-028 all pass, with output attached to the security-review recheck. Until then this plan records no concurrency guarantee, and none whatsoever for `unlock`.
- [ ] TC-034 green: no in-scope policy row has an empty matrix intersection, and every in-scope policy state is reachable over the computed intersection alone.
- [ ] Mutation ledger: every listed mutation killed by its named case.
- [ ] Full regression green with no test weakening and no unrelated test file modified.
- [ ] `validate:contracts`, `validate:ci-parity`, `validate:project-state`, `validate:review-gate`, `validate:status-projection` all pass.
- [ ] **Rollout ordering respected, with a rollback point at each step:** the backfill tool and its tests land with the strict active-shard lane **disabled**; the operational migration of issue-249 and issue-275 runs next; the strict lane is enabled only afterwards. QA will not accept a step that enables the lane while a v1 shard is still live, because that step's own `validate:contracts` verification cannot pass. (Task numbering is the implementation plan's to assign; QA asserts the ordering, not the numbers.)
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

### TC-004: Backfill Functionality, Sequence Continuation, Idempotency & Rollback
- **Priority:** P1 | **Source:** AC-002, ADR-0026, Round 5 Blocking finding 3
- **Action:** `backfillTaskStateV2(shardPath)` on a v1 shard with a non-empty `history`; run again; perform one further real transition through `mutateTaskStateOnDisk`; then `--rollback` from a fresh copy.
- **Assertion:**
  1. First run yields `contract_version: 2`, `policy_contract_version: 1`, `sequence_number === history.length + 1`, and a matching digest.
  2. **Not** `history.length`: an equality backfill would reuse the last history position and break monotonic continuation. The case asserts the produced value is strictly greater than every `sequence_number` already recorded in `history`.
  3. The next real transition produces `sequence_number === backfilled + 1` and `history.length` one greater, i.e. the engine continues from the backfilled value rather than colliding with it. This mirrors the engine's own initialization, which starts an empty-history shard at `1`.
  4. Second backfill run is byte-identical (idempotent).
  5. `--rollback` restores the pre-migration bytes exactly (SHA-256 compared).
- **Cleanup:** Remove workspace.

### TC-005: Unauthorized Actor Rejection
- **Priority:** P0 | **Source:** AC-003, BR-002
- **Action:** From `verifying` (`actors: ['qa-agent']`), transition to `handoff` as `developer-agent` with otherwise valid evidence.
- **Assertion:** `UNAUTHORIZED_ACTOR`, status `REJECTED`; shard byte-identical.
- **Cleanup:** Remove workspace.

### TC-006: Actor Normalization & Unregistered Role
- **Priority:** P1 | **Source:** AC-003, BR-002
- **Action:** From `intake` to `investigating` with the policy evidence set, as `'BA Agent'`; then as `'rogue-bot'`.
- **Assertion:** `'BA Agent'` normalizes to `ba-agent` and succeeds; `'rogue-bot'` throws `UNAUTHORIZED_ACTOR`.
- **Cleanup:** Remove workspace.

### TC-007: Permitted Transition & Policy-Sourced Evidence
- **Priority:** P0 | **Source:** AC-004, BR-001, BR-002, ADR-0031
- **Action:** `intake -> investigating` on a bug-fix shard as `ba-agent`, (a) supplying only the **matrix**'s `requires` for `intake` (`requirement_discovery` / `issue_ref`) and none of the policy's keys; (b) supplying the policy row's full set (`failure_description`, `repro`).
- **Assertion:** (a) throws `MISSING_REQUIRED_EVIDENCE` naming `failure_description` and `repro` — the **policy** keys — and the presence of the matrix keys does not satisfy the guard, which is the direct evidence that the matrix's `requires` is never consulted at validation time. (b) succeeds, increments `sequence_number`, appends history, recomputes the digest.
- **Also asserts (the hop OQ-1 severed):** `investigating -> implementing` as `developer-agent` with the policy row's `fail_path` and `hypothesis_matrix` **succeeds**, and fails with `MISSING_REQUIRED_EVIDENCE` when either key is absent. This hop is legal only because SDD Component 2 widens `TRANSITION_MATRIX.investigating.destinations` to include `implementing`; against the unwidened matrix it rejects with `ILLEGAL_TRANSITION_REJECTED`, so this assertion is the direct regression test for the widening. It no longer needs routing around — OQ-1 is resolved (§15).
- **Why `intake -> investigating` still carries the evidence-sourcing half:** the `intake` matrix row's `requires` (`requirement_discovery` / `issue_ref`) is disjoint from its policy row's (`failure_description`, `repro`), which makes it the sharpest available discriminator between the two evidence sources. `investigating`'s matrix `requires` (`root_cause_analysis`) is likewise disjoint from the policy's, so step (a) is repeated on that hop as a second, independent discrimination.
- **Cleanup:** Remove workspace.

### TC-008: Immutable History Trail
- **Priority:** P1 | **Source:** AC-004
- **Assertion:** New entry has `from`, `to`, ISO-8601 `at`, `actor`, `evidence_refs`; prior entries are deep-equal to their pre-transition values.
- **Cleanup:** Remove workspace.

### TC-009 / TC-010: Mandatory `expected_digest` on Transition and Resume
- **Priority:** P0 | **Source:** AC-005, BR-003
- **Action:** `mutateTaskStateOnDisk` with `expected_digest` omitted, then `""`, in `transition` and `resume` mode.
- **Assertion:** All four throw `MISSING_EXPECTED_DIGEST`; shard byte-identical; **no file remains at `work-items/.locks/{task_id}.lock`** (the stable namespace — not `work-items/{task_id}/.lock`).
- **Cleanup:** Remove workspace.

### TC-011: CAS Conflict on Stale Digest
- **Priority:** P0 | **Source:** AC-006, BR-003
- **Assertion:** `CAS_CONFLICT` carrying both `current_digest` and `expected_digest`; shard byte-identical.
- **Cleanup:** Remove workspace.

### TC-012: Two-Process Lost-Update Prevention
- **Priority:** P0 | **Source:** AC-006, ADR-0027, **Security Review condition 7 (SEC-004 closing set)**
- **Precondition:** Fixture bug-fix shard in `intake` with digest `D1`; barrier directory present.
- **Action:** Spawn two `concurrent-mutator.mjs` children (command shape in §7). **Both target the same transition, `intake -> investigating`**, both as `ba-agent`, both carrying the full policy evidence set, both passing `--expected-digest D1`. Both wait on `barriers/observed`; the parent then creates `barriers/released`.
- **Assertion:** Exactly one child exits 0; the other exits 1 printing `CAS_CONFLICT` — **and no other code**, in particular never `ILLEGAL_TRANSITION_REJECTED`, `UNAUTHORIZED_ACTOR` or `MISSING_REQUIRED_EVIDENCE`, any of which would mean the race was decided by an earlier guard and the case proved nothing. Final `sequence_number` is exactly 2. The shard equals the winner's expected content. No file remains at `work-items/.locks/{task_id}.lock`.
- **Design note:** the two children must not target *different* destinations. Under the strict intersection (ADR-0031) only `intake -> investigating` is legal for `bug-fix` from `intake`, so a second child aiming at `designing` would fail deterministically on legality and never contend. This case is the integrity backstop on which the accepted `unlock` residual risk rests (Security Review §2), so a vacuous pass here is a security regression, not a test-hygiene issue.
- **Cleanup:** Remove workspace.

### TC-013: Live Lock Contention and Nonce-Safe Release
- **Priority:** P1 | **Source:** ADR-0027
- **Precondition:** `work-items/.locks/{task_id}.lock` holding `nonce-A`, `created_at` = now (**young**), PID of a live process.
- **Action:** (a) `acquireShardLock(rootDir, task_id)` from another caller; (b) `releaseShardLock(rootDir, task_id, 'nonce-B')`.
- **Assertion:** (a) retries with randomized backoff and throws `LOCK_ACQUISITION_TIMEOUT` after the 5 s ceiling, **without** `LOCK_HELD_LONG` (the holder is young); (b) the lock is **not** unlinked and still holds `nonce-A`.
- **API note:** both calls take `(rootDir, task_id)`. A signature taking a shard directory is itself the defect Round 5 Blocker 2 identified at the API seam and must fail this case.
- **Cleanup:** Remove workspace.

### TC-014: Abandoned Lock Is Refused, Never Reclaimed
- **Priority:** P0 | **Source:** ADR-0027, **Security Review conditions 2 and 3 (SEC-004 closing set)**
- **Precondition:** `work-items/.locks/{task_id}.lock` whose PID is **known dead** (`process.kill(pid, 0)` throws `ESRCH`). Age is held constant and is **not** part of this case's classification — see TC-014c.
- **Action:** Two callers, A and B, attempt acquisition simultaneously through the barrier harness. Then an operator runs `unlock --task T --nonce <observed> --quiesced`. Then `unlock --quiesced` is attempted a second time with the now-stale nonce after a new owner has acquired the lock.
- **Assertion:**
  1. Both A and B throw `LOCK_ABANDONED` carrying the holder's `pid`, `nonce` and `created_at`; the message contains the literal `unlock --task` **and** `--quiesced`.
  2. The lock file is **byte-identical** after both attempts — SHA-256 compared. No automatic reclaim path exists.
  3. A static assertion over `scripts/lib/task-state-machine.mjs` and `scripts/task-machine-cli.mjs`: the only two lock-removal call sites in the codebase are the nonce-matched owner release and the operator `unlock` CLI. Any third removal site fails the case.
  4. The first `unlock` with the matching nonce and `--quiesced` removes it; acquisition then succeeds.
  5. The second `unlock` with the stale nonce throws `LOCK_NONCE_MISMATCH` and leaves the new owner's lock intact.
- **Structural note (scope of the claim, restated precisely).** What this case establishes is that **the engine** never removes a lock it does not own: there is no automatic reclaim code path, so "a live lock is never removed by another *engine* process" holds by construction, and assertion 2 plus assertion 3 are the direct evidence. It establishes **nothing** about `unlock`. `unlock` **is** a reclaim path and it is **not** race-safe; nonce verification in assertion 5 is an operator-mistake filter, not a safety property. The Round 4 claim that a `wx` sentinel made `unlock` unable to remove a replacement lock is **withdrawn in full** (Security Review §2, SDD Component 4). TC-014b pins the withdrawn claim's actual behaviour.
- **Cleanup:** Remove workspace.

### TC-014b: `unlock` Check/Unlink Interleaving — Pinning the Non-Race-Safe Contract
- **Priority:** P0 | **Source:** ADR-0027 (Round 5 amendment b), **Security Review condition 4 (SEC-004 closing set)**, Round 5 Blocking finding 4
- **Precondition:** Fixture bug-fix shard; an abandoned lock (dead PID) held by `nonce-OLD`; the operator has read that nonce.
- **Mechanism (named deliberately — without it this case passes vacuously).** The read→unlink window is
  *in-process*, so a filesystem barrier between two OS processes cannot reliably land inside it. The
  implementation must expose a **test-only injection seam** in `unlock` — a hook invoked after the nonce
  comparison and before `fs.unlinkSync` — and the test uses it to: unlink the observed lock, let a
  spawned replacement acquirer take the pathname with `nonce-NEW`, wait on `barriers/b-attempt`, and
  only then return control to `unlock`. If the implementation exposes no such seam, the fallback is a
  spawned acquirer looping against a bounded attempt ceiling with an explicit failure (not a skip) when
  the window is never hit; a skip would silently retire a security condition.
- **Action:** Run `unlock --task T --nonce nonce-OLD --quiesced` with the replacement forced between the nonce read and the unlink. The replacement owner then attempts its mutation with the `expected_digest` it captured before losing its lock, while a third writer has since committed a transition.
- **Assertion (the documented outcome, not a safety outcome):**
  1. The **replacement** lock (`nonce-NEW`) is removed — this is the expected, documented behaviour.
  2. `unlock` raises **no** error and reports success; it does not detect that it removed a different lock.
  3. The dispossessed replacement owner's subsequent write is **caught** as `CAS_CONFLICT` (or `DIGEST_INTEGRITY_MISMATCH` on a torn read) — a loud, rejected mutation, **not** a silent lost update. This is the unconditional, lock-independent CAS in `mutateTaskStateOnDisk` step 5 doing the work.
  4. The shard's history contains the third writer's transition exactly once and none from the dispossessed owner.
- **Interpretation (normative, so a future reader cannot invert it).** A **passing** TC-014b is evidence that the documentation is **true** — that `unlock` is not race-safe and that CAS catches the consequence. It is **not** evidence that `unlock` is safe. This case exists to pin the contract so a later change cannot quietly re-assert race-safety without turning this test red.
- **Cleanup:** Remove workspace.

### TC-014c: Abandonment Predicate — Liveness Classifies, Age Only Diagnoses
- **Priority:** P0 | **Source:** SEC-006, ADR-0027 (Round 5 amendment a), **Security Review condition 5 (SEC-004 closing set)**
- **Precondition:** Three independently constructed locks, so age and liveness are never varied together.
- **Action & Assertion:**
  1. **Old but live** — `created_at` 60 s in the past, PID of a live process: acquisition throws `LOCK_ACQUISITION_TIMEOUT` carrying a `LOCK_HELD_LONG` advisory and holder diagnostics (`pid`, `nonce`, `created_at`, age). It must **never** throw `LOCK_ABANDONED`. The message names `unlock --quiesced` as available only once the operator can establish quiescence, so this permanent-wedge tier is not a dead end. The lock is byte-identical afterwards.
  2. **Dead PID, younger than 30 s** — `created_at` = now, PID known dead: acquisition throws `LOCK_ABANDONED`. This is the assertion that proves age is **not** a classifier; an implementation gating abandonment on age fails here.
  3. **Young and live:** `LOCK_ACQUISITION_TIMEOUT` **without** `LOCK_HELD_LONG` (shared with TC-013).
  4. `unlock --task T --nonce <observed>` **without** `--quiesced` is refused, the lock survives byte-identical, and the refusal text names the maintenance-only contract.
  5. The same three tiers hold for the projection lock, whose refusal names `unlock --projection --nonce <observed> --quiesced`.
- **Regression note:** the Round 4 predicate was `age > 30 s` **or** dead PID, which routed a live, slow holder into a destructive operator path on age alone. Restoring the `or` must turn assertion 1 red.
- **Cleanup:** Remove workspace.

### TC-015 / TC-016: Fail-Closed Projection on Corrupt JSON and Digest Mismatch
- **Priority:** P0 | **Source:** AC-007, BR-004
- **Action:** `compileStatusProjection()` against a fixture holding (a) unparseable JSON, (b) valid JSON with a wrong `state_digest`.
- **Assertion:** Both throw `MALFORMED_SHARD`; CLI exits 1; `PROJECT_STATUS.md` byte-identical.
- **Cleanup:** Remove workspace.

### TC-017: Atomic Writer Durability & Temp Cleanup
- **Priority:** P0 | **Source:** AC-008, BR-004, **Security Review condition 6**
- **Injected Fault:** `fs.writeSync` **throws** mid-write.
- **Assertion:** The error propagates; no `.tmp-*` entry survives in the directory listing; the target file is byte-identical.
- **Cleanup:** Remove workspace.

### TC-017b: Zero-Progress Write Is a Fault, Not a Retry Condition
- **Priority:** P0 | **Source:** AC-008, Round 5 Additional correction 4, SDD Component 5
- **Injected Fault:** Stub `fs.writeSync` to **return `0`** (no throw) on the first call, with a buffer longer than zero bytes.
- **Action:** `atomicWriteFileSync(targetPath, content)` under an explicit `node:test` timeout.
- **Assertion:**
  1. Throws `ATOMIC_WRITE_NO_PROGRESS`, with a message naming the bytes written and the buffer length.
  2. The test **completes within its timeout** — the whole point is that a `while (written < length)` loop with no zero-progress guard spins forever, so a regression must fail loudly rather than hang CI.
  3. No `.tmp-*` entry survives; the target file is byte-identical; the temp fd is closed.
  4. A variant returning a short-but-positive count on the first call and the remainder on the second **succeeds** — the guard must reject only `n <= 0`, never legitimate short writes.
- **Cleanup:** Remove workspace.

### TC-018: Archival Wires the Projection Writer
- **Priority:** P1 | **Source:** AC-008, ADR-0029
- **Assertion:** Shard moved to `archive/`; `updateProjectStatusFile()` called once; the archived issue no longer appears in `PROJECT_STATUS.md`.
- **Cleanup:** Remove workspace.

### TC-019: Archival Compensation, and Compensation Failure
- **Priority:** P0 | **Source:** AC-008, ADR-0029, **Security Review condition 11**
- **Injected Fault:** (a) `updateProjectStatusFile()` throws; (b) additionally, the compensating rename throws.
- **Assertion:** (a) the shard is restored to `work-items/{id}` and `ARCHIVE_RECONCILIATION_FAILED` is raised; (b) the raised error carries `compensation_failed: true` and names manual reconciliation — the caller is never told the repository is clean when it is not.
- **Cleanup:** Remove workspace.

### TC-019b: Lock Pathname Invariance Across the Archive Transaction
- **Priority:** P0 | **Source:** Round 5 Blocking finding 2, ADR-0027 (amendment), SDD Components 4, 7 and 8
- **Precondition:** Fixture with a terminal bug-fix shard at `work-items/{id}` and the stable lock namespace present.
- **Action:**
  1. **Barrier test:** child A calls `archiveWorkItem(id)` and blocks on `barriers/released` while holding the shard lock; child B attempts `mutateTaskStateOnDisk` on the same shard; the parent then releases A.
  2. Drive the archive three times on fresh fixtures: the **success** path, the **compensating-rename** path (TC-019 fault (a)), and the **compensation-failure** path (TC-019 fault (b)).
- **Assertion:**
  1. The mutation and the archive **cannot overlap**: B observes a lock-contention outcome (`LOCK_ACQUISITION_TIMEOUT`) and never enters the critical section while A holds it; the shard is never observed half-moved by a successful mutation.
  2. During the archive, the lock file exists at `work-items/.locks/{id}.lock` and **not** at `work-items/{id}/.lock` — asserted by sampling at the barrier, while the shard directory still exists.
  3. On each of the three exit paths, **all three** pathnames are absent: `work-items/.locks/{id}.lock`, `work-items/{id}/.lock`, and `archive/{id}/.lock`. Exactly one release occurs, and it targets the stable namespace.
  4. The shard lock is released **last** — after the projection lock has been acquired and released — and the recorded acquisition order is shard lock then projection lock, never inverted.
- **Regression note:** placing the lock at `work-items/{id}/.lock` makes assertion 3 fail on `archive/{id}/.lock` for the success path, which is precisely Round 5 Blocker 2.
- **Cleanup:** Remove workspace.

### TC-020: Drift Detection Is Read-Only; Repair Is Explicit
- **Priority:** P0 | **Source:** AC-010, ADR-0029, SEC-005
- **Precondition:** Shard present under `archive/` but still listed in `PROJECT_STATUS.md`.
- **Action:** Run `--check`; then run `--reconcile`; then run `--reconcile` again.
- **Assertion:**
  1. `--check` exits 1, reports the drift, names `--reconcile` in its recovery string, and changes **zero bytes** (TC-028 method).
  2. `--reconcile` repairs `PROJECT_STATUS.md` atomically.
  3. The second `--reconcile` is a byte-identical no-op.
- **Cleanup:** Remove workspace.

### TC-021: Every Terminal Outgoing Transition Is Rejected
- **Priority:** P0 | **Source:** AC-009
- **Precondition:** For each terminal state, a fixture envelope **authored directly** in that state. `cancelled` in particular is a valid *storage* state that Package 1 cannot reach by transition (see TC-025), so the fixture must be written, never transitioned into; a future reader must not "fix" this by adding a `-> cancelled` hop.
- **Action:** Discover the terminal set (`completed`, `cancelled`) and the full destination set from `STATES` at test time, and attempt every (terminal source, other state) pair. The pairs are **generated, not hand-listed**, so a state added to `STATES` is covered automatically and no count in this document can go stale.
- **Assertion:** Every generated pair throws `ILLEGAL_TRANSITION_REJECTED`; the shard is byte-identical in every case; the generated pair set is asserted non-empty so a broken generator cannot pass vacuously.
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

### TC-024: The Authority Rule Is a Strict Intersection, Discovered Not Hand-Listed
- **Priority:** P0 | **Source:** BR-001, ADR-0026, ADR-0031, Round 5 Blocking finding 1
- **Action:**
  1. Parse `docs/contracts/bug-fix-workflow.yaml` (post-amendment) and read `TRANSITION_MATRIX` from the engine. Compute `EFFECTIVE = { (from,to) : to ∈ MATRIX[from].destinations ∧ (from,to) ∈ POLICY.transitions }`.
  2. For every pair in `EFFECTIVE`, drive it on a fixture bug-fix shard with an authorized actor and the policy row's evidence, and assert it **succeeds**.
  3. For every pair in `MATRIX \ EFFECTIVE` (matrix-permitted, policy-silent — e.g. `intake -> designing`), assert `ILLEGAL_TRANSITION_REJECTED`. A matrix-only implementation admits these and fails here.
  4. For every pair in `POLICY \ EFFECTIVE` (policy-listed, matrix-silent), assert `ILLEGAL_TRANSITION_REJECTED`. A policy-only implementation admits these and fails here.
  5. Assert there is **no** third source of legality: no envelope-only allowlist, no fallback for policy-silent pairs, no exception contract. Concretely, the union of the pairs the engine admits over all source states equals `EFFECTIVE` exactly — set equality, both directions.
  6. Assert `EFFECTIVE` is non-empty and that `MATRIX[from].requires` is never read on the accept path (guard 9 sources evidence from the policy, per TC-007).
- **Assertion:** The engine's admitted set equals `EFFECTIVE` exactly; the two disagreement sets are both rejected; the `MATRIX \ EFFECTIVE` set is asserted non-empty so step 3 cannot pass vacuously.
- **Withdrawn-claim note:** the Round 4 version of this case permitted an "explicit envelope-only allowlist" for matrix pairs lacking a policy row. ADR-0031 states the rule exactly once as a strict intersection with **no** fallback and **no** allowlist, so that assertion is **removed**, not softened — step 5 now asserts the allowlist's absence.
- **Single-authority alignment (the outstanding item from the earlier round, now closed).** SDD Component 1 states the authority rule once and adds *"QA's TC-024 must be brought into line with it by its owner."* This revision does that: the Round 4 case permitted an "explicit envelope-only allowlist", and steps 1–6 above replace it with a strict two-way set equality against a computed intersection, with step 5 asserting no allowlist, no fallback and no exception contract exists. There is no remaining wording in this plan that grants legality from any third source. Nothing further is outstanding on this item.
- **No longer blocked.** OQ-1 is resolved by SDD Component 2's matrix widening (§15). Step 4's set is expected to be **empty** for `bug-fix`, and the case discovers that rather than asserting it — TC-034 is what turns a non-empty set into a failure.
- **Cleanup:** Remove workspace.

### TC-025: `cancelled` Is Unreachable; `completed` and `blocked` Require Their Evidence
- **Priority:** P0 | **Source:** AC-009, ADR-0031, Guard 9b, Round 5 Additional correction 1
- **Action & Assertion:**
  1. Attempt `-> cancelled` from every matrix source that lists it as a destination, on a `bug-fix` shard, **with** a well-formed `cancellation_reason`. Every attempt throws `ILLEGAL_TRANSITION_REJECTED`, because `bug-fix-workflow.yaml` enumerates no `-> cancelled` row and the rule is a strict intersection. Supplying evidence does **not** help: in Package 1 `cancelled` has no ingress at all.
  2. Assert no wildcard row exists: the parsed policy contains no `from` value of `<any>` or `*`, and the validator's exact `from -> to` lookup is unchanged. Package 1 introduces no wildcard semantics, so a `* -> cancelled` entry must be absent rather than assumed to work.
  3. `handoff -> completed` **without** `closeout_evidence` throws `MISSING_REQUIRED_EVIDENCE` naming that key; **with** it, the transition succeeds. This is the additive policy amendment's only new evidence key and nothing else covers it.
  4. Any `-> blocked` row without `stop_reason` throws `MISSING_REQUIRED_EVIDENCE`. Under SDD Component 2 the old `to !== 'blocked' && to !== 'cancelled'` evidence bypass is **deleted outright**, so `blocked` is now covered by the ordinary policy-sourced path with no special case.
- **Withdrawn-claim note:** the Round 4 version asserted that `-> cancelled` without `cancellation_reason` yields `MISSING_REQUIRED_EVIDENCE`, which presumed a reachable `cancelled`. That transition is now unreachable by **any** evidence, so the assertion is **replaced**, not weakened.
- **Cleanup:** Remove workspace.

### TC-026: Archive-vs-Projection Interleaving (Lost Update Prevention)
- **Priority:** P0 | **Source:** AC-008, BR-005, ADR-0030, **Security Review condition 8 (SEC-004 closing set)**
- **Precondition:** Fixture with two active bug-fix shards, one of them terminal.
- **Action:** Child C calls `updateProjectStatusFile()` and blocks on `barriers/released` immediately after entering the function but before the projection lock is acquired. Child A runs `archiveWorkItem()` on the terminal shard to completion, creating `barriers/a-done`. The parent then releases C.
- **Assertion:** The final `PROJECT_STATUS.md` matches filesystem reality — the archived shard is absent. C must have recompiled after acquiring the lock; a compile-then-lock implementation reintroduces the ghost entry and fails this case. C completes without error (it is not rejected by an earlier guard).
- **Cleanup:** Remove workspace.

### TC-027: Projection Lock Order and Mutual Exclusion
- **Priority:** P0 | **Source:** BR-005, ADR-0030, **Security Review condition 9 (SEC-004 closing set)**
- **Action:** (a) Two concurrent `updateProjectStatusFile()` children; (b) instrument `acquireShardLock` and `acquireProjectionLock` to record order and assert no shard lock is acquired while the projection lock is held; (c) an abandoned `.projection.lock` (dead PID).
- **Assertion:** (a) both complete, the second waits, and the final projection matches reality with neither output lost; (b) no inversion of the total order **shard lock → projection lock** is recorded anywhere in the full suite; (c) `LOCK_ABANDONED` names `unlock --projection --nonce <observed-nonce> --quiesced`, the lock file is byte-identical afterwards, and it is **refused rather than cleared** — no automatic clear exists for the projection lock either, whose blast radius is repository-wide.
- **Cleanup:** Remove workspace.

### TC-028: Whole-Tree Byte Equality for Read-Only Paths
- **Priority:** P0 | **Source:** AC-010, BR-004, SEC-005, **Security Review condition 10 (SEC-004 closing set)**
- **Method:** Walk the fixture root, recording path, size, mtime and SHA-256 for every file. Run `compileStatusProjection()`, `detectArchivedShardDrift()`, `checkProjectStatusSync()`, the `--check` CLI, and `inspect`. Re-walk.
- **Assertion:** The two manifests are deep-equal — not just `PROJECT_STATUS.md`, the whole tree, so a stray lock, temp file or log cannot slip through. The walk explicitly includes `work-items/.locks/` and `.projection.lock`, which a dot-skipping walker would otherwise hide.
- **Cleanup:** Remove workspace.

### TC-029: Migration Dry Run on Real Shard Copies
- **Priority:** P1 | **Source:** AC-002, implementation plan's operational-migration task
- **Precondition:** Byte-copies of the real `issue-249` and `issue-275` shards in a fixture workspace. Both are `bug-fix`, so ADR-0031's narrowing migrates nothing about their `workflow_id`.
- **Action:** Backfill (asserting TC-004's `history.length + 1` rule on the real data), then the terminal hops, then archive. **The authorized actor for each hop is read from `TRANSITION_MATRIX[from].actors` at test time, not hard-coded** — Component 2 is still adding the terminal entries, so a name written into this document would be a guess.
- **Assertion:** Every step succeeds with the recorded closeout evidence; a single actor attempting **both** hops is rejected with `UNAUTHORIZED_ACTOR` for at least one of them — the load-bearing property is that no one role can self-certify the whole closeout; the final shards validate against the envelope schema and are absent from the projection; no lock survives at any of TC-019b's three pathnames.
- **Sequencing:** this case runs against copies only. The real migration runs after the backfill tool lands with the strict lane disabled, and the strict lane is enabled only after it (see Exit Criteria).
- **Cleanup:** Remove workspace.

### TC-030: Lock Inspection Surface Is Read-Only and Needs No Quiescence
- **Priority:** P1 | **Source:** ADR-0027, R-002
- **Action:** Run `inspect` against a locked shard and against a shard with an abandoned lock.
- **Assertion:** Prints the holder's `pid`, `nonce`, `created_at` and the shard's current digest; whole-tree byte equality holds across the call (TC-028 method); `inspect` carries **no** `--quiesced` requirement and mutates nothing, in deliberate contrast to `unlock`.
- **Cleanup:** Remove workspace.

### TC-031: Zero Lock and Temp Leakage Across All Failure Paths
- **Priority:** P2 | **Source:** QG-002
- **Action:** Drive every reject code in §4 once, then walk the fixture tree.
- **Assertion:** After any path in which the caller held the lock, no file survives at `work-items/.locks/{task_id}.lock`, `work-items/{task_id}/.lock`, `archive/{task_id}/.lock`, or `work-items/.projection.lock`, and no `.tmp-*` entry survives anywhere. The `.reclaim*` pathname from the withdrawn takeover design must not exist at all — its presence would mean a reclaim path was reintroduced.
- **Cleanup:** Remove workspace.

### TC-032: Active-Shard Envelope Composition Is `bug-fix` Only
- **Priority:** P0 | **Source:** ADR-0031, Round 5 Blocking finding 1
- **Precondition:** Fixture workspace with real shard directories under `docs/records/work-items/`, exercising the **active-shard lane**, not `docs/contracts/examples/`.
- **Action:**
  1. Validate a well-formed `workflow_id: bug-fix` durable envelope through the active-shard lane.
  2. Validate a durable envelope for each **other** `workflow_id` the envelope previously advertised — `new-feature`, `config-change`, `data-change`, `framework-meta` — enumerated explicitly rather than probed with a single made-up string.
  3. Validate `workflow_id: "made-up"`.
  4. Assert the `change_type` enum is narrowed in step with `workflow_id`.
- **Assertion:**
  1. The `bug-fix` envelope validates, and every state it carries is admissible under the two-layer rule.
  2. Each of the four named workflows is **rejected by the envelope schema enum**, and the rejection is produced by the active-shard lane. Each of these has no durable shard in Package 1 by design — including Issue #277 itself, which is `framework-meta`.
  3. `"made-up"` fails closed on the same enum.
  4. **Lane-separation assertion:** this case must fail if the fixtures are moved into `docs/contracts/examples/`. `loadSchemas()` in `scripts/validate-contracts.mjs` selects only `*-state.schema.json` and deliberately keeps `durable-task-envelope.schema.json` out of that lane, so an example-lane fixture cannot detect a composition failure. The test asserts the envelope schema is **not** among the schemas the example lane loads.
  5. The existing example-fixture lane still validates end to end after the policy amendment and the envelope's new required `policy_contract_version`. The fixture set is **discovered by globbing** `docs/contracts/examples/*.yaml` at test time and asserted non-empty; no count is written down. (The Round 4 plan and SDD asserted "eleven" for a directory holding ten `.yaml` files plus a `dispatch-receipts/` subdirectory — a count in prose is exactly the kind of claim that rots.)
- **Cleanup:** Remove workspace.

### TC-033: Dot-Prefixed Entries Are Skipped Before Any Shard-Validity Check
- **Priority:** P1 | **Source:** SDD Component 4 (explicit projection exclusion), ADR-0027 amendment
- **Precondition:** Fixture `work-items/` containing one valid `bug-fix` shard plus `.locks/` (holding a lock file), `.projection.lock`, and `.gitkeep`.
- **Action:** Run `discoverActiveShards()`, `compileStatusProjection()`, and the strict active-shard validation lane.
- **Assertion:**
  1. `discoverActiveShards()` returns the single real shard; no dot-prefixed entry appears.
  2. The strict lane passes — a dot-prefixed entry must be filtered **before** the shard-validity check, not rejected by it; an implementation that validates first and filters second fails with a missing-`task-state.json` error and fails this case.
  3. The skip is non-lossy: the envelope schema constrains `task_id` to `^[a-z0-9_-]+$`, so no legitimate shard can be dot-prefixed. The case asserts the schema pattern still excludes a leading `.`, so the exclusion rule cannot silently become lossy if the pattern is later relaxed.
- **Cleanup:** Remove workspace.

### TC-034: Standing Guard — No Policy Row May Have an Empty Matrix Intersection
- **Priority:** P0 | **Source:** SDD Component 2 ("Guard against silent recurrence"), ADR-0026, ADR-0031, OQ-1 resolution
- **Rationale:** OQ-1 was not a runtime bug — it was a *design-time* hole that strict intersection created and that no existing case could see, because every case drove hand-picked hops. This is the only check that would have caught the severed `investigating -> implementing` hop before implementation, so it is a **build-failure** guard, not a runtime surprise.
- **Scope set (derived, not hand-listed).** The in-scope policy set is read from the durable envelope schema's `workflow_id` enum — in Package 1, `["bug-fix"]` (ADR-0031). The case asserts the set it enumerates is **exactly** that enum, so widening the envelope in a later package automatically widens this guard and cannot silently leave a new workflow unguarded.
- **Action:** For every in-scope `docs/contracts/*-workflow.yaml`, parse every `transitions` row and compare against `TRANSITION_MATRIX`.
- **Assertion:**
  1. **Per policy destination:** for every row `(from, to)`, `to ∈ TRANSITION_MATRIX[from].destinations`. The `investigating -> implementing` row is the one that fails against the unwidened matrix; reverting Component 2's widening must turn this red.
  2. **Per source state:** for every `from` named by any policy row, the intersection `MATRIX[from].destinations ∩ {policy destinations from that state}` is **non-empty**. An empty intersection means that state is a dead end for that workflow and is a failure, not a warning.
  3. **Reachability, so a dead end cannot hide behind a non-empty row:** every policy `state` other than the initial `intake` is reachable from `intake` by a walk over the *computed intersection* alone, and every non-terminal state has at least one outgoing intersection edge. This is what catches a hop severed mid-path rather than at its source.
  4. **Every policy `from` has a matrix entry at all** — a policy naming a source state absent from `TRANSITION_MATRIX` would fail closed at runtime with `UNKNOWN_SOURCE_STATE` and is caught here instead.
  5. The enumerated row set is asserted non-empty, so a broken YAML parse cannot pass vacuously.
- **Out of scope, stated so it is not read as a gap:** `new-feature`, `config-change` and `data-change` are **not** in this guard's scope in Package 1. Their state vocabularies (`discovery`, `human-review`, `release`, `classifying`, `owner-review`, `sa-review`, `rollout`, `monitoring`, `complete`, `schema-design`, `data-review`, `security-review`, `human-approval`, `executing`, `validating`) are almost entirely absent from `TRANSITION_MATRIX`, so applying assertion 1 to them today would fail on nearly every row — which is Round 5 Blocking finding 1 restated, deferred by ADR-0031, not a defect this package introduces. The envelope-enum-derived scope set is what keeps that deferral honest: those workflows enter this guard on the same commit that admits them to the envelope, and TC-032 asserts they are rejected until then.
- **Cleanup:** None — this is a static analysis over repository contracts and touches no fixture.

---

## 11. Exploratory Charter

| Charter | Scope | Timebox | Rationale |
|---|---|---|---|
| EC-01 | Hand-drive `task-machine-cli.mjs` through `inspect` → `transition` → `unlock --quiesced` on a scratch shard, deliberately mistyping digests, nonces and actors, omitting `--quiesced`, and acting on a stale `inspect` reading; judge whether each error message tells an operator what to do next and whether the pre-unlock consequence notice actually deters a wrong quiescence assertion | 45 min | The fail-closed design trades automatic recovery for operator action (ADR-0027), and `unlock` is now explicitly non-race-safe with the operator as the only safety mechanism. If the diagnostics or the consequence notice are unclear, SEC-003's accepted availability risk and SEC-004's accepted `unlock` residual become unacceptable ones. Scripted cases assert error *codes*; only exploration judges *usability*. |
| EC-02 | Interrupt (`SIGKILL`) a transition and an archival at varied points — before/after the shard-directory rename, between the two lock acquisitions, mid-atomic-write — and inspect the resulting tree, specifically which of the three lock pathnames survives | 45 min | Crash points between rename, write and release are combinatorial; exploration finds the interleavings the scripted fault injections did not think to model, and the stable lock namespace changes which residues are possible. |
| EC-03 | Probe the old-but-live lock tier: hold a shard lock from a deliberately slow process, and from a process whose PID has been reused, and walk an operator through recovery | 30 min | SEC-003 is *widened* by the dead-PID-only predicate: this tier is the permanent-wedge case. It is correct by design but only survivable if the diagnostics lead somewhere. Nothing scripted can judge that. |

Exploratory testing is **not** N/A for this change: all three charters target properties the deterministic
suite cannot assert.

---

## 12. Mutation Ledger

Score is **measured and recorded** for the core engine modules; no fixed threshold is asserted.

| Guard | Deliberate Mutation | Killing Case |
|---|---|---|
| Self-exclusion digest | Remove `delete normalized.state_digest` | TC-001 |
| Digest equality | Remove `data.state_digest === expected` | TC-002, TC-016 |
| Actor authorization | Remove `matrixEntry.actors.includes(canonicalActor)` | TC-005 |
| Actor canonicalization | Drop the kebab-case normalization | TC-006 |
| Mandatory CAS | Restore `if (expected_digest !== undefined)` | TC-009, TC-010 |
| CAS comparison | Invert `expected !== current` | TC-011, TC-012 |
| CAS made lock-conditional | Skip the CAS compare when the caller holds the lock it acquired | TC-012, TC-014b — this is the mutation that converts the accepted `unlock` residual into a silent lost update |
| Fail-closed source guard | Restore `if (matrixEntry) { ... }` | TC-022 |
| Terminal destinations | Give `completed` a non-empty `destinations` | TC-021 |
| Policy evidence sourcing | Read `requires` from the matrix instead of the policy | TC-007 |
| Matrix ∩ policy | Check only the matrix | TC-024 (step 3) |
| Matrix ∩ policy | Check only the policy | TC-024 (step 4) |
| Authority rule fallback | Reintroduce a matrix fallback or an envelope-only allowlist for policy-silent pairs | TC-024 (step 5) |
| Matrix widening | Revert `TRANSITION_MATRIX.investigating.destinations` to omit `implementing` | TC-034 (assertion 1), TC-007 (the `investigating -> implementing` half), TC-024 (step 2) |
| Standing intersection guard | Delete the guard, or weaken it from a build failure to a warning | TC-034 — mutate by severing any one policy row's matrix counterpart and asserting the guard goes red |
| Guard scope derivation | Hand-list the guard's policy set instead of deriving it from the envelope `workflow_id` enum | TC-034 (scope-set assertion) — a hand-list silently drops a workflow the envelope later admits |
| Reachability | Sever a hop mid-path, leaving its source state's intersection non-empty via another destination | TC-034 (assertion 3) |
| Terminal / blocking evidence | Restore the `to !== 'blocked'` evidence bypass | TC-025 (step 4) |
| Closeout evidence | Drop `closeout_evidence` from the `handoff -> completed` policy row | TC-025 (step 3) |
| `cancelled` ingress | Add a `-> cancelled` policy row, or a wildcard source | TC-025 (steps 1–2) |
| Workflow narrowing | Widen the envelope `workflow_id` enum back to five values | TC-032 |
| Lane separation | Move the envelope schema into the example-fixture lane | TC-032 (step 4) |
| Dot-prefix skip | Filter dot-prefixed entries *after* the shard-validity check, or not at all | TC-033 |
| Nonce-safe release | Change `parsed.nonce === nonce` to `true` | TC-013 |
| Lock namespace | Move the shard lock back to `work-items/{task_id}/.lock` | TC-019b (assertions 2–3) |
| Lock API keying | Derive the lock path from `shardDir` instead of `task_id` | TC-013, TC-019b |
| Abandoned-lock refusal | Replace the `LOCK_ABANDONED` throw with `unlinkSync(lockPath)` | TC-014 |
| Abandonment predicate | Restore `age > 30 s` **or** dead PID | TC-014c (assertion 1) |
| Abandonment predicate | Gate `LOCK_ABANDONED` on age as well as `ESRCH` | TC-014c (assertion 2) |
| `unlock` quiescence gate | Accept `unlock` without `--quiesced` | TC-014c (assertion 4) |
| `unlock` nonce check | Skip the nonce comparison in `unlock` | TC-014 (assertion 5) |
| Third removal site | Add any lock-removal call site beyond owner release and `unlock` | TC-014 (assertion 3) |
| Writer temp cleanup | Remove `unlinkSync(tmpPath)` from the catch | TC-017, TC-017b |
| Zero-progress guard | Remove the `if (n <= 0) throw` from the write loop | TC-017b (assertions 1–2, via the test timeout) |
| Zero-progress guard, over-broad | Change `n <= 0` to `n < buffer.length` | TC-017b (assertion 4) |
| Backfill sequence | Set `sequence_number = history.length` | TC-004 (assertions 1–3) |
| Archival compensation | Remove the compensating rename | TC-019 |
| Compensation honesty | Swallow a failed compensating rename | TC-019 |
| Archive/mutate overlap | Drop the shard lock before the archive rename | TC-019b (assertion 1) |
| Release ordering | Release the shard lock before the projection lock | TC-019b (assertion 4) |
| Projection purity | Make `compileStatusProjection` write its output | TC-028 |
| Read-only check | Let `checkProjectStatusSync` repair | TC-020, TC-028 |
| Projection lock ordering | Compile **before** acquiring the projection lock | TC-026 |
| Projection lock presence | Remove the projection lock entirely | TC-026, TC-027 |
| Projection lock auto-clear | Clear an abandoned `.projection.lock` automatically | TC-027 (c) |
| Lock order | Acquire a shard lock while holding the projection lock | TC-027 (b) |

---

## 13. Quality Gate & Governance Invariants

1. **QG-001 Review Gate:** every commit touching `.mjs`/`.js` carries a matching `docs/records/qa/*-code-review.md`, authored by the non-implementer.
2. **CI Parity:** 1:1 validation mirroring between `.github/workflows/validate-contracts.yml` and `.gitlab-ci.yml`.
3. **QG-002 Deterministic Invariants:** zero lost updates on shard and projection; crash durability; zero temp leaks; zero lock leaks at any of the three archive-relevant pathnames; zero ghost entries; zero bytes written by any read-only path; no unbounded write loop.
4. **QG-003 No Vacuous Concurrency Pass:** every multi-process case names the single reject code it may observe and asserts its generated/contended set is non-empty. A concurrency case that passes because an earlier guard rejected the child is treated as a **failure**, not a pass.
5. **Zero Test Weakening:** no unrelated test file is modified, and no existing assertion is relaxed.

---

## 14. QA Handoff

| To | When | Evidence QA Delivers | Evidence QA Requires Back |
|---|---|---|---|
| Developer Agent | On any failing case | Failing case id, exact command, observed vs expected, fixture path | Fix plus the case turning green without weakening it |
| SA Agent | OQ-1 — **closed** | The computed `POLICY \ MATRIX` disagreement set and the transitions it made unreachable; now the TC-034 guard output on every run | Ruling received: the matrix widens (SDD Component 2). Required back on any *future* TC-034 failure: a ruling on which layer changes — QA will not pick a layer |
| Security Reviewer | After Checkpoint 2 | The **SEC-004 closing set** — TC-012, TC-014, TC-014b, TC-014c, TC-026, TC-027, TC-028 — plus the lock-order instrumentation log and the TC-014b injection-seam evidence | Recheck of conditions 2–5 and 7–10, and a decision on whether SEC-004 moves from Open to Closed |
| Documentation Agent | After Human approval | Final AC-to-case traceability table | ADR-0026..ADR-0031 recorded in `DECISIONS.md` |
| Human Maintainer | Before merge | Full suite result, mutation ledger outcomes and measured score, gate results, migration evidence | Merge decision |

**Rework ceiling:** two verifying → rework cycles. A third requires an explicitly recorded Human
Maintainer decision (Issue #210 precedent).

---

## 15. Open Questions

### Resolved

| ID | Question | Resolution | Effect on this plan |
|---|---|---|---|
| OQ-1 | Under the strict intersection, the `bug-fix` policy row `investigating -> implementing` had no counterpart in `TRANSITION_MATRIX.investigating.destinations`, so the intersection at that hop was empty and no `bug-fix` shard could leave `investigating`. Which layer changes? | **SA Agent ruled: the matrix widens, not the policy.** `TRANSITION_MATRIX.investigating.destinations` becomes `['implementing','designing','planning','blocked','cancelled']` (SDD Component 2). `AGENTS.md` names the policy canonical for workflow behaviour and Component 1 defines the matrix as a superset the policy narrows; a superset omitting a state the canonical policy requires is simply a wrong superset. Amending the policy, and demoting the matrix to actors-only, were both considered and rejected. | §3 matrix table updated (the cell is now `Y`). TC-007 gains the hop as a positive case **and** as the regression test for the widening, and no longer routes around it. TC-024 is unblocked; its step-4 set is now expected empty and is *discovered*, not assumed. **TC-034 added** as the standing design-time guard, with four mutation-ledger rows and a new P0 risk row 11b. |
| OQ-3 | The security review's §2 Verdict named six SEC-004 cases while its Evidence column and closing-set paragraph named seven. | **Security Reviewer corrected §2.** The seven-case set — TC-012, TC-014, TC-014b, TC-014c, TC-026, TC-027, TC-028 — is now stated identically in all three places, with TC-014c explicitly part of the set rather than an addition (the predicate defect, SEC-006, is a component of the Blocker 4 exposure). | No change required: this plan already encoded the seven-case superset in Exit Criteria, the QA Handoff row and every affected case. **Confirmed in agreement.** |

### Open

| ID | Question | Owner | Blocks |
|---|---|---|---|
| OQ-2 | TC-014b requires a test-only injection seam in `unlock` between the nonce comparison and the `unlink`. Without it the check/unlink window cannot be forced deterministically from another process, and Security Review condition 4 cannot be closed by anything stronger than a bounded-retry probe. Will the implementation expose that seam? | Developer Agent, with Security Reviewer concurrence | TC-014b, and therefore SEC-004 closure |
