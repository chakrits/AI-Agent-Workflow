# AGENTS.md

## Purpose

This file defines cross-platform AI agent rules for software engineering work. It is the always-on project instruction layer for agents such as Codex, Claude Code, Antigravity, Cursor, Gemini CLI, or other agentic coding tools.

The workflow is dynamic, bidirectional, and risk-based. Do not force all requests through a fixed PM -> BA -> SA -> Dev -> Tester path.

## Core Operating Principles

1. Classify the change before doing work.
2. Select the minimum safe workflow.
3. Use role-specific agents or skills when the platform supports them.
4. Keep implementer and verifier responsibilities separate.
5. Use artifacts and handoff contracts, not informal summaries.
6. Update project state after every meaningful step.
7. Stop at human approval gates.
8. Do not skip security review for security-sensitive changes.
9. Do not make unrelated changes.
10. Prefer small, reviewable increments.

## Core Operating Model

Before selecting an agent, selecting a skill, or marking work complete, follow the shared operating model.

### Required Reading Order

1. `docs/operating-model/AGENT_OPERATING_MODEL.md`
2. `docs/operating-model/SKILL_CATALOG.md`
3. `docs/operating-model/AGENT_EVALUATION_CHECKLIST.md`
4. Relevant workflow/playbook under `docs/workflow/`, `docs/workflows/`, `docs/operating-model/`, or `docs/playbooks/` depending on project structure

### Routing Rule

Do not default to a linear PM → BA → SA → Dev → QA flow.

Always classify the request first:

- Change type
- Risk level
- Required artifacts
- Required quality gates
- Minimum safe workflow
- Required human approvals

Then select the appropriate agent and skill.

### Skill Selection Rule

Before using a skill, check `docs/operating-model/SKILL_CATALOG.md`.

Use the most specific applicable skill. If no skill matches, proceed with the base agent role and document the gap.

### Completion Rule

Before marking any task complete, run `docs/operating-model/AGENT_EVALUATION_CHECKLIST.md`.

A task is complete only when:

- Required artifact is produced or updated.
- Quality gate is checked.
- Assumptions and open questions are documented.
- Handoff or next action is clear.
- Human approval gate is triggered when needed.

### Stop Conditions

Stop and ask for human approval when the task touches:

- Scope change
- Major architecture decision
- Auth/authz, secrets, privacy, payment, financial logic
- Production data or destructive database change
- Release/deployment decision
- Security exception
- Removing or weakening validation, controls, or tests

## Canonical Sources

Read these files when relevant:

- `PROJECT_STATUS.md` — current stage, blockers, next recommended agent
- `TASK_LOG.md` — work history and agent handoff trail
- `DECISIONS.md` — architecture and process decisions
- `RISKS.md` — known project risks
- `docs/workflow/dynamic-routing.md` — routing policy
- `docs/workflow/role-definitions.md` — role responsibilities
- `docs/workflow/quality-gates.md` — stage gates
- `docs/workflow/handoff-contract.md` — handoff format
- `docs/templates/` — output templates

## Agent / Skill Layer

Use these layers depending on platform support:

- Portable skills: `.agents/skills/`
- Portable workflows: `.agents/workflows/`
- Claude Code subagents: `.claude/agents/`
- Claude Code skills: `.claude/skills/`
- Antigravity CLI skills: `.agent/skills/`

The canonical process is in `docs/workflow/`. Platform-specific files are adapters, not the source of truth.


## Engineering Discipline Rules

When the user reports a bug, failing test, CI failure, regression, stack trace, flaky behavior, or asks to debug/diagnose/investigate:

1. Use `debugging-discipline` before proposing a fix.
2. Establish or request a reliable repro.
3. Trace the fail path before choosing a fix.
4. Record hypotheses and experiment breadcrumbs.
5. Do not weaken or delete tests merely to make the pipeline pass.
6. Do not declare the issue fixed until the original repro passes.

When the bug is fixed and validated and the user asks for RCA/postmortem/root-cause write-up:

1. Use `engineering-postmortem`.
2. Refuse to draft if reliable repro, known root cause, fix pointer, or validation evidence is missing.
3. Keep code/config/data identifiers in the engineering record.
4. State validation scope honestly.
5. Create follow-up actions only when they are real, owned, and trackable.

Routing notes:

- Requirement ambiguity found during debugging → BA Agent.
- Architecture/API contract gap found during debugging → SA Agent.
- Product implementation bug → Developer Agent.
- Test logic/flaky automation issue → QA Agent / automation skill.
- Config/data issue → Config Agent or Data Agent.
- Auth/permission/secret/sensitive data issue → Security Reviewer.

