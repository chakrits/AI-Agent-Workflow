# Lightweight Specification: Issue #169 — Durable-vs-Clearable Reference Boundary

**Date:** 2026-08-12
**Author:** Orchestrator / Documentation Agent (Hermes)
**Status:** Draft — awaiting SA + Human approval before `status:spec-ready`
**Issue:** https://github.com/chakrits/AI-Agent-Workflow/issues/169
**Change type:** Framework / Meta (`framework_meta`)
**Risk level:** Low
**Workflow route:** Orchestrator → Documentation Agent → QA Agent → Human Approval

## 1. Objective

Canonical and contract files must not depend, for the meaning of any normative statement, on a
document stored inside `CLEARED_DIRECTORIES` (`scripts/reset-to-template.mjs:77-91`). After a
template reset the referring rule survives and its definition does not, leaving normative text
whose meaning is unobtainable in the reset repository.

This work item generalises the Issue #166 fix so the class stops recurring mechanically instead of
being caught by hand review each time.

## 2. Verified current state (evidence, not assumption)

All four dangling references were confirmed against `main` `6ac057d`:

| # | Referring file:line | Target (inside `CLEARED_DIRECTORIES`) | Recoverable from | Notes |
|---|---|---|---|---|
| 1 | `docs/workflow/dispatch-packet-contract.md:12` | `docs/superpowers/specs/2026-07-26-dispatch-packet-contract-102a-design.md` | `66b5bf1` (459 lines) | Design doc for Issue #102a; the pointing file is itself the canonical v1 definition |
| 2 | `docs/workflow/dispatch-packet-contract.md:151` | `docs/superpowers/specs/2026-07-26-workflow-playbook-discoverability-design.md` | `66b5bf1` (208 lines) | Embedded worked-example packet references "what was specified" |
| 3 | `docs/workflow/dispatch-packet-contract.md:190` | same as #2 | `66b5bf1` | Second worked-example packet, same target |
| 4 | `docs/contracts/schemas/dispatch-receipt.schema.json:3` `$comment` | `docs/superpowers/specs/2026-07-28-dispatch-receipt-lifecycle-security-revision.md` | `66b5bf1` (189 lines) | **Most consequential** — the `$comment` is the only place the schema explains that `consumed` is repository-audited, not runtime-attested |

> **Correction to the Issue body:** the Issue lists only 2 instances (refs 1 and 4). Verification
> found **4 distinct dangling references** (refs 2 and 3 are additional, both pointing at the
> same workflow-playbook-discoverability target). AC-01 below is written to cover all four.

`CLEARED_DIRECTORIES` verified at `scripts/reset-to-template.mjs:77-91` includes
`docs/superpowers/specs` and `docs/superpowers/plans`.

## 3. Per-instance resolution

### Instance 1 — `dispatch-packet-contract.md:12` (design doc for Issue #102a)

`dispatch-packet-contract.md` **is** the canonical v1 definition of the dispatch packet. The
referenced `...-102a-design.md` is the historical design rationale that produced it. The durable
normative content already lives in the pointing file itself.

