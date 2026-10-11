# Work Item: Issue #294 — Skill-library CI decoupling

## Source
- Issue: https://github.com/chakrits/AI-Agent-Workflow/issues/294
- Boss directive: 2026-10-11; create issue, branch, and complete reviewable specification bundle.
- Related: #283 introduced current catalog enforcement; #284 owns behavioral evaluation, not this change.

## Classification
- Change type: Framework / Meta Change; risk: Medium.
- Lifecycle phase: `phase:design`; specification readiness: Draft, not approved.
- Workflow route: Orchestrator/SA → Documentation/Developer after design approval → independent QA/Security Reviewer → Human Maintainer.
- Scope of this branch: documentation only. Implementation and validator retirement await design approval.

## Artifacts
- [Requirements / User Stories / AC](../requirements/2026-10-11-issue-294-skill-library-decoupling.md)
- [SDD](../sdd/2026-10-11-issue-294-skill-library-decoupling-sdd.md)
- [TDD — Technical Design Document](../tdd/2026-10-11-issue-294-skill-library-decoupling-tdd.md)
- [Implementation Plan](../implementation-plan/2026-10-11-issue-294-skill-library-decoupling.md)
- [Test Plan](../qa/2026-10-11-issue-294-skill-library-decoupling-test-plan.md)
- [Evidence / readiness](../qa/2026-10-11-issue-294-skill-library-decoupling-evidence.md)
- ADR: proposed ADR-0036 in `DECISIONS.md`; no previous ADR is rewritten.
- PRs / Closeout / Postmortem: N/A — no PR created and no implementation delivered.

## Sub-tasks
- IMP-001–IMP-006: see Implementation Plan; sequential dependency checkpoints, no child issues created.

## Lessons Learned
- A CI invocation can also be enforced by `npm test`; removing only the workflow line is incomplete (EV-05).
- Historical compatibility evidence must not become a registry for every future instruction (EV-04).

## Metrics
- Focused baseline: 170/170 survey checks; candidate implementation tests: not run, no implementation.
- Subagent timeouts: 0; Rework cycles: 0.
- Packet version / Packet tokens: N/A — this specification package has no delegated implementation.

## Status: Open — design review
- Next Action: Human review.
- Next Owner: Human Maintainer.
- Dispatch State: blocked; Stop Reason: human_review_required (design approval, not a technical failure).
- Design gate: review the 12 ACs, proposed ADR, core-only matrix migration, and retained readiness boundary.
- Implementation acceptance is tracked once in the Issue's Acceptance Traceability Matrix; local documents define cases, not a second acceptance result ledger.
