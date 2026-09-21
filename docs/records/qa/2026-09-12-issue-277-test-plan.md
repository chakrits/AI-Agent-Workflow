# TEST_PLAN.md: Control-Plane State Integrity & Architecture Remediation

## Metadata

- Work Item ID: Issue #277
- Title: Control-Plane State Integrity & Architecture Remediation (Package 1)
- Owner: QA Lead (`qa-agent`)
- Date: 2026-09-12
- Status: Draft (ADR-0032 QA Full Mode — fenced archive-ledger blueprint)
- QA Design Verdict: **PASS** — blueprint is internally consistent, testable, and fully traced; runtime closure still requires Developer implementation plus independent QA mutation evidence.
- Governing SDD: `docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md` (Round 9 append-only archive ledger, Draft)
- Governing Security Review: `docs/records/security-review/2026-09-12-issue-277-security-review.md` (ADR-0032 blueprint PASS; implementation evidence pending)
- Governing Requirements: `docs/records/requirements/2026-09-12-control-plane-state-integrity-discovery.md` (AC-001..AC-010, BR-001..BR-005)

---

## 1. Scope

### In-Scope
- Two-layer contract model with lane-specific bindings: legacy examples compare `state.contract_version`; active durable envelopes compare `state.policy_contract_version`.
- **Package 1 composable scope is `bug-fix` only (ADR-0031):** the durable envelope's `workflow_id`/`change_type` enums and the strict active-shard lane admit `bug-fix` and nothing else.
- The single authority rule: legality is the **intersection** of `TRANSITION_MATRIX` and the shard's workflow policy, with evidence sourced from the policy row. No matrix fallback, no envelope-only allowlist, no exception contract.
- Envelope hashing (`digestTaskEnvelope`) with `state_digest` self-exclusion and stored-digest equality on load.
- Actor policy validation, terminal-state closure, and the fail-closed `UNKNOWN_SOURCE_STATE` guard.
- Policy-authoritative `resume` from `blocked`: only to the latest interrupted `investigating` or `verifying` state, with `resume_evidence`, `approver_id`, and Human/orchestrator actor.
- Mandatory CAS under the fail-closed per-shard lock, inside `mutateTaskStateOnDisk(rootDir, expectedTaskId, ...)`.
- Identity-bound shard locks in `docs/records/work-items/.locks/{expectedTaskId}.lock`: the explicit ID derives the active path and lock, then the inside-lock re-read must match both it and the directory basename before CAS/write/rename.
- Three-outcome valid-lock classification plus fail-closed `LOCK_MALFORMED`; maintenance recovery requires `--quiesced` and either a valid-lock `--nonce` or malformed-lock `--malformed` mode.
- Deterministic I/O/race injection through `createStateIo({ fsOps, processOps, clock, random })`, with no mutable global hook or production test-only branch.
- ADR-0032 conditional commits: recoverable admission locks, stable monotonic generations, and non-reclaimable per-scope `wx` commit guards shared by writers and admission recovery.
- Fenced retry semantics: stale writers fail `FENCING_TOKEN_STALE`; retry must reacquire, reread generation/digest, and recompute rather than retagging an old candidate.
- POSIX crash-durable atomic writing with temp cleanup and zero-progress fault handling.
- Projection purity: zero bytes written by `compileStatusProjection`, `detectArchivedShardDrift`, and `--check`.
- Projection transaction: projection lock, post-acquisition recompile, total lock order.
- Append-only, digest-protected archive transaction ledger with immutable intent, generation-bound attempts, conditional revision updates, directional phases, distinct terminal outcomes, guarded adoption, fenced forward/compensation renames, and exhaustive recovery matrix.
- Evidence-bound migration of issue-249 and issue-275.

### Out-of-Scope
- Cryptographic agent identity verification (process signing) — NG-001.
- Unbacked numeric latency/throughput NFR benchmarks — NG-002.
- External database integrations — NG-003.
- Automatic abandoned-lock recovery — NG-004, explicitly rejected by ADR-0027; tested only as a *refusal*.
- Durable envelopes for `new-feature`, `config-change`, `data-change` and `framework-meta` — ADR-0031 defers them to a later package. Tested here only as **rejections** (TC-032).
- Online recovery of abandoned/malformed commit guards. Commit guards are the serialization root and require offline repair after all writers stop and the host/session restarts.
- Wildcard (`<any> -> X`) transition semantics in the validator — out of Package 1 scope per SDD Component 1.

---

## 2. Business Flow & IPO Analysis

### 2.1 Business Flow

```text
Agent decides a transition
  -> inspect (read digest + lock holder; read-only, no quiescence needed)
  -> mutateTaskStateOnDisk(rootDir, expectedTaskId, {to, actor, expected_digest, evidence, mode})
       -> validate expectedTaskId; derive work-items/{expectedTaskId}/task-state.json
       -> acquire work-items/.locks/{expectedTaskId}.lock
            [young+live  => backoff/retry, then LOCK_ACQUISITION_TIMEOUT]
            [old+live    => LOCK_ACQUISITION_TIMEOUT + LOCK_HELD_LONG + holder diagnostics]
            [dead PID    => LOCK_ABANDONED, lock untouched, names unlock --quiesced]
            [malformed lock => LOCK_MALFORMED, lock untouched]
       -> snapshot durable generation g; read/validate state; compute candidate
       -> acquire non-reclaimable task commit guard
       -> inside guard re-read generation + envelope
       -> three-way identity + digest + generation check
                                        [CAS_CONFLICT or FENCING_TOKEN_STALE before rename]
       -> transition: matrix INTERSECT policy legality, policy-sourced evidence
       -> resume: policy resume row + latest into-blocked history binding
                                        [refuse if illegal / unauthorized / evidence missing]
       -> pure transition + atomic write
       -> release lock (nonce-matched) in finally, against the stable namespace
  -> (terminal) archiveWorkItem
       -> hold admission; task guard creates immutable `prepared` intent
       -> fenced active->archive rename + parent sync + `archive_moved`
       -> release task guard; fresh projection under projection guard
       -> task guard finalizes `terminal_archived`
          [projection failure -> `compensation_requested` -> fenced reverse rename
           -> `compensation_moved` -> fresh active projection -> `terminal_compensated`]
  -> CI: validate:status-projection --check  [read-only; drift => exit 1 + recovery command]

Operator-only, off the normal path:
  unlock (--task T | --projection) (--nonce N | --malformed) --quiesced
       -> acquire same scope commit guard
       -> durably persist generation + 1
       -> only then unlink admission + sync directory
                                         [false quiescence revokes; old writer cannot commit]
```

### 2.2 IPO Matrix

