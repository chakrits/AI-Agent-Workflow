# Debug Ledger — Issue #282 CI blocker

| Item | Detail |
|---|---|
| Work Item / Ticket | GitHub Issue #282 / PR #287 |
| Feature / Module | Approved handoff completion-contract vocabulary |
| Owner | Developer Agent |
| Started | 2026-09-28 |
| Current Status | Corrected locally; full verification pending |

## Symptom

| Field | Detail |
|---|---|
| Observed Failure | Three CI jobs failed on the same exact-list assertion in the handoff contract test. |
| Error / Log / Stack Trace | `test/validate-contracts.test.mjs:147`: `handoff contract pointer preserves the canonical 46-field vocabulary`; deep equality expected the old 46-field list. |
| Environment | GitHub CI, Node 22; also reproduced by the isolated local contract test before the expectation update. |
| Frequency | Deterministic; observed in Node 22 test and two validation jobs. |
| First Seen | PR #287 candidate `c46b340d3afc2631b79ade03592a59cbccc2d3cc`. |

## Repro

| Field | Detail |
|---|---|
| Repro Status | Deterministic |
| Steps | Run the contract test against the stale 46-field expectation. |
| Command / Test | `node --test test/validate-contracts.test.mjs` |
| Test Data | Canonical handoff contract and template with four approved completion-contract fields. |
| Expected | Exact canonical vocabulary contains 50 fields, including `Done when`, `May proceed through`, `Must stop for`, and `Assumptions`. |
| Actual | The test expected only the prior 46 fields and failed deep equality. |

## Fail Path

| Layer | Evidence |
|---|---|
| Entry point | `npm test` and CI validator jobs |
| Failing function / module | `test/validate-contracts.test.mjs`, exact handoff field vocabulary assertion |
| Relevant branch / condition | Deep equality assertion compares canonical extracted fields against a frozen expected array. |
| Relevant config / data | `docs/workflow/handoff-contract.md` and `docs/templates/HANDOFF.md` contain the four newly approved fields. |
| Last known good state | Prior contract with 46 fields and matching assertion. |
| First bad state | Approved Issue #282 contract change added four fields without updating the frozen test list. |

## Hypothesis Matrix

| ID | Hypothesis | Why plausible | Proof | Disproof | Experiment | Result | Status |
|---|---|---|---|---|---|---|---|
| H-001 | Frozen test expectation is stale | Failure names exact-list mismatch; approved contract adds four fields | Contract/template and policy tests require those four fields | None; observed canonical count is 50 | Inspect CI logs and rerun contract test after updating expected list | 108/108 contract tests pass; validator passes | Confirmed |
| H-002 | Node/runtime difference caused CI-only failure | CI has multiple runners and local environment may differ | None | Three separate CI jobs reported identical assertion; local isolated test passes after correcting expectation | Compare CI failures and local focused run | Same deterministic source-level mismatch | Ruled out |
| H-003 | Contract/template is missing required fields | Could cause divergence between test and policy | Four fields are present and policy assertions cover them | Current contract and template include all four values | Run `npm run validate:contracts` and focused test | Both pass after test-only expectation update | Ruled out |

## Experiment Ledger

| Run ID | Timestamp | Change / Command | Observation | Ruled In | Ruled Out | Next Action |
|---|---|---|---|---|---|---|
| RUN-001 | 2026-09-28 | Inspect CI logs for Node 22 suite and two validate jobs | All three failed at the same 46-field deep equality assertion; other checks passed | Stale expected vocabulary | Environment-specific hypothesis | Correct only the test vocabulary and rerun full suite |
| RUN-002 | 2026-09-28 | Update exact expected list to 50; `node --test test/validate-contracts.test.mjs` | 108/108 tests pass | Test expectation was the cause | Contract implementation defect | Run full suite |
| RUN-003 | 2026-09-28 | `npm run validate:contracts` | Passed | Contract and template remain internally consistent | Missing-field hypothesis | Push candidate and await fresh CI plus independent QA |

## Current Conclusion

- Confirmed root cause: exact expected field list did not include four fields added by the approved completion contract.
- Confidence: High.
- Remaining uncertainty: Full local suite, fresh CI, and independent QA have not yet verified the corrected candidate.

## Fix Direction

- Proposed fix: Update the test's canonical field list from 46 to 50 fields; do not alter the approved contract to satisfy the stale test.
- Why it addresses root cause: aligns the frozen assertion with the canonical contract/template and preserves the newly approved fields.
- Risks: Low; test-only expectation correction, with no production behavior change.
- Validation plan: run `npm test`, contract validator, relevant focused tests, `git diff --check`, then push and wait for CI and independent QA.
