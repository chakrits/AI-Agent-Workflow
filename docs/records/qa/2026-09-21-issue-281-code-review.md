# Code Review Request: Issue #281 Core Bootloader Source Contract

## Status

Pending independent review — this record is a review request, not review evidence or an approval.

## Candidate

- Commit: `9d170c6` (`feat(context): make core bootloader authoritative`)
- Work item: [Issue #281](https://github.com/chakrits/AI-Agent-Workflow/issues/281)
- Design authority: ADR-0034 and `docs/records/sdd/2026-09-21-issue-280-gpt6-astra-modernization-sdd.md`

## Intent

Make the repository's SHA-validated Tier 1 source set match its active Core Bootloader: `AGENTS.md` then `docs/workflow/core-bootloader.md`.

## Review Focus

1. `context-source-matrix/v2` must use exactly those two boot paths for all 11 roles; on-demand rows must retain their route and selected skill source.
2. A two-source boot context must remain fail-closed for source-set/hash errors, while on-demand packs retain their minimum source count.
3. Editing the bootloader must plan both `repin:source-matrix` and `validate:context-budget`; the Tier 3 total must not double-count the Tier 1 budget.
4. The task-trigger map must preserve the existing human approval and security boundaries without pulling #282–#284 into this change.

## Developer Evidence

- Red tests: `node --test test/validate-context-compatibility.test.mjs` and `node --test test/edit-guards.test.mjs` failed against the prior v1 contract.
- Green: focused 29 tests, `npm test` 788/788, `validate:context-compatibility`, `validate:context-budget`, `validate:contracts`, `validate:project-state`, `adr:audit`, skill/adapter parity, and `git diff --check`.

## Deliberately Out of Scope

- Safe autonomy and proportional verification (#282)
- Skill metadata/catalog changes (#283)
- Behavior corpus and rollout evidence (#284)
