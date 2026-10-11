# Test Report

## Metadata

- Work Item ID: Issue #297, slice S2 (AC-004 evidence reference grammar) plus S1 hardening F1/F2/F4
- Build/Version: branch `feat/issue-297-effective-agent-execution`, HEAD `8b63f9f`; S2 commits `f9a3917`, `bf76284`; base `20e7ae7`
- Environment: local, Node, macOS
- Tester / Agent: QA Agent (independent verifier)
- Date: 2026-10-12

## Scope

S2 only (S3-S6 out). All results re-derived by command; commit messages and the security review were not used as evidence.

## Test Summary

| Type | Total | Passed | Failed | Blocked | Notes |
|---|---:|---:|---:|---:|---|
| Unit | 799 | 799 | 0 | 0 | `npm test`; S2 files: 29 tests, 29 pass |
| API | 0 | 0 | 0 | 0 | N/A |
| E2E | 0 | 0 | 0 | 0 | N/A |
| Regression | 4 validators | 4 | 0 | 0 | contracts, project-state, ci-parity, full suite |

## PR/Issue Comment Summary

**Overall Status:** Pass

| Type | Total | Passed | Failed | Blocked |
|---|---:|---:|---:|---:|
| Unit | 799 | 799 | 0 | 0 |
| API | 0 | 0 | 0 | 0 |
| E2E | 0 | 0 | 0 | 0 |
| Regression | 4 | 4 | 0 | 0 |

**Defect Severity Summary:** Critical: 0 · High: 0 · Medium: 0 · Low: 2 · Informational: 2

**Tester's Note:** AC-004 (a)-(d) pass for S2. No defect blocks the slice. Three mutation survivors (M10, M11, M13); two are equivalent, one is a small test gap (Low).

## Checks

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | `npm test` | PASS | `# tests 799 / # pass 799 / # fail 0` |
| 2 | `node --test test/evidence-reference.test.mjs test/task-state-machine.test.mjs` | PASS | `# tests 29 / # pass 29 / # fail 0` |
| 3 | `validate:contracts`, `validate:project-state`, `validate:ci-parity` | PASS | "Contract validation passed." / "Project state validation passed." / "CI parity check PASSED" |
| 4 | Red at `20e7ae7` (temp worktree, only the 2 test files copied from `bf76284`) | PASS | `ERR_MODULE_NOT_FOUND` for `evidence-reference.mjs`; `not ok` F1 (requires array), `not ok` durable mutation (accepts `'rp'`), `not ok` `reference_evidence` missing; 22 pass, 4 fail. Note: F2 and F4 tests pass on old code (they pin existing behaviour; see Finding 3) |
| 5 | Green at `bf76284`/HEAD | PASS | checks 1-2 |
| 6 | Worktree removed | PASS | `git worktree list` has no scratchpad entry; `git status --short` is empty |
| 7 | Behavior matrix via real `mutateTaskStateOnDisk` in temp roots | PASS (with note) | below |
| 8 | Disk-only scope | PASS | `git diff` shows `transitionTaskState` untouched; test "reference grammar is not enforced by the pure API" passes; the second `::TC-007` test (`TC-007: durable policy evidence rejection preserves bytes...`) has no diff hunk |
| 9 | Compatibility (AC-004 c) | PASS | below |
| 10 | Assertion preservation | PASS | below |
| 11 | Mutation probes | PASS, 3 survivors | below |

### Behavior matrix (check 7)

Run through `mutateTaskStateOnDisk` in `os.tmpdir()` roots. Reject rows also showed `status REJECTED`, shard sha256 identical before and after, and `lock/guardLeft=false,false`. The matrix was run for `repro` (intake->investigating) and for `fail_path`+`hypothesis_matrix` (investigating->implementing).

| Input | repro | fail_path + hypothesis_matrix |
|---|---|---|
| `docs/note.md` | ACCEPT | ACCEPT |
| `https://example.com/x` | ACCEPT | ACCEPT |
| `issuecomment-7` | ACCEPT | ACCEPT |
| full GitHub comment URL | ACCEPT | ACCEPT |
| array of valid refs | ACCEPT | ACCEPT |
| prose `see above` | EVIDENCE_NOT_REFERENCE | EVIDENCE_NOT_REFERENCE |
| `'rp'` | EVIDENCE_NOT_REFERENCE | EVIDENCE_NOT_REFERENCE |
| `''` | MISSING_REQUIRED_EVIDENCE | MISSING_REQUIRED_EVIDENCE |
| `[]` | MISSING_REQUIRED_EVIDENCE | MISSING_REQUIRED_EVIDENCE |
| object | EVIDENCE_NOT_REFERENCE | EVIDENCE_NOT_REFERENCE |
| nested array | EVIDENCE_NOT_REFERENCE | EVIDENCE_NOT_REFERENCE |
| whitespace-padded | EVIDENCE_NOT_REFERENCE | EVIDENCE_NOT_REFERENCE |

Check order: `{ repro: 'rp' }` with `failure_description` absent returned `MISSING_REQUIRED_EVIDENCE` (key presence first, per plan 10a). Bytes unchanged.

Deviation from the dispatch expectation: empty string and empty array are rejected with `MISSING_REQUIRED_EVIDENCE`, not `EVIDENCE_NOT_REFERENCE`. Cause: key-presence (`hasMeaningfulValue`) runs first, as the plan requires, and treats empty values as absent. Rejection, byte preservation and cleanup all hold. The unit test for the pure parser asserts `EVIDENCE_NOT_REFERENCE` for these, which is correct at that layer.

