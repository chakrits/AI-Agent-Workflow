# QA Verification: PR #122 — Work-item traceability backfill (Issue #117)

## Scope

Independent re-derivation of every Acceptance Criteria result against branch
`feat/issue-117-work-item-traceability-backfill` at the commit including the
`fix: parse PR lists in work-item backfill` remediation (`ef8fbf4`) plus the
fabricated-record cleanup below.

## Finding: 5 of the original 10 pilot records were fabricated

Re-checked every pilot-committed `docs/records/work-items/*-issue-NN.md`
file's claimed Issue URL against the real repository (`gh issue view <N>` /
`gh pr view <N>`). Five were wrong — the number in the filename is a **pull
request**, not an Issue:

| File | Claimed | Actual |
|---|---|---|
| `2026-07-25-issue-78.md` | Issue #78 | PR #78 ("Issue #76 Sub-A") |
| `2026-07-25-issue-79.md` | Issue #79 | PR #79 ("Issue #76 Sub-B") |
| `2026-07-25-issue-80.md` | Issue #80 | PR #80 ("Issue #76 Sub-C") |
| `2026-07-25-issue-84.md` | Issue #84 | PR #84 ("Issue #83" design spec) |
| `2026-07-25-issue-89.md` | Issue #89 | PR #89 ("Issue #83 Improvement 5") |

Root cause: the TASK_LOG rows read `GitHub Issue #76 / PRs #78, #79, #80,
#81` and `GitHub Issue #83 / PRs #84-#89` — the pre-`ef8fbf4` parser only
recognized singular `PR #NN`, not plural/list/range `PRs #NN, #NN, #NN` or
`PRs #NN-#NN`, so it treated the PR numbers as bare issue references. This
is exactly what CR-122-01 (`docs/records/qa/2026-07-28-issue-117-code-review.md`)
flagged; `ef8fbf4` fixed the parser going forward but did not touch the
already-written bad files, since the no-overwrite guarantee protected them
from being regenerated.

**Remediation:** deleted the 5 bad files and re-ran
`node scripts/backfill-work-item-records.mjs --pilot --write`. The 10 newly
generated candidates (#26, #33, #35, #41, #49, #50, #63, #64, #68, #69) were
each independently checked against `gh issue view` — all 10 are genuine
Issues, none are PR numbers. The 5 correctly-generated original pilot
records (#83, #99, #106, #108, #111) plus the 4 hand-authored records
predating this Issue (#59, #76, #95, #102) are unaffected.

## Acceptance Criteria

| AC | Result | Evidence |
|---|---|---|
| AC-1: script exists with dry-run mode | PASS | `scripts/backfill-work-item-records.mjs`; `--dry-run` is the default (no `--write`) |
| AC-2: groups by distinct issue, not row | PASS | `groupRowsByWorkItem`; real-TASK_LOG regression test groups 118 rows into 19 issue groups + slug groups |
| AC-3: Unknown status never inferred as Closed | PASS | `determineStatus` requires merge+closeout co-occurrence; regression test asserts a bare "merged" mention never triggers Closed |
| AC-4: pilot mode limits to 10 for human review | PASS | `--pilot` caps at `PILOT_SIZE=10`; verified live run above |
| AC-5: no overwrite of existing records | PASS | Verified for both issue-kind (existing-number scan) and slug-kind (on-disk filename check, fixed from the earlier self-review finding) |
| AC-6: `npm test` passes | PASS | 247/247 |
| AC-7: `npm run validate:project-state` passes | PASS | confirmed above |
| AC-8: pilot reviewed by human before batch | **Deferred, by design** — this PR does not batch-run; it ships the tool plus a 10-record sample for Boss's review. Batch execution is a separate follow-up after that review. |

## Verdict

PASS on AC-1 through AC-7, with AC-8 correctly deferred to the PR's stated
scope. One Major finding (fabricated pilot records from the plural-PR
parsing gap) found during this verification pass, root-caused, and fixed
— not deferred.

`npm test`: 247/247. `validate:contracts`, `validate:project-state`: pass.

Evidence posted to Issue #117: (comment URL added after posting)
