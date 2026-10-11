# IMP-002A — Retire fixed catalog and vault-skill inventory assertions

## Scope / authorization
Issue #294; approved IMP-002, explicitly authorized to continue on 2026-10-11.
Baseline: `9c90fc85c6bfdb253afdc2d152ec962449ce5171`.
This is the first green sub-slice of IMP-002, not completion of IMP-002 or decoupling acceptance.
Changed: `test/validate-contracts.test.mjs`, plus state/evidence records.
No production validator, CI job, matrix/hash, skill file, catalog, vault content, dependency or readiness control changed.

## Retired assertions and rationale
These are library assertions identified in IMP-001. They enforce editorial registration/order/prose, not core policy; diagnostic algorithms retain independent fixture tests.

| Baseline start | Retired test |
|---|---|
| 29 | groups_catalog_rows_under_the_six_domains_without_changing_row_schema |
| 50 | vault_index_has_no_manual_skill_count |
| 55 | vault_index_links_every_canonical_skill_exactly_once |
| 74 | catalog_overlap_boundaries_keep_distinct_triggers_and_next_routes |
| 100 | every .agents/skills/ directory is named somewhere in SKILL_CATALOG.md |
| 113 | SKILL_CATALOG.md uses the approved five-column rows without stale skill headings |
| 1003 | SKILL_CATALOG.md carries all four new QA skill entries and the Planned Skills clarifying note |
| 1372 | SKILL_CATALOG.md carries the three new test-tooling skill entries |
| 1575 | SKILL_CATALOG.md carries all 7 new API skill entries |
| 1594 | docs/vault/00-Index.md links all 7 new API skills without a manual count |
| 1677 | SKILL_CATALOG.md carries all 4 new Developer Agent skill entries |
| 2098 | SKILL_CATALOG.md functional-test-design entry mentions Decision Table and State Transition techniques |
| 2145 | SKILL_CATALOG.md carries the real defect-analysis entry and no longer lists it as Planned (Issue #152) |

Removed the now-unused `catalogDomains` and `availableCatalogRows` helpers with their sole consumers. No unrelated helper cleanup.
All other 99 test bodies remain byte-identical to baseline (112 before, 99 after, exactly13 retired). Mixed tests were not modified; core vault/template checks remain.
The 30 synthetic catalog/parity/usage diagnostic tests remain unchanged, including missing/stale/duplicate metadata, Unicode boundary, drift and failing CLI exit cases.
Existing broad CI enforcement remains until IMP-004; this intermediate slice does not yet make skill-only changes pass mandatory CI.

## RED / regression evidence
- RED reused and rerun from IMP-001's isolated canonical-only skill probe: tests `vault_index_links_every_canonical_skill_exactly_once` and `every .agents/skills/ directory is named somewhere in SKILL_CATALOG.md` fail2/2 for missing registration, not test setup. These requirements are explicitly retired; no replacement assertion pretends that deleting tests is end-to-end GREEN.
- Candidate focused: `node --test test/validate-contracts.test.mjs test/validate-skill-catalog.test.mjs test/validate-skill-parity.test.mjs test/validate-skill-usage.test.mjs`: 129 pass, 0 fail/skip, exit0.
- Full regression: `npm test -- --test-reporter=tap`: 795 pass, 0 fail/skip, exit0 using authorized execution outside the restrictive filesystem sandbox.
- Contracts, context compatibility, CI parity, live catalog diagnostic and `git diff --check`: exit0. Context corpus/matrix valid; catalog39/descriptions39/codepoints4352, unchanged.
- No new production behavior, dependency or test seam; the approved retirement uses existing RED evidence rather than adding source-text change-detector tests.

## Debug breadcrumb: full-suite execution permission
| Experiment | Observation | Interpretation |
|---|---|---|
| Sandboxed full suite | 794 pass/1 fail: AC-08 relative --body-file refusal; EPERM opening worktree/ac08-decoy.md | Fixture write permission hypothesis |
| Repeat sandboxed suite | Same test/location/error, before calling runHook | Deterministic setup failure, not readiness assertion or catalog diff |
| Source trace: readiness test1155–1178 | writeFileSync(rootDecoy) precedes try/runHook; finally removes it | Permission failure occurs before behavior under test; no fixture/testing change appropriate |
| Authorized execution, identical files/command | 795/795 pass | Filesystem restriction ruled in; code regression hypothesis ruled out for this failure |
No test was weakened or skipped. Existing test cleanup removed its own decoy. No unrelated readiness fix was made.

## Verification / review limits
Developer verification only. No independent code review, QA/Security acceptance, hosted PR/readiness or merge result claimed. All Issue AC outcomes remain Pending.
Scope/source grounding, assumptions, evidence, minimal change, safety boundary and next action checked against Agent Evaluation Checklist. No new design decision; ADR-0036 remains authoritative.

## Next work / owner
Developer: continue IMP-002 with live skill-content/mirror assertions and mixed splits, AC-14 consumers and playbook reachability. Safety-content cases need core-policy coverage before retirement; no blanket deletion.
Independent QA/Security review exact final candidate at IMP-006. Human merge approval remains mandatory.
