# Issue #283 Skill Metadata and Catalog Rationalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task after Human approval of the plan. Tasks use checkbox syntax for tracking.

**Goal:** Reduce skill-trigger context while keeping routing distinctions, the exact portable inventory, and all current validation guarantees.

**Architecture:** `.agents/skills` remains canonical; `.claude/skills` and `.agent/skills` remain byte-identical mirrors. A focused validator derives inventory and description budgets from canonical files, then checks the detailed catalog and Vault index. Existing detailed procedures and the `SKILL_CATALOG.md` five-column row contract remain on-demand.

**Tech Stack:** Node.js >=22, ESM, `node:test`, existing `yaml` devDependency; no new dependencies.

**Spec:** `docs/records/sdd/2026-09-28-issue-283-skill-metadata-catalog-sdd.md`

## Global Constraints

- Every canonical skill `description` is at most 160 Unicode code points.
- The sum of canonical skill description lengths is at most 5,500 Unicode code points.
- All mirrored `SKILL.md` files remain byte-identical across `.agents/`, `.claude/`, and `.agent/`.
- Skill inventory is derived from `.agents/skills`; do not introduce an authoritative literal count.
- Preserve the `SKILL_CATALOG.md` five-column row contract, selection rules, skill-body procedures, approval boundaries, and CI parity.
- No new runtime dependency; use the existing `yaml` package for frontmatter parsing.

## Review Focus

1. A skill directory exists only in a mirror, or a canonical skill is missing a mirror — tests require exact directory-set equality and fail closed.
2. A canonical `SKILL.md` has malformed/missing frontmatter or an empty description — fixture tests require a diagnostic, not a silent omission.
3. Description boundaries include astral Unicode characters — tests pin code-point counting at 160 accepted / 161 rejected and total 5,500 accepted / 5,501 rejected.
4. Catalog and Vault links are stale, missing, or duplicated — fixture tests compare exact sets, not just counts.
5. Nearby QA/API skills overlap — routing tests preserve the distinct design, browser execution, contract verification, and hand-script execution routes for the five specified skills.

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | GitHub Issue #283 |
| Change Type | Framework / Meta Change |
| Risk Level | Medium |
| Owner | Documentation Agent; Developer Agent for validator; independent QA/reviewer before human approval |
| Target Branch / Ticket | `codex/issue-283-skill-catalog`, Issue #283 |

## 2. Inputs Reviewed

| Artifact | Status | Notes |
|---|---|---|
| Issue #283 | Available locally | Source scope; verify current remote labels before lifecycle transition because GitHub API was unavailable during planning. |
| Parent SDD #280 / ADR-0034 | Approved | Governs budgets, progressive disclosure, and preservation of parity. |
| Child SDD #283 | Accepted | `docs/records/sdd/2026-09-28-issue-283-skill-metadata-catalog-sdd.md` |
| `SKILL_CATALOG.md` | Available | Current five-column row contract and overlap-routing source. |
| `validate-skill-parity` | Baseline PASS | 39 skills in sync; its current implementation does not detect mirror-only directories. |
| `docs/vault/00-Index.md` | Known gap | Claims 37 skills; canonical inventory has 39 and index omits `release-readiness-checklist` and `static-logic-review`. |
| Full baseline tests | Environment-limited | 486/514 passed; 28 failed because this worktree has no installed `ajv`/`yaml`. Run `npm ci` before implementation verification; do not interpret the baseline as a code regression. |

## 3. Affected Areas

| Area | Files / Components | Expected Change |
|---|---|---|
| Skill inventory validator | `scripts/validate-skill-catalog.mjs` | Derive skill set, parse frontmatter, enforce budgets, and compare exact inventory membership. |
| Validator tests | `test/validate-skill-catalog.test.mjs` | TDD fixtures for malformed input, boundaries, duplicates, stale/missing entries, and mirror-only directories. |
| Routing catalog | `docs/operating-model/SKILL_CATALOG.md`, `test/validate-contracts.test.mjs` | Keep selection rules and five columns; group detailed skills under six domains and pin overlap boundaries. |
| Vault index | `docs/vault/00-Index.md` | Remove the stale literal count and add links for all 39 canonical skills. |
| Skill metadata | `.agents/skills/*/SKILL.md`, `.claude/skills/*/SKILL.md`, `.agent/skills/*/SKILL.md` | Shorten all 39 canonical descriptions and mirror the exact resulting files. |
| Validation entry points | `package.json`, `.github/workflows/validate-contracts.yml`, `.gitlab-ci.yml`, CI-parity tests | Register the new validator on both CI hosts and preserve command parity. |
| Pinned context sources | `test/fixtures/context-pack-v1/required-source-matrix.json` | Recompute affected hashes with the existing repin tool; no manual hash editing. |

