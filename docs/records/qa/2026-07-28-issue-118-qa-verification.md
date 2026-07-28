# QA Verification: PR #123 — Evidence-based closeout-label cleanup (Issue #118)

## Scope

Independent re-derivation of every Acceptance Criteria result against branch
`feat/issue-118-closeout-label-cleanup` at `657fdec` ("fix: bind closeout
cleanup manifests to evidence" — the CR-123-01/02 remediation).

## Verified

- `loadManifest` now requires structured per-PR `reconciliationEvidence`
  (kind, owner/repo/sourcePr binding, and a `missedCleanupRationale`)
  instead of one free-text `evidence` string for the whole manifest — a
  single string could not prove any individual PR was actually reconciled.
- `loadManifest`/`applyManifest` now bind the manifest to the requested
  `owner`/`repo`/`label`, rejecting a manifest approved for one repository
  or label from being applied against another.
- Re-ran the live dry-run against the real repository: still 7 confirmed
  candidates (#21, #22, #23, #24, #94, #96, #105), 4 review-recommended
  (>7 days) — unchanged from the earlier self-review pass, confirming the
  `--repo` pin fix (`bc3734d`) and the new manifest work did not regress
  live enumeration.
- Confirmed via source inspection that `ghViewRunner`/`ghRemoveLabelRunner`
  still pass `--repo <owner>/<repo>` (self-review finding from `bc3734d`
  remains fixed).

## Acceptance Criteria

| AC | Result | Evidence |
|---|---|---|
| AC-1: script exists with `--dry-run` mode | PASS | `--dry-run` is the default (no `--apply`); live run above |
| AC-2: dry-run prints candidate list with evidence | PASS | live run above shows number, mergedAt, age, review-recommended flag |
| AC-3: `--apply --manifest` removes labels only from approved PRs, evidence-bound | PASS | `applyManifest` re-confirms live state per PR; manifest requires structured per-PR `reconciliationEvidence` bound to owner/repo/sourcePr; 8 manifest-validation regression tests |
| AC-4: uses `gh pr view --json labels` per-PR, not `gh pr list --label` | PASS | `listCandidatePRs` uses GraphQL; `confirmPRLabel`/`ghViewRunner` use `gh pr view` per-PR with `--repo` pinned |
| AC-5: `npm test` passes | PASS | 242/242 |
| AC-6: acceptance evidence includes hosted GitHub result/manifest | PASS | live dry-run against the real repo (above), not only local `npm test` |

## Verdict

PASS on all 6 ACs. No label was removed as part of this verification —
only the read-only dry-run was exercised against the real repository.

`npm test`: 242/242. `validate:contracts`: pass.

Evidence posted to Issue #118: (comment URL added after posting)
