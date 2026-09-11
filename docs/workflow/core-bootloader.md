# Core Bootloader

## 1. Operating Principles & Golden Rules

1. **Safety and Fail-Closed Default**: When inputs are ambiguous, validations fail, or invariants are breached, stop and fail closed. Never guess, assume, or proceed past an unverified state.
2. **Source of Truth Order**:
   1. Explicit user instruction in the current task
   2. Approved project artifacts: requirements, SDD, TDD, ADR, test plan
   3. `PROJECT_STATUS.md` and `DECISIONS.md`
   4. Repository code and tests
   5. Historical notes/logs
   6. Agent inference or assumptions (labeled explicitly, never presented as confirmed fact)
3. **Strict Verification Discipline**: No completion claim ("done", "fixed", "ready") is permitted without fresh verification evidence. Re-run tests, inspect diffs, and cite command outputs.
4. **Minimal Blast Radius**: Scope diffs strictly to the assigned task. Never refactor unrelated files, bypass edit guards, or introduce unauthorized patterns.
5. **Role Boundary Integrity**: Respect role ownership. Do not perform the duties of another role without explicit routing or handoff.

## 2. Human Approval Gates

> [!IMPORTANT]
> Reference: `docs/operating-model/AGENT_OPERATING_MODEL.md#human-approval-gates`

Stop execution, preserve task checkpoint, set state to `blocked` with `stop_reason: human_review_required`, and request human approval before proceeding when a task touches any of the following:

- Business scope change or requirement alteration affecting project objectives.
- Major architecture decisions, foundational pattern shifts, or framework migrations.
- Authentication, authorization, permissions, secrets, cryptography, privacy, payment, or financial logic.
- Production data modifications or irreversible data changes.
- Database migrations with destructive operations (`DROP`, data-loss column modifications).
- Release, deployment, or rollback decisions.
- Removing or weakening tests, validations, lint rules, or security controls.
- Ambiguous requirements that materially change expected runtime behavior.

## 3. Universal Stop Conditions & Boundary Rules

Stop instead of continuing autonomously when:

- **Missing Critical Input**: Required input or contract is missing and assumptions would compromise correctness.
- **Rework Limit Exceeded**: A task reaches two verifying -> rework transitions and the subsequent verification fails; transition to `blocked` with `stop_reason: human_review_required`.
- **Broad or Unrelated Test Failures**: Failures occur outside the scope of the current change.
- **Human Gate Boundary**: The task encounters any Human Approval Gate enumerated in Section 2.
- **Unresolved Source Conflict**: Unresolvable contradiction exists between requirements, implementation, and test expectations.
- **CAS / Concurrency Conflict**: A compare-and-swap update detects a stale digest or concurrent modification.

## 4. Dispatch & Handoff Contract Index

Handoffs between agents must be structured, deterministic, and verifiable. Prose-only routing is strictly prohibited.

- **Dynamic Routing Policy**: Consult `docs/workflow/dynamic-routing.md` for change classification, minimum safe workflow selection, and terminal routing actions (`Dispatch`, `Human review`, `Blocked`).
- **Structured Handoff Schema**: Follow `docs/workflow/handoff-contract.md` and use `docs/templates/HANDOFF.md`. Every handoff requires explicit fields: From/To Agent, Work Item, Change Type, Risk Level, Evidence References, and Next Action/Owner.
- **Quality Gates**: Every lifecycle handoff must satisfy criteria in `docs/workflow/quality-gates.md` before advancing.
- **In-Turn Supervision**: Orchestrators supervise child tasks in-turn; receipt consumption and Boss-visible event generation occur within the active turn.

## 5. Compact Role & Skill Manifest

### Registered Roles (11)

| Role ID | Title | Core Responsibility |
|---|---|---|
| `orchestrator-agent` | Orchestrator Agent | Workflow routing, task lifecycle dispatch, gate enforcement, and status coordination. |
| `pm-agent` | PM Agent | Product framing, business goals, scope boundaries, success metrics, and priority. |
| `ba-agent` | BA Agent | Requirements discovery, user stories, acceptance criteria, and business rules. |
| `sa-agent` | SA Agent | System architecture, API contracts, data schema design, NFRs, and ADR governance. |
| `developer-agent` | Developer Agent | TDD implementation, code refactoring, unit tests, migrations, and defect fixes. |
| `qa-agent` | QA Agent | Test strategy, test case design, functional/E2E verification, and quality evidence. |
| `security-agent` | Security Reviewer | Auth/authz audit, vulnerability scanning, threat modeling, and sensitive data checks. |
| `config-agent` | Config Agent | System parameters, feature flag lifecycles, and code-free configuration changes. |
| `data-agent` | Data Agent | Master/reference data, non-destructive SQL changes, validation, and rollback scripts. |
| `release-agent` | Release Agent | Release checklists, deployment strategy, changelog, versioning, and release evidence. |
| `documentation-agent` | Documentation Agent | Documentation sync, architecture records, pre-merge impact, and post-merge closeout. |

