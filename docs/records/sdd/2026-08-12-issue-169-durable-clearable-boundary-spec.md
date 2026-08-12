# Lightweight Specification: Issue #169 — Durable-vs-Clearable Reference Boundary

**Date:** 2026-08-12 (revised after SA review)
**Author:** Orchestrator / Documentation Agent (Hermes)
**Status:** Draft — revised after SA design review; awaiting SA + Human approval before `status:spec-ready`
**Issue:** https://github.com/chakrits/AI-Agent-Workflow/issues/169
**Change type:** Framework / Meta (`framework_meta`)
**Risk level:** Low
**Workflow route:** Orchestrator → Documentation Agent → QA Agent → Human Approval

## 1. Objective

Any file that **survives** `npm run reset:template` must not depend, for the meaning of any
normative or record statement, on a document stored inside `CLEARED_DIRECTORIES`
(`scripts/reset-to-template.mjs:77-91`). After a template reset a surviving file must remain
self-contained — the reference target no longer exists, so the referring text must not rely on it.

This is the **flip-concept** formulation chosen by the Human Maintainer: check that every surviving
file is free of references into cleared directories, rather than checking that "non-exempt" files
are. It covers every location uniformly and removes the exemption-boundary class of defects.

## 2. Verified current state (evidence, not assumption)

### 2.1 The two originally-reported instances (both confirmed)

| # | Referring file:line | Target (inside `CLEARED_DIRECTORIES`) | Recoverable from |
|---|---|---|---|
| 1 | `docs/workflow/dispatch-packet-contract.md:12` | `docs/superpowers/specs/2026-07-26-dispatch-packet-contract-102a-design.md` | `66b5bf1` (459 lines) |
| 4 | `docs/contracts/schemas/dispatch-receipt.schema.json:3` `$comment` | `docs/superpowers/specs/2026-07-28-dispatch-receipt-lifecycle-security-revision.md` | `66b5bf1` (189 lines) |

### 2.2 Additional refs found during first verification (Issue body listed only two)

| # | Referring file:line | Target |
|---|---|---|
| 2 | `docs/workflow/dispatch-packet-contract.md:151` | `docs/superpowers/specs/2026-07-26-workflow-playbook-discoverability-design.md` |
| 3 | `docs/workflow/dispatch-packet-contract.md:190` | same as #2 |

### 2.3 Full surviving-content scan (SA review finding, verified against repo)

A repository-wide scan of every surviving tracked content file for references into
`CLEARED_DIRECTORIES` enumerated the full defect class — far larger than the 4 refs:

**Content files (survive reset, must be cleaned):**
- `docs/workflow/dispatch-packet-contract.md` (refs 1–3)
- `docs/workflow/reset-to-template.md`
- `docs/contracts/schemas/dispatch-receipt.schema.json` (ref 4)
- `README.md`, `PROJECT_STATUS.md`, `TASK_LOG.md`
- `docs/records/qa/2026-07-31-issue-129-reset-template-code-review.md`,
  `...-qa-report.md`, `...-rereview-code-review.md`, `2026-07-26-issue-99-playbook-discoverability-code-review.md`,
  `2026-07-25-issue-95-workflow-playbooks-code-review.md`, `2026-07-28-issue-117-qa-verification.md`,
  `2026-07-28-issue-119-qa-verification.md`, `2026-07-28-issue-119-security-review.md`,
  `2026-08-01-issue-132-context-code-review.md`, `2026-08-01-issue-132-context-qa.md`,
  `2026-08-01-issue-133-status-loader-code-review.md`, `2026-08-12-reset-template-handoffs-gap-code-review.md`
  (12 files under `docs/records/qa/`)
- `.agents/skills/dynamic-workflow/SKILL.md`, `.claude/skills/dynamic-workflow/SKILL.md`,
  `.agent/skills/dynamic-workflow/SKILL.md` (3 mirrored copies)