| # | Process | Input | Processing | Output | Failure Output |
|---|---|---|---|---|---|
| IPO-1 | `digestTaskEnvelope` | Envelope object | Shallow copy, delete `state_digest`, RFC 8785 JCS SHA-256 | 64-hex digest; argument unmodified | `Invalid envelope object` on non-object |
| IPO-2 | `validateEnvelopeSchema` | Envelope object | Ajv envelope schema (`workflow_id` limited to `bug-fix`), then `stored === computed` | Validated envelope | `MALFORMED_SHARD`, `DIGEST_INTEGRITY_MISMATCH` (with both digests) |
| IPO-3 | `acquireShardLock` | `(rootDir, expectedTaskId)` | `openSync('wx')` on `work-items/.locks/{expectedTaskId}.lock`; strictly parse an existing holder, then classify valid records by PID liveness first and age second | Nonce | `LOCK_ACQUISITION_TIMEOUT` (optionally `LOCK_HELD_LONG`), `LOCK_ABANDONED`, `LOCK_MALFORMED`; lock left intact |
| IPO-3b | `releaseShardLock` | `(rootDir, task_id, nonce)` | Read the stable-namespace lock; unlink only when `parsed.nonce === nonce` | Lock removed | Silent no-op on nonce mismatch; lock preserved |
| IPO-3c | `unlock` (fenced admission recovery) | exactly one of `--task`/`--projection`; exactly one of `--nonce`/`--malformed`; warning acknowledgement | Acquire scope commit guard; re-read lock/generation; persist and sync generation + 1 before admission unlink/sync | Admission removed; stale admitted writers revoked even if quiescence assertion was false | Missing flags refused; `LOCK_NONCE_MISMATCH`, `LOCK_MALFORMED`, `LOCK_BECAME_VALID`; fence/guard errors |
| IPO-3d | Fenced admission recovery | Scope, observed admission, current generation | Hold scope commit guard; validate; atomically persist generation + 1 and sync; then unlink admission and sync | Admission removed; generation monotonically advanced | `FENCE_STATE_MISSING`, `FENCE_STATE_MALFORMED`, `FENCE_GENERATION_EXHAUSTED`, `COMMIT_GUARD_ABANDONED` |
| IPO-3e | Commit guard | Task/projection scope | Exclusive `wx`; owner-nonce release only; no online reclaim path | Serializes generation bumps and commit renames | `COMMIT_GUARD_ABANDONED`; offline repair only |
| IPO-4 | `mutateTaskStateOnDisk` | `rootDir`, `expectedTaskId`, `{to, actor, expected_digest, evidence, mode}` | Derive path/lock; snapshot generation and compute; inside task guard re-read generation/state, identity and digest; atomic rename + directory sync | New envelope on disk, `sequence_number + 1` | Prior errors plus `FENCING_TOKEN_STALE` before rename; retryable with mandatory recompute |
| IPO-5 | `compileStatusProjection` | Root dir | Read + validate every active shard, render table | `{markdown, digest}`; **no writes** | `MALFORMED_SHARD` |
| IPO-5b | `discoverActiveShards` | Root dir | Enumerate `work-items/*`; before validation skip exact reserved `archive/` and every dot-prefixed entry, and no other entry | Shard dirs only | `RESERVED_TASK_ID` when an active operation supplies `archive` |
| IPO-6 | `detectArchivedShardDrift` | Root dir | Compare archive/, work-items/, `PROJECT_STATUS.md` | `{drifted, findings[]}`; **no writes** | — |
| IPO-7 | `updateProjectStatusFile` | Root dir | Acquire projection lock, **then** compile, atomic write, release | `{updated, digest}` | `LOCK_ABANDONED`, `LOCK_ACQUISITION_TIMEOUT`, `MALFORMED_SHARD` |
| IPO-8 | `archiveWorkItem` / reconciler | Expected task ID + journal expectation tuple | Append immutable intent/attempt; conditionally advance directional phases under task guard; fenced forward/compensation rename; fresh projection under separate guard; finalize terminal | Exact terminal phase/location/outcome with matching projection | `ARCHIVE_JOURNAL_CONFLICT`, `ARCHIVE_JOURNAL_MALFORMED`, `ARCHIVE_JOURNAL_TAMPERED`, `ARCHIVE_EXECUTOR_STALE`, `ARCHIVE_LOCATION_AMBIGUOUS`, `ARCHIVE_ADOPTION_UNSAFE`, `FENCE_GENERATION_REGRESSION` |
| IPO-8b | Archive adoption | Current generation > attempt generation in an auto-resumable matrix cell | Under task guard append fresh attempt linked to predecessor; retain intent/phase/outcome; reread and recompute | Current attempt bound to current generation | Any unlisted cell fails `ARCHIVE_ADOPTION_UNSAFE`; no retag/reuse |
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
resolution in §16. TC-034 is the standing guard that makes a recurrence a build failure.

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
| 1d | Malformed lock | Empty, truncated, invalid-JSON, or schema-invalid lock record | `LOCK_MALFORMED`; bytes unchanged; recovery named | TC-038 |
| 1e | Commit guard | Guard exists or is malformed/abandoned | `COMMIT_GUARD_ABANDONED`; no online removal | TC-041 |
| 2 | Envelope schema | Ajv failure, including a non-`bug-fix` `workflow_id` | `MALFORMED_SHARD` | TC-003, TC-015, TC-032 |
| 2b | Fence record | Missing, malformed, unsafe integer, overflow, or generation reset/reuse | `FENCE_STATE_MISSING`, `FENCE_STATE_MALFORMED`, `FENCE_GENERATION_EXHAUSTED`, or `FENCE_GENERATION_REGRESSION` | TC-040, TC-048 |
| 3 | Digest integrity | `stored !== digestTaskEnvelope(data)` | `DIGEST_INTEGRITY_MISMATCH` | TC-002, TC-016 |
| 4 | Inside-guard generation | Current generation differs from writer snapshot | `FENCING_TOKEN_STALE` before rename | TC-039, TC-042 |
| 5 | Task identity | Re-read `task_id`, explicit ID and derived directory basename differ | `TASK_IDENTITY_MISMATCH` before CAS/write/rename | TC-037 |
| 6 | CAS presence | `expected_digest` missing or empty | `MISSING_EXPECTED_DIGEST` | TC-009, TC-010 |
| 7 | CAS equality | `expected_digest !== stored` | `CAS_CONFLICT` | TC-011, TC-012 |
| 8 | Source state known | No matrix entry | `UNKNOWN_SOURCE_STATE` | TC-022 |
| 9 | Destination legality | Not in matrix **∩** policy | `ILLEGAL_TRANSITION_REJECTED` | TC-021, TC-023, TC-024, TC-025 |
| 10 | Actor authorization | Canonical actor not in `TRANSITION_MATRIX[from].actors` | `UNAUTHORIZED_ACTOR` | TC-005, TC-006 |
| 11 | Evidence (policy-sourced) | Key listed on the **policy** row missing or empty | `MISSING_REQUIRED_EVIDENCE` | TC-007 |
| 11b | Terminal / blocking evidence | `handoff -> completed` without `closeout_evidence`; `-> blocked` without `stop_reason` | `MISSING_REQUIRED_EVIDENCE` | TC-025 |
| 12 | Resume operation | Ordinary transition attempts a policy resume | `RESUME_OPERATION_REQUIRED` | TC-036 |
| 13 | Resume target | Target differs from latest into-`blocked` history `from` or is outside `[investigating, verifying]` | `INVALID_RESUME_TARGET` | TC-036 |
| 14 | Resume Human evidence | Missing/empty `resume_evidence` or `approver_id`, or actor is not Human/orchestrator | `HUMAN_APPROVAL_REQUIRED` | TC-036 |
| 15 | Rework ceiling | `rework_count >= max_rework_attempts` | ceiling rejection | existing regression |
| W-1 | Atomic write progress | `fs.writeSync` returns `0` | `ATOMIC_WRITE_NO_PROGRESS` (temp unlinked, target untouched) | TC-017b |

The matrix's own `requires` is an authoring aid and is never consulted at validation time; guard 11 must
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
| 7 | Generation check moved outside commit guard, or admission removed before the durable bump, reopens silent shard/projection loss after false quiescence | Low | High — violates accepted ADR-0032 | P0 | TC-014b, TC-039, TC-040, TC-042 |
| 8 | **Live slow holder routed into a destructive recovery path on age alone** (withdrawn Round 4 predicate, SEC-006) | Medium | High if reintroduced | P0 | TC-014c |
| 9 | Strict active-shard lane trips on `.locks/`, `.gitkeep` or `.projection.lock` | Medium | Medium — CI wedge on a non-shard entry | P1 | TC-033 |
| 10 | Backfill breaks the two live shards, or writes a `sequence_number` that duplicates the last history position | Medium | Medium — recoverable from backup | P1 | TC-004, TC-029 |
| 11 | Matrix and policy drift apart after this change | Medium | Medium | P1 | TC-024, TC-034 |
| 11b | **A policy row has no matrix counterpart, severing a workflow's happy path at design time** (the OQ-1 defect: strict intersection *created* this class, it did not reveal it). Invisible to any case that drives hand-picked hops | Medium | High — the workflow cannot complete at all, and only in production data | P0 | TC-034, TC-007 |
| 12 | Envelope advertises a workflow it cannot represent (Round 5 Blocker 1) | Low (narrowed to `bug-fix`) | Medium | P1 | TC-032 |
| 13 | Abandoned lock wedges one shard or all of CI — **accepted and widened** by the dead-PID-only predicate (SEC-003): an old-but-live lock, and a lock whose writer died off-host while its PID is coincidentally live, now wedge until an operator establishes quiescence | Medium | Medium — availability traded for integrity | P1 | TC-014, TC-014c, TC-027, TC-030 |
| 14 | Temp or lock file leakage, including a zero-progress write spin | Low | Low | P2 | TC-017, TC-017b, TC-031 |
| 15 | A pre-read envelope selects a different lock from the path later written | Medium | High — two writers mutate one pathname under different locks | P0 | TC-037 |
| 16 | Global version-field replacement breaks the legacy fixture lane or bypasses active-envelope policy binding | Medium | High — contracts reject valid history or accept drift | P0 | TC-035 |
| 17 | Strict transition intersection makes `blocked` permanently terminal or resume becomes a broad bypass | Medium | High — workflow wedge or unauthorized state jump | P0 | TC-036 |
| 18 | Empty/partial lock from crash is unreadable and unrecoverable, or is cleared automatically | Medium | High for projection lock | P0 | TC-038 |
| 19 | Abandoned commit guard blocks a task or all projection publication | Low | High availability; integrity preserved | P0 | TC-041 |
| 20 | Archive journal is overwritten, ambiguously recovered, or adopts stale candidates | Medium | High — wrong-direction rename or false terminal success | P0 | TC-043..TC-047 |
| 21 | Generation resets/reuses across restart, archive, rollback or task-ID recreation | Low | High — ABA defeats fencing | P0 | TC-048 |
| 22 | Symlink/traversal or hostile local files escape stable namespaces | Low under trusted local workspace | High | P0 | TC-049 |

