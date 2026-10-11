# Implementation Plan — Issue #294

## 1. Plan Summary
| Item | Detail |
|---|---|
| Work Item / Branch | https://github.com/chakrits/AI-Agent-Workflow/issues/294 / `codex/skill-library-decoupling-design` |
| Change Type / Risk | Framework / Meta; Medium |
| Owner / Status | Orchestrator/SA; Draft awaiting design approval |
| Authorization | Issue, branch, documents authorized; implementation/merge not yet approved |

## 2. Inputs Reviewed
Requirements, SDD, TDD, Test Plan: available Draft in this bundle. Survey baseline EV-01–EV-06: observed, not candidate acceptance. API contract: N/A — no endpoints. Proposed ADR-0036: awaiting approval.

## 3. Affected Areas
Core context validator/fixtures, optional skill diagnostics, live content tests, GitHub/GitLab CI, Claude hooks/edit guards/reset, AGENTS/bootloader/role/discovery instructions. Exact targets are in TDD. Frontend/backend product/database: N/A.

## 4. Task Breakdown

| Task | Deliverable / Owner | Dependency | Files / Verification |
|---|---|---|---|
| IMP-001 | Assertion classification and contributor probe specification / QA+Developer | Approved design | Test files in TDD; record RED failures before retiring old conditions; no red-only intermediate merge |
| IMP-002 | Live library assertions become opt-in audits or are retired / Developer | IMP-001 | Content/AC14/playbook tests; preserve mixed core assertions and fixture algorithm tests; AC-06/09, focused tests |
| IMP-003 | Core-only matrix and budget / Developer | IMP-002 | Context library/current fixtures/budget/edit-guard tests; AC-03/04/07 plus core-negative failures |
| IMP-004 | Mandatory-call graph decoupling / Developer | IMP-003 | Both CI hosts, package scripts, hooks/reset and CI-presence tests in one slice; AC-05/09; CI parity and hook tests |
| IMP-005 | Policy/discovery alignment / Documentation Agent | IMP-004 | AGENTS/core/role/evaluation/catalog/workflow docs, ADR acceptance and core repin; AC-08/12; contracts/context/budget checks |
| IMP-006 | Independent acceptance and human handoff / QA+Security Reviewer | IMP-005 | Final SHA, all contributor/core cases, PR hosted checks, Issue matrix; AC-01–12; Human merge decision |

Split each slice further if it exceeds ~300 changed lines; target ~100 per atomic commit. Keep coupled validator/fixture changes together; retiring obsolete assertions and updating the corresponding behavior can be one reviewed slice, with RED then GREEN evidence. Broad discovery/formatting refactors are separate. If a safe green boundary cannot be found, stop and revise the slice plan rather than bypass checks.

## 5. Test Strategy / Checkpoints
Unit/contract: Developer; isolated contributor regression: independent QA; retained validation-boundary review: Security Reviewer. Browser/API/performance load tests: N/A. Native platform smoke: optional QA/platform owner; record unavailable runtime honestly.

Sequential chain: IMP-001 → IMP-002 → IMP-003 → IMP-004 → IMP-005 → IMP-006. No parallel mutations because test/CI/policy state overlaps. Checkpoint CP-1 after IMP-003 and CP-2 after IMP-005: full tests, mandatory retained commands, diff scope, source integrity, and regression inventory. Advance only with explained evidence.

## 6. Verification Commands

Current baseline commands (design verification):
```bash
npm ci --ignore-scripts
npm test
npm run validate:contracts
npm run validate:ci-parity
npm run validate:skill-catalog
npm run validate:skill-parity
npm run validate:skill-usage
npm run validate:context-budget
npm run validate:status-projection
git diff --check
```

Post-implementation: run `npm test` and every remaining command actually configured in mandatory GitHub/GitLab jobs; do not use a shortened hand-maintained list as full acceptance. Capture the configured-command inventory in evidence. Additionally run core-only `validate:context-compatibility`, retained edit-guard/hook/readiness tests, and contributor probes specified by Test Plan. Manual `audit:skills`/`audit:skill-usage` outcomes are recorded separately and do not gate that run. Required network-backed checks use read-only tokens; never store tokens in logs.

## 7. Rollback / Fallback Plan
| Scenario | Action / Owner |
|---|---|
| Core regression or hidden library coupling | Stop slice; Developer restores matching validator/fixture/test version, independent QA reruns failing case |
| Hosted mandatory CI differs from local | Orchestrator routes to Developer; fix command inventory without weakening protection |
| Post-merge regression | Human Maintainer approves revert of owning slice(s), reverse dependency order; QA verifies restored default branch |

## 8. Risks / Blockers
Human design approval and proposed OQ-01/02 scope assumptions are pending. Native availability is not guaranteed. Mixed tests and v2→v3 fixtures require careful review. Generic readiness remains required for skill-only PRs; simplifying it requires separate authorization/design.

## 9. Handoff
Current Next Action: Human review; Next Owner: Human Maintainer. After approved SDD/TDD/plan and accepted ADR, Orchestrator may record spec-ready and dispatch Developer with a structured packet. After implementation, independent QA/Security review exact candidate SHA; only a truthful complete result may advance human merge review. Post-merge evidence completes AC-11/12 closeout, not pre-merge approval.
