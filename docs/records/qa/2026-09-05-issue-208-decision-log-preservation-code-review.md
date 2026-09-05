# Code Review Findings

Scope: stops `scripts/reset-to-template.mjs` from silently blanking a `DECISIONS.md` that holds recorded ADRs, makes `scripts/adr-audit.mjs` fail when the decision log shrinks, and restores ADR-0017 and ADR-0019. Work item: [Issue #208](https://github.com/chakrits/AI-Agent-Workflow/issues/208).

| Finding ID | Severity | File / Area | Finding | Recommendation | Blocks Progress? | Evidence |
|---|---|---|---|---|---|---|
| CR-1001 | Critical | `scripts/reset-to-template.mjs` | `DECISIONS.md` was listed in `STUB_CONTENT` and blanked like a record. Measured ADR count went 17 → 0 at `93203e2` (PR #162) and 2 → 0 at `aa2a871` (PR #205). Open Issues #132 and #133 cite ADR-0017, destroyed 2026-08-12 and never restored; open Issue #203 depends on ADR-0019, destroyed nine days after it was written | Refuse the apply path when real ADRs are present, naming the ids, unless `--reset-decisions` is passed | No — fixed in this diff | `git show afe8091:DECISIONS.md` (17 ADRs) vs `main` (`No decisions recorded yet.`) |
| CR-1002 | Critical | `scripts/adr-audit.mjs` | The audit divides TASK_LOG decision keywords by ADR count. A reset blanks both files in one commit, so the ratio becomes `0 / 0 = 0.00:1` and the audit reports PASS. The control guarding decision-recording discipline was structurally blind to total loss of what it guards | Compare the ADR count against the comparison commit and fail closed on any decrease | No — fixed in this diff | Live output at `main`: `Real ADR entries: 0 … ADR audit PASSED` |
| CR-1003 | Major | `scripts/adr-audit.mjs` — comparison ref | Comparing the working tree against `HEAD` is useless in CI, where they are identical. Comparing against `HEAD~1` is wrong on a branch with several commits | `comparisonRef()` resolves the merge base with the declared base (`GITHUB_BASE_REF` → `origin/main` → `main`) and falls back to `HEAD~1` only when the merge base equals HEAD, i.e. on the base branch itself. This mirrors the range logic fixed under Issue #168 | No | Test `runAudit does not fail when the ADR count is unchanged or grows` exercises the `HEAD~1` path on a `main` checkout |
| CR-1004 | Major | Fail-open risk | If the comparison commit cannot be read, a naive implementation would treat it as zero and never fire again | `countRealAdrsAtRef` returns `undefined`, never `0`, when the ref or file is unreadable, and `regressed` requires `previousAdrCount !== undefined`. Undefined means "cannot compare", never "nothing was there" | No | `regressed` guard in `runAudit`; the pre-existing clean-slate tests still pass unchanged |
| CR-1005 | Minor | Refusal ordering | A refusal that ran after directory clearing would still destroy records | The ADR check is placed before `dirtyTargets` and before `applyReset`, so nothing mutates | No | Test asserts `snapshotDeclaredTargets` is byte-identical after the refusal, not merely that `DECISIONS.md` survived |
| CR-1006 | Minor | Single-sourcing | Re-implementing "what counts as a real ADR" inside the reset script would let the two definitions drift | The reset imports `countRealAdrs` from `adr-audit.mjs`; `countAdrsInContent` was extracted so the same rule serves both file and ref inputs | No | One definition, two callers |
| CR-1007 | Question | Blast radius | Is `RISKS.md` the same class of defect? | Almost certainly yes — it is stubbed by the same mechanism and the pre-reset `PROJECT_STATUS.md` cited risk R-002 as open. Deliberately **not** fixed here: it needs its own decision about what a risk register means after a reset, and widening this diff would put a second unreviewed judgment call inside a Bug Fix | No — parked and stated, not silently skipped | Issue #208 "Out of scope" |

## Verification

- TDD: four failing tests written first. Reset refusal: `not ok 19`, 20/21 passing. ADR audit: `not ok 15/16/17`, 14/17 passing. Implemented, then GREEN on both files.
- One RED was a fixture defect, not a code defect, and is recorded rather than quietly corrected: the "unchanged count" test wrote identical content in both commits, so `git commit` created nothing and `HEAD~1` did not resolve. The fixture now touches a second file so the commit exists.
- Restoration is limited to ADR-0017 and ADR-0019 by explicit Human Maintainer decision. `DECISIONS.md` records that limit and the recovery command for the rest, so the omission is visible rather than looking like the full history.
- `npm test`: 509 / 509 (503 before; +6).
- `validate:contracts`, `validate:project-state`, `validate:skill-parity`, `adr:audit`, `validate:risk-register`, `validate:skill-usage`, `validate:metrics`, `validate:context-budget`, `validate:clearable-refs`, `validate:workflow-evidence`, `validate:dispatch-receipts`, `git diff --check`: all PASS.
- Dry-run behaviour on this repository, which now holds 2 ADRs, is unchanged: the refusal is on the apply path only.

## Revision after independent QA (NEEDS_REVISION)

Independent QA returned NEEDS_REVISION at `3ccd8f4`: AC-05 FAIL, one Major, four Minor. Every finding was reproduced before being accepted. QA's sharpest observation was structural rather than any single case — the guard *worked better when misconfigured*, which is the clearest possible signal that its design was inverted.

| Finding ID | Severity | Finding | Fix | Evidence |
|---|---|---|---|---|
| CR-1008 | Critical | `comparisonRef` compared only against the merge base with the base branch. ADRs added and then destroyed **inside** a feature branch were invisible: the fork point still reports the count it held before any of them existed. QA's case V4b destroyed 5 ADRs and the audit passed with exit 0. Their V7 showed a deliberately broken `GITHUB_BASE_REF` *did* detect the loss, because it fell through to `HEAD~1` | `comparisonRefs` now returns the merge base **plus every commit in `mergeBase..HEAD`** (capped at 100) plus `HEAD~1`, and `runAudit` takes the highest count any of them held. The worst loss is what matters | Reproduced V4b independently: before, `PASSED … EXIT=0`; after, `FAILED: the decision log shrank from 5 to 0 ADR(s)`, exit 1 |
| CR-1009 | Major | The real-vs-stub discriminator required the literal `- Date:`. A correctly-headed `### ADR-0042` written with `**Date:** 2026-01-01` counted as zero, so the reset blanked it and the audit passed — the exact failure Issue #208 exists to eliminate. Nothing documents `- Date:` as load-bearing; there is no ADR template in `docs/templates/` | `DATED_FIELD_RE` accepts `- Date:`, `**Date:**` and bare `Date:`. An unfilled template entry still has the key with no value and still counts as zero | Reproduced independently: before, reset exit 0 and the ADR body gone; after, reset refuses and the file survives |
| CR-1010 | Minor | `recordedAdrIds` used `/^### (ADR-\d+)/gm` while the counter matched `/^### ADR-/`, so a non-numeric id like `ADR-A7` produced a refusal listing **no ids at all** — failing AC-02's "names the ids" clause while still failing closed | Aligned on `/^### (ADR-[^\s:]+)/gm`, which also strips the trailing colon that `\S+` would have captured | `ADR-A7` and `ADR-0042` are now both named in the refusal |
| CR-1011 | Minor | **CR-1006 in this record was factually wrong.** It claimed "One definition, two callers", but `countRealAdrs` still duplicated the split-and-match logic instead of delegating to the extracted `countAdrsInContent` | `countRealAdrs` now delegates. The original claim is left above rather than edited away, since a review record that quietly corrects itself is worth less than one that shows what it got wrong | `scripts/adr-audit.mjs` — `countRealAdrs` is now three lines |
| CR-1012 | Minor | Both scripts threw `ERR_INVALID_ARG_TYPE` on import when `process.argv[1]` is undefined | Guarded with `process.argv[1] &&`. Pre-existing pattern, fixed here because both files were already open | `node -e 'import("./scripts/adr-audit.mjs")'` |

**Test-coverage gap this exposed.** QA established that neither new `runAudit` test ever exercised the merge-base path: both fixtures used `git init` with no remote, so the lookup always failed and the code always fell through to `HEAD~1`. The branch CI actually takes had zero coverage, and CR-1003's evidence column asserted the opposite. `makeRepoWithOriginAndBranch` now builds a bare origin, clones it, and branches, so the three new tests run the real CI shape.

QA's V1 (`## ADR-` heading level) is accepted as a format violation rather than a contract violation: `### ADR-` is documented at `docs/operating-model/METRICS.md:22` and enforced by `scripts/validate-metrics.mjs:8`. Not fixed; recorded so it is not rediscovered as new.

Suite 509 → 514.

## Second revision after independent re-review

The re-review disposed five of six prior findings as addressed, and found one **regression I introduced** plus one test defect. Both were reproduced before being accepted. `task_review_rework_count` is now **2 of a maximum 2**: any further unresolved review result stops for the Human Maintainer rather than starting a third round.

| Finding ID | Severity | Finding | Fix | Evidence |
|---|---|---|---|---|
| CR-1013 | Major (regression, mine) | The widened `DATED_FIELD_RE` over-corrected. `\S+` captured the closing `**` of an **unfilled** `**Date:**`, so a template stub counted as a recorded decision — reintroducing the Issue #208 failure mode through a different door. A repository whose two real ADRs were replaced by two unfilled bold stubs reported `Real ADR entries: 2` and passed. The reset also began refusing on a log containing only an unfilled stub, contradicting this record's own claim that an unfilled entry counts as zero — a claim that had only ever been tested in the `- Date:` form, which never broke | Value must start with a non-`*` non-space character. Verified across eight shapes: `**Date:**`, `**Date**:`, `- Date:`, `Date:` → 0; `**Date:** x`, `**Date**: x`, `- Date: x`, `* Date: x` → 1 | Probed all eight directly before and after |
| CR-1014 | Major (test defect, mine) | **The coverage fix claimed in CR-1008 was cosmetic.** The re-review deleted the entire `rev-list` walk — the whole Critical fix — and all 22 tests still passed. `refs.add(parent)` is unconditional and `runAudit` takes `Math.max`, so `HEAD~1` alone supplied the asserted `previousAdrCount` in all three fixtures. Removing `origin` changed nothing either. This is the **second** time a coverage claim in this record did not hold; CR-1003 was the first | Added a fixture only the walk can answer: three branch commits `[FIVE, BLANK, BLANK]`, where the fork point holds 0 and `HEAD~1` holds 0, so `previousAdrCount === 5` is unreachable without walking. Validated by mutation, not by assertion | Mutant with the walk deleted: `not ok 23 - a loss in the middle of a branch is found only by walking the branch`, 25/26. Unmutated: 26/26 |
| CR-1015 | Minor | `--max-count=100` is a real bound: a branch that adds and destroys ADRs more than 100 commits back is a blind spot, undetected at the prior candidate too | Documented in the code rather than left implicit | Re-review case: 5 ADRs destroyed then 120 no-op commits → exit 0 |
| CR-1016 | Minor | When no comparison commit is readable — a shallow clone, an unreachable base — the guard is silently absent and looks identical to a pass | The CLI now prints `unavailable — no comparison commit could be read` and says the guard is absent rather than passing. Not live today: `validate-contracts.yml` uses `fetch-depth: 0` and is the only job running `adr:audit` | New output line |

**Deliberately not changed.** `Date: TBD` in prose and a `Date:` inside a fenced block still count. Bounding the field to a section's first lines is follow-up work, not a regression fix. `- Date: <YYYY-MM-DD>` also still counts, and is now pinned by a test: it counted before Issue #208, so tightening it here would be scope expansion dressed as a fix.

**What I take from CR-1014.** Twice now this record asserted coverage that did not exist, and both times an independent reviewer proved it by mutating the source rather than reading the tests. Asserting that a test exercises a path is not evidence; deleting the path and watching the test fail is.

Suite 514 → 518.

## Review Decision

Approved. CR-1001 and CR-1002 are the defect and the reason nothing caught it. CR-1003 and CR-1004 are the two ways the new guard could have been cosmetic. CR-1005 protects the records a refusal is supposed to save. CR-1007 marks the boundary that was deliberately not crossed.

## Independent Review

Not dispatched at self-review time. Recorded per this repository's `code-review-gate` convention before requesting independent QA verification of Issue #208's Acceptance Criteria.
