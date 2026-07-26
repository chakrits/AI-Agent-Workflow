# Work Item: Issue #102 — Dispatch Prompt Contract v1

## Source

- Issue: https://github.com/chakrits/AI-Agent-Workflow/issues/102
- Umbrella issue: N/A
- Boss directive: 2026-07-26 — draft the proposal in GitHub for review

## Classification

- Change type: Framework / Meta Change
- Risk level: Medium
- Workflow route: Orchestrator → Documentation Agent → Reviewer / QA Agent → Human Approval

## Artifacts

- Requirement: N/A — this Issue body is the review draft
- SDD: N/A — no implementation is approved
- Draft specification (decision-record ancestor): [[../../superpowers/specs/2026-07-26-dispatch-prompt-contract-v1.md]]
- Canonical design (102a): [[../../superpowers/specs/2026-07-26-dispatch-packet-contract-102a-design.md]]
- Implementation plan: N/A — pending Human Maintainer approval
- PRs: N/A
- Closeout PR: N/A
- Postmortem: N/A

## Sub-tasks

- 102a: canonical packet contract — template, discipline rules, role selectors, storage decision, changelog, observation field. Documentation-only. Design written; awaiting Human Maintainer approval.
- 102b: 3 synthetic blocked-case fixtures, paired variants, 2 runs each (12 runs). Deferred; opens only on the 102a escalation trigger or by explicit direction.
- Separate follow-up (not this work item): `scripts/validate-review-gate.mjs:31-39` is a directory-level presence check with 10 matching records already committed, so the gate cannot fail for any future PR. Pre-existing defect; needs its own issue.

## Lessons Learned

- N/A — evaluation has not started.

## Metrics

- Tests before: 207
- Tests after: N/A — no implementation
- Subagent timeouts: N/A
- Rework cycles: 0

## Status: Open — Draft awaiting Human Maintainer review
