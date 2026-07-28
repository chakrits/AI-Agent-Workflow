# Code Review: PR #123 — Evidence-based closeout-label cleanup

## Review Scope

- Candidate enumeration, per-PR confirmation, manifest authorization, live
  revalidation, external mutation boundary, and regression coverage.

## Findings

| Finding ID | Severity | File / Area | Finding | Recommendation | Blocks Progress? | Evidence |
|---|---|---|---|---|---|---|
| CR-123-01 | Major | `scripts/cleanup-stale-closeout-labels.mjs:70-102` | A single global nonempty manifest evidence string does not prove reconciliation/closeout evidence for each PR. | Require and validate structured per-PR provenance: source PR, reconciliation/closeout artifact or project-state reference, and missed-cleanup rationale. | Yes | `loadManifest()` accepts `evidence: "x"` |
| CR-123-02 | Major | `scripts/cleanup-stale-closeout-labels.mjs:134-148` | Caller can supply arbitrary `--label`; the manifest does not bind repository or label. | Restrict to `post-merge-closeout` or bind/validate owner, repo, and label in an approved manifest; add mismatch tests. | Yes | Parsed label is passed to `gh pr edit --remove-label` |
| CR-123-03 | Major | Lifecycle / PR body | Manifest approval and QA gates are absent. | Keep the PR Draft; remove `Closes #118`; do not apply labels or route to QA until human manifest approval is recorded. | Yes | Issue #118 remains `phase:requirements` |

## Review Decision

Changes requested

## Required Follow-up

| Item | Owner | Tracking | Evidence |
|---|---|---|
| Bind every mutation to per-PR reconciliation evidence | Developer Agent | PR #123 | Targeted tests plus `npm test` |
| Bind manifest to repository and target label | Developer Agent | PR #123 | Rejection tests for mismatch/override |
| Complete manifest approval and re-review | Boss / Reviewer | Issue #118 / PR #123 | Approval reference and follow-up review |
