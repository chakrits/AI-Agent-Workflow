# Implementation Plan: Control-Plane State Integrity & Architecture Remediation

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | Issue #277 — Control-Plane State Integrity & Architecture Remediation (Package 1) |
| Change Type | Framework / Meta Architecture Remediation (`framework-meta`) |
| Risk Level | High |
| Owner | Developer Agent (`implementation-planning`) |
| Target Branch / Ticket | `feat/control-plane-state-integrity` / Issue #277 |
| Revision | Round 7 SA design — Human rejected SEC-004 residual on 2026-09-14. ADR-0032 adds durable generations and a non-reclaimable commit guard shared by commits and admission-lock recovery; Security and QA validation remain required before implementation. |

> **Scope note (ADR-0031).** Package 1's durable envelope and active-shard enforcement lane are narrowed
> to `workflow_id: "bug-fix"` only. Issue #277 is itself `framework-meta` and therefore has **no durable
> shard** under this package; the narrowed `change_type: ["bug-fix"]` enum is not a contradiction of the
> work item's own classification. `framework-meta`, `new-feature`, `config-change` and `data-change`
> continue to be governed by their policies and the existing `docs/contracts/examples/` lane.

---

## 2. Inputs Reviewed

| Artifact | Status | Notes |
|---|---|---|
| REQUIREMENT_DISCOVERY.md | Draft (`docs/records/requirements/2026-09-12-control-plane-state-integrity-discovery.md`) | BA discovery. AC-001..AC-010, BR-001..BR-005. Round 5 correction 3 (residual "atomic lock takeover" wording) is owned by BA Agent. |
| SDD.md | **Draft, Round 7 fencing revision — pending Security and QA** (`docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md`) | ADR-0032 records the Human decision. No implementation starts before independent Security and QA validation. |
| SECURITY_REVIEW.md | Round 6 Security revision (`docs/records/security-review/2026-09-12-issue-277-security-review.md`) | Security contract corrected; SEC-004 remains High/Open pending Security validation of ADR-0032; Human explicitly rejected residual acceptance. |
| TEST_PLAN.md | Draft (`docs/records/qa/2026-09-12-issue-277-test-plan.md`) | Full Mode QA artifacts, TC-001..TC-031. Requires QA-owned corrections listed in §9. |

---

## 3. Affected Areas

| Area | Files / Components | Expected Change |
|---|---|---|
| **Envelope Layer** | `docs/contracts/schemas/durable-task-envelope.schema.json` | Keep `contract_version: 2` const; add required integer `policy_contract_version` (minimum 1); narrow `workflow_id` and `change_type` enums to `["bug-fix"]` (ADR-0031); title corrected to v2. |
| **Policy Layer** | `docs/contracts/bug-fix-workflow.yaml` | Additive only: add terminal states and `handoff -> completed`; add a separate policy `resume` operation from `blocked` to `[investigating, verifying]` requiring `resume_evidence` and `approver_id`. No cancellation wildcard. Policy version stays `1`; legacy fixtures stay valid. |
| **Canonical Prose** | `AGENTS.md` (Bug Fix section, L274-276) | Add the layer split: policy owns states/transitions/evidence/retry budget; the durable envelope owns storage shape. |
| **Contract Validator** | `scripts/validate-contracts.mjs` | Keep the legacy example lane comparison `state.contract_version === policy.contract_version`; add a separate `bug-fix` active-shard lane comparing `state.policy_contract_version === policy.contract_version` and validating durable envelopes through `validateEnvelopeSchema`. The active lane skips exact `archive/` and dot-prefixed entries before validation. |
| **State Machine Engine** | `scripts/lib/task-state-machine.mjs`<br>`scripts/task-machine-cli.mjs` | `digestTaskEnvelope()`, `validateEnvelopeSchema()`; terminal matrix entries; `investigating.destinations` gains `implementing`; `UNKNOWN_SOURCE_STATE`; actor authorization; policy-sourced evidence; policy-authoritative resume bound to the latest interrupted state; fail-closed lock at `.locks/{expectedTaskId}.lock`; `mutateTaskStateOnDisk(rootDir, expectedTaskId, ...)` with inside-lock identity validation; CLI `inspect`, `resume`, and fenced admission `unlock --quiesced`; mandatory `--expected-digest`; stale writers must recompute. |
| **Projection & Archival** | `scripts/compile-status-projection.mjs`<br>`scripts/archive-work-item.mjs` | Pure detection/read-only `--check`; fenced projection publish; durable archive transaction journal; fenced forward/compensation renames; idempotent reconciliation; exact archive/dot exclusions. |
| **Migration & Operations** | `scripts/backfill-task-state-v2.mjs`<br>`docs/records/work-items/issue-249/task-state.json`<br>`docs/records/work-items/issue-275/task-state.json`<br>`PROJECT_STATUS.md` | Backfill tool with `--rollback`; evidence-bound migration of the two active `bug-fix` shards. |
| **QA Records** | `docs/records/qa/2026-09-12-control-plane-state-integrity-code-review.md` | Code review record satisfying `validate:review-gate` (QG-001), authored by the non-implementer. |
| **Tests** | `test/task-state-machine.test.mjs`<br>`test/compile-status-projection.test.mjs`<br>`test/archive-work-item.test.mjs`<br>`test/contracts.test.mjs` | Unit, barrier-synchronized multi-process concurrency, fault injection, lock-order, and read-only-check byte-equality tests. |

### 3.1 Fixture-count correction (Round 5 correction 2 — verified)

The prior revision of this plan and the SDD claimed "eleven existing example fixtures". Verified on
2026-09-12: `docs/contracts/examples/` contains **ten** `*.yaml` files plus one subdirectory,
`dispatch-receipts/`. A naive entry count returns eleven; the fixture count is ten. The review's "ten"
is accurate. **This plan states no count.** The discovery predicate is instead stated once and every
test derives the set from it:

> **Example-lane discovery predicate:** entries directly under `docs/contracts/examples/` that are
> regular files whose name ends in `.yaml`. Subdirectories are not fixtures.

Tests must enumerate via that predicate at runtime and assert the set is non-empty and every member
validates — never a hard-coded cardinality.

### 3.2 Canonical active-root exclusions (two enumerators, one rule)

SDD Component 4 states the skip for `discoverActiveShards()` in `scripts/compile-status-projection.mjs`.
**Implementation-time judgment call (recorded here, not decided silently):** the Task 8b active-shard
validator lane enumerates `docs/records/work-items/*` as well, so it needs the identical rule or it will
treat `.locks/` and `.projection.lock` as invalid shards. Both enumerators apply exactly two exclusions
before any shard-validity check: entry name exactly `archive`, and any entry whose name begins with `.`.
The dot-prefix rule is non-lossy because the envelope schema forbids a leading dot. `archive` is a
reserved root namespace; creation, mutation and archival reject `expectedTaskId === 'archive'` with
`RESERVED_TASK_ID`. The rule lands in **Task 4**, which is the first task that can create `.locks/` in
the real repository.

---

## 4. Task Breakdown (Reviewable Slices with Checkpoints)

### Cross-Cutting Fenced Commit Slices (ADR-0032; ordered in §4.0)