## Engineering Execution Rules

The agent system must use execution-discipline skills when work moves from requirements/design into implementation and review.

### Requirement Discovery Rule

Use `requirement-brainstorming` when a request is vague, early-stage, or missing testable acceptance criteria.

Do not route directly to Developer Agent when business scope, user stories, or acceptance criteria are unclear.

### Implementation Planning Rule

Use `implementation-planning` before non-trivial implementation, refactor, migration, or validated bug fix.

Implementation must not start until the plan identifies:

- affected components/files,
- task breakdown,
- verification commands,
- required tests,
- risks and rollback where relevant,
- next handoff agent.

### TDD Rule

Use `tdd-implementation` for code behavior changes unless the project context explicitly says TDD is not practical.

For behavior changes, the agent must create or identify a failing test before implementation, or document why no test seam exists.

### Verification Rule

Use `verification-before-completion` before claiming work is done, fixed, ready for QA, ready for review, or ready for release.

The agent must not say tests passed unless tests actually ran or a CI result is referenced.

### Code Review Gate Rule

Use `code-review-gate` before QA/release handoff when code changed.

Do not skip code review for security-sensitive, auth, permission, data migration, production config, or payment/financial logic changes.

### Routing Summary

- Vague business request → `requirement-brainstorming`
- Approved requirement/design → `implementation-planning`
- Code behavior change → `tdd-implementation`
- Before done/ready/fixed claim → `verification-before-completion`
- Before QA/release/merge after code change → `code-review-gate`



## Dynamic Routing Rules

### New Feature

Recommended flow:

```text
PM/BA -> SA -> Developer -> QA -> Security if relevant -> Release
```

Required artifacts:

- Project brief or user story
- Acceptance criteria
- Architecture or technical design when behavior/integration changes
- Test plan or test cases
- Release note

### Bug Fix

Recommended flow:

```text
QA/BA -> Developer -> QA -> Reviewer
```

For every Bug Fix work item, use `docs/contracts/bug-fix-workflow.yaml` as the
canonical policy and validate its `task-state` before handoff. The policy owns
the allowed states, transitions, required evidence, and retry budget.

Allow at most two verifying -> rework transitions. On the next failed verification,
set state to blocked with `stop_reason: human_review_required` and hand off to a human.

Route backward if:

- Expected behavior is unclear -> BA
- API or architecture is wrong -> SA
- Permission/auth issue exists -> Security Reviewer

### Config Change

Recommended flow:

```text
BA -> Config Agent -> QA -> Release
```

Skip Developer when there is no code change.
Skip SA when no architecture, integration, data model, NFR, or security impact exists.

### DB / Reference Data Change

Recommended flow:

```text
BA -> Data Agent -> QA -> Release
```

Required artifacts:

- Data change plan
- Validation query
- Rollback query
- QA focus

### API Contract Change

Recommended flow:

```text
BA -> SA -> Developer -> QA -> Security if relevant
```

### Test-only Change

Recommended flow:

```text
QA Agent -> Reviewer
```

### Documentation-only Change

Recommended flow:

```text
Documentation Agent -> Reviewer
```

### Security-sensitive Change

Security Reviewer must be included for:

- Authentication
- Authorization
- Secrets
- Sensitive data
- Payment or financial logic
- Privacy
- Production access
- Dependency/security control changes

## Backward Routing Rules

- QA may route back to BA when acceptance criteria are unclear.
- QA may route back to Developer when implementation fails tests.
- Developer may route back to SA when architecture or API contract is insufficient.
- SA may route back to BA when requirements are technically ambiguous.
- Security Reviewer may route back to SA or Developer when trust boundaries or controls are missing.
- Release Agent may route back to QA when evidence is incomplete.

## Skip Rules

- Skip Developer when there is no code change.
- Skip SA for low-risk config/reference-data changes unless integration, data model, NFR, or security impact exists.
- Skip PM for small approved operational changes.
- Do not skip QA for user-visible, business-rule, or production data/config changes.
- Do not skip Security Reviewer for sensitive changes.

## Required Handoff

Every agent handoff must include:

- From
- To
- Work item
- Change type
- Risk level
- Task state
- Contract version
- Rework count
- Completed work
- Artifacts produced
- Files changed
- Verification performed
- Evidence references
- Stop reason
- Known limitations
- Open questions
- Recommended next agent

Use `docs/templates/HANDOFF.md`.

## Definition of Done

A work item is done only when:

- Required artifacts exist
- Required tests/checks are complete or explicitly not applicable
- Risks and limitations are documented
- PROJECT_STATUS.md is updated
- TASK_LOG.md is updated
- Next owner is clear
