# RISKS.md

| ID | Risk | Area | Severity | Likelihood | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| R-303-01 | Low-risk fast-track, mid-flight risk escalation, post-adoption rollback, or `--emit-intent` file I/O for Issue #303 could fail or drift if implemented without cross-field parity, causal-prefix episode remediation (`R3-01`), sunset remediation hold & cutoff timestamp (`V4-01a/b`), resilient 3-phase I/O write loop & honest residual reporting (`V4-02a/b/c`), and legacy flag isolation (`R3-04`). | Workflow Contracts, Schema, Skills & Metrics CLI | Medium | Low | Pause mutations at `phase:planning` until Human Maintainer grants `status:spec-ready` on Issue #303; enforce TDD parity/escalation/sunset tests (`TC-001`–`TC-003E4`), deliberate 9-file review sync (`TC-013`), legacy flag isolation (`TC-004`), Dual-Digest & resilient 3-phase I/O fault tests (`TC-009`–`TC-010E`), and Stacked PR `advances-only` checks (`TC-015`). | Orchestrator / Maintainer | Open |
