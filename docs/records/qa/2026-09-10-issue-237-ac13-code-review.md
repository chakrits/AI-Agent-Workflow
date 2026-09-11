# Developer Self-Review — Issue #237 AC-13

## Candidate

- Base: `f24354e`
- Candidate: the commit containing this record (exact SHA is reported in the handoff)
- Scope: AC-13 only
- Rework: 0/2

## Implementation

`docs/workflow/dynamic-routing.md` now owns the six backward-routing rules and five QA/skip rules in `## Backward Routing and QA Skip Policy`. `AGENTS.md` retains the headings and uses imperative links to that canonical section. No policy sentence was deleted or paraphrased.

## Evidence

- RED focused contract test against the pre-change files: failed because the canonical section was absent.
- GREEN focused AC-13 contract test: passed after implementation.
- AC-11 evidence carried forward from the merged AC-08/09 slice: `26,065 / 30,000`, headroom `3,935`.
- Sentence-by-sentence comparison: all 11 source sentences are present once in the canonical destination; the source block is absent.
- Mutation plan: delete each destination sentence, retarget/remove either pointer, and restore stale source policy; each must fail the focused contract test.

## Handoff

Independent QA must re-derive ownership and run the full validation matrix before Human Review.
