# Work Item: Issue #294 — Skill-library CI decoupling

## Source
- Issue: https://github.com/chakrits/AI-Agent-Workflow/issues/294
- Boss directive: 2026-10-11; create issue, branch, and complete reviewable specification bundle.
- Related: #283 introduced current catalog enforcement; #284 owns behavioral evaluation, not this change.

## Classification
- Change type: Framework / Meta Change; risk: Medium.
- Lifecycle phase: `phase:human-review` (independent premerge local QA/Code/Security PASS; hosted/final-head readiness tracked externally); specification readiness: Human-approved, 2026-10-11.
- Workflow route: Orchestrator/SA → Documentation/Developer after design approval → independent QA/Security Reviewer → Human Maintainer.
- Current branch content: IMP-001–006 implementation and independent local contributor/QA/Security evidence. Audits opt-in; core/readiness retained. Hosted PR and postmerge/default-branch milestones pending.

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
- PR: https://github.com/chakrits/AI-Agent-Workflow/pull/295; [Human handoff](../HANDOFF-2026-10-11-issue-294-human-review.md). Closeout/merge pending. Postmortem N/A; verification experiment ledger records failures without unsupported RCA.

## Sub-tasks
- IMP-001 classification/RED recorded. IMP-002 implemented: catalog/mirror/content/mixed/AC-14/playbook coupling split; [completion](../qa/2026-10-11-issue-294-imp002-completion.md), [independent scoped review](../qa/2026-10-11-issue-294-imp002-code-review.md).
- IMP-003 implemented: core-only matrix/budget/edit guards; [completion](../qa/2026-10-11-issue-294-imp003-completion.md), [independent scoped review](../qa/2026-10-11-issue-294-imp003-code-review.md).
- IMP-004 implemented: automatic-call graph migration; [completion](../qa/2026-10-11-issue-294-imp004-completion.md), [review and fix](../qa/2026-10-11-issue-294-imp004-code-review.md).
- IMP-005 implemented: policy/discovery alignment; [completion / CP-2](../qa/2026-10-11-issue-294-imp005-completion.md), [independent review](../qa/2026-10-11-issue-294-imp005-code-review.md).
- IMP-006 local acceptance PASS: [QA report](../qa/2026-10-11-issue-294-imp006-test-report.md), [harness review](../qa/2026-10-11-issue-294-imp006-harness-review.md), [Security](../security-review/2026-10-11-issue-294-imp006-security.md), [debug ledger](../qa/2026-10-11-issue-294-imp006-debug-ledger.md). Hosted/integration gates remain; no child issues created.

## Lessons Learned
- A CI invocation can also be enforced by `npm test`; removing only the workflow line is incomplete (EV-05).
- Historical compatibility evidence must not become a registry for every future instruction (EV-04).

## Metrics
- Final local candidate `321055c`: full783/783, contributor27/27 with488 commands, negatives193/193, rollback808/808. Core budget24877/30000; mandatory housekeeping passes in isolated clones. Global unrelated-worktree audit not waived or cleaned. Hosted/default-branch readiness not inferred.
- Subagent timeouts: 0; Rework cycles: 0.
- Packet version: v1; current independent children `/root/issue294_harness_review` (gpt-6-luna/high), `/root/issue294_final_qa` and `/root/issue294_security` (gpt-6-sol/high per Human request). Native-awaited terminal results consumed once; implementation not delegated.

## Status: Open — implementation in progress
- Human Maintainer accepted all artifacts/design and OQ-01–04 on 2026-10-11.
- Human authorized next work on 2026-10-11; IMP-006 local QA/Code/Security complete. Next: hosted PR/readiness, Human merge, then default-branch acceptance/closeout. Issue stays open until postmerge evidence; isolated command parity resolves candidate housekeeping without deleting old worktrees.
- Design stop satisfied; no unresolved design approval blocker. Human merge approval remains a later gate.
- Specification readiness is based on this explicit approval, not baseline test results.
- Implementation acceptance is tracked once in the Issue's Acceptance Traceability Matrix; local documents define cases, not a second acceptance result ledger.

## Completion Contract
- Done when: approved decoupling is implemented, all required independent/hosted evidence and closeout exists; an IMP-005 checkpoint alone does not complete the Issue.
- May proceed through: approved IMP-001–IMP-006 implementation, verification, review and branch publishing.
- Must stop for: new scope/policy decisions, release/irreversible operations, and human merge approval.
- Assumptions: approved ASM/OQ answers stand; no new assumption added by this checkpoint.
