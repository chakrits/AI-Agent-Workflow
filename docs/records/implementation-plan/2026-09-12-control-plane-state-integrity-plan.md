# Implementation Plan: Control-Plane State Integrity & Architecture Remediation

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | Issue #277 — Control-Plane State Integrity & Architecture Remediation (Package 1) |
| Change Type | Framework / Meta Architecture Remediation (`framework-meta`) |
| Risk Level | High |
| Owner | Developer Agent (`implementation-planning`) |
| Target Branch / Ticket | `feat/control-plane-state-integrity` / Issue #277 |
| Revision | Round 4 rework — addresses maintainer review #5644452415 |

---

## 2. Inputs Reviewed

| Artifact | Status | Notes |
|---|---|---|
| REQUIREMENT_DISCOVERY.md | Draft (`docs/records/requirements/2026-09-12-control-plane-state-integrity-discovery.md`) | BA discovery, Round 4 revision. AC-001..AC-010, BR-001..BR-005. |
| SDD.md | **Draft — pending Human gate** (`docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md`) | Round 4 revision. Not approved; no task below may start before the Human approval gate. |
| SECURITY_REVIEW.md | Conditional Approval, Round 4 revision (`docs/records/security-review/2026-09-12-issue-277-security-review.md`) | Zero-lost-update claim is now conditional on evidence, not asserted. |
| TEST_PLAN.md | Draft (`docs/records/qa/2026-09-12-issue-277-test-plan.md`) | Full Mode QA artifacts and TC-001..TC-031. |

---

## 3. Affected Areas

| Area | Files / Components | Expected Change |
|---|---|---|
| **Envelope Layer** | `docs/contracts/schemas/durable-task-envelope.schema.json` | Keep `contract_version: 2` const; add required integer `policy_contract_version`; title corrected to v2. |
| **Policy Layer** | `docs/contracts/bug-fix-workflow.yaml` | Additive only: add `completed` and `cancelled` states, add `handoff -> completed` (requires `closeout_evidence`) and `<any> -> cancelled` (requires `cancellation_reason`). `contract_version` stays `1`; all eleven fixtures in `docs/contracts/examples/` stay valid. |
| **Canonical Prose** | `AGENTS.md` (Bug Fix section, L274-276) | Add the layer split: policy owns states/transitions/evidence/retry budget; the durable envelope owns storage shape. |
| **Contract Validator** | `scripts/validate-contracts.mjs` (L243-247) | Cross-check `state.policy_contract_version` against `policy.contract_version` instead of `state.contract_version`; add an active-shard lane validating `docs/records/work-items/*/task-state.json` through `validateEnvelopeSchema`. |
| **State Machine Engine** | `scripts/lib/task-state-machine.mjs`<br>`scripts/task-machine-cli.mjs` | `digestTaskEnvelope()`, `validateEnvelopeSchema()`; terminal matrix entries + `UNKNOWN_SOURCE_STATE` fail-closed guard; actor authorization; policy-sourced evidence; fail-closed `.lock`; `mutateTaskStateOnDisk()`; CLI `inspect` and `unlock`; mandatory `--expected-digest`. |
| **Projection & Archival** | `scripts/compile-status-projection.mjs`<br>`scripts/archive-work-item.mjs` | Pure `compileStatusProjection` / `detectArchivedShardDrift`; mutating `reconcileArchivedShards`; projection lock inside `updateProjectStatusFile`; `--check` read-only; `--reconcile` flag; `atomicWriteFileSync`; archival compensation. |
| **Migration & Operations** | `scripts/backfill-task-state-v2.mjs`<br>`docs/records/work-items/issue-249/task-state.json`<br>`docs/records/work-items/issue-275/task-state.json`<br>`PROJECT_STATUS.md` | Backfill tool with `--rollback`; evidence-bound migration of the two active shards. |
| **QA Records** | `docs/records/qa/2026-09-12-control-plane-state-integrity-code-review.md` | Code review record satisfying `validate:review-gate` (QG-001), authored by the non-implementer. |
| **Tests** | `test/task-state-machine.test.mjs`<br>`test/compile-status-projection.test.mjs`<br>`test/archive-work-item.test.mjs`<br>`test/contracts.test.mjs` | Unit, barrier-synchronized multi-process concurrency, fault injection, lock-order, and read-only-check byte-equality tests. |

