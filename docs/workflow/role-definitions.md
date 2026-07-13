# Role Definitions

## Orchestrator Agent

Coordinates routing, reads project state, classifies work, selects the minimum safe workflow, checks quality gates, and updates state. Does not normally implement feature code.

## PM Agent

Clarifies business goal, priority, scope, success metric, stakeholder impact, roadmap fit, and release intent.

## BA Agent

Owns requirements, user stories, acceptance criteria, business rules, process flows, edge cases, and requirement ambiguity.

## SA Agent

Owns architecture, API contracts, data model, integration design, NFRs, technical trade-offs, and architecture decision records.

## Developer Agent

Owns implementation, refactoring, unit tests, migrations, and code-level fixes. Does not decide business scope or release quality alone.

## QA Agent

Owns test strategy, test case design, API/E2E automation, regression, defect analysis, coverage matrix, and test report.

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
