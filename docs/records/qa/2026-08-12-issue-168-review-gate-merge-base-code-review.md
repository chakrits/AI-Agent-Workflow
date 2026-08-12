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

## Revision after independent QA (NEEDS_REVISION)

Independent QA returned NEEDS_REVISION on the first candidate (`7ffb4fa`) with two Major findings. Both were **fail-open holes the first fix introduced** in the very gate it repairs. Both were independently reproduced before being accepted, and both are now fixed.

| Finding ID | Severity | Finding | Fix | Evidence |
|---|---|---|---|---|
| CR-907 | Major | When HEAD is at or behind the resolved base, `git merge-base` returns HEAD, the range becomes empty, and `basis` was still `'merge-base'` — the honest-looking branch, so no warning printed and the gate emitted `PASS: no script changes detected` while auditing nothing. `.github/workflows/validate-contracts.yml:2` is `on: [push, pull_request]`, so **every push to `main` became a guaranteed vacuous pass**. The pre-fix script FAILed the same repository | Detect `mergeBase === HEAD` and return `basis:'fallback'` with `reason:'empty-range'`, restoring the last-commit audit and printing the warning | Repository on `main` whose last commit adds `scripts/a.mjs`: pre-fix FAIL/exit 1 → first-fix PASS/exit 0 → after revision FAIL/exit 1 |
| CR-908 | Major | `candidateBaseRefs` appended `origin/main`/`main` unconditionally after `origin/${GITHUB_BASE_REF}`, so an unresolvable declared base silently degraded to `main` on the `'merge-base'` basis. Widening past the declared base makes `--diff-filter=A` harvest review records added on an intermediate branch, so a **stacked branch is credited with a record it never added**. `hasScriptChanges` tolerates a wider range; `hasReviewRecord` does not | Treat an explicit base signal as authoritative: `GITHUB_BASE_REF` yields only `origin/<ref>` and `<ref>`, with no fall-through to `main`. If neither resolves, degrade to `basis:'fallback'` with `reason:'declared-base-unresolvable'` and warn | `stacked` off `feature-x` (record on `feature-x`, script on `stacked`): pre-fix FAIL → first-fix PASS/exit 0 → after revision `merge-base with feature-x`, 0 records, FAIL/exit 1 |
| CR-909 | Minor | `GITHUB_BASE_REF` was only tried as `origin/${ref}`, so a checkout with a local base branch and no remote-tracking ref could not resolve its own base | Try the bare ref as well | Fixed as part of CR-908; the CR-908 repro resolves `feature-x` with no `origin/` remote present |
| CR-910 | Minor | The committed tests cannot demonstrate RED against the actual pre-fix artifact — they fail on a missing export. Prose alone is not re-derivable | Recorded the exact reproduction procedure below | This section |

**Reproducible RED procedure**, since the stubbed seam is not present in the artifact. Take `de6a98f:scripts/validate-review-gate.mjs`, add `export function resolveDiffRange(cwd, { baseRef } = {}) { return { range: 'HEAD~1..HEAD', basis: 'fallback', baseRef }; }` and `export` on `gitDiffNameOnly`, then run `node --test` against the test file. The result depends on **which revision of the test file you use**, so pin it:

| Test file revision | Result | Failing tests |
|---|---|---|
| `7ffb4fa:test/validate-review-gate.test.mjs` (15 tests — the original RED for CR-901–CR-903) | 13 pass / 2 fail | the two branch-wide tests |
| `7fce943:test/validate-review-gate.test.mjs` (19 tests — after this revision added four more) | 16 pass / 3 fail | the two branch-wide tests, plus `GITHUB_BASE_REF resolves as a bare local ref…` |

The unpinned earlier wording of this paragraph stated only the first row while the repository head already held the second, so a reader following it against the working tree could not reproduce the stated numbers. Both rows are independently re-derived.

**Harness note.** The first attempt to reproduce QA's findings appeared to contradict them: the pre-fix script produced no output at all. The cause was the reproduction harness, not the finding — `mktemp -d` on macOS returns `/var/...`, a symlink to `/private/var/...`, so `import.meta.url === pathToFileURL(process.argv[1]).href` never matched and `main()` never ran. Re-running through `pwd -P` confirmed QA's results exactly. The test fixtures now call `realpathSync` for the same reason.

## Second revision after independent re-review

The re-review disposed of Major 1, Major 2, and Minor 1 as addressed, and raised two fix-caused items. Both were reproduced before being accepted.

| Finding ID | Severity | Finding | Fix | Evidence |
|---|---|---|---|---|
| CR-911 | Minor | Minor 2's correction was itself not re-derivable. The RED procedure above stated "13 pass / 2 fail" without pinning the test-file revision, but the same commit that wrote the procedure added four tests — so following it against the repository head yields 16 pass / 3 fail, with a third failure the text never mentions | Pinned the procedure to both revisions and tabulated each result, and stated why the unpinned wording was wrong | Independently re-derived: stubbed `de6a98f` script + head test file → `# tests 19 / # pass 16 / # fail 3`, third failure `GITHUB_BASE_REF resolves as a bare local ref…` |
| CR-912 | Minor | `FALLBACK_REASONS['declared-base-unresolvable']` interpolated `process.env.GITHUB_BASE_REF`, but that reason is also returned when the declaration came from the explicit `baseRef` argument with the environment variable unset — the warning would read `the declared base ref (undefined)`. Library-surface only; `main()` passes no `baseRef`, so the CLI path never reaches it | `resolveDiffRange` now returns `declaredBaseRef`, and the message reports that instead of re-reading the environment | New regression test `an unresolvable explicit baseRef names itself, not the unrelated environment variable` |

Five regression tests total were added across both revisions (suite 402 → 407).

Two out-of-scope observations were parked by the re-review rather than discarded, per `docs/workflow/task-execution-mode.md`:

1. A repository whose only commit is its root gives `Changed files: 0` and passes, because `HEAD~1` does not resolve and `gitDiffNameOnly` swallows the error. **Not fix-caused** — identical at the pre-#168 baseline `de6a98f`. Owner: Developer Agent. Next action: open a follow-up to make an unresolvable range an explicit FAIL rather than a silent empty list.
2. Context-budget headroom is 63 tokens. Not fix-caused; this diff touches no budgeted file. Owner: Documentation Agent. Next action: schedule a headroom review before the next canonical-file edit.

`task_review_rework_count` is now **2 of a maximum 2**. Any further unresolved review result stops for the Human Maintainer rather than starting a third round.

## Review Decision

Approved. CR-901/CR-902 are the defect and its self-consistency consequence; CR-903 is the seam that makes the fix provable; CR-904 removes the most likely way for the fix to be cosmetic; CR-905 keeps the degraded path honest instead of silent; CR-906 marks what was deliberately not audited.

## Independent Review

Not dispatched at self-review time. Recorded per this repository's `code-review-gate` convention before requesting independent QA verification of Issue #168's Acceptance Criteria.
