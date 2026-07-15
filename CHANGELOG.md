# CHANGELOG.md

## Unreleased

### Added
- Phase 1 Bug Fix workflow contract validation completion record and independent reviewer / QA handoff.
- Mandatory post-merge Documentation Agent review rule, template, and regression coverage.
- Canonical PM Agent business-framing rule, expanded `PROJECT_BRIEF.md` template, and regression coverage.
- Orchestrator Agent unclassified-request rule, escalation tiers, decision routing checklist, and regression coverage.
- SA Agent architecture pattern selection, dependency boundary rule, API contract governance, and Django/Postgres migration-safety rule, with an expanded `SDD.md` template and regression coverage.
- BA Agent illustrative UX sketch rule with an explicit boundary against SA Agent's design work and a production-UI escalation path, with an expanded `REQUIREMENT_DISCOVERY.md` template and regression coverage.
- QA Agent canonical/adapter fix with evidence-based reporting, API contract validation, and NFR validation rules, plus an expanded `TEST_PLAN.md` and `qa-playwright-testing` automation discipline, with regression coverage.
- Developer Agent architecture compliance, definition-of-done restatement, incremental verification, escalation, and scope discipline rules, with regression coverage.
- Orchestrator Agent contradiction detection/resolution rule and a routing circuit breaker generalizing the Bug Fix contract's retry budget to every flow, with regression coverage.

### Changed
- Phase 1 contract-first Bug Fix workflow foundation was merged into `main` through Pull Request #1.
- Documentation Agent now assesses project index, status, history, changelog, decisions, risks, and canonical/adapter parity after every merge into `main`.
- PM Agent instruction branch merged into `main` after final whole-branch review approval.

### Fixed
- R-001 (Phase 1 hosted-CI confirmation) closed: Human Reviewer confirmed hosted CI is merged and running on `main`. See `RISKS.md`.

### Security
- 
