# Implementation Plan — Issue #19 Stale Readiness Refresh

| Field | Value |
|---|---|
| Work Item | GitHub Issue #19 / Draft PR #20 |
| Change Type | Bug fix — stale readiness result after linked-Issue label change |
| Risk | Medium — a dedicated GitHub App updates linked pull-request bodies |
| Approved Direction | Human approval on 2026-07-17 |

## Root Cause

The read-only pull-request readiness workflow cannot receive a linked Issue's
`labeled` or `unlabeled` event. A manual rerun is advisory only: the previous
successful required check remains green and can leave a merge-eligible stale
state.

## Plan

1. Add a regression test for a trusted Issue-event refresh workflow.
2. Add one default-branch `issues` workflow that reacts only to
   `phase:`/`status:` label changes, finds open PRs that link that Issue, and
   uses a short-lived GitHub App installation token to update each PR body with
   an invisible refresh marker. The update emits a
   `pull_request.edited` event, so the existing readiness workflow evaluates
   the current Issue state again.
3. Add per-PR cancellation concurrency to the existing readiness workflow in
   the activation PR, so the refresh run supersedes an older run that might
   otherwise finish after a lifecycle change.
4. Preserve the readiness workflow's read-only permissions and never check out
   or execute PR-head content in the trusted refresh workflow.
5. Run focused and full local checks, focused Security Review and code review,
   then merge this bootstrap before rebasing PR #20 for hosted QA evidence.

## Security Constraints

- The GitHub App requests only repository **Pull requests: read & write** and
  is installed only on this repository.
- The repository variable `WORK_ITEM_REFRESH_APP_CLIENT_ID` holds the
  non-secret Client ID. The full private key is the `WORK_ITEM_REFRESH_APP_PRIVATE_KEY`
  **environment secret** in `work-item-refresh`, never a repository secret.
- Configure `work-item-refresh` to allow only the protected `main` branch (and
  any required human environment protection). This prevents same-repository PR
  branches from reading the persistent private key.
- The trusted workflow runs from the default branch on `issues` events; it
  updates only an HTML comment marker, with no checkout, shell, or PR-code
  execution.
- Only lifecycle labels (`phase:` and `status:`) trigger a refresh.

## Required Maintainer Setup Before Merge

1. Register a GitHub App and install it on **only** `chakrits/AI-Agent-Workflow`.
   Give it repository **Pull requests: read & write** only; leave Contents,
   Issues, Actions, Administration, organization, and webhook permissions
   unset.
2. Create the `work-item-refresh` Actions environment. Limit deployment
   branches to the selected protected branch `main`. Do not require a reviewer:
   that would deliberately pause each automatic refresh.
3. Add the App's **Client ID** as repository Actions variable
   `WORK_ITEM_REFRESH_APP_CLIENT_ID`.
4. Generate a private key for the App and add the complete PEM as environment
   secret `WORK_ITEM_REFRESH_APP_PRIVATE_KEY` in `work-item-refresh`. Never add
   that key as a repository secret, and remove a same-named repository secret
   if one was created while testing.
5. After the merged workflow is present, add and then remove a harmless
   `phase:` or `status:` label on a linked test Issue. Confirm the refresh run
   succeeds, emits `pull_request.edited`, and the readiness workflow starts a
   newer run for that PR.

## Rollback

Remove the refresh workflow and the readiness-workflow concurrency setting.
This restores the former manual-rerun process but reopens the stale-green risk.