#### Task F1: Durable Generation Store (TDD)
- **Prerequisite:** Task 5 atomic writer.
- **Owner:** Developer Agent. **Files:** new `scripts/lib/fenced-commit.mjs`, focused unit tests.
- Red cases: missing/corrupt/exhausted generation fail closed; initialization refuses when a shard/archive/projection already exists; archive/restart never resets; atomic increment fault boundaries preserve one valid generation.
- Implement `readGeneration`, migration-only `initializeGeneration`, and crash-durable `incrementGeneration` through injected `createStateIo`.
- Verify mutants replacing `+ 1` with reset/reuse and permitting implicit initialization. Rollback restores the full pre-activation checkpoint, never only generation files.

#### Task F2: Non-Reclaimable Commit Guard (TDD)
- **Prerequisite:** Task F1.
- **Owner:** Developer Agent. **Files:** `scripts/lib/fenced-commit.mjs`, CLI diagnostics, focused tests.
- Red cases: exclusive acquisition; owner nonce release; abandoned/malformed guard returns `COMMIT_GUARD_ABANDONED`; no online command removes it; injected force-removal mutant is killed.
- Implement stable task/projection guard namespaces. Document offline recovery: stop writers, restart host/session, preserve generation, remove guard, run integrity checks, then restart writers.

#### Task F3: Fenced Shard Conditional Commit (TDD)
- **Prerequisite:** Task 4 admission lock plus Task F2.
- **Owner:** Developer Agent. **Files:** state machine, CLI, archive integration/journal, tests.
- Red barriers: ordinary A/B; A pauses before guard then false-quiescence recovery/B; A pauses inside guard; recovery before/after generation rename; stale token and stale digest; retry cannot reuse old candidate; forward archive and compensation pause before task guard and before rename.
- Implement admission → generation snapshot → compute → commit guard → generation/digest/identity reread → atomic rename. `FENCING_TOKEN_STALE` sets `retryable: true`, `recompute_required: true`.
- Kill mutants that move generation check before guard, omit the inside-guard reread, or permit candidate retagging.

> **🛑 Security checkpoint F:** Security independently validates the shard proof and crash table before projection work starts.

#### Task F4: Fenced Projection Conditional Commit (TDD)
- **Prerequisite:** Task 7 projection admission/archival transaction plus Task F3.
- **Owner:** Developer Agent. **Files:** projection/archive scripts and tests.
- Red barriers reproduce projection A compiled before recovery, B after recovery, and both write orders without shard-digest backstop.
- Implement projection admission → generation snapshot → compile → projection commit guard → generation recheck → atomic rename. Recovery bumps projection generation under the same guard before admission unlink.
- Verify stale compiler always throws `FENCING_TOKEN_STALE`; read-only `--check` reads no generation and creates no namespace.

#### Task F5: Migration, Observability and Offline Runbook
- **Prerequisite:** Tasks 9a, F3 and F4; completes before any fenced writer is activated.
- **Owner:** Developer Agent + Documentation Agent. Initialize generation 1 under guards before activation; retain task generations after archive; forbid task-ID reuse. Add structured error evidence without state contents.
- Rollback is whole-checkpoint only. Validate shards/projection/digests before and after offline guard repair.
- Verification: migration idempotency, rollback rehearsal, restart fixture, and full repository gates.

> **🛑 QA Full Mode checkpoint:** QA re-derives every interleaving, performs mutation testing, and verifies `--check` remains byte-identical. Implementation cannot begin until Security and QA approve this blueprint.


> **Gate:** no implementation task starts until Security and QA approve the Round 7 blueprint. ADR-0032 records the Human decision; prior ADR-0026..ADR-0031 remain required blueprint inputs.

### 4.0 Ordering rationale (Round 5 Blocker 3)

Blocker 3 is correct that the Round 4 order was circular: Task 8 activated strict active-shard
validation and then verified `npm run validate:contracts`, while Task 9 depended on Task 8 to migrate
the very shards that would fail it. The review's prescribed split — `8a backfill tool (lane disabled)`
→ `9 operational migration` → `8b enable strict lane` — is adopted.

**One additional circularity the review did not catch, verified 2026-09-12.** Round 5 SDD Component 6
makes `compileStatusProjection()` read every active shard through `validateEnvelopeSchema()` and throw
`MALFORMED_SHARD` on any invalid one. `npm run validate:status-projection` resolves to
`node scripts/compile-status-projection.mjs --check` (`package.json:39`) and
`discoverActiveShards()` reads the **real** `docs/records/work-items/*/task-state.json`
(`scripts/compile-status-projection.mjs:32-61`). Both live shards are today
`contract_version: 1` with **no** `policy_contract_version` and **no** `sequence_number`. Task 6's own
verification command therefore cannot pass while the live shards are unmigrated — the same defect one
phase earlier, which the 8a→9→8b split alone does not fix. Migration is consequently interleaved:

| # | Task | Rollback point |
|---|---|---|
| 1 | Envelope schema, policy amendment, validator re-binding | revert 4 files |
| 2 | Hasher & envelope validation seam | revert engine |
| 3 | Matrix completion, fail-closed source guard, actor policy | revert engine |
| 4 | Shard lock (stable namespace), CLI recovery surface, mutation wrapper, dot-skip | revert lock/CLI/projection-enumerator changes |
| — | **🛑 Checkpoint 1** | last green commit |
| 5 | Crash-durable atomic writer | revert writer |
| **F1–F2** | Durable generation store + non-reclaimable commit guard | revert before activation |
| **F3** | Fenced shard conditional commit and fenced admission recovery | revert fenced shard slice |
| **8a** | Backfill tool + tests, **lane disabled** | delete the backfill script (nothing depends on it yet) |
| **9a** | Operational: backfill + terminal hops on both shards, **no archive** | `--rollback` + backup restore vs recorded SHA-256 |
| 6 | Pure projection, drift detection, explicit repair | revert both scripts |
| 7 | Projection admission lock, lock order, archival compensation | revert both scripts |
| **F4** | Fenced projection conditional commit | revert fenced projection slice |
| **F5** | Generation migration, observability, offline runbook; activate fenced writers | whole-checkpoint rollback only |
| — | **🛑 Checkpoint 2** | last green commit |
| **9b** | Operational: archive both shards | resume/compensate through fenced journal; no raw rename |
| **8b** | Enable the strict active-shard lane | **deactivate the lane only — do not delete the backfill tool**, the migrated shards depend on its `--rollback` path |
| 10 | Independent code review record | n/a (record-only) |

F4 follows Task 7; F5 follows migration and both fenced paths. 9b must follow Task 7 and F5 because archival compensation is SDD Component 8 and only exists from Task 7
onward. 9a must precede Task 6 for the reason above. **SA ruling (affirmed in SDD Component 6):** this
ordering — 8a and 9a before Component 6, 9b after the projection lock and archival compensation, 8b last
— is the design of record. Making the compiler temporarily lenient toward v1 shards to preserve the
original task numbering was considered and rejected: a fail-open compiler is the defect AC-008 and
ADR-0029 exist to remove. No correction to the table above was required. Each step's verification command is chosen so it
can actually pass at the point it runs; where it could pass *vacuously* that is called out explicitly.

### Phase 4A: Contract Layering & Core Engine

