# Work Item: Issue #166 — Strengthen task-scoped subagent execution and review contracts

## Source

- Issue: https://github.com/chakrits/AI-Agent-Workflow/issues/166
- Umbrella issue: N/A
- Boss directive: 2026-08-12 — approved the proposed defaults, QA-driven planning corrections ([Issue comment 5263292765](https://github.com/chakrits/AI-Agent-Workflow/issues/166#issuecomment-5263292765)), and detailed specification ([Issue comment 5263728633](https://github.com/chakrits/AI-Agent-Workflow/issues/166#issuecomment-5263728633)).

## Classification

- Change type: Framework / Meta (`framework_meta`)
- Risk level: Medium
- Workflow route: Orchestrator → Documentation Agent → Developer Agent (conditional) → QA Agent → Human Approval
- Lifecycle phase: `phase:development`
- Specification readiness: Ready — `status:spec-ready` applied with Human approval evidence.

## Artifacts

- Requirement: [Issue #166](https://github.com/chakrits/AI-Agent-Workflow/issues/166)
- SDD: [[../sdd/2026-08-12-issue-166-task-execution-mode-spec]] — Human approved.
- Implementation plan: [[../implementation-plan/2026-08-12-issue-166-subagent-execution-contract]]
- PRs: #167 (Draft)
- Closeout PR: N/A
- Postmortem: N/A

## Sub-tasks

- SUBAGENT-01: Completed directly by Orchestrator under approved `host_completion_unavailable` fallback — ADR-0014 and third-party-notice decision recorded.
- SUBAGENT-01A: Completed directly by Orchestrator under approved `host_completion_unavailable` fallback — draft detailed specification produced; Human review pending.
- SUBAGENT-02: Completed — added task execution templates and compact routing/role/catalog references; independent QA review pending.
- SUBAGENT-03: Add proportionate validator/test coverage only when a normative rule has a machine-checkable seam — Developer Agent, conditional.
- SUBAGENT-04: Pending independent QA against PR #167; blocked locally by unavailable native child completion.
- SUBAGENT-05: Approve merge and complete post-merge closeout — Human Maintainer → Documentation Agent.

## Lessons Learned

- N/A — work has not started.

## Metrics

- Tests before: Pending baseline
- Tests after: Pending
- Subagent timeouts: 3 — each terminal result was later consumed as `BLOCKED`; no child changed files.
- Rework cycles: 0 — one planning revision from independent QA is not a lifecycle or nested task-review rework.
- Packet version: v1 · Packet tokens: N/A — no agent dispatched

## Status: Open — development authorized
