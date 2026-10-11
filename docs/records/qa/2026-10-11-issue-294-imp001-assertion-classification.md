# IMP-001 — Assertion classification and RED probes (Issue #294)

## Scope and immutable baseline
Human-approved design/ADR-0036; implementation-start instruction received 2026-10-11.
Baseline: `d36a48cbfed146e519ffa037399edd6d1d7dcbfa`. This checkpoint changes records only, not enforcement.
Developer-authored classification, not independent QA acceptance. No AC is marked Pass.

## Classification rules

- **Library**: live inventory, fixed IDs/order, skill prose/templates, mirror equality, catalog rows or vault skill links. Retire from mandatory execution or move to explicitly invoked audit.
- **Mixed**: split the optional-library read/assertion from core checks; do not delete the whole test.
- **Core**: retain contracts, lifecycle/readiness, security/human gates, role policy, core templates/index, authority and source integrity.
- **Synthetic audit unit**: retain diagnostic algorithm tests using temporary fixtures; audit capability is not live repository enforcement.

The initial keyword scan was corrected against test bodies and shared path arrays. Test ranges are not deletion ranges: helper declarations can sit between tests.
Anything not explicitly identified below remains protected pending source-level review. This manifest is not permission for blanket deletion.

## Live content assertions: test/validate-contracts.test.mjs
Baseline one-based start lines; resolve against the full SHA above.

