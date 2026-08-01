# Fresh QA — Issue #133 Supported Runtime Closure

## Metadata

| Item | Evidence |
|---|---|
| Work item / change request | Issue #133 / Draft PR #135 |
| QA scope | Bounded ADR-0018 foundation plus the accepted runtime gate; not whole-Issue completion |
| Exact QA tip | `2ccd6f3c1fe979911dc114b1b19523b3fdd3c652` |
| Implementation reviewed | `2ef863a34ca03881dbfd90d2abd52d6a286c9994` |
| Environment | macOS arm64, Node `v22.22.3`, npm `10.9.8`, Python `3.14.4` compatibility run |
| Skills | `functional-test-design` (Focused Mode), `test-quality-discipline`, `verification-before-completion` |
| Verdict | **PASS — supported-runtime limitation closed for this bounded increment** |

Windows is explicitly unsupported/deferred and N/A by Human Maintainer decision. This verdict does not certify Windows, complete Issue #133, or authorize B-03/B-04/B-06–B-08, writer/projection activation, authority switch, rollback, release, or Go.

## Independent evidence

| Check | Result |
|---|---|
| `node --test test/status-loader.test.mjs test/status-runtime-matrix.test.mjs` | PASS — 31/31 |
| `npm test` | PASS — 348/348 |
| `python3 -m unittest discover -s test -p 'test_status_jcs_reference.py' -v` | PASS — 7/7 on Python 3.14 compatibility host |
| `python3 scripts/verify_status_jcs.py` | PASS — 7 frozen vectors |
| Required repository validators | PASS — contracts, project-state, dispatch receipts, review gate, skill usage/parity, risk register, metrics, context budget, ADR audit |
| Hosted Node 22 Ubuntu | PASS at exact `2ccd6f3`; run `30709979604`, job `91395604133`; focused status tests and full suite completed |
| Hosted Python 3.12 Ubuntu | PASS at exact `2ccd6f3`; run `30709979604`, job `91395604103`; unittest and fixed-vector verifier completed |
| Scope diff / whitespace | PASS — runtime-gate implementation changes four authorized files; `git diff --check` clean |
| Independent review / security | PASS — code-review record at `2ccd6f3`; prior exact loader/runtime security records `69afa7e` and `85f0d0d`; no security-sensitive behavior changed by `2ef863a` |

The hosted evidence was inspected through GitHub rather than copied from the Developer report. The run conclusion is `success`, its `headSha` is exactly `2ccd6f3`, and both named Ubuntu jobs completed successfully.

## Acceptance traceability

Issue #133 currently contains **13** criteria (AC-133-01 through AC-133-13), not 12. This matrix distinguishes the bounded PR increment from later Issue scope.

| Criterion | Increment result | Evidence / boundary |
|---|---|---|
| AC-133-01 | PASS in authorized foundation | Versioned schema, bounded loader, archive/digest validation and fail-closed tests execute in the 27 loader tests. |
| AC-133-02 | DEFERRED — not authorized | Consumer migration is B-03. No consumer migration or temporary legacy-parser exception was introduced. |
| AC-133-03 | DEFERRED — no activation | Shadow execution is later scope. Current unsupported writer modes reject before filesystem work; no state/dispatch/result mutation was activated. |
| AC-133-04 | PASS at foundation boundary | No independently-authored production projection or hosted writer exists in this increment; activation remains prohibited. |
| AC-133-05 | DEFERRED — not authorized | Ten real-Git merge/rebuild cases belong to later B-06 evidence. |
| AC-133-06 | DEFERRED — not authorized | The complete 36-case compatibility run is B-06; the current versioned fixture foundation passes without claiming that later gate. |
| AC-133-07 | DEFERRED with AC-133-05 | Exact-union proof depends on the later real-Git cases. |
| AC-133-08 | DEFERRED — not authorized | Twenty historical replays are B-07. |
| AC-133-09 | DEFERRED — not authorized | Live shadow/day-30 policy is B-07. |
| AC-133-10 | PASS for current increment | Full 348-test regression, focused dispatch/handoff/status coverage, fail-closed unsupported modes, and no changed route/owner or terminal consumption were observed. Later No-Go conditions remain binding. |
| AC-133-11 | DEFERRED — not authorized | Rollback activation/rehearsal is B-08; no legacy-read resume was attempted. |
| AC-133-12 | N/A — no housekeeping mutation | QA created or removed no experiment worktree and performed no prune/force-remove operation. |
| AC-133-13 | PASS for this PR increment only | Exact-commit hosted/local gates and independent Reviewer/QA evidence pass. This is not a complete pass for all deferred Issue criteria. |

## Test-effectiveness review

The runtime tests parse the real workflow and fixture manifest, assert literal supported runners, reject a Windows occurrence, verify pinned actions/read-only permissions/timeouts, and exercise the real loader fixture corpus. Assertions are behavior/output based, deterministic, network-free locally, and use no mocks or test-only production hooks. The large-file memory check uses ordinary file copies and cleans its temporary fixture. No overmocking, weak assertion, fixture-only production method, order dependency, or live-service dependency was found. Mutation testing is N/A: this increment changes declarative CI routing and contract metadata, not a new service-layer algorithm.

## Regression and authorization continuity

- Dispatch, handoff, readiness, project-state, receipt, and status-loader tests remain inside the 348/348 passing full suite.
- Executable runtime support is exactly local macOS Node 22 plus hosted Ubuntu Node 22 and hosted Ubuntu Python 3.12 reference verification.
- Windows history remains recorded without being presented as supported.
- Diff inspection found no B-03 consumer migration, B-04 production renderer/writer, B-06 compatibility execution, B-07 replay/live shadow, or B-08 rollback/Go activation.

## Residual risks and recommendation

- Whole-repository Windows portability remains a separate backlog item and is outside this merge gate.
- Python 3.14 local execution is compatibility evidence only; hosted Python 3.12 is the accepted reference evidence.
- Issue #133 remains incomplete because the criteria mapped to B-03/B-04/B-06–B-08 are deliberately deferred.

**Recommendation:** PR #135's bounded foundation/runtime increment may proceed to Human review. Do not mark Issue #133 itself complete, activate authority, or claim final Go.

## Completion check

| Item | Status | Notes |
|---|---|---|
| Scope / source grounding | PASS | Exact Issue body, accepted SDD/ADR, diff and hosted run inspected |
| Local and hosted verification | PASS | 31/31 focused, 348/348 full, 7/7 Python; both Ubuntu jobs pass at exact SHA |
| Test quality | PASS | FIRST/anti-pattern review; no defect |
| Quality gate | PASS | Supported-runtime limitation closed for bounded PR increment |
| Limitations | RECORDED | Windows N/A/deferred; later Issue criteria not claimed |
| Next owner | Human Maintainer | Review PR #135; later authorization remains separate |