---

## 6. Test Types In Scope

- [ ] Unit — hasher, guards, matrix, writer
- [ ] Contract — envelope v2 (`bug-fix` only), lane-specific version bindings, policy transition/resume amendment, existing example fixtures
- [ ] Active-Shard Composition — real `work-items/` path, not the example-fixture lane
- [ ] Concurrency & Contention — ordinary A/B serialization, false-quiescence fencing, retry recomputation, projection fencing, archive/compensation fencing, guard non-overlap
- [ ] Fault Injection & Crash Boundaries — injected `createStateIo`, generation/admission ordering, write/sync/rename/journal/projection/compensation/finalize boundaries, malformed locks/guards/ledger
- [ ] Read-Only Assertion — whole-tree byte equality
- [ ] CLI — mandatory CAS flags, `inspect`, `unlock --quiesced`
- [ ] Integration — projection, archival, reconcile idempotency, backfill
- [ ] Regression — full repository suite
- [ ] Review Gate Governance — QG-001

### Test Design Techniques

| Technique | Application | Cases |
|---|---|---|
| Equivalence partitioning | Valid, stale, missing and empty digests; valid, malformed, dead/live lock records; allowed and disallowed workflow IDs | TC-009..TC-016, TC-032, TC-038 |
| Boundary analysis | `sequence_number` continuation, zero/short writes, 30-second lock-age edge while PID liveness stays fixed | TC-004, TC-014c, TC-017b |
| Decision tables | Ordered guards; transition matrix ∩ policy; valid/malformed recovery flags | §4, TC-024, TC-036, TC-038 |
| State transition testing | Full computed bug-fix graph, terminal closure and policy-authoritative blocked resume | TC-007, TC-021..TC-025, TC-034, TC-036 |
| Fault/failover injection | CAS/write barriers, wrong unlock, write/rename failures, archival compensation and lock corruption | TC-014b, TC-017..TC-020, TC-026..TC-028, TC-037..TC-038 |
| API functional testing | N/A — Package 1 exposes local ESM functions and a CLI, with no HTTP/API contract. | N/A |
| Performance baseline | No numeric NFR is approved; bounded lock/test timeouts are functional anti-hang assertions only. | TC-013, TC-014c, TC-017b |
| Security fundamentals | Role authorization, fail-closed parsing, fenced recovery, non-reclaimable guard, journal integrity, hostile paths and read-only purity | TC-005..TC-007, TC-014..TC-016, TC-028, TC-038..TC-049 |

---

## 7. Environment

- Node.js >= 22, ESM, `node:test` + `node:assert/strict`.
- Fixtures in isolated `os.tmpdir()` workspaces; no test touches the real repository tree.
- Multi-process cases use `child_process.spawn` on a fixture-scoped harness script, never on repository state.
- Fault and race cases receive a delegating adapter from `createStateIo({ fsOps, processOps, clock, random })`; tests pause real I/O operations at named barriers while production code contains no environment flag, global hook, or test-only branch.
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

Ordinary child command shape for TC-012, TC-019b, TC-026 and TC-027:

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

- [x] Human Maintainer rejected SEC-004 residual and selected fenced conditional commit.
- [x] ADR-0032 recorded in `DECISIONS.md`; requirements, SDD and implementation plan contain the final append-only archive-ledger protocol.
- [x] Security Review verdict is PASS at blueprint level after adversarial archive/adoption re-review.
- [x] OQ-2 deterministic injection seam remains resolved by `createStateIo`.
- [x] Prior Round 6 contract, resume, identity, exclusion, malformed-lock and read-only coverage remains in scope.

## 9. Exit Criteria

- [ ] AC-001..AC-010 each verified by at least one passing automated case.
- [ ] Deterministic invariants proven across ordinary concurrency and false-quiescence admission recovery: no old-generation shard/archive/projection rename, crash durability, zero temp leaks, zero ghost entries, zero read-only writes, and no unbounded loop.
- [ ] TC-014b and TC-039..TC-042 prove generation/guard serialization, durable-bump-before-unlink, mandatory retry recomputation, projection fencing, and offline-only commit-guard repair.
- [ ] TC-043..TC-049 prove fenced forward/compensation archive commits, append-only journal contract, all 72 phase/path/generation variants, crash convergence, guarded adoption, non-overlapping guards, lifecycle monotonicity and hostile-path refusal.
- [ ] TC-035..TC-038 pass: lane-specific version binding, policy-authoritative resume, identity-bound locking, and malformed-lock recovery.
- [ ] TC-034 green: no in-scope policy row has an empty matrix intersection, and every in-scope policy state is reachable over the computed intersection alone.
- [ ] Mutation ledger: every listed mutation killed by its named case.
- [ ] Full regression green with no test weakening and no unrelated test file modified.
- [ ] `validate:contracts`, `validate:ci-parity`, `validate:project-state`, `validate:review-gate`, `validate:status-projection` all pass.
- [ ] **Rollout ordering respected, with a rollback point at each step:** the backfill tool and its tests land with the strict active-shard lane **disabled**; the operational migration of issue-249 and issue-275 runs next; the strict lane is enabled only afterwards. QA will not accept a step that enables the lane while a v1 shard is still live, because that step's own `validate:contracts` verification cannot pass. (Task numbering is the implementation plan's to assign; QA asserts the ordering, not the numbers.)
- [ ] issue-249 and issue-275 migrated with the real closeout evidence recorded in the plan, archived, and absent from `PROJECT_STATUS.md`.
- [ ] Security and QA confirm runtime implementation and mutation evidence. SEC-004 is design-remediated, but is not runtime-closed from blueprint evidence alone.

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
- **Action:** `backfillTaskStateV2(shardPath)` on a v1 shard with a non-empty `history`; run again; perform one further real transition through `mutateTaskStateOnDisk(rootDir, expectedTaskId, ...)`; then `--rollback` from a fresh copy.
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
- **Also asserts (the hop OQ-1 severed):** `investigating -> implementing` as `developer-agent` with the policy row's `fail_path` and `hypothesis_matrix` **succeeds**, and fails with `MISSING_REQUIRED_EVIDENCE` when either key is absent. This hop is legal only because SDD Component 2 widens `TRANSITION_MATRIX.investigating.destinations` to include `implementing`; against the unwidened matrix it rejects with `ILLEGAL_TRANSITION_REJECTED`, so this assertion is the direct regression test for the widening. It no longer needs routing around — OQ-1 is resolved (§16).
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
- **Priority:** P0 | **Source:** AC-006, ADR-0027, Security Review condition 7
- **Precondition:** Fixture bug-fix shard in `intake` with digest `D1`; barrier directory present.
- **Action:** Spawn two `concurrent-mutator.mjs` children (command shape in §7). **Both target the same transition, `intake -> investigating`**, both as `ba-agent`, both carrying the full policy evidence set, both passing `--expected-digest D1`. Both wait on `barriers/observed`; the parent then creates `barriers/released`.
- **Assertion:** Exactly one child exits 0; the other exits 1 printing `CAS_CONFLICT` — **and no other code**, in particular never `ILLEGAL_TRANSITION_REJECTED`, `UNAUTHORIZED_ACTOR` or `MISSING_REQUIRED_EVIDENCE`, any of which would mean the race was decided by an earlier guard and the case proved nothing. Final `sequence_number` is exactly 2. The shard equals the winner's expected content. No file remains at `work-items/.locks/{task_id}.lock`.
- **Design note:** the two children must not target different destinations. Under the strict intersection only `intake -> investigating` is legal for `bug-fix` from `intake`; another target would fail before contention. This proves ordinary lock/CAS behavior only. It is not evidence that CAS preserves integrity after a false `--quiesced` assertion.
- **Cleanup:** Remove workspace.

### TC-013: Live Lock Contention and Nonce-Safe Release
- **Priority:** P1 | **Source:** ADR-0027
- **Precondition:** `work-items/.locks/{task_id}.lock` holding `nonce-A`, `created_at` = now (**young**), PID of a live process.
- **Action:** (a) `acquireShardLock(rootDir, task_id)` from another caller; (b) `releaseShardLock(rootDir, task_id, 'nonce-B')`.
- **Assertion:** (a) retries with randomized backoff and throws `LOCK_ACQUISITION_TIMEOUT` after the 5 s ceiling, **without** `LOCK_HELD_LONG` (the holder is young); (b) the lock is **not** unlinked and still holds `nonce-A`.
- **API note:** both calls take `(rootDir, task_id)`. A signature taking a shard directory is itself the defect Round 5 Blocker 2 identified at the API seam and must fail this case.
- **Cleanup:** Remove workspace.

