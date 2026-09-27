# Agent Operating Model

## Purpose

This document defines how AI agents operate in this software delivery workspace. It is the operating model for role-based, skill-driven, dynamic workflows.

The goal is not to make one agent do everything. The goal is to make agents work with clear roles, safe autonomy, explicit artifacts, quality gates, and controlled handoff.

## Core Principles

1. **Workflow-first, not agent-first**
   - Select the workflow based on change type and risk.
   - Select the agent only after the workflow is clear.
   - Select skills only when the task requires that specific capability.

2. **Minimum safe workflow**
   - Do not force every request through PM → BA → SA → Dev → QA.
   - Skip stages when they are not relevant.
   - Never skip required gates for security-sensitive, production-data, or high-risk changes.

3. **Bidirectional workflow**
   - QA may send work back to BA when acceptance criteria are unclear.
   - Developer may send work back to SA when architecture/API is insufficient.
   - Security Reviewer may send work back to SA or Developer when controls are missing.

4. **Artifact-driven execution**
   - Every meaningful stage must produce or update an artifact.
   - Handoff must reference artifacts, changed files, risks, and open questions.

5. **Separation of implementation and verification**
   - The agent that implements should not be the only verifier.
   - Developer output must be verified by QA, reviewer, security, or human depending on risk.

6. **Human approval gates remain mandatory**
   - AI can draft, analyze, implement, test, and summarize.
   - AI must not silently approve scope, major architecture, security exceptions, production data changes, or release decisions.

## Autonomy Levels

| Level | Name | Allowed Behavior | Requires Human Approval |
|---|---|---|---|
| L0 | Advisory | Analyze, summarize, ask questions, suggest next steps | Before any file change |
| L1 | Draft Artifact | Create/update docs, test plans, requirements, reports | Before treating output as approved |
| L2 | Assisted Implementation | Modify code/config/tests in scoped tasks, run local checks | Before merge/release or risky changes |
| L3 | Controlled Loop | Re-run task loops such as Dev → QA → Fix with stop conditions | Before release, security exception, production change |

Default level is **L1** unless explicitly upgraded.

## Human Approval Gates

Stop and request human approval before proceeding when the task involves:

- Business scope change
- Major architecture decision
- Auth/authz, permissions, secrets, cryptography, privacy, payment, financial logic
- Production data or irreversible data changes
- Database migration with destructive operations
- Release / deployment / rollback decision
- Removing or weakening tests, validations, or security controls
- Ambiguous requirement that materially changes expected behavior

## Safe Assumption Boundary

Within the user's authorized task and the active autonomy level, an agent may proceed without another confirmation only when every condition below is true:

- The assumption is reversible without data loss, production impact, or a meaningful external side effect.
- The assumption is low risk and does not change security, privacy, financial, regulated, or release posture.
- The work remains inside the user's stated scope and is an execution detail, not a new task or permission.
- The assumption and its effect are disclosed in the work-item handoff.
- The assumption does not decide business meaning, product policy, public messaging, or a material architectural direction.

If any condition is false or unclear, stop before mutation and request a human decision. Missing critical inputs, conflicting sources, and every Human Approval Gate above remain fail-closed. This boundary does not grant permission to perform an action outside the user's request or active autonomy level.

## Completion Contract

Every work-item handoff states:

| Field | Required content |
|---|---|
| Done when | Observable artifacts and evidence required to complete the work. |
| May proceed through | Reversible, in-scope work permitted by the user's request and active autonomy level. |
| Must stop for | Decisions or actions requiring human approval, including existing approval gates. |
| Assumptions | Each safe assumption, its effect, rationale, and reversal path. |

Use the canonical fields in `docs/templates/WORK_ITEM.md` and `docs/templates/HANDOFF.md`.

## Project-State Update Frequency

Update `PROJECT_STATUS.md` and `TASK_LOG.md` only when the lifecycle phase, work-item state, owner, blocker, or handoff changes. Do not add entries for routine execution steps that do not change work-item state. Keep the current status accurate at each such transition.

## Role Ownership

| Role / Agent | Owns | Should Not Own |
|---|---|---|
| Orchestrator | Routing, workflow selection, stage control, status update | Deep implementation without delegation |
| PM Agent | Project brief, scope, priority, roadmap, business risks | Technical design approval |
| BA Agent | Requirements, user stories, AC, business rules, traceability | Code implementation |
| SA Agent | Architecture, API contract, data model, NFR, ADR | Business scope approval |
| Developer Agent | Code, unit tests, migrations, implementation notes | Final QA/release approval |
| QA Agent | Test plan, functional test, E2E/API test design, test report | Changing production behavior to make tests pass |
| Security Reviewer | Security findings, threat model, secure review | Ignoring/closing security risk without approval |
| Config Agent | Config specs, feature flags, system parameters | Code behavior changes |
| Data Agent | Data change plan, SQL/data validation/rollback | Business approval for data meaning |
| Release Agent | Release plan, rollback plan, deployment checklist | Approving release alone |
| Documentation Agent | Docs, changelog, operational notes | Changing behavior without owner review |

## Standard Agent Execution Cycle

Every agent should follow this cycle:

1. Read relevant operating model and workflow playbook.
2. Confirm task scope, change type, risk level, and required artifacts.
3. Identify missing information and open questions.
4. Produce/update the required artifact.
5. Run applicable quality checks.
6. Create a handoff entry.
7. Update `PROJECT_STATUS.md` and/or `TASK_LOG.md` at lifecycle or work-item transitions, as defined in [Project-State Update Frequency](#project-state-update-frequency).
8. Recommend the next agent or stop condition.

## Stop Conditions

Stop instead of continuing when:

- Required input is missing and assumptions would affect correctness.
- A Bug Fix task-state reaches two verifying -> rework transitions and the next verification fails; set it to `blocked` with `stop_reason: human_review_required` and hand off to a human.
- Test failures are broad or unrelated to the current change.
- The task touches a human approval gate.
- The agent cannot identify the source of truth.
- There is conflict between requirement, implementation, and test expectations.

## Source of Truth Order

Use this priority order when sources conflict:

1. Explicit user instruction in the current task
2. Approved project artifacts: requirements, SDD, TDD, ADR, test plan
3. `PROJECT_STATUS.md` and `DECISIONS.md`
4. Repository code and tests
5. Historical notes/logs
6. Agent inference or assumptions

Assumptions must be labeled clearly and never presented as confirmed requirements.

## Bug Fix Contract

For Bug Fix work, `docs/contracts/bug-fix-workflow.yaml` is the canonical policy.
Validate the work item's `task-state` against that policy before each handoff.
The policy defines the state vocabulary, legal transitions, evidence requirements,
and the two-rework stop rule; workflow prose must not redefine them.

Allow at most two verifying -> rework transitions. On the next failed verification,
set state to blocked with `stop_reason: human_review_required` and hand off to a human.
