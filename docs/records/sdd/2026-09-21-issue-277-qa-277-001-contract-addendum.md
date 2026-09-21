# Issue #277 Package 1 — QA-277-001 SA Contract Addendum

| Field | Value |
|---|---|
| Work item | Issue #277 — Control-plane state integrity, Package 1 |
| Finding | QA-277-001 — durable mutation rejects policy-authoritative evidence |
| Change type | Architecture / contract clarification |
| Risk | High; security-sensitive durable state mutation |
| Authority | Requirements AC-004/BR-001, SDD Component 1, QA TC-007 |
| Reviewed candidate | `a32bbf6` |
| Human decision | Rework authorized; SA clarification approved on 2026-09-21 |
| Next owner | Developer Agent, then independent QA Full Mode |

## 1. Finding re-derived

The defect is deterministic at `a32bbf6`:

1. `mutateTaskStateOnDisk()` validates the workflow policy row at
   `scripts/lib/task-state-machine.mjs:136-140` and then calls the pure transition helper at
   `scripts/lib/task-state-machine.mjs:142-154`.
2. `makeTransition()` still validates `TRANSITION_MATRIX[from].requires` at
   `scripts/lib/task-state-machine.mjs:111-114`.
3. For `intake -> investigating`,
   `docs/contracts/bug-fix-workflow.yaml:6` requires `failure_description` and `repro`, while
   the matrix requires `requirement_discovery` and `issue_ref`.

The approved authority rule is explicit: the policy owns transition evidence, while legality is
the strict destination intersection. The SDD says the matrix `requires` field is a design-time
authoring aid and is never consulted at validation time (`docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md:206-213`).
The same rule is recorded as BR-001 and TC-007 expects the policy-only evidence set to succeed.
Therefore QA's observed `MISSING_REQUIRED_EVIDENCE` for the matrix-only keys is a Major contract
failure, not an ambiguous requirement.

## 2. Contract addendum: validation seam

The repository has two validation surfaces with different compatibility obligations:

| Surface | Authority and required checks | Evidence source |
|---|---|---|
| Pure `transitionTaskState()` / `resumeTaskState()` API | Preserve its existing compatibility behavior, including matrix actor/source/destination checks and its existing matrix evidence behavior for direct callers | Matrix behavior remains the default for this public pure API |
| Durable `mutateTaskStateOnDisk()` | Enforce the workflow policy row for transition/resume evidence, after matrix actor/source/destination legality and strict policy/matrix destination intersection have been established | Policy row only |

The durable caller must not satisfy a policy row by adding undocumented matrix keys. It must
validate the policy row once, then invoke the state-construction logic in an explicit durable mode
that skips only matrix evidence validation. The implementation may express this as a narrowly
scoped internal option or an internal policy-authoritative helper; the default pure API behavior
must remain unchanged. No unrelated refactor or policy amendment is authorized by this addendum.

For `intake -> investigating`, the required positive durable input is exactly the policy evidence
set `{ failure_description: "fd", repro: "rp" }` plus a valid actor and CAS digest. The operation
must reach `investigating` and write one valid successor envelope without requiring
`requirement_discovery` or `issue_ref`.

## 3. Invariants that remain mandatory

The seam changes evidence authority only. The following checks remain fail-closed and must run
before any durable write:

- `expectedTaskId` identity binding against the derived path and re-read envelope.
- Envelope schema and stored digest integrity.
- Mandatory `expected_digest` CAS verification.
- `TRANSITION_MATRIX[from].actors` authorization and actor canonicalization.
- Exact destination intersection: matrix destination **and** policy `(from, to)` must both exist.
- Policy-row evidence, including one-of requirements, retry budget, and terminal requirements.
- Separate policy-authoritative resume operation, latest blocked source binding, human approval,
  `approver_id`, and `resume_evidence`.
- Commit-guard generation re-read, stale-writer fencing, and atomic successor write.
- Byte identity of the shard on every rejected request; no journal, projection, lock, or unrelated
  file may be changed on validation failure.

The addendum does not authorize policy fallback, matrix-only transitions, actor bypass, CAS bypass,
resume bypass, or any weakening of CR-015 fencing.

## 4. Required regression evidence

Developer must add or update executable cases before QA reruns:

1. **TC-007 positive durable path:** construct an isolated active v2 `bug-fix` shard at `intake`,
   call `mutateTaskStateOnDisk()` as `ba-agent` with the correct digest and exactly
   `{ failure_description: "fd", repro: "rp" }`; assert success, destination `investigating`,
   incremented sequence/history, valid digest, and cleaned locks.
2. **TC-007 negative policy evidence:** remove either policy key; assert
   `MISSING_REQUIRED_EVIDENCE`, byte-identical shard, and no leaked lock/guard.
3. **Matrix-only evidence rejection:** provide `{ requirement_discovery: "rd", issue_ref: "N" }`
   without the policy keys; assert policy evidence failure. Matrix keys must never substitute for
   policy keys.
4. **Destination drift guard (TC-024 / BR-001):** enumerate every in-scope policy transition and
   assert its destination is present in the matrix destination set. Removing a destination must
   fail closed with `ILLEGAL_TRANSITION_REJECTED`.
5. **Evidence-authority mutation:** mutate only a matrix `requires` entry to a sentinel and rerun
   the durable TC-007 positive case; it must still pass. Mutating the policy `requires` entry must
   make the same case fail. This proves the durable path reads the policy row and not the matrix
   authoring aid.
6. Re-run the existing actor, CAS, resume, stale-generation, journal, projection, and byte-identity
   cases. The new seam must not weaken CR-001–CR-015 guarantees.

QA must independently rerun TC-007/TC-024 and the full named mutation/crash campaign. This
addendum does not waive the missing Stryker/mutmut runner or process-kill/restart evidence; SEC-004
 remains open until QA and Security review those runtime claims.

## 5. Decision and routing

No new ADR is required. ADR-0026 and ADR-0031 already establish the two-layer authority model and
the strict destination intersection. This record clarifies the implementation seam needed to make
the approved rule executable and does not introduce a new architectural choice.

**Next Action:** Dispatch

**Next Owner:** Developer Agent

**Developer handoff:** implement the minimal durable policy-evidence seam, add the regression cases
above, and preserve all listed invariants. After the Developer terminal handoff and independent
Code Review Gate, route to QA Full Mode. Security runtime review remains after QA PASS.

**Known limitations:** mutation runner availability and executable crash/restart coverage remain
environmental QA gates; they are not resolved by this contract clarification.

**Change summary for handoff**

CHANGES MADE:
- Added the QA-277-001 contract addendum and explicit pure/durable validation seam.
- Defined preserved invariants, exact regression cases, no-ADR determination, and Developer → QA route.

NOTICED BUT NOT TOUCHING:
- `scripts/lib/task-state-machine.mjs` — implementation is Developer-owned after this SA handoff.
- Stryker/mutmut and process-kill/restart harness — QA evidence gaps remain open.
- SEC-004 runtime closure — Security-owned after QA PASS.

CONCERNS:
- Any implementation that disables actor, destination, CAS, resume, fencing, or byte-identity
  checks fails this addendum even if TC-007 passes.