---

## 4. Task Breakdown (Reviewable Slices with Checkpoints)

> **Gate:** no task starts until the Human Maintainer approves the Round 4 blueprint and ADR-0026..ADR-0030
> are recorded in `DECISIONS.md`.

### Phase 4A: Contract Layering & Core Engine

#### Task 1: Envelope Schema, Policy Amendment & Validator Re-binding (ADR-0026)
- **Owner**: `developer-agent`
- **Prerequisite**: Human approval gate.
- **Files**: `docs/contracts/schemas/durable-task-envelope.schema.json`, `docs/contracts/bug-fix-workflow.yaml`, `AGENTS.md`, `scripts/validate-contracts.mjs`, `test/contracts.test.mjs`.
- **Schema lane note (verified 2026-09-12):** `loadSchemas()` in `scripts/validate-contracts.mjs:31-47` selects only files ending `-state.schema.json` and maps `task-state.schema.json -> bug-fix`. `durable-task-envelope.schema.json` is therefore **not** in the example-fixture lane, so adding a required property to it cannot break the eleven fixtures. The envelope schema serves the new active-shard lane (Task 8) and the `validateEnvelopeSchema` seam only. Task 1 must state this mapping in a comment beside the validator change so the two lanes are not later merged by accident.
- **TDD Failing Step**: Add failing tests asserting (a) a shard with `contract_version: 2` and `policy_contract_version: 1` validates against a `contract_version: 1` policy; (b) a shard whose `policy_contract_version` does not match its policy is rejected; (c) all eleven existing `docs/contracts/examples/*.yaml` still validate after **both** the policy amendment and the envelope schema's new required property, asserting explicitly that the example lane still resolves `bug-fix` to `task-state.schema.json`; (d) an envelope missing `policy_contract_version` is rejected by `validateEnvelopeSchema`; (e) `bug-fix` policy now permits `handoff -> completed` with `closeout_evidence` and rejects it without.
- **Implementation**:
  - Add required `policy_contract_version` (integer, minimum 1) to the envelope schema; fix the schema `title` to say v2.
  - Amend `bug-fix-workflow.yaml` additively as described in §3.
  - Replace the `state.contract_version !== policy.contract_version` comparison at `scripts/validate-contracts.mjs:243` with `state.policy_contract_version !== policy.contract_version`.
  - Add the AGENTS.md layer-split sentence.
- **Verification**: `node --test test/contracts.test.mjs`; `npm run validate:contracts`.
- **Rollback**: Revert the four files; the amendment is additive so no fixture rewrite is needed.

#### Task 2: Self-Excluding Hasher & Envelope Validation Seam (ADR-0028)
- **Owner**: `developer-agent`
- **Prerequisite**: Task 1.
- **Files**: `scripts/lib/task-state-machine.mjs`, `test/task-state-machine.test.mjs`.
- **TDD Failing Step**: Failing tests asserting `digestTaskEnvelope()` yields the same digest whether `state_digest` is present, absent, or empty; does not mutate its argument; and `validateEnvelopeSchema()` throws `DIGEST_INTEGRITY_MISMATCH` carrying `stored_digest` and `recomputed_digest` when a field is changed without rehashing.
- **Implementation**: Implement `digestTaskEnvelope(envelope)` and `validateEnvelopeSchema(data)` per SDD Component 3.
- **Verification**: `node --test test/task-state-machine.test.mjs`.
- **Rollback**: Revert `task-state-machine.mjs`.

