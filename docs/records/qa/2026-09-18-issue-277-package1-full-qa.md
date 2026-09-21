# Issue #277 Package 1 — QA Full Mode

| Field | Value |
|---|---|
| Work item | Issue #277 — Control-plane state integrity, Package 1 |
| Reviewed candidate | `dca2165` |
| Implementation | `a7702b2` |
| QA agent | QA Agent (GPT-5.6 Luna) |
| Date | 2026-09-18 |
| Verdict | **BLOCKED — FAIL** |

## Scope and method

This is an independent runtime QA pass against the approved requirements, SDD, QA plan and
the final code-review record. The review includes the CR-015 generation and journal-revision
barriers, the available control-plane regression tests, a direct policy-evidence probe, named
temporary source mutations, repository validators and final worktree verification. Test counts
are reported as execution evidence only; they are not an acceptance criterion.

## Results

| Area | Result | Evidence |
|---|---|---|
| CR-015 stale compensation generation barrier | PASS | `node --test --test-name-pattern='CR-015' test/control-plane-state-integrity.test.mjs` — 2/2; journal, archive shard and projection remain byte-identical; no reverse rename; admission lock and commit guard cleaned up. |
| CR-015 stale journal revision barrier | PASS | Same focused command — 2/2; `ARCHIVE_JOURNAL_CONFLICT`, no reverse rename or conditional phase persist. |
| Control-plane focused regression | PASS | `node --test test/control-plane-state-integrity.test.mjs` — 18/18; repeated three times, 18/18 each run. |
| Repository regression | PASS | `npm test` — 782/782. |
| Required validators | PASS | `validate:contracts`, `validate:ci-parity`, `validate:project-state`, `validate:review-gate`, `validate:status-projection`, `validate:workflow-evidence`, `validate:risk-register`, `validate:skill-usage`, `validate:dispatch-receipts`, `validate:skill-parity`, `validate:adapter-parity`, `validate:edit-guards`, `validate:context-budget`, `validate:context-compatibility`, `validate:clearable-refs`, `validate:metrics`, `adr:audit`, and `git diff --check`. |
| Mutation probe: remove `advancePhase()` generation recheck | KILLED | Temporary mutation of `scripts/archive-work-item.mjs` made CR-015 stale-compensation byte-identity test fail (17/18 passed, 1 failed). Source restored. |
| Mutation probe: remove `advancePhase()` journal-revision recheck | KILLED | Temporary mutation made CR-015 stale-revision test fail (17/18 passed, 1 failed). Source restored. |
| Stryker/mutmut campaign | BLOCKED | No Stryker/mutmut executable, dependency, configuration or runner is present. `npm exec --offline -- stryker --version` returned `ENOTCACHED`. |
| Full crash campaign | BLOCKED | No executable crash harness covers the required TC-040/TC-047 restart boundaries. Existing tests use in-process I/O barriers; actual process-kill/restart convergence was not established. |

## Blocking finding

### QA-277-001 — Major: durable mutation rejects the policy-authoritative evidence set

- **Source:** AC-004 and BR-001 in `docs/records/requirements/2026-09-12-control-plane-state-integrity-discovery.md`; TC-007 in `docs/records/qa/2026-09-12-issue-277-test-plan.md`.
- **Location:** `scripts/lib/task-state-machine.mjs:136-154`, especially line 154 calling `transitionTaskState()` after policy validation; `scripts/lib/task-state-machine.mjs:111-114` applies `TRANSITION_MATRIX.requires` in the pure helper.
- **Input:** A valid active v2 `bug-fix` shard at `intake`, actor `ba-agent`, correct `expected_digest`, and exactly the policy row's required evidence: `{ failure_description: "fd", repro: "rp" }`.
- **Observed result:** `mutateTaskStateOnDisk()` rejects with `MISSING_REQUIRED_EVIDENCE` for matrix-only keys `[requirement_discovery, issue_ref]`.
- **Expected result:** The transition succeeds because policy evidence is authoritative for the disk-bound workflow; the matrix `requires` field is an authoring aid and must not be consulted at validation time.
- **Impact:** A valid durable `bug-fix` transition is refused unless callers provide undocumented extra evidence. The canonical policy contract cannot be executed using its own evidence set.
- **Reproduction:** An isolated temporary root with a v2 shard and generation record was exercised directly with `node --input-type=module`; the result was `intake->investigating:MISSING_REQUIRED_EVIDENCE`.
- **Severity/confidence:** Major / High. The failure is deterministic and directly contradicts the approved AC and test case.
- **Next owner:** Developer Agent after SA/Human decision on the implementation seam. Further rework requires explicit Human authorization because the approved rework ceiling has already been exceeded.

## AC traceability

| AC | Status | QA basis |
|---|---|---|
| AC-001 | PASS | Active v2 envelope validation and status-projection/contract validators pass. |
| AC-002 | PASS | v1 backfill and unsupported durable workflow rejection tests pass. |
| AC-003 | PASS | Actor authorization regression remains green. |
| AC-004 | **FAIL** | QA-277-001: policy-only evidence is rejected by the durable mutation path. Resume/archive subpaths pass their available cases. |
| AC-005 | PARTIAL | Pure and CLI coverage is green; complete disk-bound transition/resume negative matrix was not independently present in the candidate tests. |
| AC-006 | PARTIAL | CR-015 and available stale-generation barriers pass; the complete false-quiescence and ordinary multi-process campaign was not executed. |
| AC-007 | PASS | Corrupt/digest-invalid projection behavior and validators pass in the available suites. |
| AC-008 | PARTIAL/BLOCKED | Available archive/adoption/compensation barriers pass, but the required complete crash and mutation campaign is unavailable and AC-004 blocks canonical transition flow. |
| AC-009 | PARTIAL | Pure matrix regression is green; complete durable terminal/unknown-source matrix evidence is not present in the candidate test file. |
| AC-010 | PASS | Read-only status-projection checks and validators pass. |
| AC-011 | PASS (available scope) | Explicit 72-cell phase/path/generation adoption oracle passes. |
| AC-012 | PASS (available scope) | Compensation restart and stale-recovery cases pass. |
| AC-013 | PASS (available scope) | Fresh terminal-compensation retry and projection-drift cases pass. |

## SEC-004 assessment

**Unable to verify / not runtime closed.** The CR-015 stale phase advancement barrier passes, but
the complete false-quiescence fencing campaign, crash/restart campaign and named mutation ledger
are not available in this candidate/environment. Security runtime review remains required.

## Required follow-up

1. Human Maintainer decides whether to authorize another Developer rework cycle for QA-277-001,
   after SA confirms the intended seam: disk-bound validation must use policy evidence while the
   pure helper retains its compatibility contract, or the approved contract must be amended.
2. Developer adds a regression test for TC-007 policy-only evidence and repairs the double
   validation path without weakening matrix actor/source legality.
3. QA reruns the full named mutation/crash campaign and records survivors explicitly. Install or
   provide a configured mutation runner, or add deterministic executable barriers for every named
   mutant.
4. Security Reviewer performs runtime SEC-004 verification after QA returns PASS.

## Handoff

**Next Action:** Human review

**Next Owner:** Human Maintainer

**Stop reason:** `human_review_required` — a deterministic Major functional failure remains, and
the prior Developer rework ceiling has been exceeded.

**No PR, push, merge, Issue mutation or production change was performed by QA.**
