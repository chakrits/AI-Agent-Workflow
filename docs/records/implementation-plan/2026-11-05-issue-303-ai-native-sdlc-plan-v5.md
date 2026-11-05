# Implementation Plan v5 — Issue #303 (End-to-End AI-Native SDLC Integration, Sunset Lifecycle/Rollback Hardening & Resilient I/O Failure Contracts)

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | [Issue #303](https://github.com/chakrits/AI-Agent-Workflow/issues/303) · [`docs/records/work-items/2026-11-05-issue-303.md`](../work-items/2026-11-05-issue-303.md) |
| Change Type | `Framework / Meta Change` (Slices 1–4, governed by `docs/workflows/stabilize-core.md`) + `Code Behavior Enhancement` (Slice 1 in `scripts/validate-contracts.mjs` & `docs/contracts/schemas/new-feature-state.schema.json`; Slice 3 in `scripts/validate-metrics.mjs`) |
| Risk Level | `Medium` |
| Accountable Owners | Orchestrator Agent (coordination & in-turn supervision) · SA / Documentation Agent + Developer Agent (Slice 1 TDD) · Documentation Agent (Slices 2, 4 & Closeout) · Developer Agent (Slice 3 TDD) · Security Reviewer (Slice 1 gate-bypass & escalation review) · Independent Code Reviewer / QA Agent (verification per slice) |
| Target Branch | `feat/issue-303-ai-native-sdlc-playbook` (base: `origin/main` at `863306a9e3268f32d416ad76f5a783746b49ea4f`) |
| Supersedes | [`docs/records/implementation-plan/2026-11-05-issue-303-ai-native-sdlc-plan-v4.md`](./2026-11-05-issue-303-ai-native-sdlc-plan-v4.md), [`docs/records/implementation-plan/2026-11-05-issue-303-ai-native-sdlc-plan-v3.md`](./2026-11-05-issue-303-ai-native-sdlc-plan-v3.md) and [`docs/records/implementation-plan/2026-11-05-issue-303-ai-native-sdlc-plan-v2.md`](./2026-11-05-issue-303-ai-native-sdlc-plan-v2.md) |
| Delivery Topology | **Stacked PRs (1 PR per Slice: `PR-1` → `PR-2` → `PR-3` → `PR-4`, followed by Post-Merge Closeout PR)** using `closing_action: advances-only` on `PR-1`–`PR-3` and `closing_action: closes` only on terminal `PR-4` |
| Task-Execution Mode | **Scoped**: Enabled for **Slice 1** and **Slice 3** (Medium-risk contract & decision-logic changes via `TASK_BRIEF.md` → `IMPLEMENTER_REPORT.md` → QA `TASK_REVIEW.md`, `task_review_rework_count <= 2`); bypassed for doc/template-only **Slice 2** and **Slice 4** per `docs/workflow/task-execution-mode.md:21` |
| Execution Gate | **Blocked (`phase:planning`) pending Human Maintainer policy approval & `status:spec-ready`** per `docs/workflow/dynamic-routing.md#specification-readiness` |

---

## 2. Inputs Reviewed

| Artifact | Status | Notes |
|---|---|---|
| Executive Specification v5 | Available | [`docs/records/sdd/2026-11-05-issue-303-rebuttal-and-executive-spec-v5.md`](../sdd/2026-11-05-issue-303-rebuttal-and-executive-spec-v5.md) |
| Work Item & Lessons Learned Records | Available | [`docs/records/work-items/2026-11-05-issue-303.md`](../work-items/2026-11-05-issue-303.md) · [`docs/records/lessons-learned/2026-11-05-issue-303-review-lessons.md`](../lessons-learned/2026-11-05-issue-303-review-lessons.md) |
| Review Feedback Records | Available | [Comment `#6650818869`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6650818869) (Round 1), [Comment `#6651546438`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6651546438) (Round 2), [Comment `#6653541297`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6653541297) (Round 3), and [Round-4 Comment `#6654686480`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6654686480) (`V4-01a`, `V4-01b`, `V4-02a`, `V4-02b`, `V4-02c`) |
| `/dynamic-workflow` & Core Policy Sources | Available | `AGENTS.md:67`, `docs/workflows/stabilize-core.md:18`, `docs/operating-model/METRICS.md:45`, `scripts/validate-contracts.mjs`, `scripts/lib/fenced-commit.mjs:50–85`, `scripts/validate-skill-parity.mjs:43–56` |
| External Primary Source | Available | [*The AI-native SDLC playbook* — Louis Claxton, Anthropic (2026-08-21)](https://claude.com/resources/articles/the-ai-native-sdlc-playbook) |
| Existing Framework Roadmap | Available | `ROADMAP-SDLC-FRAMEWORK.md` (Issue #298 Milestones `M0`–`M5`) |

---

## 3. Affected Areas, Slice Dependencies & Change-Sizing Strategy

Per `AGENTS.md` Core Operating Principle 10 (*Change Sizing*: ~100–300 lines per reviewable slice), delivery is structured into **4 stacked PR slices** with explicit semantic dependencies:

- **Semantic Dependency Order**:
  - `Slice 1` defines `docs/templates/INTENT.md` and `SPEC.md`, updates `docs/contracts/schemas/new-feature-state.schema.json` (adding optional `classification_snapshot`), and hardens `scripts/validate-contracts.mjs` (cross-field parity, causal prefix & episode-scoped branch selection, mandatory design remediation on risk escalation, and `historical_only: true` sunset support with remediation hold and cutoff timestamp); **`Slice 1` is a semantic prerequisite for `Slice 3`**.
  - `Slice 2` (deliberate 9-file update across `docs/` and the 3 host copies of `code-review-gate`) has zero file or semantic coupling to `Slice 1` or `Slice 3`.
  - `Slice 4` (`ROADMAP-SDLC-FRAMEWORK.md`) summarizes the approved adoption across Slices 1–3 and lands last as the terminal PR (`closing_action: closes`).

| Slice | Scope & Reviewer Route | Exact Write-Set | Est. Changed Lines |
|---|---|---|---|
| **Slice 1 (`PR-1`)** | **Compressed Templates, Parity + Temporal Escalation + Sunset Contract Engine with Remediation Hold & Cutoff Timestamp (TDD), Schema Update & Parallel Worktree Matrix (`RR-01`, `R3-01`, `R3-02`, `V4-01a`, `V4-01b`)**<br>Mode: `Task-Execution Mode` enabled<br>Route: `SA / Developer / Documentation Agent → Security Reviewer (gate-bypass & escalation check) + Independent Code Reviewer / QA → Human Approval` | - `[NEW]` `docs/templates/INTENT.md`<br>- `[NEW]` `docs/templates/SPEC.md`<br>- `[MODIFY]` `docs/contracts/schemas/new-feature-state.schema.json` (optional `classification_snapshot`)<br>- `[MODIFY]` `test/validate-contracts.test.mjs` (Red first: `TC-001`–`TC-003E4`)<br>- `[MODIFY]` `scripts/validate-contracts.mjs` (Green: parity, causal prefix/episode branch selection, `classification_snapshot` remediation invariant, `historical_only` sunset with `REMEDIATION_HOLD_STATES` and `sunset_effective_at` cutoff check)<br>- `[MODIFY]` `docs/contracts/new-feature-workflow.yaml`<br>- `[MODIFY]` `docs/workflows/new-feature.md`<br>- `[MODIFY]` `docs/workflow/dynamic-routing.md`<br>- `[MODIFY]` `DECISIONS.md` (self-contained ADR)<br>- `[MODIFY]` `CHANGELOG.md`<br>- `[GENERATED]` `test/fixtures/context-pack-v1/required-source-matrix.json` (deterministic repin)<br>- `[NEW]` `docs/records/qa/<date>-issue-303-slice-1-contracts-code-review.md` | ~295 lines |
| **Slice 2 (`PR-2`)** | **Deliberate 9-File Review Policy Alignment & Reference 5-Nit Cap (`DW-01`)**<br>Mode: Standard Documentation Review (no Task Brief ceremony)<br>Route: `Documentation Agent → Independent QA/Reviewer → Human Approval` | - `[MODIFY]` `docs/workflows/code-review-gate.md`<br>- `[MODIFY]` `docs/templates/CODE_REVIEW_FINDINGS.md`<br>- `[MODIFY]` `docs/templates/TASK_REVIEW.md`<br>- `[MODIFY]` `.agents/skills/code-review-gate/SKILL.md`<br>- `[MODIFY]` `.claude/skills/code-review-gate/SKILL.md`<br>- `[MODIFY]` `.agent/skills/code-review-gate/SKILL.md`<br>- `[MODIFY]` `.agents/skills/code-review-gate/templates/CODE_REVIEW_FINDINGS.md`<br>- `[MODIFY]` `.claude/skills/code-review-gate/templates/CODE_REVIEW_FINDINGS.md`<br>- `[MODIFY]` `.agent/skills/code-review-gate/templates/CODE_REVIEW_FINDINGS.md`<br>- `[MODIFY]` `CHANGELOG.md` | ~180 lines *(incl. identical 3-platform copies of `code-review-gate`)* |
| **Slice 3 (`PR-3`)** | **Structured Cohort Evaluator, Legacy Flag Isolation (`R3-04`), Dual-Digest & 3-Phase Safe `--emit-intent` CLI with Resilient Write Loop & Honest Residual Reporting (`R3-03`, `V4-02a`, `V4-02b`, `V4-02c`) (TDD)**<br>Prerequisite: `Slice 1` · Mode: `Task-Execution Mode` enabled<br>Route: `Developer Agent (TDD) → Independent Code Reviewer + Independent QA (with static-logic-review) → Human Approval` | - `[MODIFY]` `test/validate-metrics.test.mjs` (Red first: `TC-004`–`TC-010E`)<br>- `[MODIFY]` `scripts/validate-metrics.mjs` (Green: structured collectors, `INCOMPATIBLE_SOURCE_FLAGS` guard, Dual-Digest, write-all byte loop, try/catch cleanup reporting `WRITE_ABORTED_CLEANUP_FAILED`, rename temp cleanup reporting `TARGET_UNCHANGED_BEFORE_COMMIT` vs `RENAME_FAILED_TEMP_RESIDUAL`, and `POST_COMMIT_DIR_SYNC_FAILED`)<br>- `[MODIFY]` `docs/operating-model/METRICS.md`<br>- `[MODIFY]` `CHANGELOG.md`<br>- `[NEW]` `docs/records/qa/<date>-issue-303-slice-3-metrics-code-review.md` | ~310 lines |
| **Slice 4 (`PR-4`)** | **6-Stage SDLC Roadmap Alignment & 5-Layer Hook Enforcement Boundary Matrix**<br>Prerequisites: `Slices 1–3` · Mode: Standard Documentation Review (Terminal PR closing `#303`)<br>Route: `Documentation Agent → Independent Reviewer / QA → Human Approval` | - `[MODIFY]` `ROADMAP-SDLC-FRAMEWORK.md` | ~95 lines |

---

### 3.1 `/dynamic-workflow` Execution Governance & Accurate Audit Boundaries (`DW-01` – `DW-05`)

1. **Deliberate 9-File Review Scope vs. Optional Skill Library Policy (`DW-01`)**:
   - Per `AGENTS.md:67` and `docs/workflows/stabilize-core.md:18`, skill trees are independently editable optional libraries and core policy does **not** require cross-platform mirroring or repo-wide skill parity/catalog audits as a mandatory merge gate.
   - Updating all 9 surfaces in Slice 2 (`docs/` + `.agents/`, `.claude/`, `.agent/` copies of `code-review-gate/SKILL.md` and `code-review-gate/templates/CODE_REVIEW_FINDINGS.md`) is a **deliberate delivery choice for Issue #303** so no host copy of `code-review-gate` retains stale review-pass or Nit-cap templates.
   - **Verification Boundary**: `node scripts/validate-skill-parity.mjs` hashes only `SKILL.md` (`scripts/validate-skill-parity.mjs:53`); therefore, `TC-013` pairs `validate-skill-parity.mjs` (for `SKILL.md`) with an explicit byte/SHA-256 comparison of the three nested `templates/CODE_REVIEW_FINDINGS.md` files and an independent reviewer check across all 9 files.
2. **Stacked PR Readiness & Issue Label Reset Protocol (`DW-02` — `scripts/work-item-readiness.mjs:197–222, 305–360`)**:
   - **`PR-1`, `PR-2`, `PR-3` (Intermediate PRs)**: Carry Mode A YAML frontmatter at line 1 (`schema_version: 1`, `work_item: 303`, `governing_workflow: framework_meta`, `closing_action: advances-only`, `advances_issue: 303`, `documentation_impact: completed`, `risk_level: medium`, plus `qa_evidence: <URL>` before marking Ready for Review) and **must NOT contain `Closes/Fixes/Resolves #303`** outside code spans.
   - **Inter-Slice Label Reset on Issue `#303`**: After each intermediate PR merges, reset Issue `#303` labels to `phase:development` + `status:spec-ready` (removing the prior slice's `status:development-done` and `status:verification-done`).
   - **`PR-4` (Terminal Slice 4 PR)**: Uses `closing_action: closes` in frontmatter and `Closes #303` in prose after QA verifies all rows (`AC-001`–`AC-006`) of Issue `#303`'s single `## Acceptance Traceability Matrix`.
3. **Project State, Risk Register & Projection Invariants (`DW-03`)**:
   - Run `node scripts/compile-status-projection.mjs --reconcile` whenever editing `PROJECT_STATUS.md` and maintain open risk `R-303-01` in `RISKS.md` while Issue `#303` is active.
4. **In-Turn Supervision & Structured Handoff (`DW-04`)**:
   - Every child specialist/verifier invocation executes strictly in-turn within the active Orchestrator turn per `docs/workflow/handoff-contract.md:77–80`.
5. **`stabilize-core.md` Artifact Disposition & Self-Contained Permanent Docs (`DW-05`)**:
   - `AGENTS.md`, `AGENT_OPERATING_MODEL.md`, `AGENT_EVALUATION_CHECKLIST.md`, and `SKILL_CATALOG.md` remain `N/A` (preserving Tier-1 bootloader token budget `1,767 / 2,500`).
   - Permanent files (`DECISIONS.md`, `dynamic-routing.md`, `METRICS.md`, `ROADMAP-SDLC-FRAMEWORK.md`, `RISKS.md`, `CHANGELOG.md`) remain self-contained without `see docs/records/...` meaning pointers (`validate-clearable-refs.mjs`).

---

## 4. Detailed Task Breakdown

| Task ID | Slice | Task Description | Agent / Owner | Files | Verification Command |
|---|---|---|---|---|---|
| **IMP-303-01** | Slice 1 | Author `docs/templates/INTENT.md` (with Dual-Digest Advisory Header fields) and `docs/templates/SPEC.md` (with strict `api_contract_impact: "none"` rule and Canonical Equivalence Mapping to `REQUIREMENT_DISCOVERY.md` / `SDD.md`), keeping all 34 existing templates intact. | `documentation-agent` | `docs/templates/INTENT.md`, `docs/templates/SPEC.md` | `git diff --check` |
| **IMP-303-02** | Slice 1 | **TDD Red Phase (Contracts, Temporal Escalation, Remediation Hold & Sunset Cutoff)**: Add failing tests (`TC-001`, `TC-002`, `TC-003.1`, `TC-003A`–`TC-003E4`) in `test/validate-contracts.test.mjs` covering: low-risk fast-track happy path, cross-field parity rejections, static impact exits, `low -> high` plan escalation (`TC-003A`), `low -> high` rework escalation via `designing` (`TC-003B`), standard design `rework -> planning` (`TC-003C`), unremediated escalation / causal prefix leak / episode reset across `rework -> discovery` rejections (`TC-003D`), sunset in-flight recovery hold at `designing` (`TC-003E1`), unremediated fast-track advancing to `implementing` blocked (`TC-003E2`), pre-sunset completed records passing (`TC-003E3`), and post-sunset new fast-track entry rejected (`TC-003E4`). | `developer-agent` | `test/validate-contracts.test.mjs` | `node --test test/validate-contracts.test.mjs` *(expected Red)* |
| **IMP-303-03** | Slice 1 | **TDD Green Phase (Contracts & Schema)**: Add optional `classification_snapshot` schema to `docs/contracts/schemas/new-feature-state.schema.json`; implement `validateTopLevelEvidenceParity()`, causal-prefix episode-scoped `selectTransitionBranch()`, `classification_snapshot` + Mandatory Design Remediation Invariant, and `historical_only: true` support with `REMEDIATION_HOLD_STATES` and `sunset_effective_at` cutoff check in `scripts/validate-contracts.mjs`; add `discovery -> planning` and `planning -> implementing` low-risk branches in `docs/contracts/new-feature-workflow.yaml`; sync `docs/workflows/new-feature.md`. | `developer-agent` / `sa-agent` | `docs/contracts/schemas/new-feature-state.schema.json`, `scripts/validate-contracts.mjs`, `docs/contracts/new-feature-workflow.yaml`, `docs/workflows/new-feature.md` | `node --test test/validate-contracts.test.mjs && node scripts/validate-contracts.mjs` |
| **IMP-303-04** | Slice 1 | Update `docs/workflow/dynamic-routing.md` with the 6-Gate Eligibility Matrix, Mid-Flight Risk Escalation & Rework Episode Evidence Validity rules, Sunset Lifecycle with In-Flight Remediation Hold, and the Parallel Worktrees vs. Scoped Subagents table; record self-contained ADR in `DECISIONS.md` and entry in `CHANGELOG.md`; run `node scripts/repin-source-matrix.mjs`. | `documentation-agent` / `sa-agent` | `docs/workflow/dynamic-routing.md`, `DECISIONS.md`, `CHANGELOG.md`, `test/fixtures/context-pack-v1/required-source-matrix.json` | `node scripts/repin-source-matrix.mjs && node scripts/validate-context-budget.mjs && node scripts/validate-context-compatibility.mjs && node scripts/adr-audit.mjs && node scripts/validate-clearable-refs.mjs` |
| **IMP-303-05** | Slice 1 | Run bounded `security-reviewer` gate-bypass & escalation audit + independent `code-reviewer` + QA `TASK_REVIEW.md` over Slice 1's pinned `base_sha..head_sha`; commit `docs/records/qa/<date>-issue-303-slice-1-contracts-code-review.md` (`TC-012`) and validate `PR-1` (`closing_action: advances-only`). | `security-reviewer` + `code-reviewer` + `qa-agent` | `docs/records/qa/<date>-issue-303-slice-1-contracts-code-review.md` | `node scripts/validate-review-gate.mjs` |
| **IMP-303-06** | Slice 2 | Align all **9 review/skill files** of Issue #303 (`docs/workflows/code-review-gate.md`, `docs/templates/CODE_REVIEW_FINDINGS.md`, `docs/templates/TASK_REVIEW.md`, plus `SKILL.md` and `templates/CODE_REVIEW_FINDINGS.md` across `.agents/`, `.claude/`, and `.agent/`) + `CHANGELOG.md` with 3 Passes, 3 Decision Tiers, reference parameter `Nit Cap = 5` with suppressed-count summary, Anti-Downgrade Rule, and Scoped Re-review preservation (`TC-013`, `DW-01`). | `documentation-agent` | 9 review/skill files + `CHANGELOG.md` | `node scripts/validate-skill-parity.mjs && cmp -s .agents/skills/code-review-gate/templates/CODE_REVIEW_FINDINGS.md .claude/skills/code-review-gate/templates/CODE_REVIEW_FINDINGS.md && cmp -s .agents/skills/code-review-gate/templates/CODE_REVIEW_FINDINGS.md .agent/skills/code-review-gate/templates/CODE_REVIEW_FINDINGS.md && node scripts/validate-context-budget.mjs && git diff --check` |
| **IMP-303-07** | Slice 3 | **TDD Red Phase (Metrics, Legacy Flag Isolation & Resilient 3-Phase I/O Faults)**: Add failing unit, BVA, cohort, integrity, CLI flag combination, Dual-Digest, and fault-injection tests (`TC-004`–`TC-010E`) in `test/validate-metrics.test.mjs` covering: default & `--source legacy-task-log` isolation (`INCOMPATIBLE_SOURCE_FLAGS` `exit 2`), `dispatch_ledger_expiry_rate`, `verified_rework_rate`, unrounded BVA, Dual-Digest human-edit protection (`REJECT_HUMAN_MODIFIED`), positive short write loop completion (`TC-010A`), `WRITE_ABORTED_CLEANUP_FAILED` when cleanup throws (`TC-010B`), `TARGET_UNCHANGED_BEFORE_COMMIT` when rename fails and temp unlink succeeds (`TC-010C`), `RENAME_FAILED_TEMP_RESIDUAL` when rename fails and temp unlink throws (`TC-010D`), and post-rename `syncDirectorySync` `EIO` reporting (`POST_COMMIT_DIR_SYNC_FAILED`, `TC-010E`). | `developer-agent` | `test/validate-metrics.test.mjs` | `node --test test/validate-metrics.test.mjs` *(expected Red)* |
| **IMP-303-08** | Slice 3 | **TDD Green & Refactor Phase (Metrics & Resilient 3-Phase Safe CLI)**: Implement CLI flag validator (`INCOMPATIBLE_SOURCE_FLAGS`), structured collectors, closed schema registry, cohort evaluator, RFC 8785 JCS `Intent-Fingerprint` + `Draft-Content-SHA256` Dual-Digest engine, and resilient 3-phase safe file writer (`writeDraftSafe` with positive short write loop, try/catch cleanup reporting `WRITE_ABORTED_CLEANUP_FAILED`, rename temp cleanup reporting `TARGET_UNCHANGED_BEFORE_COMMIT` vs `RENAME_FAILED_TEMP_RESIDUAL`, and explicit `POST_COMMIT_DIR_SYNC_FAILED` reporting after commit point) in `scripts/validate-metrics.mjs`; document self-contained formulas, flag matrix, and failure contract in `docs/operating-model/METRICS.md` + `CHANGELOG.md`. | `developer-agent` | `scripts/validate-metrics.mjs`, `docs/operating-model/METRICS.md`, `CHANGELOG.md` | `node --test test/validate-metrics.test.mjs && node scripts/validate-metrics.mjs && node scripts/validate-clearable-refs.mjs` |
| **IMP-303-09** | Slice 3 | Run independent Code Review Gate + QA `TASK_REVIEW.md` + QA `static-logic-review` on Slice 3's threshold, flag isolation, Dual-Digest, and resilient 3-phase I/O error-handling logic; commit `docs/records/qa/<date>-issue-303-slice-3-metrics-code-review.md` (`TC-014`) and validate `PR-3` (`closing_action: advances-only`). | `code-reviewer` + `qa-agent` (distinct identities) | `docs/records/qa/<date>-issue-303-slice-3-metrics-code-review.md` | `node scripts/validate-review-gate.mjs` |
| **IMP-303-10** | Slice 4 | Update `ROADMAP-SDLC-FRAMEWORK.md` (self-contained, no `CLEARED_DIRECTORIES` meaning pointers) with the 6-Stage Primary-Source Adoption Matrix, accurate 5-Layer Hook Enforcement Boundary table, and explicit M3/M4 placement for Live Behavioral Evals and Runtime Dispatch Outcome Producer / Control-Band Automation; verify full Issue `#303` `Acceptance Traceability Matrix` (`AC-001`–`AC-006`) on terminal `PR-4` (`closing_action: closes`) and complete Post-Merge Closeout (`TC-015`). | `documentation-agent` + `qa-agent` | `ROADMAP-SDLC-FRAMEWORK.md` (+ post-merge closeout PR) | `node scripts/validate-clearable-refs.mjs && node scripts/validate-root-doc-links.mjs && npm test` |

---

## 5. Test & Review Gate Strategy

| Verification Layer | Required? | Scope | Accountable Verifier |
|---|---|---|---|
| State-Machine, Parity, Temporal Escalation, Remediation Hold & Sunset Cutoff Tests | **Yes (Slice 1)** | `TC-001`–`TC-003E4`: Cross-field parity, causal prefix & episode boundary, `classification_snapshot` + Mandatory SA Remediation, `historical_only: true` sunset with in-flight remediation hold (`TC-003E1`), unremediated implementation block (`TC-003E2`), pre-sunset completed pass (`TC-003E3`), and post-sunset new entry block (`TC-003E4`), plus 10 baseline examples | `developer-agent` + `qa-agent` |
| Behavioral Security Review | **Yes (Slice 1)** | Verify Slice 1's fast-track conditions and `classification_snapshot` remediation invariant fail closed on any security/API/data escalation and cannot bypass `Security Gate` | `security-reviewer` |
| Deliberate 9-File Review Alignment & Nested Template Check | **Yes (Slice 2)** | `TC-013`: `validate-skill-parity.mjs` (`SKILL.md` parity) + exact byte comparison (`cmp -s`) across the 3 nested `templates/CODE_REVIEW_FINDINGS.md` files + reviewer inspection of all 9 files (`DW-01`) | `qa-agent` |
| Structured Cohort, Legacy Flag Isolation, Dual-Digest & Resilient 3-Phase I/O Tests | **Yes (Slice 3)** | `TC-004`–`TC-010E`: `INCOMPATIBLE_SOURCE_FLAGS`, namespace separation, `evaluatedItems` cohort, Dual-Digest, positive short write loop (`TC-010A`), `WRITE_ABORTED_CLEANUP_FAILED` (`TC-010B`), `TARGET_UNCHANGED_BEFORE_COMMIT` (`TC-010C`), `RENAME_FAILED_TEMP_RESIDUAL` (`TC-010D`), and post-rename `syncDirectorySync` `EIO` (`TC-010E`) | `developer-agent` + `qa-agent` |
| Independent Code Review Gate & Task Review | **Yes (Slice 1 & Slice 3)** | Dedicated `docs/records/qa/*-code-review.md` + QA `TASK_REVIEW.md` records pinned to `base_sha..head_sha` | `code-reviewer` + `qa-agent` (independent identities) |
| QA Static Logic Review | **Yes (Slice 1 & Slice 3)** | Source-level branch trace on `validate-contracts.mjs` (episode/remediation/sunset hold/cutoff) and `validate-metrics.mjs` (flag isolation/Dual-Digest/resilient 3-phase I/O) | `qa-agent` |
| Stacked PR Readiness & State Projection Gates | **Yes (Every Slice)** | `TC-015`: `validate-pr-readiness.mjs`, `compile-status-projection.mjs --check`, `validate-risk-register.mjs`, `validate-clearable-refs.mjs`, and `801+` baseline tests | `qa-agent` |

---

## 6. Verification Commands

```bash
# 1. Slice 1 — Contract validator parity, temporal escalation, sunset mode, source-matrix repin, ADR & review gate
node --test test/validate-contracts.test.mjs
node scripts/validate-contracts.mjs
node scripts/repin-source-matrix.mjs
node scripts/validate-context-compatibility.mjs
node scripts/validate-context-budget.mjs
node scripts/adr-audit.mjs
node scripts/validate-clearable-refs.mjs
node scripts/validate-review-gate.mjs

# 2. Slice 2 — 9-file review policy, SKILL.md parity, nested template byte parity & context budget
node scripts/validate-skill-parity.mjs
cmp -s .agents/skills/code-review-gate/templates/CODE_REVIEW_FINDINGS.md .claude/skills/code-review-gate/templates/CODE_REVIEW_FINDINGS.md
cmp -s .agents/skills/code-review-gate/templates/CODE_REVIEW_FINDINGS.md .agent/skills/code-review-gate/templates/CODE_REVIEW_FINDINGS.md
node scripts/validate-context-budget.mjs
git diff --check

# 3. Slice 3 — Structured cohort metrics, legacy flag isolation, Dual-Digest, resilient 3-phase I/O & review gate
node --test test/validate-metrics.test.mjs
node scripts/validate-metrics.mjs
node scripts/validate-clearable-refs.mjs
node scripts/validate-review-gate.mjs

# 4. Slice 4, PR Readiness, Project State Projection & Full Repository Gate Suite
node scripts/validate-clearable-refs.mjs
node scripts/validate-root-doc-links.mjs
node scripts/validate-context-compatibility.mjs
node scripts/validate-ci-parity.mjs
node scripts/validate-project-state.mjs
node scripts/compile-status-projection.mjs --check
node scripts/validate-risk-register.mjs
npm test
git diff --check
```

---

## 7. Two-Regime Rollback / Fallback Runbook (`R3-02`, `V4-01a`, `V4-01b` Persisted-State Aware)

| Scenario | Preflight Check | Safe Rollback / Sunset Action, State Disposition & Accountable Owner |
|---|---|---|
| **Slice 4** (`ROADMAP-SDLC-FRAMEWORK.md`) or **Slice 2** (9 review/skill files) | None (stateless docs/templates) | `git revert <slice-commit>` (for Slice 2, verify `SKILL.md` and nested template byte parity). |
| **Slice 3** (`validate-metrics.mjs` + `METRICS.md`) | Check whether Slice 1 remains active | `git revert <slice-3-commit>` and run `npm test`. Any previously generated `INTENT.md` drafts remain valid standard Markdown files. |
| **Slice 1 — Regime 1: Pre-Adoption Rollback** *(Zero persisted `task-state.yaml` records used `discovery -> planning`)* | Scan `docs/records/work-items/**/task-state.yaml` (active + `archive/`) and confirm `0` occurrences of `from: discovery, to: planning` | 1. If Slice 3 was merged, revert in reverse dependency order (`Slice 3` → `Slice 1`) (or retain `docs/templates/INTENT.md`).<br>2. Run `node scripts/repin-source-matrix.mjs && npm test`. |
| **Slice 1 — Regime 2: Post-Adoption Fast-Track Sunset** *(`>= 1` persisted active or archived `task-state.yaml` records traversed `discovery -> planning`)* | Scan detects `>= 1` occurrences of `from: discovery, to: planning` in `docs/records/work-items/**/task-state.yaml` | **Never rewrite/falsify persisted `history` events and do NOT `git revert` the `validate-contracts.mjs` reader or `new-feature-state.schema.json`.**<br>1. **Disable New Fast-Track Entry**: Set `historical_only: true` on fast-track transitions (`discovery -> planning` and fast-track `planning -> implementing`) and set `sunset_effective_at: "<ISO-timestamp>"` in `docs/contracts/new-feature-workflow.yaml`. Remove fast-track routing guidance for new work items in `dynamic-routing.md` / `new-feature.md`, and run `node scripts/repin-source-matrix.mjs`.<br>2. **Completed / Archived Records (`state === "release"` or already remediated via `designing -> planning`)**: Continue to pass `validateContracts()` and `validate-metrics.mjs --source structured` (`TC-003E3`) with zero history mutation if completed before or at `sunset_effective_at`.<br>3. **In-Flight Active Fast-Track Records Under Remediation (`state ∈ {"discovery", "designing", "rework", "blocked"}`)**: Are explicitly permitted to pass validation during remediation (`TC-003E1`) so agents can execute runbook steps without violating `validate-before-handoff`.<br>4. **In-Flight Active Records Advancing Without Remediation (`state ∈ {"planning", "implementing", "verifying"}` without `designing -> planning`)**: Flagged and blocked by `validateContracts()` (`TC-003E2`). **SA Agent + Human Maintainer** must route each in-flight work item forward through `planning -> designing` or `rework -> designing` to attach `SDD.md` and `sa_dev_gate_result` before advancing. |

---

## 8. Risks & Blockers

| ID | Risk / Blocker | Impact | Mitigation |
|---|---|---|---|
| **R-303-01 (Active Gate Blocker)** | Core policy, contract, schema, and CLI behavior changes require Human Maintainer sign-off before `status:spec-ready`. | Cannot begin Slice 1–4 mutations autonomously. | Tracked in `RISKS.md` (`Open`); Spec v5 + Plan v5 + reproducible verification harness presented on Issue #303; stopped cleanly at Human Approval Gate. |
| **R-303-02** | Mid-flight risk escalation (`low -> medium/high`) on a fast-track work item could either break historical replay or allow an escalated item to skip `designing` (`R3-01`). | False CI rejection on valid escalation OR security/architecture gate bypass. | Mitigated by causal-prefix episode branch selection + optional `classification_snapshot` + Mandatory Design Remediation Invariant (`TC-003A`–`TC-003D`). |
| **R-303-03** | Post-adoption rollback of Slice 1 via raw `git revert` would break validation of persisted fast-track `task-state.yaml` histories (`R3-02`), or sunset mode could block in-flight recovery at `designing` (`V4-01a`). | `illegal transition: discovery -> planning` on historical records OR deadlock during runbook recovery. | Mitigated by Two-Regime Rollback Runbook, `historical_only: true` policy sunset mode, `REMEDIATION_HOLD_STATES` for in-flight recovery (`TC-003E1`), and `sunset_effective_at` cutoff enforcement (`TC-003E4`). |
| **R-303-04** | Partial write (`ENOSPC`) on `wx` leaving corrupted draft files, short writes without completing buffer, cleanup failure (`EACCES`), or rename temp unlinking failure misreporting status (`V4-02a`–`V4-02c`). | Corrupted draft file, data loss, or misleading operator error message. | Mitigated by Resilient 3-Phase I/O Failure Contract: write-all loop (`TC-010A`), try/catch cleanup reporting `WRITE_ABORTED_CLEANUP_FAILED` with `targetModified: true` (`TC-010B`), temp cleanup reporting `TARGET_UNCHANGED_BEFORE_COMMIT` vs `RENAME_FAILED_TEMP_RESIDUAL` (`TC-010C`, `TC-010D`), and `POST_COMMIT_DIR_SYNC_FAILED` (`TC-010E`). |
| **R-303-05** | Calling `--check-thresholds` or `--emit-intent` with `--source legacy-task-log` could use non-authoritative keyword counts for pass/fail decisions (`R3-04`). | Violates `METRICS.md:45`. | Mitigated by rejecting structured threshold/emit flags on legacy source at Phase-1 preflight with `INCOMPATIBLE_SOURCE_FLAGS` (`exit 2`, `TC-004`). |

---

## 9. Completion Contract & Next Handoff

- **Done when (for current Round-4 Review Revision stage)**:
  1. All findings in Comment `#6654686480` (`V4-01a`, `V4-01b`, `V4-02a`, `V4-02b`, `V4-02c`) are addressed with concrete contracts, test cases (`TC-003E1`–`TC-003E4`, `TC-010A`–`TC-010E`), and a reproducible verification harness across Spec v5, Plan v5, Work Item record, Lessons Learned, `PROJECT_STATUS.md` (with reconciled projection markers), `TASK_LOG.md`, and `RISKS.md`.
  2. All repository validators (`validate-contracts.mjs`, `validate-context-budget.mjs`, `validate-clearable-refs.mjs`, `validate-review-gate.mjs`, `validate-project-state.mjs`, `compile-status-projection.mjs --check`, `validate-risk-register.mjs`, `validate-skill-parity.mjs`, `validate-root-doc-links.mjs`) pass with `exit 0`.
  3. Updated artifacts are pushed to `origin/feat/issue-303-ai-native-sdlc-playbook`, Issue `#303` body is synced, and a new reply comment is posted on Issue `#303`.
- **May proceed through**: Authoring Spec v5 and Plan v5, updating work-item/lessons-learned/project-state records, running local validators, pushing to `origin`, and posting the reply comment on GitHub Issue `#303`.
- **Must stop for**: Human Maintainer policy approval (Spec v5 Section 8) and `status:spec-ready` before mutating core workflow policies, contracts, schemas, templates, skills, or runtime `.mjs` scripts.
- **Assumptions**: None silent; all four policy decisions (Spec v5 Section 8) are explicitly surfaced for Maintainer sign-off.

| To | Next Action | Reason | Required Evidence |
|---|---|---|---|
| **Human Maintainer** | `Human review` (`Dispatch State: blocked`, `Stop Reason: human_review_required`) | Review & approve Executive Spec v5 + Plan v5 and grant `status:spec-ready` to start Slice 1 (`PR-1`) | Committed Spec v5 + Plan v5 + Work Item + Reconciled Project State on `origin/feat/issue-303-ai-native-sdlc-playbook` and new reply comment on Issue `#303` |