#### Task 1: Envelope Schema, Policy Amendment & Lane-Specific Version Binding (ADR-0026, ADR-0031)
- **Owner**: `developer-agent`
- **Prerequisite**: Human approval gate.
- **Files**: `docs/contracts/schemas/durable-task-envelope.schema.json`, `docs/contracts/bug-fix-workflow.yaml`, `AGENTS.md`, `scripts/validate-contracts.mjs`, `test/contracts.test.mjs`.
- **Schema lane note (verified 2026-09-12):** `loadSchemas()` in `scripts/validate-contracts.mjs:31-47` selects only files ending `-state.schema.json` and maps `task-state.schema.json -> bug-fix`. `durable-task-envelope.schema.json` is therefore **not** in the example-fixture lane, so adding a required property to it, or narrowing its `workflow_id` enum, cannot affect those fixtures. The envelope schema serves the new active-shard lane (Task 8b) and the `validateEnvelopeSchema` seam only. Task 1 must state this mapping in a comment beside the validator change so the two lanes are not later merged by accident.
- **TDD Failing Step**: Add failing tests asserting
  (a) a shard with `contract_version: 2` and `policy_contract_version: 1` validates against a `contract_version: 1` policy;
  (b) a shard whose `policy_contract_version` does not match its policy is rejected;
  (c) every fixture discovered by the §3.1 predicate still validates after **both** the policy amendment and the envelope schema change, the discovered set is asserted non-empty, and the example lane is asserted to still resolve `bug-fix` to `task-state.schema.json` — **no fixture count is asserted**;
  (d) an envelope missing `policy_contract_version` is rejected by `validateEnvelopeSchema`;
  (e) `bug-fix` policy now permits `handoff -> completed` with `closeout_evidence` and rejects it without;
  (f) an envelope carrying `workflow_id` of `new-feature`, `config-change`, `data-change` or `framework-meta` is **rejected** by the envelope schema (ADR-0031 negative case);
  (g) the amended policy contains **no** wildcard transition row and no `-> cancelled` row, so `cancelled` is a declared storage state with no ingress.
  (h) the legacy example lane reads `state.contract_version`, while the active-envelope seam reads
  `state.policy_contract_version`; mutation tests swapping either field make that lane fail;
  (i) the policy contains a separate `resume` operation with `from: blocked`, destinations exactly
  `[investigating, verifying]`, and requirements exactly `[resume_evidence, approver_id]`.
  (j) the durable envelope rejects `task_id: archive`, reserving that root entry for archived shards.
- **Implementation**:
  - Add required `policy_contract_version` (integer, minimum 1) to the envelope schema; narrow `workflow_id` and `change_type` to `["bug-fix"]`; reserve `task_id: archive` with a schema-level negative constraint; fix the schema `title` to say v2.
  - Amend `bug-fix-workflow.yaml` additively as described in §3 — terminal states, the
    `handoff -> completed` row, and the separate blocked-resume operation.
  - Keep the existing example-lane comparison against `state.contract_version`. Introduce a distinct
    active-envelope version-binding helper/seam that compares `state.policy_contract_version`; Task 8b
    connects that seam to active-root enumeration. Do not globally replace the existing comparison.
  - Add the AGENTS.md layer-split sentence.
- **Verification**: `node --test test/contracts.test.mjs`; `npm run validate:contracts`.
- **Rollback**: Revert the five scoped files; the amendment is additive so no fixture rewrite is needed.

#### Task 2: Self-Excluding Hasher & Envelope Validation Seam (ADR-0028)
- **Owner**: `developer-agent`
- **Prerequisite**: Task 1.
- **Files**: `scripts/lib/task-state-machine.mjs`, `test/task-state-machine.test.mjs`.
- **TDD Failing Step**: Failing tests asserting `digestTaskEnvelope()` yields the same digest whether `state_digest` is present, absent, or empty; does not mutate its argument; and `validateEnvelopeSchema()` throws `DIGEST_INTEGRITY_MISMATCH` carrying `stored_digest` and `recomputed_digest` when a field is changed without rehashing.
- **Implementation**: Implement `digestTaskEnvelope(envelope)` and `validateEnvelopeSchema(data)` per SDD Component 3.
- **Verification**: `node --test test/task-state-machine.test.mjs`.
- **Rollback**: Revert `task-state-machine.mjs`.

#### Task 3: Matrix Completion, Empty-Intersection Repair, Fail-Closed Source Guard & Actor Policy (AC-003, AC-004, AC-009)
- **Owner**: `developer-agent`
- **Prerequisite**: Task 2.
- **Files**: `scripts/lib/task-state-machine.mjs`, `test/task-state-machine.test.mjs`.
- **Empty-intersection defect the strict authority rule created (SDD Component 2, SA ruling).** Verified
  2026-09-12: `TRANSITION_MATRIX.investigating.destinations` is
  `['designing', 'planning', 'blocked', 'cancelled']` (`scripts/lib/task-state-machine.mjs:49-53`) while
  `bug-fix-workflow.yaml:7` carries `{ from: investigating, to: implementing }`. Under strict
  intersection the legal set at that hop is **empty**, severing the bug-fix happy path at its second
  transition. **The SA resolved this by widening the matrix, not the policy:** the entry becomes
  `['implementing', 'designing', 'planning', 'blocked', 'cancelled']`. The matrix is the superset the
  policy intersection narrows, so a superset omitting a state the canonical policy requires is simply a
  wrong superset; widening it changes no workflow's legality except where a policy already authorized
  the hop. Amending `bug-fix-workflow.yaml` instead, or weakening the intersection, were both rejected
  in Component 2. **This is the only such gap:** every other `bug-fix` policy destination
  (`intake -> investigating`, `investigating -> blocked`, `implementing -> verifying`,
  `verifying -> {handoff, rework, blocked}`, `rework -> implementing`, and Task 1's new
  `handoff -> completed`) is already present in the corresponding matrix entry, so the guard below
  passes after this one edit.
- **TDD Failing Step**: Failing tests asserting:
  0. **Standing intersection guard (SDD Component 2 — write it as a regression guard, not a one-off).**
     Enumerate **every** transition row of **every** in-scope `*-workflow.yaml`, discovered at runtime
     from `docs/contracts/` rather than hard-coded, and assert for each: (a) `TRANSITION_MATRIX[from]`
     exists; (b) `TRANSITION_MATRIX[from].destinations` **contains** `to`; and (c) consequently the
     matrix ∩ policy intersection is **non-empty for every source state that any policy row names**.
     An empty intersection or a missing destination is a build failure. In-scope for Package 1 is
     `bug-fix-workflow.yaml` (ADR-0031); the enumeration is written so that admitting a second workflow
     to the durable envelope later extends the guard automatically rather than needing a new test. This
     test must fail before the `investigating -> implementing` widening and pass after it — that
     ordering is what proves it is a real guard and not a restatement of the fix.
  1. `completed` and `cancelled` reject every one of the other ten destinations with `ILLEGAL_TRANSITION_REJECTED`.
  2. An envelope whose `state` has no matrix entry throws `UNKNOWN_SOURCE_STATE`.
  3. `transitionTaskState()` throws `UNAUTHORIZED_ACTOR` when the actor is absent from `TRANSITION_MATRIX[from].actors`; `'Developer Agent'` normalizes to `'developer-agent'`; an unregistered role throws `UNAUTHORIZED_ACTOR`.
  4. Every `-> blocked` transition is rejected without `stop_reason`, sourced from the policy row's `requires` (the policy already carries `requires: [stop_reason]` on every `-> blocked` row) — **not** from a special case in the engine.
  5. Any `-> cancelled` transition is rejected as policy-silent, because `bug-fix-workflow.yaml` enumerates no such row (SDD Component 1). This is the regression guard for "`cancelled` has no ingress in Package 1".
  6. **Authority-rule parity test:** every requested transition requires the matrix destination plus a
     matching policy transition row. The separate policy resume operation is tested only through
     `resumeTaskState`; transition mode from `blocked` remains policy-silent. The test also proves
     `TRANSITION_MATRIX[from].requires` is never consulted. There is no transition fallback.
  7. An unknown `workflow_id` fails closed.
  8. `blocked` is non-terminal in the computed intersection. Full-path cases enter it from
     `investigating` and `verifying`, then `resume` to the same recorded source with actor `human` or
     `orchestrator`, `resume_evidence`, and `approver_id`. Negative cases assert
     `HUMAN_APPROVAL_REQUIRED` for unauthorized/missing evidence, `INVALID_RESUME_TARGET` for another
     policy-listed target, and `RESUME_OPERATION_REQUIRED` when ordinary transition mode attempts a
     resume operation.
