# Test Report: Issue #297 Slice S1

## Metadata

- Work Item ID: Issue #297 (slice S1, AC-004)
- Build/Version: branch `feat/issue-297-effective-agent-execution`, S1 commit `39b158c`, base `affcac0`, HEAD `3fedc7a`
- Environment: local, darwin, node test runner
- Tester / Agent: QA Agent (independent; did not implement)
- Date: 2026-10-12

## Scope

Verify S1 (single Bug Fix policy source) against the plan section S1 and SDD section 2 (I297-TC-003 / TC-004). S2 (reference-form validation) is out of scope. The security review record was not used as evidence.

## Test Summary

| Type | Total | Passed | Failed | Blocked | Notes |
|---|---:|---:|---:|---:|---|
| Unit (npm test) | 787 | 787 | 0 | 0 | matches expected 787 |
| Unit (state-machine + integrity) | 36 | 36 | 0 | 0 | |
| Contract (validate-contracts.test) | 73 | 73 | 0 | 0 | |
| Regression (validators) | 3 | 3 | 0 | 0 | validate:contracts, validate:project-state, validate:ci-parity |

## PR/Issue Comment Summary

**Overall Status:** Pass (with findings; no blocking defect)

**Defect Severity Summary:** Critical: 0 · High: 0 · Medium: 1 · Low: 2 · Informational: 2

**Tester's Note:** AC-004 (a)-(d) pass. Mutation probes found 4 surviving mutants, 2 of which are real test gaps (see Findings). Human merge approval still required.

## AC-004 result

| AC | Result | Evidence |
|---|---|---|
| (a) YAML sole authority for destinations/actors/evidence | PASS | Diff: `TRANSITION_MATRIX` removed as hand-written table, now `deriveTransitionTable(BUG_FIX_POLICY)`; matrix `requires` and `validateMatrixEvidence` deleted. Test `TC-024b` (derived equals YAML) passes. Mutants dropping an actor, bumping version, and swallowing a malformed policy all fail tests. |
| (b) Pure and disk paths share evidence rules | PASS | Both call `validateEvidenceForRow`. Probe of 12 evidence variants for `intake -> investigating` on both paths: identical rejection codes (`MISSING_REQUIRED_EVIDENCE`) for 8 rejects; the 4 accepts were accepted by pure and passed the evidence stage on disk (my probe harness lacked a fence file so disk stopped later with `FENCE_STATE_MISSING`, after evidence validation). Whitespace-only `failure_description` is accepted by both (pre-existing `meaningful` semantics). |
| (c) Compatibility | PASS | `contract_version: 1` kept; `git diff` shows no change to `docs/contracts/examples`, validator or fixtures; `validate-contracts.test` 73/73; `validate:contracts` passed; archived shards issue-249, issue-275, issue-290 load via `loadTaskState` (state completed, policy_contract_version 1). |
| (d) Fail closed | PASS | `deriveTransitionTable` throws `POLICY_UNAVAILABLE` for undefined/null/string/empty/missing-actors policies (new test passes; swallow mutant M3 killed). Note module-load blast radius is by design (OQ-P3). |

## Method checks

| Check | Result | Evidence |
|---|---|---|
| Red on `affcac0` | PASS | In a temporary worktree at `affcac0` with the new test file copied: whole file first fails to load (`SyntaxError ... does not provide an export named 'deriveTransitionTable'`). With a one-line shim export (`export const deriveTransitionTable = undefined;`, deviation to let other tests run) 12 tests fail: the 4 new I297-TC-003 tests and TC-024b (missing function or old matrix keys), `::TC-007` (inverted first assertion), plus migrated TC-021..TC-025 and CR-004 (YAML keys rejected by old matrix). Worktree removed. |
| Green on `39b158c` | PASS | All results above. |
| Assertion preservation | PASS with notes | See table below. |
| Mutation probes | 9 mutants run; 5 killed, 4 survived | See below. |
| Equivalence | PASS | See AC-004 (b). |
| Cleanup | done | worktree removed and pruned, scratch copy deleted, `git status` clean apart from this record. |

### Assertion preservation