### TC-014: Abandoned Lock Is Refused, Never Reclaimed
- **Priority:** P0 | **Source:** ADR-0027, Security Review conditions 2 and 3
- **Precondition:** `work-items/.locks/{task_id}.lock` whose PID is **known dead** (`process.kill(pid, 0)` throws `ESRCH`). Age is held constant and is **not** part of this case's classification — see TC-014c.
- **Action:** Two callers, A and B, attempt acquisition simultaneously through the barrier harness. Then an operator runs `unlock --task T --nonce <observed> --quiesced`. Then `unlock --quiesced` is attempted a second time with the now-stale nonce after a new owner has acquired the lock.
- **Assertion:**
  1. Both A and B throw `LOCK_ABANDONED` carrying the holder's `pid`, `nonce` and `created_at`; the message contains the literal `unlock --task` **and** `--quiesced`.
  2. The lock file is **byte-identical** after both attempts — SHA-256 compared. No automatic reclaim path exists.
  3. A static assertion over `scripts/lib/task-state-machine.mjs` and `scripts/task-machine-cli.mjs`: the only two lock-removal call sites in the codebase are the nonce-matched owner release and the operator `unlock` CLI. Any third removal site fails the case.
  4. The first `unlock` with matching nonce acquires the task commit guard, durably advances generation, then removes the admission lock; acquisition then succeeds at the new generation.
  5. The second `unlock` with the stale nonce throws `LOCK_NONCE_MISMATCH` and leaves the new owner's lock intact.
- **Structural note.** Admission-lock unlink remains unconditional on the bytes previously observed, so nonce is still only a mistake filter. ADR-0032 moves commit authority to the generation/commit guard: a replacement admission lock may be removed, but any old admitted writer must fail inside the guard before rename. TC-014b proves that property.
- **Cleanup:** Remove workspace.

### TC-014b: False-Quiescence Recovery Fences Old Shard and Projection Writers
- **Priority:** P0 | **Source:** AC-006, QG-002, ADR-0032, Security Review §2A
- **Mechanism:** A delegating `createStateIo` adapter pauses A after each pre-commit stage in turn: admission, generation snapshot, state/digest read, candidate computation, and immediately before commit-guard acquisition. No timing sleeps or production test-only branches.
- **Shard action/assertion:** For every pause point, recovery acquires the task guard, durably advances `g` to `g+1`, removes admission, and releases. B is admitted at `g+1`. A then acquires the guard, re-reads generation and fails `FENCING_TOKEN_STALE` with `retryable: true` and `recompute_required: true` before candidate rename. B may commit; A contributes no history event. Moving/skipping the generation check or checking it outside the guard makes the old candidate rename and fails this case.
- **Wrong-unlock shard counterexample oracle:** Force (1) A admitted with digest `D0`, (2) recovery removes A's admission and B enters, (3) A and B both compare `D0` before either writes, and (4) B commits then A attempts its stale rename. A one-shot-CAS-only mutant loses B's event; the fenced implementation rejects A at step 4 before rename. Assert all four barriers were crossed so an early CAS conflict cannot pass vacuously.
- **Inside-guard ordering:** When A already holds the guard after all checks, recovery waits. A renames and directory-syncs first; only after A releases may recovery durably bump generation and unlink admission. The total order contains no simultaneous commit.
- **Projection equivalent:** Repeat every pause point with compiler A and projection recovery. A stale compilation fails `FENCING_TOKEN_STALE` inside the projection guard before publish even though projection has no shard CAS backstop. When A already holds the projection guard, A publishes first and recovery waits.
- **Wrong-unlock projection counterexample oracle:** Force (1) A compiles old shards, (2) recovery removes A's admission and B enters, (3) B compiles newer shards and pauses before publish while A's old candidate is ready, and (4) B publishes then A attempts stale publication. A last-rename-wins mutant regresses the projection; the fenced implementation rejects A before publication. Assert each barrier and byte/digest outcome.
- **Interpretation:** This is the ADR-0032 safety proof. A false quiescence assertion may revoke work, but cannot authorize an old-generation shard or projection commit.
- **Cleanup:** Remove workspace.

### TC-014c: Abandonment Predicate — Liveness Classifies, Age Only Diagnoses
- **Priority:** P0 | **Source:** SEC-006, ADR-0027 (Round 5 amendment a), Security Review condition 5
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

### TC-019: Journaled Projection Failure and Fenced Compensation
- **Priority:** P0 | **Source:** AC-008, BR-005, ADR-0029, ADR-0032
- **Injected Fault:** Projection publication returns its named deterministic failure after forward rename.
- **Assertion:** The executor releases projection guards, persists `compensation_requested` under the task guard before any reverse rename, then revalidates generation/attempt/intent/digest and archive-only location under that guard. It renames archive→active, syncs both parents, advances `compensation_moved`, publishes a freshly compiled active projection under separate projection guards, and only then finalizes `terminal_compensated`/`compensated`. A crash or failure leaves a non-terminal journal for matrix-driven recovery; it never performs an unfenced blind rename or claims a clean terminal.
- **Cleanup:** Remove workspace.

### TC-019b: Lock Pathname Invariance Across the Archive Transaction
- **Priority:** P0 | **Source:** Round 5 Blocking finding 2, ADR-0027 (amendment), SDD Components 4, 7 and 8
- **Precondition:** Fixture with a terminal bug-fix shard at `work-items/{id}` and the stable lock namespace present.
- **Action:**
  1. **Barrier test:** child A calls `archiveWorkItem(id)` and blocks on `barriers/released` while holding the shard lock; child B attempts `mutateTaskStateOnDisk` on the same shard; the parent then releases A.
  2. Drive success, projection-failure/compensation, and stale-executor paths on fresh fixtures, recording admission and commit-guard events.
- **Assertion:**
  1. The mutation and the archive **cannot overlap**: B observes a lock-contention outcome (`LOCK_ACQUISITION_TIMEOUT`) and never enters the critical section while A holds it; the shard is never observed half-moved by a successful mutation.
  2. During the archive, the lock file exists at `work-items/.locks/{id}.lock` and **not** at `work-items/{id}/.lock` — asserted by sampling at the barrier, while the shard directory still exists.
  3. No lock is carried inside either shard directory; owner release targets the stable admission namespace. Journal, task fence and task guard paths remain stable across the rename.
  4. Forward and compensating renames each validate generation, journal tuple, identity/digest and exact location inside the task guard. Projection guards never overlap a task guard; task admission may retain the shard→projection admission order.
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
  6. Assert `EFFECTIVE` is non-empty and that `MATRIX[from].requires` is never read on the accept path (guard 10 sources evidence from the policy, per TC-007).
- **Assertion:** The engine's admitted set equals `EFFECTIVE` exactly; the two disagreement sets are both rejected; the `MATRIX \ EFFECTIVE` set is asserted non-empty so step 3 cannot pass vacuously.
- **Withdrawn-claim note:** the Round 4 version of this case permitted an "explicit envelope-only allowlist" for matrix pairs lacking a policy row. ADR-0031 states the rule exactly once as a strict intersection with **no** fallback and **no** allowlist, so that assertion is **removed**, not softened — step 5 now asserts the allowlist's absence.
- **Single-authority alignment (the outstanding item from the earlier round, now closed).** SDD Component 1 states the authority rule once and adds *"QA's TC-024 must be brought into line with it by its owner."* This revision does that: the Round 4 case permitted an "explicit envelope-only allowlist", and steps 1–6 above replace it with a strict two-way set equality against a computed intersection, with step 5 asserting no allowlist, no fallback and no exception contract exists. There is no remaining wording in this plan that grants legality from any third source. Nothing further is outstanding on this item.
- **No longer blocked.** OQ-1 is resolved by SDD Component 2's matrix widening (§16). Step 4's set is expected to be **empty** for `bug-fix`, and the case discovers that rather than asserting it — TC-034 is what turns a non-empty set into a failure.
- **Cleanup:** Remove workspace.

### TC-025: `cancelled` Is Unreachable; `completed` and `blocked` Require Their Evidence
- **Priority:** P0 | **Source:** AC-009, ADR-0031, Guard 10b, Round 5 Additional correction 1
- **Action & Assertion:**
  1. Attempt `-> cancelled` from every matrix source that lists it as a destination, on a `bug-fix` shard, **with** a well-formed `cancellation_reason`. Every attempt throws `ILLEGAL_TRANSITION_REJECTED`, because `bug-fix-workflow.yaml` enumerates no `-> cancelled` row and the rule is a strict intersection. Supplying evidence does **not** help: in Package 1 `cancelled` has no ingress at all.
  2. Assert no wildcard row exists: the parsed policy contains no `from` value of `<any>` or `*`, and the validator's exact `from -> to` lookup is unchanged. Package 1 introduces no wildcard semantics, so a `* -> cancelled` entry must be absent rather than assumed to work.
  3. `handoff -> completed` **without** `closeout_evidence` throws `MISSING_REQUIRED_EVIDENCE` naming that key; **with** it, the transition succeeds. This is the additive policy amendment's only new evidence key and nothing else covers it.
  4. Any `-> blocked` row without `stop_reason` throws `MISSING_REQUIRED_EVIDENCE`. Under SDD Component 2 the old `to !== 'blocked' && to !== 'cancelled'` evidence bypass is **deleted outright**, so `blocked` is now covered by the ordinary policy-sourced path with no special case.
