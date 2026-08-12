# Implementation Plan: Run `reset-to-template` Against This Repository

## Context

`scripts/reset-to-template.mjs` and its verification harness (`scripts/verify-reset-template.mjs`) were built and independently QA-verified under Issue #129 (merged PR #130, commit `4243eb5`). The tool itself has never been run with `--apply` against this primary working tree — only against disposable clones inside the harness. Boss asked to open a branch and prepare a plan for actually running it here.

This is a **working-tree reset**, not a history rewrite. Git history is untouched; every file the tool stubs or clears remains recoverable from `git log`. The optional "new-root orphan branch" step described in `docs/workflow/reset-to-template.md` is explicitly human-only and is out of scope for this plan unless Boss decides to do it separately.

## What The Script Actually Does

Source of truth: `scripts/reset-to-template.mjs` (`STUB_CONTENT` / `CLEARED_DIRECTORIES` constants), cross-checked against the live tree today.

### Files replaced with blank stubs (5)
- `PROJECT_STATUS.md`
- `TASK_LOG.md`
- `CHANGELOG.md`
- `RISKS.md`
- `DECISIONS.md`

### Directories cleared (contents removed, `.gitkeep` kept) — current entry counts
| Directory | Entries today |
|---|---|
| `docs/records/sdd` | 5 |
| `docs/records/requirements` | 3 |
| `docs/records/security-review` | 7 |
| `docs/records/implementation-plan` | 15 (includes this plan once committed) |
| `docs/records/handoff` | 6 |
| `docs/records/work-items` | 28 |
| `docs/records/lessons-learned` | 2 |
| `docs/records/postmortem` | 2 |
| `docs/records/misc` | 4 |
| `docs/records/dispatch-receipts` | 0 |
| `docs/superpowers/specs` | 17 |
| `docs/superpowers/plans` | 12 |

### Explicitly NOT touched
- `docs/records/qa/` (60 entries today) — preserved by design, per `docs/workflow/reset-to-template.md`.
- `README.md`, `PROJECT_INDEX.md`, `docs/vault/00-Index.md`.
- All canonical workflow docs, templates, agent adapters, skills, and CI configuration.

## Pre-Existing Gap Found While Preparing This Plan

`docs/records/handoffs` (**plural**, 2 entries: the two Issue #133 handoff records) is a separate directory from `docs/records/handoff` (**singular**, 6 entries) that the script's `CLEARED_DIRECTORIES` list actually clears. The `handoffs` (plural) directory would survive a reset untouched — inconsistent with the documented intent that all historical record directories except `docs/records/qa/` are cleared. This predates this plan; it was introduced when `docs/records/handoffs/` was created for Issue #133 without updating the reset target list.

**Decision needed from Boss before running `--apply`:** either (a) fix `CLEARED_DIRECTORIES` to include `docs/records/handoffs` first, in a small separate PR with its own regression test, or (b) accept the gap and note it in the reset's own record. Recommendation: (a) — it's a one-line fix plus one test, and running the reset without fixing it would leave 2 stale files behind and understate what "reset" means.

## Why Run It At All Right Now

Confirm with Boss: is the goal to (1) verify the harness/tool is still correct on today's tree via a disposable clone only (no mutation to this repo), or (2) actually apply the reset to this primary repository to start a fresh project baseline? These have very different risk profiles and this plan supports both, but the sequencing and sign-off differ. Everything below assumes **(2) — Boss wants to actually reset this repo**, since "run the script" was the literal ask; if it's actually (1), skip straight to Step 2.

## Sequence

1. **Fix the `docs/records/handoffs` (plural) gap first** (if Boss chooses option (a) above) — small Developer Agent task, TDD: add a regression test asserting the directory is cleared, add it to `CLEARED_DIRECTORIES`, verify `npm test` passes. Separate small PR, normal review/merge — not bundled with the reset itself.
2. **Disposable-clone verification** — run `npm run verify:reset-template` (or `node scripts/verify-reset-template.mjs` directly) against a throwaway clone, never the primary worktree. Confirms: dry-run inventory matches expectations, `--apply --confirm-reset` produces the stubs/clears listed above, `docs/records/qa/` survives, a dirty target is correctly refused, and the operation is idempotent. This is the only way an agent is authorized to prove reset correctness — see Issue #129's precedent (`docs/records/work-items/2026-07-31-issue-129.md` if present, else TASK_LOG 2026-07-31 rows).
3. **Human review of the dry-run inventory against the primary repo** — run `npm run reset:template` (no `--apply`) on `main` (or this branch) and have Boss review the printed inventory before anything is deleted. This is a read-only preview; safe to run repeatedly.
4. **Boss decides and explicitly authorizes `--apply`** — this is a Human Maintainer decision, not one an agent should make unilaterally, because it deletes 89+ working-tree files (before any `handoffs` fix) with no in-tool undo (recovery depends on `git log`/`git show` against history).
5. **Apply** — `npm run reset:template -- --apply --confirm-reset`, from a clean working tree (the tool refuses if any target path is dirty).
6. **Post-apply verification** — run the full command list from `docs/workflow/reset-to-template.md`: `npm test`, `validate:contracts`, `validate:project-state`, `validate:skill-parity`, `adr:audit`, `validate:risk-register`, `validate:review-gate`, `validate:skill-usage`, `validate:metrics`, `validate:context-budget`, `git diff --check`.
7. **Inspect the full diff manually** before committing — confirm nothing outside the documented scope changed, and confirm the 5 stub files and cleared directories match this plan's inventory.
8. **Commit and open a PR** through the normal workflow (not a closeout PR — this is a real, reviewable change with a diff of hundreds of deletions). PR description must state plainly this is a working-tree reset, git history is unaffected, and link this plan.
9. **Boss reviews and merges** — same as every other change in this repo; no auto-merge.
10. **Do not run the optional new-root orphan-branch step** (`git switch --orphan ...`) unless Boss explicitly asks for it separately, per the doc's own human-only carve-out.

## Rollback

Nothing in Steps 1–3 mutates the primary repo. If Step 5 (`--apply`) runs and the result is unwanted before committing: `git checkout -- <targets>` and `git clean -fd docs/records/... docs/superpowers/...` restores the pre-reset working tree exactly, since nothing was committed yet. After commit, `git revert` recovers file content (history is not rewritten by this tool).

## Open Questions For Boss

1. Confirm intent: verify-only (harness, no repo mutation) vs. actually apply the reset to this repo now.
2. Fix the `docs/records/handoffs` gap first (recommended), or proceed and note it as a known limitation?
3. If applying: is there a target "new project" this baseline is for, so the PR description and any follow-up (new-root orphan branch, remote rename) can be scoped correctly?
