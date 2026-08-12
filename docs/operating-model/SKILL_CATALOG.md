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
| Dynamic Workflow | `.agents/skills/dynamic-workflow/` | Need to classify change type, select workflow, route agents, enforce gates, or perform contract-first Bug Fix validation | User request, PROJECT_STATUS.md, workflow docs, and `task-state` for Bug Fix work | Selected workflow, task-execution mode when risk-triggered, required agents, gates, next step, and Bug Fix contract-validation status | The user already selected a specific role/task and no routing or contract validation is needed | Orchestrator, PM/BA/SA/Dev/QA/etc. |
| Frontend UI Engineering | `.agents/skills/frontend-ui-engineering/` | Build or change user-facing UI, components, responsive layouts, visual/UX behavior, or accessibility | Target UI context, existing design system, acceptance criteria, supported breakpoints | Accessible, responsive, maintainable UI guidance and a QA handoff when browser automation is needed | Backend-only changes, requirement discovery without UI work, or generic test design | Developer Agent, then QA Agent / `qa-playwright-testing` |
| Management Status Update | `.agents/skills/management-status-update/` | Boss status summary, team update, defect report, or GitHub/Slack/standup/email/meeting communication draft | Evidence-backed Issue/PR/work item, handoff, QA/test/RCA artifact, notes, or conversation context | Thai-first Boss, Leadership, team, or defect update draft with confirmed facts, unknowns, evidence, and next action | Posting externally, replacing a handoff/QA/RCA artifact, changing lifecycle/approval state, or making recommendation memos | User copies the print-only draft; QA Agent verifies implementation acceptance criteria |
| Functional Test Design | `.agents/skills/functional-test-design/` | Need functional test cases from requirements, FS, business rules, IPO matrix, BVA/EP, Decision Table, State Transition, risk-based testing, traceability | URS/BRD, FS/TSD, user stories, AC, API/field rules | Function Test Report or Focused Functional Test Pack | Need automation script implementation only | Playwright/E2E skill, API test skill, regression planning, QA Agent |
| Static Logic Review | `.agents/skills/static-logic-review/` | Changed production decision logic needs source-level dry-run tracing against an approved AC/specification/contract | Exact diff, approved source, reachable state/side effects | `SLR-` static finding or `Potential Requirement Gap` in existing code-review record | Runtime QA, test design/effectiveness review, missing behavioral source, or docs/assets-only work | Developer Agent, BA Agent, SA Agent, Security Reviewer |
| Playwright QA | `.agents/skills/qa-playwright-testing/` | Need browser E2E automation, UI flow testing, screenshots/traces, or WCAG 2.1 AA accessibility checks | Test scenarios, target URL/app, credentials/test data, selectors/locators | Playwright specs, test run notes, screenshots/traces, accessibility violation reports | Need only functional test design without automation | QA Agent, `defect-analysis` |
| Security Review | `.agents/skills/security-review/` | Auth, authorization, secrets, sensitive data, input validation, dependency/security review | Code diff, architecture, API, data flow, threat context | Security review notes, findings, severity, recommended fixes | Pure functional happy path test design | Security Reviewer, SA, Developer |
| Defect Analysis | `.agents/skills/defect-analysis/` | Test failure needs analysis of logs/screenshots/network payloads and severity classification before routing | Failing test case, log/screenshot/payload evidence, environment details | `docs/templates/DEFECT_REPORT.md` (redacted evidence, severity, reproduction steps) | Post-fix root-cause write-up (`engineering-postmortem`) or the `TEST_REPORT.md` roll-up summary itself | Developer Agent, Security Reviewer (Critical/security-relevant tier) |


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
| Regression Test Planning | Regression scope, impact matrix, smoke/sanity/regression set | `.agents/skills/regression-test-planning/` |
| Robot Framework Automation | Convert test cases into Robot Framework scripts | `.agents/skills/robot-framework-automation/` |
| Project Spec Bootstrap | One compact spec (Objective, Commands, Structure, Code Style, Testing, Boundaries) for a *new target application repo* — not this meta-repo. Deferred until a real target app exists; PM/BA/SA's existing artifacts already cover this repo's own needs. | `.agents/skills/project-spec-bootstrap/` |