**Code files (survive reset, reference cleared dirs as implementation logic — MUST be excluded from the check):**
- `scripts/reset-to-template.mjs` (defines `CLEARED_DIRECTORIES` itself), `scripts/validate-dispatch-receipts.mjs`,
  `scripts/dispatch-receipt-notify.mjs`, `scripts/backfill-work-item-records.mjs`
- `test/reset-to-template.test.mjs`, `test/validate-dispatch-receipts.test.mjs`,
  `test/dispatch-receipt-notify.test.mjs`, `test/backfill-work-item-records.test.mjs`,
  `test/status-loader.test.mjs`

**Untracked (out of git scope, noted for completeness):**
- `.superpowers/sdd/task-1-brief.md`, `task-4-brief.md`; `.worktrees/` (untracked, not validated)

> **Scope correction:** the Issue #169 body and the original spec limited the defect to 4 refs. The
> verified class is ~30 content-file references plus 9 code files that must be excluded. This is a
> scope expansion requiring Human approval (see §7).

## 3. Design — flip-concept validator

### 3.1 Core rule

> **Every tracking-managed file that survives `reset:template` must not reference a path inside
> `CLEARED_DIRECTORIES`, except files classified as code/mechanism.**

### 3.2 File classification

Two classes, distinguished by whether the reference is a **meaning dependency** (ruled) or an
**implementation mechanism** (allowed):

| Class | Rule | Examples |
|---|---|---|
| **Content** (`.md`, `.json` schema, docs, records, skills) | Must contain **no** reference into `CLEARED_DIRECTORIES` | `docs/workflow/*`, `docs/contracts/schemas/*`, `README.md`, `PROJECT_STATUS.md`, `TASK_LOG.md`, `docs/records/qa/*`, mirrored `SKILL.md` |
| **Code / mechanism** (`.js`, `.mjs`, CI workflows, config) | Allowed to reference cleared dirs as implementation logic | `scripts/*.mjs`, `test/*.mjs`, `.github/workflows/*.yml` |

### 3.3 Resolution per instance

- **Instance 1** (`dispatch-packet-contract.md:12`): drop the cleared-path design link; the
  pointing file is itself canonical v1. Replace with surviving Issue #102 pointer.
- **Instances 2–3** (`dispatch-packet-contract.md:151,190`): inline a one-line self-contained
  summary at each worked-example site.
- **Instance 4** (schema `$comment`): inline the full repository-audited rationale into the
  `$comment` itself; remove the `See docs/superpowers/specs/...` trailer.
- **`reset-to-template.md`, `README.md`, `TASK_LOG.md`, `PROJECT_STATUS.md`, `docs/records/qa/*`,
  mirrored `SKILL.md`**: for each, either inline the needed content or drop the cleared-path
  reference such that the surviving file is self-contained. (Exact per-file edit enumerated at
  implementation time; all targets recoverable from `66b5bf1`.)

### 3.4 Validator design (`scripts/validate-clearable-refs.mjs`)

- Enumerates every tracked file (`git ls-files`).
- Drops untracked dirs (`.superpowers/`, `.worktrees/`) and `node_modules/`.
- Excludes the code/mechanism class by extension (`.js`, `.mjs`, `.yml`, `.yaml`) — these are
  implementation, not meaning dependencies. *(Corollary: a `.mjs` that is a Content-carrier would
  need its own exception, but none exists today.)*
- For every remaining surviving file, scans for path references into `CLEARED_DIRECTORIES`
  (imported from `reset-to-template.mjs` so the two cannot drift).
- **Fails** on any hit → the surviving file would dangle after reset.
- Regression tests: at least one passing case (a content file with no cleared ref) and one failing
  case (a fixture content file referencing `docs/records/sdd/...`).

### 3.5 Exemption-hole closing

The flip concept replaces the old "exempt `docs/records/` + `docs/superpowers/`" rule, which SA
review found to be a hole: `docs/records/qa/` survives reset but was exempted, so its references
into cleared dirs were invisible. Under the flip concept there is no directory exemption — only the
code/mechanism class is excluded, and `docs/records/qa/*.md` are Content, so they are checked and
must be cleaned.