### Detailed catalog category assignment

Each skill appears once in the detailed `Available Skills` directory:

| Category | Skill IDs |
|---|---|
| Workflow | `ba-requirement-analysis`, `documentation-closeout`, `dynamic-workflow`, `engineering-postmortem`, `git-workflow-and-versioning`, `implementation-planning`, `management-status-update`, `release-readiness-checklist`, `requirement-brainstorming`, `verification-before-completion` |
| Engineering | `backend-patterns`, `code-review-gate`, `coding-standards`, `debugging-discipline`, `sa-architecture-design`, `tdd-implementation` |
| QA | `defect-analysis`, `functional-test-design`, `js-unit-testing`, `mutation-testing`, `performance-testing`, `python-unit-testing`, `qa-playwright-testing`, `static-logic-review`, `test-quality-discipline` |
| API | `api-compliance-patterns`, `api-contract-testing`, `api-integration-patterns`, `api-mocking-sandbox`, `api-observability-monitoring`, `api-security-patterns`, `api-test-design`, `api-testing-tooling`, `api-versioning-deprecation` |
| Frontend | `frontend-react-patterns`, `frontend-ui-engineering`, `frontend-visual-design` |
| Security / Data | `data-config-change`, `security-review` |

## 4. Task Breakdown

### Task 1 — Write inventory-validator contract tests (QA/Developer)

**Files:** Create `test/validate-skill-catalog.test.mjs`.

**Interfaces:** Tests will import `validateSkillCatalog(rootDir)` from `scripts/validate-skill-catalog.mjs`, returning `{ errors, canonicalSkillCount, descriptionCount, totalDescriptionCodePoints }`.

- [ ] Build temporary repository fixtures with canonical skills, both mirrors, catalog rows, and Vault links.
- [ ] Add tests named `accepts_exact_inventory_and_description_budgets`, `rejects_missing_or_mirror_only_skill_directories`, `rejects_missing_stale_or_duplicate_catalog_entries`, `rejects_missing_stale_or_duplicate_vault_links`, `rejects_invalid_or_empty_skill_frontmatter`, `accepts_160_code_points_and_rejects_161`, and `accepts_5500_total_code_points_and_rejects_5501`.
- [ ] Run `node --test test/validate-skill-catalog.test.mjs`; expected RED because the module does not yet exist.
- [ ] Commit as `test: define issue 283 skill inventory contract`.

### Task 2 — Implement the derived inventory and budget validator (Developer)

**Files:** Create `scripts/validate-skill-catalog.mjs`.

**Interfaces:** Export `validateSkillCatalog(rootDir = process.cwd())` with the Task 1 result shape. Use the existing `yaml` parser. Count Unicode code points with `Array.from(description).length`.

- [ ] Parse only `SKILL.md` frontmatter; report malformed YAML, missing/empty name or description, and missing canonical files as errors.
- [ ] Compare canonical, Claude, and Antigravity skill directory-name sets exactly, including mirror-only directories.
- [ ] Enforce each description <=160 and aggregate canonical description total <=5,500 code points.
- [ ] Parse skill IDs only inside the detailed catalog directory and require each canonical ID exactly once; reject stale and duplicate IDs.
- [ ] Parse `.agents/`, `.claude/`, and `.agent/` skill links in `docs/vault/00-Index.md`; require one link per canonical ID per platform and reject stale, missing, or duplicate links.
- [ ] Re-run the focused test file; expected PASS for fixture cases. The real repository may still report current description-budget/catalog gaps until Tasks 3–4.
- [ ] Commit as `feat: validate skill catalog inventory and metadata`.

