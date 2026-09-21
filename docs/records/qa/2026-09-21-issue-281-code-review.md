# Code Review Request: Issue #281 Core Bootloader Source Contract

## Status

Round 1 independent review found a Major NFR mismatch. A scoped follow-up is submitted for re-review; this
record is not an approval.

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

## Round 1 Independent Review Result

- Finding: the SDD requires the Tier 1 bootloader to stay at or below 2,500 approximate tokens, while the
  validator allowed 3,500 and the prior candidate measured 2,721.
- Resolution submitted: restore the validator and boundary test to 2,500; reduce the bootloader by replacing
  its duplicated skill table with a task-triggered pointer to the canonical catalog; re-pin its SHA matrix.
- Re-review focus: confirm the follow-up measures at or below 2,500, fails at 2,501, and preserves the exact
  two-source boot contract plus on-demand behavior.

## Deliberately Out of Scope

- Safe autonomy and proportional verification (#282)
- Skill metadata/catalog changes (#283)
- Behavior corpus and rollout evidence (#284)
