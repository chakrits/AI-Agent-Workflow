---
name: documentation-closeout
description: Post-merge documentation closeout — update project state, create closeout PR, remove post-merge-closeout labels.
---

# Documentation Closeout

## Purpose

After a Change Request merges to `main` with a passing default-branch audit, the Documentation Agent performs a closeout: updates project state files, creates a dedicated closeout PR with a completion marker, and ensures the `post-merge-closeout` label is removed from source PRs.

## Trigger

Use when a merged PR carries the `post-merge-closeout` label — this signals a passing default-branch audit that requires a normal closeout.

## Do Not Use When

- No `post-merge-closeout` label exists on any merged PR.
- The default-branch audit failed — use the `documentation-sync` exception workflow instead.

## Closeout Process

### 1. Update Project State

Update these files in the closeout branch:
- `PROJECT_STATUS.md` — add entry to Completed section, reset Current Work Item to idle
- `TASK_LOG.md` — add new row with date, work item, agent, action, result, next agent, notes
- `CHANGELOG.md` — add entry under Added/Changed/Fixed as appropriate

### 1b. Resolve Parallel-Branch Conflicts in Project State Files

Two branches that both diverged from the same point and both edited `PROJECT_STATUS.md`
and `TASK_LOG.md` (e.g. two Bug Fix branches in flight at once) will conflict when either
is merged with `main` after the other lands. Resolve with two different rules, because the
two files have different shapes:

- **`TASK_LOG.md` is append-only.** Every row is an independent, real event — never choose
  one branch's rows over the other's. Keep both sides' rows (the more recently merged
  branch's rows first, matching the file's newest-first convention).
- **`PROJECT_STATUS.md`'s "Current Work Item" / "Current Stage" is a single pointer, not
  additive.** Keep the branch actually being merged right now; drop the other side's
  version. It will be properly synced to idle/Completed by its own closeout PR — don't try
  to fix its staleness here.

After resolving, re-run the full test suite and `validate:contracts` before committing the
merge — a silent double-count or dropped test file is the most common failure mode.

### 2. Create Closeout PR

Create a branch: `docs/post-merge-closeout-pr<N>`
Create a PR with:
- Marker in body: `<!-- post-merge-closeout: complete; source-pr-<N> -->` (use terminal PR number)
- Full PR template (documentation-impact: complete, Lifecycle Readiness, QA Acceptance Criteria, Verification)

### 3. Multi-Source-PR Handling

The marker regex supports ONE source PR. When multiple source PRs exist:
- Use the terminal (last) PR number in the marker
- Manually remove `post-merge-closeout` label from earlier PRs: `gh issue edit <N> --remove-label post-merge-closeout`

### 4. Merge and Verify

- Merge the closeout PR (squash + delete branch)
- The automation removes the label from the terminal source PR
- Verify: `gh pr list --state all --label post-merge-closeout --json number` returns empty
- Run `npm run validate:project-state` — must pass

## Canonical References

- `.github/workflows/documentation-sync.yml` — CI automation that adds `post-merge-closeout` label
- `docs/workflow/role-definitions.md` — Documentation Agent role definition
- `docs/templates/POST_MERGE_DOCUMENTATION_REVIEW.md` — exception template (for failed audits only)

## Output

- Closeout PR merged to main
- PROJECT_STATUS.md, TASK_LOG.md, CHANGELOG.md updated
- All `post-merge-closeout` labels removed
- `npm run validate:project-state` passes
