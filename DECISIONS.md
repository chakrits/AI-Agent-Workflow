# DECISIONS.md

## Decision Log

### ADR-0001: <Title>

- Date:
- Status: Proposed / Accepted / Superseded / Rejected
- Context:
- Decision:
- Alternatives Considered:
- Consequences:
- Owner:

### ADR-0002: Use a Contract-First Foundation for Dynamic Bug-Fix Loops

- Date: 2026-07-13
- Status: Accepted
- Context: The repository has dynamic-routing policy and role/gate documentation, but no machine-checkable state, evidence, or retry contract for controlled rework loops.
- Decision: Phase 1 uses YAML as the canonical Bug Fix workflow policy, JSON Schema to validate task-state instances, and a maximum of two rework transitions before a required human-review block. Autonomous orchestration is deferred.
- Alternatives Considered: Documentation-only policy; runtime-first autonomous orchestrator.
- Consequences: Phase 1 will add a validation contract and fixtures, align workflow terminology, and keep platform adapters as non-canonical adapters.
- Owner: Human Product / Process Owner