#### Task 3: Matrix Completion, Fail-Closed Source Guard & Actor Policy (AC-003, AC-004, AC-009)
- **Owner**: `developer-agent`
- **Prerequisite**: Task 2.
- **Files**: `scripts/lib/task-state-machine.mjs`, `test/task-state-machine.test.mjs`.
- **TDD Failing Step**: Failing tests asserting: `completed` and `cancelled` reject every one of the other ten destinations with `ILLEGAL_TRANSITION_REJECTED`; an envelope whose `state` has no matrix entry throws `UNKNOWN_SOURCE_STATE`; `transitionTaskState()` throws `UNAUTHORIZED_ACTOR` when the actor is absent from `TRANSITION_MATRIX[from].actors`; `'Developer Agent'` normalizes to `'developer-agent'`; an unregistered role throws `UNAUTHORIZED_ACTOR`; a transition to `cancelled` without `cancellation_reason` and to `blocked` without `stop_reason` are both rejected; and a matrix-vs-policy parity test proving every matrix destination pair is either permitted by some policy or explicitly documented as envelope-only.
- **Implementation**:
  - Add `completed` / `cancelled` entries with empty `destinations`, `requires`, `actors`.
  - Write `blocked.destinations` out explicitly instead of referencing `STATES`.
  - Invert `if (matrixEntry)` to the fail-closed `UNKNOWN_SOURCE_STATE` throw.
  - Canonicalize the actor to lowercase kebab-case against `ROLE_REGISTRY` and assert membership.
  - Narrow the `to !== 'blocked' && to !== 'cancelled'` evidence bypass to require `stop_reason` and `cancellation_reason` respectively.
  - Resolve required evidence from the workflow policy for the shard's `workflow_id`, using the matrix `requires` only where the policy is silent; unknown `workflow_id` fails closed.
- **Verification**: `node --test test/task-state-machine.test.mjs`; `npm run validate:contracts`.
- **Rollback**: Revert `task-state-machine.mjs`.

#### Task 4: Fail-Closed Shard Lock, CLI Recovery Surface & Disk-Bound Mutation Wrapper (ADR-0027)
- **Owner**: `developer-agent`
- **Prerequisite**: Task 3.
- **Files**: `scripts/lib/task-state-machine.mjs`, `scripts/task-machine-cli.mjs`, `test/task-state-machine.test.mjs`.
- **TDD Failing Step**: Failing tests asserting:
  1. `acquireShardLock` on a live lock younger than 30 s retries and then throws `LOCK_ACQUISITION_TIMEOUT`.
  2. `acquireShardLock` on a lock older than 30 s or with a dead PID throws `LOCK_ABANDONED` **and leaves the lock file byte-identical on disk**, with the message containing the literal `unlock --task`.
  3. `releaseShardLock(dir, 'nonce-B')` against a lock holding `nonce-A` does not unlink it.
  4. `unlock --task T --nonce N` removes the lock when the nonce matches and throws `LOCK_NONCE_MISMATCH` when it does not.
  5. `mutateTaskStateOnDisk` rejects missing or empty `expected_digest` with `MISSING_EXPECTED_DIGEST`, and a stale digest with `CAS_CONFLICT` carrying both digests, in both `transition` and `resume` mode.
  6. The lock file is absent after both the success and every failure path (zero lock leaks).
- **Implementation**:
  - `acquireShardLock` / `releaseShardLock` per SDD Component 4 — no reclamation path exists in the code at all.
  - `mutateTaskStateOnDisk(shardPath, {to, actor, expected_digest, evidence, mode})` per SDD Component 9, releasing in `finally`.
  - `scripts/task-machine-cli.mjs`: `transition` and `resume` call only the wrapper and require `--expected-digest`; add `inspect` (prints holder and current digest, mutates nothing) and `unlock` (`--task`, `--nonce`).
- **Verification**: `node --test test/task-state-machine.test.mjs`.
- **Rollback**: Revert lock, wrapper and CLI changes.

> **🛑 Checkpoint 1:** Contract layering, engine guards and the fail-closed lock pass unit tests. Verify zero lock leaks and zero temp leaks across success and failure paths.

---

### Phase 4B: Durable I/O, Projection Purity & Projection Transaction

