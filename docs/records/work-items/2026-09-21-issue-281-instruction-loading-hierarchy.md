# Work Item: Issue #281 — Astra task-triggered instruction-loading hierarchy

## Source
- Issue: https://github.com/chakrits/AI-Agent-Workflow/issues/281
- Umbrella issue: #280

## Classification
- Change type: Framework / Meta Change
- Risk level: Medium
- Lifecycle phase: `phase:verification`
- Workflow route: Documentation Agent → Reviewer / QA Agent → Human Approval

## Artifacts
- Design / ADR: ADR-0034 — Core Bootloader is the SHA-pinned Tier 1 source set
- Implementation plan: [[../implementation-plan/2026-09-21-issue-281-instruction-loading-hierarchy]]
- PRs: Pending

## Scope
- Establish Core Bootloader as the task entry point.
- Replace blanket reading requirements with task-triggered references.
- Preserve risk-specific governing policies and portable compatibility.

## Status
Implemented locally — awaiting independent review and Human Approval before merge.
