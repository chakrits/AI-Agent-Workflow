# Issue #277 Package 1 — Independent Engineering Code Review

| Field | Value |
|---|---|
| Work item | Issue #277 — Control-plane state integrity, Package 1 |
| Candidate | `feat/control-plane-state-integrity` at `74ef748` |
| Reviewer | Independent Code Review Gate (GPT-5.6 Luna) |
| Decision | CHANGES_REQUESTED |
| Scope | Developer implementation after blueprint `5e5ef4f`; no production edits |
| Required next stage | Developer rework, then independent QA Full Mode and Security runtime review |

## Review basis

This review re-derived the implementation against ADR-0032, the approved requirements,
SDD Components 2–9, the implementation plan, QA cases TC-001..TC-049, and the Security
blueprint. The review treats the named barrier and mutation cases as required evidence;
the existing test count is not used as an acceptance criterion.

## Findings

### CR-001 — Major: projection publication has no inside-guard generation comparison

- **Source:** SDD Component 4A lines 507–508; Component 7 lines 606–610; plan lines 104–106; AC-006/AC-008 and TC-014b/TC-042.
- **Location:** `scripts/compile-status-projection.mjs:72-92`.
- **Precondition/input:** A projection compiler acquires the admission lock, compiles a candidate, and reaches `readGeneration()` before the projection commit guard. Recovery then increments the durable projection generation before the compiler acquires its guard.
- **Inferred trace result:** The value returned by `readGeneration()` at line 80 is discarded. After `acquireCommitGuard()` succeeds, the code never compares the pre-guard generation with the current generation. It therefore atomically writes the stale candidate at line 92 and returns success.
- **Observed probe:** An injected `openSync` hook bumped `.fencing/projection/projection.json` from generation 1 to 2 immediately before projection guard creation; `updateProjectStatusFile()` still returned `{updated: true}` and wrote the candidate.
- **Expected result:** The candidate must fail with `FENCING_TOKEN_STALE` inside the projection guard before `atomicWriteFileSync`, or recovery must linearize after an already-held guard.
- **Impact:** A pre-recovery compiler can publish stale `PROJECT_STATUS.md` after recovery, recreating the SEC-004 projection counterexample.
- **Confidence:** High — direct source trace plus deterministic runtime probe.
- **Next owner:** Developer Agent.

### CR-002 — Critical: compensation rename is not fenced or conditionally revalidated

- **Source:** SDD Component 8 lines 683–692; Component 4A lines 510–511; plan TC-019/TC-044/TC-046 and AC-008.
- **Location:** `scripts/archive-work-item.mjs:163-168`.
- **Precondition/input:** Projection publication fails after the forward archive rename; the compensation path reacquires the task guard after the task generation may have advanced or the journal may have been changed by another executor.
- **Inferred trace result:** The code writes `compensation_requested` and immediately calls `renameSync(archive, active)` without checking current generation against the attempt, the exact journal tuple/revision/attempt, immutable intent/digest, or archive-only path under the newly acquired guard. It then writes `compensation_moved` without a conditional expected-state check.
- **Expected result:** Only an auto-resumable `compensation_requested/R` cell with matching generation, attempt, journal tuple, identity, digest and exact path may rename; a stale executor must perform zero rename and return the named stale/conflict error.
- **Impact:** A stale compensator can restore an archive after recovery or a newer executor has advanced the task, violating the fencing invariant and allowing projection/state divergence.
- **Confidence:** High — the missing predicates are explicit in the SDD and absent from the executed branch.
- **Next owner:** Developer Agent, with Security Reviewer re-check after rework.

### CR-003 — Major: mandatory CAS and policy intersection are bypassed by pure-file CLI fallback