Superseded (removed from this table because a real skill already covers the purpose): Data Change Validation and Config Change Validation → `data-config-change`; Code Review → `code-review-gate`; System Design Review → `sa-architecture-design`; API Test Design → `api-test-design`.

Note: `api-contract-testing` validates an existing implementation against a published schema; `api-test-design` (implemented this pass, closing the former Planned Skill of the same purpose) designs API test *cases* from a contract — related but distinct, not superseded. Similarly, `test-quality-discipline`'s anti-pattern review and `TEST_REPORT.md`'s Root Cause Analysis section are distinct from Defect Analysis (`defect-analysis`, implemented this pass, closing the former Planned Skill of the same purpose), which covers broader test-failure/log/screenshot analysis and produces the per-defect `docs/templates/DEFECT_REPORT.md`. `api-testing-tooling` provides Supertest/Bruno/Postman+Newman tooling for *executing* hand-scripted API tests; it does not close `api-test-design` either, since that skill is about designing what those test cases should be, not running them.


## ba-requirement-analysis

| Field | Detail |
|---|---|
| Trigger | Requirements, user stories, acceptance criteria, business rules, process flows, or ambiguity analysis needed |
| Primary Agent | BA Agent |
| Input | PM brief, stakeholder notes, existing `REQUIREMENT_DISCOVERY.md` |
| Output | `docs/templates/REQUIREMENT_DISCOVERY.md` |
| Do Not Use When | Business scope itself is unresolved — route to PM Agent first |
| Next Skill / Agent | implementation-planning, functional-test-design, SA Agent |

## sa-architecture-design

| Field | Detail |
|---|---|
| Trigger | Architecture, API contract, data design, integration flow, NFR, or ADR needed |
| Primary Agent | SA Agent |
| Input | Approved requirements, existing architecture docs |
| Output | SDD/TDD, ADR entries in `DECISIONS.md` |
| Do Not Use When | Requirements are still unclear — route to BA Agent first |
| Next Skill / Agent | implementation-planning, Developer Agent |

## data-config-change

| Field | Detail |
|---|---|
| Trigger | Config change, reference/master data change, validation SQL, rollback SQL, or non-code operational change |
| Primary Agent | Config Agent / Data Agent |
| Input | Approved requirement, target environment, current values |
| Output | `CONFIG_CHANGE_PLAN.md` or `DATA_CHANGE_PLAN.md` |
| Do Not Use When | The change needs code beyond the config/data value itself — the skill's Escalation Guard routes this to Orchestrator/SA Agent instead |
| Next Skill / Agent | QA Agent, Release Agent |

**Meta-repo note:** For CI YAML / package.json config changes in a meta-repo context (no Django/PostgreSQL target application), use base Config Agent role and document the gap in TASK_LOG: `No matching skill — meta-repo CI config, used base Config Agent role`

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

## api-contract-testing

| Field | Detail |
|---|---|
| Trigger | SA Agent has published or updated an OpenAPI schema and Developer Agent's implementation needs contract verification before QA sign-off |
| Primary Agent | QA Agent |
| Input | OpenAPI schema (`drf-spectacular`), implemented endpoint, target environment |
| Output | Contract validation evidence (schemathesis run output, checks) recorded in `TEST_REPORT.md` |
| Do Not Use When | No OpenAPI schema exists yet — route to SA Agent's API Contract Governance rule first; or the task is designing API test *cases* rather than validating an existing implementation against a schema — use `api-test-design` instead |
| Next Skill / Agent | Developer Agent (implementation mismatch), SA Agent (schema mismatch) |

## performance-testing

| Field | Detail |
|---|---|
| Trigger | SDD states a Performance/Reliability/Scalability NFR target that needs load/stress/spike/soak validation |
| Primary Agent | QA Agent |
| Input | SDD's stated NFR target, target environment, chosen tool (Locust/k6/other per SDD) |
| Output | Measured value, method, pass/fail recorded in `TEST_PLAN.md`'s NFR Targets table and `TEST_REPORT.md` |
| Do Not Use When | No NFR target is stated in the SDD — record `Not validated — <reason>` per the canonical NFR Validation rule instead of running this skill speculatively |
| Next Skill / Agent | SA Agent (target itself questioned), Developer Agent (performance defect) |

