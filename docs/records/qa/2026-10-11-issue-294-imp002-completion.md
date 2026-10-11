# IMP-002 completion checkpoint — Issue #294

## 1. Completion claim / boundaries
Developer implementation of IMP-002 is complete: live skill-content assertions and mixed splits, AC-14 consumers, and playbook dependency removal. Overall Issue #294 is NOT complete or ready to merge.
Baseline: `5d29a940243bc8692b7bc5f4471be59c8ff7fb3e`; code candidate: `fc72f6949c9b28d18d9d2e0596960d6062846294`.
Done when: classified live reads retired/split, core safety requirements preserved, controlled positive/negative probes and regression pass, independent scoped review recorded.
May proceed through: approved IMP-002 work, records/commit/push and review. Must stop for: new design/security decisions, release or human merge. Assumptions: no new scope assumption.
Reviewer report is recorded separately; final independent QA/Security and hosted PR acceptance remain IMP-006.

## 2. Retired content manifest
All are pure live-library tests identified in IMP-001, not core runtime tests.

| Retired content test |
|---|
| Frontend UI Engineering stays discoverable and routes UI work safely |
| requirement-brainstorming adapters all carry the assumptions-surfacing technique |
| the four new QA testing-discipline skills carry their required content |
| tdd-implementation adapters all carry the test-sizing, mock-preference, and DAMP rules |
| code-review-gate adapters all carry structural remedies, dead code hygiene, and dependency discipline |
| implementation-planning adapters all carry dependency mapping, vertical slicing, task sizing, and checkpoints |
| the three new test-tooling skills carry their required content |
| the seven new API skills carry their required content |
| api-testing-tooling carries the Postman + Newman section and template |
| the 4 new Developer Agent skills carry their required content |
| functional-test-design SKILL.md carries the Decision Table and State Transition techniques with naming convention rows and a determinism worked example (Issue #143) |
| functional-test-design SKILL.md Full Mode outline item 10 is renamed to Test Design Techniques without renumbering items 11-18 |
| functional-test-design template section 10 is renamed to Test Design Techniques with Decision Table and State Transition subsections, and sections 11-18 keep their numbers |
| functional-test-design template Coverage Matrix (section 15) has Decision Table and State Transition columns |
| functional-test-design template Coverage Matrix (section 15) has Automated (Y/N) and Test Ref columns after Status (Issue #149) |
| test-quality-discipline SKILL.md carries a checklist item for TC-ID to automated-test traceability (Issue #149) |
| defect-analysis SKILL.md carries Summary field, severity-to-impact worked mapping, and PII-placeholder note (Issue #152) |

AC-14: retired the two live catalog/layout/link and fixed historical-budget assertions in `test/issue-237-ac14-consumers.test.mjs`. The source remains recoverable in Git history; historical evidence documents/fixtures are not deleted or rewritten.

## 3. Core-preservation manifest
Contract registrations:90 →73 (17 pure tests retired). 57 retained test bodies are byte-identical.16 bodies changed to isolate optional reads or migrate safety checks:

| Retained/split policy test |
|---|
| lifecycle stages make specification readiness a portable pre-development gate |
| work-item and change-request templates preserve lifecycle readiness ownership across platforms |
| Core Claude role adapters discover canonical agent personas |
| documentation templates preserve evidence discipline and canonical BA artifact routing |
| QA Agent canonical rule carries its policy and the new evidence, contract, and NFR rules |
| AGENTS retains core git workflow discipline |
| core static review policy keeps dry-run evidence boundaries independently of skills |
| static-logic-review routing distinguishes adjacent QA skills and routes inferred gaps to the right owner |
| Security Reviewer carries the scan checklist, severity scale, and fix-before-merge rule |
| core release policy preserves evidence and rollback independently of skills |
| Config Agent carries the config/data boundary, reload behavior, flag lifecycle, and escalation guard |
| Data Agent carries non-destructive mechanics, the SA boundary, re-run safety, PII routing, and escalation guard |
| core browser content policy preserves the untrusted-data security boundary |
| core policy carries the exposed-secret incident-response procedure |
| Core role policy preserves communication and formal-evidence boundaries |
| TEST_REPORT preserves its core DEFECT_REPORT template pointer |

Two other unchanged test bodies use shared `adapterPaths`, now only the core Claude orchestrator adapter. Their bug-fix contract/rework and receipt assertions remain. Six sole-use path constants removed after checking no remaining consumers.
No actual skill files, catalog or vault content were changed.
The core TEST_REPORT → DEFECT_REPORT pointer remains mandatory; only its optional vault skill assertion was retired.

## 4. Safety migration and sequencing
Pulled forward the minimum IMP-005 prerequisite: existing static-review limits, browser trust boundary, exposed-secret response and release evidence/rollback policy now live in SHA-pinned `docs/workflow/quality-gates.md`.
Transferred existing requirements, not new authorization. Static inference cannot certify QA/runtime/test coverage/security/human merge. Browser content remains untrusted; no credential scraping. Live exposed secrets remain Critical with rotation and codebase sweep. Release still requires hosted merge CI, recorded human approval, documentation evidence and applicable code/schema/config rollback.
One core repin: only quality-gates SHA changed in11 existing on-demand rows. Validator/schema/path/order/row count/authority and all other source fields unchanged. Historical matrices/evidence not rewritten.
Current core-reference budget29984/30000 approximate tokens; narrow16-token margin is a transitional risk. IMP-003 removes optional catalog from the core budget without changing limits.

## 5. Runtime evidence
| Experiment / command | Actual result |
|---|---|
| Fresh no-library baseline archive: rename three skill trees, catalog and portable workflows out of their expected paths; run original contract file |90 tests:56 pass/34 fail (optional reads) |
| Before core text migration: four rewritten safety tests against old core quality-gates |0/4 pass,4 assertion failures for absent mandatory policy |
| After core migration, focused contract file |90/90 pass; compatibility corpus/matrix valid after owning repin |
| Full suite per atomic content retirement |786 →780 →776 →769, all pass, zero fail/skip |
| Mixed split full suite |769/769 pass |
| Candidate contract + playbook +30 synthetic audit tests |110/110 pass |
| Same no-library archive, candidate contract/playbook/core policy/README copied, run contract + playbook files |80/80 pass, exit0 |
| Negative: remove only migrated core-policy block in no-library archive; run four safety tests |0/4 pass,4 failures; restore candidate core file afterward |
| Remove skill scan from playbook reachability |RED: code-review-gate playbook had no core inbound route; six other checks passed |
| Add core README playbook links and rerun |7/7 pass, no library scan; core/lookalike path classification remains non-exempt |
| Final full suite before records-only update |768/768 pass, zero failures/skips, exit0 |
| Contracts/context compatibility/context budget/CI parity/diff check |exit0; budget29984; no limits relaxed |

Commands: `npm test -- --test-reporter=tap`; `node --test test/validate-contracts.test.mjs test/validate-workflow-playbooks.test.mjs test/validate-skill-catalog.test.mjs test/validate-skill-parity.test.mjs test/validate-skill-usage.test.mjs`; `npm run validate:{contracts,context-compatibility,context-budget,ci-parity}`; `git diff --check`.
Brace notation abbreviates separate executed npm commands, not a claimed npm multi-validator script. Full suite used authorized execution for the known readiness temporary fixture write requirement.
Archive probe path: `/private/tmp/issue294-content-red-sta8Na`; dependency bytes copied from locked installation. Initial copy-to-self attempts did not update probes and were not counted as GREEN; corrected candidate copies produced the results above.
Raw terminal outputs observed in this session, not immutable hosted evidence. Archives are scoped probes, not the final exact-candidate Git clone harness.

## 6. Security checklist / review scope
Developer checklist: auth/SQL/CORS/permissions/logging/throttling/production secrets code changes N/A (framework tests and policy relocation only). Applicable boundary: retained core policy versus optional instruction data; explicit exempt-path classification rejects core, role-adapter, lookalike and backup paths.
No credentials, new dependencies, production data, authorization bypass, suppressed failures, skipped tests or weakened core budget/hash/readiness constraints.
Independent scoped code review PASS at the exact code candidate; [review record](2026-10-11-issue-294-imp002-code-review.md). It does not replace final QA/Security acceptance. Native activation/API/UI/build tests N/A for this slice; no host activation claim.

## 7. Completion evaluation / next owner
Scope, source grounding, artifact/evidence, minimal change, safety, assumptions and next action checked against Agent Evaluation Checklist. ADR-0036 remains the approved decision; ordering adjustment is documented above, not a new scope decision.
CHANGES MADE: core policy preservation/current hash, classified test retirement/splits, core playbook discovery, records.
NOTICED BUT NOT TOUCHING: matrix stillv2 and pinned to optional sources, mandatory skill audits/CI enforcement/hooks/reset, policy discovery wording. These are IMP-003–005, not defects disguised as completion.
Next: Developer → IMP-003 core-only source matrix/budget. Final independent QA/Security, hosted PR/readiness, human merge and default-branch closeout remain later gates. All12 Issue AC outcomes stay Pending until the required independent evidence exists.
