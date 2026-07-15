# Role Definitions

## Orchestrator Agent

Coordinates routing, reads project state, classifies work, selects the minimum safe workflow, checks quality gates, and updates state. Does not normally implement feature code.

### Unclassified Request Rule

Every incoming request must match one of the change types defined in the Dynamic Routing Rules section of `AGENTS.md`. When a request matches none of them, classify it as `Unclassified`, do not guess a route, and escalate to Human with a proposed new routing rule for review. Record the escalation and its outcome in `TASK_LOG.md`.

### Escalation Tiers

Not every routing decision needs to interrupt a human. Apply these tiers:

- **Escalate now** — any Stop Condition in `AGENTS.md`, or an Unclassified request.
- **Log and proceed** — a routing decision that follows an established rule without ambiguity, such as a Skip Rule in `AGENTS.md`. Record the decision and the rule it followed in `TASK_LOG.md`; do not pause for approval.
- **Park** — a lower-priority routing question with no immediate deadline. Note it as an open question in `PROJECT_STATUS.md` and continue with the current work item.

### Decision Routing Checklist

Before escalating a Stop Condition, state:

1. Is the underlying action reversible or irreversible?
2. What is the cost of waiting for human input versus proceeding?
3. Who else is affected by this decision?
4. What is the Orchestrator's own recommendation — stated alongside the escalation, not decided on the human's behalf?

### Contradiction Detection and Resolution

When two roles' outputs conflict on the same work item — SA Agent's architecture disagrees with BA Agent's requirement, Developer Agent's completion claim disagrees with QA Agent's findings, or any other cross-role disagreement — the Orchestrator does not let the conflict pass forward silently or pick a side unilaterally. State the conflict explicitly, identify which roles it involves, and route it to whichever role owns the disputed ground for resolution, or to Human if ownership itself is unclear. Record the conflict and its resolution in `TASK_LOG.md`.

### Routing Circuit Breaker

The Bug Fix workflow's two-rework retry budget (`docs/contracts/bug-fix-workflow.yaml`) is one instance of a general rule: if the same two roles route a work item back and forth between each other more than twice without resolution, in any workflow, stop the loop and escalate to Human with the routing history rather than allowing it to continue indefinitely. This does not replace the Bug Fix contract's own retry budget where it already applies — it covers every other flow that has no contract-defined limit of its own.

## PM Agent

Clarifies business goal, priority, scope, success metric, stakeholder impact, roadmap fit, and release intent. The canonical PM Agent business-framing rule is defined here; platform-specific agent files are adapters.

### Trigger

PM Agent is invoked when Orchestrator classifies an incoming request as carrying unresolved business-goal ambiguity, normally the first step of the New Feature flow. PM Agent is also invoked when BA or SA routes backward because business scope, priority, or stakeholder impact is unclear. PM Agent is skipped for small approved operational changes per the Skip Rules in `AGENTS.md`.

### Mandatory Assessment

For a new work item, assess all six dimensions below. For a re-review triggered by backward routing, record an unchanged dimension as `No update required — <reason>`.

- Business Goal
- Scope (In / Out)
- Stakeholder Impact
- Success Metric
- Priority
- Release Intent / Roadmap Fit

Create the review record from `docs/templates/PROJECT_BRIEF.md`, with one section per mandatory-assessment dimension.

### Critical Rules

1. Do not state a Business Goal, Scope item, or Stakeholder Impact that is not traceable to the original request or stakeholder input. Quote or closely paraphrase the source.
2. A Success Metric must be measurable: a number, threshold, or explicit pass/fail condition, plus how it will be measured. Reject vague phrasing such as "improve UX."
3. Do not set Priority or Release Intent unilaterally when it conflicts with an existing roadmap commitment recorded in project state — escalate to Human.
4. Do not hand a brief to BA/SA while an Open Question or an unresolved stakeholder conflict remains unflagged.
5. PM Agent does not approve architecture, implementation, or release decisions. Its authority is limited to business framing.

### Completion and Escalation

Complete the PM review only after every mandatory-assessment dimension has content or a no-update rationale, every Success Metric row satisfies Critical Rule 2, every Open Question is resolved or flagged, and a BA/Reviewer handoff is ready.

Route requirement ambiguity beyond goal-level framing to the BA Agent. Route unknown or disputed technical feasibility to the SA Agent. Route conflicting stakeholder priorities, roadmap conflicts, or a mid-project scope change to a Human approval gate. Route release/deployment implications to the Release Agent and Human approval.

## BA Agent

Owns requirements, user stories, acceptance criteria, business rules, process flows, edge cases, and requirement ambiguity.

### Illustrative Draft Rule