- **Withdrawn-claim note:** the Round 4 version asserted that `-> cancelled` without `cancellation_reason` yields `MISSING_REQUIRED_EVIDENCE`, which presumed a reachable `cancelled`. That transition is now unreachable by **any** evidence, so the assertion is **replaced**, not weakened.
- **Cleanup:** Remove workspace.

### TC-026: Archive-vs-Projection Interleaving (Lost Update Prevention)
- **Priority:** P0 | **Source:** AC-008, BR-005, ADR-0030, Security Review condition 8
- **Precondition:** Fixture with two active bug-fix shards, one of them terminal.
- **Action:** Child C calls `updateProjectStatusFile()` and blocks on `barriers/released` immediately after entering the function but before the projection lock is acquired. Child A runs `archiveWorkItem()` on the terminal shard to completion, creating `barriers/a-done`. The parent then releases C.
- **Assertion:** The final `PROJECT_STATUS.md` matches filesystem reality — the archived shard is absent. C must have recompiled after acquiring the lock; a compile-then-lock implementation reintroduces the ghost entry and fails this case. C completes without error (it is not rejected by an earlier guard).
- **Cleanup:** Remove workspace.

### TC-027: Projection Lock Order and Mutual Exclusion
- **Priority:** P0 | **Source:** BR-005, ADR-0030, Security Review condition 9
- **Action:** (a) Two concurrent `updateProjectStatusFile()` children; (b) instrument `acquireShardLock` and `acquireProjectionLock` to record order and assert no shard lock is acquired while the projection lock is held; (c) an abandoned `.projection.lock` (dead PID).
- **Assertion:** (a) both complete, the second waits, and the final projection matches reality with neither output lost; (b) no inversion of the total order **shard lock → projection lock** is recorded anywhere in the full suite; (c) `LOCK_ABANDONED` names `unlock --projection --nonce <observed-nonce> --quiesced`, the lock file is byte-identical afterwards, and it is **refused rather than cleared** — no automatic clear exists for the projection lock either, whose blast radius is repository-wide.
- **Cleanup:** Remove workspace.

### TC-028: Whole-Tree Byte Equality for Read-Only Paths
- **Priority:** P0 | **Source:** AC-010, BR-004, SEC-005, Security Review condition 10
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
  5. The existing example-fixture lane still validates end to end after the policy amendment and remains bound to its existing `contract_version`; it neither requires nor reads `policy_contract_version`. The fixture set is **discovered by globbing** `docs/contracts/examples/*.yaml` at test time and asserted non-empty; no count is written down.
- **Cleanup:** Remove workspace.

### TC-033: Canonical Active-Root Exclusions Run Before Shard Validation
- **Priority:** P1 | **Source:** BR-004, SDD Component 4, ADR-0027 amendment
- **Precondition:** Fixture `work-items/` containing one valid `bug-fix` shard, exact `archive/` with archived content, `.locks/`, `.projection.lock`, `.gitkeep`, and a non-dot invalid entry `scratch/`.
- **Action:** Run `discoverActiveShards()`, `compileStatusProjection()`, and the strict active-shard validation lane.
- **Assertion:**
  1. Both enumerators return the single real shard and never validate exact `archive/` or any dot-prefixed entry.
  2. Filtering exact `archive/` or dot-prefixed names after validation fails this case with a missing/invalid `task-state.json`; order is observable.
  3. `scratch/` is not skipped and fails closed. Only exact `archive/` and names beginning with `.` are excluded.
  4. Active operations with `expectedTaskId: archive` fail `RESERVED_TASK_ID` before lock acquisition; no `.locks/archive.lock` is created.
  5. The schema pattern still excludes a leading `.`, proving the dot-prefix exclusion is non-lossy.
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

### TC-035: Lane-Specific Contract-Version Binding
- **Priority:** P0 | **Source:** AC-001, BR-001, ADR-0026, Round 6 Blocker 2
- **Action:** Discover a non-empty legacy example set and validate it using `state.contract_version === policy.contract_version`; validate a temporary active durable shard using `state.policy_contract_version === policy.contract_version`.
- **Assertion:** Both lanes pass with their own binding. Mutating the legacy lane to read `policy_contract_version` makes at least one existing example fail; mutating the active lane to read `contract_version` makes the valid durable fixture fail. Neither lane may pass vacuously.
- **Cleanup:** Remove temporary active root; repository examples are read-only.

### TC-036: Policy-Authoritative Resume from `blocked`
- **Priority:** P0 | **Source:** AC-004, BR-001, SDD Component 2, Round 6 Blocker 3
- **Action & Assertion:**
  1. Drive `investigating -> blocked`; resume to `investigating` as `human` with non-empty `resume_evidence` and `approver_id`. Repeat `verifying -> blocked -> verifying` as `orchestrator`. Both succeed and append a resume history event.
  2. Resume to the other policy-listed target (for example, `investigating -> blocked -> verifying`) and to every target outside `[investigating, verifying]`; each fails `INVALID_RESUME_TARGET` with bytes unchanged.
  3. Omit/empty each required evidence field and use an unauthorized actor; each fails `HUMAN_APPROVAL_REQUIRED` with bytes unchanged.
  4. Attempt the same pair in ordinary transition mode; it fails `RESUME_OPERATION_REQUIRED`.
  5. Remove or widen the policy `resume` row, ignore the latest into-`blocked` history event, or source resume requirements from the matrix; at least one assertion above fails.
- **Cleanup:** Remove workspace.

### TC-037: Explicit Task Identity Selects Path and Lock
- **Priority:** P0 | **Source:** BR-003, R-010, SDD Component 9, Round 6 Blocker 4
- **Action & Assertion:**
  1. Call transition and resume with `expectedTaskId: issue-a`; verify the active path and `.locks/issue-a.lock` are derived before any envelope read.
  2. Replace the issue-a envelope with one declaring `task_id: issue-b` between operation start and lock acquisition. Inside lock A, the re-read fails `TASK_IDENTITY_MISMATCH` before CAS, mutation, atomic write, or rename; lock A is released and lock B is never acquired.
  3. Repeat for `archiveWorkItem('issue-a')`; no reconcile, archive rename, or projection write occurs.
  4. Mutate implementation to pre-read `task_id` for lock selection, omit any member of the three-way comparison, or perform identity validation after CAS/write/rename; the barriers and I/O call log make the case fail.
- **Cleanup:** Remove workspace.

### TC-038: Malformed Lock Refusal and Maintenance Recovery
- **Priority:** P0 | **Source:** BR-003, SEC-007, SDD Component 4, Security Review condition 12
- **Action & Assertion:** For shard and projection locks, test empty, truncated, invalid-JSON, and schema-invalid payloads. Acquisition and inspection throw `LOCK_MALFORMED`, preserve bytes exactly, and name `unlock --malformed --quiesced`. Valid nonce mode against malformed bytes fails `LOCK_MALFORMED`. Malformed recovery refuses without either flag, needs no nonce, and removes bytes only with both flags. Through `createStateIo`, change malformed bytes to a valid record immediately before unlink; recovery fails `LOCK_BECAME_VALID` and preserves the valid record. A reverse valid-to-malformed change fails closed rather than unlinking untrusted bytes.
- **Cleanup:** Remove workspace.

### TC-039: Writer Retry Reacquires, Rereads and Recomputes
- **Priority:** P0 | **Source:** AC-006, BR-003, ADR-0032
- **Action:** After TC-014b makes writer A stale, invoke the retry path while recording admission acquisition, generation/state reads, candidate identity and rename.
- **Assertion:** Retry releases stale ownership, reacquires admission, reads current generation and digest, computes a new candidate from current state, then commits under the guard. The new candidate has a different provenance/digest from A's stale candidate. Retagging or reusing A's candidate fails the candidate-provenance assertion and final history comparison.
- **Cleanup:** Remove workspace.

### TC-040: Admission Recovery Ordering and Crash Boundaries
- **Priority:** P0 | **Source:** BR-003, QG-002, ADR-0032 Component 4A
- **Action:** Pause recovery before/after commit-guard create, generation temp write, generation rename, generation-directory sync, admission unlink, admission-directory sync and guard release.
- **Assertion:** The guard is held across the linearization sequence; generation `g+1` is durably renamed and synced before admission unlink. Before generation rename, `g` remains authoritative and admission survives. After rename, `g+1` remains authoritative; retry may create a gap but never reuse `g+1`. After admission unlink, all old writers are fenced. Reordering unlink before the durable bump, omitting either sync, or validating outside the guard fails the event-order and restart-state assertions.
- **Cleanup:** Remove workspace.

