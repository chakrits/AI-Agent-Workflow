# CHANGELOG.md

## Unreleased

### Added
- `scripts/repin-source-matrix.mjs` (`npm run repin:source-matrix`) recomputes and rewrites stale sha256 entries in `test/fixtures/context-pack-v1/required-source-matrix.json`, so editing a pinned canonical or skill file no longer requires hand-computing hashes to fix the resulting test failures. Documented in `docs/operating-model/CONTEXT_BUDGET.md`. (Issue #215, PR #217)
- `scripts/validate-adapter-parity.mjs` (`npm run validate:adapter-parity`) gives role adapters the same cross-host drift gate the 38 skills already have: adapter bodies below frontmatter must match across `.claude/agents/`, `.agents/agents/`, and `.agent/agents/` (the latter two newly seeded), while `name:` is pinned equal and `description`/`tools` may differ per host. Wired into both CI hosts. 5 previously-unwired adapters now route to their existing skills. Relocating `role-definitions.md`'s Terminal Dispatch section into `task-execution-mode.md` recovered context-budget headroom from 15 to 616 tokens. (Issue #212, PR #232; design decided in ADR-0021)
- `release-readiness-checklist` skill (all three trees) gives Release Agent the dedicated work-instruction skill it lacked, distilled from its existing `role-definitions.md` section — versioning/changelog, release evidence, triple rollback confirmation, deployment strategy. Closes Issue #212 (IMP-006) in full. (Issue #212, PR #234)

### Changed
- Blank-template reset completed through PR #205 (`aa2a871`): project-state files and historical record directories were reset in the approved isolated operation; canonical workflow/skill files and Git history were preserved.

### Fixed
- `scripts/reset-to-template.mjs` no longer blanks `DECISIONS.md` when it holds recorded ADRs; the reset refuses and names the ids at risk unless `--reset-decisions` is passed explicitly. `scripts/adr-audit.mjs` now fails when the real ADR count drops against the merge-base comparison commit, closing the blind spot where a reset blanked both `DECISIONS.md` and `TASK_LOG.md` in the same commit and the audit reported PASS on a 0/0 ratio. (Issue #208, PR #209)
- GitLab CI now runs the same portable validators as GitHub CI (`validate:clearable-refs`, `validate:dispatch-receipts`, `validate:workflow-evidence`), and `scripts/validate-ci-parity.mjs` fails the build if the two hosts drift apart again. (Issue #210, PR #211)
- `scripts/reset-to-template.mjs` no longer blanks `RISKS.md` when it holds recorded entries; the reset refuses and names the ids at risk unless `--reset-risks` is passed explicitly. `scripts/validate-risk-register.mjs` now fails when the total risk-entry count drops against a comparison commit, the same class of blind spot Issue #208 closed for `DECISIONS.md`. (Issue #214, PR #216)
- Two test-coverage gaps left open by Issue #214 and #215's QA: `validate-risk-register.mjs`'s intentional fail-open behavior when a comparison commit is unreadable is now locked in by a test; `repin-source-matrix.mjs`'s round-trip-guard test now uses a deliberately stale fixture hash so it proves write-prevention rather than just that the guard throws. No production code changed. (Issue #220, PR #221)

### Security
