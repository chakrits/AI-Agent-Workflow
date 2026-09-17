# Issue #277 Package 1 — Independent Final Code Review

| Field | Value |
|---|---|
| Work item | Issue #277 — Control-plane state integrity, Package 1 |
| Candidate | `feat/control-plane-state-integrity` at `ff0aa37` (`5db4250` implementation) |
| Reviewer | Independent Code Review Gate (GPT-5.6 Luna) |
| Decision | **CHANGES_REQUESTED** |
| Rework ceiling | Cycle 3 already consumed; unresolved blocker routes to Human Maintainer |
| Scope | Final post-cycle-3 review; no production edits, push, PR or Issue mutation |

## Review basis

This review re-derived the changed archival paths against the approved requirements, SDD Component 8,
the cycle-3 SA addendum, ADR-0032, the QA blueprint and prior CR-001..CR-014. Source-level traces,
the named production-seam tests, and a runtime stale-generation probe were used. Test counts were
treated as evidence only, never as an acceptance criterion.

## Disposition of prior findings

- **CR-001:** Closed. Projection generation is compared inside the projection commit guard.
- **CR-002:** Closed for the reverse-rename safety barrier. Compensation requires the named phase,
  generation, journal tuple, digest/identity and archive-only path before rename.
- **CR-003:** Closed. CLI mutation routes through the guarded disk API with mandatory CAS.
- **CR-004:** Closed. Actor declarations canonicalize through `ROLE_REGISTRY`.
- **CR-005:** Closed. Malformed-lock recovery rereads and preserves a replacement valid lock.
- **CR-006:** Closed. The real issue-249/issue-275 migration is v1→v2, ordered before activation,
  and rollback evidence is retained.
- **CR-007:** Covered by the production-seam barriers and matrix/recovery tests; full mutation and
  crash evidence remains an independent QA responsibility.
- **CR-008:** Closed. Temp cleanup is ownership-aware and collision-safe.
- **CR-009:** Closed. Forward rename rechecks generation immediately before the rename inside the
  task guard; stale barrier observes zero forward renames.
- **CR-010:** Closed for task identity, current pointer and retained attempt binding used by the
  operation paths.
- **CR-011:** Closed. Activated v2 backfill refuses missing/corrupt fence generation.
- **CR-012:** Closed. Adoption validates physical cardinality and phase/location before equal no-op
  or greater-generation adoption; the 72-cell oracle has explicit expected outcomes.
- **CR-013:** Closed for restart recovery of `compensation_requested/R`, `compensation_requested/A`
  and `compensation_moved/A`, including guarded reverse/finalization paths.
- **CR-014:** Closed. Matching `terminal_compensated/A` starts a fresh transaction with new txid,
  intent and attempt; projection drift prevents append.

## Finding

### CR-015 — Major: stale compensation can persist a phase before the required generation guard

- **Source:** SDD Component 8 validation order and conditional advancement, lines 670–694; the
  cycle-3 implementation contract,
  `docs/records/implementation-plan/2026-09-12-control-plane-state-integrity-plan.md:407-419`.
- **Location:** `scripts/archive-work-item.mjs:279-283`, especially the `advancePhase(...,
  'compensation_requested', ...)` call at line 281 before `revalidateLocation()` at line 282.
- **Precondition/input:** Projection publication fails after `archive_moved/R`; before the
  compensator reacquires the task guard, another recovery operation advances the durable task
  generation. The old executor then reacquires the guard.
- **Inferred trace:** The old executor loads the current journal and persists
  `compensation_requested` through `advancePhase()` without reading/comparing the current
  generation. `revalidateLocation()` reads the generation only afterward and raises
  `ARCHIVE_EXECUTOR_STALE`, so the stale operation has already changed the journal.
- **Observed probe:** A disposable fixture with a malformed active shard forced projection failure;
  an injected generation bump on the second task-guard acquisition produced
  `ARCHIVE_EXECUTOR_STALE`, but the durable journal changed from revision 1 to revision 3 and its
  phase became `compensation_requested`. No reverse rename occurred.
- **Expected result:** SDD §8 step 8 requires the complete tuple, generation and physical predicate
  immediately before every phase advance; a mismatch returns `ARCHIVE_JOURNAL_CONFLICT` or
  `ARCHIVE_EXECUTOR_STALE` and mutates nothing. The stale compensator must therefore leave both
  shard and journal bytes unchanged. The fix should revalidate the current generation and exact
  expected tuple before persisting `compensation_requested`, with a regression barrier asserting
  journal byte/revision equality as well as zero rename.
- **Impact:** A stale executor can mutate the append-only recovery ledger after a fencing event. This
  violates the conditional-commit protocol and can leave a newer executor to recover a phase written
  by an obsolete attempt, weakening the fail-closed guarantee at the recovery serialization root.
- **Confidence:** High — direct source trace plus deterministic runtime probe; the probe exercised
  the production `archiveWorkItem()` and `createStateIo()` seams.
- **Next owner:** Human Maintainer, with SA/Developer. The rework ceiling is exhausted; do not start
  QA Full Mode until the maintainer resolves this finding and a new independent review passes.

## Verification run

- `node --test test/control-plane-state-integrity.test.mjs` — **PASS**, 16/16. Includes CR-001,
  CR-002, CR-004, CR-005, CR-006, CR-008..CR-014, the 72-cell adoption oracle and compensation
  barriers.
- `npm test` — **PASS**, 780/780.
- Repeated focused control-plane suite three times — **PASS**, 16/16 on each run.
- `npm run validate:contracts` — **PASS**.
- `npm run validate:project-state` — **PASS**.
- `npm run validate:review-gate` — **PASS**.
- `npm run validate:ci-parity` — **PASS**.
- `npm run validate:status-projection` — **PASS**.
- `npm run validate:workflow-evidence` — **PASS**.
- `npm run validate:risk-register` — **PASS**.
- `npm run validate:skill-usage` — **PASS**.
- `npm run validate:dispatch-receipts`, `validate:skill-parity`, `validate:adapter-parity`,
  `validate:edit-guards`, `validate:context-budget`, `validate:context-compatibility`,
  `validate:clearable-refs` and `validate:metrics` — **PASS** (edit-guards reported its normal
  invalid-hook-payload skip with exit 0).
- `npm run adr:audit` — **PASS**, 2.56:1.
- `git diff --check` — **PASS**.
- Mutation runner: no configured Stryker/mutmut executable is present in `node_modules`; named
  barriers and matrix tests are executable oracles, but mutation/crash campaign evidence is not
  independently available in this review.
- Worktree remained clean before this review-record update.

## Decision and routing

**CHANGES_REQUESTED.** CR-001..CR-014 are closed as listed above, but CR-015 is a new Major
finding against the approved zero-write conditional phase-advance contract. QA Full Mode and
Security runtime review must not start until Human Maintainer disposition and a subsequent
independent code review pass. This record does not claim SEC-004 runtime closure, QA approval,
Security approval or merge readiness.

## Handoff summary

CHANGES MADE:
- Updated this independent final review record with the post-cycle-3 verdict and CR-015 evidence.

NOTICED BUT NOT TOUCHING:
- `scripts/archive-work-item.mjs` production code remains unchanged under the independent-review
  boundary.
- The legacy v1 archive compatibility path remains preserved as required by the approved blueprint.
- Full mutation/crash campaign remains QA-owned.

NEXT OWNER:
- Human Maintainer for CR-015 and the exhausted rework ceiling.
