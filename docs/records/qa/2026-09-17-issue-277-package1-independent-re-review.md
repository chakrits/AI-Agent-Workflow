# Issue #277 Package 1 — Independent Engineering Re-review

| Field | Value |
|---|---|
| Work item | Issue #277 — Control-plane state integrity, Package 1 |
| Candidate | `feat/control-plane-state-integrity` at `3735102` |
| Reviewer | Independent Code Review Gate (GPT-5.6 Luna) |
| Decision | CHANGES_REQUESTED |
| Scope | Re-review of Developer rework cycle 1; no production edits |
| Required next stage | Developer correction, then independent Code Review, QA Full Mode and Security runtime review |

## Review basis

This re-review re-derived the changed production paths against ADR-0032, the approved
requirements, SDD Components 4A, 6 and 8, the implementation plan, the QA blueprint and
the prior findings CR-001..CR-008. The existing test count was not used as an acceptance
criterion. Runtime probes were used to verify the two archive findings below.

## Findings

### CR-009 — Major: forward archive rename is not fenced immediately before the rename

- **Source:** SDD Component 8 lines 677–681 and 694–701; QG-002; QA TC-043 and the
  `Generation check outside guard` mutation in the plan.
- **Location:** `scripts/archive-work-item.mjs:140-159`.
- **Precondition/input:** An archiver reads generation `1`, then waits before acquiring its
  task commit guard. Admission recovery advances the durable generation to `2` while the
  archiver is waiting.
- **Inferred trace:** `generation` is captured before `acquireCommitGuard()` at line 140.
  After the guard is acquired, line 147 compares that stale local value with the attempt,
  but the code never rereads the current generation inside the guard. The active-to-archive
  `renameSync` at line 157 can therefore run. The later finalization check at line 170 sees
  generation `2` and throws `ARCHIVE_EXECUTOR_STALE`, but the forbidden rename has already
  happened.
- **Observed probe:** An injected `openSync` barrier bumped the task generation from `1` to
  `2` as the first task guard was opened. `archiveWorkItem()` returned
  `ARCHIVE_EXECUTOR_STALE` while `active` was absent and `archive` existed.
- **Expected result:** Re-read and compare the current generation, journal attempt and
  physical path/digest under the task guard immediately before active-to-archive rename;
  a stale executor must perform zero rename operations.
- **Impact:** A revoked old-generation archiver can still linearize a filesystem move,
  violating the central fencing invariant and potentially leaving projection/journal state
  divergent.
- **Confidence:** High — direct source trace plus deterministic runtime probe.
- **Next owner:** Developer Agent; Security Reviewer must recheck the forward archive barrier.

### CR-010 — Major: archive journal intent is not bound to the requested task identity

- **Source:** SDD Component 8 lines 670–675 and 694–701; BR-003 and R-010 require journal
  identity, task ID and path identity to agree before a rename.
- **Location:** `scripts/archive-work-item.mjs:55-76,110-120,140-170`.
- **Precondition/input:** The journal at `.archive-transactions/{task_id}.json` has a
  syntactically valid, self-consistent digest but its immutable `intent.task_id` differs
  from the `issueId` passed to `archiveWorkItem()` or `adoptArchiveTransaction()`.
- **Inferred trace:** `loadJournal()` validates only that `intent.task_id` matches the ID
  pattern. The archive and adoption paths validate the shard's `state.task_id` and source
  digest, but never require `tx.intent.task_id === taskId` (or bind
  `intent.source_generation` to the retained attempt). A valid journal with a mismatched
  intent is therefore accepted and can drive the requested task's forward archive and
  terminal journal phase.
- **Observed probe:** A valid v1 journal for requested task `target`, with
  `intent.task_id: "other-task"` and the target shard's correct digest, returned
  `archived: true` and moved the target shard to `archive/target`.
- **Expected result:** Every journal load used for a task operation must enforce the full
  identity tuple, including requested task ID, transaction ID/current pointer,
  source-generation/attempt binding, shard identity/digest and exact path cardinality,
  before any journal advancement or rename.
- **Impact:** Immutable intent is not actually bound to the operation that consumes it;
  a copied or otherwise malformed ledger can authorize a transaction under the wrong task
  identity instead of failing closed.
- **Confidence:** High — direct source trace plus deterministic runtime probe.
- **Next owner:** Developer Agent, then Security Reviewer.

