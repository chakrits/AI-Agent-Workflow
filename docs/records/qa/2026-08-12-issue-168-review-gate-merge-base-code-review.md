# Code Review Findings

Scope: replaces `scripts/validate-review-gate.mjs`'s hardcoded `HEAD~1..HEAD` range with a merge-base range against the PR's base branch, exposing `resolveDiffRange` and `gitDiffNameOnly` as a testable seam, plus three regression tests in `test/validate-review-gate.test.mjs` that build a real two-commit branch. Work item: [Issue #168](https://github.com/chakrits/AI-Agent-Workflow/issues/168).

| Finding ID | Severity | File / Area | Finding | Recommendation | Blocks Progress? | Evidence |
|---|---|---|---|---|---|---|
| CR-901 | Major | `scripts/validate-review-gate.mjs` | `main()` diffed `HEAD~1..HEAD`, so on any branch with more than one commit the gate inspected only the final commit. A branch whose `.mjs` change lands in commit 1 and whose commit 2 touches only docs was reported as "docs-only PR" and merged with no review record — the exact case the gate exists to prevent. Observed live on `codex/issue-166-subagent-execution-mode` (6 commits): the validator printed `Changed files (HEAD~1..HEAD): 1` and passed | Resolve the range via `git merge-base <base> HEAD` so the audit spans the whole branch | No — fixed in this diff | Independent QA of Issue #166 recorded it as Minor 1: https://github.com/chakrits/AI-Agent-Workflow/issues/166#issuecomment-5265981143 |
| CR-902 | Major | Self-consistency | Issue #166 merged normative text at `docs/workflow/task-execution-mode.md:50` stating "`HEAD~1` is never a substitute for a multi-commit range", while this validator did exactly that. The repository shipped a written rule its own tooling violated | Fix the tooling rather than weaken the rule; cite the rule in the function's doc comment so the coupling is visible to the next reader | No — fixed in this diff | `git show origin/main:docs/workflow/task-execution-mode.md \| sed -n '48,52p'` |
| CR-903 | Minor | Testability | The range logic lived inside `main()` and was unreachable from tests; only the two pure predicates were exported, which is why the defect survived an otherwise well-covered file (12 existing tests, all passing throughout) | Export `resolveDiffRange` and `gitDiffNameOnly` so the range is a real seam, and drive the tests through a throwaway git repository rather than mocking git | No | `test/validate-review-gate.test.mjs` `buildTwoCommitBranch()`; RED confirmed behaviorally (2 failing) before the fix |
| CR-904 | Major | CI correctness | A merge-base fix is worthless if CI cannot resolve the base ref — a shallow clone would silently fall back to the old behavior and re-open the hole | Verified `.github/workflows/validate-contracts.yml:9` already sets `fetch-depth: 0`, so full history is present. Resolution order is `GITHUB_BASE_REF` (set by Actions on `pull_request`) → `origin/main` → `main` | No — no workflow change needed | `.github/workflows/validate-contracts.yml:7-9` |
| CR-905 | Minor | Failure mode | A silent fallback would reproduce the original defect invisibly | The fallback is retained (a repository with no resolvable base must not hard-fail) but now prints an explicit WARNING naming what it could not see, and `resolveDiffRange` returns `basis: 'merge-base' \| 'fallback'` so the distinction is machine-readable. A regression test pins the fallback path | No | `resolveDiffRange falls back to HEAD~1..HEAD when no base ref can be resolved` |
| CR-906 | Question | Blast radius | Did the defect let an unreviewed script change reach `main`? | Not verified historically — this diff fixes the mechanism, it does not audit past merges. For PR #167 specifically the answer is no: independent QA re-derived `git diff 7679e21...6994456 -- scripts/ test/` = 0 lines by hand. Whether any earlier multi-commit branch slipped through is unaudited and out of scope here | No — scoped out deliberately, stated rather than assumed | Issue #166 QA evidence, AC-09 |

## Verification

- TDD: wrote the three regression tests first. First RED was a missing-export `SyntaxError`, which is not a behavioral failure — added a stub `resolveDiffRange` returning the then-current `HEAD~1..HEAD` behavior to create the seam, and re-ran to get a meaningful RED: `expected 'merge-base', actual 'fallback'` plus the empty added-files assertion, 2 failing / 13 passing. Implemented the merge-base resolution, then GREEN at 15/15.
- The first test asserts the precondition explicitly (`HEAD~1..HEAD` on the fixture returns `['README.md']` only), so the test proves the bug shape rather than merely asserting the fix.
- `npm test`: 402/402, 0 fail (399 before; +3 new tests).
- `npm run validate:review-gate` on this branch: `Range: de6a98f..HEAD (merge-base with origin/main)` — the new output line, and this branch's own `.mjs` change is now correctly gated by this very record.
- `npm run validate:contracts`, `validate:project-state`, `validate:skill-parity`, `adr:audit`, `validate:risk-register`, `validate:skill-usage`, `validate:metrics`, `validate:context-budget`, `git diff --check`: PASS.

## Review Decision

Approved. CR-901/CR-902 are the defect and its self-consistency consequence; CR-903 is the seam that makes the fix provable; CR-904 removes the most likely way for the fix to be cosmetic; CR-905 keeps the degraded path honest instead of silent; CR-906 marks what was deliberately not audited.

## Independent Review

Not dispatched at self-review time. Recorded per this repository's `code-review-gate` convention before requesting independent QA verification of Issue #168's Acceptance Criteria.
