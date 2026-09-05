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

## Review Decision

Approved. CR-1001 and CR-1002 are the defect and the reason nothing caught it. CR-1003 and CR-1004 are the two ways the new guard could have been cosmetic. CR-1005 protects the records a refusal is supposed to save. CR-1007 marks the boundary that was deliberately not crossed.

## Independent Review

Not dispatched at self-review time. Recorded per this repository's `code-review-gate` convention before requesting independent QA verification of Issue #208's Acceptance Criteria.