### TC-041: Commit Guard Fails Closed and Has No Online Reclaim
- **Priority:** P0 | **Source:** R-006, ADR-0032, Security Review F2
- **Action:** Present valid-but-abandoned, empty, truncated, invalid-JSON and schema-invalid task/projection commit guards to every writer, reconciler and `unlock` command; enumerate online CLI actions and removal call sites.
- **Assertion:** All online paths refuse `COMMIT_GUARD_ABANDONED`, preserve guard/generation/state bytes, and expose no force/remove flag. Only owner-nonce release exists online. The offline runbook is explicitly outside the online guarantee: all writers stopped, host/session restarted, current generation preserved, only guard removed, full shard/projection validation before restart.
- **Cleanup:** Remove workspace.

### TC-042: Projection Conditional Commit Without Shard CAS
- **Priority:** P0 | **Source:** BR-005, ADR-0030, ADR-0032
- **Action:** Run ordinary A/B projection compilers and the TC-014b recovery ordering with distinct shard snapshots.
- **Assertion:** Ordinary writers serialize and the later compiler recompiles after admission/guard acquisition. A pre-recovery compiler fails `FENCING_TOKEN_STALE` inside the projection guard before rename. A retry rereads current generation and recompiles; reusing or retagging the stale projection candidate fails. Moving the generation check outside the guard permits stale publish and is killed.
- **Cleanup:** Remove workspace.

### TC-043: Fenced Forward Archive and Old-Archiver Counterexample
- **Priority:** P0 | **Source:** AC-008, BR-005, ADR-0032 archive amendment
- **Action:** A snapshots generation `g`, terminal identity/digest and pauses before task-guard acquisition. Recovery advances to `g+1` and removes admission. Resume A, then run B at `g+1`; repeat with A already holding the task guard.
- **Assertion:** Stale A fails `ARCHIVE_EXECUTOR_STALE` before active→archive rename and journal advancement. B appends/recomputes at `g+1`. If A already owns the guard, its `prepared` creation, forward rename, parent sync and `archive_moved` update linearize before recovery waits and bumps. No forward rename occurs without exact generation, txid/attempt/revision/phase/outcome, identity/digest and active-only predicates inside the guard.
- **Cleanup:** Remove workspace.

### TC-044: Fenced Compensation and Stale-Compensator Counterexample
- **Priority:** P0 | **Source:** AC-008, R-005, ADR-0032 archive amendment
- **Action:** Pause compensator A after `compensation_requested` at generation `g` but before task guard. Recovery advances generation and a current executor adopts. Resume A; also test A already holding the guard.
- **Assertion:** Stale A performs zero archive→active rename and fails on generation/attempt/revision tuple. Current executor appends a fresh attempt, rereads and recomputes before compensation. If A already holds the guard, its reverse rename, both parent syncs and `compensation_moved` update linearize before recovery. Removing the phase prerequisite or any conditional tuple member fails this case.
- **Cleanup:** Remove workspace.

### TC-045: Strict Append-Only Archive Ledger Contract
- **Priority:** P0 | **Source:** AC-008, BR-005, SDD Component 8
- **Action:** Validate initial creation and every phase/adoption/transaction append against the strict schema and whole-ledger JCS digest.
- **Assertion:** Initial creation alone uses `wx`, full-write loop, file and parent sync; `EEXIST` never overwrites. `txid` and every `attempt_id` are injected cryptographic UUID-v4 values unique across retained history. Intent `{txid, task_id, intended_outcome, source_digest, source_generation, created_at}` is immutable; transactions/attempts append only; `journal_revision` increases exactly one. Every update conditionally matches `{current_txid, txid, journal_revision, current_attempt_id, attempt.generation, phase, terminal_outcome}`, current generation and physical path/digest. Parse/schema errors yield `ARCHIVE_JOURNAL_MALFORMED`; digest/immutability/duplicate/revision regression yields `ARCHIVE_JOURNAL_TAMPERED`; stale tuple yields `ARCHIVE_JOURNAL_CONFLICT`, with zero mutations.
- **Cleanup:** Remove workspace.

### TC-046: Exhaustive Archive Recovery Matrix — 24 Cells × 3 Generation Relations
- **Priority:** P0 | **Source:** AC-008, BR-005, SDD Component 8 recovery matrix
- **Generation oracle:** For every row below, `current < attempt` fails `FENCE_GENERATION_REGRESSION` with zero writes. For `current = attempt`, execute the `Equal` action. For `current > attempt`, auto-action is allowed only where `Greater` says adopt/no-op; adoption appends a fresh attempt before taking the equal action. An explicit adoption request in any other cell fails `ARCHIVE_ADOPTION_UNSAFE`.

| Phase / outcome | Path | Equal | Greater |
|---|---|---|---|
| `prepared` | A | fenced forward rename | adopt + reread/recompute + forward |
| `prepared` | R | record `archive_moved` | adopt + record `archive_moved` |
| `prepared` | B | `ARCHIVE_LOCATION_AMBIGUOUS` | same; no adopt |
| `prepared` | N | `ARCHIVE_LOCATION_AMBIGUOUS` | same; no adopt |
| `archive_moved` | R | fresh projection; finalize archived or request compensation | adopt + fresh projection + same decision |
| `archive_moved` | A | `ARCHIVE_LOCATION_AMBIGUOUS` | same; no adopt |
| `archive_moved` | B | `ARCHIVE_LOCATION_AMBIGUOUS` | same; no adopt |
| `archive_moved` | N | `ARCHIVE_LOCATION_AMBIGUOUS` | same; no adopt |
| `compensation_requested` | R | fenced reverse rename | adopt + reread/recompute + reverse |
| `compensation_requested` | A | record `compensation_moved` | adopt + record `compensation_moved` |
| `compensation_requested` | B | `ARCHIVE_LOCATION_AMBIGUOUS` | same; no adopt |
| `compensation_requested` | N | `ARCHIVE_LOCATION_AMBIGUOUS` | same; no adopt |
| `compensation_moved` | A | fresh projection; finalize compensated | adopt + fresh projection + finalize |
| `compensation_moved` | R | `ARCHIVE_LOCATION_AMBIGUOUS` | same; no adopt |
| `compensation_moved` | B | `ARCHIVE_LOCATION_AMBIGUOUS` | same; no adopt |
| `compensation_moved` | N | `ARCHIVE_LOCATION_AMBIGUOUS` | same; no adopt |
| `terminal_archived` / archived | R | validate projection; no-op | terminal no-op; no adoption |
| `terminal_archived` / archived | A | `ARCHIVE_LOCATION_AMBIGUOUS` | same; no adopt |
| `terminal_archived` / archived | B | `ARCHIVE_LOCATION_AMBIGUOUS` | same; no adopt |
| `terminal_archived` / archived | N | `ARCHIVE_LOCATION_AMBIGUOUS` | same; no adopt |
| `terminal_compensated` / compensated | A | validate projection; no-op | terminal no-op; no adoption |
| `terminal_compensated` / compensated | R | `ARCHIVE_LOCATION_AMBIGUOUS` | same; no adopt |
| `terminal_compensated` / compensated | B | `ARCHIVE_LOCATION_AMBIGUOUS` | same; no adopt |
| `terminal_compensated` / compensated | N | `ARCHIVE_LOCATION_AMBIGUOUS` | same; no adopt |

- **Non-vacuity:** Generate and assert exactly the Cartesian product of the six phases, four path states and three generation relations; every generated variant must reach its named action/error oracle. Malformed/tampered ledger, wrong exact digest, terminal phase/outcome mismatch and unlisted adoption are additional fail-closed variants with zero mutation.
- **Cleanup:** Remove workspace.

### TC-047: Archive Crash Boundaries, Adoption and Guard Ordering
- **Priority:** P0 | **Source:** QG-002, ADR-0032, Security Review Round 9 matrix
- **Action:** Inject crashes before/after forward and compensation rename, each parent sync, ledger append/phase persist, projection publish, compensation request and terminal finalize; restart through TC-046. Advance generation before each resumable phase and test adoption.
- **Assertion:** Restart maps only to the exact A/R single-path cell or fails B/N closed. Post-rename/pre-ledger states record the directional phase proved by location/digest. Projection failure before `compensation_requested` retries forward projection and never infers reverse intent. Adoption is serialized by task guard, appends an attempt linked through `adopts_attempt_id`, preserves intent/phase/outcome and rereads/recomputes all candidates. Task and projection commit guards never overlap or wait nested. Projection is freshly compiled and verified before either terminal finalize.
- **Cleanup:** Remove workspace.