### Compatibility (check 9)

- `git diff --name-only 20e7ae7..bf76284` lists only the YAML, the new module, `task-state-machine.mjs` and two test files. No fixture, example or archive file changed.
- `git diff 20e7ae7 --stat -- test/fixtures docs/contracts/examples docs/records/work-items` is empty. 3 examples, 14 invalid fixtures and 3 archived shards (issue-249, 275, 290) are untouched and `validate:contracts` passes.
- `contract_version: 1` in YAML (the only YAML change is one added line, `reference_evidence`); the new test asserts it.
- `grep` shows `parseEvidenceReference` and `reference_evidence` are used only in `task-state-machine.mjs` `validateReferenceEvidence`, called only from `validatePolicyTransition`. `validateActiveShards` and `validateHistory` do not run the reference check.

### Assertion preservation (check 10)

`git diff 20e7ae7..bf76284 -- test/` modifies existing tests in exactly two lines: `repro: 'rp'` to `'issuecomment-1'` in `TC-007` first test and in `I297-TC-003: pure and disk-bound transitions share YAML evidence`. Everything else is additions. No assertion was removed or loosened. The second edit goes beyond the literal wording of plan S2.5 (which names only `::TC-007`). Judgement: justified and acceptable. That test drives the disk path with `accepted`, which would now fail on `'rp'` by design, and its purpose (pure and disk accept the same YAML evidence and produce the same refs) is unchanged. Recommend the plan or handoff note it.

### AC-004

| Item | Result | Basis |
|---|---|---|
| (a) reference grammar, prose and `'rp'` rejected | PASS | checks 4, 7 |
| (b) single source / durable rejection with bytes preserved, guards released | PASS | check 7; F1/F2/F4 pins fail on mutation (below) |
| (c) compatibility: contract_version 1, examples, invalid fixtures, archives valid, historic validation unaffected | PASS | check 9 |
| (d) "no test seam" satisfied by a reference, no new key or flag | PASS | module header documents it; a path or comment reference is accepted; no new key besides `reference_evidence` |

### Mutation probes (scratch copy; originals restored, verified with `cmp`)

| ID | Mutant | Killed by |
|---|---|---|
| M1 | skip durable reference check | durable rejection test |
| M2 | accept object values | parser and durable tests |
| M3 | skip realpath containment | path containment test |
| M4 | drop empty-actors check | S1-F2 test |
| M5 | drop F1 `requires` check | S1-F1 test |
| M6 | swap check order | 3 tests including order test |
| M7 | skip `..` rejection | path containment test |
| M8 | add YAML `implementing->blocked` edge | S1-F4 edge pin |
| M9 | drop `hypothesis_matrix` from `reference_evidence` | durable test and policy test |
| M12 | skip `isFile` | path containment test |
| M14 | allow empty array | parser test |
| M10 | allow padded values (remove `value !== value.trim()`) | SURVIVED, equivalent: padded strings still fail the regexes, URL pattern or the file lookup |
| M13 | drop backslash rejection | SURVIVED, equivalent on POSIX (`docs\..\x.md` is simply a missing file); only matters on Windows |
| M11 | treat any `http*` prefix as a URL | SURVIVED, test gap (Low): a repo file whose name begins with `http` would be wrongly rejected, and no test pins it |

## Failed Tests / Defects

**Defect Severity Count:** Critical: 0 · High: 0 · Medium: 0 · Low: 2 · Informational: 2

| ID | Scenario | Expected | Actual | Severity | Evidence |
|---|---|---|---|---|---|
| F-1 | Mutant M11 survives | A test fails if URL detection widens to `http*` | No test fails; a file named like `http-notes.md` would be misclassified | Low | mutation run |
| F-2 | Durable `''`/`[]` return `MISSING_REQUIRED_EVIDENCE` | Dispatch expected `EVIDENCE_NOT_REFERENCE` | Plan 10a order (key presence first) makes this correct; rejection and cleanup hold. Plan or SDD wording could say so | Low | behavior matrix |
| F-3 | S1 F2 and F4 tests pass on `20e7ae7` | Red test fails on old code | They pin already-correct behaviour (M4 and M8 are killed, so they have value). Not a defect of the code | Informational | red run |
| F-4 | `TC-003` shared-evidence fixture changed (beyond S2.5 text) | Documented | Judged justified; no assertion weakened | Informational | test diff |

## Root Cause Analysis

No defect with a non-trivial root cause. F-1: the URL test uses only `http://`, which is also rejected by the stricter pattern, so the prefix change is unobserved.

## Coverage / Traceability

I297-TC-001 (reject prose, `'rp'`, objects, traversal, byte preservation): covered by `test/evidence-reference.test.mjs` and the durable test. I297-TC-002 (valid forms and arrays): covered. I297-TC-003 (additive policy key, pure/disk parity, `contract_version` 1): covered. NFR: Not validated (no S2 NFR targets; the check is offline and does no network access, which is tested).

## Open Questions

None blocking. Security Low findings 1-2 are accepted follow-ups and were not assessed here.

## Recommendation

Pass. S2 and the F1/F2/F4 hardening meet AC-004 (a)-(d). Cleanup done: worktree and scratch directories removed; repo has no changes other than this record.