#### Task 5: Crash-Durable Atomic Writer with Failure Cleanup
- **Owner**: `developer-agent`
- **Prerequisite**: Checkpoint 1.
- **Files**: `scripts/lib/task-state-machine.mjs`, `test/task-state-machine.test.mjs`.
- **TDD Failing Step**: Failing tests asserting the write loop completes short writes, the `.tmp-*` file is unlinked when `fs.writeSync` throws mid-write, the target file is untouched on failure, and both `fsyncSync` calls plus the rename occur in order.
- **Implementation**: `atomicWriteFileSync` per SDD Component 5.
- **Verification**: `node --test test/task-state-machine.test.mjs`.
- **Rollback**: Revert the writer.

#### Task 6: Pure Projection, Drift Detection & Explicit Repair (ADR-0029)
- **Owner**: `developer-agent`
- **Prerequisite**: Task 5.
- **Files**: `scripts/compile-status-projection.mjs`, `scripts/archive-work-item.mjs`, `test/compile-status-projection.test.mjs`, `test/archive-work-item.test.mjs`.
- **TDD Failing Step**: Failing tests asserting:
  1. `compileStatusProjection()` throws `MALFORMED_SHARD` on unparseable JSON, schema violation, or digest mismatch.
  2. `compileStatusProjection()` and `detectArchivedShardDrift()` write zero bytes — hash and `stat` every file under the fixture root before and after.
  3. `checkProjectStatusSync()` on a drifted fixture returns `inSync: false` with a `recovery` string naming `--reconcile`, the CLI exits 1, and **no file under the fixture root changes**.
  4. `reconcileArchivedShards()` repairs the same fixture and is idempotent on a second run.
  5. The call graph is acyclic: `updateProjectStatusFile()` never re-enters reconciliation (asserted by a call spy, so a future edit that reintroduces recursion fails loudly rather than stack-overflowing).
- **Implementation**: Split the four functions per SDD Component 6; add the `--reconcile` flag; keep `--check` on the pure path only.
- **Verification**: `node --test test/compile-status-projection.test.mjs test/archive-work-item.test.mjs`; `npm run validate:status-projection`.
- **Rollback**: Revert both scripts.

#### Task 7: Projection Lock, Lock Order & Archival Compensation (ADR-0030)
- **Owner**: `developer-agent`
- **Prerequisite**: Task 6.
- **Files**: `scripts/compile-status-projection.mjs`, `scripts/archive-work-item.mjs`, `test/compile-status-projection.test.mjs`, `test/archive-work-item.test.mjs`.
- **TDD Failing Step**: Failing tests asserting:
  1. `updateProjectStatusFile()` acquires `.projection.lock` **before** compiling — proven by a barrier that archives a shard between lock-attempt and compile and asserts the final projection reflects the archive.
  2. A second concurrent `updateProjectStatusFile()` waits and then produces a projection matching filesystem reality; neither run's output is lost.
  3. An abandoned projection lock throws `LOCK_ABANDONED` naming `unlock --projection`, and the lock file is left untouched.
  4. Lock order: no code path acquires a shard lock while the projection lock is held (asserted by instrumenting both acquire functions and failing on inversion).
  5. `archiveWorkItem()` calls `updateProjectStatusFile()`; when it throws, the compensating rename restores `work-items/{id}` and `ARCHIVE_RECONCILIATION_FAILED` is raised; when the compensating rename also fails, the error carries `compensation_failed: true`.
  6. The projection lock is released on every success and failure path.
- **Implementation**: Projection lock and ordering per SDD Component 7; archival compensation per SDD Component 8.
- **Verification**: `node --test test/compile-status-projection.test.mjs test/archive-work-item.test.mjs`.
- **Rollback**: Revert both scripts.

> **🛑 Checkpoint 2:** Projection purity, projection transaction and archival compensation validated with barriers and fault injection.

---

### Phase 4C: Migration & Governance Closeout