- **Implementation**:
  - Add `completed` / `cancelled` entries with empty `destinations`, `requires`, `actors`.
  - **Add `implementing` to `TRANSITION_MATRIX.investigating.destinations`** (SDD Component 2). No policy file is touched by this task.
  - Write `blocked.destinations` out explicitly instead of referencing `STATES`.
  - Invert `if (matrixEntry)` to the fail-closed `UNKNOWN_SOURCE_STATE` throw.
  - Canonicalize the actor to lowercase kebab-case against `ROLE_REGISTRY` and assert membership.
  - **Delete** the `to !== 'blocked' && to !== 'cancelled'` evidence bypass outright (SDD Component 2) rather than narrowing it.
  - Resolve transition evidence solely from the workflow policy transition row; unknown workflow,
    source, or policy pair fails closed. Read blocked resume destinations and evidence from the separate
    policy `resume` operation.
  - Implement `resumeTaskState()` as a policy operation over the same intersection: locate the latest
    history event entering `blocked`, require `to === event.from`, then apply the policy row, matrix
    actor check, and Human evidence checks. Ordinary transition does not consult the resume operation.
- **Verification**: `node --test test/task-state-machine.test.mjs`; `npm run validate:contracts`.
- **Rollback**: Revert `task-state-machine.mjs`.

#### Task 4: Identity-Bound Shard Lock, CLI Recovery Surface & Disk-Bound Mutation Wrapper (ADR-0027)
- **Owner**: `developer-agent`
- **Prerequisite**: Task 3.
- **Files**: `scripts/lib/task-state-machine.mjs`, `scripts/task-machine-cli.mjs`, `scripts/compile-status-projection.mjs`, `test/task-state-machine.test.mjs`, `test/compile-status-projection.test.mjs`.
- **TDD Failing Step**: Failing tests asserting:
  1. The lock created by `acquireShardLock(rootDir, expectedTaskId)` is at `docs/records/work-items/.locks/{expectedTaskId}.lock` and **nowhere under `work-items/{expectedTaskId}/`**; the directory is created with `mkdirSync(recursive)` on first use.
  2. The lock API is keyed by explicit `expectedTaskId`, not by a pre-read envelope or directory path: `acquire`, `release`, `inspect` and `unlock` all take `(rootDir, expectedTaskId)`, and a release still resolves the same pathname after the shard directory has been renamed away.
  3. **Three-tier classification, liveness dominates age:** young + live PID → randomized backoff, retry up to 5 s, then `LOCK_ACQUISITION_TIMEOUT`; old + live PID → `LOCK_ACQUISITION_TIMEOUT` with a `LOCK_HELD_LONG` advisory and holder diagnostics (`pid`, `nonce`, `created_at`, age); **dead PID at any age** → `LOCK_ABANDONED`. Age alone must **never** classify abandonment — a test with a live-but-old holder asserts it does **not** produce `LOCK_ABANDONED`.
  4. Every refusal leaves the lock file **byte-identical on disk**, and the message names `unlock --task <id> --nonce <observed> --quiesced`.
  5. `releaseShardLock(rootDir, task_id, 'nonce-B')` against a lock holding `nonce-A` does not unlink it.
  6. `unlock --task T --nonce N --quiesced` removes the lock when the nonce matches, throws `LOCK_NONCE_MISMATCH` when it does not, and **refuses without `--quiesced`**. A test asserts the CLI prints the holder record and the consequence of a wrong quiescence assertion before acting. `unlock` must additionally hold the commit guard, durably increment generation, then unlink admission. The test makes the quiescence assertion false and proves the old writer fails `FENCING_TOKEN_STALE`.
  6a. Empty, truncated, invalid-JSON, and schema-invalid shard and projection locks raise
      `LOCK_MALFORMED`, remain byte-identical after acquisition/inspection refusal, and name
      `unlock --malformed --quiesced`. Malformed recovery refuses without both flags, requires no nonce,
      and re-reads immediately before unlink: if the lock became valid it fails `LOCK_BECAME_VALID`.
      Valid nonce mode presented with malformed bytes fails `LOCK_MALFORMED`.
  7. `inspect` prints holder and current digest, mutates nothing, and requires no `--quiesced`.
  8. `mutateTaskStateOnDisk` rejects missing or empty `expected_digest` with `MISSING_EXPECTED_DIGEST`, and a stale digest with `CAS_CONFLICT` carrying both digests, in both `transition` and `resume` mode, inside the critical section.
  9. No lock file remains at `work-items/.locks/{id}.lock` after any success or failure path (zero lock leaks).
  10. `discoverActiveShards()` skips exact `archive/` and every dot-prefixed entry *before* any shard-validity check; a task identifier `archive` is rejected with `RESERVED_TASK_ID` (§3.2).
  11. Mutation receives `expectedTaskId`, derives `work-items/{expectedTaskId}/task-state.json`, acquires
      that identifier's lock, then rejects with `TASK_IDENTITY_MISMATCH` unless the re-read
      `current.task_id` and directory basename both equal `expectedTaskId`. The mismatch leaves the file
      byte-identical and releases the lock.
  12. A barrier replaces an A envelope with one declaring B between operation start and lock
      acquisition. Writer A under lock A must fail `TASK_IDENTITY_MISMATCH`; writer B under lock B must
      not overlap a write to A's pathname. Repeat for `resume` mode.
  13. Build lock behavior through the injected adapter from SDD Component 4. A delegating test adapter
      pauses `unlinkSync` at a barrier and deterministically drives the four-step shard and projection
      wrong-unlock counterexamples. No sleep-based ordering, environment flag, mutable global hook, or
      production test-only branch is allowed. For the shard case, both writers may compute from `D0`, but recovery increments generation and the old writer must fail before rename. For projection, the pre-recovery compiler must fail its inside-guard generation check; neither path demonstrates last-rename-wins.
