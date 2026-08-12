# Lightweight Specification: Issue #169 — Durable-vs-Clearable Reference Boundary

**Date:** 2026-08-12 (final revision after SA review + two Human scope decisions)
**Author:** Orchestrator / Documentation Agent (Hermes)
**Status:** Approved — Human-approved scope; awaiting SA re-review before implementation
**Issue:** https://github.com/chakrits/AI-Agent-Workflow/issues/169
**Change type:** Framework / Meta (`framework_meta`)
**Risk level:** Low
**Workflow route:** Orchestrator → Documentation Agent → QA Agent → Human Approval

## 1. Objective

A **forward-facing** file (canonical rule, contract, workflow, template, mirrored skill, or
top-level project state) must not depend, for the meaning of any normative statement, on a
**specific document** stored inside `CLEARED_DIRECTORIES` (`scripts/reset-to-template.mjs:77-91`).
After `npm run reset:template` the referenced document no longer exists, so the referring text must
remain self-contained.

**Historical records** under `docs/records/` are deliberately excluded: they document what was true
at the time and may legitimately reference a document that was later cleared. Editing a historical
record to remove such a reference would falsify the record.

## 2. Human decisions (final)

1. **Scope is the four real references only** — the two originally-reported instances plus the two
   additional refs found at `dispatch-packet-contract.md:151` and `:190`. No other file is edited.
2. **Historical records excluded** by rationale (they may reference the past), not by directory
   exemption that would hide forward-facing defects.
3. **Code/mechanism excluded** by extension (`.js`, `.mjs`, `.yml`, `.yaml`) — they reference
   cleared dirs as implementation logic, not meaning dependencies.
4. **Validator is diff-scoped and reference-specific:** it flags only a forward-facing changed file
   that references a **specific document** inside a cleared directory. It does **not** flag a
   directory mention used as metadata/instruction (e.g. "create a record at `docs/records/work-items/`").
5. **Validator cannot fail on unchanged files** (diff-scoped), so pre-existing historical refs
   cannot break the gate.

## 3. Verified current state (evidence)

### 3.1 The four references to fix (the complete defect class)

| # | File:line | Ref type | Target (cleared) | Resolution |
|---|---|---|---|---|
| 1 | `docs/workflow/dispatch-packet-contract.md:12` | design link | `docs/superpowers/specs/2026-07-26-dispatch-packet-contract-102a-design.md` | Drop path; point to surviving Issue #102 |
| 2 | `docs/workflow/dispatch-packet-contract.md:151` | worked example | `docs/superpowers/specs/2026-07-26-workflow-playbook-discoverability-design.md` | Inline one-line self-contained summary |
| 3 | `docs/workflow/dispatch-packet-contract.md:190` | worked example | same as #2 | Inline one-line self-contained summary |
| 4 | `docs/contracts/schemas/dispatch-receipt.schema.json:3` | `$comment` | `docs/superpowers/specs/2026-07-28-dispatch-receipt-lifecycle-security-revision.md` | Inline full rationale into `$comment` |

All targets recoverable from `66b5bf1` (parent of reset commit `93203e2`).

### 3.2 Verified non-defects (explicitly NOT fixing)

These reference a **directory** as metadata/instruction, not a specific document for meaning, and
were verified against the repo:

- `docs/workflow/reset-to-template.md:15` — "clears `docs/records/work-items/`" (describes what the
  script clears)
- `README.md:19,20,188` — "Work Item records (`docs/records/work-items/`)" (declares where records live)
- `.agents/.claude/.agent/skills/dynamic-workflow/SKILL.md:46` — "create a record at
  `docs/records/work-items/...`" (instruction)
