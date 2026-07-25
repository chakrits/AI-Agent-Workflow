# Work Item: Issue #95 — Workflow Playbooks Quality Upgrade — BA Requirement Analysis

## Source
- Issue: https://github.com/chakrits/AI-Agent-Workflow/issues/95
- Umbrella issue: N/A
- Boss directive: 2026-07-25 (close the two review-flagged requirement gaps + normal BA pass)
- Supporting spec: `docs/superpowers/specs/2026-07-25-workflow-playbooks-quality-upgrade.md`

## Classification
- Change type: Documentation-only
- Risk level: Low–Medium
- Workflow route: Documentation Agent → Reviewer → Human Review/Merge
- Status at time of this analysis: `phase:requirements`, blocked on two review gaps (this document is the BA response closing both)

## Purpose

The most recent review comment on Issue #95 identified two concrete gaps blocking the issue from leaving `phase:requirements`:

1. No explicit per-playbook wiki-link mapping exists (Fix A).
2. Test-file placement for the new regression coverage is undecided.

This document closes both gaps, and performs a normal BA requirement-discovery pass scoped to what remains ambiguous in Issue #95 as a whole. All proposed link targets below were verified to exist on disk with `test -f` before inclusion; none are invented.

---

## A. Per-Playbook Wiki-Link Mapping (Fix A)

### A.0 Critical finding: the issue's and spec's own contract-link example uses the wrong relative depth

The issue body and the spec (`Fix A > Change pattern`) both show:

```markdown
Use [[../../contracts/bug-fix-workflow.yaml|bug-fix-workflow.yaml]] as the canonical Bug Fix policy.
```

This is **one directory level too deep**. `docs/workflows/` and `docs/contracts/` are siblings under `docs/`; from a file in `docs/workflows/`, the correct relative path to a contract is `../contracts/...`, not `../../contracts/...`. Verified by:

- `docs/vault/00-Index.md`'s own established depth convention (e.g. `[[../workflow/role-definitions.md|...]]` reaches `docs/workflow/` from `docs/vault/`, which sits at the same depth as `docs/workflows/`).
- Direct path normalization: `docs/workflows/../contracts/bug-fix-workflow.yaml` → `docs/contracts/bug-fix-workflow.yaml` (exists); `docs/workflows/../../contracts/bug-fix-workflow.yaml` → `contracts/bug-fix-workflow.yaml` (does not exist).

The spec's **skill** example (`[[../../.agents/skills/debugging-discipline/SKILL.md|debugging-discipline]]`) is correct — skills are two levels up from `docs/workflows/` (`docs/workflows/` → `docs/` → repo root → `.agents/skills/...`).

**Correct relative-path prefix table, from any file in `docs/workflows/*.md`:**

| Target category | Correct prefix | Example |
|---|---|---|
| Contract (`docs/contracts/*.yaml`) | `../contracts/` | `[[../contracts/bug-fix-workflow.yaml\|bug-fix-workflow.yaml]]` |
| Template (`docs/templates/*.md`) | `../templates/` | `[[../templates/SDD.md\|SDD.md]]` |
| Canonical workflow doc (`docs/workflow/*.md`) | `../workflow/` | `[[../workflow/quality-gates.md\|quality-gates.md]]` |
| Operating-model doc (`docs/operating-model/*.md`) | `../operating-model/` | `[[../operating-model/SKILL_CATALOG.md\|SKILL_CATALOG.md]]` |
| Skill (`.agents/skills/*/SKILL.md`) | `../../.agents/skills/` | `[[../../.agents/skills/debugging-discipline/SKILL.md\|debugging-discipline]]` |
| Root doc (`AGENTS.md`, `DECISIONS.md`, `TASK_LOG.md`, etc.) | `../../` | `[[../../AGENTS.md\|AGENTS.md]]` |

**This correction must be applied to the issue/spec text (or explicitly called out to the implementer) before implementation starts.** If the issue's literal example is copied verbatim, every contract link across `bug-fix.md`, `bug-debug-fix.md`, and `new-feature.md` will resolve to a non-existent path and fail the "every wiki-link target resolves" regression test and Acceptance Criterion.

### A.1 Mapping table

Columns: **playbook** | **proposed target (corrected relative path)** | **type** | **verified exists** | **named in current prose?** (mechanical find-replace vs. requires new prose)

