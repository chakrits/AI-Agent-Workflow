# Work Item: Issue #281 — Astra task-triggered instruction-loading hierarchy

## Source
- Issue: https://github.com/chakrits/AI-Agent-Workflow/issues/281
- Umbrella issue: #280

## Classification
- Change type: Framework / Meta Change
- Risk level: Medium
- Lifecycle phase: completed (merged via PR #285)
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
Merged to `main` via PR #285 at `a0d71ef`. Independent re-review and QA acceptance passed before Human Approval;
the normal post-merge closeout is tracked by the source PR's `post-merge-closeout` label.