- **Implementation**:
  - `createStateIo({ fsOps, processOps, clock, random })` per SDD Component 4; production uses the
    narrow Node adapters and tests inject one delegating adapter across locks, state/projection writes,
    and atomic rename barriers.
  - `acquireShardLock(rootDir, expectedTaskId)` / `releaseShardLock(rootDir, expectedTaskId, nonce)` per
    SDD Component 4 — no automatic reclamation path exists. Strict lock parsing returns
    `LOCK_MALFORMED`; explicit recovery holds the commit guard and bumps generation before removing malformed admission bytes.
  - `mutateTaskStateOnDisk(rootDir, expectedTaskId, {to, actor, expected_digest, evidence, mode})` per
    SDD Component 9. Derive the active shard path from `expectedTaskId`, bind it to the re-read envelope
    under the lock, and release in `finally`; do not pre-read `task_id` to select the lock.
  - `scripts/task-machine-cli.mjs`: `transition` and `resume` call only the wrapper, require `--task` and
    `--expected-digest`; add `inspect` and `unlock` (`--task` or `--projection`, exactly one of `--nonce`
    or `--malformed`, and mandatory `--quiesced`).
  - `scripts/compile-status-projection.mjs`: exact `archive/` and dot-prefixed skips in `discoverActiveShards()`.
- **Verification**: `node --test test/task-state-machine.test.mjs test/compile-status-projection.test.mjs`.
- **Rollback**: Revert lock, wrapper, CLI and enumerator changes.

> **🛑 Checkpoint 1:** Contract layering, engine guards and the fail-closed lock pass unit tests. Verify zero lock leaks and zero temp leaks across success and failure paths, and that no lock is ever created inside a shard directory.

---

### Phase 4B: Durable Writer, Migration, Projection Purity & Projection Transaction

#### Task 5: Crash-Durable Atomic Writer with Failure Cleanup
- **Owner**: `developer-agent`
- **Prerequisite**: Checkpoint 1.
- **Files**: `scripts/lib/task-state-machine.mjs`, `test/task-state-machine.test.mjs`.
- **TDD Failing Step**: Failing tests asserting:
  1. The write loop completes short writes.
  2. **Zero-progress fault injection (Round 5 correction 4):** a stubbed `fs.writeSync` returning `0` causes `atomicWriteFileSync` to throw `ATOMIC_WRITE_NO_PROGRESS` carrying the bytes-written/total counts, **and does not loop**. The test must be bounded so a regression to an infinite loop fails on timeout rather than hanging the suite.
  3. **Cleanup assertion for that case:** after the zero-progress throw, no `.tmp-*` file remains in the target directory and the target file is byte-unchanged.
  4. The `.tmp-*` file is unlinked when `fs.writeSync` *throws* mid-write, and when the rename fails; the target file is untouched on every failure path.
  5. The file `fsyncSync`, the rename, and the directory `fsyncSync` occur in that order.
- **Implementation**: `atomicWriteFileSync` per SDD Component 5, including the `if (n <= 0) throw` guard.
- **Verification**: `node --test test/task-state-machine.test.mjs`.
- **Rollback**: Revert the writer.

#### Task 8a: Backfill Tool & Tests — Active-Shard Lane **Disabled**
- **Owner**: `developer-agent`
- **Prerequisite**: Task 5.
- **Files**: `scripts/backfill-task-state-v2.mjs`, `test/contracts.test.mjs`.
- **Scope boundary**: this task adds **no** change to `scripts/validate-contracts.mjs`. The strict lane is Task 8b. That is the whole point of the split: at this point the live shards are still v1, so any strict lane would fail this task's own verification.
- **Sequence-number rule (verified against the repository 2026-09-12):**
  `sequence_number = history.length + 1`.
  Derivation: `createTaskState()` initializes an empty-history shard at `sequence_number: 1`
  (`scripts/lib/task-state-machine.mjs:192-203`), and after one transition the existing repository test
  asserts `sequence_number === 2` with `history.length === 1`
  (`test/task-state-machine.test.mjs:117-125`). Equality (`sequence_number === history.length`) would
  duplicate the last sequence position and break monotonic continuation. Both live shards carry three
  history events, so both migrate to `sequence_number: 4`.
- **Protecting assertion (the invariant, not the value):** assert `sequence_number === history.length + 1`
  in **two** places — (i) immediately after backfill of a fixture shard, and (ii) after one further real
  `mutateTaskStateOnDisk` transition on that migrated shard, where history goes N → N+1 and the sequence
  goes N+1 → N+2. Asserting the invariant in both places is what prevents a regression to equality:
  a constant-value assertion would pass under an off-by-one that also shifted the constant.
- **TDD Failing Step**: Failing tests asserting `backfillTaskStateV2()` upgrades a v1 shard to `contract_version: 2` with `policy_contract_version: 1`, `sequence_number = history.length + 1`, and a `state_digest` equal to `digestTaskEnvelope(data)`; that the result passes `validateEnvelopeSchema`; that a second run is a byte-identical no-op; that `--rollback` restores the pre-migration file exactly; and the two sequence-invariant assertions above. A negative case asserts the tool refuses a shard whose `workflow_id` is not `bug-fix` (ADR-0031).
- **Verification**: `node --test test/contracts.test.mjs`; `npm run validate:contracts` (still passing because no new lane was added); `npm test`.
- **Rollback**: Delete the backfill script. Nothing depends on it yet, so this rollback is complete.

#### Task 9a (Operational Step): Evidence-Bound Migration of issue-249 and issue-275 — **no archive**
- **Owner**: `developer-agent` (separately approved operational execution)
- **Prerequisite**: Task 8a.
- **Files**: `docs/records/work-items/issue-249/task-state.json`, `docs/records/work-items/issue-275/task-state.json`, `PROJECT_STATUS.md`.
- **Why here and not after Task 7**: §4.0 — Task 6's own verification (`npm run validate:status-projection`) reads the live shards through `validateEnvelopeSchema` and cannot pass while they are v1.
- **Constraint**: the actor matrix forbids one role from running both terminal hops — `verifying -> handoff` is `qa-agent`, `handoff -> completed` is `orchestrator` or `release-agent`. Each hop is executed and recorded separately; no synthesized or generic history is permitted.
- **Execution**:
  1. Back both shards up to the session scratch directory; record the pre-migration SHA-256 of each file.
  2. Run `node scripts/backfill-task-state-v2.mjs docs/records/work-items/issue-249` and the same for `issue-275`.
  3. Execute the two terminal hops per shard with the real closeout evidence below, one `mutateTaskStateOnDisk` call each, supplying the `--expected-digest` printed by `inspect` immediately beforehand.
  4. Regenerate the projection: `npm run compile:status-projection`. Both shards are still active at this point, now in state `completed`, so the projection table must reflect that; `--check` must then exit 0.
- **Real closeout evidence (verified against the GitHub API on 2026-09-12):**

