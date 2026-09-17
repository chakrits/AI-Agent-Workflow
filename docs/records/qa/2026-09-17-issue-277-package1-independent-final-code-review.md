# Issue #277 Package 1 — Independent Final Code Review

| Field | Value |
|---|---|
| Work item | Issue #277 — Control-plane state integrity, Package 1 |
| Candidate | `feat/control-plane-state-integrity` at `8713059` |
| Reviewer | Independent Code Review Gate (GPT-5.6 Luna) |
| Decision | CHANGES_REQUESTED |
| Rework ceiling | 2/2 consumed; unresolved Major findings route to Human Maintainer |
| Scope | Final re-review; no production edits, push, PR or Issue mutation |

## Review basis

This review re-derived the implementation against ADR-0032, the approved requirements,
SDD Components 4A, 6 and 8, the implementation plan, QA blueprint and CR-001..CR-012.
The source and the newly added barrier tests were inspected independently. Runtime probes
were used for the adoption oracle and the terminal recovery paths. Test counts were not
used as acceptance criteria.

## Disposition of prior findings

- **CR-001:** Closed. Projection generation is compared inside the projection guard.
- **CR-002:** Closed. Compensation checks phase, generation, digest and location before
  reverse rename; stale compensation barrier preserves the archive.
- **CR-003:** Closed. Unsupported CLI paths are rejected and mutation routes through the
  guarded disk API with mandatory CAS.
- **CR-004:** Closed. Actors are canonicalized against `ROLE_REGISTRY`.
- **CR-005:** Closed. Malformed-lock recovery rereads and returns `LOCK_BECAME_VALID`.
- **CR-006:** Closed for v1→v2 activation. The two real active shards are v2 with fence
  records and the active lane validates them.
- **CR-007:** Partially addressed by new seam tests; the remaining ledger/recovery gap is
  recorded as CR-012 below.
- **CR-008:** Closed. Temp cleanup only removes a file created by the current writer.
- **CR-009:** Closed. `archiveWorkItem()` rechecks generation immediately before the
  forward rename inside the task guard; the stale barrier observes zero rename calls.
- **CR-010:** Partially addressed. Task identity and latest transaction pointer are bound,
  but the recovery/phase issues below remain.
- **CR-011:** Closed. Activated v2 backfill reads existing fence state and fails closed
  when it is missing or malformed.

## Findings

### CR-012 — Major: the 72-cell adoption oracle and implementation accept ambiguous equal-generation paths

- **Source:** SDD Component 8 lines 670–675 and 703–735; implementation plan Task 7
  lines 398–406; QA TC-043..TC-049.
- **Location:** `scripts/archive-work-item.mjs:127-131`; `test/control-plane-state-integrity.test.mjs:173-184`.
- **Precondition/input:** An adoption request has equal current and attempt generations,
  but the physical paths are both present (`B`) or both absent (`N`), including terminal
  phases where the matrix requires an offline ambiguity result.
- **Inferred trace:** `adoptArchiveTransaction()` returns `{ adopted: false }` at line 130
  as soon as generations are equal, before calling `archiveLocation()` and before checking
  the phase/path cell. The supposed 72-cell test encodes `expected = null` for every
  equal-generation relation, including `B` and `N`, so those cells pass without asserting
  `ARCHIVE_LOCATION_AMBIGUOUS` or terminal mismatch.
- **Observed probe:** A digest-valid `prepared` journal with equal generation and both
  active and archive directories returned `{ adopted: false, generation: 1, ... }` and
  left the ambiguous state unreported.
- **Expected result:** Every matrix cell must validate journal phase, generation relation,
  and exact physical location under the task guard. Equal-generation `B`/`N` cells must
  fail closed; only valid single-path cells may return a no-op adoption result.
- **Impact:** An operator can receive a successful no-op for an ambiguous ledger/path state,
  while the required fail-closed recovery signal is suppressed. The test oracle also cannot
  kill a mutation that moves path validation after the equal-generation early return.
- **Confidence:** High — direct source trace and deterministic runtime probe.
- **Next owner:** Human Maintainer, with Developer/SA design decision; QA must repair and
  independently execute the complete matrix.

### CR-013 — Major: crash recovery has no executable path for compensation phases

