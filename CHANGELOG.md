# CHANGELOG.md

## Unreleased

### Added
- Optional task-execution mode for planned multi-task or risk-triggered changes (Issue #166, PR #167, merged as `eeb731f`): `docs/workflow/task-execution-mode.md` as the permanent canonical definition, four purpose-scoped templates (`TASK_BRIEF.md`, `IMPLEMENTER_REPORT.md`, `TASK_REVIEW.md`, `TASK_REVIEW_REREVIEW.md`), a runtime-dispatch versus receipt-ledger state glossary, compact pointers from `dynamic-routing.md`, `role-definitions.md`, `SKILL_CATALOG.md`, and the `dynamic-workflow` skill, `DECISIONS.md` ADR-0014, and `obra/superpowers` attribution in `THIRD_PARTY_NOTICES.md`. The mode is optional and risk-triggered, task review/re-review are QA modes rather than a new role, `HANDOFF.md` remains required at owner/phase transitions, and `task_review_rework_count` is nested — no lifecycle contract, retry budget, or context-budget target changed.
- Repository reset to template baseline (Issue #160, PR #162, merged as `93203e2`): stubbed `PROJECT_STATUS.md`, `TASK_LOG.md`, `CHANGELOG.md`, `RISKS.md`, `DECISIONS.md` and cleared 13 historical record directories, per Boss-approved run of `scripts/reset-to-template.mjs --apply --confirm-reset`. Working-tree content reset only — git history unchanged, all removed content recoverable via `git log`/`git show`.

### Changed

### Fixed
- `scripts/validate-review-gate.mjs` diffed only `HEAD~1..HEAD`, so a multi-commit branch whose `.mjs` change landed before the final commit was reported as a docs-only PR and merged with no review record (Issue #168, PR #172, merged as `bd25b7c`). Now resolves the audit range via `git merge-base` against the PR base (`GITHUB_BASE_REF` → `origin/main` → `main`), falling back to `HEAD~1..HEAD` only when no base resolves — with an explicit WARNING when it does. Three regression tests build a real two-commit branch whose script change lands in the first commit. Suite 399 → 407.
- `scripts/reset-to-template.mjs`'s `TASK_LOG.md` stub was missing its markdown table separator row, so every reset produced a `TASK_LOG.md` that never rendered as a table (Issue #164, PR #165, merged as `7679e21`). Added the separator plus a regression assertion covering both the `TASK_LOG.md` and `RISKS.md` stubs. Recorded here because PR #165's own closeout had not been performed.

### Security
