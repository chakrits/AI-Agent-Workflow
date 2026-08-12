# Code Review Findings

Scope: adds `docs/records/handoffs` (plural) to `scripts/reset-to-template.mjs`'s `CLEARED_DIRECTORIES`, so it is cleared alongside `docs/records/handoff` (singular) on reset; adds one regression assertion in `test/reset-to-template.test.mjs` guarding both directory names.

| Finding ID | Severity | File / Area | Finding | Recommendation | Blocks Progress? | Evidence |
|---|---|---|---|---|---|---|
| CR-701 | Major | `scripts/reset-to-template.mjs` | `docs/records/handoffs` (plural, created for Issue #133's handoff records) was never added to `CLEARED_DIRECTORIES`, so a reset would silently leave 2 stale files behind while every other historical record directory except `docs/records/qa/` is cleared — contradicts the tool's documented intent in `docs/workflow/reset-to-template.md` ("clears the declared historical record directories") | Added `docs/records/handoffs` as its own entry (not merged with the singular form — the two are genuinely separate directories on disk, both present today) | No — fixed in this diff | `find docs/records/handoffs -maxdepth 1 -type f \| wc -l` showed 2 pre-fix; `CLEARED_DIRECTORIES` now lists both `docs/records/handoff` and `docs/records/handoffs` |
| CR-702 | Question | Root cause | Why did the two directories diverge? | `git log --diff-filter=A -- docs/records/handoffs` shows it was introduced by an Issue #133 handoff record commit without a corresponding update to `CLEARED_DIRECTORIES`; `docs/records/handoff` (singular) already existed and was already tracked in the list. A one-off naming drift, not a structural pattern — no further directories were found to have the same problem (`CLEARED_DIRECTORIES` reviewed in full against `docs/records/*` on disk) | No | Manual `ls docs/records/` cross-checked against the full `CLEARED_DIRECTORIES` array; only `handoffs` was missing |
| CR-703 | Minor | Test placement | The new assertion was added to the existing `'reset scope clears work-item and lessons history...'` test rather than a new dedicated test | Consistent with this test file's existing convention of grouping directory-membership assertions in one scope test; a standalone test would duplicate the same `CLEARED_DIRECTORIES` import and setup for one extra line of coverage | No | `test/reset-to-template.test.mjs` diff is additive only, no new `test(...)` block |

## Verification

- TDD: added the failing assertion first (`docs/records/handoffs` not in `CLEARED_DIRECTORIES`), confirmed RED via `node --test test/reset-to-template.test.mjs`, then added the one-line fix and confirmed GREEN (18/18).
- `npm test`: 399/399 (no new test count change — assertions added inside an existing test).
- `npm run validate:contracts`: PASS.
- `npm run validate:project-state`: PASS.
- `npm run validate:skill-parity`: 38/38 (unaffected — this change touches no skill file).

## Review Decision

Approved — CR-701 is the real, correctly-scoped fix this change set out to make; CR-702/CR-703 are non-blocking clarifications.

## Independent Review

Not yet dispatched at self-review time; recorded here per this repo's `code-review-gate` convention before requesting independent QA verification.
