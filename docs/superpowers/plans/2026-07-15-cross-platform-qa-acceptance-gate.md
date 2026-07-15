# Implementation Plan: Cross-Platform QA Acceptance Gate

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | GitHub issue #7 |
| Change Type | Workflow / agent-instruction enhancement |
| Risk Level | Medium — process and cross-platform agent behavior |
| Owner | Orchestrator / Developer Agent |
| Target Branch | `codex/issue-7-cross-platform-qa-gate` |

## 2. Inputs Reviewed

| Artifact | Status | Notes |
|---|---|---|
| Issue #7 | Available | Defines portable QA gate and explicit GitLab limitation. |
| QA canonical rule / Claude adapter | Available | Existing QA evidence rule is the extension point. |
| Handoff contract / template | Available | Requires shared platform-neutral links and evidence fields. |
| GitHub PR / GitLab MR templates | Available | Both already hold documentation-impact sections. |
| `.gitlab-ci.yml` | Available | Runs project-state validation on the default-branch push but does not create an exception Issue. |

## 3. Affected Areas

| Area | Files / Components | Expected Change |
|---|---|---|
| Canonical QA policy | `docs/workflow/role-definitions.md` | Add Issue AC verification ownership and Draft PR/MR gate. |
| Platform adapter | `.claude/agents/qa-agent.md` | Point Claude QA behavior to the same gate. |
| Handoff contract | `AGENTS.md`, `docs/workflow/handoff-contract.md`, `docs/templates/HANDOFF.md` | Add neutral work-item/change-request/QA evidence fields. |
| Change request templates | GitHub PR and GitLab MR templates | Add identical QA verification sections. |
| Quality gate / documentation | `docs/workflow/quality-gates.md`, role definition | State the gate and GitLab exception-issue limitation. |
| Regression | `test/validate-contracts.test.mjs` | Assert the cross-platform contract and field parity. |

## 4. Task Breakdown

| Task ID | Task | Owner | Verification |
|---|---|---|---|
| IMP-001 | Add failing regression checks for neutral handoff fields, QA ownership, both templates, and GitLab limitation. | Developer Agent | Focused test fails for missing fields/rules. |
| IMP-002 | Add canonical rule, adapter guidance, handoff fields, templates, and quality gate. | Developer Agent | Focused test passes. |
| IMP-003 | Record plan/TDD/review evidence and run full quality gate. | Developer / Reviewer | Full tests and validators pass. |

## 5. Test Strategy

| Test Type | Required? | Scope | Owner |
|---|---|---|---|
| Regression | Yes | Static contract/parity checks across canonical rule, adapter, templates, and handoff. | Developer / Reviewer |
| GitHub hosted check | Yes after merge | PR check and default-branch audit. | Maintainer / Documentation Agent |
| GitLab hosted check | Deferred | Run MR/default-branch pipeline on a live GitLab instance. | Maintainer |
| Security review | No | No auth, secret, sensitive-data, or runtime behavior changes. | N/A |

## 6. Verification Commands

- `npm test`
- `npm run validate:contracts`
- `npm run validate:project-state`
- `git diff --check`

## 7. Rollback / Fallback Plan

| Scenario | Rollback / Fallback Action | Owner |
|---|---|---|
| Rule proves too prescriptive for a platform | Revert this isolated commit or amend the canonical rule while retaining evidence ownership. | Maintainer |
| GitLab API automation is later required | Create a separately approved issue; do not add token/API behavior to this task. | Maintainer / SA |

## 8. Risks / Blockers

| Risk / Blocker | Impact | Mitigation / Next Action |
|---|---|---|
| PR #6 merge dependency | Resolved: PR #6 merged as `b81feea`; Issue #7 was rebased on updated `main`. | Keep the project-state update in this source PR. |
| GitLab Issue checkbox/comment APIs vary by hosting permissions | Cannot assume a bot can mutate Issue state. | Keep QA ownership as a human/agent process; defer API automation. |

## 9. Handoff

| To | Reason | Required Evidence |
|---|---|---|
| QA Agent / Reviewer | Independently check the QA gate contract and adapter/template parity. | Issue #7, red/green results, full checks, and known GitLab limitation. |
