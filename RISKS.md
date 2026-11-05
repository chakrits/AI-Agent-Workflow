# RISKS.md

| ID | Risk | Area | Severity | Likelihood | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| R-303-01 | Low-risk fast-track, structured cohort metrics, or Stacked PR execution for Issue #303 could drift across contracts, cross-platform skill mirrors, or human-edited drafts if implemented without cross-field parity, Dual-Digest guards, and `advances-only` PR gates. | Workflow Contracts, Skills & Metrics CLI | Medium | Low | Pause mutations at `phase:planning` until Human Maintainer grants `status:spec-ready` on Issue #303; enforce TDD cross-field parity (`TC-001`–`TC-003`), 9-file skill parity (`TC-013`), Dual-Digest human-edit protection (`TC-009`), and Stacked PR `advances-only` checks (`TC-015`). | Orchestrator / Maintainer | Open |
