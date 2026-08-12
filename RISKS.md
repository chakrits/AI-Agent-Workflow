# RISKS.md

| ID | Risk | Area | Severity | Likelihood | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| R-001 | Canonical context has only 224 tokens headroom (29,776 / 30,000); unbudgeted normative prose for Issue #166 can fail CI or make the mandatory reading set less usable. | Issue #166 subagent execution policy | High | Medium | Before drafting policy, allocate budget per canonical file, remove duplicate text or use one-line pointers to detailed artifacts, and do not raise `TARGET` in this work item. | Documentation Agent | Open |
| R-002 | Codex bounded-native child supervision repeatedly returned timeout before Documentation Agent terminal results arrived, making child dispatch unavailable for #166 planning work. | Issue #166 orchestration adapter | Medium | High | Human Maintainer approved direct parent artifact drafting for SUBAGENT-01/01A. Do not claim a durable async capability; defer a platform solution to the separately scoped control-plane work. | Orchestrator Agent | Open |
