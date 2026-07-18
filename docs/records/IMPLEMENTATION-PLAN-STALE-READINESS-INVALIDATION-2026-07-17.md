# Implementation Plan — Issue #19 Stale Readiness Refresh

| Field | Value |
|---|---|
| Work Item | GitHub Issue #19 / Draft PR #20 |
| Change Type | Bug fix — stale readiness result after linked-Issue label change |
| Risk | High — a dedicated GitHub App publishes a branch-protection Check Run |
| Approved Direction | Human approval on 2026-07-17 |

## Root Cause

The read-only pull-request readiness workflow cannot receive a linked Issue's
`labeled` or `unlabeled` event. A manual rerun is advisory only: the previous
successful required check remains green and can leave a merge-eligible stale
state. The live test on 2026-07-18 proved that using a GitHub App to edit an
invisible PR marker is also insufficient: the App update succeeded, but no new
`pull_request.edited` readiness run was created.

## Plan

1. Add a regression test for a trusted Issue-event re-evaluator.
2. Add one default-branch trusted workflow that reacts to every base-`main`
   `pull_request_target` head change and to `phase:`/`status:` Issue-label
   changes. Each surviving run serially fetches all open base-`main` PRs,
   evaluates them using the trusted default-branch decision module, then creates
   a fresh GitHub-App-owned success or failure Check Run on every PR head SHA.
   A malformed Issue/closeout lookup becomes that PR's failure and cannot stop
   evaluation of later PRs.
3. Keep the existing PR workflow read-only, but make the new Check Run the
   branch-protection readiness requirement after hosted QA proves it.
4. Preserve the trusted boundary: checkout only the default branch, never
   execute PR-head content, and never modify a PR body to trigger a workflow.
5. Run focused and full local checks, focused Security Review and code review,
   then merge this increment before rebasing PR #20 for hosted QA evidence.

## Security Constraints

- The GitHub App requests only repository **Pull requests: read**,
  **Issues: read**, and **Checks: read & write**, and is installed only on this
  repository.
- The repository variable `WORK_ITEM_REFRESH_APP_CLIENT_ID` holds the
  non-secret Client ID. The full private key is the `WORK_ITEM_REFRESH_APP_PRIVATE_KEY`
  **environment secret** in `work-item-refresh`, never a repository secret.
- Configure `work-item-refresh` to allow only the protected `main` branch (and
  any required human environment protection). This narrows ordinary environment
  access, but does **not** by itself make a `pull_request_target` secret safe
  for forked pull requests: that event uses the trusted base workflow. Safety
  therefore depends on the next constraint—never executing untrusted PR code.
- The trusted workflow runs from the default branch on `issues` and
  `pull_request_target` events; it checks out only the default branch and
  creates a Check Run with no shell or PR-code execution. It never checks out,
  downloads, builds, tests, or executes a PR head or merge ref.
- Only lifecycle labels (`phase:` and `status:`) trigger a refresh.

## Required Maintainer Setup Before Merge

1. Update the GitHub App installed on **only** `chakrits/AI-Agent-Workflow`.
   Give it repository **Pull requests: read**, **Issues: read**, and
   **Checks: read & write** only; leave Contents, Actions, Administration,
   organization, and webhook permissions unset.
2. Create the `work-item-refresh` Actions environment. Limit deployment
   branches to the selected protected branch `main`. Do not require a reviewer:
   that would deliberately pause each automatic refresh.
3. Add the App's **Client ID** as repository Actions variable
   `WORK_ITEM_REFRESH_APP_CLIENT_ID`.
4. Generate a private key for the App and add the complete PEM as environment
   secret `WORK_ITEM_REFRESH_APP_PRIVATE_KEY` in `work-item-refresh`. Never add
   that key as a repository secret, and remove a same-named repository secret
   if one was created while testing.
5. After the merged workflow is present, open or synchronize a linked test PR,
   then add and remove a harmless
   `phase:` or `status:` label on a linked test Issue. Confirm the re-evaluator
   run succeeds and creates a newer `work-item-readiness-freshness` Check Run
   on the linked PR head SHA.
6. Only after the hosted Check Run exists, add
   `work-item-readiness-freshness` to main's required status checks and select
   **AI Agent Workflow** as its expected App source. Never configure it as
   "Any source". QA must record this source-pinning evidence.

## Rollback

Remove the refresh workflow and the readiness-workflow concurrency setting.
This restores the former manual-rerun process but reopens the stale-green risk.