- **Source:** SDD Component 8 lines 683–743; implementation plan Task 7 lines 400–405;
  QA TC-046/TC-047 and the crash-boundary requirements.
- **Location:** `scripts/archive-work-item.mjs:180-206`.
- **Precondition/input:** The process crashes after persisting `compensation_requested`
  before `archive → active`, or after the reverse rename before persisting/finalizing
  `compensation_moved`.
- **Inferred trace:** On restart, `archiveWorkItem()` permits only `prepared` and
  `archive_moved` at line 180; it rejects `compensation_requested` and
  `compensation_moved` with `ARCHIVE_JOURNAL_CONFLICT`. `adoptArchiveTransaction()` can
  append an attempt, but only updates the journal and never performs the compensating rename,
  fresh active projection, or terminal compensation finalization. The inline catch path at
  lines 200–204 handles only the original uninterrupted call.
- **Expected result:** The named single-path compensation cells must be idempotently
  resumable after restart: guarded reverse rename, projection publication, and
  `terminal_compensated` finalization, with `B`/`N` remaining offline-only.
- **Impact:** A crash at an explicitly required boundary strands the transaction in a
  non-terminal phase with no supported recovery operation. A successful archive operation
  cannot be reconstructed from the durable journal alone, so the claimed crash convergence
  and compensation safety are incomplete.
- **Confidence:** High — direct call-graph/source trace; no reconciler or phase handler exists.
- **Next owner:** Human Maintainer, with SA/Developer to specify and implement the recovery
  entry point before QA can certify the journal protocol.

### CR-014 — Major: `terminal_compensated` cannot start the required fresh archive transaction

- **Source:** SDD Component 8 lines 694–701 and recovery matrix lines 732–735; plan lines
  401 and 423.
- **Location:** `scripts/archive-work-item.mjs:178-179`.
- **Precondition/input:** A prior archive attempt completed compensation, leaving an
  active-only shard and a journal at `terminal_compensated`/`compensated`. A later caller
  invokes `archiveWorkItem()` after the projection is healthy.
- **Inferred trace:** The function immediately returns `{ archived: false, compensated: true }`
  for `terminal_compensated`; it never appends a new transaction with a fresh `txid`, checks
  active-only projection state, or retries archival.
- **Expected result:** When the current transaction is `terminal_compensated`, the active
  shard is exact and the projection matches, a new immutable transaction must be appended
  and the archive operation may be retried. The old transaction and intent remain retained.
- **Impact:** A transient projection failure permanently leaves a terminal task active and
  makes subsequent archive calls report compensation success instead of converging to
  `terminal_archived`.
- **Confidence:** High — explicit protocol requirement and direct branch trace.
- **Next owner:** Human Maintainer, with SA/Developer.

## Verification run

- `npm test` — PASS, 776/776.
- `node --test test/control-plane-state-integrity.test.mjs test/task-state-machine.test.mjs test/compile-status-projection.test.mjs test/status-loader.test.mjs` — PASS, 57/57.
- `npm run validate:contracts` — PASS; real active shards are v2 and strict validation executes.
- `npm run validate:project-state` — PASS.
- `npm run validate:review-gate` — PASS.
- `npm run validate:ci-parity` — PASS.
- `npm run validate:status-projection` — PASS.
- `npm run validate:workflow-evidence` — PASS.
- `npm run validate:risk-register` — PASS.
- `npm run validate:skill-usage` — PASS.
- `npm run adr:audit` — PASS, 2.56:1.
- `git diff --check 55bc342..8713059` — PASS.
- Worktree was clean before this documentation-only record was added.

## Decision and routing

**CHANGES_REQUESTED.** CR-001, CR-002, CR-003, CR-004, CR-005, CR-006, CR-008,
CR-009 and CR-011 are closed. CR-012 remains open, and CR-013/CR-014 are new Major
findings. The rework ceiling is exhausted, so these findings must route to the Human
Maintainer rather than trigger a third Developer rework cycle. QA Full Mode and Security
runtime review must not start until the Human Maintainer resolves the routing decision.

This review does not claim SEC-004 runtime closure, QA approval, Security approval or merge
readiness.

## Handoff summary

CHANGES MADE:
- Added this independent final review record only.

NEXT OWNER:
- Human Maintainer for CR-012..CR-014 and the exhausted rework ceiling.
