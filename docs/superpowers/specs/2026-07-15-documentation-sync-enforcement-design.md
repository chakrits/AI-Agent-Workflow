# Documentation Sync Enforcement Design

## Goal

Turn the Documentation Agent's post-merge instruction into an observable workflow: each merged pull request creates a durable follow-up, and CI rejects known stale project-state wording on `main`.

## Confirmed Context

- `main` is now protected by the maintainer; ordinary changes reach it through pull requests.
- The Documentation Agent is an instruction file, not a hosted worker that GitHub can invoke to make semantic documentation decisions.
- The earlier failure was a clean Git worktree whose `PROJECT_STATUS.md` still said work was “uncommitted” or “pending review”.

## Scope

1. Add a GitHub Actions workflow for a merged pull request into `main`.
2. The workflow creates a GitHub issue labeled `documentation-sync`; it contains the PR and merge references that a Documentation Agent needs to start its review.
3. Skip follow-up issues for a documentation-sync PR, avoiding an issue-perpetuating loop.
4. Add a local Node validator for stale state wording, intended to run after every push to `main`.
5. Add unit/regression tests and document the issue-to-record completion contract.

## Non-Goals

- CI must not use an LLM or autonomously edit project documents.
- This change does not change branch-protection settings, approve releases, or close risks.
- GitLab issue creation is not included: it requires a separately managed API token and ownership decision. Its existing validation pipeline remains supported.

## Flow

```text
PR merged into main
        |
        v
GitHub Action creates documentation-sync issue
        |
        v
Documentation Agent reviews change, updates project docs,
creates POST-MERGE-DOCUMENTATION-REVIEW record, closes issue
        |
        v
Documentation-sync PR merges into main
        |
        v
CI validates project state has no stale merge-status wording
```

## Acceptance Criteria

- A merged non-documentation-sync PR targeting `main` has exactly one deterministic follow-up issue creation attempt.
- The workflow has only the minimum permissions (`issues: write`, `pull-requests: read`) and runs only for the trusted `pull_request` `closed` event.
- A documentation-sync branch does not create another follow-up issue.
- `npm run validate:project-state` exits non-zero when `PROJECT_STATUS.md` claims work is uncommitted or pending review, and exits zero for the current idle state.
- GitHub Actions runs the new validator on pushes; the regression suite guards the workflow and Documentation Agent contract.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| The issue is created but no agent acts on it | Make the issue the explicit handoff contract; it remains visible and auditable instead of silently losing work. |
| A sync PR recursively creates another issue | Skip branches prefixed `codex/documentation-sync/`. |
| Legitimate prose contains a stale phrase | Match only status markers in `PROJECT_STATUS.md`, and keep the forbidden markers narrow. |
| GitLab lacks the issue automation | Keep validation cross-platform; treat GitLab issue automation as a separately authorized integration. |

## Rollback

Revert this change. Existing documentation review instructions and CI contract validation continue to work as before.
