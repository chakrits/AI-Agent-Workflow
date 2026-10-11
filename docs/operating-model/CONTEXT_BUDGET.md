# Context Budget

## Purpose

This document tracks the approximate token cost of the canonical reading files that an agent loads for a typical workflow task. It is the single source of truth for the context budget enforced by `scripts/validate-context-budget.mjs` (CI check: `npm run validate:context-budget`).

**Rule: When adding content to canonical files, check this budget first.**

## Target

- **Token target:** ≤ 30,000 tokens (approximate)
- **Approximation:** character count ÷ 4 (conservative rule-of-thumb for English prose in UTF-8)

## Tier 1 Core Bootloader

The Tier 1 bootloader has its own enforced limit of **≤ 2,500 approximate tokens**, matching the approved
Issue #280 SDD. It is measured separately so it is not double-counted in the Tier 3 canonical-library total.
The earlier Issue #281 follow-up measured 6,360 characters / 1,590 approximate tokens; the current measurement is listed below.

The approximation is deliberately coarse. The goal is not to track exact token counts for a specific model, but to detect budget drift early — before a change pushes the canonical reading set past a size where agents start dropping or ignoring context.

## Current Core-Only Measurement (Issue #294)

Measured 2026-10-11 with `npm run validate:context-budget` after IMP-005 core policy alignment. Tier 3 contains seven core policy files; catalog, skills and optional work instructions are excluded. This file-set change is not a model-token measurement. Limits remain 30,000 core / 2,500 boot / 1,500 per role.

| Core file | Characters | Approximate tokens |
|---|---:|---:|
| `AGENTS.md` | 15655 | 3913 |
| `docs/workflow/role-definitions.md` | 33753 | 8438 |
| `docs/workflow/handoff-contract.md` | 5504 | 1376 |
| `docs/workflow/quality-gates.md` | 15551 | 3887 |
| `docs/workflow/dynamic-routing.md` | 10258 | 2564 |
| `docs/operating-model/AGENT_OPERATING_MODEL.md` | 8037 | 2009 |
| `docs/operating-model/AGENT_EVALUATION_CHECKLIST.md` | 10760 | 2690 |
| **Total** | **99518** | **24877** |

Headroom: 5123 approximate tokens. Bootloader7071 characters/1767 approximate tokens. IMP-003 checkpoint measured24481/30000 before this policy wording; historical observations below remain unchanged and are not the current enforcement set.


## Historical observed baseline (before decoupling)

| Metric | Value |
|---|---|
| Date measured | 2026-09-21T00:00:00Z |
| Commit SHA | `9d170c6` (Issue #281 candidate) |
| Command | `npm run validate:context-budget` |
| Files measured | 8 |
| Total characters | 104,876 |
| Total tokens (approx.) | 26,214 |
| Target | 30,000 |
| Headroom | 3,786 tokens |

## Per-File Breakdown

| File | Chars | Tokens (approx.) |
|---|---:|---:|
| `AGENTS.md` | 14,323 | 3,580 |
| `docs/workflow/role-definitions.md` | 33,194 | 8,298 |
| `docs/operating-model/SKILL_CATALOG.md` | 19,034 | 4,758 |
| `docs/workflow/handoff-contract.md` | 5,263 | 1,315 |
| `docs/workflow/quality-gates.md` | 6,803 | 1,700 |
| `docs/workflow/dynamic-routing.md` | 10,258 | 2,564 |
| `docs/operating-model/AGENT_OPERATING_MODEL.md` | 6,050 | 1,512 |
| `docs/operating-model/AGENT_EVALUATION_CHECKLIST.md` | 9,951 | 2,487 |
| **Total** | **104,876** | **26,214** |

The previous `2026-07-25` observation was `103,641` characters / `25,910` approximate tokens and is retained as historical context only.

## How to Recompute

```bash
npm run validate:context-budget
```

The script reads each core canonical file, prints the per-file breakdown, and exits 0 when the total is within target (or exits 1 when it is over). Update the current core measurement when it changes; preserve historical observations.

## After Editing a Core Source

Every path listed in `test/fixtures/context-pack-v1/required-source-matrix.json` — including the Tier 1 Core
Bootloader — is pinned by exact sha256. Editing a pinned source makes its hash stale and fails the context-pack
tests with no obvious pointer back to the matrix. The matrix is authoritative; do not maintain a second manual
list here.

The current v3 matrix pins core sources only. Optional catalog/skill/work-instruction edits require no repin, core budget check or skill parity. Core Claude role adapters retain their separate adapter-parity guard.

After a legitimate edit to one of these files, re-pin the matrix rather than hand-editing the hash:

```bash
npm run repin:source-matrix
```

The script recomputes sha256 for every path the matrix pins, rewrites only the entries whose hash actually
changed (including every row where a changed path is pinned redundantly), and makes no change at all when
nothing needs updating. Run `npm test` afterward to confirm the matrix is consistent again.

## When the Budget Is Over

If `npm run validate:context-budget` exits 1:

1. Identify which canonical file grew.
2. Split the file, extract a non-canonical section into a separate doc, or trim verbosity.
3. Update the baseline table in this document.
4. Re-run the check until it passes.

Do not raise `TARGET` to make a failing check pass. Raising the target is a framework-level decision and must be recorded as an ADR in `DECISIONS.md`.