- `PROJECT_STATUS.md`, `TASK_LOG.md` — historical mentions of cleared paths (top-level project
  state, mostly historical narrative, not normative dependencies on the referenced document's content)

> **Scope rationale:** the validator's job is to stop a future forward-facing file from *depending
> on a cleared document for meaning*. Directory mentions that carry no meaning dependency are not
> the defect class and must not be flagged.

## 4. Validator design (`scripts/validate-clearable-refs.mjs`)

**Diff-scoped + reference-specific** (mirrors `validate-review-gate.mjs`'s `resolveDiffRange`):

1. Resolve the changed-file set against the PR base (`GITHUB_BASE_REF` → `origin/main` → `main`).
2. For each changed file that is **content** (not `.js`/`.mjs`/`.yml`/`.yaml`, not under
   `docs/records/`), scan for a reference to a **specific document** inside `CLEARED_DIRECTORIES`.
3. A reference is flagged only when it names a **file path** (e.g. `docs/superpowers/specs/xxx.md`)
   — a bare directory mention (`docs/records/work-items/`) is not flagged.
4. **Fails** on any hit → a forward-facing file would introduce a cleared-document dependency.
5. Does **not** scan unchanged files, so pre-existing historical references cannot fail the gate.
6. `CLEARED_DIRECTORIES` imported from `reset-to-template.mjs` so the two cannot drift.

Regression tests:
- passing: content file with no reference to a cleared document
- failing: content file referencing `docs/superpowers/specs/<file>.md`
- passing: content file mentioning a cleared **directory** as metadata (no file path)
- passing: code file (`.mjs`) referencing a cleared document
- passing: an unchanged historical file is not scanned

## 5. CI wiring (AC-04)

Add `npm run validate:clearable-refs` to the `validate` job in
`.github/workflows/validate-contracts.yml` (structure verified at lines 14–27).

Budget note: `scripts/validate-context-budget.mjs:19-28` defines `CANONICAL_FILES` as an explicit
eight-file array; a `.mjs` validator is not counted against the 30,000-token `TARGET`. `TARGET`
unchanged.

## 6. Scope

### In scope
- The four references in §3.1 — cleaned to be self-contained.
- New `scripts/validate-clearable-refs.mjs` + `test/validate-clearable-refs.test.mjs` (diff-scoped,
  reference-specific).
- `.github/workflows/validate-contracts.yml` — wire the new validator.
- `DECISIONS.md` — record the durable-vs-clearable boundary as a decision note.

### Out of scope
- `docs/records/` (historical — allowed to reference the past).
- The verified non-defect directory mentions in §3.2 (metadata/instruction, not meaning refs).
- `scripts/*.mjs`, `test/*.mjs`, `.github/workflows/*.yml` (code/mechanism).
- Untracked `.superpowers/`, `.worktrees/`.
- Changing which directories `reset-to-template.mjs` clears.
- Raising `TARGET` in `scripts/validate-context-budget.mjs`.
- A general repository-wide Markdown link checker.

## 7. Acceptance criteria (final)

- [ ] **AC-01:** The four forward-facing references in §3.1 are self-contained — none depends on a
  cleared document for the meaning of a normative statement.
- [ ] **AC-02:** The `consumed`-is-not-runtime-attested rationale is fully stated inline in the
  schema `$comment` and is obtainable from a location that survives `npm run reset:template`.
- [ ] **AC-03:** `scripts/validate-clearable-refs.mjs` is diff-scoped and reference-specific: it
  fails when a changed content file references a specific document inside `CLEARED_DIRECTORIES`;
  passes when it does not; does not flag a bare directory mention; does not flag code/mechanism
  files; and does not scan unchanged historical content. Regression tests cover all five cases.
  **Required merge gate.**
- [ ] **AC-04:** The check is wired into the existing CI validator job.
- [ ] **AC-05:** `npm run validate:context-budget` still passes; `TARGET` unchanged.
- [ ] **AC-06:** `npm test`, `npm run validate:contracts`, and the remaining validator suite pass.
- [ ] **AC-07:** Running `scripts/verify-reset-template.mjs`'s disposable-clone harness leaves no
  forward-facing content file referencing a cleared document in the reset clone.

## 8. Handoff

- **From:** Orchestrator / Documentation Agent
- **To:** SA Agent (re-review revised spec) → Human Maintainer (approve) → Developer Agent (impl)
  → QA Agent (verify) → Human Maintainer (merge)
- **Required before implementation:** SA re-review of this final spec.