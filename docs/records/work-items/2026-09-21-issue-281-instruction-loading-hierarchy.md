# Work Item: Issue #281 — Astra task-triggered instruction-loading hierarchy

## Source
- Issue: https://github.com/chakrits/AI-Agent-Workflow/issues/281
- Umbrella issue: #280

## Classification
- Change type: Framework / Meta Change
- Risk level: Medium
- Lifecycle phase: `phase:human-review`
- Workflow route: Documentation Agent → Reviewer / QA Agent → Human Approval

## Artifacts
- Design / ADR: ADR-0034 — Core Bootloader is the SHA-pinned Tier 1 source set
- Implementation plan: [[../implementation-plan/2026-09-21-issue-281-instruction-loading-hierarchy]]
- PR: https://github.com/chakrits/AI-Agent-Workflow/pull/285
- QA evidence: https://github.com/chakrits/AI-Agent-Workflow/issues/281#issuecomment-5758803434

## Scope
- Establish Core Bootloader as the task entry point.
- Replace blanket reading requirements with task-triggered references.
- Preserve risk-specific governing policies and portable compatibility.

## Status
QA acceptance passed. `status:spec-ready`, `status:development-done`, and `status:verification-done` are present;
the work item is in `phase:human-review` and awaits Human Approval before merge.
