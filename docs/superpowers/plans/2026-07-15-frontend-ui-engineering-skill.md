# Implementation Plan: Frontend UI Engineering Skill

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | GitHub issue #5 |
| Change Type | Skill / instruction enhancement |
| Risk Level | Medium — cross-platform agent behavior only |
| Owner | Developer Agent |
| Target Branch / Ticket | `codex/frontend-ui-engineering` / #5 |

## 2. Inputs Reviewed

| Artifact | Status | Notes |
|---|---|---|
| Issue #5 | Available | Approved scope and acceptance criteria. |
| Upstream skill | Available | `addyosmani/agent-skills` Frontend UI Engineering skill; MIT licensed. |
| Existing skill adapters | Available | Canonical `.agents` skill with Claude and Antigravity adapters. |

## 3. Affected Areas

| Area | Files / Components | Expected Change |
|---|---|---|
| Portable skill | `.agents/skills/frontend-ui-engineering/SKILL.md` | Concise canonical instruction and source note. |
| Platform adapters | `.claude/skills/...`, `.agent/skills/...` | Point to canonical instruction. |
| Skill discovery | `docs/operating-model/SKILL_CATALOG.md` | Add trigger, output, and handoff route. |
| Regression | `test/validate-contracts.test.mjs` | Enforce canonical/adapters and essential UI guidance. |
| Project records | Status, log, changelog, implementation/TDD/review records | Track the work item and evidence. |

## 4. Task Breakdown

| Task ID | Task | Owner | Verification |
|---|---|---|---|
| IMP-001 | Add a red contract test for discovery, adapter path, accessibility, responsive, and QA-handoff guidance. | Developer Agent | Test fails because the skill does not exist. |
| IMP-002 | Add the canonical skill, two adapters, and catalog entry. | Developer Agent | Targeted contract test passes. |
| IMP-003 | Update records and run full local quality gate. | Developer Agent / Reviewer | `npm test`, validators, diff check. |

## 5. Test Strategy

| Test Type | Required? | Scope | Owner |
|---|---|---|---|
| Regression | Yes | Static contract test of skill content and adapters | Developer / Reviewer |
| UI automation | No | This repository has no UI runtime; the skill routes future UI automation to `qa-playwright-testing`. | N/A |
| Security review | No | No secret, auth, user-data, or runtime execution surface changes. | N/A |

## 6. Verification Commands

```bash
npm test
npm run validate:contracts
npm run validate:project-state
git diff --check
```

## 7. Rollback / Fallback Plan

| Scenario | Rollback / Fallback Action | Owner |
|---|---|---|
| Skill proves too broad or conflicts with a host project | Revert this isolated commit or narrow its trigger in a follow-up PR. | Maintainer |

## 8. Risks / Blockers

| Risk / Blocker | Impact | Mitigation / Next Action |
|---|---|---|
| Upstream guidance is framework-specific in places | Incorrectly prescribing a stack to target projects | Keep the canonical skill framework-neutral and point automation to existing QA skill. |
| Attribution ambiguity | License compliance gap | Record source and MIT license context; avoid substantial verbatim copying. |

## 9. Handoff

| To | Reason | Required Evidence |
|---|---|---|
| Reviewer / QA Agent | Independently verify the instruction contract and quality gates. | Diff, red/green evidence, full test output, known limitations. |
