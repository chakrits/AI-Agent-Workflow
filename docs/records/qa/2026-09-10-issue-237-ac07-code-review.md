# Developer Code Review — Issue #237 AC-07

## Scope

Candidate `codex/issue-237-ac07-rework` is based on current main `76b48c2346034f2a9b26818d5943ef13e8d92a23` and relocates the Release Agent policy owned by
`docs/workflow/role-definitions.md` to the existing `release-readiness-checklist` skill. The
source now contains one imperative pointer. The R-001 provenance sentence moved with the hosted
CI policy into all three mirrored skill trees.

## Review Result

**PASS — ready for independent QA.** Rework count: 1/2.

## Changed Files

- `docs/workflow/role-definitions.md`: removed the four duplicated policy subsections and added
  the pointer to `.agents/skills/release-readiness-checklist/SKILL.md`.
- `.agents/skills/release-readiness-checklist/SKILL.md`, `.claude/...`, `.agent/...`: preserved
  the four policy sections and added the exact R-001 provenance sentence.
- `test/validate-contracts.test.mjs`: contract test now requires the pointer, source block
  removal, destination policy, and provenance.
- `test/fixtures/context-pack-v1/required-source-matrix.json`: repinned hashes for the two
  changed pinned files.
- `docs/records/implementation-plan/2026-09-10-issue-237-ac07.md`: implementation plan.
- `PROJECT_STATUS.md`: one AC-07 completion entry appended; current main state and history otherwise preserved.
- `TASK_LOG.md`: one AC-07 rework handoff entry appended.

## Source-to-Destination Comparison

Compared the four source subsections at the base commit against
`.agents/skills/release-readiness-checklist/SKILL.md` after the edit. Every normative statement
is present in the destination: SemVer classification and tag authority; same-change changelog
categories and user-impact wording; all four release evidence checks; the blocking behavior for
missing evidence; all three applicable rollback paths and the migration/config readiness rule;
and deployment strategy examples, blast-radius statement, and human-operator boundary. The R-001
provenance parenthetical is present exactly in the destination and absent from the source block.
The `.claude/` and `.agent/` copies are byte-identical to `.agents/`.

## Review Focus and Findings

| ID | Severity | Finding | Result |
|---|---|---|---|
| CR-237-01 | Question | Could source policy disappear while the destination still satisfies broad content checks? | Contract test requires source pointer and absence of all four source headings; mutation probe killed deletion of the pointer and deletion of destination policy. |
| CR-237-02 | Question | Could one mirrored platform lose the provenance or policy? | `validate:skill-parity` and direct byte comparison cover all three copies; mutation probe against routing/source registration was rejected by parity/contract validation. |

No Critical, Major, or Minor findings. No dead code or new dependency.

## Verification

Commands and results are recorded in the Developer handoff. The required suite passed: `npm test` 721/721; context budget 28,588/30,000; contracts,
project state, review gate, CI parity, skill parity, adapter parity, context compatibility, repin
idempotence, and `git diff --check` all passed.

## Mutation Probes

1. Delete the R-001 provenance from the destination: the focused contract assertion fails.
2. Restore a source policy heading or remove the imperative pointer: the focused contract assertion
   fails.
3. Remove a mirrored skill or alter its source registration: skill/adapter parity or contract
   validation fails.

## Deliberately Out of Scope

AC-08/AC-09 catalog collapse, AC-11 budget changes, AC-13, AC-14, Issue #244, unrelated policy
cleanup, PR creation, and merge.

## Handoff

Independent QA Agent is the next owner. Human approval remains required before any merge.
