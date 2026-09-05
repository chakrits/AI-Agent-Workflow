# Code Review Findings

Scope: `test/validate-risk-register.test.mjs`, `test/repin-source-matrix.test.mjs` only. No production code changed (`scripts/validate-risk-register.mjs`, `scripts/repin-source-matrix.mjs`, `scripts/adr-audit.mjs` all untouched — confirmed via `git diff --stat` after final revert of every mutation used for verification below). Work item: [Issue #220](https://github.com/chakrits/AI-Agent-Workflow/issues/220), closing two non-blocking test-quality gaps flagged by Issue #214's and Issue #215's QA.

## AC-01 — lock in `validate-risk-register.mjs`'s fail-open path

Added `runRiskValidation fail-opens (previousTotal stays undefined, never 0) when no comparison commit can be read` to `test/validate-risk-register.test.mjs`. Uses a plain non-git temp dir (via the existing `makeTempRepo` helper): `comparisonRefs(root)` cannot resolve `HEAD` there, so it returns `[]`, `previousCounts` is empty, and `previousTotal` takes the `undefined` branch — the same "shallow clone or unreachable base" shape the script's own docstring names, and the identical intentional design already present in `scripts/adr-audit.mjs`'s `previousAdrCount === undefined` branch. No change to `runRiskValidation`.

**Mutation-verify (the assertion that only this new test catches):**
- Mutated `previousTotal = previousCounts.length > 0 ? Math.max(...previousCounts) : 0;` (was `undefined`) in a disposable in-place edit, ran `node --test test/validate-risk-register.test.mjs`: 19/20 pass, **1 fail** — exactly the new test (`0 !== undefined` on `result.previousTotal`). Every other test in the file, including the two pre-existing tests that also happen to run against non-git temp dirs (`runRiskValidation passes when open risks exist` / `...idle with no open risks`), stayed green, because they never assert on `previousTotal` directly. Reverted the mutation; `git diff scripts/validate-risk-register.mjs` empty afterward; full suite back to 551/551.
- Verified directly, per the dispatch packet's suggestion, whether hardcoding `regressed = true` fails only the new test: mutated `const regressed = previousTotal !== undefined && total < previousTotal;` to `const regressed = true;`, ran `node --test test/validate-risk-register.test.mjs`. Result: **8 of 20 tests fail**, not 1 — including the two pre-existing tests that also happen to run against non-git temp dirs (`runRiskValidation passes when open risks exist`, `...idle with no open risks`), both CLI-exit tests, and three of the git-history regression tests, because `passed = !(activeWork && open === 0) && !regressed` makes any hardcoded-true `regressed` fail everything downstream. So this mutation is **not** unique to the new test and is not reported as its mutation-verify evidence — reporting it as such would repeat the exact QA-215-2 shape-duplicate problem this same Issue is closing on the other file. Reverted; full suite back to 551/551.
- Also checked, per the same packet suggestion, forcing `previousTotal !== undefined` to always be true (i.e., dropping that conjunct from `regressed`'s condition). This mutation kills **nothing**: `total < undefined` evaluates to `total < NaN`, which is `false` in JavaScript for any `total`, confirmed directly (`node -e "console.log(2 < undefined)"` → `false`). Recording this as a Question below rather than silently omitting it — it means the `previousTotal !== undefined &&` guard in `regressed`'s definition is currently redundant given `<`'s NaN semantics, not a live behavior. This is an observation about existing production code, not a change to it, and is explicitly a Human Maintainer call per the dispatch packet's scope boundary, not decided here.

## AC-02, item 1 — strengthen the round-trip-guard test

Read the current test at (then) line 158 of `test/repin-source-matrix.test.mjs` before editing: `before.equals(after)` and mtime-unchanged assertions were **already present** since the original commit (`e4bc02b`) that introduced this file — the Issue's literal sentence ("assert the fixture file on disk is unmodified after the guard throws") was already true and would have been a zero-diff change. The actual gap is QA-215-1's finding (Issue #215's independent QA comment, not the self-review record): the fixture's pinned hash was already correct for its content, so `changedPaths` would be empty and no write would ever occur regardless of whether the guard fired — the existing assertions proved the guard *throws*, not that it *prevents a write that would otherwise happen*.

Fix: changed the fixture's pinned `sha256` from the correct value to a deliberately stale one (`'f'.repeat(64)`), keeping the 4-space (non-round-tripping) indentation. Now, if the round-trip guard did not fire, the script would find a genuine hash mismatch for `AGENTS.md` and attempt a real write (2-space reformatted, discarding the fixture's indentation) — something the old fixture could never provoke.

The test was also restructured so the strengthened assertion cannot be short-circuited: it no longer uses `assert.rejects` (which aborts the test at the first uncaught/missing rejection, before ever reaching a file-unmodified check placed after it). Instead it `try/catch`es the call, asserts the file-unmodified checks **first**, then asserts a throw occurred and its message matches.

**Mutation-verify (two branches, to show the strengthening is load-bearing, not the pre-existing throw check):** neutered the guard (`if (reserialized !== raw)` → `if (false && reserialized !== raw)`) in a disposable in-place edit to `scripts/repin-source-matrix.mjs`.
- With the strengthened fixture (stale hash `'f'.repeat(64)`): `node --test test/repin-source-matrix.test.mjs` → 7/8 pass, 1 fail, failing specifically on `assert.ok(before.equals(after), 'the guard must prevent the write...')` — the mutated code reaches the write at the end of a normal return (`{ changedPaths: ['AGENTS.md'], written: true }`, confirmed directly by calling `repinSourceMatrix()` against the same fixture shape and observing `before !== after` on the file bytes) and the strengthened assertion catches exactly that.
- With the fixture temporarily reverted to the *old* correct-hash value (`sha256Of('agents content\n')`) under the same mutation: the same run fails instead on `assert.ok(caught, 'the round-trip guard must throw')` — the file-unmodified assertion **passes trivially** (`changedPaths` stays empty, nothing to write), which is exactly QA-215-1's finding: the old fixture could never distinguish "guard removed but nothing needed writing" from "guard removed and a write was prevented."
- Reverted both the fixture and the script mutation; `git diff --stat -- scripts/` empty afterward; full suite back to 551/551.

## AC-02, item 2 — the "stops after first occurrence" test

Removed `mutation check: an implementation that stops after the first occurrence must fail this test` entirely, per the Issue's second option and QA-215-2's explicit finding: Issue #215's independent QA mutation-tested a `.find()`-style regression (mutating the update loop to touch only the first occurrence) and found it killed **both** this test and the immediately preceding `updates every occurrence of a redundantly-pinned path, not just the first match` test together — meaning this test added no discriminating coverage the preceding test didn't already provide. Did not attempt to give it a distinct mutation to catch: the only failure mode this test's own comment names (`.find()`/break-after-first) is exactly what the preceding 5-row test already exercises with more rows, so any distinguishing mutation would be contrived rather than a real coverage gap.

## Test count

- Baseline (`npm test` on the clean tree before any edit): 551/551.
- After: 551/551 — `+1` (AC-01's new fail-open test) `-1` (AC-02 item 2's removed shape-duplicate) nets to no change in count, by design; no test was removed without a same-Issue justification and no test was added without new coverage.

## Verification

- `npm test`: 551/551.
- `npm run validate:contracts` — PASS.
- `npm run validate:review-gate` — PASS (this record satisfies the gate: added under `docs/records/qa/`, filename ends `-code-review.md`, diff touches `.mjs` test files).
- `npm run validate:skill-usage` — PASS (13/13 TASK_LOG entries carry skill notation as of this commit; not this Issue's job to add a row).
- `git diff --check` — clean.
- `git diff --stat -- scripts/` — empty; no production file changed, confirmed after every mutation used for verification above was reverted.

## Review Decision

Self-review: approved for QA handoff. No Major/Critical findings. One Question recorded above (the `previousTotal !== undefined` conjunct in `regressed`'s definition is defensively redundant given `<`'s `NaN` semantics) — informational only, not blocking, and explicitly left for the Human Maintainer per this Issue's scope boundary rather than decided here.