#### Task 8: Backfill Tool & Active-Shard Validation Lane
- **Owner**: `developer-agent`
- **Prerequisite**: Checkpoint 2.
- **Files**: `scripts/backfill-task-state-v2.mjs`, `scripts/validate-contracts.mjs`, `test/contracts.test.mjs`.
- **TDD Failing Step**: Failing tests asserting `backfillTaskStateV2()` upgrades a v1 shard to `contract_version: 2` with `policy_contract_version: 1`, `sequence_number` derived from history length, and a `state_digest` equal to `digestTaskEnvelope(data)`; that a second run is a byte-identical no-op; that `--rollback` restores the pre-migration file exactly; and that `validate-contracts.mjs` now validates `docs/records/work-items/*/task-state.json` through `validateEnvelopeSchema`.
- **Implementation**: Author the backfill tool; add the active-shard lane to the validator.
- **Verification**: `node --test test/contracts.test.mjs`; `npm run validate:contracts`.
- **Rollback**: Revert the validator; delete the backfill script.

#### Task 9 (Operational Step): Evidence-Bound Migration of issue-249 and issue-275
- **Owner**: `developer-agent` (separately approved operational execution)
- **Prerequisite**: Task 8.
- **Files**: `docs/records/work-items/issue-249/task-state.json`, `docs/records/work-items/issue-275/task-state.json`, `PROJECT_STATUS.md`.
- **Constraint**: the actor matrix forbids one role from running both terminal hops — `verifying -> handoff` is `qa-agent`, `handoff -> completed` is `orchestrator` or `release-agent`. Each hop is executed and recorded separately; no synthesized or generic history is permitted.
- **Execution**:
  1. Back both shards up to the session scratch directory; record the pre-migration SHA-256 of each file.
  2. Run `node scripts/backfill-task-state-v2.mjs docs/records/work-items/issue-249` and the same for `issue-275`.
  3. Execute the terminal hops with the real closeout evidence below, one `mutateTaskStateOnDisk` call each, supplying the `--expected-digest` printed by `inspect` immediately beforehand.
  4. `node scripts/archive-work-item.mjs issue-249` and `issue-275`.
- **Real closeout evidence (verified against the GitHub API on 2026-09-12):**

| Shard | Hop | Actor | Evidence | Merge commit |
|---|---|---|---|---|
| issue-249 | `verifying -> handoff` | `qa-agent` | `original_repro_result`: `docs/records/qa/2026-09-09-issue-249-token-body-code-review.md`; `verification_result`: `npm test` 706/706 green at merge | — |
| issue-249 | `handoff -> completed` | `orchestrator` | `closeout_evidence`: PR #251 "fix: extract the PR body from argument tokens, not raw command text (Issue #249)", merged 2026-09-09T05:52:15Z by `chakrits`; issue closed 2026-09-09T05:52:16Z | `0c4f79055a5f8b90153fee9ede1cefc9335950a4` |
| issue-275 | `verifying -> handoff` | `qa-agent` | `original_repro_result`: GitHub Actions run 34623255592 (`Cannot find package 'ajv'`); `verification_result`: `docs/records/qa/2026-09-11-issue-275-readiness-refresh-dependencies-code-review.md` | — |
| issue-275 | `handoff -> completed` | `orchestrator` | `closeout_evidence`: PR #276 "fix(readiness): lazy-load ajv and yaml in work-item-readiness decision module", merged 2026-09-11T17:08:49Z by `chakrits`; issue closed 2026-09-11T17:08:51Z | `37749ce30afaad4c652e93893e9232e0e818bf6a` |

- **Verification**: `npm run validate:contracts`; `npm run validate:project-state`; `npm run compile:status-projection -- --check` exits 0; neither issue appears in `PROJECT_STATUS.md`; the digest of each archived shard equals `digestTaskEnvelope` of its content.
- **Rollback**: `node scripts/backfill-task-state-v2.mjs --rollback`, or restore the backups and compare against the recorded pre-migration SHA-256.

#### Task 10: Independent Code Review Record (QG-001)
- **Owner**: `qa-agent` — **sole owner.** The implementer (`developer-agent`) must not author or co-author this record; implementer-verifier separation is the point of the gate.
- **Prerequisite**: Tasks 1–9.
- **Files**: `docs/records/qa/2026-09-12-control-plane-state-integrity-code-review.md`.
- **Implementation**: Independently review every `.mjs` change against the SDD, re-deriving each claim rather than accepting the implementer's summary.
- **Verification**: `npm run validate:review-gate`.

---

## 5. Test Strategy