| Test | Change | Judgment |
|---|---|---|
| TC-021 | designing/planning steps removed; evidence keys migrated; sequence assertion kept | Within OQ-P1 |
| TC-022 | keys migrated; "alternative issue_ref" success replaced by both-keys success; throw check target changed designing to implementing | Within OQ-P1; the "either key" alternative semantic no longer exists by design |
| TC-023 | designing hops removed, resume target planning/designing to investigating; blocked evidence now `{stop_reason}` | Within OQ-P1; human-gate assertions (actor, approver, stop_reason null) intact |
| TC-024 | keys migrated; rework budget and blocked assertions intact | Preserved |
| TC-024b | replaced by derived-equals-YAML (partly tautological, see F1) | Human-approved |
| `::TC-007` first | inverted | Human-approved; second test and `repro: 'rp'` unchanged |
| TC-025, CLI, CR-004 | keys/states migrated, assertions equal | Preserved |

Beyond OQ-P1 (informational): the pure path now enforces evidence for transitions into `blocked` (previously skipped); this is consistent with the YAML and the disk path, and TC-023/TC-024 supply that evidence. Also the removed `implementing/rework/handoff -> blocked` and `blocked -> {intake, implementing, rework, handoff, completed}` edges are covered by confirmed OQ-P1, but no test asserts them rejected (only `designing` and `cancelled` are asserted).

### Mutation probes (scratch copy of `39b158c`)

| ID | Mutant | Result |
|---|---|---|
| M1 | change actor on `verifying -> handoff` row | SURVIVED (equivalent: actors are unioned per from-state and `rework` row has the same actor) |
| M1b | drop `ba-agent` from intake row | killed (TC-007, I297-TC-003) |
| M2 | remove shared evidence validation on pure path | killed (TC-022, I297-TC-003) |
| M3 | `deriveTransitionTable` swallows malformed policy | killed (fail-closed test) |
| M4 | allow empty `actors` array | SURVIVED (real gap, F2) |
| M5 | remove evidence check in `validatePolicyTransition` | SURVIVED (equivalent: `makeTransition` re-validates; defense in depth) |
| M6 | remove evidence validation on pure resume path | SURVIVED (real gap, F3; disk path still validates) |
| M7 | `contract_version: 2` | killed (13 tests) |
| M8 | add extra `handoff -> cancelled` YAML row | SURVIVED (by design YAML drives behavior; no test pins the exact edge set, F4) |
| M9 | unknown destination accepted | killed (module load fails) |

## Failed Tests / Defects

**Defect Severity Count:** Critical: 0 · High: 0 · Medium: 1 · Low: 2 · Informational: 2

| ID | Scenario | Expected | Actual | Severity | Evidence |
|---|---|---|---|---|---|
| F3 | Pure `resumeTaskState` missing `resume_evidence`/`approver_id` for a non-human-review block | A test rejects it | Mutant removing the pure-resume evidence call passes all tests | Medium | M6 |
| F2 | `actors: []` on a policy row | A test asserts `POLICY_UNAVAILABLE` | Empty-actors check removable without a failing test | Low | M4 |
| F4 | Exact YAML edge set | A test or contract pins the allowed edges (negative cases for removed matrix edges: only designing/cancelled asserted) | Added or removed edges not detected; TC-024b compares derived vs YAML, partly tautological | Low | M8 |
| F1 | `meaningful()` accepts whitespace-only evidence on both paths | n/a (pre-existing, not S1) | Accepted | Informational | probe |
| F5 | Plan expected about 786 pass; actual 787 | n/a | Exact count 787 matches Human expectation in task | Informational | npm test |

Routing: F2, F3, F4 go to Developer Agent (test effectiveness; I did not rewrite tests). No fix applied by QA.

## Root Cause Analysis

Not applicable (no functional defects).

## Open Questions

- Should F3 (pure resume evidence test) be added in S1 or deferred to S2 which touches the same sites? Owner: Developer Agent / Orchestrator.
- Disk-path equivalence was probed without a fence file; the existing I297-TC-003 test covers the full disk path for the intake edge only.

## Verdict

PASS for S1 (AC-004 a-d), with Medium/Low test-effectiveness findings recommended before Human merge. QA Evidence URL and checkbox ticks not performed (not requested).
