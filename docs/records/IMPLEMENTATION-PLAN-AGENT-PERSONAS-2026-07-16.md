# Implementation Plan — Canonical Agent Personas

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | GitHub Issue #16 — Add personality for agents |
| Change Type | New Feature (agent-instruction behaviour) |
| Risk Level | Medium |
| Owner | Developer Agent |
| Target Branch / Ticket | `codex/issue-16-agent-personas` / Issue #16 |

## 2. Inputs Reviewed

| Artifact | Status | Notes |
|---|---|---|
| Requirements record | Available | `REQUIREMENTS-AGENT-PERSONAS-2026-07-16.md` |
| Approved Issue #16 design comment | Available | Canonical persona matrix and acceptance criteria |
| Architecture design | N/A | No API, data model, integration, or runtime architecture change |
| Test plan | Available | Contract regression tests plus QA acceptance-criteria verification |

## 3. Affected Areas

| Area | Files / Components | Expected Change |
|---|---|---|
| Canonical operating model | `docs/operating-model/AGENT_PERSONAS.md` | Add the 11 personas and their shared boundary |
| Claude adapters | `.claude/agents/*.md` | Reference the matching canonical persona without changing policy |
| Portable adapters | `.agents/skills/dynamic-workflow/SKILL.md`, `.agent/skills/dynamic-workflow/SKILL.md` | Discover canonical persona after routing a role |
| Tests | `test/validate-contracts.test.mjs` | Protect role completeness, references, and boundaries |
| Project records | Index, state, task log, changelog, handoff, review/completion records | Record work and evidence |

## 4. Task Breakdown

| Task ID | Task | Agent / Owner | Files / Components | Verification |
|---|---|---|---|---|
| IMP-001 | Add RED contract tests for canonical role coverage, platform discovery, and persona-policy boundary | Developer Agent | `test/validate-contracts.test.mjs` | `npm test` fails for absent persona artefacts |
| IMP-002 | Create canonical persona source and update Claude/portable/Antigravity references | Developer Agent | Canonical doc and adapters | Focused tests pass |
| IMP-003 | Update project navigation/state/history/changelog and prepare developer handoff | Documentation Agent / Developer Agent | Project records | `npm test`, validators, diff check |
| IMP-004 | Review persona authority, trust claims, and boundary language | Security Reviewer | Security review record | No blocking findings or documented remediation |
| IMP-005 | Verify every Issue #16 acceptance criterion independently and record evidence | QA Agent | Issue, PR, test evidence | QA evidence comment and `status:verification-done` |

## 5. Test Strategy

| Test Type | Required? | Scope | Owner |
|---|---|---|---|
| Contract regression | Yes | All roles, adapter references, canonical boundary | Developer Agent then QA Agent |
| API / E2E | No | No application/runtime behaviour changes | N/A |
| Regression | Yes | Full `npm test`, contract validation, project-state validation | QA Agent |
| Security Review | Yes | Persona boundary, deceptive authority, sensitive-role implications | Security Reviewer |

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
| Persona guidance conflicts with canonical policy | Remove or revise only the conflicting persona/reference; retain existing policy | Developer Agent |
| A platform adapter cannot discover the canonical document | Keep it as a documented limitation and do not invent a platform-specific agent schema without approval | Human Maintainer / Orchestrator |

## 8. Risks / Blockers

| Risk / Blocker | Impact | Mitigation / Next Action |
|---|---|---|
| Persona turns into unaudited operating policy | Inconsistent agent decisions | Explicit non-override boundary and focused security/QA review |
| Eleven adapters drift | Uneven platform experience | One canonical source and parity regression test |

## 9. Handoff

| To | Reason | Required Evidence |
|---|---|---|
| security-reviewer | Confirm persona authority and trust boundaries | Canonical doc, adapter diff, tests |
| qa-agent | Independently verify Issue #16 criteria | Security outcome, command output, PR diff, Issue links |
