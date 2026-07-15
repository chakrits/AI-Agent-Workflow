# Implementation Plan: Post-Merge Closeout Contract

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | GitHub Issue #10 |
| Change Type | Workflow / agent-instruction enhancement |
| Risk Level | Medium |
| Owner | Documentation Agent / Developer Agent |
| Target Branch / Ticket | `codex/issue-10-post-merge-closeout` / #10 |

## 2. Inputs Reviewed

| Artifact | Status | Notes |
|---|---|---|
| GitHub Issue #10 | Available | Approved scope and acceptance criteria. |
| PRs #8 and #9 | Available | Proved the QA-evidence and normal-closeout gaps. |
| Current workflow/templates/tests | Available | Defines the implementation seams. |
| SDD / API contract | N/A | No application architecture or API change. |

## 3. Affected Areas

| Area | Files / Components | Expected Change |
|---|---|---|
| Canonical policy | `docs/workflow/role-definitions.md`, `docs/workflow/quality-gates.md` | Portable closeout ownership, labels, normal/exception split. |
| Platform adapters | `.claude/agents/qa-agent.md`, `.claude/agents/documentation-agent.md` | GitHub/GitLab operational guidance. |
| Templates | GitHub PR and GitLab MR templates | Explicit Developer/QA ownership and documentation-only N/A path. |
| GitHub automation | `.github/workflows/documentation-sync.yml`, documentation-impact gate | Idempotent label/comment handoff, loop prevention, actionable error. |
| Regression | Contract and project-state tests | Guard policy, workflow paths, and template ownership. |

## 4. Task Breakdown

| Task ID | Task | Agent / Owner | Files / Components | Verification |
|---|---|---|---|---|
| IMP-001 | Add RED regression expectations for normal closeout, exception separation, and owner artifacts. | Developer Agent | `test/validate-*.test.mjs` | Focused test fails. |
| IMP-002 | Add canonical policy, adapters, quality gate, and template ownership. | Documentation / Developer Agent | Workflow docs, adapters, templates | Focused tests pass. |
| IMP-003 | Add GitHub normal-closeout signal and completion-marker cleanup; improve gate error. | Developer Agent | `.github/workflows/*.yml` | Contract test and YAML review pass. |
| IMP-004 | Create GitHub progress labels and update project records. | Documentation Agent | GitHub labels, project records | Labels exist; project-state validation passes. |
| IMP-005 | Run full verification and provide QA/reviewer handoff. | QA Agent / Reviewer | All changed files | Local suite and hosted checks pass. |

## 5. Test Strategy

| Test Type | Required? | Scope | Owner |
|---|---|---|---|
| Contract regression | Yes | Canonical/adapters/templates/workflow structure. | Developer / QA |
| Hosted GitHub check | Yes | PR checks, then post-merge normal signal lifecycle. | QA / Documentation Agent |
| GitLab hosted pipeline | Deferred | No connected GitLab project. | Maintainer |
| Security review | No | No secrets, permission boundary, or runtime application behavior. | N/A |

## 6. Verification Commands

Run `npm test`, `npm run validate:contracts`, `npm run validate:project-state`, and `git diff --check`.

## 7. Rollback / Fallback Plan

| Scenario | Rollback / Fallback Action | Owner |
|---|---|---|
| Normal signal is noisy or incorrect | Revert the isolated workflow/policy commit; retain failure-only exception Issue path. | Maintainer |
| Closeout label remains after merge | Documentation Agent removes it manually with the closeout PR evidence. | Documentation Agent |
| GitLab needs automation | Open a separately approved API-automation work item. | Maintainer / SA |

## 8. Risks / Blockers

| Risk / Blocker | Impact | Mitigation / Next Action |
|---|---|---|
| No associated PR for a `main` commit | No normal signal can be attached. | Workflow logs a no-op; protected-branch policy makes this exceptional. |
| Closeout PR could loop | Repeated labels/comments. | Completion marker removes the source label and skips a second normal signal. |
| No agent wake-up mechanism | Label is durable but needs an agent/maintainer to claim it. | Track as a visible queue; monitoring automation is out of scope. |

## 9. Handoff

| To | Reason | Required Evidence |
|---|---|---|
| QA Agent / Reviewer | Verify policy, templates, workflow structure, and regression suite. | RED/GREEN results, label list, changed files, known GitLab limitation. |