**Checkpoint A (after Tasks 1–2):** Focused validator tests pass; inspect that malformed inputs fail closed and the implementation uses no hard-coded skill count.

### Task 3 — Reorganize catalog and reconcile Vault inventory (Documentation/QA)

**Files:** Modify `docs/operating-model/SKILL_CATALOG.md`, `docs/vault/00-Index.md`, `test/validate-contracts.test.mjs`, and the Task 1 validator tests if parser fixtures need category headings.

- [ ] Add the six category headings and move each detailed row into exactly one category using the assignment table above; preserve the five-column header and existing special-purpose selection sections.
- [ ] Add the two missing Vault links; remove “All 37 skills” and replace it with count-free wording.
- [ ] Add `vault_index_has_no_manual_skill_count` so the old 37-skill claim cannot silently return.
- [ ] Add `groups_catalog_rows_under_the_six_domains_without_changing_row_schema` and `vault_index_links_every_canonical_skill_exactly_once` coverage.
- [ ] Add overlap assertions for `functional-test-design` vs `qa-playwright-testing`, and for `api-test-design`, `api-contract-testing`, and `api-testing-tooling`; assert the distinctions and next routes remain explicit.
- [ ] Run `node --test test/validate-contracts.test.mjs test/validate-skill-catalog.test.mjs`; expected catalog/inventory portions PASS. Description-budget checks remain red until Task 4.
- [ ] Commit as `docs: group skill catalog and reconcile vault inventory`.

### Task 4 — Shorten all canonical skill descriptions and sync mirrors (Documentation/Developer)

**Files:** Modify the `description` frontmatter field in each of the 39 `.agents/skills/*/SKILL.md` files and copy each complete canonical file byte-for-byte to the matching `.claude/skills/*/SKILL.md` and `.agent/skills/*/SKILL.md` paths.

- [ ] Record the before-state description count/aggregate from the validator for comparison.
- [ ] Rewrite each description to state only its task and precise activation trigger; keep each <=160 code points and the total <=5,500. Preserve detailed exclusions/recipes in skill bodies or the on-demand catalog; do not alter procedures.
- [ ] Copy canonical files to both mirrors without platform-specific edits.
- [ ] Run `node scripts/validate-skill-catalog.mjs` and `npm run validate:skill-parity`; expected 39 canonical skills, zero inventory/budget errors, 39/39 byte-identical mirrors.
- [ ] Run the five overlap tests from Task 3 and manually review each changed description against its full skill body for trigger clarity and lost unique guidance.
- [ ] Commit as `docs: shorten mirrored skill trigger metadata`.

**Checkpoint B (after Tasks 3–4):** Run catalog/metadata tests, skill parity, and `npm run validate:context-budget`; all must pass before CI wiring.

### Task 5 — Wire the catalog validator into required CI paths (Developer)

**Files:** Modify `package.json`, `.github/workflows/validate-contracts.yml`, `.gitlab-ci.yml`, and the existing CI parity test file (`test/validate-ci-parity.test.mjs`, or its current equivalent confirmed before editing).

- [ ] Register `validate:skill-catalog` as `node scripts/validate-skill-catalog.mjs`.
- [ ] Add the validator invocation to GitHub's `validate` job and the matching GitLab validation job.
- [ ] Add a parity assertion proving the validator runs on both hosts and cannot be hidden by an empty/missing job.
- [ ] Run `npm run validate:skill-catalog`, `npm run validate:ci-parity`, and the focused CI parity tests; expected PASS.
- [ ] Commit as `ci: enforce skill catalog inventory validation`.

### Task 6 — Refresh pinned hashes and complete independent verification (Developer → Reviewer/QA)

**Files:** Update only the hashes produced by `npm run repin:source-matrix`; add implementation/review evidence under `docs/records/qa/` as required by the framework workflow.

- [ ] Run `npm run repin:source-matrix`; inspect that only affected `sha256` values change.
- [ ] Run `npm test` and every command below; attach exact outputs/commit SHA to the implementation handoff.
- [ ] Request independent code review scoped to catalog ownership, description boundaries, validator fail-closed behavior, and CI parity; then route to QA for AC verification.
- [ ] Address findings within the project's rework policy; do not weaken tests or validations to obtain green status.
- [ ] Commit the source-matrix update and required evidence atomically by concern, using `git-workflow-and-versioning`.

