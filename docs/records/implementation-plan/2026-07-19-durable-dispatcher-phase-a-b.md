# Implementation Plan: Durable Event-Driven Agent Dispatcher (Phase A + Phase B v1)

## Metadata

| Field | Value |
|---|---|
| Work Item | GitHub Issue #35 |
| Approved inputs | `docs/records/SDD-DURABLE-DISPATCHER-PHASE-A-B-2026-07-19.md` (SA Agent, Security Reviewer PASS at design stage) |
| Change type | New feature — durable orchestration control-plane ledger and CI enforcement |
| Delivery shape | Two independently reviewable increments: Phase A (this pass) and Phase B v1 (separate follow-up) |
| Required route | Developer → QA → Security Reviewer (Phase B only, live GitHub Actions trigger) → Human review → Documentation closeout |

## Scope Boundary (restated Definition of Done)

**In scope for this implementation pass (Phase A only):**
- AC-A1: `docs/contracts/schemas/dispatch-receipt.schema.json` validates the receipt fields and state vocabulary defined in SDD Component Design §1, including the amendment fields `dispatch_depth` and `escalated`.
- AC-A2: `scripts/validate-dispatch-receipts.mjs` is a pure-function, unit-testable validator (mirroring `scripts/work-item-readiness-check.mjs` / `scripts/validate-contracts.mjs` style) that:
  - Schema-validates every receipt file under `docs/records/dispatch-receipts/`.
  - Enforces filename-equals-`handoff_event_id`.
  - Enforces the matching rule (SDD §2): every terminal handoff declaring `Next Action: Dispatch` must have exactly one receipt file with matching `handoff_event_id`/`target_agent`/`Next Owner`, in state `registered` or `consumed`.
  - Enforces `dispatch_depth` correctness (missing field fails; must equal `1` for a Work Item's first receipt or `prior_max + 1` otherwise, derived in `registered_at` chronological order per `work_item_url`).
  - Enforces the reused same-role-pair circuit-breaker bound: a receipt that would be the start of a third round trip between the same two roles for a `work_item_url` must set `escalated: true` with a `notes` reference, or the check fails.
- AC-A3: `npm run validate:dispatch-receipts` is wired into `.github/workflows/validate-contracts.yml` on plain `pull_request` (no elevated token), matching the existing `validate:contracts`/`validate:project-state` pattern.
- AC-A4: `test/validate-dispatch-receipts.test.mjs` proves, with FAIL-then-PASS discipline: valid receipt passes; missing `dispatch_depth` fails; understated `dispatch_depth` fails; depth exceeding the reused bound without `escalated: true` fails; a terminal handoff declaring `Next Action: Dispatch` with no matching receipt fails; plus the SDD's other named negative cases (mismatched `target_agent`, mismatched `handoff_event_id`, `expired`/`cancelled` receipt for a still-live `Dispatch`, correct passing cases).
- AC-A5: example receipt fixtures under `docs/contracts/examples/dispatch-receipts/` mirroring the existing `docs/contracts/examples/bug-fix-*.yaml` convention.
- AC-A6: full repo validation (`npm test`, `npm run validate:contracts`, `npm run validate:project-state`, `git diff --check`) passes.

**Explicitly out of scope for this pass (deferred to a follow-up Developer task):**
- Phase B v1: `.github/workflows/dispatch-receipt-notify.yml`, `scripts/dispatch-receipt-notify.mjs`, the dedicated `dispatch-receipt-notify` GitHub Environment/App credential provisioning, and their tests. Phase B touches a live `push`-to-`main` trigger and its own least-privilege token scope, and per SA's SDD deserves its own review cycle (Security Reviewer re-check of the actual pinned action SHAs and token scope at implementation time, per SDD Threat Surface Summary §1 and §5). Implementing Phase A first, landing it, then opening Phase B as its own follow-up keeps each PR's diff auditable against one blast radius.
- `PROJECT_STATUS.md` / `TASK_LOG.md` / `CHANGELOG.md` updates — Documentation Agent's closeout responsibility after merge.
- Any change to the Issue #33 in-turn-only supervision contract (`docs/workflow/handoff-contract.md` rules 9/13–15) — Phase A is additive only, per SDD "Interaction with the Issue #33 In-Turn-Only Contract".

## Design Decision Not Fully Specified by the SDD: Input 1 Source for the Matching Rule

The SDD's CI Enforcement design (§2, Input 1) describes resolving the terminal handoff text from "the PR body, and/or the linked Issue's latest handoff comment," reusing `work-item-readiness-check.mjs`'s GitHub-API-driven resolution style. That script is invoked from a `github-script` step with live PR/Issue context, not as a standalone CLI.

`scripts/validate-dispatch-receipts.mjs`, however, is wired into `validate-contracts.yml` the same way `scripts/validate-contracts.mjs` and `scripts/validate-project-state.mjs` already are: a plain `node scripts/....mjs` CLI step with **no GitHub API/event context**, operating only on the repository's own checked-out files. To keep this script in that same local-file-only, pure-function, unit-testable family (rather than introducing a new API-context dependency into `validate-contracts.yml`, which today has none), this implementation resolves Input 1 from the repository's own committed terminal-handoff records instead of a live PR/Issue fetch:

- Source: `docs/records/HANDOFF-*.md` files, which already exist in this repo as the durable record of each terminal handoff (see `docs/templates/HANDOFF.md`) and already contain `## Next Action`, `## Next Owner`, and `## Handoff Event ID` fields in a fixed, parseable format.
- A handoff record is "live" (subject to the matching rule) when its `## Next Action` field is `Dispatch`.

This is a scoped judgment call, recorded here per Scope Discipline rather than silently deviating from the SDD. It preserves the SDD's substantive rule (a `Dispatch` handoff with no matching receipt fails CI) and its trigger posture (`pull_request`, no elevated token), while fitting the existing `validate-contracts.yml` architecture exactly. If SA or QA determine live PR-body/Issue-comment resolution is required instead of the committed `HANDOFF-*.md` convention, that is a follow-up routed back to SA before Phase B, since it would change the CI wiring shape (would need a `github-script`-style step, not a plain CLI). This plan flags it explicitly for QA/SA review rather than deciding it unilaterally beyond the stated scope.

## Dependency Flow

```text
SDD (approved, Security PASS at design stage)
  -> IMP-35-01 dispatch-receipt JSON Schema
  -> IMP-35-02 validate-dispatch-receipts.mjs pure functions (schema + matching + depth + breaker)
  -> IMP-35-03 unit tests, FAIL-then-PASS
  -> IMP-35-04 example fixtures
  -> IMP-35-05 wire into package.json + validate-contracts.yml
  -> IMP-35-06 full repo validation + commit + push
  -> QA Agent (Phase A only)
  -> [separate follow-up] Phase B v1 workflow + Security Reviewer re-check
```

## Implementation Tasks

### IMP-35-01 — Add dispatch-receipt JSON Schema

**Owner:** Developer Agent
**Files:** `docs/contracts/schemas/dispatch-receipt.schema.json`

1. JSON Schema (Draft 2020-12, matching `task-state.schema.json`'s `$schema`) with `required`: `handoff_event_id`, `work_item_url`, `source_agent`, `target_agent`, `state`, `registered_at`, `registered_by`, `dispatch_depth`.
2. `state` enum: `registered`, `consumed`, `expired`, `cancelled`.
3. Conditional requirements via `if`/`then` (matching JSON Schema idiom, no new dependency): `terminal_result_id` required when `state == consumed`; `state_changed_at`/`state_changed_by` required when `state != registered`; `escalated` boolean (default false semantics, no default value emitted) optional at schema level — the "required when depth exceeds bound" rule is a cross-file, cross-receipt semantic rule and is enforced in the script, not the single-document schema.
4. `handoff_event_id` pattern `^[a-z0-9][a-z0-9-]{3,63}$` per SDD §1.

**Verification:** schema compiles under Ajv 2020 the same way `validate-contracts.mjs` already compiles `task-state.schema.json` (exercised indirectly by IMP-35-02/03 tests).

### IMP-35-02 — Implement `scripts/validate-dispatch-receipts.mjs`

**Owner:** Developer Agent
**Files:** `scripts/validate-dispatch-receipts.mjs`

Pure, unit-testable functions, no GitHub API calls, mirroring `work-item-readiness-check.mjs`'s "pure function over already-fetched/read data" shape:

1. `parseHandoffDispatchDeclarations(markdownFiles)` — given an array of `{ path, content }`, extract `{ handoffEventId, nextOwner, nextAction, sourceAgent }` for each file whose `## Next Action` field equals `Dispatch`.
2. `validateReceiptSchema(receipt, schema)` — Ajv2020 compile + validate, same pattern as `validateContracts`.
3. `validateDispatchDepth(receiptsByWorkItem)` — per `work_item_url` group, sorted by `registered_at`, assert depth sequence is exactly `1, 2, 3, ...` with no gaps/duplicates; missing `dispatch_depth` is a distinct error message from an incorrect one.
4. `validateEscalationBound(receiptsByWorkItem)` — walk each `work_item_url`'s depth-ordered chain, track the running same-role-pair alternating streak; when adding a receipt would start a third round trip between the same two roles, require `escalated === true` and a non-empty `notes`.
5. `validateMatching(handoffDeclarations, receiptsByFilenameStem)` — for each live `Dispatch` declaration, require exactly one receipt whose filename stem equals `handoffEventId`, `target_agent === nextOwner`, and `state` in `{registered, consumed}`.
6. `validateDispatchReceipts(rootDir)` — top-level orchestrator: reads `docs/records/dispatch-receipts/*.yaml` and `docs/records/HANDOFF-*.md`, runs 1–5, returns a flat `string[]` of errors (same return shape as `validateContracts`/`validateProjectState`).
7. CLI entry guard (`import.meta.url === pathToFileURL(process.argv[1]).href`) identical in style to the two existing validators.

**Verification:** `node --test test/validate-dispatch-receipts.test.mjs`

### IMP-35-03 — Unit tests, FAIL-then-PASS discipline

**Owner:** Developer Agent
**Files:** `test/validate-dispatch-receipts.test.mjs`

Cases (each written RED first against a stub/incomplete implementation, then GREEN once IMP-35-02 lands — transcript captured in the Developer handoff):

1. Valid receipt + matching live handoff → zero errors (PASS case).
2. Receipt missing `dispatch_depth` → fails with a message naming the field.
3. Receipt understating `dispatch_depth` (reuses stale/prior value when a higher prior receipt exists for the same `work_item_url`) → fails.
4. `dispatch_depth` correctly `1` for a Work Item's first receipt → passes.
5. `dispatch_depth` correctly `prior_max + 1` across mixed states for the same `work_item_url` → passes.
6. Third same-role-pair round trip missing `escalated: true` → fails.
7. Same case with `escalated: true` and a `notes` reference → passes.
8. Terminal handoff declaring `Next Action: Dispatch` with no matching receipt file → fails.
9. Receipt exists but `target_agent` != handoff's `Next Owner` → fails.
10. Receipt exists but `handoff_event_id` (filename) mismatch → fails.
11. Matching receipt is `expired`/`cancelled` for a still-live `Dispatch` → fails (does not satisfy the live declaration).
12. Filename stem not equal to the `handoff_event_id` field inside the file → fails (schema/consistency check).

### IMP-35-04 — Example fixtures

**Owner:** Developer Agent
**Files:** `docs/contracts/examples/dispatch-receipts/*.yaml`

1. One passing example (`registered`, `dispatch_depth: 1`) mirroring `bug-fix-pass.yaml`'s role as a canonical positive fixture.
2. Used by unit tests as fixture input (loaded via the same `YAML.parse(await readFile(...))` pattern already used elsewhere), not auto-discovered by the CI matching rule (the real ledger directory is `docs/records/dispatch-receipts/`, kept separate from `docs/contracts/examples/`, consistent with the SDD's stated ledger location).

### IMP-35-05 — Wire into `package.json` and `validate-contracts.yml`

**Owner:** Developer Agent
**Files:** `package.json`, `.github/workflows/validate-contracts.yml`

1. Add `"validate:dispatch-receipts": "node scripts/validate-dispatch-receipts.mjs"` to `package.json` `scripts`, alongside `validate:contracts`/`validate:project-state`.
2. Add `- run: npm run validate:dispatch-receipts` as a new step in `.github/workflows/validate-contracts.yml`'s existing `validate` job, after the existing `validate:contracts` step, on the existing plain `pull_request`/`push` trigger (no new trigger, no new token scope — matches SDD §2's stated posture exactly).

### IMP-35-06 — Full validation, commit, push

**Owner:** Developer Agent
**Files:** none (verification only)

1. Run `npm test && npm run validate:contracts && npm run validate:project-state && git diff --check`; record exact counts in the Developer handoff.
2. Commit implementation-plan doc and Phase A code as atomic commit(s) to `sa/issue-35-durable-dispatcher-design`; push.
3. Do not touch `PROJECT_STATUS.md`/`TASK_LOG.md`/`CHANGELOG.md`.

## Phase B v1 — planned only, not implemented this pass

Per SDD Component Design §3: `.github/workflows/dispatch-receipt-notify.yml` (push-to-`main`, path-filtered to `docs/records/dispatch-receipts/**`), `scripts/dispatch-receipt-notify.mjs` (pure module imported by a thin `github-script` step), a dedicated `dispatch-receipt-notify` GitHub Environment with its own narrowly scoped App credentials (`issues: write`, no `contents: write`/`actions: write`/`checks: write`), SHA-pinned actions matching `work-item-readiness-refresh.yml`'s pattern, and an idempotency/no-ledger-write-back test suite per SDD Testability Notes. This is intentionally not started in this pass; it is routed as a separate Developer Agent follow-up task after Phase A lands and QA/Security have reviewed it independently, per the scope boundary above.

## Test Strategy

| Layer | Owner | Evidence |
|---|---|---|
| Schema unit tests | Developer | Ajv2020 compile + valid/invalid fixture cases |
| Matching-rule unit tests | Developer | FAIL-then-PASS transcript for the 12 cases in IMP-35-03 |
| Depth/breaker unit tests | Developer | FAIL-then-PASS transcript, cases 2–7 above |
| Full regression | Developer | `npm test`, `npm run validate:contracts`, `npm run validate:project-state`, `git diff --check` |
| Phase A acceptance | QA Agent | Independent recheck of the AC-A1..A6 matrix above against this PR's exact commit |
| Phase B security/AC review | Security Reviewer + QA Agent | Deferred to the Phase B follow-up task |

## Risks and Rollback

| Risk | Mitigation / rollback |
|---|---|
| Input 1 resolved from committed `HANDOFF-*.md` instead of live PR/Issue fetch diverges from SDD's literal wording | Documented explicitly above as a scoped judgment call; substantive rule and trigger/token posture unchanged; routed to SA/QA for confirmation rather than decided silently. |
| `dispatch_depth`/breaker logic has an off-by-one or ordering bug | Full FAIL-then-PASS unit coverage before wiring into CI; CI failure is fail-closed (missing/invalid receipt blocks merge), not fail-open. |
| Scope creep into Phase B during this pass | Explicitly out of scope per this plan's Scope Boundary section; any Phase B code found in this PR's diff should be treated as a Scope Discipline violation and reverted before merge. |

## Handoff

| From | To | Condition |
|---|---|---|
| SA Agent | Developer Agent | SDD approved, Security PASS (design stage) available. |
| Developer Agent | QA Agent | Phase A implementation complete, full validation passing, this PR's exact commit available. |
| Developer Agent | Security Reviewer | Only required again for the separate Phase B follow-up (live Actions trigger, new token scope). |
| QA Agent | Human Maintainer | Phase A AC matrix passes; Phase B follow-up task opened. |
