---
name: release-readiness-checklist
description: Use for release checklist, versioning/changelog, release evidence, triple rollback confirmation, and deployment strategy statement before final release handoff.
---

# release-readiness-checklist

## Purpose

Before final release handoff, the Release Agent confirms versioning discipline, release
evidence, rollback coverage across all applicable paths, and a stated deployment strategy — so a
release is never approved on an implied or partial checklist.

## Trigger

Use when preparing a release for handoff: a version bump, a `CHANGELOG.md` entry, release
evidence collection, or a rollback/deployment-strategy statement is needed.

## Do Not Use When

- No release is being prepared — this is not a general changelog-writing or version-bumping
  skill for in-flight work.
- The task is atomic commit discipline, commit messages, or pre-commit hygiene for a single
  change — that is `git-workflow-and-versioning`'s responsibility, not this skill's.

## Versioning and Changelog Contract

Version every release `MAJOR.MINOR.PATCH`: MAJOR for a breaking change, MINOR for
backward-compatible new functionality, PATCH for a backward-compatible fix. When unsure whether a
change is breaking, treat it as breaking. Tag the release and treat the tag as the source of
truth — never hand-edit a version number out of sync with its tag. Write the `CHANGELOG.md` entry
in the same change that makes the change, grouped by Added/Changed/Fixed/Deprecated/Removed/
Security and phrased around user impact — not reconstructed from `git log` at release time.

## Release Evidence Checklist

Before final handoff, confirm and record:

- All required tests passed (unit, integration, and any contract validation for the work item).
- The hosted CI run for the merge commit is green and referenced — a local-only result is not
  sufficient. (This is the standing rule R-001 exists to enforce: the first hosted CI run on
  `main` had gone unrecorded.)
- Human approval for the release is recorded, not implied.
- Documentation Impact assessment is complete for every merge included in this release, and any
  post-merge audit exception is closed with evidence.

Any missing item blocks the release; record it as an open item rather than approving around it.

## Triple Rollback Confirmation

Before approving a release, confirm all three rollback paths are accounted for, not just one:

- **Code rollback** — a git revert or a previous release tag to redeploy.
- **Schema rollback** — SA Agent's Data Migration Safety rollback plan, when the release
  includes a migration.
- **Config rollback** — Config Agent's rollback method, when the release includes a config
  change.

A release with a migration or config change and no corresponding rollback plan from its owning
role is not ready.

## Deployment Strategy Statement

State the deployment strategy (e.g., direct deploy, rolling, blue-green) and its blast radius in
the release plan. This project does not own deployment tooling or infrastructure — this is a
statement of intent for the human operator, not an automated rollout.

## Canonical References

- `AGENTS.md`
- `PROJECT_STATUS.md`
- `docs/workflow/dynamic-routing.md`
- `docs/workflow/role-definitions.md`
- `docs/workflow/quality-gates.md`
- `docs/workflow/handoff-contract.md`
- `docs/templates/`

## Output

- `docs/templates/RELEASE_PLAN.md`
- Document assumptions and open questions.
- Do not skip required gates.
- Update `PROJECT_STATUS.md` and `TASK_LOG.md` when the platform allows file edits.