**Checkpoint C (after Tasks 5–6):** All required validators and the full suite pass; independent review and QA evidence are recorded before advancing to human review.

## 5. Test Strategy

| Test Type | Required? | Scope | Owner |
|---|---|---|---|
| Unit/contract tests | Yes | Inventory sets, parser failure paths, 160/161 and 5,500/5,501 code-point boundaries, six catalog groups, overlap distinctions | Developer + QA |
| API / E2E | No | No application API or UI behavior changes | N/A |
| Regression | Yes | Full Node test suite and every required validator | QA |
| Independent code review | Yes | Skill metadata clarity, source-of-truth ownership, CI parity, and no policy weakening | Reviewer |
| Security review | No | No security-control or sensitive-data behavior changes; human approval still applies to this framework/meta change | N/A |

## 6. Verification Commands

Run `npm ci` first in the worktree because the current baseline has no `node_modules`; then:

```bash
node --test test/validate-skill-catalog.test.mjs
node --test test/validate-contracts.test.mjs test/validate-ci-parity.test.mjs
npm run validate:skill-catalog
npm run validate:skill-parity
npm run validate:adapter-parity
npm run repin:source-matrix
npm run validate:skill-catalog
npm run validate:context-budget
npm run validate:context-compatibility
npm run validate:contracts
npm run validate:ci-parity
npm run validate:edit-guards
npm run validate:project-state
npm test
git diff --check
```

## 7. Rollback / Fallback Plan

| Scenario | Rollback / Fallback Action | Owner |
|---|---|---|
| Validator or metadata change blocks unrelated workflows | Revert the Issue #283 PR as one unit, restoring descriptions, catalog/Vault inventories, CI wiring, and pinned hashes together. | Developer / Human Maintainer |
| Existing descriptions contain unique policy not yet available on demand | Keep that detail in the canonical skill body/catalog and revise the description; do not delete the guidance. | Documentation Agent |
| Model-level overlap quality remains uncertain | Keep Issue #284 as the rollout/evaluation gate; do not claim model-routing quality from static tests. | QA Agent / Human Maintainer |

## 8. Risks / Blockers

| Risk / Blocker | Impact | Mitigation / Next Action |
|---|---|---|
| Dependencies are absent in the isolated worktree | Full baseline had 28 dependency-load failures | Run `npm ci` before implementation verification; if network/cache blocks it, report and stop before claiming full-suite results. |
| Aggressive shortening blurs triggers or drops the only copy of a boundary | Misrouting or safety regression | Review all 39 descriptions against full bodies and catalog; keep detailed guidance on demand; independent QA checks the named overlap set. |
| Catalog/Vault parsers accept duplicate or stale IDs | Inventory drift returns silently | Use exact-set and duplicate-count tests, including mirror-only and duplicate-link fixtures. |
| GitHub Issue phase/status may be stale because API was unavailable | Readiness gate may reject the PR | Before implementation handoff, verify Issue #283 labels; after plan approval, advance to `phase:planning` and add `status:spec-ready` only when the approved SDD and plan are both attached. |

## 9. Handoff

| To | Reason | Required Evidence |
|---|---|---|
| Documentation Agent / Developer Agent | Implement approved plan in TDD order | Approved SDD and plan, clean branch, dependency-ready baseline, failing tests |
| Independent Reviewer | Review the exact candidate after implementation | Base/head SHAs, changed-file inventory, validator/test outputs, documented limitations |
| QA Agent | Verify acceptance criteria independently | Approved SDD, AC-to-evidence map, focused/full test outputs, parity/context/CI results |
| Human Maintainer | Final framework/meta approval | Reviewer and QA outcomes, unresolved risks, linked Issue/PR readiness |

## Execution Notes

- Tasks are sequential; each changes shared catalog/inventory/metadata contracts. No safe parallel split is planned.
- TDD applies to the validator, inventory contracts, and CI behavior. Description edits are documentation changes but must be test-gated by the new budgets, parity, and overlap contracts.
- No production/security-sensitive behavior, database migration, or external runtime is in scope.
- Parent design accepted; implementation does not begin until this plan is reviewed/approved and an execution method is selected.