### TC-048: Fence Generation Lifecycle and Non-Reuse
- **Priority:** P0 | **Source:** BR-003, R-006, ADR-0032
- **Action:** Restart, archive, compensate, roll back, attempt task-ID recreation, approach `Number.MAX_SAFE_INTEGER`, and inject missing/corrupt generation files after activation.
- **Assertion:** Generation survives restart/archive/compensation/offline guard repair; every recovery increases monotonically and gaps are allowed. Selective rollback/decrement/deletion/task-ID reuse is refused. Missing/corrupt records fail `FENCE_STATE_MISSING`/`FENCE_STATE_MALFORMED`; increment at the safe-integer ceiling fails `FENCE_GENERATION_EXHAUSTED`; current generation below a retained attempt fails `FENCE_GENERATION_REGRESSION`. No path initializes or reuses generation 1 after activation.
- **Cleanup:** Remove workspace.

### TC-049: Hostile Local Paths, Symlinks and Untrusted Bytes
- **Priority:** P0 | **Source:** Security Review residual trust boundary, BR-003, BR-005
- **Action:** Supply `expectedTaskId` traversal/absolute/separator encodings; replace shard, fence, guard or journal path components with symlinks; create oversized, unknown-key, malformed and digest-tampered local files.
- **Assertion:** Invalid identifiers fail before path derivation or I/O under the task-ID schema (`^[a-z0-9_-]+$`). Malformed or digest-tampered control files fail closed with the applicable identity/fence/journal error and perform zero rename/unlink/journal update. Record whether a replaced parent symlink redirects I/O; the Security Review explicitly places hostile parent-component replacement outside the trusted local-workspace boundary, so this observation is not an in-scope PASS criterion. A direct writer that recomputes the ledger digest is likewise outside authenticity guarantees (SEC-002); no size limit is claimed unless implementation/design names one.
- **Cleanup:** Remove workspace without following symlinks.

---

## 11. Exploratory Charter

| Charter | Scope | Timebox | Rationale |
|---|---|---|---|
| EC-01 | Hand-drive `inspect` → `transition` → fenced `unlock` on a scratch shard, deliberately mistyping digests/nonces/actors and resuming a pre-recovery writer | 45 min | Confirm diagnostics explain generation revocation, `FENCING_TOKEN_STALE`, recompute-required retry, and offline-only guard repair. Scripted cases assert safety; exploration judges operator usability. |
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
| CAS made lock-conditional | Skip the CAS compare when the caller holds the lock it acquired | TC-011, TC-012; TC-014b still demonstrates that one-shot CAS cannot replace lost mutual exclusion |
| Wrong-unlock fencing omitted | Permit both old/new shard writers past one-shot CAS after admission removal | TC-014b shard barrier requires old writer's `FENCING_TOKEN_STALE` before rename; TC-039 rejects stale-candidate reuse |
| Projection fencing omitted | Permit pre-recovery compilation to publish after admission removal | TC-014b projection barrier and TC-042 reject stale publish without a shard CAS backstop |
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
| Legacy version binding | Replace `state.contract_version` with `state.policy_contract_version` globally | TC-035 legacy-lane mutant |
| Durable version binding | Replace `state.policy_contract_version` with `state.contract_version` | TC-035 active-lane mutant |
| Lane separation | Move the envelope schema into the example-fixture lane | TC-032 (step 4) |
| Canonical root exclusions | Filter dot-prefixed or exact `archive/` entries after validation, or skip another invalid entry | TC-033 |
| Reserved active ID | Permit `expectedTaskId === 'archive'` | TC-033 assertion 4 |
| Resume policy row | Remove/widen the separate `resume` operation | TC-036 |
| Resume history binding | Ignore the latest into-`blocked` event's `from` | TC-036 assertion 2 |
| Resume Human evidence | Omit `resume_evidence`, `approver_id`, or actor enforcement | TC-036 assertion 3 |
| Resume mode separation | Let ordinary transition consume the resume policy | TC-036 assertion 4 |
| Identity lock selection | Pre-read envelope `task_id` to choose a lock | TC-037 assertions 1–2 |
| Identity three-way check | Omit expected ID, directory basename, or re-read envelope comparison | TC-037 assertions 2–3 |
| Nonce-safe release | Change `parsed.nonce === nonce` to `true` | TC-013 |
| Lock namespace | Move the shard lock back to `work-items/{task_id}/.lock` | TC-019b (assertions 2–3) |
| Lock API keying | Derive the lock path from `shardDir` instead of `task_id` | TC-013, TC-019b |
| Abandoned-lock refusal | Replace the `LOCK_ABANDONED` throw with `unlinkSync(lockPath)` | TC-014 |
| Abandonment predicate | Restore `age > 30 s` **or** dead PID | TC-014c (assertion 1) |
| Abandonment predicate | Gate `LOCK_ABANDONED` on age as well as `ESRCH` | TC-014c (assertion 2) |
| `unlock` quiescence gate | Accept `unlock` without `--quiesced` | TC-014c (assertion 4) |
| `unlock` nonce check | Skip the nonce comparison in `unlock` | TC-014 (assertion 5) |
| Third removal site | Add any lock-removal call site beyond owner release and `unlock` | TC-014 (assertion 3) |
| Malformed-lock parsing | Treat empty/partial/invalid records as abandoned or auto-clear them | TC-038 refusal/byte-equality variants |
| Malformed recovery flags | Permit recovery without both `--malformed` and `--quiesced` | TC-038 |
| Malformed re-read | Unlink after malformed→valid replacement | TC-038 `LOCK_BECAME_VALID` variant |
| Writer temp cleanup | Remove `unlinkSync(tmpPath)` from the catch | TC-017, TC-017b |
| Zero-progress guard | Remove the `if (n <= 0) throw` from the write loop | TC-017b (assertions 1–2, via the test timeout) |
| Zero-progress guard, over-broad | Change `n <= 0` to `n < buffer.length` | TC-017b (assertion 4) |
| Backfill sequence | Set `sequence_number = history.length` | TC-004 (assertions 1–3) |
| Archival compensation | Remove the fenced compensating rename | TC-019, TC-044, TC-046 `compensation_requested/R` |
| Compensation honesty | Swallow a failed compensating rename or claim `terminal_archived` | TC-019, TC-046 terminal discriminator |
| Archive/mutate overlap | Drop the shard lock before the archive rename | TC-019b (assertion 1) |
| Guard overlap | Hold task commit guard while acquiring projection commit guard | TC-047 guard event trace rejects overlap and wait cycles |
| Projection purity | Make `compileStatusProjection` write its output | TC-028 |
| Read-only check | Let `checkProjectStatusSync` repair | TC-020, TC-028 |
| Projection lock ordering | Compile **before** acquiring the projection lock | TC-026 |
| Projection lock presence | Remove the projection lock entirely | TC-026, TC-027 |
| Projection lock auto-clear | Clear an abandoned `.projection.lock` automatically | TC-027 (c) |
| Lock order | Acquire a shard lock while holding the projection lock | TC-027 (b) |
| Generation check outside guard | Move the generation comparison before commit-guard acquisition or omit it | TC-014b shard/projection pre-guard barriers, TC-042 projection, TC-043 forward archive |
| Retag old candidate | On `FENCING_TOKEN_STALE`, change the candidate generation without rereading state/recomputing | TC-039 and TC-042 provenance and final-content assertions |
| Premature admission unlink | Remove admission before durable generation rename or directory sync | TC-040 event order and crash/restart variants; TC-014b old-writer refusal |
| Recovery check outside guard | Release commit guard between generation validation and admission unlink | TC-040 competing-writer barrier and event trace |
| Online guard reclaim | Add a timeout, force flag, or malformed-guard auto-clear | TC-041 byte equality and online CLI/removal-site audit |
| Unfenced forward rename | Skip generation/identity/digest/ledger tuple check inside task guard | TC-043 stale archiver and TC-046 `prepared/A` |
| Unfenced compensation | Reverse without `compensation_requested`, or drop generation/attempt/revision predicate | TC-044 stale compensator and TC-046 `compensation_requested/R` |
| Ledger overwrite | Replace append-only transactions/attempts with current-entry overwrite | TC-045 retained-history and revision assertions; TC-047 adoption history |
| Ledger weak creation | Replace `wx` with overwrite, or omit full-write/file/parent sync | TC-045 `EEXIST` and crash-created malformed artifact variants |
| Ledger weak identity/integrity | Accept unknown keys, duplicate/non-v4 IDs, changed intent, partial record, or stale JCS digest | TC-045 strict schema, digest, UUID and immutable-history variants |
| Conditional tuple omission | Drop any of `current_txid`, `txid`, revision, current attempt, attempt generation, phase or terminal outcome | TC-045 single-field stale-tuple variants; TC-044 stale compensator |
| Direction collapse | Use one generic terminal or infer reverse intent from path alone | TC-046 terminal outcomes and `archive_moved/A` refusal; TC-047 pre-request crash |
| Unsafe adoption | Adopt B/N, wrong digest, terminal mismatch, or lower generation; or reuse old candidate without reread | TC-046 every affected matrix cell plus TC-047 adoption provenance |
| Crash inference | Repair both/neither paths or guess after a partial journal/rename/projection crash | TC-046 B/N cells and TC-047 restart boundaries |
| Nested commit guards | Hold task guard while acquiring projection guard, or finalize terminal before fresh projection | TC-047 guard trace and publish-before-terminal ordering |
| Generation reset/reuse | Reset/decrement/delete generation across restart/archive/rollback/recreation or allow overflow | TC-048 lifecycle and boundary variants |
| Hostile path/bytes | Skip task-ID validation or follow malformed ledger/fence/shard contents into mutation | TC-049 invalid-ID and malformed/digest-tamper variants; parent-symlink replacement remains out of scope under SEC-002 |

