# Work Item: Issue #179 — IMP-001 evidence model and measurement baseline

## Source
- Issue: https://github.com/chakrits/AI-Agent-Workflow/issues/179
- Umbrella issue: https://github.com/chakrits/AI-Agent-Workflow/issues/178
- Boss directive: 2026-08-15 — Human Maintainer approved the roadmap and authorized IMP-001 planning

## Classification
- Change type: Framework / Meta
- Risk level: Medium
- Workflow route: Orchestrator → SA Agent → Human Approval → bounded implementation → independent QA

## Artifacts
- Requirement: Issue #179 Acceptance Criteria
- SDD: N/A — bounded measurement specification is the artifact; final doc-only correction set passed SA re-review #5 at `f1b0429`; Human approval recorded at https://github.com/chakrits/AI-Agent-Workflow/issues/179#issuecomment-5302513189
- Implementation plan: `docs/superpowers/plans/2026-08-15-framework-improvement-roadmap.md` (commit `4f38db1`)
- PRs: Draft PR #180 — https://github.com/chakrits/AI-Agent-Workflow/pull/180 (QA-observed pre-rework head `385479975c194b3439059639a4322e4532f5f721`; historical only; bounded rework applied; QA must resolve the live head from the current PR/branch at dispatch)
- Closeout PR: N/A
- Postmortem: N/A

## Sub-tasks
- Define route, context, dispatch, status, rework, human-intervention, outcome, and rollback evidence fields.
- Define metric owner, source, denominator, retention, and explicit `N/A` rules.
- Decide whether the existing dispatch receipt schema is sufficient or a bounded schema extension is required.
- Keep the receipt lifecycle namespace separate from the append-only evidence envelope.
- Reconcile the current context-budget observation against the older documented snapshot.
- Freeze numerator/calculation, typed outcome, `N/A`, retention, and operator-wait semantics.
- Update `METRICS.md`, `CONTEXT_BUDGET.md`, and `RISKS.md` with the approved correction set.

## Lessons Learned
- SA review chain closed the metric authority, context baseline, shadow correlation, risk coverage, three cross-section contract ambiguities, and one shadow-correlation contradiction through bounded revisions; final SA re-review #5 returned `PASS`.

## Metrics
- Tests before: 414 → Tests after: 414 passing (docs-only package verification)
- Subagent timeouts: 0; SA terminal result consumed after wait slices that were not treated as timeout or cancellation
- Rework cycles: 1 QA bounded metadata/readiness rework; specification revision round: 4; final SA re-review: PASS
- Packet version: v1; SA review dispatch completed and consumed

## Status: Development — Human approval recorded; `phase:development` and `status:spec-ready` applied; independent QA passed AC-01–AC-06 but returned `NEEDS_REVISION` on AC-07 at the QA-observed pre-rework head `385479975c194b3439059639a4322e4532f5f721`; both bounded corrections are applied, and independent QA re-review is pending. The live PR #180 head is not statically pinned here and must be resolved at dispatch (2026-08-15)
