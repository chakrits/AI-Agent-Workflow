# Code Review Request — Workflow Playbooks Quality Upgrade (Issue #95)

## Intent

Self-review of the new test file added while implementing `docs/superpowers/specs/2026-07-25-workflow-playbooks-quality-upgrade.md` (Fixes B, C, A) — a documentation-only quality upgrade to the 12 playbooks in `docs/workflows/`. This satisfies `scripts/validate-review-gate.mjs`'s requirement that any PR touching a `.mjs`/`.js` file carry a structured review record before merge.

## Changed Areas

- `test/validate-workflow-playbooks.test.mjs` (new file) — 5 `node:test` cases covering the contract reference, wiki-link presence, wiki-link target resolution, Fix C heading coverage, and a plain-text regression guard.
- `docs/workflows/new-feature.md` — Canonical Contract / Backward Routing (Fix B) and Use When / Gate Rules / Handoff (Fix C).
- `docs/workflows/config-change.md`, `data-change.md`, `code-review-gate.md`, `tdd-implementation-flow.md` — Fix C expansion.
- All 12 `docs/workflows/*.md` files — Fix A outbound wiki links.

## Review Focus

1. Does the wiki-link presence test (`content.includes('[[')`) avoid the false-positive/false-negative risk of a regex-based bracket-matcher, per the spec's explicit "fixed-string check" instruction?
2. Does the target-resolution test resolve each `[[path|label]]` relative to the *playbook's own directory* (`path.dirname(playbook)`), not `process.cwd()`, so `../../.agents/skills/...`-style links from `docs/workflows/` resolve correctly to repo-root `.agents/skills/...`?
3. Is the required-heading test scoped to exactly the 5 Fix C files, with no assertion that generalizes to the other 7 playbooks (`bug-debug-fix.md`, `ci-failure-debug.md`, etc.), which intentionally use different heading text (`## Primary Flow`, `## Required Gate`, `## Quality Gate`) and are not required to conform?
4. Does the regression guard for `docs/workflows/bug-fix.md` assert the exact same plain-text pattern `test/validate-contracts.test.mjs:107` depends on, so a future edit that silently removed the plain-text path (in favor of only a wiki link) would be caught in two places, not one?
5. Were all wiki-link targets added in Fix A verified against the real filesystem before being committed (not just trusted from the spec's earlier BA verification), given files can move between the BA analysis and implementation?

## Findings

- Test 2 uses `String.prototype.includes('[[')`, a fixed-string check as the spec requires — it does not attempt bracket-depth matching and cannot mis-flag a false positive/negative on malformed brackets, at the cost of not itself validating wiki-link syntax (link-syntax validity is implicitly exercised by test 3's extraction regex instead).
- Test 3 resolves every link with `path.resolve(path.dirname(playbookPath), target)`, confirmed manually against a `../../.agents/skills/...` link and an `../../TASK_LOG.md` link before writing the test, and again via a standalone `awk`/`python3 os.path.normpath` sweep over every extracted target (34 links across 12 files) with zero unresolved paths.
- Test 4 is deliberately keyed to only 5 explicit file paths (`config-change.md`, `data-change.md`, `new-feature.md`, `code-review-gate.md`, `tdd-implementation-flow.md`) rather than iterating `readdir(docs/workflows)` — this is a conscious choice so the test cannot silently expand into a repository-wide playbook schema check if a 13th playbook is added later, matching the spec's explicit "must NOT become a repository-wide playbook schema check" instruction.
- Test 5 duplicates one assertion already present in `test/validate-contracts.test.mjs:106-108` on purpose — the spec's Critical Constraint section treats this as a load-bearing regression guard, and per the BA-agent's decision on test-file placement, `validate-workflow-playbooks.test.mjs` is not permitted to import from or depend on `validate-contracts.test.mjs`, so the only way to add playbook-focused coverage of this same fact is a second, independent assertion.
- `docs/templates/BUG_POSTMORTEM.md` was confirmed present on disk (`ls docs/templates/`) immediately before adding its wiki link in `validated-bug-postmortem.md`, so the spec's conditional target was included rather than dropped.
- No script (`scripts/*.mjs`) reads `docs/workflows/*.md` content, confirmed via `grep -rn "docs/workflows/" test/ scripts/` before editing — the only pre-existing consumer of playbook text in the test suite is the one line in `validate-contracts.test.mjs` already covered by Test 5.
- No new dependency, secret, or write-capable script logic was introduced. `npm test` (206/206) and `npm run validate:contracts` both pass after all three fixes.

## Deliberately Not Enforced

- No CI-enforced schema requires every playbook to carry Use When/Gate Rules/Handoff sections — only the 5 Fix C files are checked, matching the spec's explicit exclusion of a "Repository-wide CI schema for playbooks."
- The heading regex patterns (`/^##\s+Use when/im` etc.) match only the exact heading text this implementation wrote into the 5 files; they are not a general-purpose heading-variant matcher for the other 7 playbooks' differently-worded headings (`## Primary Flow`, `## Required Gate`, `## Quality Gate`), which remain untouched and untested by this file.
