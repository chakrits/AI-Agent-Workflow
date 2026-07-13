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

Updates README, architecture docs, user docs, changelog, decision logs, and operational runbooks.