| Shard | Hop | Actor | Evidence | Merge commit |
|---|---|---|---|---|
| issue-249 | `verifying -> handoff` | `qa-agent` | `original_repro_result`: `docs/records/qa/2026-09-09-issue-249-token-body-code-review.md`; `verification_result`: `npm test` 706/706 green at merge | — |
| issue-249 | `handoff -> completed` | `orchestrator` | `closeout_evidence`: PR #251 "fix: extract the PR body from argument tokens, not raw command text (Issue #249)", merged 2026-09-09T05:52:15Z by `chakrits`; issue closed 2026-09-09T05:52:16Z | `0c4f79055a5f8b90153fee9ede1cefc9335950a4` |
| issue-275 | `verifying -> handoff` | `qa-agent` | `original_repro_result`: GitHub Actions run 34623255592 (`Cannot find package 'ajv'`); `verification_result`: `docs/records/qa/2026-09-11-issue-275-readiness-refresh-dependencies-code-review.md` | — |
| issue-275 | `handoff -> completed` | `orchestrator` | `closeout_evidence`: PR #276 "fix(readiness): lazy-load ajv and yaml in work-item-readiness decision module", merged 2026-09-11T17:08:49Z by `chakrits`; issue closed 2026-09-11T17:08:51Z | `37749ce30afaad4c652e93893e9232e0e818bf6a` |

- **Verification**: `npm run validate:contracts`; `npm run validate:project-state`; `npm run compile:status-projection -- --check` exits 0; each migrated shard satisfies `sequence_number === history.length + 1` and `state_digest === digestTaskEnvelope(shard)`; both shards are still present under `work-items/` (archival is Task 9b).
- **Rollback**: `node scripts/backfill-task-state-v2.mjs --rollback` for each shard, else restore the scratch backups and verify each file against the recorded pre-migration SHA-256; then re-run `npm run compile:status-projection` to restore `PROJECT_STATUS.md`.

#### Task 6: Pure Projection, Drift Detection & Explicit Repair (ADR-0029)
- **Owner**: `developer-agent`
- **Prerequisite**: Task 9a.
- **Files**: `scripts/compile-status-projection.mjs`, `scripts/archive-work-item.mjs`, `test/compile-status-projection.test.mjs`, `test/archive-work-item.test.mjs`.
- **TDD Failing Step**: Failing tests asserting:
  1. `compileStatusProjection()` throws `MALFORMED_SHARD` on unparseable JSON, schema violation, or digest mismatch.
  2. `compileStatusProjection()` and `detectArchivedShardDrift()` write zero bytes — hash and `stat` every file under the fixture root before and after.
  3. `checkProjectStatusSync()` on a drifted fixture returns `inSync: false` with a `recovery` string naming `--reconcile`, the CLI exits 1, and **no file under the fixture root changes**.
  4. `reconcileArchivedShards()` repairs the same fixture and is idempotent on a second run.
  5. The call graph is acyclic: `updateProjectStatusFile()` never re-enters reconciliation (asserted by a call spy, so a future edit that reintroduces recursion fails loudly rather than stack-overflowing).
- **Implementation**: Split the four functions per SDD Component 6; add the `--reconcile` flag; keep `--check` on the pure path only.
- **Verification**: `node --test test/compile-status-projection.test.mjs test/archive-work-item.test.mjs`; `npm run validate:status-projection`. **This command can now pass only because Task 9a migrated the live shards** — if it fails here, the migration is incomplete, not the projection code.
- **Rollback**: Revert both scripts.

#### Task 7: Projection Transaction & Journaled Fenced Archival (ADR-0029, ADR-0030, ADR-0032)
- **Owner:** `developer-agent`; **Prerequisite:** Task 6 and F3.
- **Files:** projection/archive scripts, fenced-commit library, focused tests.
- **TDD red cases:**
  1. Strict-schema negatives: partial/unknown fields, bad journal digest, changed immutable intent, duplicate txid/attempt ID across the retained ledger, revision regression, invalid phase/outcome pair, and `EEXIST` initial creation all fail closed.
  2. Conditional advancement rejects wrong expected txid/revision/current attempt/generation/phase/outcome or physical predicate with named codes and byte-identical state.
  3. Execute every SDD phase × `{A,R,B,N}` × generation `{equal,greater,lower}` matrix cell. Auto cells reach the named next state; ambiguous/malformed/regressed cells make zero writes and require offline inspection.
  4. Generation-greater adoption appends a fresh attempt linked to the predecessor; a later archive after terminal compensation appends a fresh immutable transaction, preserves immutable intent/source binding/phase/outcome, and recompiles projection. It never retags or reuses an old candidate.
  5. Barrier each journal persist, forward/compensation rename, each parent sync, projection success/failure, adoption and terminal finalize. Include crashes after rename before sync and after sync before phase persistence.
  6. `compensation_requested` is persisted before reverse rename. Projection failure/crash before that phase retries projection; it never infers compensation from ambiguous evidence.
  7. Distinct terminals require `terminal_archived+R+archived` or `terminal_compensated+A+compensated`; swapped locations/outcomes fail. Success requires a freshly matching projection.
  8. Instrumentation proves shard→projection admission order and zero overlap between task/projection commit guards; stale projection candidates are rejected/recompiled.
- **Mutation operators:** collapse terminal phases to `complete`; remove outcome discriminator; mutate immutable intent during adoption; replace append with retag; reuse old projection candidate; skip journal digest/revision/phase/txid/path/generation predicate; infer compensation without `compensation_requested`; auto-repair `B`/`N`; allow duplicate initial create or overwrite a terminal journal instead of appending; overlap commit guards. Every mutant must be killed.
- **Implementation:** Component 8 strict schema and matrix-driven state machine. Reconciliation accepts only named auto-resumable cells. Error codes include `ARCHIVE_JOURNAL_CONFLICT`, `ARCHIVE_JOURNAL_MALFORMED`, `ARCHIVE_JOURNAL_TAMPERED`, `ARCHIVE_EXECUTOR_STALE`, `ARCHIVE_LOCATION_AMBIGUOUS`, `ARCHIVE_ADOPTION_UNSAFE`, and `FENCE_GENERATION_REGRESSION`.
- **Verification:** focused archive/projection tests, status projection check, full suite.
- **Rollback:** whole pre-activation checkpoint only; never restore an old generation or discard an incomplete journal.

> **🛑 Checkpoint 2:** Projection purity, projection transaction and archival compensation validated with barriers and fault injection; the live shards are migrated but not yet archived.

---

### Phase 4C: Archival, Lane Activation & Governance Closeout

#### Task 9b (Operational Step): Archive issue-249 and issue-275
- **Owner**: `developer-agent` (separately approved operational execution)
- **Prerequisite**: Checkpoint 2.
- **Files**: `docs/records/work-items/issue-249/`, `docs/records/work-items/issue-275/`, `PROJECT_STATUS.md`.
- **Execution**: `node scripts/archive-work-item.mjs issue-249`, then `issue-275`, each through the Task 7 transactional path.
- **Verification**: `npm run validate:project-state`; `npm run compile:status-projection -- --check` exits 0; neither issue appears in `PROJECT_STATUS.md`; each shard is present under `docs/records/work-items/archive/{id}/` and its `state_digest` still equals `digestTaskEnvelope` of its content (the archive move must not have rewritten it); no lock file at any of the three pathnames in Task 7 item 7.
- **Rollback**: do not run raw `mv`. Before activation use whole-checkpoint rollback. After activation invoke the fenced journal compensator for each task, then fenced projection reconciliation and `--check`; generation never decreases and journal evidence remains auditable.

