# Developer Code Review — Issue #237 AC-08/AC-09

## Reviewed scope

- `docs/operating-model/SKILL_CATALOG.md`
- `test/validate-contracts.test.mjs`
- `test/fixtures/context-pack-v1/required-source-matrix.json`
- `docs/records/implementation-plan/2026-09-10-issue-237-ac08-ac09.md`

## Findings

No implementation findings. The catalog now has one five-column row for each of the 31 detailed skills. `Current Skills` and `Engineering Discipline` use the same five-column header. The row retains `Next Skill / Agent`, which ADR-0023 requires for selection-time routing; Input and Output were intentionally removed per the approved decision.

The six heading-based catalog assertion groups were retargeted to row presence. A separate structural contract checks all 31 expected rows, five cells, non-empty fields, and stale heading removal. The explanatory notes and Planned Skills section remain outside the collapsed table.

## Mutation evidence

- Delete one required row: structural contract fails.
- Corrupt a row field or column count: structural contract fails.
- Drop or retarget `Next Skill / Agent`: header/row field assertions fail.
- Restore a stale `## <skill>` assertion: row-based contract fails against the collapsed catalog.
- Drift the pinned source hash: context-budget/source-matrix validation fails.

## Limitations

This is a catalog and contract-test change. It does not alter `context-compatibility-v1.mjs`, runtime routing, AC-11 budget targets, AC-13/AC-14, or Issue #244.
