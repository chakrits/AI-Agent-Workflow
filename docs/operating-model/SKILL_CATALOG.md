# Skill Catalog

## Purpose

This catalog defines available skills, when to use them, when not to use them, required inputs, expected outputs, and next possible skills.

Agents must consult this catalog before selecting a skill. The goal is to prevent skill overlap, wrong routing, and accidental automation.

## Skill Selection Rules

1. Use a skill only when the task matches its trigger.
2. Prefer the most specific skill over a broad/general skill.
3. Do not use automation implementation skills when the user only asks for test design.
4. Do not use functional testing skill to implement Playwright/Robot/API scripts unless explicitly requested.
5. If no skill matches, use the agent's base role and document the gap.
6. If multiple skills match, select one primary skill and list supporting skills.
7. If the task is high risk, route through security/review gate even if the skill output appears complete.

## Current Skills

| Skill | Path | Trigger | Inputs | Outputs | Do Not Use When | Next Skill / Agent |
|---|---|---|---|---|---|---|
| Dynamic Workflow | `.agents/skills/dynamic-workflow/` | Need to classify change type, select workflow, route agents, enforce gates, or perform contract-first Bug Fix validation | User request, PROJECT_STATUS.md, workflow docs, and `task-state` for Bug Fix work | Selected workflow, required agents, gates, next step, and Bug Fix contract-validation status | The user already selected a specific role/task and no routing or contract validation is needed | Orchestrator, PM/BA/SA/Dev/QA/etc. |
| Functional Test Design | `.agents/skills/functional-test-design/` | Need functional test cases from requirements, FS, business rules, IPO matrix, BVA/EP, risk-based testing, traceability | URS/BRD, FS/TSD, user stories, AC, API/field rules | Function Test Report or Focused Functional Test Pack | Need automation script implementation only | Playwright/E2E skill, API test skill, regression planning, QA Agent |
| Playwright QA | `.agents/skills/playwright-qa/` | Need browser E2E automation, UI flow testing, screenshots/traces | Test scenarios, target URL/app, credentials/test data, selectors/locators | Playwright specs, test run notes, screenshots/traces | Need only functional test design without automation | QA Agent, Defect Analysis |
| Security Review | `.agents/skills/security-review/` | Auth, authorization, secrets, sensitive data, input validation, dependency/security review | Code diff, architecture, API, data flow, threat context | Security review notes, findings, severity, recommended fixes | Pure functional happy path test design | Security Reviewer, SA, Developer |


## Engineering Discipline

| Skill | Trigger | Input | Output | Do Not Use When | Next Skill / Agent |
|---|---|---|---|---|---|
| `debugging-discipline` | Bug, failing test, CI failure, stack trace, flaky behavior, regression, debug/diagnose request | Failure evidence, logs, test output, env, repro artifacts | Debug ledger, repro steps, hypothesis matrix, fix direction | Feature implementation with no failure; final RCA after validated fix | Developer Agent, QA Agent, BA Agent, SA Agent, Security Reviewer, `engineering-postmortem` |
| `engineering-postmortem` | Fixed and validated bug; user asks RCA/postmortem/root cause/write-up | Reliable repro, known root cause, fix pointer, validation evidence | Bug postmortem / RCA / engineering write-up | Unfixed bug, unvalidated fix, speculative root cause, production incident | Release Agent, Documentation Agent, action item tracking |

### Skill boundaries

- `debugging-discipline` is for investigation and root cause discovery.
- `engineering-postmortem` is for the durable engineering record after validation.
- Do not use `engineering-postmortem` to turn an unvalidated hypothesis into polished prose.



## Planned Skills

These are intentionally not implemented yet but reserved for Phase 2+.

| Planned Skill | Purpose | Suggested Path |
|---|---|---|
| API Test Design | API contract, request/response, status codes, schema, negative API tests | `.agents/skills/api-test-design/` |
| Regression Test Planning | Regression scope, impact matrix, smoke/sanity/regression set | `.agents/skills/regression-test-planning/` |
| Defect Analysis | Analyze test failures, logs, screenshots, reproduce steps, severity | `.agents/skills/defect-analysis/` |
| Robot Framework Automation | Convert test cases into Robot Framework scripts | `.agents/skills/robot-framework-automation/` |
| Data Change Validation | SQL/data config validation, duplicate checks, rollback checks | `.agents/skills/data-change-validation/` |
| Config Change Validation | Feature flags/config behavior verification | `.agents/skills/config-change-validation/` |
| Code Review | Maintainability, correctness, design, performance, testability review | `.agents/skills/code-review/` |
| System Design Review | Review SDD/API/data model/NFR/ADR | `.agents/skills/system-design-review/` |
| Project Spec Bootstrap | One compact spec (Objective, Commands, Structure, Code Style, Testing, Boundaries) for a *new target application repo* — not this meta-repo. Deferred until a real target app exists; PM/BA/SA's existing artifacts already cover this repo's own needs. | `.agents/skills/project-spec-bootstrap/` |