- **Source:** SDD Component 1 lines 206–213; Component 9 lines 418–427; plan lines 284 and 308–310; AC-004/AC-005.
- **Location:** `scripts/lib/task-state-machine.mjs:57-60,75-77,116-117`; `scripts/task-machine-cli.mjs:135-138,173-176`.
- **Precondition/input:** A caller supplies a task-state file outside the exact `docs/records/work-items/{task_id}/task-state.json` shape, or calls the exported pure transition helper directly without `expected_digest`.
- **Inferred trace result:** `verifyCasAndComputeDigest()` accepts `undefined`, `transitionTaskState()` invokes it only when `expected_digest !== undefined`, and the CLI falls back to direct load/transition/write when `workItemContext()` returns null. That path does not require an expected digest, does not validate the durable envelope, does not apply the policy transition intersection, and does not use the fenced mutation wrapper. The same fallback exists for `resume`.
- **Expected result:** Every mutating transition/resume surface must require expected digest and route through the disk-bound fenced operation, or explicitly reject unsupported paths. Ordinary transition must not consume policy-silent resume behavior.
- **Impact:** A caller can bypass CAS, actor/policy enforcement and generation fencing by choosing a file path that misses the context parser; this undermines AC-004/AC-005 and the fail-closed contract.
- **Confidence:** High — direct branch trace; existing CLI test exercises the fallback and omits the digest on the blocked transition.
- **Next owner:** Developer Agent; SA Agent if the supported CLI path contract needs clarification.

### CR-004 — Major: actor canonicalization required by the security contract is absent

- **Source:** Security Review lines 51–54; SDD Component 2 lines 195 and 303–306; mutation ledger actor-canonicalization mutant; AC-003.
- **Location:** `scripts/lib/task-state-machine.mjs:15,87`.
- **Precondition/input:** An actor is supplied in a non-canonical form such as `QA-AGENT`, or an undeclared caller string is supplied to a transition.
- **Inferred trace result:** The implementation tests the raw actor string with `matrixEntry.actors.includes(actor)` and never normalizes or verifies it against `ROLE_REGISTRY`. Canonical forms are accepted/rejected only by exact spelling; the documented canonicalization control is absent.
- **Expected result:** Normalize the declared role to the canonical lowercase kebab-case form and reject values outside `ROLE_REGISTRY` with the specified fail-closed authorization result, before applying the transition.
- **Impact:** Role identity handling drifts from the approved security contract and the named mutation case cannot prove the intended boundary.
- **Confidence:** High — direct source inspection.
- **Next owner:** Developer Agent; Security Reviewer to verify the residual caller-declared identity boundary remains documented.

### CR-005 — Major: malformed-lock recovery does not perform the required immediate re-read

- **Source:** Plan lines 278–282; QA TC-038; Security finding SEC-007; SDD Component 4 recovery protocol.
- **Location:** `scripts/lib/task-state-machine.mjs:158-166`.
- **Precondition/input:** `unlock --malformed --quiesced` observes malformed admission-lock bytes; before unlink, another process replaces them with a valid lock record.
- **Inferred trace result:** The code parses once, acquires the commit guard, increments generation, and calls `unlinkSync(target)` without re-reading and validating the current lock bytes. It has no `LOCK_BECAME_VALID` branch.
- **Expected result:** Re-read immediately before unlink; if the record became valid, fail closed with `LOCK_BECAME_VALID` and preserve the replacement lock.
- **Impact:** Maintenance recovery can remove a valid replacement admission lock after an originally malformed observation, violating the explicit recovery contract and making the operation unsafe under a race.
- **Confidence:** High — direct source inspection.
- **Next owner:** Developer Agent, then Security Reviewer.

### CR-006 — Major: Package 1 is not activated and operational migration/strict-lane evidence is missing

- **Source:** SDD Component 6 lines 582–593; implementation plan ordering lines 146–155; AC-002/AC-007/AC-008 and TC-029/TC-032.
- **Location:** `scripts/validate-contracts.mjs:276-287`; `scripts/compile-status-projection.mjs:16-34`; active shards `docs/records/work-items/issue-249/task-state.json` and `issue-275/task-state.json`.
- **Precondition/input:** Run the candidate's required repository checks with the real active work-item tree.
- **Observed result:** Both active shards remain v1. `validate-contracts` enables the active durable lane only when every discovered shard has `contract_version === 2`, so the active validation is skipped. `discoverActiveShards()` also accepts v1 shards through the compatibility branch. The candidate contains no backfill/terminal-hop changes to the real shards.
- **Expected result:** The plan requires backfill and terminal migration before Component 6/8b strict active enforcement, with real migration evidence and rollback rehearsal before declaring implementation complete.
- **Impact:** The new fail-closed envelope/projection/archival path is not exercised by the repository's active lane; checks can pass while the deployed state remains on the legacy path.
- **Confidence:** High — direct command output and repository state.
- **Next owner:** Developer Agent + Documentation Agent for the ordered migration record; Orchestrator must not advance to QA acceptance until the activation decision is explicit.

