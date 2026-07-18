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

### Terminal Dispatch and Boss Visibility

When an agent produces a terminal handoff, the Orchestrator must record exactly one outcome in the same active Orchestrator turn: `Dispatch`, `Human review`, or `Blocked`. `Dispatch` requires a named non-human target plus a receipt containing the source/target, supplied evidence, and dispatch result. The Orchestrator must not treat a prose-only next-agent recommendation as a completed route.

The dispatch receipt uses `pending`, `dispatched`, `acknowledged`, `completed`, or `blocked`. `dispatched` only proves a recorded attempt; an `acknowledged` state requires target-agent or runtime evidence. If the platform cannot provide callback evidence, report `acknowledgement pending` honestly.

Every terminal outcome creates a Boss-visible event with the completed work and quality-gate result, next action/owner, receipt state/evidence, and any blocker or decision need. `Human review` is a stop: record `Dispatch State: blocked` with `Stop Reason: human_review_required`, prepare context for Boss, and do not bypass the human gate. Dispatch-control states are not lifecycle labels and do not replace phase/status evidence.

For asynchronous dispatches, the Orchestrator registers one bounded temporary monitor after successful invocation and before the Root yields. The receipt records `Handoff Event ID`, `Monitor ID`, target, and monitor lifecycle. When the host wakes Root with a `Terminal Result ID`, Root consumes `(Handoff Event ID, Terminal Result ID)` exactly once, emits the Boss event without a new Boss message, and cancels the monitor with evidence. The monitor has no authority to make a workflow decision. If monitor registration/wake-up is unavailable, expires, or fails, record `monitor_unavailable`, `monitor_expired`, or `monitor_failed` as an evidence-backed blocked result.

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

### Cross-Platform Acceptance Criteria Gate

Apply this gate to every **Work Item** and its Draft **Change Request**. Platform adapters and request templates supply the hosting-platform labels; this shared rule deliberately uses only the portable terms below.

For Feature and Enhancement work, the Work Item has exactly one current `phase:` label. Developer must not begin implementation until the Work Item has `status:spec-ready`; the selected route determines whether that evidence is an approved lightweight specification or an approved SDD/design. Documentation-only work and Bug Fix work retain their existing routes.

1. Developer Agent supplies the Work Item URL, opens a Draft Change Request after committing/pushing, records implementation/test evidence, adds `status:development-done`, and moves the Work Item to `phase:verification`. Developer Agent must not self-certify the Work Item Acceptance Criteria.
2. QA Agent reviews the exact Draft Change Request against every Work Item Acceptance Criteria item, associated checks, and declared limitations. Tick only criteria supported by evidence; leave failed or unverified criteria unchecked and route the gap back to Developer, BA, SA, or Security Reviewer as appropriate.
3. QA Agent records the Change Request URL, Acceptance Criteria Verification Status, and QA Evidence URL in the handoff and adds the same evidence as a Work Item comment or Change Request review on the hosting platform.
4. Only after QA records a complete pass may the Change Request move from Draft to ready for human review. QA adds `status:verification-done` and moves the Work Item to `phase:human-review`; QA evidence does not replace the human merge approval gate.

Use native checklist/comment surfaces where available. Do not automate checklist ticks from CI: checks demonstrate execution, while QA owns the judgment that the Acceptance Criteria are satisfied.

Developer Agent adds `status:development-done` to the Work Item only after implementation evidence and local checks are ready. QA Agent adds `status:verification-done` only after the Work Item acceptance criteria, QA evidence comment, Change Request QA checklist, and Change Request QA Evidence URL are synchronized. These are additive evidence labels, not a replacement for human merge approval.

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

### Scan Checklist

Before reviewing anything else, check the change against this list — adapted to this project's Django/DRF/PostgreSQL stack:

- Hardcoded secret or an insecure fallback default (e.g. `os.environ.get('SECRET_KEY', 'insecure-default')`) in `settings.py` or any source file.
- `DEBUG = True` reaching a production settings file.
- Raw SQL, `.extra()`, or a string-formatted `cursor.execute()` that bypasses Django ORM parameterization.
- `CORS_ALLOW_ALL_ORIGINS = True` instead of an explicit `CORS_ALLOWED_ORIGINS` allowlist.
- A DRF view or viewset with no `permission_classes` / `authentication_classes` set.
- A token, password, or PII value reaching a log statement or a URL query parameter.
- An auth-sensitive endpoint (login, registration, password reset, MFA) with no throttling configured.

Record each item as checked, or as `N/A — <reason>` when the change doesn't touch that surface.

### Severity Scale

Classify every finding on this scale — distinct from `code-review-gate`'s generic Critical/Major/Minor/Question taxonomy, calibrated specifically to exploitability and blast radius:

- **Critical** — remote code execution, authentication bypass, SQL injection with data access.
- **High** — stored XSS, IDOR exposing sensitive data, privilege escalation.
- **Medium** — CSRF on a state-changing action, missing security headers, verbose error messages.
- **Low** — clickjacking on a non-sensitive page, minor information disclosure.
- **Informational** — best-practice deviation with no direct exploit path.

### Fix-Before-Merge vs Hardening Opportunity

Critical and High findings block the change — matching `AGENTS.md`'s existing Stop Conditions for auth/secrets/payment. Medium and Low findings do not block; log them and route back to Developer Agent to fix in the same or a follow-up change, at the Security Reviewer's discretion. Never downgrade a Critical or High finding to avoid blocking a merge.

### Chained Findings

Before dismissing a set of Medium or Low findings individually, check whether they compose into something worse — a misconfiguration plus a weak default plus missing input validation can equal a Critical path even when no single finding does. Note the composed risk explicitly when one exists.

## Config Agent

Handles feature flags, system parameters, business configs, thresholds, mapping values, and environment-specific configuration. Exists so a code-free config change can skip PM and Developer Agent entirely, per the Config Change flow and Skip Rules in `AGENTS.md` — a lightweight path, not a lower-quality one.

### Config vs Data Boundary

Config is a parameter that controls system *behavior* — a feature flag, threshold, environment setting, or business-rule switch. Data (Data Agent's responsibility) is information the system *displays or references* — master data, reference lookups, dropdown or report content. When a value could be read either way (e.g. a tax rate), state which role owns it and why, rather than leaving it ambiguous.

### Restart-Required vs Hot-Reloadable

State whether the config change takes effect only after a process restart (environment variables, Django settings read at startup) or is hot-reloadable (a DB-backed flag read per-request). This determines the real effective date and change window — do not record an Effective Date that assumes hot-reload for a restart-required value.

### Feature Flag Lifecycle

Every feature flag needs an owner and a removal condition recorded in the config change plan (e.g. "remove once rollout reaches 100% for 2 weeks"). A flag with neither is not ready to ship.

### Escalation Guard

If implementing the change turns out to require a code change beyond setting the config value — a new config key the code doesn't read yet, new validation logic, a new endpoint — stop and route to Orchestrator Agent or SA Agent. Do not force it through the Config Change flow's Developer-skip shortcut: that shortcut exists for genuinely code-free changes, and using it for a disguised code change bypasses code review and SA Agent's architecture rules.

## Data Agent

Handles reference data, master data, seed data, validation SQL, rollback SQL, data integrity checks, and non-destructive DB data changes. Exists so a code-free data change can skip PM and Developer Agent entirely, per the DB / Reference Data Change flow and Skip Rules in `AGENTS.md` — a lightweight path, not a lower-quality one.

### Non-Destructive Mechanics

A data change is non-destructive only when it meets all of: wrapped in a transaction, uses an idempotent upsert (`INSERT ... ON CONFLICT DO UPDATE`) rather than a blind `INSERT`, and states the expected row-count delta to verify before and after running it.

### Boundary vs SA Agent's Data Migration Safety

SA Agent owns schema migration strategy (DDL — Django migrations, expand/contract sequencing). Data Agent owns data changes (DML) that run against an existing schema. Data Agent does not author Django migration files; it prepares SQL that runs after a migration SA Agent designed is already in place.

### Idempotent Re-run Safety

Every validation and rollback query must be safe to run twice — a failed deploy is often retried, and a data change script that duplicates rows or corrupts state on a second run is not done.

### PII Routing

If a data change touches PII, route to Security Reviewer before executing it — not just record it in the plan's Risk section. Security Reviewer's Scan Checklist covers sensitive data handling; Data Agent's job is to trigger that review, not skip it because the change "is just data."

### Escalation Guard

If implementing the change turns out to require a code change beyond the data itself — new validation logic, new business rules, a schema change — stop and route to Orchestrator Agent or SA Agent. Do not force it through the DB / Reference Data Change flow's Developer-skip shortcut.

## Release Agent

Owns release checklist, deployment notes, rollback plan, change window, release evidence, and final handoff.

### Versioning and Changelog Contract

Version every release `MAJOR.MINOR.PATCH`: MAJOR for a breaking change, MINOR for backward-compatible new functionality, PATCH for a backward-compatible fix. When unsure whether a change is breaking, treat it as breaking. Tag the release and treat the tag as the source of truth — never hand-edit a version number out of sync with its tag. Write the `CHANGELOG.md` entry in the same change that makes the change, grouped by Added/Changed/Fixed/Deprecated/Removed/Security and phrased around user impact — not reconstructed from `git log` at release time.

### Release Evidence Checklist

Before final handoff, confirm and record:

- All required tests passed (unit, integration, and any contract validation for the work item).
- The hosted CI run for the merge commit is green and referenced — a local-only result is not sufficient. (This is the standing rule R-001 exists to enforce: the first hosted CI run on `main` had gone unrecorded.)
- Human approval for the release is recorded, not implied.
- Documentation Impact assessment is complete for every merge included in this release, and any post-merge audit exception is closed with evidence.

Any missing item blocks the release; record it as an open item rather than approving around it.

### Triple Rollback Confirmation

Before approving a release, confirm all three rollback paths are accounted for, not just one:

- **Code rollback** — a git revert or a previous release tag to redeploy.
- **Schema rollback** — SA Agent's Data Migration Safety rollback plan, when the release includes a migration.
- **Config rollback** — Config Agent's rollback method, when the release includes a config change.

A release with a migration or config change and no corresponding rollback plan from its owning role is not ready.

### Deployment Strategy Statement

State the deployment strategy (e.g., direct deploy, rolling, blue-green) and its blast radius in the release plan. This project does not own deployment tooling or infrastructure — this is a statement of intent for the human operator, not an automated rollout.

## Documentation Agent

Updates README, architecture docs, user docs, changelog, decision logs, and operational runbooks. The canonical pre-merge documentation-impact rule is defined here; platform-specific agent files are adapters.

### Pre-Merge Trigger

Before a pull request or merge request targets `main`, the Documentation Agent performs a documentation-impact assessment in the source change. Classify this assessment as documentation-only with Medium risk unless the change requires a higher-risk route. The assessment is required even when no documentation update is needed.

On GitHub, complete the `Documentation Impact` section and the `documentation-impact: complete` marker in the pull-request template; `.github/workflows/documentation-impact-gate.yml` checks their presence. On GitLab, use `.gitlab/merge_request_templates/Default.md` and have the reviewer verify the same assessment.

### Mandatory Impact Assessment

Assess each target below. Update an affected artifact in the source PR/MR or record `No update required — <reason>` in its Documentation Impact section.

- `PROJECT_INDEX.md`
- `PROJECT_STATUS.md`
- `TASK_LOG.md`
- `CHANGELOG.md`
- `DECISIONS.md`
- `RISKS.md`
- Canonical workflow documents and platform adapters

### Post-Merge Exception

After a `main` project-state audit fails, `.github/workflows/documentation-sync.yml` creates one idempotent `documentation-sync` issue keyed to the failing commit. Treat that issue as the handoff: work from `codex/documentation-sync/<issue-number>`, create the record from `docs/templates/POST_MERGE_DOCUMENTATION_REVIEW.md`, and close the issue only after its correction PR is merged. Normal merges create no issue.

GitLab's `validate_project_state` job validates default-branch state, but it does not automatically create a documentation-sync Issue after failure. Until separately approved GitLab API automation exists, Documentation Agent must create or link a GitLab Issue with the failing pipeline evidence.

### Post-Merge Closeout Contract

Apply this portable contract after a Change Request merges. Platform adapters implement the signal with their native labels and comments.

1. Developer Agent adds `status:development-done` to the Work Item after implementation evidence is ready; QA Agent adds `status:verification-done` only after the Work Item and Change Request evidence are synchronized.
2. After a successful default-branch audit, Documentation Agent claims the temporary `post-merge-closeout` signal, updates project state/history/changelog as needed in a dedicated closeout Change Request, and records the source Change Request reference in its completion marker.
3. Human Maintainer reviews and merges the closeout Change Request. Its completion marker causes the source `post-merge-closeout` signal to be removed and prevents a second normal closeout signal.
4. A successful normal audit does not create a `documentation-sync` Issue. A failed audit follows the exception handoff instead; it must not also create a normal closeout signal.

Documentation-only closeout work with no Work Item acceptance criteria uses Documentation Agent review and the human merge gate; it does not require an invented QA checklist result.

### Completion and Escalation

Complete the pre-merge assessment only after every target has an update or no-update rationale, affected artifacts are included in the source PR/MR, and a Reviewer handoff is ready. For a post-merge exception, additionally record the failing commit, corrective changes, limitations, and issue-closure evidence.

Route a conflict with implementation, tests, or a contract to the Developer Agent or SA Agent. Route unverified hosted CI to Reviewer / QA, release implications to the Release Agent and Human approval, and unresolved risks to an owner recorded in `RISKS.md`.

The Documentation Agent must not approve release, hosted CI, human gates, or risk closure without evidence.
