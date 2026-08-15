# Context Budget

## Purpose

This document tracks the approximate token cost of the canonical reading files that an agent loads for a typical workflow task. It is the single source of truth for the context budget enforced by `scripts/validate-context-budget.mjs` (CI check: `npm run validate:context-budget`).

**Rule: When adding content to canonical files, check this budget first.**

## Target

- **Token target:** ≤ 30,000 tokens (approximate)
- **Approximation:** character count ÷ 4 (conservative rule-of-thumb for English prose in UTF-8)

The approximation is deliberately coarse. The goal is not to track exact token counts for a specific model, but to detect budget drift early — before a change pushes the canonical reading set past a size where agents start dropping or ignoring context.

## Current observed baseline

| Metric | Value |
|---|---|
| Date measured | 2026-08-15T12:12:14Z |
| Commit SHA | `5d70f6e` |
| Command | `npm run validate:context-budget` |
| Files measured | 8 |
| Total characters | 119,763 |
| Total tokens (approx.) | 29,937 |
| Target | 30,000 |
| Headroom | 63 tokens |

## Per-File Breakdown

| File | Chars | Tokens (approx.) |
|---|---:|---:|
| `AGENTS.md` | 16,521 | 4,130 |
| `docs/workflow/role-definitions.md` | 37,571 | 9,392 |
| `docs/operating-model/SKILL_CATALOG.md` | 28,525 | 7,131 |
| `docs/workflow/handoff-contract.md` | 5,016 | 1,254 |
| `docs/workflow/quality-gates.md` | 6,803 | 1,700 |
| `docs/workflow/dynamic-routing.md` | 9,326 | 2,331 |
| `docs/operating-model/AGENT_OPERATING_MODEL.md` | 6,050 | 1,512 |
| `docs/operating-model/AGENT_EVALUATION_CHECKLIST.md` | 9,951 | 2,487 |
| **Total** | **119,763** | **29,937** |

The previous `2026-07-25` observation was `103,641` characters / `25,910` approximate tokens and is retained as historical context only.

## How to Recompute

```bash
npm run validate:context-budget
```

The script reads each canonical file, prints the per-file breakdown, and exits 0 when the total is within target (or exits 1 when it is over). Update the table above with the new numbers whenever the baseline changes.

## When the Budget Is Over

If `npm run validate:context-budget` exits 1:

1. Identify which canonical file grew.
2. Split the file, extract a non-canonical section into a separate doc, or trim verbosity.
3. Update the baseline table in this document.
4. Re-run the check until it passes.

Do not raise `TARGET` to make a failing check pass. Raising the target is a framework-level decision and must be recorded as an ADR in `DECISIONS.md`.