**Resolution: drop the cleared-path reference.** Replace line 12's design link with a pointer to
the surviving decision record (Issue #102, already cited on line 11) and state that the design is
the basis for this canonical v1 — no path into `CLEARED_DIRECTORIES` remains. The design body stays
recoverable from git history for anyone who needs the rationale.

### Instances 2 & 3 — `dispatch-packet-contract.md:151,190` (worked-example packets)

Both lines sit inside *worked-example* dispatch packets (Documentation Agent and QA Agent) that
reference the workflow-playbook-discoverability design as "what was specified". These are
illustrative historical packets, not living normative requirements.

**Resolution: inline a compact self-contained summary** at each site (one line each) describing what
that design specified, so the example reads standalone without a cleared-path dependency. The full
design body remains recoverable from git history.

### Instance 4 — `dispatch-receipt.schema.json:3` `$comment` (most consequential)

The `$comment` currently defers its entire anti-overclaim rationale to a cleared file. The rationale
is short and durable and must survive a reset.

**Resolution: inline the full rationale into the `$comment` text itself.** The assurance wording
already drafted in the recovered SDD (Control 4) is the exact text to embed — it is compact,
self-contained, and does not depend on any external file. The `See docs/superpowers/specs/...`
trailer is removed. The schema reads correctly whether or not a reset has occurred.

## 4. Mechanical regression check (AC-03 / AC-04)

Add a new validator `scripts/validate-clearable-refs.mjs` (with `test/validate-clearable-refs.test.mjs`):

- **Fail condition:** any file **outside** `docs/records/` and `docs/superpowers/` contains a
  path reference to any directory named in `CLEARED_DIRECTORIES`.
- **Pass condition:** no such reference exists (or every violation is inside the two exempt
  directories, which are themselves cleared and therefore cannot dangle).
- **Regression tests:** at least one passing case and one failing case (build a fixture that
  references `docs/superpowers/specs/...` and assert the validator rejects it).
- **CI wiring:** add the validator to the existing `validate` job in
  `.github/workflows/validate-contracts.yml`, mirroring how `validate:review-gate` and the other
  validators are invoked.

Budget note: `scripts/validate-context-budget.mjs:19-28` defines `CANONICAL_FILES` as an explicit
eight-file array; a `.mjs` validator is not counted against the 30,000-token `TARGET`. `TARGET`
remains unchanged.

## 5. Scope

### In scope
- `docs/workflow/dispatch-packet-contract.md` — refs at lines 12, 151, 190
- `docs/contracts/schemas/dispatch-receipt.schema.json` — `$comment` at line 3
- New `scripts/validate-clearable-refs.mjs` + `test/validate-clearable-refs.test.mjs`
- `.github/workflows/validate-contracts.yml` — wire the new validator
- `DECISIONS.md` — record the durable-vs-clearable boundary as policy (a prior ADR is not required
  if the boundary is recorded as a decision note; see Open Questions)

### Out of scope
- Changing which directories `reset-to-template.mjs` clears
- Raising `TARGET` in `scripts/validate-context-budget.mjs`
- Re-litigating Issue #166's relocation (already merged)
- A general repository-wide Markdown link checker

## 6. Acceptance criteria (corrected to cover all 4 refs)

- [ ] **AC-01:** Neither `docs/workflow/dispatch-packet-contract.md` nor
  `docs/contracts/schemas/dispatch-receipt.schema.json` depends on a path inside
  `CLEARED_DIRECTORIES` for the meaning of a normative statement. (Covers all four refs — Issue
  body's two plus the two additional worked-example refs found at `:151` and `:190`.)
- [ ] **AC-02:** The `consumed`-is-not-runtime-attested rationale is fully stated inline in the
  schema `$comment` and is obtainable from a location that survives `npm run reset:template`.
- [ ] **AC-03:** An automated check fails when a file outside `docs/records/` and
  `docs/superpowers/` references a path inside `CLEARED_DIRECTORIES`, with a regression test
  covering both a passing and a failing case.
- [ ] **AC-04:** The check is wired into the existing CI validator job.
- [ ] **AC-05:** `npm run validate:context-budget` still passes; `TARGET` unchanged.
- [ ] **AC-06:** `npm test`, `npm run validate:contracts`, and the remaining validator suite pass.
- [ ] **AC-07:** Running `scripts/verify-reset-template.mjs`'s disposable-clone harness leaves no
  dangling canonical or contract reference in the reset clone.

## 7. Open questions for the Human Maintainer

1. **AC-03 advisory or required gate?** The Issue leaves this open. Recommendation: **required**
   merge gate — the whole point is that the defect previously failed open, so an advisory-only
   check recreates the same risk class, just machine-assisted.
2. **DECISIONS.md recording:** record the durable-vs-clearable boundary as a formal ADR, or as a
   decision note under the existing structure? Recommendation: a short decision note (not a full
   ADR) since this clarifies an existing boundary rather than setting new architecture.

## 8. Handoff

- **From:** Orchestrator / Documentation Agent
- **To:** SA Agent (review spec) → Human Maintainer (approve spec) → [then] Developer Agent (impl)
  → QA Agent (verify) → Human Maintainer (merge)
- **Required before `status:spec-ready`:** SA review + Human approval of this specification.