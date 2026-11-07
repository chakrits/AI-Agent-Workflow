# Implementation Plan v2 — Issue #303 (AI-Native SDLC Playbook Integration)

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | [Issue #303](https://github.com/chakrits/AI-Agent-Workflow/issues/303) |
| Change Type | `Framework / Meta Change` (Slices 1, 2, 4) + `Code Behavior Enhancement` (Slice 3) |
| Risk Level | `Medium` |
| Owner | Orchestrator Agent (coordination) · Documentation / SA Agent (Slices 1, 2, 4) · Developer Agent (Slice 3 TDD) · Independent QA / Reviewer Agent (verification) |
| Target Branch / Ticket | `feat/issue-303-ai-native-sdlc-playbook` (base: `origin/main` at `863306a9e3268f32d416ad76f5a783746b49ea4f`) |
| Execution Gate | **Blocked pending Human Maintainer policy approval & `status:spec-ready`** per `docs/workflow/dynamic-routing.md#specification-readiness` |

---

## 2. Inputs Reviewed

| Artifact | Status | Notes |
|---|---|---|
| Forensic Rebuttal & Executive Spec v2 | Available | [`docs/records/sdd/2026-11-05-issue-303-rebuttal-and-executive-spec-v2.md`](../sdd/2026-11-05-issue-303-rebuttal-and-executive-spec-v2.md) |
| Review Feedback Record | Available | [Issue #303 Comment `#6650818869`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6650818869) (`F-01`–`F-06`, `9.1`–`9.4`) |
| External Primary Source | Available | [*The AI-native SDLC playbook* — Louis Claxton, Anthropic (2026-08-21)](https://claude.com/resources/articles/the-ai-native-sdlc-playbook) |
| Canonical Routing & Contracts | Available | `AGENTS.md`, `docs/workflow/core-bootloader.md`, `docs/workflow/dynamic-routing.md`, `docs/workflows/stabilize-core.md`, `docs/contracts/new-feature-workflow.yaml` |
| Existing Roadmap Baseline | Available | `ROADMAP-SDLC-FRAMEWORK.md` (Issue #298 Milestones `M0`–`M5`) |

---

## 3. Affected Areas & Change-Sizing Strategy

Following `AGENTS.md` Core Operating Principle 10 (*Change Sizing*: target ~100–300 lines per logical slice, split by file group and reviewer authority), implementation is decomposed into **4 sequential/independent reviewable slices** with disjoint write-sets:

| Slice | Scope & Reviewer Route | Files / Components | Est. Changed Lines |
|---|---|---|---|
| **Slice 1** | **Compressed Artifact Chain, Eligibility Rules, Contract Fast-Track & Parallel Worktree Matrix**<br>Route: `SA / Documentation Agent → Independent QA/Reviewer → Human Approval` | - `[NEW]` `docs/templates/INTENT.md`<br>- `[NEW]` `docs/templates/SPEC.md`<br>- `[MODIFY]` `docs/workflow/dynamic-routing.md`<br>- `[MODIFY]` `docs/contracts/new-feature-workflow.yaml`<br>- `[MODIFY]` `test/validate-contracts.test.mjs`<br>- `[MODIFY]` `DECISIONS.md` (ADR)<br>- `[GENERATED]` `test/fixtures/context-pack-v1/required-source-matrix.json` (if pinned source changes) | ~180 lines |
| **Slice 2** | **Multi-Surface Tiered Review Policy & 5-Nit Cap**<br>Route: `Documentation Agent → Independent QA/Reviewer → Human Approval` | - `[MODIFY]` `docs/workflows/code-review-gate.md`<br>- `[MODIFY]` `docs/templates/CODE_REVIEW_FINDINGS.md`<br>- `[MODIFY]` `docs/templates/TASK_REVIEW.md`<br>- `[MODIFY]` `.agents/skills/code-review-gate/SKILL.md` | ~120 lines |
| **Slice 3** | **Structured-Evidence Threshold Evaluator & Safe Intent Draft CLI (TDD)**<br>Route: `Developer Agent (TDD) → Independent Code Review Gate → Independent QA → Human Approval` *(never routed as docs-only)* | - `[MODIFY]` `test/validate-metrics.test.mjs` (Red first)<br>- `[MODIFY]` `scripts/validate-metrics.mjs` (Green)<br>- `[MODIFY]` `docs/operating-model/METRICS.md`<br>- `[NEW]` `docs/records/qa/<date>-issue-303-metrics-intent-code-review.md` | ~230 lines |
| **Slice 4** | **SDLC Framework Roadmap Alignment & Enforcement Boundary Matrix**<br>Route: `Documentation Agent → Independent Reviewer → Human Approval` | - `[MODIFY]` `ROADMAP-SDLC-FRAMEWORK.md` | ~90 lines |

---

## 4. Detailed Task Breakdown

| Task ID | Slice | Task Description | Agent / Owner | Files | Verification Command |
|---|---|---|---|---|---|
| **IMP-303-01** | Slice 1 | Author `INTENT.md` and `SPEC.md` templates with Canonical Equivalence Mapping to `REQUIREMENT_DISCOVERY.md` / `SDD.md` and Source-of-Truth Commit-SHA linkage while retaining all 34 existing templates. | `documentation-agent` | `docs/templates/INTENT.md`, `docs/templates/SPEC.md` | `git diff --check` |
| **IMP-303-02** | Slice 1 | Write failing contract tests (`TC-008`) first, then add conditional `discovery -> planning` transition (`when: { risk_level: low }`, requiring `compressed_spec_reference`) in `docs/contracts/new-feature-workflow.yaml`; verify `medium`/`high` risk fast-track attempts fail closed. | `developer-agent` / `sa-agent` | `test/validate-contracts.test.mjs`, `docs/contracts/new-feature-workflow.yaml` | `node --test test/validate-contracts.test.mjs && npm run validate:contracts` |
| **IMP-303-03** | Slice 1 | Update `docs/workflow/dynamic-routing.md` with the 6-Gate Compressed Eligibility & Exit Matrix and the Parallel Worktree Sessions vs. In-Session Scoped Subagents table (`G-04`); record ADR in `DECISIONS.md`; repin source matrix if applicable. | `documentation-agent` | `docs/workflow/dynamic-routing.md`, `DECISIONS.md`, `test/fixtures/context-pack-v1/required-source-matrix.json` | `npm run repin:source-matrix && npm run validate:context-budget && npm run validate:context-compatibility && npm run adr:audit` |
| **IMP-303-04** | Slice 2 | Align all 4 review surfaces (`code-review-gate.md`, `CODE_REVIEW_FINDINGS.md`, `TASK_REVIEW.md`, `code-review-gate/SKILL.md`) with 3 Mandatory Passes (`Bugs`, `Security`, `Compliance`), 3 Decision Tiers (`Blocking`, `Human Judgment [Blocks until Human Gate]`, `Non-blocking Nit`), Anti-Downgrade Rule, `Nit Cap = 5` per round with suppressed-count summary, and preserved Scoped Re-review rules (`TC-010`). | `documentation-agent` | `docs/workflows/code-review-gate.md`, `docs/templates/CODE_REVIEW_FINDINGS.md`, `docs/templates/TASK_REVIEW.md`, `.agents/skills/code-review-gate/SKILL.md` | `npm run validate:context-budget && git diff --check` |
| **IMP-303-05** | Slice 3 | **TDD Red Phase**: Add unit and CLI integration tests (`TC-001`–`TC-007`) in `test/validate-metrics.test.mjs` covering default output compatibility, structured-evidence parsing (`dispatch-receipts`, `workflow-evidence/v1`, `task-state.json`), negation immunity, `INSUFFICIENT_DATA` (`n < 5`), exact unrounded `>= 0.10` / `>= 0.15` boundaries, idempotency fingerprint, `EEXIST` overwrite protection, `--force`, and invalid CLI flags (`exit 2`). Confirm tests fail before implementation. | `developer-agent` | `test/validate-metrics.test.mjs` | `node --test test/validate-metrics.test.mjs` *(expected Red before IMP-303-06)* |
| **IMP-303-06** | Slice 3 | **TDD Green & Refactor Phase**: Implement `collectStructuredMetrics()`, `evaluateThresholds()`, `generateIntentDraft()`, and CLI flag parser in `scripts/validate-metrics.mjs`; update `docs/operating-model/METRICS.md` with formula, data-authority tiers, and CLI reference. | `developer-agent` | `scripts/validate-metrics.mjs`, `docs/operating-model/METRICS.md` | `node --test test/validate-metrics.test.mjs && node scripts/validate-metrics.mjs` |
| **IMP-303-07** | Slice 3 | Run independent Code Review Gate on Slice 3 `.mjs` changes and record structured review artifact under `docs/records/qa/` to satisfy `scripts/validate-review-gate.mjs` (`TC-011`). | `code-reviewer` / `qa-agent` (independent identity) | `docs/records/qa/<date>-issue-303-metrics-intent-code-review.md` | `npm run validate:review-gate` |
| **IMP-303-08** | Slice 4 | Update `ROADMAP-SDLC-FRAMEWORK.md` with the 6-Stage Primary-Source Adoption Matrix, the 5-Layer Hook Enforcement Boundary table, and explicit M3/M4 placement for Live LLM Behavioral Evals and Cross-Turn Control-Band Automation; run full verification suite (`TC-012`). | `documentation-agent` | `ROADMAP-SDLC-FRAMEWORK.md` | `npm run validate:root-doc-links && npm test` |

---

## 5. Test Strategy

| Test Type | Required? | Scope | Owner |
|---|---|---|---|
| Unit & BVA Test | **Yes** | `TC-001`–`TC-003`: Structured metrics calculation, negation immunity, `INSUFFICIENT_DATA` vs `0%`, unrounded `>= 0.10` / `>= 0.15` boundary values | `developer-agent` |
| CLI Integration Test | **Yes** | `TC-004`–`TC-007`: Exit codes (`0`, `1`, `2`), file creation, multi-breach consolidation, `Intent-Fingerprint` idempotency, `EEXIST` guard, `--force`, malformed inputs | `developer-agent` + `qa-agent` |
| State-Machine Contract Test | **Yes** | `TC-008`: `new-feature-workflow.yaml` `when: { risk_level: low }` fast-track pass vs `medium`/`high` risk fail-closed rejection | `developer-agent` + `qa-agent` |
| Policy & Static Logic Review | **Yes** | `TC-009`–`TC-011`: 6-Gate Eligibility Matrix, 4-surface review consistency, ADR audit, Context Budget, `validate:review-gate`, and QA `static-logic-review` on threshold/CLI branching | `qa-agent` (independent) |
| Full Regression Suite | **Yes** | `TC-012`: All `801+` repository tests + scoped & core validators | `qa-agent` |
| Security Review | **Conditional** | Trigger `security-reviewer` only if any edit touches `.claude/settings.json`, `.githooks/`, or security gate rules (none planned in Slices 1–4) | `security-reviewer` |

---

## 6. Verification Commands

```bash
# 1. Targeted unit, BVA, and CLI integration tests for Slice 3
node --test test/validate-metrics.test.mjs

# 2. Contract & state-machine verification for Slice 1
node --test test/validate-contracts.test.mjs
npm run validate:contracts

# 3. Context budget, source-matrix compatibility, ADR, and link checks
npm run validate:context-budget
npm run validate:context-compatibility
npm run adr:audit
npm run validate:root-doc-links

# 4. Review gate, CI parity, clearable refs, and project state checks
npm run validate:review-gate
npm run validate:clearable-refs
npm run validate:ci-parity
npm run validate:project-state

# 5. Full repository regression suite (baseline: 801 passing tests across 52 files at 863306a) + diff hygiene
npm test
git diff --check
```

---

## 7. Rollback / Fallback Plan

| Scenario | Rollback / Fallback Action | Owner |
|---|---|---|
| Slice 1 contract or routing update causes unintended source-matrix or budget drift | `git revert <slice-1-commit>` and run `npm run repin:source-matrix && npm test`; all 34 original templates remain untouched throughout. | `developer-agent` / `documentation-agent` |
| Slice 2 Nitpick Cap (`5`) proves too tight or too loose during pilot | Adjust cap parameter in `docs/workflows/code-review-gate.md` + templates via single docs PR without affecting runtime scripts or CI gates. | `documentation-agent` + Human Maintainer |
| Slice 3 CLI flag defect discovered post-merge | `git revert <slice-3-commit>`; default `npm run validate:metrics` has zero automatic CI callers (removed from merge lane in Issue #298 / PR #299), so rollback has zero pipeline blast radius. | `developer-agent` |

---

## 8. Risks / Blockers

| Risk / Blocker | Impact | Mitigation / Next Action |
|---|---|---|
| **R-303-01 (Current Gate Blocker)**: Policy changes to `dynamic-routing.md`, `new-feature-workflow.yaml`, review policy, and CLI contract require Human Maintainer approval before implementation. | Cannot transition to `status:spec-ready` or `phase:development` autonomously. | Present Executive Spec v2 + Plan v2 on Issue #303 and stop cleanly at Human Approval Gate (`core-bootloader.md:24`). |
| **R-303-02**: Freshly reset repositories have `0` structured dispatch/state records, risking misinterpretation of `0%` rates. | Operators might mistake absence of data for healthy `0%` rework/timeout. | Enforced `INSUFFICIENT_DATA` status whenever `denominator < minSamples` (default `5`), suppressing false-healthy claims and empty draft generation. |
| **R-303-03**: Canonical Tier 3 token headroom (`25,842 / 30,000` approx tokens at `863306a`; `4,158` headroom). | Verbose additions to `dynamic-routing.md` could consume unnecessary budget. | Keep `dynamic-routing.md` additions concise (`<= 450` approx tokens, `< 11%` of available headroom) and verify via `npm run validate:context-budget`. |
| **R-303-04**: Reviewer persona switching in a single agent session does not satisfy Independent Verification (`dynamic-routing.md:33`). | Slice 3 `.mjs` code review or QA verification would violate role separation if self-approved. | Dispatch a distinct subagent identity (`code-reviewer` / `qa-agent`) pinned to `base_sha..head_sha` for independent verification. |

---

## 9. Completion Contract & Next Handoff

- **Done when (for current planning/rebuttal turn)**:
  1. Every finding in Issue #303 Comment `#6650818869` (`F-01`–`F-06`, `9.1`–`9.4`) is verified against commit `863306a` and the primary Anthropic article, with reproducible counter-evidence where claims were inaccurate and complete architectural/contract revisions where critiques were valid.
  2. `docs/records/sdd/2026-11-05-issue-303-rebuttal-and-executive-spec-v2.md` and `docs/records/implementation-plan/2026-11-05-issue-303-ai-native-sdlc-plan-v2.md` are committed, validated cleanly (`git diff --check`, validators green), and pushed to `origin/feat/issue-303-ai-native-sdlc-playbook`.
  3. Evidence-backed rebuttal and Executive Proposal v2 are posted to GitHub Issue #303.
- **May proceed through**: Authoring, validating, committing, and pushing planning/specification records under `docs/records/` and posting the Issue #303 response requested by the user.
- **Must stop for**: Human Maintainer approval of the 3 policy decisions in Executive Spec v2 Section 7 and `status:spec-ready` label transition before modifying core policy (`dynamic-routing.md`, `new-feature-workflow.yaml`), templates, or `scripts/validate-metrics.mjs`.
- **Assumptions**: None silent; Nit cap default of `5` per review round and `min-samples` default of `5` are explicitly surfaced as proposed policy parameters in Spec v2 Section 7 for Human Maintainer confirmation.

| To | Next Action | Reason | Required Evidence |
|---|---|---|---|
| **Human Maintainer** | `Human review` (`Dispatch State: blocked`, `Stop Reason: human_review_required`) | Approve Spec v2 & Plan v2 policy decisions (`Compressed Eligibility + low-risk contract branch`, `5-Nit multi-surface policy`, `Structured Metrics CLI contract`) to grant `status:spec-ready` | Committed Spec v2 + Plan v2 on `origin/feat/issue-303-ai-native-sdlc-playbook` and Forensic Response on Issue #303 |
