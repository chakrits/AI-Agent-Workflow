---
name: implementation-planning
description: Use this skill after requirements and technical direction are clear, before implementation starts. It converts approved requirements, SDD/TDD, API contracts, or bug-fix decisions into small executable tasks with file targets, test strategy, verification commands, rollback notes, risks, and handoff checkpoints. Do not use for vague requirements or active debugging.
---

# Implementation Planning Skill

Create a concrete implementation plan before code changes. This skill is for SA → Dev and Dev → QA handoff readiness.

## When to use

- Before implementing a feature.
- Before refactoring.
- Before a non-trivial bug fix after root cause is known.
- Before database migration or config/data rollout.
- When the agent needs a task breakdown with verification steps.

## Do not use when

- Requirements are still vague; use `requirement-brainstorming`.
- Root cause is unknown; use `debugging-discipline`.
- The task is only test-case design; use `functional-test-design`.
- The task is already implemented and only needs verification; use `verification-before-completion`.

## Inputs expected

At least one of:

- Approved requirement / user stories / AC.
- SDD / TDD.
- API contract.
- Data/config change plan.
- Validated root cause and intended fix.

## Process

1. Identify change type and risk.
2. List affected components and files/directories.
3. Define implementation tasks in small, reviewable chunks.
4. Define required tests per task.
5. Define verification commands.
6. Define rollback or fallback path where relevant.
7. Define handoff to QA/Reviewer/Security.
8. Identify blockers and unresolved decisions.

## Planning rules

- Do not start implementation inside this skill.
- Every implementation task must have an expected verification step.
- Separate production-code changes from test changes.
- Identify whether TDD is required.
- Call out security-sensitive areas explicitly.
- If the plan touches auth, permission, secrets, sensitive data, payment, privacy, or production data, route to Security Reviewer.

## Output

Use `templates/IMPLEMENTATION_PLAN.md`.

## Completion checklist

- Tasks are small enough to review.
- Affected files/components are identified.
- Verification is explicit.
- Test ownership is clear.
- Risks and rollback are listed.
- Handoff destination is clear.