## requirement-brainstorming

| Field | Detail |
|---|---|
| Trigger | Vague business idea, feature request, early requirement, stakeholder notes, missing acceptance criteria |
| Primary Agent | PM Agent / BA Agent / Orchestrator |
| Input | User request, meeting notes, business context |
| Output | Requirement discovery, user stories, acceptance criteria, open questions |
| Do Not Use When | Implementation is already approved and planned |
| Next Skill / Agent | implementation-planning, functional-test-design, SA Agent |

## implementation-planning

| Field | Detail |
|---|---|
| Trigger | Approved requirement/design needs executable task plan |
| Primary Agent | SA Agent / Developer Agent / Orchestrator |
| Input | REQUIREMENTS, SDD, TDD, API contract, validated bug fix decision |
| Output | IMPLEMENTATION_PLAN.md, task breakdown, verification plan |
| Do Not Use When | Requirement is unclear or bug root cause is unknown |
| Next Skill / Agent | tdd-implementation, Developer Agent, QA Agent |

## tdd-implementation

| Field | Detail |
|---|---|
| Trigger | Code behavior change requiring implementation |
| Primary Agent | Developer Agent |
| Input | Implementation plan, expected behavior, test seam |
| Output | Failing test, minimal implementation, passing verification, TDD checklist |
| Do Not Use When | Config-only, data-only, documentation-only, or no reliable repro/root cause |
| Next Skill / Agent | verification-before-completion, code-review-gate, QA Agent |

## verification-before-completion

| Field | Detail |
|---|---|
| Trigger | Before saying done/fixed/ready for QA/ready for review/ready for release |
| Primary Agent | Any agent |
| Input | Work output, commands run, test results, artifacts |
| Output | COMPLETION_CHECK.md |
| Do Not Use When | Work is still in progress |
| Next Skill / Agent | code-review-gate, QA Agent, Release Agent |

## code-review-gate

| Field | Detail |
|---|---|
| Trigger | Code changes are ready for review before QA, merge, or release |
| Primary Agent | Developer Agent / Reviewer / Security Reviewer |
| Input | Changed files, implementation notes, tests, verification evidence |
| Output | CODE_REVIEW_REQUEST.md, CODE_REVIEW_FINDINGS.md |
| Do Not Use When | No code changed or the task is requirement-only/test-design-only |
| Next Skill / Agent | QA Agent, Security Reviewer, Developer Agent for fixes |

## git-workflow-and-versioning

| Field | Detail |
|---|---|
| Trigger | Every commit, or handing off a diff for review |
| Primary Agent | Any agent |
| Input | Staged changes |
| Output | An atomic, type-prefixed commit; a change summary when handing off |
| Do Not Use When | Nothing has been changed yet; choosing a release version or writing a changelog entry (Release Agent's job) |
| Next Skill / Agent | code-review-gate, QA Agent |




## Skill Activation Examples

### Functional Test Design

Use when the request says:

- "สร้าง functional test case จาก requirement"
- "ออกแบบ TDD test cases"
- "ทำ BVA/EP/negative cases"
- "ทำ traceability matrix ระหว่าง requirement กับ test case"

Do not use when the request says only:

- "เขียน Playwright script ให้เลย"
- "run automation test"
- "แก้ locator ใน test script"

### Dynamic Workflow

Use when the request says:

- "งานนี้ควรให้ agent ไหนทำ"
- "ช่วย route workflow"
- "งานนี้เป็น config change ต้องผ่าน Dev ไหม"
- "เลือก flow ให้หน่อย"

### Security Review

Use when the task touches:

- Login, OTP, session, token, password, permission, RBAC
- User data, privacy, payment, financial data
- Input validation, file upload, SQL, command execution
- Dependency or supply-chain risk

## Required Skill Output Metadata

Each skill output should include:

| Field | Description |
|---|---|
| Skill Used | Name of selected skill |
| Mode | Full / Focused / Advisory / Review |
| Source Inputs | Files, docs, snippets, or assumptions used |
| Confidence | High / Medium / Low |
| Assumptions | Clearly separated assumptions |
| Open Questions | Items requiring user/BA/SA/Dev clarification |
| Next Recommended Agent | Who should receive handoff next |
| Quality Gate Status | Passed / Failed / Blocked / N/A |
| Task State | Current canonical `task-state` for Bug Fix work |
| Contract Version | Version from the Bug Fix contract used for validation |
| Rework Count | Number of verifying -> rework transitions recorded |
| Evidence References | Evidence keys/locations that support the transition or handoff |
| Stop Reason | Required when Bug Fix work is blocked; use `human_review_required` after the two-rework limit |
