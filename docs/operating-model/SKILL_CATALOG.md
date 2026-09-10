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

| Skill | Trigger | Primary Agent | Do Not Use When | Next Skill / Agent |
|---|---|---|---|---|
| Dynamic Workflow (`dynamic-workflow`) | Need to classify change type, select workflow, route agents, enforce gates, or perform contract-first Bug Fix validation | Orchestrator | The user already selected a specific role/task and no routing or contract validation is needed | Orchestrator, PM/BA/SA/Dev/QA/etc. |
| Frontend UI Engineering (`frontend-ui-engineering`) | Build or change user-facing UI, components, responsive layouts, visual/UX behavior, or accessibility | Developer Agent | Backend-only changes, requirement discovery without UI work, or generic test design | Developer Agent, then QA Agent / `qa-playwright-testing` |
| Management Status Update (`management-status-update`) | Boss status summary, team update, defect report, or GitHub/Slack/standup/email/meeting communication draft | Orchestrator | Posting externally, replacing a handoff/QA/RCA artifact, changing lifecycle/approval state, or making recommendation memos | User copies the print-only draft; QA Agent verifies implementation acceptance criteria |
| Functional Test Design (`functional-test-design`) | Need functional test cases from requirements, FS, business rules, IPO matrix, BVA/EP, Decision Table, State Transition, risk-based testing, traceability | QA Agent | Need automation script implementation only | Playwright/E2E skill, API test skill, regression planning, QA Agent |
| Static Logic Review (`static-logic-review`) | Changed production decision logic needs source-level dry-run tracing against an approved AC/specification/contract | QA Agent | Runtime QA, test design/effectiveness review, missing behavioral source, or docs/assets-only work | Developer Agent, BA Agent, SA Agent, Security Reviewer |
| Playwright QA (`qa-playwright-testing`) | Need browser E2E automation, UI flow testing, screenshots/traces, or WCAG 2.1 AA accessibility checks | QA Agent | Need only functional test design without automation | QA Agent, `defect-analysis` |
| Security Review (`security-review`) | Auth, authorization, secrets, sensitive data, input validation, dependency/security review | Security Reviewer | Pure functional happy path test design | Security Reviewer, SA, Developer |
| Defect Analysis (`defect-analysis`) | Test failure needs analysis of logs/screenshots/network payloads and severity classification before routing | QA Agent | Post-fix root-cause write-up (`engineering-postmortem`) or the `TEST_REPORT.md` roll-up summary itself | Developer Agent, Security Reviewer (Critical/security-relevant tier) |

## Engineering Discipline

| Skill | Trigger | Primary Agent | Do Not Use When | Next Skill / Agent |
|---|---|---|---|---|
| `debugging-discipline` | Bug, failing test, CI failure, stack trace, flaky behavior, regression, debug/diagnose request | QA Agent | Feature implementation with no failure; final RCA after validated fix | Developer Agent, QA Agent, BA Agent, SA Agent, Security Reviewer, `engineering-postmortem` |
| `engineering-postmortem` | Fixed and validated bug; user asks RCA/postmortem/root cause/write-up | Documentation Agent | Unfixed bug, unvalidated fix, speculative root cause, production incident | Release Agent, Documentation Agent, action item tracking |

### Skill boundaries

- `debugging-discipline` is for investigation and root cause discovery.
- `engineering-postmortem` is for the durable engineering record after validation.
- Do not use `engineering-postmortem` to turn an unvalidated hypothesis into polished prose.

## Planned Skills

These are intentionally not implemented yet but reserved for Phase 2+.

| Planned Skill | Purpose | Suggested Path |
|---|---|---|
| Regression Test Planning | Regression scope, impact matrix, smoke/sanity/regression set | `.agents/skills/regression-test-planning/` |
| Robot Framework Automation | Convert test cases into Robot Framework scripts | `.agents/skills/robot-framework-automation/` |
| Project Spec Bootstrap | One compact spec (Objective, Commands, Structure, Code Style, Testing, Boundaries) for a *new target application repo* — not this meta-repo. Deferred until a real target app exists; PM/BA/SA's existing artifacts already cover this repo's own needs. | `.agents/skills/project-spec-bootstrap/` |

Superseded (removed from this table because a real skill already covers the purpose): Data Change Validation and Config Change Validation → `data-config-change`; Code Review → `code-review-gate`; System Design Review → `sa-architecture-design`; API Test Design → `api-test-design`.

Note: `api-contract-testing` validates an existing implementation against a published schema; `api-test-design` (implemented this pass, closing the former Planned Skill of the same purpose) designs API test *cases* from a contract — related but distinct, not superseded. Similarly, `test-quality-discipline`'s anti-pattern review and `TEST_REPORT.md`'s Root Cause Analysis section are distinct from Defect Analysis (`defect-analysis`, implemented this pass, closing the former Planned Skill of the same purpose), which covers broader test-failure/log/screenshot analysis and produces the per-defect `docs/templates/DEFECT_REPORT.md`. `api-testing-tooling` provides Supertest/Bruno/Postman+Newman tooling for *executing* hand-scripted API tests; it does not close `api-test-design` either, since that skill is about designing what those test cases should be, not running them.


