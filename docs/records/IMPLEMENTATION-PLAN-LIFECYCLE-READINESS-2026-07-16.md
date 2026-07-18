# Implementation Plan — Lifecycle Stages and PR Readiness Gate

| Field | Value |
|---|---|
| Work Item | GitHub Issue #19 — Lifecycle stages and automated PR readiness gate |
| Work Item URL | https://github.com/chakrits/AI-Agent-Workflow/issues/19 |
| Change Type | Workflow/process enhancement |
| Risk Level | Medium |
| Target Branch | `codex/issue-19-lifecycle-readiness` |
| Approved Design | [Lifecycle contract](https://github.com/chakrits/AI-Agent-Workflow/issues/19#issuecomment-4993924571) |

## Dependency Map

```text
Approved lifecycle contract
  ├── canonical workflow / role / quality-gate rules
  │     ├── platform templates and agent adapters
  │     └── contract regression tests
  ├── GitHub lifecycle labels
  └── GitHub readiness workflow
          └── security review of token permissions
```

## Task Breakdown

| ID | Task | Owner | Affected Areas | Verification |
|---|---|---|---|---|
| IMP-001 | Add lifecycle taxonomy, specification gate, exceptions, and handoff transitions to canonical policy; record project state. | Orchestrator / Documentation | `AGENTS.md`, `docs/workflow/*`, `PROJECT_STATUS.md`, `TASK_LOG.md`, `CHANGELOG.md` | Contract tests and policy review pass. |
| IMP-002 | Update GitHub/GitLab templates and relevant adapters with phase, specification, and handoff fields. | Developer / Documentation | `.github/`, `.gitlab/`, `.claude/`, `.agents/`, `.agent/` | Adapter/template parity tests pass. |
| IMP-003 | Create GitHub lifecycle labels and document matching GitLab labels. | Documentation / Maintainer | GitHub labels, workflow docs | Labels verified; GitLab limitation documented. |
| IMP-004 | Implement least-privilege GitHub readiness validation for structural Work Item evidence. | Developer | `.github/workflows/`, tests | Focused valid/missing/exempt tests and workflow permission review pass. |
| IMP-005 | Independently verify Issue #19 AC and prepare the Draft PR for human review. | QA / Security Reviewer / Human | Issue, PR, records | QA evidence, hosted checks, and review handoff exist. |

## Test Strategy

| Test Type | Required | Scope | Owner |
|---|---|---|---|
| Contract regression | Yes | Taxonomy, ownership, canonical/adapter/template parity | Developer then QA |
| GitHub workflow-focused tests | Yes | Valid, missing, and exempt Work Item/readiness cases | Developer then QA |
| Hosted GitHub Actions | Yes | New PR readiness check and existing checks | QA / Human |
| GitLab live CI | No — external follow-up | Template/CI compatibility only; no new credentials | Maintainer |
| Security review | Conditional, expected | New GitHub Actions permissions/API calls | Security Reviewer |

## Verification Commands

```bash
npm test
npm run validate:contracts
npm run validate:project-state
git diff --check
```

## Risks and Fallback

| Risk | Mitigation / Fallback |
|---|---|
| GitHub cannot prevent the Ready-for-review UI transition | Enforce the structural check at merge/readiness and document the actual platform behavior honestly. |
| Workflow permissions/API access are insufficient | Keep the check advisory/draft-only or revert its isolated commit; do not add permissions without review. |
| GitLab needs credentials for equivalent API automation | Retain labels/templates/CI contract validation and document manual verification. |
| CI mistakes structural evidence for QA judgment | Never auto-tick Issue AC; QA remains the sole evidence owner. |

## Handoff

| From | To | Required Evidence |
|---|---|---|
| Developer | QA Agent | Draft PR URL, changed files, local checks, Issue #19 AC, limitations |
| Developer | Security Reviewer | Workflow diff, exact `permissions:` block, API calls, test evidence |
| QA Agent | Human Maintainer | Completed AC, QA evidence URL, hosted results, remaining limitations |
