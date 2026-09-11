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
2. List affected components and files/directories, and map the dependency graph between them (what must exist before what).
3. Define implementation tasks in small, reviewable chunks — slice vertically (one complete path through the layers touched) rather than horizontally (all of one layer before the next), ordered by the dependency graph.
4. Define required tests per task.
5. Define verification commands.
6. Define rollback or fallback path where relevant.
7. Place a checkpoint every 2-3 tasks: re-run tests, confirm the build/system still works, before continuing.
8. Note which tasks are safe to parallelize (independent slices) versus must be sequential (shared state, migrations, dependency chains).
9. Define handoff to QA/Reviewer/Security.
10. Identify blockers and unresolved decisions.

## Task Sizing

A task is too large when any of these hold — split it before starting:

- It would take more than one focused session.
- Its acceptance criteria cannot be stated in 3 or fewer bullet points.
- It touches two or more independent subsystems.
- Its title needs "and" to describe it — that is usually two tasks.

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
