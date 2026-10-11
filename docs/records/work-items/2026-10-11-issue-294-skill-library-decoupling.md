# Work Item: Issue #294 — Skill-library CI decoupling

## Source
- Issue: https://github.com/chakrits/AI-Agent-Workflow/issues/294
- Boss directive: 2026-10-11; create issue, branch, and complete reviewable specification bundle.
- Related: #283 introduced current catalog enforcement; #284 owns behavioral evaluation, not this change.

## Classification
- Change type: Framework / Meta Change; risk: Medium.
- Lifecycle phase: `phase:development` (IMP-005 implemented; overall acceptance pending); specification readiness: Human-approved, 2026-10-11.
- Workflow route: Orchestrator/SA → Documentation/Developer after design approval → independent QA/Security Reviewer → Human Maintainer.
- Current branch content: IMP-001–005; core-only matrix/budget/guards, CI/hooks/reset migration and optional discovery/core fallback policy. Audits opt-in; core/readiness retained. Final contributor/QA/Security/hosted acceptance pending.

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
- PRs / Closeout / Postmortem: N/A — no PR/merge; implementation through IMP-005 recorded, not full acceptance.

## Sub-tasks
- IMP-001 classification/RED recorded. IMP-002 implemented: catalog/mirror/content/mixed/AC-14/playbook coupling split; [completion](../qa/2026-10-11-issue-294-imp002-completion.md), [independent scoped review](../qa/2026-10-11-issue-294-imp002-code-review.md).
- IMP-003 implemented: core-only matrix/budget/edit guards; [completion](../qa/2026-10-11-issue-294-imp003-completion.md), [independent scoped review](../qa/2026-10-11-issue-294-imp003-code-review.md).
- IMP-004 implemented: automatic-call graph migration; [completion](../qa/2026-10-11-issue-294-imp004-completion.md), [review and fix](../qa/2026-10-11-issue-294-imp004-code-review.md).
- IMP-005 implemented: policy/discovery alignment; [completion / CP-2](../qa/2026-10-11-issue-294-imp005-completion.md), [independent review](../qa/2026-10-11-issue-294-imp005-code-review.md). IMP-006 pending; no child issues created.

## Lessons Learned
- A CI invocation can also be enforced by `npm test`; removing only the workflow line is incomplete (EV-05).
- Historical compatibility evidence must not become a registry for every future instruction (EV-04).

## Metrics
- Survey baseline170/170; prior no-library contract/playbook80/80; latest full777/777, scoped independent review91/91 PASS. Core budget24877/30000;13 CI-derived commands and compatibility pass; housekeeping fails for six old worktrees. Not global QA/readiness acceptance.
- Subagent timeouts: 0; Rework cycles: 0.
- Packet version: v1; readonly independent reviews through `/root/issue294_imp005_review` (`gpt-6-luna`/high per Human request); implementation not delegated.

## Status: Open — implementation in progress
- Human Maintainer accepted all artifacts/design and OQ-01–04 on 2026-10-11.
- Human authorized IMP-005 on 2026-10-11; implemented and independently reviewed. Next planned IMP-006 independent QA/Security and hosted/Human gates. Global acceptance pending; housekeeping disposition belongs to Orchestrator/Human before an all-checks-green claim.
- Design stop satisfied; no unresolved design approval blocker. Human merge approval remains a later gate.
- Specification readiness is based on this explicit approval, not baseline test results.
- Implementation acceptance is tracked once in the Issue's Acceptance Traceability Matrix; local documents define cases, not a second acceptance result ledger.

## Completion Contract
- Done when: approved decoupling is implemented, all required independent/hosted evidence and closeout exists; an IMP-005 checkpoint alone does not complete the Issue.
- May proceed through: approved IMP-001–IMP-006 implementation, verification, review and branch publishing.
- Must stop for: new scope/policy decisions, release/irreversible operations, and human merge approval.
- Assumptions: approved ASM/OQ answers stand; no new assumption added by this checkpoint.
