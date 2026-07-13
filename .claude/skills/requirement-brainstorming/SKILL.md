---
name: requirement-brainstorming
description: Use this skill when a business idea, feature request, vague requirement, stakeholder note, or early product concept needs to be refined into clear scope, assumptions, open questions, user stories, acceptance criteria, and handoff-ready requirement artifacts. Do not use this skill for implementation, architecture design, test automation, or bug fixing.
---

# Requirement Brainstorming Skill

Turn an unclear idea into a requirement artifact that PM, BA, SA, Dev, and QA can actually use.

## When to use

Use when the user provides:

- A rough business idea.
- A feature request.
- A vague requirement.
- Meeting notes or stakeholder notes.
- A request to clarify scope, user story, or acceptance criteria.
- Early-stage discovery before SA/Dev work.

## Do not use when

- The requirement is already approved and the task is implementation planning.
- The task is only writing code.
- The task is debugging a known failure.
- The task is test-case design only; use `functional-test-design` instead.
- The task is architecture/API/data model design; route to SA/architecture skill.

## Operating rules

1. Do not invent business facts.
2. Separate confirmed facts, assumptions, and open questions.
3. Ask clarifying questions only if the missing data blocks safe progress.
4. Produce a useful draft even when some details are missing.
5. Every acceptance criterion must be testable.
6. Identify whether the request is a new feature, enhancement, bug fix, config/data change, or documentation-only change.
7. Recommend the next agent and required artifacts.

## Process

### 1. Intake classification

Classify the request:

| Field | Value |
|---|---|
| Change Type | New Feature / Enhancement / Bug Fix / Config Change / Data Change / Test-only / Documentation-only / Unknown |
| Business Criticality | High / Medium / Low |
| User Impact | Internal / External / Customer-facing / Unknown |
| Code Change Required | Yes / No / Unknown |
| Security/Data Sensitivity | Yes / No / Unknown |

### 2. Context extraction

Extract:

- Business goal.
- Target users / actors.
- In-scope behavior.
- Out-of-scope behavior.
- Business rules.
- Constraints.
- Dependencies.
- Risks.
- Unknowns.

### 3. Requirement shaping

Produce:

- Problem statement.
- Scope statement.
- User stories.
- Acceptance criteria.
- Business rules.
- Open questions.
- Candidate test focus areas.

### 4. Handoff recommendation

Recommend the next route:

- PM Agent when business priority/scope is unresolved.
- BA Agent when user stories/AC need approval.
- SA Agent when architecture/API/data impact exists.
- Config/Data Agent when no code change is required.
- QA Agent when test design can start.
- Security Reviewer when auth, permission, privacy, financial, sensitive-data, or trust-boundary impact exists.

## Output

Use `templates/REQUIREMENT_DISCOVERY.md` unless the user asks for a compact summary.

## Completion checklist

Before finishing:

- Confirmed facts are separated from assumptions.
- Acceptance criteria are measurable.
- Open questions are listed.
- Change type is classified.
- Next agent/workflow is recommended.
- No implementation detail is presented as approved architecture.