#### Task 8b: Enable the Strict Active-Shard Validation Lane
- **Owner**: `developer-agent`
- **Prerequisite**: Task 9b.
- **Files**: `scripts/validate-contracts.mjs`, `test/contracts.test.mjs`.
- **Vacuity warning — the lane's own tests must not depend on a live shard.** After Task 9b both shards are under `archive/`, so `docs/records/work-items/*/task-state.json` may match the empty set and `npm run validate:contracts` would pass vacuously. The lane is therefore tested against a **temporary fixture root**, not the repository root.
- **TDD Failing Step**: Failing tests over a fixture root asserting:
  1. **Positive:** a valid `bug-fix` `contract_version: 2` shard with matching `policy_contract_version`, `sequence_number === history.length + 1` and a correct `state_digest` passes the lane.
  2. **Negative — v1:** a `contract_version: 1` shard (no `policy_contract_version`) is rejected. This is the case that would have broken CI had the lane landed before migration.
  3. **Negative — wrong workflow:** a shard with `workflow_id` of `new-feature`, `config-change`, `data-change` or `framework-meta` is rejected (ADR-0031).
  4. **Negative — digest:** a shard whose `state_digest` does not equal `digestTaskEnvelope(shard)` is rejected with `DIGEST_INTEGRITY_MISMATCH`.
  5. **Enumeration:** the lane skips dot-prefixed entries, so a fixture root containing `.locks/{id}.lock` and `.projection.lock` alongside one valid shard still passes and reports exactly one validated shard (§3.2).
  6. **Non-vacuity:** the lane reports the number of shards it validated, and the fixture tests assert that number is greater than zero, so an enumeration bug that finds nothing fails loudly instead of passing.
  7. **Archive exclusion:** the exact `archive/` entry and every shard below it are not enumerated by the active lane; this exclusion is applied before validity checks.
  8. **Lane binding mutation:** replacing the example lane's `state.contract_version` comparison with
     `state.policy_contract_version` fails legacy fixtures; replacing the active lane's
     `state.policy_contract_version` comparison with `state.contract_version` fails the valid durable
     fixture. Both mutants must be killed.
- **Implementation**: Add the `bug-fix`-only active-shard lane to `scripts/validate-contracts.mjs`, routing each discovered shard through `validateEnvelopeSchema` and its own `policy_contract_version` binding. Preserve the legacy lane's `contract_version` binding. Apply exact `archive/` and dot-prefix exclusions before any active-shard validity check.
- **Verification**: `node --test test/contracts.test.mjs`; `npm run validate:contracts`; `npm test`.
- **Rollback**: **Deactivate the lane only** — revert `scripts/validate-contracts.mjs`. Do **not** delete `scripts/backfill-task-state-v2.mjs`: the migrated shards depend on its `--rollback` path, and deleting it would strip the only reversal for Task 9a.

#### Task 10: Independent Code Review Record (QG-001)
- **Owner**: `qa-agent` — **sole owner.** The implementer (`developer-agent`) must not author or co-author this record; implementer-verifier separation is the point of the gate.
- **Prerequisite**: Tasks 1–5, F1–F5, 8a, 9a, 6, 7, 9b, 8b — the complete sequence in §4.0.
- **Files**: `docs/records/qa/2026-09-12-control-plane-state-integrity-code-review.md`.
- **Implementation**: Independently review every `.mjs` change against the SDD, re-deriving each claim rather than accepting the implementer's summary.
- **Verification**: `npm run validate:review-gate`.

---

## 5. Test Strategy

| Test Type | Required? | Scope | Owner |
|---|---|---|---|
| Unit | Yes | Hasher self-exclusion, actor guards, terminal/unknown source guards, CAS, atomic writer cleanup and zero-progress fault | `developer-agent` |
| Contract | Yes | Matrix ∩ policy guard including blocked resume; lane-specific legacy `contract_version` and durable `policy_contract_version` bindings with field-swap mutants; `bug-fix`-only enum; every discovered fixture green | `developer-agent` |
| Concurrency (barrier-synchronized) | Yes | Task-ID replacement; mutation-vs-archive; archive/recovery before/inside guard; stale compensation; journal phase crashes; archive-vs-projection convergence; commit-guard non-overlap; four-step wrong-unlock counterexamples for shard and projection through the injected adapter | `developer-agent` / `qa-agent` |
| Fault Injection | Yes | Write failure temp cleanup, zero-progress write, journal writes and every forward/compensation rename boundary, projection-repair failure, abandoned-lock refusal with byte-identical lock, empty/truncated/invalid/schema-invalid lock classification and recovery | `qa-agent` |
| Read-Only Assertion | Yes | Byte-equality of the whole fixture tree across `--check` and across both pure functions | `qa-agent` |
| Integration | Yes | Fail-closed projection, explicit reconcile idempotency, backfill idempotency and rollback, active-shard lane positive/negative over a fixture root | `qa-agent` |
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
| Shard backfill or terminal-hop failure (9a) | `node scripts/backfill-task-state-v2.mjs --rollback`, else restore backups and verify against recorded SHA-256; regenerate the projection | `developer-agent` |
| Archive step failure (9b) | Do not use manual unfenced `mv`. Resume the durable journal through fenced reconciliation. Stale generation/txid/path/digest refuses; whole-checkpoint rollback only before activation. | `developer-agent` / Human Maintainer |
| Active-shard lane rejects something unforeseen (8b) | Deactivate the lane only; keep the backfill tool | `developer-agent` |
| Abandoned lock in CI | `unlock` acquires the commit guard, durably increments generation, then removes admission. A stranded commit guard has no online recovery; stop all writers and restart the host/session before offline repair (SDD Component 4/4A) | Human Maintainer |

---

## 8. Risks / Blockers

| Risk / Blocker | Impact | Mitigation / Next Action |
|---|---|---|
| Abandoned admission lock blocks one work item | Medium | Fenced `unlock` increments generation under the commit guard before removal. False quiescence revokes old writers instead of permitting silent overwrite. |
| Abandoned projection admission lock blocks status updates | High | Fenced recovery is safe. An abandoned projection commit guard remains a deliberate fail-closed availability event requiring offline host/session restart recovery. |
| A live-but-slow holder is misread as abandoned | Medium | Abandonment is classified by **dead PID only**; age is a diagnostic tier (`LOCK_HELD_LONG`), never a classifier (SDD Component 4). Tested in Task 4 item 3. |
| Matrix and policy drift apart | High | Authority-rule parity test in Task 3 item 6: legality is the strict intersection, and matrix `requires` is proven never to be consulted at validation time. |
| Strict intersection empties a hop and severs a happy path | High | **Already occurred at `investigating -> implementing`.** Repaired by widening the matrix (SDD Component 2, SA ruling), and permanently guarded by Task 3 item 0, which enumerates every policy row of every in-scope workflow and fails the build on any empty intersection or missing matrix destination. |
| Strict intersection makes Human resume impossible | High | Add explicit `blocked -> investigating` and `blocked -> verifying` policy rows and bind `resume` to the latest interrupted state. Task 3 positive and negative full-path cases prevent a policy bypass. |
| Unfenced or stale archive/compensation rename | High | ADR-0032 archive journal; every rename validates generation, txid, identity/digest and paths inside task guard. Mutation operators remove each predicate. |
| Terminal migration illegal under current policy | High | Task 1's additive `handoff -> completed` amendment lands before Task 9a. |
| Active-shard validation lane breaks CI on pre-existing shards | Medium | **Resolved structurally, not mitigated.** The lane is Task 8b and lands only after Task 9b. Tasks 8a and 9a exist precisely to break the Round 4 cycle. |
| Task 6's `validate:status-projection` fails on unmigrated shards | High | Migration (9a) is ordered before Task 6 (§4.0). This is a defect the Round 5 review did not name; it is recorded here so the ordering is not "optimized" back. |
| Task 8b passes vacuously on an empty active-shard set | Medium | The lane is tested against a fixture root with positive and negative cases and a non-vacuity assertion (Task 8b items 1–7). |
| A global version-field change breaks legacy examples | High | Keep the two lane comparisons separate and require mutation tests that swap either lane's field. |
| `cancelled` is unreachable but present in the vocabulary | Low | Deliberate and stated (SDD Component 1). No wildcard row is invented, because the validator has no wildcard semantics. Task 3 item 5 is the regression guard. |

