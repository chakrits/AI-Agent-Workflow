# DECISIONS.md

## Decision Log

### ADR-0030 — Bounded compressed specification and historical fast-track recovery
- Date: 2026-11-05
- Status: Accepted for Issue #303 Slice 1; Human plan and execution approval recorded before implementation. Merge remains a separate Human gate.
- Context: Small low-risk features need a compact artifact path while preserving design, classification and approval controls. Persisted fast-track histories must remain readable after the route is disabled.
- Decision: Add INTENT/SPEC, preserving existing templates and IMPLEMENTATION_PLAN. Eligibility requires all six gates: low risk, no security/API/data impact, clear requirements, readiness and distinct verification. Additive API/CLI/event/schema changes are excluded and route to SA/SDD. Pin source commit and artifact paths; advisory metadata grants no approval.
- Enforcement: Classification parity and causal-prefix/current-discovery-episode branch selection prevent stale or future design from authorizing implementation. Historical classification snapshots permit replay; escalation requires reason evidence and subsequent SA design/standard implementation approval. Security review remains mandatory when triggered.
- Sunset: Keep the reader/schema and never rewrite persisted audit history. Disable both fast branches with historical-only and an instant-based cutoff; invalid/post-cutoff timestamps reject. Preserve completed pre/equal-cutoff histories and recovery holds in discovery/designing/rework/blocked; require design remediation before advancement.
- Alternatives: Rejected universal compressed specs because they bypass necessary design. Rejected raw reader/schema reverts after adoption because they invalidate persisted histories. Separate worktrees and bounded in-session subagents remain alternatives with disjoint writes and accountable integration; neither substitutes for distinct verification or Human merge/release approval.
- Consequences: Explicit evidence and temporal checks add validator complexity; TDD plus independent Security/Code/QA review are required. Low-risk declarations still need actual path/diff review. See [dynamic routing](docs/workflow/dynamic-routing.md) and [New Feature workflow](docs/workflows/new-feature.md). Issue: https://github.com/chakrits/AI-Agent-Workflow/issues/303
