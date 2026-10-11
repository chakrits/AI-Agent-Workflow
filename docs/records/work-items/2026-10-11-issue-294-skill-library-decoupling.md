# Work Item: Issue #294 — Skill-library CI decoupling

## Source
- Issue: https://github.com/chakrits/AI-Agent-Workflow/issues/294
- Boss directive: 2026-10-11; create issue, branch, and complete reviewable specification bundle.
- Related: #283 introduced current catalog enforcement; #284 owns behavioral evaluation, not this change.

## Classification
- Change type: Framework / Meta Change; risk: Medium.
- Lifecycle phase: `phase:development` (IMP-002 in progress); specification readiness: Human-approved, 2026-10-11.
- Workflow route: Orchestrator/SA → Documentation/Developer after design approval → independent QA/Security Reviewer → Human Maintainer.
- Current branch content: tests/records; IMP-002A retires approved library assertions. Production validators/CI remain unchanged; design gate is satisfied.

## Artifacts
- [Requirements / User Stories / AC](../requirements/2026-10-11-issue-294-skill-library-decoupling.md)
- [SDD](../sdd/2026-10-11-issue-294-skill-library-decoupling-sdd.md)
- [TDD — Technical Design Document](../tdd/2026-10-11-issue-294-skill-library-decoupling-tdd.md)
- [Implementation Plan](../implementation-plan/2026-10-11-issue-294-skill-library-decoupling.md)
- [Test Plan](../qa/2026-10-11-issue-294-skill-library-decoupling-test-plan.md)
- [Evidence / readiness](../qa/2026-10-11-issue-294-skill-library-decoupling-evidence.md)
- [Human-review handoff](../HANDOFF-2026-10-11-issue-294-design-review.md)
- [Human design approval](../HANDOFF-2026-10-11-issue-294-design-approval.md)
- ADR: Accepted ADR-0036 in `DECISIONS.md`; no previous ADR is rewritten.
- PRs / Closeout / Postmortem: N/A — no PR created and no implementation delivered.

## Sub-tasks
- IMP-001: classification/RED preflight recorded. IMP-002 in progress: IMP-002A retired13 catalog/vault-skill tests; [IMP-002B checkpoint](../qa/2026-10-11-issue-294-imp002b-mirror-assertions.md) retires9 pure mirror tests. Skill-content/mixed/AC-14/playbook assertions remain. IMP-003–IMP-006 pending; no child issues created.

## Lessons Learned
- A CI invocation can also be enforced by `npm test`; removing only the workflow line is incomplete (EV-05).
- Historical compatibility evidence must not become a registry for every future instruction (EV-04).

## Metrics
- Focused baseline: 170/170 survey checks; latest IMP-002B focused120/120, full786/786. Developer verification, not independent implementation acceptance.
- Subagent timeouts: 0; Rework cycles: 0.
- Packet version / Packet tokens: N/A — this specification package has no delegated implementation.

## Status: Open — implementation in progress
- Human Maintainer accepted all artifacts/design and OQ-01–04 on 2026-10-11.
- Human authorized continuation on 2026-10-11. IMP-002A checkpoint recorded; next: remaining IMP-002, Developer role. No runtime child dispatch or independent QA acceptance claimed.
- Design stop satisfied; no unresolved design approval blocker. Human merge approval remains a later gate.
- Specification readiness is based on this explicit approval, not baseline test results.
- Implementation acceptance is tracked once in the Issue's Acceptance Traceability Matrix; local documents define cases, not a second acceptance result ledger.