## 4. CI wiring (AC-04)

Add `npm run validate:clearable-refs` to the `validate` job in
`.github/workflows/validate-contracts.yml`, alongside `validate:review-gate` and the other
validators (verified structure at lines 14–27).

Budget note: `scripts/validate-context-budget.mjs:19-28` defines `CANONICAL_FILES` as an explicit
eight-file array; a `.mjs` validator is not counted against the 30,000-token `TARGET`. `TARGET`
unchanged.

## 5. Scope

### In scope
- All surviving **content** files listed in §2.3 that reference `CLEARED_DIRECTORIES` —
  cleaned to be self-contained (recoverable targets from `66b5bf1`).
- New `scripts/validate-clearable-refs.mjs` + `test/validate-clearable-refs.test.mjs`
  (flip-concept rule, code/mechanism excluded).
- `.github/workflows/validate-contracts.yml` — wire the new validator.
- `DECISIONS.md` — record the durable-vs-clearable boundary as a decision note.

### Out of scope
- `scripts/*.mjs`, `test/*.mjs`, `.github/workflows/*.yml` (code/mechanism class — allowed).
- Untracked `.superpowers/`, `.worktrees/`.
- Changing which directories `reset-to-template.mjs` clears.
- Raising `TARGET` in `scripts/validate-context-budget.mjs`.
- A general repository-wide Markdown link checker.

## 6. Acceptance criteria (revised for flip concept)

- [ ] **AC-01:** Every surviving content file (as classified in §3.2) contains no reference into
  `CLEARED_DIRECTORIES` that is required for the meaning of a normative or record statement.
  (Covers all four originally-reported refs plus the additional surviving-content refs found in
  §2.3.)
- [ ] **AC-02:** The `consumed`-is-not-runtime-attested rationale is fully stated inline in the
  schema `$comment` and is obtainable from a location that survives `npm run reset:template`.
- [ ] **AC-03:** `scripts/validate-clearable-refs.mjs` fails when a surviving content file
  references a path inside `CLEARED_DIRECTORIES`, passes when it does not, and does **not** flag
  the code/mechanism class (`scripts/`, `test/`, `.github/workflows/`). Regression tests cover at
  least one passing and one failing content case, and one code/mechanism case that must pass.
  **Required merge gate.**
- [ ] **AC-04:** The check is wired into the existing CI validator job.
- [ ] **AC-05:** `npm run validate:context-budget` still passes; `TARGET` unchanged.
- [ ] **AC-06:** `npm test`, `npm run validate:contracts`, and the remaining validator suite pass.
- [ ] **AC-07:** Running `scripts/verify-reset-template.mjs`'s disposable-clone harness leaves no
  surviving content file referencing a cleared path in the reset clone.

## 7. Open questions / decisions needed

1. **Scope expansion (Human approval required):** the defect class is ~30 content refs + 9 code
   files, not the 4 the Issue originally scoped. Approve the expanded scope, or keep to the 4
   refs + validator and file the broader cleanup as a follow-up issue?
2. **`docs/records/qa/` cleanup:** 8+ QA records reference cleared dirs. These are historical
   records — approved to edit them (drop/inline references) or leave them and exclude
   `docs/records/qa/` explicitly (accepting they dangle on some arrays)?
3. **Code/mechanism exclusion by extension:** acceptable, or should the validator use an explicit
   allowlist of the 9 code files instead (more precise, higher maintenance)?

## 8. Handoff

- **From:** Orchestrator / Documentation Agent
- **To:** SA Agent (re-review revised spec) → Human Maintainer (approve scope + spec) → Developer
  Agent (impl) → QA Agent (verify) → Human Maintainer (merge)
- **Required before `status:spec-ready`:** SA re-review + Human approval of this revised spec and
  the scope expansion.