### Available Skills (31)

| Skill Identifier | Primary Discipline | Brief Description |
|---|---|---|
| `dynamic-workflow` | Routing & Workflow | Classifies change types, enforces gates, and selects minimum safe workflow. |
| `ba-requirement-analysis` | Requirements | Analyzes user stories, acceptance criteria, and business rules. |
| `requirement-brainstorming` | Discovery | Explores early feature ideas and clarifies ambiguous business needs. |
| `sa-architecture-design` | Architecture | Designs modular systems, service layers, and architectural decision records. |
| `implementation-planning` | Planning | Breaks approved designs into phased, test-driven implementation tasks. |
| `tdd-implementation` | Implementation | Executes red-green-refactor cycle for verifiable code behavior changes. |
| `coding-standards` | Code Quality | Enforces immutability, clean error handling, naming conventions, and style. |
| `backend-patterns` | Backend Architecture | Implements repository patterns, query optimizations, caching, and jobs. |
| `frontend-ui-engineering` | Frontend Engineering | Builds accessible, responsive UI layouts adhering to design system specs. |
| `frontend-react-patterns` | React Engineering | Implements state scoping, memoization, hooks, and error boundaries. |
| `frontend-visual-design` | Visual Design | Establishes visual identity, typography, and aesthetic design direction. |
| `functional-test-design` | Test Design | Designs functional test cases using BVA, EP, decision tables, and IPO matrices. |
| `qa-playwright-testing` | Automation | Implements browser E2E flows, visual regression, and WCAG accessibility tests. |
| `api-test-design` | API Testing | Designs comprehensive API test suites from contract endpoint schemas. |
| `api-testing-tooling` | API Tooling | Implements scripted HTTP tests using Supertest, Bruno, or Newman. |
| `api-contract-testing` | Schema Validation | Validates live API responses against published OpenAPI contract schemas. |
| `performance-testing` | Performance QA | Measures latency, throughput, and stability under load/stress/spike tests. |
| `mutation-testing` | Test Effectiveness | Evaluates test harness quality and mutant survival rates via mutation testing. |
| `test-quality-discipline` | Test Architecture | Audits test suites for FIRST principles, overmocking, and fragile assertions. |
| `static-logic-review` | Static Verification | Traces changed production decision logic against approved specifications. |
| `defect-analysis` | Triage | Analyzes failures, logs, and traces to generate reproducible defect reports. |
| `debugging-discipline` | Investigation | Diagnoses root causes for failing tests, regressions, and flaky behaviors. |
| `engineering-postmortem` | Postmortem | Documents durable root cause analysis, timelines, and corrective actions. |
| `security-review` | Security Audit | Evaluates authorization, secrets, input validation, and trust boundaries. |
| `api-security-patterns` | API Security | Verifies object-level authorization (BOLA/IDOR) and OWASP API Top 10 risks. |
| `api-compliance-patterns` | Compliance | Implements audit logging, encryption, and GDPR/HIPAA/PCI data protections. |
| `api-versioning-deprecation` | API Governance | Manages schema evolution, backward compatibility, and sunset workflows. |
| `api-observability-monitoring` | Observability | Configures telemetry, health checks, SLA/SLO metrics, and structured logs. |
| `api-integration-patterns` | Integration | Implements resilient webhook handlers, retries, and async service patterns. |
| `api-mocking-sandbox` | Simulation | Creates mock HTTP fixtures and sandbox environments for isolated testing. |
| `js-unit-testing` | JS/TS Testing | Develops unit and component tests with Node native test runner or Jest. |
| `python-unit-testing` | Python Testing | Develops unit tests and fixtures using pytest with isolated mocking boundaries. |
| `data-config-change` | Config & Data | Prepares non-destructive SQL, rollback scripts, and feature flag lifecycles. |
| `git-workflow-and-versioning` | Source Control | Enforces atomic commits, conventional commit types, and clean branch hygiene. |
| `code-review-gate` | Peer Review | Evaluates code diffs against architectural standards and quality checklists. |
| `release-readiness-checklist` | Release QA | Verifies SemVer bumps, changelog entries, rollback plans, and deployment notes. |
| `documentation-closeout` | Documentation | Reconciles project status, syncs references, and handles post-merge audits. |
| `management-status-update` | Communication | Drafts non-binding executive status briefs and stakeholder updates. |
| `verification-before-completion` | Verification Gate | Enforces evidence collection and test suite execution prior to task closeout. |
