# Reset to Template

Use the reset tool when starting a new project from this repository. It creates a blank working-tree baseline while preserving the reusable workflow and all QA evidence.

## Scope

The reset replaces these files with structural stubs:

- `PROJECT_STATUS.md`
- `TASK_LOG.md`
- `CHANGELOG.md`
- `RISKS.md`
- `DECISIONS.md`

It clears the declared historical record directories and recreates each with `.gitkeep`, including `docs/records/work-items/` and `docs/records/lessons-learned/`. The command's dry-run inventory is the authoritative list.

It does not clear `docs/records/qa/` and does not stub `README.md`, `PROJECT_INDEX.md`, or `docs/vault/00-Index.md`. It also leaves the canonical workflow, templates, agent adapters, skills, and CI configuration untouched.

## Safe working-tree reset

Run the preview first:

```bash
npm run reset:template
```

Dry-run is the default. It resolves the Git repository root, prints each targeted file and directory, reports the number of entries that would be deleted or replaced, and makes no changes.

Applying requires both destructive flags:

```bash
npm run reset:template -- --apply --confirm-reset
```

Before mutation, the command checks every target for tracked modifications, staged changes, and untracked entries. If any target is dirty, it lists the affected paths, exits non-zero, and changes nothing. There is no override. Commit, move, or otherwise preserve the reported content before trying again.

After a successful reset, inspect the complete diff and run:

```bash
npm test
npm run validate:contracts
npm run validate:project-state
npm run validate:skill-parity
npm run adr:audit
npm run validate:risk-register
npm run validate:review-gate
npm run validate:skill-usage
npm run validate:metrics
npm run validate:context-budget
git diff --check
```

Commit the clean baseline only after all checks pass. Recovery of committed files remains possible from the old history, but untracked content deleted by an earlier or different tool may not be recoverable.

## Optional new-root history

This section is human-only. An agent must not run these history-changing commands autonomously.

After inspecting, validating, and committing the reset baseline, a human may create an orphan branch and commit a new root:

```bash
git switch --orphan new-project-main
git add --all
git commit -m "chore: establish clean project baseline"
```

Replacing published history is irreversible for collaborators unless coordinated backups exist. Before changing a remote default branch or force-updating any remote, coordinate with every collaborator, confirm the intended repository and branch, and retain the old reference until the migration is accepted.

This procedure is not a security-grade purge. It does not erase GitHub Issues, pull requests, Actions artifacts, releases, caches, existing clones, or forks. If a secret or sensitive value may have been committed, stop and use a separately approved security incident and purge process with a Security Reviewer and Human Maintainer.
