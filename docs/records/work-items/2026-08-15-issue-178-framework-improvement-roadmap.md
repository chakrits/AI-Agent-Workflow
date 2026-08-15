# Work Item: Issue #178 — Framework improvement roadmap

## Source
- Issue: https://github.com/chakrits/AI-Agent-Workflow/issues/178
- Umbrella issue: N/A — this is the umbrella issue
- Boss directive: 2026-08-15 — Human Maintainer approved the framework audit recommendations and roadmap draft

## Classification
- Change type: Framework / Meta
- Risk level: Medium overall; individual workstreams are separately classified
- Workflow route: Orchestrator → SA/Documentation → Human Approval → bounded workstream route → independent QA

## Artifacts
- Requirement: N/A — roadmap derived from approved framework audit
- SDD: N/A at umbrella stage
- Implementation plan: `docs/superpowers/plans/2026-08-15-framework-improvement-roadmap.md` (commit `4f38db1`)
- PRs: N/A
- Closeout PR: N/A
- Postmortem: N/A

## Sub-tasks
- IMP-001 / Issue #179: evidence model and measurement baseline
- IMP-002 / Issue #132: progressive context shadow experiment; remains separately governed
- IMP-003 / Issue #133: worktree-scoped status shadow experiment; remains separately governed
- IMP-004: host-neutral dispatch capability contract
- IMP-005: project-state reconciliation and structured metrics
- IMP-006: canonical-source consolidation and adapter conformance, deferred until evidence exists

## Lessons Learned
- N/A — roadmap is not yet implemented

## Metrics
- Tests before: 414 → Tests after: 414 (plan-only validation)
- Subagent timeouts: baseline recorded in existing `PROJECT_STATUS.md` / `RISKS.md`; no new dispatch
- Rework cycles: 0
- Packet version: N/A — no child dispatch

## Status: Open (2026-08-15)
