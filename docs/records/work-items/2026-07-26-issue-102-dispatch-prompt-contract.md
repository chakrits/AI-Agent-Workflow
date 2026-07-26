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

- **A proposal's headline metric can measure something its own design cannot move.** The original draft argued from the 30,000-token context budget while its own non-goals excluded every file in that budget. Measuring the thing actually being changed — 59 real dispatch packets, median 1,087 tokens — showed the benefit was ~2.7% of a child's context, and forced the value proposition to be rebuilt on single-sourcing instead. Measure the delta, not the neighbourhood.
- **A gate that cannot fail reads exactly like a gate that passes.** Both reviewers cited `validate-review-gate.mjs` as an obligation the implementation must satisfy. Reading the code showed a directory-level presence check with 10 records already committed. Cite gates from their source, not their name.
- **Withholding your conclusion is what buys an independent verdict.** The Issue #99 QA packet stated its expected finding before the reviewer looked. This work item's QA packet named three items to adjudicate with no expected answer; QA disagreed on one and caught a real weakening. All four gaps it found were outside the AC set.
- **Dispatched agents catch the parent's own spec defects when the packet lets them.** Three defects here (D4's misplaced adapter references, AC-04 and AC-01's unsatisfiable `grep -c` commands) were surfaced by the implementer and QA, not by the author. The implementer followed the packet over the design when they conflicted and reported it, exactly as the `Fallback` field requires.

## Metrics

- Tests before: 207 → Tests after: 207 (+0 — documentation-only)
- Subagent timeouts: 0 (one implementer dispatch, one QA dispatch; the QA dispatch hit a transient API error mid-run and was resumed from its transcript rather than re-dispatched)
- Rework cycles: 0
- Packet version: v1 · Packet tokens: ~360 (implementer), ~410 (QA)

## Status: Closed (2026-07-26) — slice 102a merged via PR #103 as `cbb2b3a`; slice 102b deferred behind the escalation trigger with no open Issue