| Test Type | Required? | Scope | Owner |
|---|---|---|---|
| Unit | Yes | Hasher self-exclusion, actor guards, terminal/unknown source guards, CAS, atomic writer cleanup | `developer-agent` |
| Contract | Yes | Envelope v2 + `policy_contract_version` binding, policy amendment, all eleven existing fixtures still green | `developer-agent` |
| Concurrency (barrier-synchronized) | Yes | Two-process lost-update race on a shard; archive-vs-projection interleaving; lock-order inversion detection | `developer-agent` / `qa-agent` |
| Fault Injection | Yes | Write failure temp cleanup, archival compensation, compensation-of-compensation failure, abandoned-lock refusal | `qa-agent` |
| Read-Only Assertion | Yes | Byte-equality of the whole fixture tree across `--check` and across both pure functions | `qa-agent` |
| Integration | Yes | Fail-closed projection, explicit reconcile idempotency, backfill idempotency and rollback | `qa-agent` |
| Regression | Yes | Full repository suite, no test weakening | `qa-agent` |
| Review Gate | Yes | QG-001 record present and independently authored | `qa-agent` |

---

## 6. Verification Commands

```bash
node --test test/task-state-machine.test.mjs
node --test test/compile-status-projection.test.mjs
node --test test/archive-work-item.test.mjs
node --test test/contracts.test.mjs
npm run validate:contracts
npm run validate:status-projection
npm run validate:review-gate
npm run validate:project-state
npm run validate:ci-parity
npm test
```

---

## 7. Rollback / Fallback Plan

| Scenario | Rollback / Fallback Action | Owner |
|---|---|---|
| Engine or concurrency test failure | Revert the slice's files on the branch; the previous commit stays green | `developer-agent` |
| Policy amendment breaks a fixture | Revert `bug-fix-workflow.yaml`; the amendment is additive, so revert is complete | `developer-agent` |
| Shard backfill failure | `node scripts/backfill-task-state-v2.mjs --rollback`, else restore backups and verify against recorded SHA-256 | `developer-agent` |
| Archival failure | Automatic compensating rename restores the shard; if compensation also fails the error says so and the operator reconciles manually | `developer-agent` |
| Abandoned lock in CI | `node scripts/task-machine-cli.mjs unlock --task <id> --nonce <observed>` or `--projection`, after confirming no live holder | Human Maintainer |

---

## 8. Risks / Blockers

| Risk / Blocker | Impact | Mitigation / Next Action |
|---|---|---|
| Abandoned shard lock blocks one work item | Medium | Deliberate (ADR-0027). Loud error naming a nonce-verified `unlock`. |
| Abandoned projection lock blocks every status update including CI | High | Deliberate (ADR-0030), justified in the SDD. Shorter critical section; diagnostic surfaced by every projection validator. |
| Matrix and policy drift apart | High | Parity test in Task 3 fails when a matrix destination has no policy counterpart. |
| Terminal migration illegal under current policy | High | Task 1's additive policy amendment lands before Task 9. |
| Active-shard validation lane breaks CI on pre-existing shards | Medium | Task 8 lands the lane only after Task 9 migrates the two v1 shards, or gates the lane behind the migration in the same commit. |

---

## 9. Handoff

| To | Reason | Required Evidence |
|---|---|---|
| Human Maintainer (gate) | Approve the Round 4 blueprint before any code is written | Revised requirement, SDD, plan, QA plan, security review |
| Documentation Agent | Record ADR-0026..ADR-0030 in `DECISIONS.md` — **five ADRs, not the four named in the Round 4 route**, because Blocker 4's projection transaction is a distinct decision from ADR-0029's archival scope | Approved SDD |
| Code Review Gate | Review all production script modifications | Diff, unit tests, independently authored code review record |
| QA Verifier | Independent verification of AC-001..AC-010 and the deterministic invariants | Full test run, mutation evidence, gate passes |
| Security Reviewer | Recheck the revised concurrency protocol against its conditions | Barrier-synchronized concurrency evidence, lock-order test, byte-equality evidence |
| Human Maintainer (merge) | Final merge approval | Clean CI run, approved reviews, zero gate failures |
