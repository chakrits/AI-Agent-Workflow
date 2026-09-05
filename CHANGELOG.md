# CHANGELOG.md

## Unreleased

### Added

### Changed
- Blank-template reset completed through PR #205 (`aa2a871`): project-state files and historical record directories were reset in the approved isolated operation; canonical workflow/skill files and Git history were preserved.

### Fixed
- `scripts/reset-to-template.mjs` no longer blanks `DECISIONS.md` when it holds recorded ADRs; the reset refuses and names the ids at risk unless `--reset-decisions` is passed explicitly. `scripts/adr-audit.mjs` now fails when the real ADR count drops against the merge-base comparison commit, closing the blind spot where a reset blanked both `DECISIONS.md` and `TASK_LOG.md` in the same commit and the audit reported PASS on a 0/0 ratio. (Issue #208, PR #209)
- GitLab CI now runs the same portable validators as GitHub CI (`validate:clearable-refs`, `validate:dispatch-receipts`, `validate:workflow-evidence`), and `scripts/validate-ci-parity.mjs` fails the build if the two hosts drift apart again. (Issue #210, PR #211)

### Security