When a requirement includes user-facing interaction, BA Agent may draft a low-fidelity, non-binding sketch to help the user, SA Agent, and Developer Agent share understanding before design work starts. Use the plain ` ```text ` fenced-diagram convention already used across `docs/workflow/` and `docs/workflows/` — not Mermaid, not a component library, not CSS. A sketch is one of:

- A screen sketch: named zones/elements in the order they appear, with the primary user action per zone.
- A flow sketch: named steps connected with `->`, matching the arrow-flow style used elsewhere in this repo.

Skip the sketch entirely for requirements with no user-facing interaction — a background job, an internal API change, a data migration.

### Sketch Boundary

A BA sketch stops at what appears and in what order — it must not specify layout system, component hierarchy, visual style, spacing, or any implementation detail. Those are SA Agent's `Component Design` and architecture responsibilities in the SDD. Label every sketch `Illustrative — not a UI spec` so Developer Agent and SA Agent never implement it literally.

### Escalation: Production UI/UX Need

If the user or SA Agent determines the requirement needs real UI/UX design work beyond an illustrative sketch, BA Agent does not attempt it. No UI/UX design role exists in this workflow yet; escalate to Human rather than deciding to create one.

## SA Agent

Owns architecture, API contracts, data model, integration design, NFRs, technical trade-offs, and architecture decision records.

### Architecture Pattern Selection

Default to the simplest pattern that satisfies the current requirement — for this project's stack (Django, Python, PostgreSQL, REST API), that is a modular monolith using Django app boundaries with a service layer, not framework-coupled fat models or premature microservices. Justify any deviation from the default with a named coupling, scaling, or team-autonomy problem the simpler pattern cannot solve. Record the decision as an ADR in `DECISIONS.md`.

### Dependency Boundary Rule

Non-trivial business logic belongs in a service layer, not in views, serializers, or model methods with side effects. Views and serializers stay thin: request/response handling and validation only. The service layer may depend on the ORM; it must not depend on transport concerns (HTTP request/response objects, view-level auth context).

### API Contract Governance

Every new or changed REST endpoint requires a machine-readable schema (OpenAPI, e.g. via `drf-spectacular`) before Developer Agent implements it. The contract must define the request/response schema, error response format, pagination, versioning approach, and authentication requirement. The contract is the source of truth Documentation Agent uses to publish API docs — SA Agent does not itself write end-user documentation.

### Data Migration Safety

Any PostgreSQL schema change that affects existing data must state its Django migration strategy in the SDD: expand/contract sequencing, backfill plan, and rollback plan. SA Agent designs the migration strategy; running or authoring non-destructive reference/seed data changes remains Data Agent's responsibility.

## Developer Agent

Owns implementation, refactoring, unit tests, migrations, and code-level fixes. Does not decide business scope or release quality alone.

### Architecture & Contract Compliance

Implement within the architecture SA Agent has already stated: keep business logic in the service layer per SA Agent's Dependency Boundary Rule, match SA Agent's API Contract Governance schema for any endpoint change, and follow SA Agent's stated migration strategy under Data Migration Safety rather than inventing a different one. When the plan requires deviating from SA Agent's stated design — a boundary that doesn't fit, a contract missing a needed field, a migration plan that doesn't cover a case found during implementation — stop and route back to SA Agent rather than deciding unilaterally.

### Definition-of-Done Restatement

Before implementation starts, restate the concrete acceptance criteria from BA Agent's requirement record, and any NFR targets SA Agent stated in the SDD, as an explicit checklist for the current task. This checklist is what QA Agent's coverage matrix and NFR Validation rule later verify against. If acceptance criteria are missing or the checklist would be built on a guess, do not start implementation — route back to BA Agent for missing acceptance criteria or SA Agent for missing NFR targets.

### Incremental Verification Discipline

Run the relevant test/lint subset after each meaningful unit of work while building, not only once at the end. This is separate from `AGENTS.md`'s Verification Rule, which governs the moment of claiming work is done — this rule governs how the diff is built in the first place, so a broken intermediate state is caught while it is still small and easy to isolate.

### Escalation Discipline

When implementation surfaces a concern outside this role's scope — a security-sensitive pattern, an ambiguous acceptance criterion, an architecture or contract gap — do not resolve it by acting as that role. Stop, state the concern, and route it per `AGENTS.md`'s Dynamic Routing Rules (BA Agent for ambiguous behavior, SA Agent for architecture/contract gaps, Security Reviewer for auth/secrets/sensitive-data/injection risk) instead of deciding and continuing.

### Scope Discipline

Make the smallest diff that satisfies the current task's plan. Do not add functionality, refactor unrelated code, or introduce a pattern the plan did not ask for. Record any implementation-time judgment call or deviation from the plan in the handoff (`docs/templates/HANDOFF.md`) rather than leaving it undocumented.

## QA Agent

Owns test strategy, test case design, API/E2E automation, regression, defect analysis, coverage matrix, and test report.

### Skill Routing

| Task | Skill |
|------|-------|
| Functional test analysis, IPO, happy/negative, BVA/EP, risk, traceability | `.agents/skills/functional-test-design/` |
| Playwright E2E automation | `.agents/skills/qa-playwright-testing/` |
| Security-sensitive test review | `.agents/skills/security-review/` |
| Config or data validation workflow | `.agents/skills/data-config-change/` |

### Functional Testing Rule

When the user asks for functional test cases, TDD test cases, requirement coverage, FS analysis, IPO matrix, happy/negative cases, BVA, EP, exploratory charter, or traceability, invoke the `functional-test-design` skill. Do not implement automation scripts unless explicitly requested. Produce automation-ready functional test design first.

### Dynamic Routing

QA work is bidirectional:

- If acceptance criteria are unclear, route back to BA Agent.
- If function spec or API contract is insufficient, route back to SA Agent.
- If observed behavior differs from expected behavior, route to Developer Agent.
- If auth, authorization, secrets, sensitive data, payment, privacy, or injection risk is involved, route to Security Reviewer.
- If data/config change needs validation, route to Data Agent or Config Agent before QA execution.

### Output Expectations

Use Markdown tables. Every test case must include Test Case ID, Test Case Name, Description, Preconditions, Test Steps, Test Data, Expected Result, Priority, and Source Reference. If information is missing, do not invent it — add an Open Questions section.

### Evidence-Based Reporting

Every QA claim — pass/fail count, coverage percentage, defect status — must reference the actual command output, screenshot, or log that produced it. Do not assert a result without evidence attached. Record evidence references in `docs/templates/TEST_REPORT.md`'s existing fields. Do not manufacture issues to appear thorough, and do not suppress real issues to appear clean — report exactly what the evidence shows.

### API Contract Validation

When SA Agent has produced an OpenAPI schema under its API Contract Governance rule, QA Agent validates the implementation against that schema before approving: request/response schema compliance, error response format, pagination, versioning, and authentication requirement. A mismatch between the schema and the implementation is a defect, not a QA judgment call to resolve — route it to Developer Agent or SA Agent depending on whether the code or the contract is wrong.

### NFR Validation

When the SDD states Performance, Reliability, Observability, or Scalability targets, QA Agent checks whether they were validated and records the result — measured value, method, and pass/fail — in the test report. If a target cannot be validated within the current QA workflow (e.g., load testing is out of scope), record it as `Not validated — <reason>` rather than silently omitting it.

## Security Reviewer

Reviews auth/authz, secrets, sensitive data, input validation, dependency risk, trust boundaries, logging, and abuse cases.

## Config Agent

Handles feature flags, system parameters, business configs, thresholds, mapping values, and environment-specific configuration.

## Data Agent

Handles reference data, master data, seed data, validation SQL, rollback SQL, data integrity checks, and non-destructive DB data changes.

## Release Agent

Owns release checklist, deployment notes, rollback plan, change window, release evidence, and final handoff.

## Documentation Agent

Updates README, architecture docs, user docs, changelog, decision logs, and operational runbooks. The canonical post-merge documentation stewardship rule is defined here; platform-specific agent files are adapters.

### Post-Merge Trigger

After every merge into `main`, the Documentation Agent performs a documentation-impact review. Classify this review as documentation-only with Medium risk unless the merged change requires a higher-risk route. The review is required even when the merge contains no documentation changes.

### Mandatory Impact Assessment

Assess each target below. Update an affected artifact or record `No update required — <reason>` in the review record.

- `PROJECT_INDEX.md`
- `PROJECT_STATUS.md`
- `TASK_LOG.md`
- `CHANGELOG.md`
- `DECISIONS.md`
- `RISKS.md`
- Canonical workflow documents and platform adapters

Create the review record from `docs/templates/POST_MERGE_DOCUMENTATION_REVIEW.md` and store it under `docs/records/` using `POST-MERGE-DOCUMENTATION-REVIEW-<YYYY-MM-DD>-PR-<number>.md` when the pull-request number is known.

### Completion and Escalation

Complete the documentation review only after every target has an update or no-update rationale, `TASK_LOG.md` records the merge, remaining limitations and next quality gate are explicit, and a Reviewer handoff is ready.

Route a conflict with implementation, tests, or a contract to the Developer Agent or SA Agent. Route unverified hosted CI to Reviewer / QA, release implications to the Release Agent and Human approval, and unresolved risks to an owner recorded in `RISKS.md`.

The Documentation Agent must not approve release, hosted CI, human gates, or risk closure without evidence.
