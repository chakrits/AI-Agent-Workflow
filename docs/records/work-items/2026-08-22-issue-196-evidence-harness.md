# Work Item: Issue #196 — T2-A Evidence Harness Hardening

## Source

- Issue: https://github.com/chakrits/AI-Agent-Workflow/issues/196
- Umbrella issue: https://github.com/chakrits/AI-Agent-Workflow/issues/133
- Base clarification: Issue #196 comment https://github.com/chakrits/AI-Agent-Workflow/issues/196#issuecomment-5376874013

## Classification

- Change type: Framework / Meta — test evidence hardening
- Risk level: Medium
- Workflow route: Orchestrator → Developer Agent → independent Code Review → QA Agent → Human Approval
- Lifecycle phase: `phase:development`
- Specification readiness: Ready — Issue ACs and approved implementation plan

## Sub-tasks

- Task 1: Remove scenario-driven manifest execution and add adversarial input binding.
- Task 2: Replace synthetic parity counting with exact applicable schema/runtime comparisons.
- Task 3: Establish before/after baseline and prepare independent Code Review handoff.

## Evidence

- Implementation commit: `53321ed`
- Focused CAS/manifest tests: 21/21.
- Manifest coverage: 52/52 IDs, once each.
- Full suite: baseline 500/508 with eight inherited failures; after 501/509 with the same eight failures.
- No T2-A production file changed.

## Status

Development implementation complete; awaiting independent Code Review. Security Review and QA are downstream gates only after Code Review passes.
