# Implementation Plan v3 — Issue #303 (End-to-End AI-Native SDLC Integration & `/dynamic-workflow` Execution Hardening)

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | [Issue #303](https://github.com/chakrits/AI-Agent-Workflow/issues/303) · [`docs/records/work-items/2026-11-05-issue-303.md`](../work-items/2026-11-05-issue-303.md) |
| Change Type | `Framework / Meta Change` (Slices 1–4, governed by `docs/workflows/stabilize-core.md`) + `Code Behavior Enhancement` (Slice 1 in `scripts/validate-contracts.mjs`; Slice 3 in `scripts/validate-metrics.mjs`) |
| Risk Level | `Medium` |
| Accountable Owners | Orchestrator Agent (coordination & in-turn supervision) · SA / Documentation Agent + Developer Agent (Slice 1 TDD) · Documentation Agent (Slices 2, 4 & Closeout) · Developer Agent (Slice 3 TDD) · Security Reviewer (Slice 1 gate-bypass review) · Independent Code Reviewer / QA Agent (verification per slice) |
| Target Branch | `feat/issue-303-ai-native-sdlc-playbook` (base: `origin/main` at `863306a9e3268f32d416ad76f5a783746b49ea4f`) |
| Supersedes | [`docs/records/implementation-plan/2026-11-05-issue-303-ai-native-sdlc-plan-v2.md`](./2026-11-05-issue-303-ai-native-sdlc-plan-v2.md) |
| Delivery Topology | **Stacked PRs (1 PR per Slice: `PR-1` → `PR-2` → `PR-3` → `PR-4`, followed by Post-Merge Closeout PR)** using `closing_action: advances-only` on `PR-1`–`PR-3` and `closing_action: closes` only on terminal `PR-4` |
| Task-Execution Mode | **Scoped**: Enabled for **Slice 1** and **Slice 3** (Medium-risk contract & decision-logic changes via `TASK_BRIEF.md` → `IMPLEMENTER_REPORT.md` → QA `TASK_REVIEW.md`, `task_review_rework_count <= 2`); bypassed for doc/template-only **Slice 2** and **Slice 4** per `docs/workflow/task-execution-mode.md:21` |
| Execution Gate | **Blocked (`phase:planning`) pending Human Maintainer policy approval & `status:spec-ready`** per `docs/workflow/dynamic-routing.md#specification-readiness` |

---

## 2. Inputs Reviewed

| Artifact | Status | Notes |
|---|---|---|
| Executive Specification v3 | Available | [`docs/records/sdd/2026-11-05-issue-303-rebuttal-and-executive-spec-v3.md`](../sdd/2026-11-05-issue-303-rebuttal-and-executive-spec-v3.md) |
| Work Item & Lessons Learned Records | Available | [`docs/records/work-items/2026-11-05-issue-303.md`](../work-items/2026-11-05-issue-303.md) · [`docs/records/lessons-learned/2026-11-05-issue-303-review-lessons.md`](../lessons-learned/2026-11-05-issue-303-review-lessons.md) |
| Round-1 & Round-2 Review Records | Available | [Comment `#6650818869`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6650818869) and [Re-Review Comment `#6651546438`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6651546438) (`RR-01`–`RR-05`, Section 4, Section 10) |
| `/dynamic-workflow` Execution Audit | Available | `.agent/skills/dynamic-workflow/SKILL.md`, `docs/workflows/stabilize-core.md`, `scripts/work-item-readiness.mjs`, `scripts/validate-skill-parity.mjs`, `scripts/compile-status-projection.mjs`, `scripts/validate-risk-register.mjs`, `scripts/validate-clearable-refs.mjs` (`DW-01`–`DW-05`) |
| External Primary Source | Available | [*The AI-native SDLC playbook* — Louis Claxton, Anthropic (2026-08-21)](https://claude.com/resources/articles/the-ai-native-sdlc-playbook) |
| Existing Framework Roadmap | Available | `ROADMAP-SDLC-FRAMEWORK.md` (Issue #298 Milestones `M0`–`M5`) |

---

## 3. Affected Areas, Slice Dependencies & Change-Sizing Strategy

Per `AGENTS.md` Core Operating Principle 10 (*Change Sizing*: ~100–300 lines per reviewable slice), delivery is structured into **4 stacked PR slices** with explicit semantic dependencies:

- **Semantic Dependency Order**:
  - `Slice 1` defines `docs/templates/INTENT.md` and `SPEC.md` and hardens contract validation; **`Slice 1` is a semantic prerequisite for `Slice 3`** (which renders drafts conforming to `INTENT.md`).
  - `Slice 2` (9-file review policy, nested skill templates & cross-platform mirrors) has zero file or semantic coupling to `Slice 1` or `Slice 3`.
  - `Slice 4` (`ROADMAP-SDLC-FRAMEWORK.md`) summarizes the approved adoption across Slices 1–3 and lands last as the terminal PR (`closing_action: closes`).

| Slice | Scope & Reviewer Route | Exact Write-Set | Est. Changed Lines |
|---|---|---|---|
| **Slice 1 (`PR-1`)** | **Compressed Templates, Cross-Field Contract Parity Engine (TDD), Low-Risk `new-feature` Branch & Parallel Worktree Matrix**<br>Mode: `Task-Execution Mode` enabled<br>Route: `SA / Developer / Documentation Agent → Security Reviewer (gate-eligibility check) + Independent Code Reviewer / QA → Human Approval` | - `[NEW]` `docs/templates/INTENT.md`<br>- `[NEW]` `docs/templates/SPEC.md`<br>- `[MODIFY]` `test/validate-contracts.test.mjs` (Red first)<br>- `[MODIFY]` `scripts/validate-contracts.mjs` (Green: parity + multi-branch)<br>- `[MODIFY]` `docs/contracts/new-feature-workflow.yaml`<br>- `[MODIFY]` `docs/workflows/new-feature.md`<br>- `[MODIFY]` `docs/workflow/dynamic-routing.md`<br>- `[MODIFY]` `DECISIONS.md` (self-contained ADR)<br>- `[MODIFY]` `CHANGELOG.md`<br>- `[GENERATED]` `test/fixtures/context-pack-v1/required-source-matrix.json` (deterministic repin)<br>- `[NEW]` `docs/records/qa/<date>-issue-303-slice-1-contracts-code-review.md` | ~250 lines |
| **Slice 2 (`PR-2`)** | **9-File Multi-Surface & Cross-Platform 3-Pass Review Policy & Reference 5-Nit Cap (`DW-01`)**<br>Mode: Standard Documentation Review (no Task Brief ceremony)<br>Route: `Documentation Agent → Independent QA/Reviewer → Human Approval` | - `[MODIFY]` `docs/workflows/code-review-gate.md`<br>- `[MODIFY]` `docs/templates/CODE_REVIEW_FINDINGS.md`<br>- `[MODIFY]` `docs/templates/TASK_REVIEW.md`<br>- `[MODIFY]` `.agents/skills/code-review-gate/SKILL.md`<br>- `[MODIFY]` `.claude/skills/code-review-gate/SKILL.md`<br>- `[MODIFY]` `.agent/skills/code-review-gate/SKILL.md`<br>- `[MODIFY]` `.agents/skills/code-review-gate/templates/CODE_REVIEW_FINDINGS.md`<br>- `[MODIFY]` `.claude/skills/code-review-gate/templates/CODE_REVIEW_FINDINGS.md`<br>- `[MODIFY]` `.agent/skills/code-review-gate/templates/CODE_REVIEW_FINDINGS.md`<br>- `[MODIFY]` `CHANGELOG.md` | ~180 lines *(incl. identical 3-platform mirrors)* |
| **Slice 3 (`PR-3`)** | **Structured Cohort Evaluator (`dispatch_ledger_expiry_rate` & `verified_rework_rate`) & Dual-Digest `--emit-intent` CLI (TDD)**<br>Prerequisite: `Slice 1` · Mode: `Task-Execution Mode` enabled<br>Route: `Developer Agent (TDD) → Independent Code Reviewer + Independent QA (with static-logic-review) → Human Approval` | - `[MODIFY]` `test/validate-metrics.test.mjs` (Red first)<br>- `[MODIFY]` `scripts/validate-metrics.mjs` (Green)<br>- `[MODIFY]` `docs/operating-model/METRICS.md`<br>- `[MODIFY]` `CHANGELOG.md`<br>- `[NEW]` `docs/records/qa/<date>-issue-303-slice-3-metrics-code-review.md` | ~270 lines |
| **Slice 4 (`PR-4`)** | **6-Stage SDLC Roadmap Alignment & 5-Layer Hook Enforcement Boundary Matrix**<br>Prerequisites: `Slices 1–3` · Mode: Standard Documentation Review (Terminal PR closing `#303`)<br>Route: `Documentation Agent → Independent Reviewer / QA → Human Approval` | - `[MODIFY]` `ROADMAP-SDLC-FRAMEWORK.md` | ~95 lines |

---

### 3.1 `/dynamic-workflow` Execution Governance, Stacked PR Frontmatter & `stabilize-core` Disposition (`DW-01` – `DW-05`)

1. **Stacked PR Readiness & Issue Label Reset Protocol (`DW-02` — `scripts/work-item-readiness.mjs:197–222, 305–360`)**:
   - **`PR-1`, `PR-2`, `PR-3` (Intermediate PRs)**: Must carry Mode A YAML frontmatter at line 1 (`schema_version: 1`, `work_item: 303`, `governing_workflow: framework_meta`, `closing_action: advances-only`, `advances_issue: 303`, `documentation_impact: completed`, `risk_level: medium`, plus `qa_evidence: <URL>` before marking Ready for Review) and **must NOT contain `Closes/Fixes/Resolves #303`** anywhere outside code spans.
   - **Inter-Slice Label Reset on Issue `#303`**: After each intermediate PR merges, before opening/verifying the next PR, reset Issue `#303` labels to `phase:development` + `status:spec-ready` (removing the prior slice's `status:development-done` and `status:verification-done`) so each PR independently earns `status:development-done` → `phase:verification` → `status:verification-done` → `phase:human-review`.
   - **`PR-4` (Terminal Slice 4 PR)**: Uses `closing_action: closes` in frontmatter and `Closes #303` in prose after QA verifies all rows (`AC-001`–`AC-006`) of Issue `#303`'s single `## Acceptance Traceability Matrix`.
   - **Post-Merge Closeout Handling**: `.github/workflows/documentation-sync.yml` automatically applies `post-merge-closeout` on default-branch merges; complete closeout via authorized closeout PR(s) (`<!-- post-merge-closeout: complete; source-pr-<N> -->` touching only `PROJECT_STATUS.md`, `TASK_LOG.md`, `CHANGELOG.md`, or `docs/records/HANDOFF-POST-MERGE-CLOSEOUT-*.md` per `work-item-readiness.mjs:270–282`).
2. **Project State, Risk Register & Projection Invariants (`DW-03`)**:
   - Any commit updating `PROJECT_STATUS.md`, `TASK_LOG.md`, or `docs/records/work-items/**` triggers `npm run validate:status-projection` (`compile-status-projection.mjs --check`) and `npm run validate:risk-register` in CI. Always run `node scripts/compile-status-projection.mjs --reconcile` after editing `PROJECT_STATUS.md` and keep at least one open risk (`R-303-01`) in `RISKS.md` while Issue `#303` is active (closing the risk row in place upon terminal closeout, never deleting rows).
3. **In-Turn Supervision & Structured Handoff (`DW-04`)**:
   - Every child specialist/verifier invocation (`developer-agent`, `security-reviewer`, `code-reviewer`, `qa-agent`) executes strictly in-turn within the active Orchestrator turn, recording `Handoff Event ID`, `Parent Orchestrator ID`, `Child Task ID`, `Completion Event Evidence`, single-use `Consumption Evidence`, and a Boss-visible event per `docs/workflow/handoff-contract.md:77–80`.
4. **`stabilize-core.md` Required Artifacts Disposition & Self-Contained Permanent Docs (`DW-05`)**:
   - `docs/operating-model/AGENT_OPERATING_MODEL.md`: **`N/A`** — Autonomy levels, human approval gates, and role ownership remain unchanged.
   - `docs/operating-model/AGENT_EVALUATION_CHECKLIST.md`: **`N/A`** — Existing universal, TDD, QA, security, and code-review checklists already govern all slices.
   - `AGENTS.md`: **`N/A`** — `AGENTS.md` already delegates specification readiness and routing details to `docs/workflow/dynamic-routing.md`; keeping `AGENTS.md` untouched preserves Tier-1 bootloader token budget (`1,767 / 2,500`).
   - `docs/operating-model/SKILL_CATALOG.md`: **`N/A`** — No new skill is added (`code-review-gate` is an existing skill updated in place across `.agents/`, `.claude/`, `.agent/`).
   - **Clearable-Ref Guard (`scripts/validate-clearable-refs.mjs`)**: Permanent files (`DECISIONS.md`, `dynamic-routing.md`, `METRICS.md`, `ROADMAP-SDLC-FRAMEWORK.md`, `RISKS.md`, `CHANGELOG.md`) must be 100% self-contained and reference `Issue #303` or `ADR-XXXX` rather than `see docs/records/...` paths inside `CLEARED_DIRECTORIES`.

---

## 4. Detailed Task Breakdown

| Task ID | Slice | Task Description | Agent / Owner | Files | Verification Command |
|---|---|---|---|---|---|
| **IMP-303-01** | Slice 1 | Author `docs/templates/INTENT.md` (including Dual-Digest Advisory Header fields for Stage-06 compatibility) and `docs/templates/SPEC.md` (with strict `api_contract_impact: "none"` rule and Canonical Equivalence Mapping to `REQUIREMENT_DISCOVERY.md` / `SDD.md`), keeping all 34 existing templates intact. | `documentation-agent` | `docs/templates/INTENT.md`, `docs/templates/SPEC.md` | `git diff --check` |
| **IMP-303-02** | Slice 1 | **TDD Red Phase (Contracts)**: Add failing tests (`TC-001`–`TC-003`) in `test/validate-contracts.test.mjs` covering: full end-to-end low-risk fast-track (`intake -> ... -> release`), cross-field `high/low` & `low/high` & missing `evidence.risk_level` rejections, `config-change` `risk_tier` parity rejection, `low`-risk with `authz` / `additive-endpoint` / `schema-migration` rejections, and preservation of all 10 standard examples. | `developer-agent` | `test/validate-contracts.test.mjs` | `node --test test/validate-contracts.test.mjs` *(expected Red)* |
| **IMP-303-03** | Slice 1 | **TDD Green Phase (Contracts)**: Implement `validateTopLevelEvidenceParity()`, dual-level `validateWhenClause()`, and multi-branch `(from, to)` transition support in `scripts/validate-contracts.mjs`; add `discovery -> planning` and `planning -> implementing` low-risk branches in `docs/contracts/new-feature-workflow.yaml`; sync `docs/workflows/new-feature.md` Required Outputs & Gate Rules. | `developer-agent` / `sa-agent` | `scripts/validate-contracts.mjs`, `docs/contracts/new-feature-workflow.yaml`, `docs/workflows/new-feature.md` | `node --test test/validate-contracts.test.mjs && node scripts/validate-contracts.mjs` |
| **IMP-303-04** | Slice 1 | Update `docs/workflow/dynamic-routing.md` with the 6-Gate Eligibility Matrix (separating Machine-Enforced vs. Reviewer/Human-Enforced checks and excluding Additive APIs from fast-track) and the Parallel Worktrees vs. Scoped Subagents table (`G-04`); record self-contained ADR in `DECISIONS.md` and entry in `CHANGELOG.md`; run `node scripts/repin-source-matrix.mjs`. | `documentation-agent` / `sa-agent` | `docs/workflow/dynamic-routing.md`, `DECISIONS.md`, `CHANGELOG.md`, `test/fixtures/context-pack-v1/required-source-matrix.json` | `node scripts/repin-source-matrix.mjs && node scripts/validate-context-budget.mjs && node scripts/validate-context-compatibility.mjs && node scripts/adr-audit.mjs && node scripts/validate-clearable-refs.mjs` |
| **IMP-303-05** | Slice 1 | Run bounded `security-reviewer` gate-bypass audit + independent `code-reviewer` + QA `TASK_REVIEW.md` over Slice 1's pinned `base_sha..head_sha`; commit `docs/records/qa/<date>-issue-303-slice-1-contracts-code-review.md` (`TC-012`) and validate `PR-1` (`closing_action: advances-only`). | `security-reviewer` + `code-reviewer` + `qa-agent` | `docs/records/qa/<date>-issue-303-slice-1-contracts-code-review.md` | `node scripts/validate-review-gate.mjs` |
| **IMP-303-06** | Slice 2 | Align all **9 review/skill files** (`docs/workflows/code-review-gate.md`, `docs/templates/CODE_REVIEW_FINDINGS.md`, `docs/templates/TASK_REVIEW.md`, plus `SKILL.md` and `templates/CODE_REVIEW_FINDINGS.md` across `.agents/`, `.claude/`, and `.agent/`) + `CHANGELOG.md` with 3 Passes (`Bugs`, `Security`, `Compliance`), 3 Decision Tiers, reference parameter `Nit Cap = 5` with suppressed-count summary, Anti-Downgrade Rule, and Scoped Re-review preservation (`TC-013`, `DW-01`). | `documentation-agent` | 9 review/skill files + `CHANGELOG.md` | `node scripts/validate-skill-parity.mjs && node scripts/validate-context-budget.mjs && git diff --check` |
| **IMP-303-07** | Slice 3 | **TDD Red Phase (Metrics & CLI)**: Add failing unit, BVA, cohort, integrity, and Dual-Digest CLI tests (`TC-004`–`TC-010`) in `test/validate-metrics.test.mjs` covering: default output & clean `stderr`, `dispatch_ledger_expiry_rate` (`closedReceipts` only, excluding open `registered`), `verified_rework_rate` (`evaluatedItems` cohort immune to `intake` dilution), `DIGEST_INTEGRITY_MISMATCH` & `ARCHIVE_LOCATION_AMBIGUOUS` (`exit 2`), unrounded `>= 0.10` / `>= 0.15` BVA, mixed `BREACH_DETECTED` + `INSUFFICIENT_DATA`, `REJECT_HUMAN_MODIFIED` (`exit 2` when body edited under same `Intent-Fingerprint`), `NO_OP_UNCHANGED_ANOMALY` across moved `HEAD`, `REJECT_FINGERPRINT_CHANGED`, `--force` atomic overwrite, and `wx` exclusive create. | `developer-agent` | `test/validate-metrics.test.mjs` | `node --test test/validate-metrics.test.mjs` *(expected Red)* |
| **IMP-303-08** | Slice 3 | **TDD Green & Refactor Phase (Metrics & CLI)**: Implement structured collectors, closed schema registry (`Ajv2020` compiled once with `validateFormats: false` + `digestTaskEnvelope`), cohort evaluator, RFC 8785 JCS `Intent-Fingerprint` + `Draft-Content-SHA256` Dual-Digest engine, and `wx` / `atomicWriteFileSync` file writer in `scripts/validate-metrics.mjs`; document self-contained formulas, namespace boundaries, and CLI contract in `docs/operating-model/METRICS.md` + `CHANGELOG.md`. | `developer-agent` | `scripts/validate-metrics.mjs`, `docs/operating-model/METRICS.md`, `CHANGELOG.md` | `node --test test/validate-metrics.test.mjs && node scripts/validate-metrics.mjs && node scripts/validate-clearable-refs.mjs` |
| **IMP-303-09** | Slice 3 | Run independent Code Review Gate + QA `TASK_REVIEW.md` + QA `static-logic-review` on Slice 3's threshold, cohort, and Dual-Digest branching logic; commit `docs/records/qa/<date>-issue-303-slice-3-metrics-code-review.md` (`TC-014`) and validate `PR-3` (`closing_action: advances-only`). | `code-reviewer` + `qa-agent` (distinct identities) | `docs/records/qa/<date>-issue-303-slice-3-metrics-code-review.md` | `node scripts/validate-review-gate.mjs` |
| **IMP-303-10** | Slice 4 | Update `ROADMAP-SDLC-FRAMEWORK.md` (self-contained, no `CLEARED_DIRECTORIES` meaning pointers) with the 6-Stage Primary-Source Adoption Matrix, accurate 5-Layer Hook Enforcement Boundary table (JSON stdout `permissionDecision: "deny"` + `ADR-0024 D1`), and explicit M3/M4 placement for Live Behavioral Evals and Runtime Dispatch Outcome Producer / Control-Band Automation; verify full Issue `#303` `Acceptance Traceability Matrix` (`AC-001`–`AC-006`) on terminal `PR-4` (`closing_action: closes`) and complete Post-Merge Closeout (`TC-015`). | `documentation-agent` + `qa-agent` | `ROADMAP-SDLC-FRAMEWORK.md` (+ post-merge closeout PR) | `node scripts/validate-clearable-refs.mjs && node scripts/validate-root-doc-links.mjs && npm test` |

---

## 5. Test & Review Gate Strategy

| Verification Layer | Required? | Scope | Accountable Verifier |
|---|---|---|---|
| State-Machine & Parity Unit Tests | **Yes** | `TC-001`–`TC-003`: Cross-field parity (`risk_level`, `risk_tier`, `contains_pii`, `data_change_kind`), multi-branch `(from, to)`, E-1..E-4 `when` rejections (including Additive API), 10 baseline examples | `developer-agent` + `qa-agent` |
| Behavioral Security Review | **Yes (Slice 1)** | Verify Slice 1's fast-track conditions in `new-feature-workflow.yaml` and `validate-contracts.mjs` fail closed on any security/API/data impact and cannot weaken `Security Gate` | `security-reviewer` |
| Cross-Platform Skill & Template Parity | **Yes (Slice 2)** | `TC-013`: Verify all 9 review/skill files across `docs/`, `.agents/`, `.claude/`, and `.agent/` stay synchronized (`validate-skill-parity.mjs`: `0 drifted`) | `qa-agent` |
| Structured Cohort, Integrity & Dual-Digest CLI Tests | **Yes (Slice 3)** | `TC-004`–`TC-010`: Namespace separation (`RR-02`), `evaluatedItems` cohort (`RR-03`), `state_digest` & `ARCHIVE_LOCATION_AMBIGUOUS` (`exit 2`), Dual-Digest human-edit protection (`RR-05`), `wx` / atomic write | `developer-agent` + `qa-agent` |
| Independent Code Review Gate & Task Review | **Yes (Slice 1 & Slice 3)** | Both `.mjs`-touching slices carry dedicated `docs/records/qa/*-code-review.md` + QA `TASK_REVIEW.md` records pinned to `base_sha..head_sha` | `code-reviewer` + `qa-agent` (independent identities) |
| QA Static Logic Review | **Yes (Slice 1 & Slice 3)** | Source-level branch trace on `validate-contracts.mjs` parity/branch selection and `validate-metrics.mjs` precedence/Dual-Digest matrix | `qa-agent` |
| Stacked PR Readiness & State Projection Gates | **Yes (Every Slice)** | `TC-015`: `validate-pr-readiness.mjs` (`advances-only` on `PR-1`–`PR-3`, `closes` on `PR-4`), `compile-status-projection.mjs --check`, `validate-risk-register.mjs`, `validate-clearable-refs.mjs`, and `801+` baseline tests | `qa-agent` |

---

## 6. Verification Commands

```bash
# 1. Slice 1 — Contract validator parity, multi-branch fast-track, source-matrix repin, ADR & review gate
node --test test/validate-contracts.test.mjs
node scripts/validate-contracts.mjs
node scripts/repin-source-matrix.mjs
node scripts/validate-context-compatibility.mjs
node scripts/validate-context-budget.mjs
node scripts/adr-audit.mjs
node scripts/validate-clearable-refs.mjs
node scripts/validate-review-gate.mjs

# 2. Slice 2 — 9-file review policy, cross-platform skill parity & context budget
node scripts/validate-skill-parity.mjs
node scripts/validate-skill-catalog.mjs
node scripts/validate-context-budget.mjs
git diff --check

# 3. Slice 3 — Structured cohort metrics, Dual-Digest CLI & review gate
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

## 7. Rollback / Fallback Plan (Dependency-Aware)

| Scenario | Safe Rollback Action & Order | Blast Radius & Notes |
|---|---|---|
| **Slice 4** (`ROADMAP-SDLC-FRAMEWORK.md`) needs rollback | `git revert <slice-4-commit>` | Zero runtime/contract impact; completely independent leaf slice. |
| **Slice 2** (9 review policy/template/skill mirror files) needs rollback or Nit-cap tuning | `git revert <slice-2-commit>` and run `node scripts/validate-skill-parity.mjs` | Independent of Slices 1 and 3; reverting the single Slice 2 commit restores all 3 platform mirrors atomically (`0 drifted`). |
| **Slice 3** (`validate-metrics.mjs` + `METRICS.md`) defect discovered post-merge | `git revert <slice-3-commit>` and run `npm test` | Default `npm run validate:metrics` has no automatic CI merge-gate caller; `npm test` runs `test/validate-metrics.test.mjs`, so reverting Slice 3 cleanly restores baseline tests while leaving Slice 1 intact. |
| **Slice 1** (`validate-contracts.mjs` + `new-feature-workflow.yaml` + `INTENT.md`/`SPEC.md`) needs rollback | **If Slice 3 is already merged, revert in reverse dependency order (`Slice 3` → `Slice 1`)** (or retain `docs/templates/INTENT.md`), then run `node scripts/repin-source-matrix.mjs && npm test` | Respects the semantic dependency of `--emit-intent` on `INTENT.md` and keeps `required-source-matrix.json` SHA-256 hashes synchronized. |

---

## 8. Risks & Blockers

| ID | Risk / Blocker | Impact | Mitigation |
|---|---|---|---|
| **R-303-01 (Active Gate Blocker)** | Core policy, contract, and CLI behavior changes require Human Maintainer sign-off before `status:spec-ready`. | Cannot begin Slice 1–4 mutations autonomously. | Tracked in `RISKS.md` (`Open`); Spec v3 + Plan v3 + empirical probe evidence + `/dynamic-workflow` hardening presented on Issue #303; stopped cleanly at Human Approval Gate. |
| **R-303-02** | Operators could confuse `dispatch_ledger_expiry_rate` (14d bookkeeping TTL) with live subagent runtime timeout rate. | Misdiagnosis of operational causes. | Metric is explicitly named `dispatch_ledger_expiry_rate` in CLI output, `METRICS.md`, and generated `INTENT.md` drafts; runtime timeout is labeled `UNAVAILABLE_IN_V1 (deferred to M4 / Issue #35)`. |
| **R-303-03** | Unstarted `intake` work items diluting rework rate or stale/duplicate archive shards corrupting counts. | False-healthy `WITHIN_TARGET` or double-counting. | Denominator restricted strictly to `evaluatedItems` (visited `reworkSourceStates`), `state_digest` verified, and `ARCHIVE_LOCATION_AMBIGUOUS` rejected with `exit 2`. |
| **R-303-04** | `Ajv2020({ strict: false })` emitting `unknown format "date-time"` warnings to `stderr` when validating `durable-task-envelope.schema.json`. | Pollutes CLI `stderr` on clean threshold checks. | Compile `durable-task-envelope.schema.json` once with `validateFormats: false` + explicit RFC 3339 check and `digestTaskEnvelope()` verification. |
| **R-303-05** | Canonical Tier 3 context budget headroom (`25,842 / 30,000` approx tokens at `863306a`; `4,158` headroom). | Verbose prose in `dynamic-routing.md` could erode budget. | Keep `dynamic-routing.md` additions concise (`<= 450` approx tokens) and enforce `validate-context-budget.mjs` in Slice 1 & Slice 2. |
| **R-303-06** | Stacked PRs prematurely closing Issue `#303`, inheriting stale `status:verification-done` labels, or drifting across `.agents`/`.claude`/`.agent` skills. | Premature Issue closure, skipped QA gate, or `audit:skills` failure. | Mitigated by `DW-01` (9-file Slice 2 sync + `validate-skill-parity.mjs`) and `DW-02` (`closing_action: advances-only` on `PR-1`–`PR-3` + inter-slice label reset). |

---

## 9. Completion Contract & Next Handoff

- **Done when (for current Planning & Re-Review Hardening stage)**:
  1. Every finding in Comment `#6651546438` (`RR-01`–`RR-05`, Section 4, Section 10), proactively discovered validator seams (`planning -> implementing`, `Map` collision, `new-feature.md` sync, Ajv `stderr`), AND all 5 `/dynamic-workflow` execution refinements (`DW-01`–`DW-05`) are documented and aligned across Spec v3, Plan v3, Work Item record, Lessons Learned, `PROJECT_STATUS.md` (with reconciled projection markers), `TASK_LOG.md`, and `RISKS.md`.
  2. All repository validators (`validate-contracts.mjs`, `validate-context-budget.mjs`, `validate-clearable-refs.mjs`, `validate-review-gate.mjs`, `validate-project-state.mjs`, `compile-status-projection.mjs --check`, `validate-risk-register.mjs`, `validate-skill-parity.mjs`, `validate-root-doc-links.mjs`) pass with `exit 0`.
  3. Updated artifacts are pushed to `origin/feat/issue-303-ai-native-sdlc-playbook`, Issue `#303` is set to `phase:planning` with a single `## Acceptance Traceability Matrix`, and the GitHub comment is updated.
- **May proceed through**: Updating planning/work-item/project-state records, running local validators, pushing to `origin`, and updating GitHub Issue `#303` & reply comment.
- **Must stop for**: Human Maintainer policy approval (Spec v3 Section 7) and `status:spec-ready` before mutating core workflow policies, contracts, templates, skills, or runtime `.mjs` scripts.
- **Assumptions**: None silent; all three policy thresholds/parameters (`low`-risk non-API fast-track, reference `Nit Cap = 5`, and `dispatch_ledger_expiry_rate >= 10%` / `verified_rework_rate >= 15%` with `min-samples = 5`) are explicitly surfaced for Maintainer decision.

| To | Next Action | Reason | Required Evidence |
|---|---|---|---|
| **Human Maintainer** | `Human review` (`Dispatch State: blocked`, `Stop Reason: human_review_required`) | Review & approve Executive Spec v3 + `/dynamic-workflow`-hardened Plan v3 and grant `status:spec-ready` to start Slice 1 (`PR-1`) | Committed Spec v3 + Plan v3 + Work Item + Reconciled Project State on `origin/feat/issue-303-ai-native-sdlc-playbook` and updated Issue `#303` comment |