## Available Skills

| Skill | Trigger | Primary Agent | Do Not Use When | Next Skill / Agent |
|---|---|---|---|---|
| ba-requirement-analysis | Requirements, user stories, acceptance criteria, business rules, process flows, or ambiguity analysis needed | BA Agent | Business scope itself is unresolved — route to PM Agent first | implementation-planning, functional-test-design, SA Agent |
| sa-architecture-design | Architecture, API contract, data design, integration flow, NFR, or ADR needed | SA Agent | Requirements are still unclear — route to BA Agent first | implementation-planning, Developer Agent |
| data-config-change | Config change, reference/master data change, validation SQL, rollback SQL, or non-code operational change | Config Agent / Data Agent | The change needs code beyond the config/data value itself — the skill's Escalation Guard routes this to Orchestrator/SA Agent instead | QA Agent, Release Agent |
| requirement-brainstorming | Vague business idea, feature request, early requirement, stakeholder notes, missing acceptance criteria | PM Agent / BA Agent / Orchestrator | Implementation is already approved and planned | implementation-planning, functional-test-design, SA Agent |
| implementation-planning | Approved requirement/design needs executable task plan | SA Agent / Developer Agent / Orchestrator | Requirement is unclear or bug root cause is unknown | tdd-implementation, Developer Agent, QA Agent |
| tdd-implementation | Code behavior change requiring implementation | Developer Agent | Config-only, data-only, documentation-only, or no reliable repro/root cause | verification-before-completion, code-review-gate, QA Agent |
| verification-before-completion | Before saying done/fixed/ready for QA/ready for review/ready for release | Any Agent | Work is still in progress | code-review-gate, QA Agent, Release Agent |
| code-review-gate | Code changes are ready for review before QA, merge, or release | Developer Agent / Reviewer / Security Reviewer | No code changed or the task is requirement-only/test-design-only | QA Agent, Security Reviewer, Developer Agent for fixes |
| git-workflow-and-versioning | Every commit, or handing off a diff for review | Any Agent | Nothing has been changed yet; choosing a release version or writing a changelog entry (Release Agent's job) | code-review-gate, QA Agent |
| api-contract-testing | SA Agent has published or updated an OpenAPI schema and Developer Agent's implementation needs contract verification before QA sign-off | QA Agent | No OpenAPI schema exists yet — route to SA Agent's API Contract Governance rule first; or the task is designing API test *cases* rather than validating an existing implementation against a schema — use `api-test-design` instead | Developer Agent (implementation mismatch), SA Agent (schema mismatch) |
| performance-testing | SDD states a Performance/Reliability/Scalability NFR target that needs load/stress/spike/soak validation | QA Agent | No NFR target is stated in the SDD — record `Not validated — <reason>` per the canonical NFR Validation rule instead of running this skill speculatively | SA Agent (target itself questioned), Developer Agent (performance defect) |
| mutation-testing | QA Agent's Test Effectiveness rule applies to a core business-logic/service-layer module and coverage percentage alone isn't sufficient evidence; use mutmut for Python or Stryker for JS/TS | QA Agent | The module is a thin view/serializer/migration with no business logic; or coverage itself is still low (fix coverage gaps first) | Developer Agent (weak test / survived mutant fix) |
| test-quality-discipline | QA Agent reviewing Developer Agent's unit/component tests for effectiveness — overmocking, fragile assertions, test-only hooks, weak assertions | QA Agent | Reviewing E2E/Playwright tests (use `qa-playwright-testing`'s own automation discipline instead) or designing new test cases (use `functional-test-design`) | Developer Agent (test rewrite) |
| static-logic-review | A production-logic diff changes a decision branch, validation, calculation/threshold, mapping/transformation, state/side effect, authorization decision, or error mapping and an approved AC/specification/contract exists | QA Agent | Runtime QA execution, functional test design, test-quality/mutation review, docs/assets-only change, or no behavioral source; it is not a universal PR gate | Developer Agent (trace contradiction), BA Agent (business source gap), SA Agent (API/design gap), Security Reviewer (sensitive concern) |
| defect-analysis | A test failure (manual, `qa-playwright-testing` E2E, or API) needs its evidence (logs, screenshots, network/API payloads, stack traces) turned into a severity-classified, reproducible defect report | QA Agent | Writing a post-fix root-cause retrospective (use `engineering-postmortem`), actively investigating an already-assigned bug (use `debugging-discipline`), or recording the `TEST_REPORT.md` roll-up summary itself | Developer Agent (root-cause investigation), Security Reviewer (Critical/security-relevant tier) |
| api-testing-tooling | Target app has HTTP endpoints needing hand-written functional test coverage or a versionable API request collection, distinct from schema-contract fuzzing | QA Agent | The task is schema-contract validation against a published OpenAPI schema — use `api-contract-testing` instead | Developer Agent (implementation defect) |
| api-test-design | An OpenAPI schema, collection, or endpoint description exists and QA Agent needs to decide the test case list before any script or fuzz run exists | QA Agent | Validating an already-implemented endpoint against a published schema (`api-contract-testing`), or writing/running the actual scripts for a known case list (`api-testing-tooling`) | `api-testing-tooling` or `api-contract-testing` (execution), SA Agent (schema ambiguity) |
| api-compliance-patterns | An endpoint reads, writes, or returns personal (GDPR/CCPA), health (HIPAA-style), or payment (PCI-DSS) data, or needs a SOC2-style audit trail | Security Reviewer | No regulated data is involved — use the generic `security-review` Scan Checklist instead | Data Agent (PII Routing), Developer Agent (pattern implementation) |
| api-security-patterns | A new/changed endpoint accepts an object identifier and needs per-object authorization verification, or the user asks about OAuth/JWT/RBAC/API security checklist | Security Reviewer | No object-level authorization surface exists — the generic `security-review` Scan Checklist already covers project-wide auth config | Developer Agent (fix), SA Agent (missing/insufficient contract) |
| api-versioning-deprecation | An existing endpoint's request/response shape is changing, or a version needs a deprecation/sunset flow | SA Agent | The question is about release-level SemVer, not an individual API surface — that's Release Agent's Versioning and Changelog Contract | Developer Agent (implementation), Documentation Agent (migration guide) |
| api-observability-monitoring | A new service/endpoint tier needs health checks or SLA/SLO/SLI targets defined, or the user asks how to monitor an API | SA Agent | Targets already exist and need executing under load — use `performance-testing` instead | `performance-testing` (validate the defined targets), Developer Agent (implement logging) |
| api-integration-patterns | One app's endpoint calls another app's API, or the change involves webhooks/async events between services | SA Agent | The endpoint has no cross-app/cross-service integration surface — a single app's own contract is `sa-architecture-design`'s API Contract Governance instead | `api-observability-monitoring` (correlation ID), `api-mocking-sandbox` (isolating one side for debugging) |
| api-mocking-sandbox | A consumer needs to be developed/tested before the real provider endpoint is ready, or a dependency is too unstable/rate-limited to test against directly | Developer Agent / QA Agent | The real endpoint is available and stable — use `api-testing-tooling` or `api-contract-testing` directly instead | `api-contract-testing` (keep the mock honest against the schema) |
| js-unit-testing | A JS/TS code behavior change needs unit/component-level test coverage per `tdd-implementation` | QA Agent / Developer Agent | The target app is not JS/TS — use `python-unit-testing` instead | Developer Agent (failing/missing coverage), `mutation-testing` (verify test effectiveness) |
| python-unit-testing | A Python code behavior change needs unit/component-level test coverage per `tdd-implementation` | QA Agent / Developer Agent | The target app is not Python — use `js-unit-testing` instead | Developer Agent (failing/missing coverage), `mutation-testing` (verify test effectiveness) |
| coding-standards | General code-quality review — naming, immutability, error handling, code smells — for any stack this project targets | Developer Agent | The question is stack-specific architecture (repository/service layer, React component design) — use `backend-patterns`/`frontend-react-patterns` instead | `backend-patterns`, `frontend-react-patterns`, `code-review-gate` |
| backend-patterns | Implementing/reviewing a repository/service layer, N+1 query, caching strategy, or background job — Django/DRF or Node/Next.js+Supabase+Redis | Developer Agent | The question is authN/authZ (`api-security-patterns`) or rate-limit verification (`performance-testing`) | `api-security-patterns`, `performance-testing`, `api-observability-monitoring` |
| frontend-react-patterns | Deciding component composition, custom hook design, state-scope, memoization, form handling, or error boundaries in React/Next.js | Developer Agent | The question is accessibility/responsive/design-system delivery (`frontend-ui-engineering`) or aesthetic direction (`frontend-visual-design`) | `frontend-ui-engineering`, `frontend-visual-design`, `qa-playwright-testing` |
| frontend-visual-design | A new UI/product needs a deliberate visual identity, or an existing one reads as templated/generic | Developer Agent | Visual direction is already fully specified by an existing design system — apply it via `frontend-ui-engineering` instead | `frontend-react-patterns`, `frontend-ui-engineering` |
| documentation-closeout | A merged PR carries the `post-merge-closeout` label — signals a passing default-branch audit requiring closeout | Documentation Agent | No post-merge-closeout label exists, or the audit failed (use documentation-sync exception instead) | Human Maintainer (merge closeout PR) |
| release-readiness-checklist | Preparing a release: version bump, `CHANGELOG.md` entry, release evidence, rollback confirmation, or deployment strategy statement needed | Release Agent | No release is being prepared, or the task is atomic commit/pre-commit hygiene for a single change (`git-workflow-and-versioning`) | Human Maintainer (release approval) |

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