### CR-007 — Major: required implementation tests and mutation evidence are absent

- **Source:** Implementation plan Task F1–F5 and QA plan TC-001..TC-049; QG-003/QG-004.
- **Location:** `test/task-state-machine.test.mjs`, `test/compile-status-projection.test.mjs`; `git diff --name-status 5e5ef4f..74ef748`.
- **Precondition/input:** Evaluate the candidate's changed-file set and focused test execution.
- **Observed result:** No test file is added or modified by the Developer commits. The focused suite runs only 18 legacy tests; it contains no `createStateIo` barrier cases, no durable-generation/recovery tests, no projection-fence assertion, no archive journal phase/path/generation matrix, no malformed-lock re-read assertion, and no mutation ledger execution. The full suite passes because these new paths are not exercised.
- **Expected result:** Add independent-executable tests for the approved named barriers and mutations, prove each barrier was crossed, and record survivors honestly. Numeric test count is not the criterion; the issue is the missing behavioral evidence at every new seam.
- **Impact:** The two highest-risk regressions (stale projection publication and unfenced compensation) pass the current suite undetected, so QA cannot certify SEC-004 runtime closure.
- **Confidence:** High — exact changed-file set and focused test output.
- **Next owner:** Developer Agent for implementation tests; independent QA Agent for mutation verification.

### CR-008 — Minor: temporary-file collision cleanup can unlink another writer's temp file

- **Source:** SDD Component 5 lines 521–568; plan Task 5 lines 325–331.
- **Location:** `scripts/lib/fenced-commit.mjs:47-67`.
- **Precondition/input:** `openSync(tmpPath, 'wx')` returns `EEXIST` because a different writer already owns the generated temp pathname.
- **Inferred trace result:** The catch block unconditionally calls `unlinkSync(tmpPath)` even though this invocation did not create the file.
- **Expected result:** Cleanup must unlink only a temp file successfully created by this invocation; a collision should fail or retry with a new unique name while preserving the other writer's temp file.
- **Impact:** A low-probability or injected collision can delete another writer's in-progress recovery artifact.
- **Confidence:** Medium — depends on pathname collision, but the branch is directly reachable with the injected adapter required by the design.
- **Next owner:** Developer Agent.

## Verification run

- `npm test` — PASS, 764 tests. This is insufficient evidence for the new protocol because the required implementation tests are absent.
- `node --test test/task-state-machine.test.mjs test/compile-status-projection.test.mjs` — PASS, 18 tests; legacy coverage only.
- `npm run validate:contracts` — PASS, with active v2 lane skipped because real shards remain v1.
- `npm run validate:project-state` — PASS.
- `npm run validate:review-gate` — PASS, because a Developer-authored review record exists; this review is the independent gate result.
- `npm run validate:ci-parity` — PASS.
- `npm run validate:status-projection` — PASS.
- `npm run validate:workflow-evidence` — PASS.
- `npm run validate:risk-register` — PASS.
- `npm run validate:skill-usage` — PASS.
- `npm run adr:audit` — PASS.
- `git diff --check 5e5ef4f..74ef748` — PASS.

## Decision and routing

**CHANGES_REQUESTED.** The candidate must return to Developer Agent for CR-001, CR-002,
CR-003, CR-005, CR-006 and CR-007. CR-004 must be corrected by Developer and rechecked by
Security. CR-008 should be corrected in the same implementation pass because the required
I/O injection makes the collision branch deterministic. After rework, independent QA Full
Mode must execute the named barrier/mutation cases; Security then re-verifies SEC-004.

This review does not claim SEC-004 runtime closure, QA approval, Security approval, or merge
readiness. No production code was modified by this review.

## Handoff summary

CHANGES MADE:
- Added this independent review record only.

NOTICED BUT NOT TOUCHING:
- Production code in `scripts/lib/` and `scripts/*.mjs` remains Developer-owned.
- Existing legacy test files remain unchanged; expanding them belongs to the Developer/QA implementation loop.
- Real active-shard migration remains pending and must follow the approved ordering.

CONCERNS:
- The Developer-authored review record at `docs/records/qa/2026-09-17-issue-277-package1-code-review.md` says READY_FOR_INDEPENDENT_VERIFICATION but does not contain evidence for the named new protocol barriers. It must not be used as independent QA approval.