### CR-011 — Major: v2 backfill can recreate generation 1 after the fence record is missing

- **Source:** ADR-0032 generation lifecycle; SDD Component 4A lines 439–443 and 753–755;
  QA TC-048 and the plan's `no reset/reuse` mutation.
- **Location:** `scripts/backfill-task-state-v2.mjs:27-29`.
- **Precondition/input:** A v2 active shard is already in use but its fence record is
  missing or was removed during an incomplete repair.
- **Inferred trace:** The idempotent v2 branch calls
  `initializeGeneration(..., { allowExisting: true })`. That API creates a new
  `{generation: 1}` record for an existing shard. There is no activation marker or
  rejection path distinguishing a pre-activation v2 conversion from post-activation
  recovery.
- **Observed probe:** Calling `backfillTaskStateV2()` on an existing v2 shard with no
  fence file returned `changed: false` and created
  `.fencing/tasks/{id}.json` with generation `1`.
- **Expected result:** Once a v2 shard exists, a missing fence record must fail closed with
  `FENCE_STATE_MISSING`; only the explicitly pre-activation v1 migration path may create
  the initial generation, and it must not be usable as a reset/recovery command.
- **Impact:** Re-running the migration tool can reset the fencing epoch and reopen ABA/stale
  writer risk after a fence-file loss.
- **Confidence:** High — direct source trace plus deterministic runtime probe.
- **Next owner:** Developer Agent; SA Agent if activation-state representation needs amendment.

### CR-012 — Major: the rework tests still do not exercise the forward archive barrier or ledger matrix

- **Source:** Implementation plan Task 7 lines 398–406; QA TC-043..TC-049; QG-002/QG-003.
- **Location:** `test/control-plane-state-integrity.test.mjs:14-89`.
- **Observed result:** The six new tests cover projection fencing, actor normalization,
  malformed-lock replacement, one backfill fixture, temp collision and stale compensation.
  They do not cover a stale forward archive executor, journal intent identity, journal
  revision/txid/attempt predicates, successful archive finalization, adoption, the
  compensation crash boundaries, or the required phase × `{A,R,B,N}` × generation matrix.
  The existing archive tests in `test/compile-status-projection.test.mjs` use legacy v1
  fixtures and exercise the compatibility rename branch rather than the v2 journal path.
- **Expected result:** Add non-vacuous production-seam tests that cross every archive
  linearization barrier and kill the named forward/ledger mutants. QA must independently
  rerun the complete mutation/barrier matrix; passing `npm test` alone is not evidence.
- **Impact:** CR-009 and CR-010 regressions pass the candidate's focused and full suites,
  so the highest-risk archive controls remain unverified before QA handoff.
- **Confidence:** High — exact changed test files and direct test-path inspection.
- **Next owner:** Developer Agent for implementation-seam coverage; independent QA Agent for
  full mutation verification.

## Verification run

- `npm test` — PASS, 770/770.
- `node --test test/control-plane-state-integrity.test.mjs test/task-state-machine.test.mjs test/compile-status-projection.test.mjs test/status-loader.test.mjs` — PASS, 51/51.
- `npm run validate:contracts` — PASS; current real active shards are v2 and the active lane validates them.
- `npm run validate:project-state` — PASS.
- `npm run validate:review-gate` — PASS.
- `npm run validate:ci-parity` — PASS.
- `npm run validate:status-projection` — PASS.
- `npm run validate:workflow-evidence` — PASS.
- `npm run validate:risk-register` — PASS.
- `npm run validate:skill-usage` — PASS.
- `npm run adr:audit` — PASS, 2.56:1.
- `git diff --check 74ef748..3735102` — PASS.
- Worktree was clean before this documentation-only record was added.

## Decision and routing

**CHANGES_REQUESTED.** CR-001, CR-003, CR-004, CR-005, CR-008 and CR-006 are fixed in
the candidate's source and targeted tests. CR-009 through CR-012 remain actionable and
must be corrected or explicitly resolved by the Developer/SA before QA Full Mode. This
review does not claim SEC-004 runtime closure, QA approval, Security approval or merge
readiness.

## Handoff summary

CHANGES MADE:
- Added this independent re-review record only.

NOTICED BUT NOT TOUCHING:
- Production code remains Developer-owned.
- The live v2 shards and generated projection were not modified by this review.

NEXT OWNER:
- Developer Agent for CR-009..CR-012, then Independent Code Review Gate.