| Start | Class | Existing test |
|---|---|---|
| 29 | library | groups_catalog_rows_under_the_six_domains_without_changing_row_schema |
| 50 | library | vault_index_has_no_manual_skill_count |
| 55 | library | vault_index_links_every_canonical_skill_exactly_once |
| 74 | library | catalog_overlap_boundaries_keep_distinct_triggers_and_next_routes |
| 100 | library | every .agents/skills/ directory is named somewhere in SKILL_CATALOG.md |
| 113 | library | SKILL_CATALOG.md uses the approved five-column rows without stale skill headings |
| 144 | library | Frontend UI Engineering stays discoverable and routes UI work safely |
| 177 | mixed | all dynamic-workflow adapters point to the canonical Bug Fix contract |
| 201 | library | requirement-brainstorming adapters all carry the assumptions-surfacing technique |
| 401 | mixed | dynamic-workflow adapters require receipt evidence instead of prose-only non-human routing |
| 488 | mixed | work-item and change-request templates preserve lifecycle readiness ownership across platforms |
| 765 | mixed | Claude, portable, and Antigravity adapters discover canonical agent personas |
| 835 | mixed | documentation templates preserve evidence discipline and canonical BA artifact routing |
| 895 | mixed | QA Agent canonical rule carries its policy and the new evidence, contract, and NFR rules |
| 971 | library | the four new QA testing-discipline skills carry their required content |
| 1003 | library | SKILL_CATALOG.md carries all four new QA skill entries and the Planned Skills clarifying note |
| 1053 | mixed | git-workflow-and-versioning skill exists in all three adapter copies with the commit and change-summary rules |
| 1074 | library | tdd-implementation adapters all carry the test-sizing, mock-preference, and DAMP rules |
| 1095 | library | static-logic-review is byte-identical across skill trees and keeps dry-run evidence boundaries |
| 1120 | mixed | static-logic-review routing distinguishes adjacent QA skills and routes inferred gaps to the right owner |
| 1147 | library | code-review-gate adapters all carry structural remedies, dead code hygiene, and dependency discipline |
| 1164 | library | implementation-planning adapters all carry dependency mapping, vertical slicing, task sizing, and checkpoints |
| 1176 | mixed | Security Reviewer carries the scan checklist, severity scale, and fix-before-merge rule |
| 1198 | mixed | Release Agent routes release policy to its canonical skill |
| 1229 | mixed | Config Agent carries the config/data boundary, reload behavior, flag lifecycle, and escalation guard |
| 1254 | mixed | Data Agent carries non-destructive mechanics, the SA boundary, re-run safety, PII routing, and escalation guard |
| 1280 | library | qa-playwright-testing carries a technical reference, a debugging workflow, and the browser content security boundary |
| 1306 | library | .agent/skills/ and .agents/skills/ carry identical skill directory names, with byte-identical content for the skills this work touches |
| 1348 | library | the three new test-tooling skills carry their required content |
| 1372 | library | SKILL_CATALOG.md carries the three new test-tooling skill entries |
| 1409 | library | test-tooling skill template files are byte-identical across all three platforms |
| 1421 | library | the three new test-tooling skills are byte-identical SKILL.md across all three platforms |
| 1434 | library | the seven new API skills carry their required content |
| 1497 | library | api-testing-tooling carries the Postman + Newman section and template |
| 1505 | library | the 7 new API skills are byte-identical SKILL.md across all three platforms |
| 1526 | library | the new Postman collection template is byte-identical across all three platforms |
| 1575 | library | SKILL_CATALOG.md carries all 7 new API skill entries |
| 1594 | library | docs/vault/00-Index.md links all 7 new API skills without a manual count |
| 1612 | library | the 4 new Developer Agent skills carry their required content |
| 1643 | library | security-review carries the exposed-secret incident-response procedure |
| 1651 | library | the 4 new Developer Agent skills are byte-identical SKILL.md across all three platforms |
| 1677 | library | SKILL_CATALOG.md carries all 4 new Developer Agent skill entries |
| 1931 | mixed | Management Status Update remains Thai-first, evidence-bound, and portable |
| 1988 | library | functional-test-design SKILL.md carries the Decision Table and State Transition techniques with naming convention rows and a determinism worked example (Issue #143) |
| 2010 | library | functional-test-design SKILL.md Full Mode outline item 10 is renamed to Test Design Techniques without renumbering items 11-18 |
| 2019 | library | functional-test-design template section 10 is renamed to Test Design Techniques with Decision Table and State Transition subsections, and sections 11-18 keep their numbers |
| 2034 | library | functional-test-design template Coverage Matrix (section 15) has Decision Table and State Transition columns |
| 2052 | library | functional-test-design template Coverage Matrix (section 15) has Automated (Y/N) and Test Ref columns after Status (Issue #149) |
| 2068 | library | test-quality-discipline SKILL.md carries a checklist item for TC-ID to automated-test traceability (Issue #149) |
| 2078 | library | test-quality-discipline SKILL.md is byte-identical across all three platforms after the Issue #149 TC-ID checklist addition |
| 2088 | library | functional-test-design SKILL.md is byte-identical across all three platforms after the Issue #143 technique expansion |
| 2098 | library | SKILL_CATALOG.md functional-test-design entry mentions Decision Table and State Transition techniques |
| 2106 | library | defect-analysis SKILL.md carries Summary field, severity-to-impact worked mapping, and PII-placeholder note (Issue #152) |
| 2122 | library | defect-analysis SKILL.md is byte-identical across all three platforms (Issue #152) |
| 2145 | library | SKILL_CATALOG.md carries the real defect-analysis entry and no longer lists it as Planned (Issue #152) |
| 2164 | mixed | docs/vault/00-Index.md links defect-analysis and TEST_REPORT.md points to DEFECT_REPORT.md (Issue #152) |

## Mixed split obligations
- 177/401: `adapterPaths` includes three skill files, optional `.agents/workflows/dynamic-workflow.md`, and core `.claude/agents/orchestrator-agent.md`. Preserve the core role adapter's bug-fix/receipt assertions.
- 488: retain all four GitHub/GitLab Issue/PR template checks; remove only skill reads and their two assertions.
- 765: retain `personaAdapterPaths` core role assertions, separate portable skill reads. Workflow markdown is optional under approved OQ-03.
- 835: retain every core template/BA routing assertion; isolate two debugging-skill assertions.
- 895: preserve role, adapter, test-plan/report evidence/contract/NFR rules; isolate playwright skill checks.
- 1053: retain AGENTS git discipline, decouple catalog and three skill copies. IMP-005 must make core discipline independent of the named skill.
- 1120: retain QA ownership/escalation, routing, AGENTS boundaries; isolate catalog assertions.
- 1176: preserve role/adapter severity and fix-before-merge plus security template; isolate security skill.
- 1198: preserve release evidence/rollback policy independently in core before removing the required skill route; do not retain the assertions forbidding core release policy sections.
- 1229/1254: retain role/adapter/template config/data safety; isolate skill reads.
- 1931: retain role communication-vs-handoff/QA/RCA/lifecycle/approval boundaries; isolate skill/catalog/vault assertions.
- 2164: retain TEST_REPORT → DEFECT_REPORT pointer; isolate vault skill link.
Library tests 1280 (browser trust boundary), 1643 (secret incident response), and 1095 (static-review limits) need a core-policy coverage check before retirement. Approved decoupling does not authorize removing safety behavior.

## Other affected test files and helper coverage
| File / baseline tests | Classification and next action |
|---|---|
| issue-237-ac14-consumers:48,79 | Historical live catalog inventory/layout and fixed budget snapshot; retire live coupling, retain historical evidence itself unchanged |
| validate-workflow-playbooks:74 | Mixed reachability scan: remove skill-tree dependency, retain core routing/transitive reachability; other five tests remain core; audit optional skill links separately |
| validate-ci-parity:123,127 + assertSkillCatalogCi helper | Replace mandatory catalog-presence contract with absence-from-mandatory-graph contract; preserve generic extraction/parity/comment/empty-job negative tests, including line103 |
| validate-skill-catalog (8), validate-skill-parity (5), validate-skill-usage (17) | Keep all 30 synthetic diagnostic tests, truthful failing exit statuses; no live inventory assertion |
| validate-context-compatibility; context-shadow-adapter | Migrate current matrix to v3 core-only, preserve authority/fallback/path/order/hash negatives; replace skill-specific invalid-row case with reserved-empty-field test |
| repin-source-matrix | Preserve all 8 core hash-write/no-op/atomicity/missing-path tests; update only current fixture contract |
| validate-context-budget | Preserve budget algorithms and 2,500/1,500/30,000 limits; remove catalog from core file set, not limit enforcement |
| edit-guards | Preserve core repin/budget/Claude role parity/advisory failure coverage; replace optional skill-path guard expectations with no guard |

Role-routing tests at1382/1536/1549/1563/1664/2154 read core role documents/adapters, not the live skill files. Keep them; review wording only where IMP-005 changes optional discovery policy.
Read shared fixtures/imports when changing these tests; historical v2 evidence is not a current live skill registry. A passing smaller test count alone is not acceptance.

## Fresh RED evidence
Unchanged baseline focused command:
`node --test test/validate-contracts.test.mjs test/validate-ci-parity.test.mjs test/validate-skill-catalog.test.mjs test/validate-context-compatibility.test.mjs`
Observed exit0, 146 tests/pass, 0 failures/skips. Direct baseline `validateSourceMatrix` returned valid:true/errors:[].

Each archive was created with `git archive HEAD | tar -x -C <mktemp-directory>` at the baseline SHA; locked installed node_modules copied for execution, no dependency version change.
- HC-001: add only `.agents/skills/contributor-probe/SKILL.md`, valid name/frontmatter, description `Contributor instruction used only for isolated Issue 294 RED evidence.`, body `Read the approved requirement before implementing it.`.
- Catalog CLI exits1: two missing mirror inventories, one missing catalog row, three missing vault links. Selected content tests at55/100: 0 pass, 2 fail for missing contributor-probe.
- Catalog-only prose probe: insert `Contributor-only explanatory prose for the isolated Issue 294 RED probe.` after the title. Direct matrix validation exits1: exactly11 stale catalog hash errors; core files unchanged.
- `diff -qr --exclude=node_modules --exclude=.git <baseline-worktree> <probe>` reports only the new skill directory for HC-001 and only SKILL_CATALOG.md for the second probe.
- Initial archive runs lacked dependencies (yaml/ajv); these setup errors are not counted as RED. Full compatibility CLI also requires Git history for sourceCommit, so its archive corpus error is not evidence; the corrected direct matrix call isolates the intended seam.

Exact successful-reproduction commands and output:
```text
node scripts/validate-skill-catalog.mjs
exit: 1
.claude inventory: missing contributor-probe
.agent inventory: missing contributor-probe
Catalog: contributor-probe has 0 entries; expected exactly one
Vault index .agents: contributor-probe has 0 entries; expected exactly one
Vault index .claude: contributor-probe has 0 entries; expected exactly one
Vault index .agent: contributor-probe has 0 entries; expected exactly one
40 canonical skills; 40 descriptions; 4422 description code points.
node --input-type=module -e 'import {loadContextPackFixtures,validateSourceMatrix} from "./scripts/lib/context-compatibility-v1.mjs"; const {matrix}=await loadContextPackFixtures(process.cwd()); const r=await validateSourceMatrix(process.cwd(),matrix); console.log(JSON.stringify(r,null,2)); process.exitCode=r.valid?0:1;'
exit: 1
{
  "valid": false,
  "errors": [
    "source matrix: stale hash for docs/operating-model/SKILL_CATALOG.md",
    "source matrix: stale hash for docs/operating-model/SKILL_CATALOG.md",
    "source matrix: stale hash for docs/operating-model/SKILL_CATALOG.md",
    "source matrix: stale hash for docs/operating-model/SKILL_CATALOG.md",
    "source matrix: stale hash for docs/operating-model/SKILL_CATALOG.md",
    "source matrix: stale hash for docs/operating-model/SKILL_CATALOG.md",
    "source matrix: stale hash for docs/operating-model/SKILL_CATALOG.md",
    "source matrix: stale hash for docs/operating-model/SKILL_CATALOG.md",
    "source matrix: stale hash for docs/operating-model/SKILL_CATALOG.md",
    "source matrix: stale hash for docs/operating-model/SKILL_CATALOG.md",
    "source matrix: stale hash for docs/operating-model/SKILL_CATALOG.md"
  ]
}
```
Selected test reproduction: `node --test --test-name-pattern='vault_index_links_every|every .agents/skills/' test/validate-contracts.test.mjs`.
Raw test output was observed in this session, not published as an immutable log artifact. Temporary probes are not candidate commits or QA acceptance.

## Contributor probe implementation contract (next slices)
Use the approved Test Plan case IDs and isolated exact-candidate clones. Apply one perturbation per case; compute before/after hashes of every companion file, capture command inventory from actual mandatory CI, record stdout/stderr and exit.
HC-001/002/003/004/005, EP-001/002/003 and BVA cases must pass mandatory commands without mirror/catalog/vault/repin edits. Explicit audit negatives must still fail. Core-negative cases must fail retained controls.
The explicit QA harness must live outside default node test discovery and must not recursively invoke npm test from a test. Historical/native availability remains separate.
No RED-only code commit/merge. IMP-002 should retire/split only identified live assertions alongside green regressions, then follow IMP-003–006.

## Checkpoint evaluation / next action
Scope/source/evidence/minimal change/risks/next owner: checked. Current implementation remains unchanged; no security review, independent QA, PR or merge acceptance claimed.
Next: Developer executes IMP-002; QA/Security later verify exact final candidate under IMP-006. Human merge approval remains mandatory. No new design question or approval request.
