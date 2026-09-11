# Work Item: Issue #198 — Resolve inherited T2-A full-suite failures

## Source

- Issue: https://github.com/chakrits/AI-Agent-Workflow/issues/198
- Umbrella issue: https://github.com/chakrits/AI-Agent-Workflow/issues/133
- Related PR: https://github.com/chakrits/AI-Agent-Workflow/pull/197
- Boss directive: 2026-08-22 — approved separate tracking for the eight inherited CI failures before integrating PR #197.

## Classification

- Change type: Bug Fix — inherited full-suite failures
- Risk level: Medium
- Workflow route: QA/BA investigation → Developer Agent → QA Agent → Reviewer
- Governing contract: `docs/contracts/bug-fix-workflow.yaml`
- Current state: `handoff`
- Human decision: Approved canonical two-SHA vocabulary on 2026-08-22.
- Next route: Human Approval / stacked PR review
- Verified candidate: `476d8b5e2cdb750a08a5bf8ef468908f3f482be9`
- QA evidence: 509/509 full suite and 8/8 original repros passed in clean worktree `/private/tmp/issue-198-qa-476d8b5`.

## Artifacts

- Requirement: [Issue #198](https://github.com/chakrits/AI-Agent-Workflow/issues/198)
- SDD: N/A pending investigation
- Implementation plan: N/A pending root-cause classification
- Debug ledger: [[../qa/2026-08-22-issue-198-inherited-t2a-failures-debug-ledger]]
- PRs: N/A
- Closeout PR: N/A
- Postmortem: N/A

## Sub-tasks

- Reproduce all eight failures on the exact T2-A candidate.
- Classify each failure as defect, contract mismatch, or confirmed baseline.
- Implement only confirmed root-cause fixes with regression evidence.
- Re-run Node 22 and repository validation checks before revisiting PR #197.

## Lessons Learned

- PR #197's evidence-harness scope passed independent Code Review and QA, but integration exposed eight unrelated full-suite failures inherited from the T2-A candidate. The failures are now tracked separately rather than hidden in an exception.

## Metrics

- Tests before: 501/509 candidate baseline
- Tests after: Pending
- Subagent timeouts: 0
- Rework cycles: 0/2
- Packet version: v1 · Packet tokens: Pending

## Status: Open — intake / investigation required