## mutation-testing

| Field | Detail |
|---|---|
| Trigger | QA Agent's Test Effectiveness rule applies to a core business-logic/service-layer module and coverage percentage alone isn't sufficient evidence |
| Primary Agent | QA Agent |
| Input | Existing unit/component test suite, target module (service layer), mutmut (Python) or Stryker (JS/TS) per project stack |
| Output | Mutation score and survived-mutant list recorded in `TEST_REPORT.md` |
| Do Not Use When | The module is a thin view/serializer/migration with no business logic; or coverage itself is still low (fix coverage gaps first) |
| Next Skill / Agent | Developer Agent (weak test / survived mutant fix) |

## test-quality-discipline

| Field | Detail |
|---|---|
| Trigger | QA Agent reviewing Developer Agent's unit/component tests for effectiveness — overmocking, fragile assertions, test-only hooks, weak assertions |
| Primary Agent | QA Agent |
| Input | Developer Agent's test files for the change under review |
| Output | Anti-pattern findings recorded in `TEST_REPORT.md`, routed as defects |
| Do Not Use When | Reviewing E2E/Playwright tests (use `qa-playwright-testing`'s own automation discipline instead) or designing new test cases (use `functional-test-design`) |
| Next Skill / Agent | Developer Agent (test rewrite) |

## static-logic-review

| Field | Detail |
|---|---|
| Trigger | A production-logic diff changes a decision branch, validation, calculation/threshold, mapping/transformation, state/side effect, authorization decision, or error mapping and an approved AC/specification/contract exists |
| Primary Agent | QA Agent; Developer self-use is advisory only |
| Input | Exact diff, approved behavioral source, reachable callers/state/side effects |
| Output | Source-grounded `SLR-` trace finding or `Potential Requirement Gap` in the existing code-review record |
| Do Not Use When | Runtime QA execution, functional test design, test-quality/mutation review, docs/assets-only change, or no behavioral source; it is not a universal PR gate |
| Next Skill / Agent | Developer Agent (trace contradiction), BA Agent (business source gap), SA Agent (API/design gap), Security Reviewer (sensitive concern) |

## defect-analysis

| Field | Detail |
|---|---|
| Trigger | A test failure (manual, `qa-playwright-testing` E2E, or API) needs its evidence (logs, screenshots, network/API payloads, stack traces) turned into a severity-classified, reproducible defect report |
| Primary Agent | QA Agent |
| Input | Failing test case, log/screenshot/payload evidence, environment details |
| Output | `docs/templates/DEFECT_REPORT.md` (redacted evidence, severity classification, reproduction steps) |
| Do Not Use When | Writing a post-fix root-cause retrospective (use `engineering-postmortem`), actively investigating an already-assigned bug (use `debugging-discipline`), or recording the `TEST_REPORT.md` roll-up summary itself |
| Next Skill / Agent | Developer Agent (root-cause investigation), Security Reviewer (Critical/security-relevant tier) |

## api-testing-tooling

| Field | Detail |
|---|---|
| Trigger | Target app has HTTP endpoints needing hand-written functional test coverage or a versionable API request collection, distinct from schema-contract fuzzing |
| Primary Agent | QA Agent |
| Input | Target app's HTTP endpoints, auth requirements, target environment |
| Output | Supertest test results, Bruno collection run output, or Newman (Postman collection) run output recorded in `TEST_REPORT.md` |
| Do Not Use When | The task is schema-contract validation against a published OpenAPI schema — use `api-contract-testing` instead |
| Next Skill / Agent | Developer Agent (implementation defect) |

## api-test-design

| Field | Detail |
|---|---|
| Trigger | An OpenAPI schema, collection, or endpoint description exists and QA Agent needs to decide the test case list before any script or fuzz run exists |
| Primary Agent | QA Agent |
| Input | OpenAPI schema, Postman/Bruno collection, or plain endpoint description |
| Output | Test case table (IPO/BVA/EP per endpoint) recorded in `TEST_PLAN.md` / `TEST_REPORT.md` |
| Do Not Use When | Validating an already-implemented endpoint against a published schema (`api-contract-testing`), or writing/running the actual scripts for a known case list (`api-testing-tooling`) |
| Next Skill / Agent | `api-testing-tooling` or `api-contract-testing` (execution), SA Agent (schema ambiguity) |

## api-compliance-patterns

| Field | Detail |
|---|---|
| Trigger | An endpoint reads, writes, or returns personal (GDPR/CCPA), health (HIPAA-style), or payment (PCI-DSS) data, or needs a SOC2-style audit trail |
| Primary Agent | Security Reviewer |
| Input | Endpoint/field list, applicable regulation, existing data classification if any |
| Output | Field classification, masking/retention/consent/audit-log pattern recorded in `SECURITY_REVIEW.md` |
| Do Not Use When | No regulated data is involved — use the generic `security-review` Scan Checklist instead |
| Next Skill / Agent | Data Agent (PII Routing), Developer Agent (pattern implementation) |

## api-security-patterns

| Field | Detail |
|---|---|
| Trigger | A new/changed endpoint accepts an object identifier and needs per-object authorization verification, or the user asks about OAuth/JWT/RBAC/API security checklist |
| Primary Agent | Security Reviewer |
| Input | Endpoint contract, auth requirement, object ownership model |
| Output | BOLA/mass-assignment/data-exposure findings recorded in `SECURITY_REVIEW.md`, severity per the canonical Severity Scale |
| Do Not Use When | No object-level authorization surface exists — the generic `security-review` Scan Checklist already covers project-wide auth config |
| Next Skill / Agent | Developer Agent (fix), SA Agent (missing/insufficient contract) |

## api-versioning-deprecation

| Field | Detail |
|---|---|
| Trigger | An existing endpoint's request/response shape is changing, or a version needs a deprecation/sunset flow |
| Primary Agent | SA Agent |
| Input | Current contract, proposed change, known consumers |
| Output | Breaking/non-breaking classification, versioning approach, deprecation timeline recorded in the SDD/ADR |
| Do Not Use When | The question is about release-level SemVer, not an individual API surface — that's Release Agent's Versioning and Changelog Contract |
| Next Skill / Agent | Developer Agent (implementation), Documentation Agent (migration guide) |

## api-observability-monitoring

| Field | Detail |
|---|---|
| Trigger | A new service/endpoint tier needs health checks or SLA/SLO/SLI targets defined, or the user asks how to monitor an API |
| Primary Agent | SA Agent |
| Input | Service/endpoint tier, criticality, existing NFR targets if any |
| Output | Liveness/readiness check design, SLA/SLO/SLI table, logging/alerting fields recorded in the SDD |
| Do Not Use When | Targets already exist and need executing under load — use `performance-testing` instead |
| Next Skill / Agent | `performance-testing` (validate the defined targets), Developer Agent (implement logging) |

## api-integration-patterns

| Field | Detail |
|---|---|
| Trigger | One app's endpoint calls another app's API, or the change involves webhooks/async events between services |
| Primary Agent | SA Agent |
| Input | Both sides' contracts, retry/idempotency requirements, event flow |
| Output | Webhook verification, retry/backoff policy, correlation-ID propagation, dead-letter handling recorded in the SDD |
| Do Not Use When | The endpoint has no cross-app/cross-service integration surface — a single app's own contract is `sa-architecture-design`'s API Contract Governance instead |
| Next Skill / Agent | `api-observability-monitoring` (correlation ID), `api-mocking-sandbox` (isolating one side for debugging) |

## api-mocking-sandbox

| Field | Detail |
|---|---|
| Trigger | A consumer needs to be developed/tested before the real provider endpoint is ready, or a dependency is too unstable/rate-limited to test against directly |
| Primary Agent | Developer Agent / QA Agent |
| Input | The dependency's OpenAPI schema (preferred) or a captured real request/response pair |
| Output | Mock server/stub/fixture definition under `tests/api/fixtures/` |
| Do Not Use When | The real endpoint is available and stable — use `api-testing-tooling` or `api-contract-testing` directly instead |
| Next Skill / Agent | `api-contract-testing` (keep the mock honest against the schema) |

## js-unit-testing

| Field | Detail |
|---|---|
| Trigger | A JS/TS code behavior change needs unit/component-level test coverage per `tdd-implementation` |
| Primary Agent | QA Agent / Developer Agent |
| Input | Target module, existing test suite (if any), Jest or Vitest per project convention |
| Output | Test run results recorded in `TEST_REPORT.md` |
| Do Not Use When | The target app is not JS/TS — use `python-unit-testing` instead |
| Next Skill / Agent | Developer Agent (failing/missing coverage), `mutation-testing` (verify test effectiveness) |

## python-unit-testing

| Field | Detail |
|---|---|
| Trigger | A Python code behavior change needs unit/component-level test coverage per `tdd-implementation` |
| Primary Agent | QA Agent / Developer Agent |
| Input | Target module, existing test suite (if any), pytest |
| Output | Test run results recorded in `TEST_REPORT.md` |
| Do Not Use When | The target app is not Python — use `js-unit-testing` instead |
| Next Skill / Agent | Developer Agent (failing/missing coverage), `mutation-testing` (verify test effectiveness) |

## coding-standards

| Field | Detail |
|---|---|
| Trigger | General code-quality review — naming, immutability, error handling, code smells — for any stack this project targets |
| Primary Agent | Developer Agent |
| Input | Code diff or module under review |
| Output | Naming/immutability/error-handling findings, recorded in `CODE_REVIEW_FINDINGS.md` |
| Do Not Use When | The question is stack-specific architecture (repository/service layer, React component design) — use `backend-patterns`/`frontend-react-patterns` instead |
| Next Skill / Agent | `backend-patterns`, `frontend-react-patterns`, `code-review-gate` |

## backend-patterns

| Field | Detail |
|---|---|
| Trigger | Implementing/reviewing a repository/service layer, N+1 query, caching strategy, or background job — Django/DRF or Node/Next.js+Supabase+Redis |
| Primary Agent | Developer Agent |
| Input | Target endpoint/module, data-access pattern, stack (Django or Node/Next.js) |
| Output | Repository/caching/background-job pattern applied, recorded in implementation notes |
| Do Not Use When | The question is authN/authZ (`api-security-patterns`) or rate-limit verification (`performance-testing`) |
| Next Skill / Agent | `api-security-patterns`, `performance-testing`, `api-observability-monitoring` |

## frontend-react-patterns

| Field | Detail |
|---|---|
| Trigger | Deciding component composition, custom hook design, state-scope, memoization, form handling, or error boundaries in React/Next.js |
| Primary Agent | Developer Agent |
| Input | Target component/feature, existing state-management convention |
| Output | Component architecture decision applied, recorded in implementation notes |
| Do Not Use When | The question is accessibility/responsive/design-system delivery (`frontend-ui-engineering`) or aesthetic direction (`frontend-visual-design`) |
| Next Skill / Agent | `frontend-ui-engineering`, `frontend-visual-design`, `qa-playwright-testing` |

## frontend-visual-design

| Field | Detail |
|---|---|
| Trigger | A new UI/product needs a deliberate visual identity, or an existing one reads as templated/generic |
| Primary Agent | Developer Agent |
| Input | Design brief or product context, existing brand/design-system constraints if any |
| Output | Color/type/layout token plan + signature element, applied via `frontend-react-patterns`/`frontend-ui-engineering` |
| Do Not Use When | Visual direction is already fully specified by an existing design system — apply it via `frontend-ui-engineering` instead |
| Next Skill / Agent | `frontend-react-patterns`, `frontend-ui-engineering` |

## documentation-closeout

| Field | Detail |
|---|---|
| Trigger | A merged PR carries the `post-merge-closeout` label — signals a passing default-branch audit requiring closeout |
| Primary Agent | Documentation Agent |
| Input | Merged PR with post-merge-closeout label, project state files |
| Output | Closeout PR with completion marker, updated PROJECT_STATUS/TASK_LOG/CHANGELOG, labels removed |
| Do Not Use When | No post-merge-closeout label exists, or the audit failed (use documentation-sync exception instead) |
| Next Skill / Agent | Human Maintainer (merge closeout PR) |


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
