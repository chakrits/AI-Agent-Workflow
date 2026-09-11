# Code Review Findings

Scope: adds the missing markdown table separator row to `TASK_LOG.md`'s stub in `scripts/reset-to-template.mjs`'s `STUB_CONTENT`, plus a regression assertion in `test/reset-to-template.test.mjs` guarding both `TASK_LOG.md` and `RISKS.md`'s stub tables.

| Finding ID | Severity | File / Area | Finding | Recommendation | Blocks Progress? | Evidence |
|---|---|---|---|---|---|---|
| CR-801 | Major | `scripts/reset-to-template.mjs` | `STUB_CONTENT['TASK_LOG.md']` had a table header row (`| Date | Work Item | ... |`) with no following separator row (`|---|---|...|`), so every reset produced a `TASK_LOG.md` that renders as plain text, not a table — found by Boss after PR #162's real execution actually reset this repo and the header stayed unrendered. `STUB_CONTENT['RISKS.md']` has the separator; only `TASK_LOG.md` was missing it | Added the separator row, matching `RISKS.md`'s existing pattern exactly | No — fixed in this diff | Manual diff of `STUB_CONTENT` before/after; `RISKS.md`'s stub already had `\|---\|---\|---\|---\|---\|---\|---\|---\|` |
| CR-802 | Minor | Test coverage | No prior regression test asserted the stub tables are actually well-formed markdown | Added a generic assertion checking both `TASK_LOG.md` and `RISKS.md` stubs (not just `TASK_LOG.md`) for a separator row immediately after the first `|`-prefixed line, so a similar future regression in either file is caught | No | `node --test test/reset-to-template.test.mjs`: RED before the fix (asserted on `TASK_LOG.md`), GREEN after |
| CR-803 | Question | Blast radius | Did this bug affect the already-merged PR #162 reset? | Yes — `TASK_LOG.md` on `main` right now has the same malformed table (no separator row after the header), which is why Boss noticed it. That is a content defect in the already-reset file, not something this script fix alone repairs; it needs its own direct edit to the current `TASK_LOG.md` (done separately in the closeout PR #163, not this PR, since this PR must not touch the closeout-marker-restricted files) | No — out of scope for this `.mjs`-only fix | `docs/post-merge-closeout-pr162` branch (PR #163) carries the direct `TASK_LOG.md` content fix |

## Verification

- TDD: added the failing assertion first, confirmed RED via `node --test test/reset-to-template.test.mjs` (17/18, `TASK_LOG.md` stub failure), added the one-line separator fix, confirmed GREEN (18/18).
- `npm test`: 399/399 (no new test count change — assertion added inside an existing test).
- `npm run validate:contracts`: PASS.
- `npm run validate:project-state`: PASS.

## Review Decision

Approved — CR-801 is the real, correctly-scoped fix; CR-802 strengthens coverage for the whole stub-table class, not just this one instance; CR-803 clarifies scope boundary with the separate closeout PR.

## Independent Review

Not yet dispatched at self-review time; recorded here per this repo's `code-review-gate` convention before requesting independent QA verification.