---

## 9. Handoff

| To | Reason | Required Evidence |
|---|---|---|
| Human Maintainer (gate) | Review the Round 7 blueprint after Security validates ADR-0032 and QA aligns deterministic barriers/mutants | Revised requirement, SDD, plan, QA plan, security review |
| Documentation Agent | Record ADR-0026..**ADR-0031** in `DECISIONS.md` — **six ADRs**; ADR-0031 (Package 1 scoped to `bug-fix`, single authority rule) is new in Round 5 | Approved SDD |
| QA Agent | Update dual-lane tests and field-swap mutants; positive and negative full-path blocked resume cases; transition/resume/archive identity mismatch and between-start/lock replacement barriers; exact `archive/` plus dot-entry enumeration; malformed-lock cases; and both four-step wrong-unlock counterexamples. Use OQ-2's resolved `createStateIo` adapter seam; do not introduce a production test-only hook. | Round 6 SDD, this plan |
| Code Review Gate | Review all production script modifications | Diff, unit tests, independently authored code review record |
| QA Verifier | Independent verification of AC-001..AC-010 and the deterministic invariants | Full test run, mutation evidence, gate passes |
| Security Reviewer | Validate ADR-0032: shared commit-guard serialization, durable monotonic generations, all crash/interleaving boundaries, and offline-only guard recovery. SEC-004 remains High/Open until that review passes. | Security review, SDD Component 4, requirements BR-003/R-006 |
| Human Maintainer (merge) | Final merge approval | Clean CI run, approved reviews, zero gate failures |

### 9.1 Round 6 SA dry-run against the repository

| Claim | Verdict |
|---|---|
| "Eleven existing example fixtures" is wrong; the repository contains ten | **Accurate.** `docs/contracts/examples/` holds ten `*.yaml` files plus the `dispatch-receipts/` subdirectory; an entry count returns eleven. Count removed, predicate stated (§3.1). |
| Engine initializes an empty-history shard at sequence 1 | **Accurate** — `scripts/lib/task-state-machine.mjs:192-203`. |
| Existing repository test expects sequence 2 / history length 1 after one transition | **Accurate** — `test/task-state-machine.test.mjs:117-125`. |
| Migrated shards require `sequence_number = history.length + 1` | **Accurate**; adopted as the rule (Task 8a). |
| `loadSchemas()` keeps durable envelopes out of the example lane | **Accurate** — `scripts/validate-contracts.mjs:31-47`. |
| The validator has no wildcard `from -> to` semantics | **Accurate** — exact `Map` lookup keyed `"${from} -> ${to}"`, `scripts/validate-contracts.mjs:116-147`. Correction 1 is resolved by adding **no** cancellation row at all. |
| Task 8/9 ordering is circular and the risk table contradicts the dependency | **Accurate**; resolved by the 8a → 9a → 6 → 7 → 9b → 8b sequence. |
| `archive-work-item.mjs` renames the entire shard directory | **Accurate** — `fs.renameSync(shardDir, targetShardDir)`, `scripts/archive-work-item.mjs:71`. |
| *(Not in the review)* `TRANSITION_MATRIX.investigating.destinations` omits `implementing`, which `bug-fix-workflow.yaml:7` requires | **Confirmed** — matrix at `scripts/lib/task-state-machine.mjs:49-53`. Strict intersection is empty at that hop. Resolved by SA ruling in favour of widening the matrix (Task 3), guarded by Task 3 item 0. Every other `bug-fix` policy destination is already in the matrix, so this is the sole gap. |
| *(Not in the review)* Task 6's `validate:status-projection` also cannot pass pre-migration | **New finding.** `discoverActiveShards()` reads the live shards (`scripts/compile-status-projection.mjs:32-61`) and both are `contract_version: 1` with no `policy_contract_version` and no `sequence_number`. The 8a/9/8b split alone does not fix this; migration is therefore ordered before Task 6 (§4.0). |
| Task 1 global field replacement against the legacy lane | **Rejected.** Each discovered YAML fixture exposes `contract_version` and no `policy_contract_version`; `undefined !== 1` would fail the lane. The plan retains that comparison and gives the active-envelope lane its own binding. |
| `blocked` under strict intersection | **Resolved.** Current transitions have no outgoing row, so the transition intersection is empty. A separate policy resume operation makes `blocked` recoverable while the latest-history-source constraint prevents a general bypass. |
| Pre-read/re-read identity race | **Resolved in contract.** `expectedTaskId` selects both active path and lock; the envelope is read and identity-checked only after acquisition. Mutation and archival stop before CAS/write/rename on mismatch. |
| Active-root enumeration | **Resolved in contract.** Both enumerators exclude exact reserved `archive/` and dot-prefixed entries before validation; no other skip is permitted. |

### 9.2 Round 6 dry-run traces

**Task 1, both validator lanes.** A read-only enumeration on 2026-09-12 found ten regular YAML
fixtures. Every fixture has `contract_version: 1`, none supplies `policy_contract_version`, and every
legacy comparison matches its policy v1. Substituting the proposed global comparison produces
`undefined !== 1` for every fixture. A constructed durable record with `contract_version: 2` and
`policy_contract_version: 1` passes the active-lane comparison and fails if that lane is mutated back to
the legacy field. This proves the two bindings must remain separate.

**Blocked resume trace.** For `investigating -> blocked`, the latest into-blocked history source is
`investigating`; the separate policy resume operation permits `investigating`. Human or
orchestrator plus both evidence keys succeeds. Target `verifying`, ordinary transition mode, an
unauthorized actor, or either missing key fails before write. The same trace holds symmetrically for
`verifying -> blocked -> verifying`. No other state can enter or leave `blocked` under the Package 1
policy, so the reachable graph has no non-terminal dead end.

**Identity-race trace.** Operation A is invoked with `expectedTaskId=A`; it derives A's active path and
waits for lock A. The test replaces that path's envelope with one declaring B before acquisition. After
A acquires lock A, its re-read observes B and raises `TASK_IDENTITY_MISMATCH` before CAS/write. A caller
for B derives B's own active path and cannot use lock B to mutate A's path. `archiveWorkItem(A)` follows
the same steps and stops before reconcile/rename/projection. Thus no two different lock identities can
authorize overlapping critical sections over one pathname.