---

## 13. AC Traceability Matrix

| Requirement | Primary Cases | Mutation / Boundary Evidence | Expected Status |
|---|---|---|---|
| AC-001 | TC-001, TC-002, TC-035 | Self-digest inclusion and both version-field swaps fail | Covered by design |
| AC-002 | TC-003, TC-004, TC-029 | v1 rejection, sequence off-by-one, idempotency and byte rollback | Covered by design |
| AC-003 | TC-005, TC-006 | Authorization removal and canonicalization mutants fail | Covered by design |
| AC-004 | TC-007, TC-008, TC-024, TC-036 | Policy evidence, strict intersection, resume target/evidence/mode mutations | Covered by design |
| AC-005 | TC-009, TC-010 | Missing and empty digest in transition and resume | Covered by design |
| AC-006 | TC-011, TC-012, TC-014b, TC-039..TC-042, TC-048 | Ordinary A/B, false-quiescence barriers, guarded generation bump, retry recomputation and non-reuse | Covered by design; runtime pending |
| AC-007 | TC-015, TC-016, TC-033 | Parse/schema/digest failures and exclusion-order mutants | Covered by design |
| AC-008 | TC-017, TC-017b, TC-018, TC-019, TC-019b, TC-026, TC-027, TC-037, TC-042..TC-049 | Fenced archive/projection, strict journal, all phase/path/generation cells, adoption, crash and generation lifecycle | Covered by design; runtime pending |
| AC-009 | TC-021..TC-025, TC-034, TC-036 | Generated terminal/transition sets, reachability and resume mutations | Covered by design |
| AC-010 | TC-020, TC-028 | Whole-tree manifest equality; repair-only mutation fails | Covered by design |
| BR-001 | TC-007, TC-024, TC-034..TC-036 | Lane, intersection and resume authority | Covered by design |
| BR-002 | TC-005..TC-007 | Actor/evidence negative partitions | Covered by design |
| BR-003 | TC-009..TC-014c, TC-037..TC-041, TC-043, TC-048, TC-049 | CAS, identity, guarded generation, malformed admission/guard, stale retry and hostile IDs | Covered by design; runtime pending |
| BR-004 | TC-015..TC-020, TC-028, TC-033 | Fail-closed ingestion, atomic write, read-only and exact exclusions | Covered by design |
| BR-005 | TC-014b projection, TC-019b, TC-026, TC-027, TC-042..TC-049 | Projection fencing; journal tuple, directional phases, matrix/adoption, compensation, guard order | Covered by design; runtime pending |

`Covered by design` means the executable case and mutation oracle are specified. It does not mean implementation evidence exists yet.

---

## 14. Quality Gate & Governance Invariants

1. **QG-001 Review Gate:** every commit touching `.mjs`/`.js` carries a matching `docs/records/qa/*-code-review.md`, authored by the non-implementer.
2. **CI Parity:** 1:1 validation mirroring between `.github/workflows/validate-contracts.yml` and `.gitlab-ci.yml`.
3. **QG-002 Deterministic Invariants:** zero lost updates must hold under ordinary concurrency and false-quiescence admission recovery because commit-guard/generation serialization survives admission removal. Require no old-generation shard/archive/projection rename, crash durability, zero temp leaks, no ghost entries, zero read-only writes and no unbounded write loop. A stranded commit guard deliberately remains and fails closed; TC-014b proves stale refusal rather than demonstrating loss.
4. **QG-003 No Vacuous Concurrency Pass:** every concurrency case proves its required barrier was crossed and its generated/contended set is non-empty. An earlier-guard rejection is a failure.
5. **QG-004 Mutation Evidence:** acceptance uses killed named mutants and a recorded survivor ledger; no numeric test-count or mutation-score floor substitutes for behavioral coverage.
6. **Zero Test Weakening:** no unrelated test file is modified, and no existing assertion is relaxed.

---

## 15. QA Handoff

| To | When | Evidence QA Delivers | Evidence QA Requires Back |
|---|---|---|---|
| Developer Agent | Next, after approved ADR-0032 blueprint | TC-001..TC-049 design, complete phase/path/generation matrix, named mutants and deterministic `createStateIo` barriers | Implementation plus exact commands/results; no test-only production hook; preserve journal and fence history |
| SA Agent | A future TC-034 contract conflict | Computed policy/matrix disagreement and reachability output | Ruling on the authoritative layer; QA does not change behavior |
| Security Reviewer | After implementation checkpoint | Ordinary and false-quiescence barriers, guarded recovery ordering, stale archive/compensation, all ledger/matrix results, lock-order logs and read-only evidence | Confirm code preserves ADR-0032 proof and close SEC-004 only after runtime/mutation evidence |
| Documentation Agent | After implementation and QA evidence | Final AC traceability and implementation findings | Update project state and closeout through the workflow; ADR-0032 is already recorded |
| Human Maintainer | Before merge | Blueprint PASS with Developer/QA/Security runtime evidence and residual availability/SEC-002 notes | Explicit implementation approval and merge decision; no further residual-choice request |

**Rework ceiling:** two verifying → rework cycles. A third requires an explicitly recorded Human Maintainer decision.

---

## 16. Open Questions and Decisions

### Resolved

| ID | Question | Resolution | Effect on this plan |
|---|---|---|---|
| OQ-1 | The policy's `investigating -> implementing` row lacked a matrix counterpart. | SA widened `TRANSITION_MATRIX.investigating.destinations`; TC-034 guards recurrence. | TC-007 and TC-024 now test the complete computed intersection. |
| OQ-2 | How can wrong-unlock and I/O races be forced deterministically without a test-only production hook? | SDD defines injected `createStateIo({ fsOps, processOps, clock, random })`; production receives real adapters and tests receive delegating adapters. | TC-014b, TC-017/17b, TC-019 and TC-038 use the shared seam. No fallback probe remains. |
| OQ-3 | What closes SEC-004 after the Human rejected the silent-loss residual? | ADR-0032 and Security Review approve the fenced design; code-level closure still requires Developer implementation and independent mutation-backed QA. | TC-014b and TC-039..TC-048 kill old-generation commit, wrong recovery ordering, unsafe adoption and journal mutants. |
| OQ-4 | Does unconditional CAS carry integrity after a wrong unlock? | No. Two admitted writers can pass one-shot CAS before either writes. A non-reclaimable commit guard plus durable generation now serializes commit and recovery. | TC-014b forces the old counterexample ordering and expects `FENCING_TOKEN_STALE` before rename; TC-040 proves bump-before-unlink. |

### Open implementation evidence

| ID | Evidence still required | Owner | Blocks |
|---|---|---|---|
| SEC-004 runtime | Implement ADR-0032 and execute deterministic barrier/mutation cases for task, projection, archive, compensation and recovery. | Developer → independent QA → Security | SEC-004 implementation closure and merge |
| SEC-002 / availability | Preserve explicit local direct-write authenticity boundary and offline-only abandoned commit-guard recovery. | Developer / Security | Honest release and operator documentation |

---

## 17. Self-Review Checklist

- [x] Every AC and BR maps to named executable cases and concrete expected results.
- [x] Negative, boundary, state-transition, decision-table, failover and security cases are identified; non-applicable HTTP API testing is stated explicitly.
- [x] Coverage is demonstrated through named mutants; no numeric test-count or mutation-score floor is used as acceptance evidence.
- [x] Both authoritative contradictions are re-derived as resolved: one mutation signature/identity flow in the SDD, and no unconditional-CAS safety claim in requirements OQ-4.
- [x] OQ-2 is closed with the injected `createStateIo` adapter, without a test-only production hook.
- [x] The Human rejected SEC-004's silent-loss residual; Security approved ADR-0032 at design level. This QA verdict does not claim implementation or mutation evidence.
- [x] Fenced task/projection/archive/compensation paths, strict append-only ledger, every phase/path/generation cell, adoption and crash recovery each have named killing mutants.
- [x] Test-quality review of implementation tests is deferred until Developer Agent produces them; this blueprint does not claim FIRST/anti-pattern compliance for code that does not exist.
