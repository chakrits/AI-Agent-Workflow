# Code Review Request — Issue #106 Review Gate Diff Scope

## Intent

Fix `scripts/validate-review-gate.mjs` so a script change requires a
`docs/records/qa/*-code-review.md` record added in the same checked diff,
rather than passing because historical review records exist in the directory.

## Changed Areas

- `scripts/validate-review-gate.mjs` — scope review-record detection to the
  changed-file list used by the gate.
- `test/validate-review-gate.test.mjs` — regression coverage including the
  repository's existing review-record corpus.

## Review Focus

1. A script-only diff must fail even while historical review records remain.
2. A correctly named review record added in the same diff must pass.
3. The known `HEAD~1..HEAD` range limitation remains unchanged and documented
   as out of scope for Issue #106.

## Findings

- Root cause confirmed: the prior implementation tested the persistent
  directory contents and discarded the current diff, so any historical record
  made the gate pass.
- Chosen approach: require a correctly named review record in the same diff
  and restrict that list to added paths with `git diff --diff-filter=A`.
  This satisfies the requested freshness property without changing the known
  `HEAD~1..HEAD` range.
- Regression coverage uses the real `docs/records/qa/` directory and proves
  that 10+ historical records do not satisfy a script-only diff. It also
  covers an added record, wrong directory, and malformed input.
- Focused test, full `npm test` (207 → 209), contract validation, skill
  parity, and skill-usage checks pass before handoff. The self-gate is run
  against the commit after it is created because it inspects `HEAD~1..HEAD`.

## Deliberately Not Enforced

- Review-record content quality or linkage to a PR number/commit.
- A multi-commit PR diff range beyond the existing `HEAD~1..HEAD` behavior.
