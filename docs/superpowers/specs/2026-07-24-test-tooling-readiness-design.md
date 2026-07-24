# Test-Tooling Readiness Design

## Goal

Prepare this framework repo so that when it is cloned per-target-app (per `scripts/reset-to-template.mjs`'s existing deployment model) and a real runtime app is added, test tooling wiring for E2E, API, unit, and mutation testing is fast and consistent — without installing any live dependency in this framework repo itself, since this repo has no target application to test against today.

This extends the precedent already established by the `api-contract-testing`, `performance-testing`, and `mutation-testing` skills: document/reference tooling without installing it, deferring actual wiring to the first real work item that needs it.

## Scope

### In scope

- Config *templates* (reference files, not live dependencies) for: Playwright, Stryker, and three new tool categories — Supertest+Bruno, Jest+Vitest, pytest.
- A new central folder-structure convention document for how a target app should organize its test directories.
- New/extended skills for the previously uncovered tools, added to the QA Agent's Skill Routing table and `SKILL_CATALOG.md`.
- Full three-platform mirroring (`.agents/skills/`, `.claude/skills/`, `.agent/skills/`) for every new/changed skill, per the precedent established in Issue #44.
- `docs/vault/00-Index.md` updates for the new skills and the new workflow document, plus a correction to five pre-existing stale entries discovered during this work (see Out of Scope note below on why the correction is bundled in).
- `PROJECT_INDEX.md` update for the one new file it individually enumerates (`docs/workflow/testing-conventions.md`).
- Regression coverage in `test/validate-contracts.test.mjs`.

### Out of scope

- Installing any actual npm/pip package in this repo's `package.json`/`node_modules` or creating a `pyproject.toml`/`requirements.txt` — this repo remains dependency-free for test tooling until a real target app needs it.
- Any MCP server configuration for test tooling (e.g. a Playwright MCP server) — not requested, and premature without a target app.
- A vault structure for a future runtime/target-app's own knowledge base ("vault for runtime app KMS"). This was raised during design but explicitly deferred by Boss to be considered together with the still-unresolved multi-app/runtime-playbook architecture discussion (parked earlier). Nothing in this spec assumes or blocks that future work.
- Broadening `api-contract-testing`'s Django/DRF-specific scope. It keeps its existing schema-fuzzing purpose (schemathesis + drf-spectacular); Supertest/Bruno get their own new skill instead, since they serve a different concern (hand-written/collection-based API tests, not schema-contract fuzzing).
- Any change to the actual test *content* discipline rules (Test Effectiveness, Evidence-Based Reporting, etc.) already established in `docs/workflow/role-definitions.md` — this spec adds tool coverage, not new policy rules.

## Current State (verified)

- `package.json` has exactly two `devDependencies` (`ajv`, `yaml`), both used only by this repo's own `scripts/validate-*.mjs` contract-validation scripts. No test-tooling package, config file, or MCP server exists anywhere in the repo.
- The QA skill catalog (`docs/operating-model/SKILL_CATALOG.md`) currently has: `qa-playwright-testing` (mature, covers Playwright + accessibility testing), `api-contract-testing` (Django/DRF + schemathesis + drf-spectacular specific), `performance-testing` (Locust/k6), `mutation-testing` (Python/mutmut only), `test-quality-discipline` (process, tool-agnostic). `tdd-implementation` is pure red-green-refactor process discipline with no tool-specific content.
- All 20 existing skills mirror byte-identically across `.agents/skills/`, `.claude/skills/`, and `.agent/skills/` (verified by directory listing) — this is the actual full-parity pattern established since Issue #44, not the partial "some skills are portable-only" pattern `docs/vault/00-Index.md` currently (incorrectly) documents.
- `docs/vault/00-Index.md` is a hand-maintained Obsidian vault index with an explicit self-instruction: "When a new role adapter, skill, or canonical workflow file is added, add a link here too." It currently misclassifies five skills (`qa-playwright-testing`, `ba-requirement-analysis`, `sa-architecture-design`, `data-config-change`, `security-review`) as "Role-specific (portable only, `.agents/skills/`)" when they are actually mirrored across all three platforms like every other skill.
- `PROJECT_INDEX.md` links `.agents/skills/`, `.claude/skills/`, and `.agent/skills/` at the directory level (no per-skill entries needed there), but enumerates `docs/workflow/*.md` files individually.

## Design

### 1. `docs/workflow/testing-conventions.md` (new)

A single central document describing the folder-structure convention a target app should follow once cloned and paired with a real runtime app, e.g.:

```
tests/
├── e2e/          # Playwright specs
├── api/          # Supertest specs, Bruno collections
├── unit/         # Jest/Vitest (JS/TS) or pytest (Python) — by target app's stack
└── mutation/     # Stryker or mutmut config/output, if kept separate from unit/
```

The doc states this is a *convention*, not a hard requirement — a target app's existing structure takes precedence if one already exists. Each relevant skill (below) links back to this doc instead of repeating the convention.

Added to `PROJECT_INDEX.md`'s "Workflow Source Of Truth" section (the section that lists `docs/workflow/*.md` files individually) and to `docs/vault/00-Index.md`'s "Governance" section.

### 2. `qa-playwright-testing` — add `templates/playwright.config.template.ts`

A minimal, commented Playwright config template (base URL placeholder, test directory pointing at `tests/e2e/` per the new convention doc, standard reporter/retry settings). `SKILL.md` gains a short pointer to the template and to `testing-conventions.md`.

### 3. `mutation-testing` — add JS/TS (Stryker) section + `templates/stryker.conf.template.json`

Mirrors the skill's existing `## Python (mutmut)` structure with a new `## JS/TS (Stryker)` section: installation (`npm install --save-dev @stryker-mutator/core`), running (`npx stryker run`), and the same "When to Apply" / "Scoring" / "Improving a Survived Mutant" guidance already written generically enough to cover both ecosystems (only the installation/run commands and config template are ecosystem-specific). `description` frontmatter updated to mention JS/TS parity.

### 4. New skill: `api-testing-tooling` (Supertest + Bruno)

- **Purpose**: hand-written/scripted API testing distinct from `api-contract-testing`'s schema-fuzzing — Supertest for Node/Express-style HTTP assertion tests, Bruno for git-friendly, versionable API collections (an open-source alternative to Postman).
- **Templates**: `templates/supertest.example.spec.ts` (a minimal example hitting a placeholder endpoint) and `templates/bruno-collection/` (a minimal `.bru` collection structure showing the convention).
- **Canonical References**: links to `testing-conventions.md` for where collections/specs live (`tests/api/`).

### 5. New skill: `js-unit-testing` (Jest + Vitest)

- **Purpose**: unit/component-level testing for JS/TS codebases, operationalizing `tdd-implementation`'s process discipline with concrete tooling.
- Covers both Jest and Vitest as sibling options (not one-over-the-other) since target app stack determines the pick; a short decision note ("Vitest for Vite-based/ESM-first projects, Jest for broader ecosystem/CRA-style projects") helps Developer Agent choose without this skill mandating one.
- **Templates**: `templates/jest.config.template.js`, `templates/vitest.config.template.ts`.

### 6. New skill: `python-unit-testing` (pytest)

- **Purpose**: unit/component-level testing for Python codebases, same relationship to `tdd-implementation` as #5.
- **Templates**: `templates/pytest.ini.template` (and a `pyproject.toml` `[tool.pytest.ini_options]` snippet as an alternative, since both are common).

### 7. Three-platform mirroring

Every new skill (4, 5, 6) and every template addition to an existing skill (2, 3) is mirrored byte-identically to `.agents/skills/`, `.claude/skills/`, and `.agent/skills/` — matching the verified actual pattern (not the vault index's stale documentation of it).

### 8. `docs/operating-model/SKILL_CATALOG.md`

Three new `##` entries (`api-testing-tooling`, `js-unit-testing`, `python-unit-testing`) following the existing entry format (Purpose, When to Use, canonical references). The `mutation-testing` entry's description line is updated to mention JS/TS (Stryker) parity.

### 9. `docs/workflow/role-definitions.md` — QA Agent Skill Routing

Three new rows added to the canonical Skill Routing table (mirrored to `.claude/agents/qa-agent.md`'s routing sentence, per the pattern used for the four skills added in Issue #44).

### 10. `test/validate-contracts.test.mjs`

Extend existing skill-parity and catalog-linkage tests to cover the three new skills and the two template additions, following the same assertion shape used for Issue #44's four new skills (frontmatter presence, canonical-reference presence, three-way mirror parity, catalog entry presence).

### 11. `PROJECT_INDEX.md`

One new line under "Workflow Source Of Truth" for `docs/workflow/testing-conventions.md`. No changes needed for the new skills (directory-level links already cover them).

### 12. `docs/vault/00-Index.md`

- Add the three new skills to the "Mirrored (all three platforms)" list (three-way link format matching existing entries).
- Add `docs/workflow/testing-conventions.md` to the "Governance" section.
- **Correction (bundled in)**: move `qa-playwright-testing`, `ba-requirement-analysis`, `sa-architecture-design`, `data-config-change`, and `security-review` out of "Role-specific (portable only, `.agents/skills/`)" and into "Mirrored (all three platforms)", since directory verification confirms all five are already mirrored across all three platforms. This is a pre-existing documentation drift discovered during this work, not new drift introduced by it — fixed in the same pass since it's the same file and the same "keep the index accurate" concern.

## Acceptance Criteria

- [ ] AC-01: `docs/workflow/testing-conventions.md` exists, describes the `tests/e2e|api|unit|mutation` convention, and is linked from `PROJECT_INDEX.md` and `docs/vault/00-Index.md`.
- [ ] AC-02: `qa-playwright-testing` has a `templates/playwright.config.template.ts` and references it from `SKILL.md`.
- [ ] AC-03: `mutation-testing` has a `## JS/TS (Stryker)` section with install/run commands and a `templates/stryker.conf.template.json`, mirrored across all three platforms.
- [ ] AC-04: `api-testing-tooling`, `js-unit-testing`, `python-unit-testing` skills exist with `SKILL.md` + `templates/`, each mirrored byte-identically across `.agents/skills/`, `.claude/skills/`, `.agent/skills/`.
- [ ] AC-05: No new dependency appears in `package.json`, no new `node_modules` entries for test tooling, no `pyproject.toml`/`requirements.txt` created anywhere in the repo.
- [ ] AC-06: `SKILL_CATALOG.md` has three new entries and an updated `mutation-testing` entry.
- [ ] AC-07: `role-definitions.md`'s QA Agent Skill Routing table has three new rows, mirrored to `.claude/agents/qa-agent.md`.
- [ ] AC-08: `test/validate-contracts.test.mjs` covers the three new skills and two template additions with passing regression tests.
- [ ] AC-09: `docs/vault/00-Index.md`'s five misclassified entries are corrected to "Mirrored (all three platforms)".
- [ ] AC-10: `npm test` and `npm run validate:contracts` pass.

## Risks and Constraints

- **Risk**: a target app's real stack may not match any of the pre-built templates exactly (e.g. a non-Vite, non-CRA JS setup). Mitigation: templates are explicitly documented as starting points to adapt, not drop-in-final config — consistent with how `docs/templates/*.md` markdown templates are already treated in this repo (filled in per work item, not used verbatim).
- **Risk**: adding three new skills increases the QA Agent's Skill Routing table size, adding cognitive load to routing decisions. Mitigation: kept the same one-line-per-skill routing format already used for the four skills added in Issue #44 — no new routing complexity, just more rows.
- **Constraint**: this spec does not resolve the "vault for runtime app KMS" idea raised during design — it is explicitly deferred pending the still-open multi-app/runtime-playbook architecture discussion.
- **Constraint**: the `docs/vault/00-Index.md` correction (item 12) touches five pre-existing entries unrelated to the new tools. This is a small, mechanical, evidence-backed correction (verified via direct directory listing) bundled into this same pass by Boss decision, not scope creep introduced unilaterally.