| Playbook | Proposed target | Type | Verified | Named in current prose? |
|---|---|---|---|---|
| `bug-debug-fix.md` | `../contracts/bug-fix-workflow.yaml` | contract | Yes | Yes (L40, plain path already present — keep plain text, add wiki link alongside) |
| `bug-debug-fix.md` | `../../.agents/skills/debugging-discipline/SKILL.md` | skill | Yes | Yes (L26, backtick-named) — mechanical |
| `bug-debug-fix.md` | `../../.agents/skills/engineering-postmortem/SKILL.md` | skill | Yes | Yes (L33, backtick-named) — mechanical |
| `bug-fix.md` | `../contracts/bug-fix-workflow.yaml` | contract | Yes | Yes (L9, plain path already present — keep plain text, add wiki link alongside) |
| `ci-failure-debug.md` | `../../.agents/skills/debugging-discipline/SKILL.md` | skill | Yes | Near (L14 flow step reads "Debugging Discipline", not backtick-named) — minor prose rewording needed |
| `code-review-gate.md` | `../../.agents/skills/verification-before-completion/SKILL.md` | skill | Yes | Yes (L12, backtick-named) — mechanical |
| `code-review-gate.md` | `../../.agents/skills/code-review-gate/SKILL.md` | skill | Yes | Yes (L14, backtick-named, same name as file) — mechanical |
| `code-review-gate.md` | `../templates/CODE_REVIEW_REQUEST.md`, `../templates/CODE_REVIEW_FINDINGS.md` | template | Yes | No — not named today; natural fit once Fix C adds a Handoff section (see Open Question 1) |
| `config-change.md` | `../../.agents/skills/data-config-change/SKILL.md` | skill | Yes | No — inferred; 8-line file names no skill/template today; requires new prose |
| `config-change.md` | `../templates/CONFIG_CHANGE_PLAN.md` | template | Yes | No — inferred; natural fit once Fix C adds Required Outputs/Handoff |
| `data-change.md` | `../templates/DATA_CHANGE_PLAN.md` | template | Yes | Yes (L9, backtick-named) — mechanical |
| `data-change.md` | `../templates/TEST_REPORT.md` | template | Yes | Yes (L11, backtick-named) — mechanical |
| `data-change.md` | `../templates/RELEASE_PLAN.md` | template | Yes | Yes (L12, backtick-named) — mechanical |
| `data-change.md` | `../../.agents/skills/data-config-change/SKILL.md` | skill | Yes | No — inferred; requires new prose |
| `feature-discovery-to-plan.md` | `../../.agents/skills/requirement-brainstorming/SKILL.md` | skill | Yes | Yes (L12, backtick-named) — mechanical |
| `feature-discovery-to-plan.md` | `../../.agents/skills/implementation-planning/SKILL.md` | skill | Yes | Yes (L18, backtick-named) — mechanical |
| `feature-discovery-to-plan.md` | `../templates/REQUIREMENT_DISCOVERY.md` | template | Yes | Yes (L25–26, backtick-named) — mechanical |
| `feature-discovery-to-plan.md` | `../templates/SDD.md` | template | Yes | Yes (L27, backtick-named) — mechanical |
| `feature-discovery-to-plan.md` | `../templates/TECHNICAL_DESIGN.md` | template | Yes | Yes (L27, backtick-named) — mechanical |
| `feature-discovery-to-plan.md` | `../templates/IMPLEMENTATION_PLAN.md` | template | Yes | Yes (L28, backtick-named) — mechanical |
| `functional-test-design.md` | `../../.agents/skills/functional-test-design/SKILL.md` | skill | Yes | Yes (L17, backtick-named) — mechanical |
| `functional-test-design.md` | `../templates/FUNCTION_TEST_REPORT.md` | template | Yes | Near (L21 says "Function Test Report", not filename) — minor rewording |
| `functional-test-design.md` | `../templates/FOCUSED_FUNCTIONAL_TEST_PACK.md` | template | Yes | Near (L21 says "Focused Test Pack", not filename) — minor rewording |
| `new-feature.md` | `../contracts/new-feature-workflow.yaml` | contract | Yes | Will be Yes once Fix B lands (Fix B is the deliverable that adds this text; sequenced before Fix A per the issue's stated order) — mechanical after Fix B |
| `new-feature.md` | `../templates/PROJECT_BRIEF.md` | template | Yes | Yes (L9) — mechanical |
| `new-feature.md` | `../templates/REQUIREMENT_DISCOVERY.md` | template | Yes | Yes (L10) — mechanical |
| `new-feature.md` | `../templates/SDD.md` | template | Yes | Yes (L11) — mechanical |
| `new-feature.md` | `../templates/TECHNICAL_DESIGN.md` | template | Yes | Yes (L12) — mechanical |
| `new-feature.md` | `../templates/TEST_PLAN.md` | template | Yes | Yes (L13) — mechanical |
| `new-feature.md` | `../templates/TEST_REPORT.md` | template | Yes | Yes (L14) — mechanical |
| `new-feature.md` | `../templates/RELEASE_PLAN.md` | template | Yes | Yes (L15) — mechanical |
| `stabilize-core.md` | `../operating-model/AGENT_OPERATING_MODEL.md` | canonical doc | Yes | Yes (L38) — mechanical |
| `stabilize-core.md` | `../operating-model/SKILL_CATALOG.md` | canonical doc | Yes | Yes (L39) — mechanical |
| `stabilize-core.md` | `../operating-model/AGENT_EVALUATION_CHECKLIST.md` | canonical doc | Yes | Yes (L40) — mechanical |
| `stabilize-core.md` | `../../AGENTS.md` | root doc | Yes | Yes (L41) — mechanical |
| `stabilize-core.md` | `../../TASK_LOG.md` | root doc | Yes | Yes (L42) — mechanical |
| `stabilize-core.md` | `../templates/COMPLETION_CHECK.md` | template | Yes | Yes (L56) — mechanical |
| `tdd-implementation-flow.md` | `../../.agents/skills/tdd-implementation/SKILL.md` | skill | Yes | Yes (L12) — mechanical |
| `tdd-implementation-flow.md` | `../../.agents/skills/verification-before-completion/SKILL.md` | skill | Yes | Yes (L14) — mechanical |
| `tdd-implementation-flow.md` | `../../.agents/skills/code-review-gate/SKILL.md` | skill | Yes | Yes (L16) — mechanical |
| `validated-bug-postmortem.md` | `../../.agents/skills/engineering-postmortem/SKILL.md` | skill | Yes | Near (L21 says "Engineering Postmortem Skill", not backtick-named) — minor rewording |
| `validated-bug-postmortem.md` | `../../TASK_LOG.md` | root doc | Yes | Yes (L43) — mechanical |
| `validated-bug-postmortem.md` | `../templates/BUG_POSTMORTEM.md` | template | Yes | No — inferred; not literally named (text says `docs/postmortems/<ticket>-<date>.md` as the output destination, not the template); flagged in Open Questions for confirmation |

**Coverage:** all 12 files in the issue's target list have at least one verified target, satisfying the "every playbook contains at least one outbound wiki link" Acceptance Criterion once implemented. 8 of 12 files (`bug-debug-fix.md`, `bug-fix.md`, `feature-discovery-to-plan.md`, `functional-test-design.md`, `new-feature.md`, `stabilize-core.md`, `tdd-implementation-flow.md`, `validated-bug-postmortem.md`) can be satisfied almost entirely by mechanical find-replace of existing prose. 4 files (`ci-failure-debug.md`, `code-review-gate.md`, `config-change.md`, `data-change.md`) need at least one small piece of new or reworded prose, and `code-review-gate.md`/`config-change.md` specifically depend on Fix C content for their most natural link targets — see Open Question 1 below.

---

## B. Test-File Placement Recommendation (Fix A/C regression coverage)

**Recommendation: place all new regression coverage (contract-reference test, wiki-link target-resolution test, five-playbook structure test) in a new file, `test/validate-workflow-playbooks.test.mjs`.** Do not add them to `test/validate-contracts.test.mjs`.

**Rationale:**

1. **Per-feature file convention already exists and is the dominant pattern in `test/`.** The repo has 17 files under `test/`, and 8 of them (`validate-adr-audit`, `validate-context-budget`, `validate-metrics`, `validate-project-state`, `validate-review-gate`, `validate-risk-register`, `validate-skill-parity`, `validate-skill-usage`) are each a dedicated file for one governance/documentation concern, even though several of those concerns are just as "documentation-adjacent" as playbook structure. Adding a ninth topic to `validate-contracts.test.mjs` runs against, not with, that convention.
2. **`validate-contracts.test.mjs` is already a 1,353-line grab-bag, not a pure contract-YAML file.** It already contains non-contract checks (`SKILL_CATALOG.md` naming, Frontend UI Engineering discoverability, the `AGENTS.md` Always/Ask-First/Never boundary, `requirement-brainstorming` adapter parity) alongside the state-machine contract tests. So the "thematic purity" argument for a new file is weaker than it looks — the stronger argument is pure size and per-feature-file precedent (point 1), not topical separation.
3. **No `package.json` change is required either way.** `package.json`'s `test` script is `"node --test"` with no file enumeration; Node's test runner auto-discovers `test/**/*.test.mjs`, so a new file is picked up automatically. This removes one candidate risk from the decision.
4. **A new file does not need a backing `scripts/validate-*.mjs` script to be consistent with existing precedent.** Most `test/*.test.mjs` files pair 1:1 with a `scripts/validate-*.mjs` (e.g. `validate-qa-evidence.mjs` ↔ `test/qa-evidence.test.mjs`), but `validate-contracts.test.mjs` itself already contains several prose/content-assertion tests with no dedicated script (the `SKILL_CATALOG.md` naming test, the `AGENTS.md` boundary test). A new `validate-workflow-playbooks.test.mjs` with direct `readFile`/`assert.match` checks and no companion script is therefore consistent with existing precedent inside the very file it would otherwise be added to.
5. **Maintainability.** A 1,353-line file is already large enough to slow down review and search; adding ~3 more unrelated tests compounds that without a corresponding benefit, since the new tests can stand alone with zero cross-references to the existing contract-state-machine fixtures.

---

## C. BA Pass on Issue #95 (scoped to ambiguity only)

### Confirmed Facts

| # | Fact | Source / Reference |
|---|---|---|
| 1 | 12 files exist in `docs/workflows/`; none currently contain `[[` | `ls docs/workflows/*.md`; direct read of all 12 files |
| 2 | All 39 proposed wiki-link targets in the Part A mapping exist on disk | `test -f` verification, this session |
| 3 | The issue's/spec's canonical contract-link example uses the wrong relative depth (`../../contracts/...` instead of `../contracts/...`) | Path normalization + `docs/vault/00-Index.md` depth convention, this session |
| 4 | `package.json`'s `test` script (`node --test`) auto-discovers `test/*.test.mjs` with no enumeration to update | `package.json:7` |
| 5 | `docs/workflows/*.md` files are not in `scripts/validate-context-budget.mjs`'s `CANONICAL_FILES` list | `scripts/validate-context-budget.mjs:19-28` — Fix A/Fix C content growth does not threaten the 30,000-token context-budget CI gate |
| 6 | `test/validate-contracts.test.mjs` currently has exactly one test referencing `docs/workflows/` — the `bug-fix.md` contract-path assertion at line ~106-107 | `grep -rn "docs/workflows" test/*.mjs` |

### Assumptions

| # | Assumption | Impact if Wrong | Validation Needed |
|---|---|---|---|
| 1 | `docs/templates/BUG_POSTMORTEM.md` is an appropriate Fix A link target for `validated-bug-postmortem.md`, even though it isn't literally named in current prose | Low — cosmetic choice; if wrong, drop this one target and keep only the `engineering-postmortem` skill link | Confirm with Documentation Agent/Boss during implementation |
| 2 | The wiki-link target-resolution regression test only needs to check the resolved file path exists on disk, not that Obsidian itself renders the link correctly | Low — no live Obsidian instance runs in CI today | None; consistent with existing test conventions in this repo |

### Open Questions

| # | Question | Owner | Blocks Progress? |
|---|---|---|---|
| 1 | The issue mandates order Fix B → Fix A → Fix C, but `config-change.md`, `data-change.md`'s skill link, and `code-review-gate.md`'s Handoff-template links have no natural target in current prose — their most natural targets only exist once Fix C's Gate/Handoff sections are written. Should the order be changed to **B → C → A** so wiki links are authored once against final content, or should Fix A add lower-value inferred links now (per Part A) and accept that those 4 files may need a second small edit after Fix C? Recommendation: **B → C → A** — cleaner, avoids double-editing. | PM / Documentation Agent | Yes — must be settled before implementation starts, since it changes the issue's stated Implementation Order |
| 2 | Should the issue/spec text's incorrect `../../contracts/...` example (Part A.0) be corrected in the issue/spec before implementation, or is a one-line callout in the implementation handoff sufficient? | Documentation Agent | Yes — high-value fix; if copied verbatim it fails the "every wiki-link target resolves" AC on the first file touched |
| 3 | Test-file placement — resolved by this document (Part B: new `test/validate-workflow-playbooks.test.mjs`) | N/A | No — closed by this analysis |
| 4 | `AGENTS.md`'s Completion Rule requires an ADR when a decision "excludes/defers/rejects an option." Part B's recommendation rejects "add tests to `validate-contracts.test.mjs`" in favor of a new file. Does this rise to ADR-worthy, or is it a routine test-file-organization call beneath the ADR threshold enforced by `scripts/adr-audit.mjs`? | Documentation Agent / Boss | No — but should be resolved before the work item is marked complete, to avoid tripping the ADR-ratio audit |
| 5 | Is `docs/templates/BUG_POSTMORTEM.md` the intended Fix A target for `validated-bug-postmortem.md` (see Assumption 1), or should that playbook link only to the `engineering-postmortem` skill? | BA / Documentation Agent | No — low materiality |

### Scope

**In scope** (unchanged from the issue): Fix B (`new-feature.md` contract reference), Fix A (outbound wiki links across all 12 playbooks, per the Part A mapping and Part A.0 path correction), Fix C (expand the 5 thin playbooks with Use-When/Gate/Handoff sections), plus the new `test/validate-workflow-playbooks.test.mjs` regression file (Part B).

**Out of scope** (unchanged from the issue/spec): merging `bug-fix.md` and `bug-debug-fix.md`; a repository-wide playbook schema or CI framework; Mermaid diagrams; any runtime/API/database/deployment behavior change.

### Business Rules

| Rule ID | Rule | Source | Impacted Area |
|---|---|---|---|
| BR-001 | Wiki-link additions must preserve every plain-text canonical path that an existing or new test asserts via regex (e.g. `docs/contracts/bug-fix-workflow.yaml` at `test/validate-contracts.test.mjs:107`, and the new `docs/contracts/new-feature-workflow.yaml` assertion added by Fix B) | Review comment + spec's "Critical constraint" | Fix A, all 12 files |
| BR-002 | Relative-path prefixes from `docs/workflows/*.md` must follow the corrected table in Part A.0 (`../contracts/`, `../templates/`, `../workflow/`, `../operating-model/`, `../../.agents/skills/...`, `../../<root-doc>`) — not the issue's literal `../../contracts/...` example | This analysis, Part A.0 | Fix A, all 12 files |
| BR-003 | Every wiki-link target must be re-verified to exist on disk at implementation/PR time, not only at BA-analysis time, since files can move between now and implementation | Standard practice; this analysis's targets were verified 2026-07-25 | Fix A |

### Risk Notes

| Risk ID | Risk / Edge Case | Impact | Suggested Coverage |
|---|---|---|---|
| R-001 | If the issue's literal (incorrect) contract-link example is copied verbatim, every contract wiki link (`bug-fix.md`, `bug-debug-fix.md`, `new-feature.md`) 404s in Obsidian and fails the wiki-link target-resolution regression test | Medium — would fail CI and require a rework pass across 3 files | Apply BR-002; state the correction explicitly in the implementation handoff, not just this record |
| R-002 | `config-change.md` and `data-change.md` are the thinnest files; forcing "at least one outbound wiki link" before Fix C's content exists risks either a low-value inferred link or resequencing | Low–Medium — cosmetic/sequencing risk only, no functional break | Resolve Open Question 1 (recommend B → C → A) before implementation starts |
| R-003 | Fix A (markup across 12 files) + Fix C (~100 new lines across 5 files) increase the size of `docs/workflows/*.md` | Verified **not** a risk — these files are absent from `scripts/validate-context-budget.mjs`'s `CANONICAL_FILES` list, so the 30,000-token context-budget CI gate is unaffected | None needed; stated here so it doesn't need re-deriving during implementation |

## Status: Analysis complete (2026-07-25) — Open Questions 1 and 2 resolved and adopted into `docs/superpowers/specs/2026-07-25-workflow-playbooks-quality-upgrade.md` (B → C → A order, corrected relative-path table). Open Question 4 (ADR-worthiness of the test-file/order decisions) resolved: routine test-organization/sequencing calls, beneath the ADR threshold — no ADR required. Open Question 5 (`BUG_POSTMORTEM.md` target) resolved: include the link only if the file exists on disk at implementation time, drop it otherwise. Issue #95 is ready to move from `phase:requirements` to `phase:development`.
