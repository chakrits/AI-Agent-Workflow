# Code Review Record — Issue #237 AC-14

- Scope: AC-14 documentation consumer compatibility review
- Baseline: `d978a66b13834031466e24102d8cf315d937ccca`
- Rework: 0/2
- Developer result: `DONE_WITH_CONCERNS` — one consumer required a measured-baseline refresh; four were compatible and unchanged. The concern is informational: those four have no executable parser seam.

## Traceability

| Consumer | Dependency inspected | Decision | Evidence |
|---|---|---|---|
| `docs/operating-model/CONTEXT_BUDGET.md` | Per-file catalog size, total budget, and baseline metadata | Changed measured values to the post-collapse baseline: 26,196 / 30,000; catalog 19,034 chars / 4,758 tokens | `npm run validate:context-budget` on baseline; table now records exact output |
| `docs/operating-model/README.md` | Read-order link to `SKILL_CATALOG.md` | No change; references the catalog file, not removed headings or columns | Source inspection and AC-14 consumer test |
| `docs/vault/00-Index.md` | Catalog link and hand-maintained platform skill inventory | No change; inventory links skill files and does not parse catalog internals | Source inspection and AC-14 consumer test |
| `docs/workflows/stabilize-core.md` | Required-artifact link to `SKILL_CATALOG.md` | No change; requires the catalog artifact, not its former row/block shape | Source inspection and AC-14 consumer test |
| `docs/operating-model/AGENT_EVALUATION_CHECKLIST.md` | Skill-selection reference to `SKILL_CATALOG.md` | No change; tells agents where to select a skill and does not parse headings or columns | Source inspection and AC-14 consumer test |

## Implementation review

The five consumers were read against the current five-column catalog. Only the budget document carried stale values from before AC-08/09; the other four remain semantically valid. No catalog row, AC-11 threshold, or AC-13 policy changed. The focused test checks that every named consumer retains the catalog reference and that removed per-skill heading dependencies have not reappeared.

## Verification

- RED: the focused budget assertion fails against the pre-change stale baseline.
- GREEN: focused AC-14 consumer tests pass after the budget refresh.
- `npm test`: 725 tests passed.
- Validators: context budget 26,196/30,000; contracts; project state; review gate; CI parity; skill parity (39/39); adapter parity (11/11); and context compatibility all passed.
- Source-matrix repin was idempotent: both runs reported no changes. `git diff --check` passed.
- Mutation probes killed budget-value deletion, catalog-reference retargeting, and stale-heading restoration mutants.

## Limitations

The four unchanged consumers are link and inventory readers; no executable parser seam exists in those files. Their compatibility is therefore established by source inspection plus the focused structural guard, rather than runtime execution of a consumer.

## Review decision

Ready for independent QA after all packet verification commands complete. No PR or merge is authorized by this record.
