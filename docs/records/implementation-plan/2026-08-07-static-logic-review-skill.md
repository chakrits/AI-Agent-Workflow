# Implementation Plan: Static Logic Review Skill (Issue #155)

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | https://github.com/chakrits/AI-Agent-Workflow/issues/155 |
| Change Type | Framework / Meta Change |
| Risk Level | Medium |
| Owner | Documentation Agent (authoring) |
| Target Branch | `feature/issue-155-static-logic-review` |

## 2. Inputs Reviewed

| Artifact | Status | Notes |
|---|---|---|
| Approved lightweight specification | Available | GitHub Issue #155 and 2026-08-07 approval comment |
| `docs/workflows/stabilize-core.md` | Available | Governing Framework / Meta Change workflow |
| `docs/workflow/dispatch-packet-contract.md` | Available | Packet and handoff evidence contract |
| Existing QA routing and skill catalog | Available | Canonical source and Claude adapter |

## 3. Affected Areas

| Area | Files / Components | Expected Change |
|---|---|---|
| Portable skill layer | `.agents/skills/static-logic-review/SKILL.md`, mirrors | New byte-identical QA-owned dry-run skill |
| QA routing | `docs/workflow/role-definitions.md`, `.claude/agents/qa-agent.md` | Trigger, boundaries, and backward routes |
| Global routing | `AGENTS.md`, `docs/workflow/dynamic-routing.md`, `docs/operating-model/SKILL_CATALOG.md` | Selection and non-universal-gate policy |
| Regression tests | `test/validate-contracts.test.mjs` | Presence, mirror, fields, boundaries, and routing assertions |

## 4. Task Breakdown

| Task ID | Task | Agent / Owner | Files / Components | Verification |
|---|---|---|---|---|
| IMP-001 | Commit work-item and this plan before policy content changes | Documentation Agent | Work-item and plan records | Records link Issue #155 and scope |
| IMP-002 | Add failing contract test for the new skill and routing boundaries | Documentation Agent | `test/validate-contracts.test.mjs` | Test fails because skill/rules do not yet exist |
| IMP-003 | Add the mirrored skill and compact catalog/routing rules | Documentation Agent | Skill mirrors and five routing sources | Targeted test and parity validator pass |
| IMP-004 | Record self-review and run the complete repository gates | Documentation Agent | QA review record, state/log records | Required commands pass |
| IMP-005 | Hand off exact commit for independent AC-01..AC-07 verification | QA Agent / Reviewer | Handoff evidence | Independent QA; no self-certification |

## 5. Test Strategy

| Test Type | Required? | Scope | Owner |
|---|---|---|---|
| Contract regression | Yes | Skill mirrors, evidence fields, non-substitution and QA routing | Documentation Agent |
| Skill parity | Yes | New three-tree skill copy | Documentation Agent |
| Runtime / E2E | No | This change creates no target-app behavior | N/A |
| Independent QA | Yes | AC-01 through AC-07 on the exact commit | QA Agent / Reviewer |
| Security Review | Conditional | Only if QA finds a security-sensitive routing concern | Security Reviewer |

## 6. Verification Commands

```bash
npm test
npm run validate:skill-parity
npm run validate:contracts
npm run validate:context-budget
npm run validate:skill-usage
npm run validate:review-gate
```

## 7. Rollback / Fallback Plan

| Scenario | Rollback / Fallback Action | Owner |
|---|---|---|
| Routing text creates overlap or an ambiguous trigger | Do not merge; refine the new skill/rules on this branch | Documentation Agent / Human Maintainer |
| Context budget fails | Reduce duplicated wording while preserving the approved trigger/boundary | Documentation Agent |
| Independent QA fails an AC | Route to the owner named by the static finding; retain phase truthfully | Orchestrator |

## 8. Risks / Blockers

| Risk / Blocker | Impact | Mitigation / Next Action |
|---|---|---|
| Skill could be mistaken for runtime QA or a universal gate | Incorrect routing or false assurance | State trigger, non-trigger, QA ownership, and non-certification boundary in all canonical locations |
| Catalog/role-definition context budget | Shared prompt budget can reject a correct change | Keep edits compact and run `validate:context-budget` |
| Missing behavioral source during a dry run | Unsupported defect claim | Require `Potential Requirement Gap` and route BA/SA rather than infer |

## 9. Handoff

| To | Reason | Required Evidence |
|---|---|---|
| QA Agent / Reviewer | Independently verify every Issue #155 AC on the exact commit | Diff, AC matrix, all command results, review record, stated limitations |
