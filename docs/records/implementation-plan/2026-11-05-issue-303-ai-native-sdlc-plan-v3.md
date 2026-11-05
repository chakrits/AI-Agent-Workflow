# Implementation Plan v3 — Issue #303 (End-to-End AI-Native SDLC Integration)

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | [Issue #303](https://github.com/chakrits/AI-Agent-Workflow/issues/303) |
| Change Type | `Framework / Meta Change` (Slices 1–4) + `Code Behavior Enhancement` (Slice 1 in `scripts/validate-contracts.mjs`; Slice 3 in `scripts/validate-metrics.mjs`) |
| Risk Level | `Medium` |
| Accountable Owners | Orchestrator Agent (coordination) · SA / Documentation Agent + Developer Agent (Slice 1 TDD) · Documentation Agent (Slices 2, 4) · Developer Agent (Slice 3 TDD) · Security Reviewer (Slice 1 gate-bypass review) · Independent Code Reviewer / QA Agent (verification per slice) |
| Target Branch | `feat/issue-303-ai-native-sdlc-playbook` (base: `origin/main` at `863306a9e3268f32d416ad76f5a783746b49ea4f`) |
| Supersedes | [`docs/records/implementation-plan/2026-11-05-issue-303-ai-native-sdlc-plan-v2.md`](./2026-11-05-issue-303-ai-native-sdlc-plan-v2.md) |
| Delivery Topology | **Stacked PRs (1 PR per Slice: PR-1 → PR-2 → PR-3 → PR-4)** so each `.mjs`-touching slice carries its own dedicated `docs/records/qa/*-code-review.md` and bounded diff |
| Execution Gate | **Blocked pending Human Maintainer policy approval & `status:spec-ready`** per `docs/workflow/dynamic-routing.md#specification-readiness` |

---

## 2. Inputs Reviewed

| Artifact | Status | Notes |
|---|---|---|
| Executive Specification v3 | Available | [`docs/records/sdd/2026-11-05-issue-303-rebuttal-and-executive-spec-v3.md`](../sdd/2026-11-05-issue-303-rebuttal-and-executive-spec-v3.md) |
| Round-1 & Round-2 Review Records | Available | [Comment `#6650818869`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6650818869) and [Re-Review Comment `#6651546438`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6651546438) (`RR-01`–`RR-05`, Section 4, Section 10) |
| External Primary Source | Available | [*The AI-native SDLC playbook* — Louis Claxton, Anthropic (2026-08-21)](https://claude.com/resources/articles/the-ai-native-sdlc-playbook) |
| Canonical Contracts & Validators | Available | `AGENTS.md`, `docs/workflow/dynamic-routing.md`, `docs/workflows/new-feature.md`, `docs/contracts/new-feature-workflow.yaml`, `scripts/validate-contracts.mjs`, `scripts/validate-metrics.mjs`, `scripts/validate-review-gate.mjs`, `scripts/archive-work-item.mjs` |
| Existing Framework Roadmap | Available | `ROADMAP-SDLC-FRAMEWORK.md` (Issue #298 Milestones `M0`–`M5`) |

---

## 3. Affected Areas, Slice Dependencies & Change-Sizing Strategy

Per `AGENTS.md` Core Operating Principle 10 (*Change Sizing*: ~100–300 lines per reviewable slice), delivery is structured into **4 stacked PR slices** with explicit semantic dependencies:

- **Semantic Dependency Order**:
  - `Slice 1` defines `docs/templates/INTENT.md` and `SPEC.md` and hardens contract validation; **`Slice 1` is a semantic prerequisite for `Slice 3`** (which renders drafts conforming to `INTENT.md`).
  - `Slice 2` (4-surface review policy & reference 5-nit cap) has zero file or semantic coupling to `Slice 1` or `Slice 3`.
  - `Slice 4` (`ROADMAP-SDLC-FRAMEWORK.md`) summarizes the approved adoption across Slices 1–3 and lands last.

| Slice | Scope & Reviewer Route | Exact Write-Set | Est. Changed Lines |
|---|---|---|---|
| **Slice 1 (PR-1)** | **Compressed Templates, Cross-Field Contract Parity Engine (TDD), Low-Risk `new-feature` Branch & Parallel Worktree Matrix**<br>Route: `SA / Developer / Documentation Agent → Security Reviewer (gate-eligibility check) + Independent Code Reviewer / QA → Human Approval` | - `[NEW]` `docs/templates/INTENT.md`<br>- `[NEW]` `docs/templates/SPEC.md`<br>- `[MODIFY]` `test/validate-contracts.test.mjs` (Red first)<br>- `[MODIFY]` `scripts/validate-contracts.mjs` (Green: parity + multi-branch)<br>- `[MODIFY]` `docs/contracts/new-feature-workflow.yaml`<br>- `[MODIFY]` `docs/workflows/new-feature.md`<br>- `[MODIFY]` `docs/workflow/dynamic-routing.md`<br>- `[MODIFY]` `DECISIONS.md` (ADR)<br>- `[GENERATED]` `test/fixtures/context-pack-v1/required-source-matrix.json` (deterministic repin because `new-feature-workflow.yaml` is pinned)<br>- `[NEW]` `docs/records/qa/<date>-issue-303-slice-1-contracts-code-review.md` | ~240 lines |
| **Slice 2 (PR-2)** | **Multi-Surface 3-Pass Review Policy & Reference 5-Nit Cap**<br>Route: `Documentation Agent → Independent QA/Reviewer → Human Approval` | - `[MODIFY]` `docs/workflows/code-review-gate.md`<br>- `[MODIFY]` `docs/templates/CODE_REVIEW_FINDINGS.md`<br>- `[MODIFY]` `docs/templates/TASK_REVIEW.md`<br>- `[MODIFY]` `.agents/skills/code-review-gate/SKILL.md` | ~120 lines |
| **Slice 3 (PR-3)** | **Structured Cohort Evaluator (`dispatch_ledger_expiry_rate` & `verified_rework_rate`) & Dual-Digest `--emit-intent` CLI (TDD)**<br>Prerequisite: `Slice 1`<br>Route: `Developer Agent (TDD) → Independent Code Reviewer + Independent QA (with static-logic-review) → Human Approval` | - `[MODIFY]` `test/validate-metrics.test.mjs` (Red first)<br>- `[MODIFY]` `scripts/validate-metrics.mjs` (Green)<br>- `[MODIFY]` `docs/operating-model/METRICS.md`<br>- `[NEW]` `docs/records/qa/<date>-issue-303-slice-3-metrics-code-review.md` | ~260 lines |
| **Slice 4 (PR-4)** | **6-Stage SDLC Roadmap Alignment & 5-Layer Hook Enforcement Boundary Matrix**<br>Prerequisites: `Slices 1–3` scope<br>Route: `Documentation Agent → Independent Reviewer → Human Approval` | - `[MODIFY]` `ROADMAP-SDLC-FRAMEWORK.md` | ~95 lines |

---

## 4. Detailed Task Breakdown

| Task ID | Slice | Task Description | Agent / Owner | Files | Verification Command |
|---|---|---|---|---|---|
| **IMP-303-01** | Slice 1 | Author `docs/templates/INTENT.md` (including Dual-Digest Advisory Header fields for Stage-06 compatibility) and `docs/templates/SPEC.md` (with strict `api_contract_impact: "none"` rule and Canonical Equivalence Mapping to `REQUIREMENT_DISCOVERY.md` / `SDD.md`), keeping all 34 existing templates intact. | `documentation-agent` | `docs/templates/INTENT.md`, `docs/templates/SPEC.md` | `git diff --check` |
| **IMP-303-02** | Slice 1 | **TDD Red Phase (Contracts)**: Add failing tests (`TC-001`–`TC-003`) in `test/validate-contracts.test.mjs` covering: full end-to-end low-risk fast-track (`intake -> ... -> release`), cross-field `high/low` & `low/high` & missing `evidence.risk_level` rejections, `config-change` `risk_tier` parity rejection, `low`-risk with `authz` / `additive-endpoint` / `schema-migration` rejections, and preservation of all 10 standard examples. | `developer-agent` | `test/validate-contracts.test.mjs` | `node --test test/validate-contracts.test.mjs` *(expected Red)* |
| **IMP-303-03** | Slice 1 | **TDD Green Phase (Contracts)**: Implement `validateTopLevelEvidenceParity()`, dual-level `validateWhenClause()`, and multi-branch `(from, to)` transition support in `scripts/validate-contracts.mjs`; add `discovery -> planning` and `planning -> implementing` low-risk branches in `docs/contracts/new-feature-workflow.yaml`; sync `docs/workflows/new-feature.md` Required Outputs & Gate Rules. | `developer-agent` / `sa-agent` | `scripts/validate-contracts.mjs`, `docs/contracts/new-feature-workflow.yaml`, `docs/workflows/new-feature.md` | `node --test test/validate-contracts.test.mjs && npm run validate:contracts` |
| **IMP-303-04** | Slice 1 | Update `docs/workflow/dynamic-routing.md` with the 6-Gate Eligibility Matrix (explicitly separating Machine-Enforced vs. Reviewer/Human-Enforced checks and excluding Additive APIs from fast-track) and the Parallel Worktrees vs. Scoped Subagents table (`G-04`); record ADR in `DECISIONS.md`; run `npm run repin:source-matrix`. | `documentation-agent` / `sa-agent` | `docs/workflow/dynamic-routing.md`, `DECISIONS.md`, `test/fixtures/context-pack-v1/required-source-matrix.json` | `npm run repin:source-matrix && npm run validate:context-budget && npm run validate:context-compatibility && npm run adr:audit` |
| **IMP-303-05** | Slice 1 | Run bounded `security-reviewer` gate-bypass audit + independent `code-reviewer` review over Slice 1's pinned `base_sha..head_sha` (`.mjs` + YAML + routing policy) and commit `docs/records/qa/<date>-issue-303-slice-1-contracts-code-review.md` (`TC-012`). | `security-reviewer` + `code-reviewer` (distinct identities) | `docs/records/qa/<date>-issue-303-slice-1-contracts-code-review.md` | `npm run validate:review-gate` |
| **IMP-303-06** | Slice 2 | Align all 4 review surfaces (`code-review-gate.md`, `CODE_REVIEW_FINDINGS.md`, `TASK_REVIEW.md`, `code-review-gate/SKILL.md`) with 3 Passes (`Bugs`, `Security`, `Compliance`), 3 Decision Tiers, reference parameter `Nit Cap = 5` per review round with suppressed-count summary, Anti-Downgrade Rule, and Scoped Re-review preservation (`TC-013`). | `documentation-agent` | `docs/workflows/code-review-gate.md`, `docs/templates/CODE_REVIEW_FINDINGS.md`, `docs/templates/TASK_REVIEW.md`, `.agents/skills/code-review-gate/SKILL.md` | `npm run validate:context-budget && git diff --check` |
| **IMP-303-07** | Slice 3 | **TDD Red Phase (Metrics & CLI)**: Add failing unit, BVA, cohort, integrity, and Dual-Digest CLI tests (`TC-004`–`TC-010`) in `test/validate-metrics.test.mjs` covering: default output & clean `stderr`, `dispatch_ledger_expiry_rate` (`closedReceipts` only, excluding open `registered`), `verified_rework_rate` (`evaluatedItems` cohort immune to `intake` dilution), `DIGEST_INTEGRITY_MISMATCH` & `ARCHIVE_LOCATION_AMBIGUOUS` (`exit 2`), unrounded `>= 0.10` / `>= 0.15` BVA, mixed `BREACH_DETECTED` + `INSUFFICIENT_DATA`, `REJECT_HUMAN_MODIFIED` (`exit 2` when body edited under same `Intent-Fingerprint`), `NO_OP_UNCHANGED_ANOMALY` across moved `HEAD`, `REJECT_FINGERPRINT_CHANGED`, `--force` atomic overwrite, and `wx` exclusive create. | `developer-agent` | `test/validate-metrics.test.mjs` | `node --test test/validate-metrics.test.mjs` *(expected Red)* |
| **IMP-303-08** | Slice 3 | **TDD Green & Refactor Phase (Metrics & CLI)**: Implement structured collectors, closed schema registry (`Ajv2020` compiled once with `validateFormats: false` + `digestTaskEnvelope`), cohort evaluator, RFC 8785 JCS `Intent-Fingerprint` + `Draft-Content-SHA256` Dual-Digest engine, and `wx` / `atomicWriteFileSync` file writer in `scripts/validate-metrics.mjs`; document formulas, namespace boundaries, and CLI contract in `docs/operating-model/METRICS.md`. | `developer-agent` | `scripts/validate-metrics.mjs`, `docs/operating-model/METRICS.md` | `node --test test/validate-metrics.test.mjs && node scripts/validate-metrics.mjs` |
| **IMP-303-09** | Slice 3 | Run independent Code Review Gate + QA `static-logic-review` on Slice 3's threshold, cohort, and Dual-Digest branching logic; commit `docs/records/qa/<date>-issue-303-slice-3-metrics-code-review.md` (`TC-014`). | `code-reviewer` + `qa-agent` (distinct identities) | `docs/records/qa/<date>-issue-303-slice-3-metrics-code-review.md` | `npm run validate:review-gate` |
| **IMP-303-10** | Slice 4 | Update `ROADMAP-SDLC-FRAMEWORK.md` with the 6-Stage Primary-Source Adoption Matrix, the accurate 5-Layer Hook Enforcement Boundary table (JSON stdout `permissionDecision: "deny"` + `ADR-0024 D1`), and explicit M3/M4 placement for Live Behavioral Evals and Runtime Dispatch Outcome Producer / Control-Band Automation; run full regression suite (`TC-015`). | `documentation-agent` | `ROADMAP-SDLC-FRAMEWORK.md` | `npm run validate:clearable-refs && npm run validate:root-doc-links && npm test` |

---

## 5. Test & Review Gate Strategy

| Verification Layer | Required? | Scope | Accountable Verifier |
|---|---|---|---|
| State-Machine & Parity Unit Tests | **Yes** | `TC-001`–`TC-003`: Cross-field parity (`risk_level`, `risk_tier`, `contains_pii`, `data_change_kind`), multi-branch `(from, to)`, E-1..E-4 `when` rejections (including Additive API), 10 baseline examples | `developer-agent` + `qa-agent` |
| Behavioral Security Review | **Yes (Slice 1)** | Verify Slice 1's fast-track conditions in `new-feature-workflow.yaml` and `validate-contracts.mjs` fail closed on any security/API/data impact and cannot weaken `Security Gate` | `security-reviewer` |
| Structured Cohort, Integrity & Dual-Digest CLI Tests | **Yes** | `TC-004`–`TC-010`: Namespace separation (`RR-02`), `evaluatedItems` cohort (`RR-03`), `state_digest` & `ARCHIVE_LOCATION_AMBIGUOUS` (`exit 2`), Dual-Digest human-edit protection (`RR-05`), `wx` / atomic write | `developer-agent` + `qa-agent` |
| Independent Code Review Gate (`validate:review-gate`) | **Yes (Slice 1 & Slice 3)** | Both `.mjs`-touching slices carry dedicated `docs/records/qa/*-code-review.md` records pinned to `base_sha..head_sha` *(noting honestly that `validate-review-gate.mjs` checks file path presence while PR/orchestration audit verifies independent identity and full file coverage)* | `code-reviewer` / `qa-agent` (independent identity) |
| QA Static Logic Review | **Yes (Slice 1 & Slice 3)** | Source-level branch trace on `validate-contracts.mjs` parity/branch selection and `validate-metrics.mjs` precedence/Dual-Digest matrix | `qa-agent` |
| Full Repository Regression & Hygiene | **Yes (Every Slice)** | `TC-011`, `TC-013`, `TC-015`: `801+` baseline tests + all scoped & core validators | `qa-agent` |

---

## 6. Verification Commands

```bash
# 1. Slice 1 — Contract validator parity, multi-branch fast-track, source-matrix repin, ADR & review gate
node --test test/validate-contracts.test.mjs
npm run validate:contracts
npm run repin:source-matrix
npm run validate:context-compatibility
npm run validate:context-budget
npm run adr:audit
npm run validate:review-gate

# 2. Slice 2 — 4-surface review policy & context budget
npm run validate:context-budget
git diff --check

# 3. Slice 3 — Structured cohort metrics, Dual-Digest CLI & review gate
node --test test/validate-metrics.test.mjs
node scripts/validate-metrics.mjs
npm run validate:review-gate

# 4. Slice 4 & Full Repository Gate Suite
npm run validate:clearable-refs
npm run validate:root-doc-links
npm run validate:ci-parity
npm run validate:project-state
npm test
git diff --check
```

---

## 7. Rollback / Fallback Plan (Dependency-Aware)

| Scenario | Safe Rollback Action & Order | Blast Radius & Notes |
|---|---|---|
| **Slice 4** (`ROADMAP-SDLC-FRAMEWORK.md`) needs rollback | `git revert <slice-4-commit>` | Zero runtime/contract impact; completely independent leaf slice. |
| **Slice 2** (4 review policy/template files) needs rollback or Nit-cap tuning | `git revert <slice-2-commit>` or adjust reference cap parameter in docs | Independent of Slices 1 and 3; touches no `.mjs` scripts or JSON schemas. |
| **Slice 3** (`validate-metrics.mjs` + `METRICS.md`) defect discovered post-merge | `git revert <slice-3-commit>` and run `npm test` | Default `npm run validate:metrics` has no automatic CI merge-gate caller; `npm test` runs `test/validate-metrics.test.mjs`, so reverting Slice 3 cleanly restores the baseline test suite while leaving Slice 1 intact. |
| **Slice 1** (`validate-contracts.mjs` + `new-feature-workflow.yaml` + `INTENT.md`/`SPEC.md`) needs rollback | **If Slice 3 is already merged, revert in reverse dependency order (`Slice 3` → `Slice 1`)** (or retain `docs/templates/INTENT.md`), then run `npm run repin:source-matrix && npm test` | Respects the semantic dependency of `--emit-intent` on `INTENT.md` and keeps `required-source-matrix.json` SHA-256 hashes synchronized. |

---

## 8. Risks & Blockers

| ID | Risk / Blocker | Impact | Mitigation |
|---|---|---|---|
| **R-303-01 (Active Gate Blocker)** | Core policy, contract, and CLI behavior changes require Human Maintainer sign-off before `status:spec-ready`. | Cannot begin Slice 1–4 mutations autonomously. | Present Spec v3 + Plan v3 with full empirical probe evidence on Issue #303 and stop cleanly at Human Approval Gate. |
| **R-303-02** | Operators could confuse `dispatch_ledger_expiry_rate` (14d bookkeeping TTL) with live subagent runtime timeout rate. | Misdiagnosis of operational causes. | Metric is explicitly named `dispatch_ledger_expiry_rate` in CLI output, `METRICS.md`, and generated `INTENT.md` drafts; runtime timeout is explicitly labeled `UNAVAILABLE_IN_V1 (deferred to M4 / Issue #35)`. |
| **R-303-03** | Unstarted `intake` work items diluting rework rate or stale/duplicate archive shards corrupting counts. | False-healthy `WITHIN_TARGET` or double-counting. | Denominator restricted strictly to `evaluatedItems` (visited `reworkSourceStates`), `state_digest` verified, and `ARCHIVE_LOCATION_AMBIGUOUS` rejected with `exit 2`. |
| **R-303-04** | `Ajv2020({ strict: false })` emitting `unknown format "date-time"` warnings to `stderr` when validating `durable-task-envelope.schema.json`. | Pollutes CLI `stderr` on clean threshold checks. | Caught during v3 prototyping: compile `durable-task-envelope.schema.json` once with `validateFormats: false` + explicit RFC 3339 check and `digestTaskEnvelope()` verification. |
| **R-303-05** | Canonical Tier 3 context budget headroom (`25,842 / 30,000` approx tokens at `863306a`; `4,158` headroom). | Verbose prose in `dynamic-routing.md` could erode budget. | Keep `dynamic-routing.md` additions concise (`<= 450` approx tokens) and enforce `npm run validate:context-budget` in Slice 1 & Slice 2. |

---

## 9. Completion Contract & Next Handoff

- **Done when (for current Round-2 re-review response turn)**:
  1. Every finding and note in Comment `#6651546438` (`RR-01`–`RR-05`, Section 4, Section 10) plus proactively discovered downstream contract seams (`planning -> implementing` gate, `Map` collision, `new-feature.md` sync, Ajv `stderr` warning) are resolved with reproducible Node.js probe evidence in Spec v3 and Plan v3.
  2. `docs/records/sdd/2026-11-05-issue-303-rebuttal-and-executive-spec-v3.md` and `docs/records/implementation-plan/2026-11-05-issue-303-ai-native-sdlc-plan-v3.md` pass all applicable validators, are committed cleanly, and are pushed to `origin/feat/issue-303-ai-native-sdlc-playbook`.
  3. Structured Thai response and updated v3 Issue summary are posted on GitHub Issue #303.
- **May proceed through**: Writing, validating, committing, and pushing `docs/records/` v3 artifacts and posting the requested Issue #303 reply.
- **Must stop for**: Human Maintainer policy approval (Spec v3 Section 7) and `status:spec-ready` before modifying core policy, contracts, templates, or runtime scripts.
- **Assumptions**: None silent; all three policy thresholds/parameters (`low`-risk non-API fast-track, reference `Nit Cap = 5`, and `dispatch_ledger_expiry_rate >= 10%` / `verified_rework_rate >= 15%` with `min-samples = 5`) are explicitly surfaced for Maintainer decision.

| To | Next Action | Reason | Required Evidence |
|---|---|---|---|
| **Human Maintainer** | `Human review` (`Dispatch State: blocked`, `Stop Reason: human_review_required`) | Review & approve Executive Spec v3 + Plan v3 (closing `RR-01`–`RR-05`) and grant `status:spec-ready` to start Slice 1 | Committed Spec v3 + Plan v3 on `origin/feat/issue-303-ai-native-sdlc-playbook` and Round-2 Response Comment on Issue #303 |
