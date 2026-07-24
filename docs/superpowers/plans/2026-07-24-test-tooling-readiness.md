# Test-Tooling Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the QA skill catalog reference-only coverage (config templates, no live dependencies) for Playwright, Supertest, Bruno, Jest, Vitest, pytest, and Stryker, plus a folder-structure convention doc, so a future target app clone can wire test tooling quickly.

**Architecture:** A new `docs/workflow/testing-conventions.md` defines the shared `tests/e2e|api|unit|mutation` folder convention. `qa-playwright-testing` and `mutation-testing` each gain a `templates/` subfolder with one new config template file. Three brand-new skills (`api-testing-tooling`, `js-unit-testing`, `python-unit-testing`) are created with their own `SKILL.md` + `templates/`. Every new/changed skill file is mirrored byte-identically across `.agents/skills/`, `.claude/skills/`, and `.agent/skills/`. `SKILL_CATALOG.md` and `role-definitions.md`'s QA Skill Routing table get new entries/rows; `docs/vault/00-Index.md` gets new links plus a correction to five pre-existing misclassified entries. A Node regression test locks in the new skill content, catalog entries, and template parity.

**Tech Stack:** Markdown, TypeScript/JavaScript/JSON/INI config templates (reference only, not installed), existing Node `node:test` quality checks, Git.

## Global Constraints

- Zero live dependencies: do not add anything to `package.json`/`node_modules`, and do not create a `pyproject.toml` or `requirements.txt` anywhere in this repo. Every new file is a reference template or markdown doc.
- Every new skill and every template addition to an existing skill must exist byte-identically in `.agents/skills/`, `.claude/skills/`, and `.agent/skills/` — no thin-pointer-adapter pattern for any file this plan touches (that pattern is reserved for the three pre-existing skills — `dynamic-workflow`, `frontend-ui-engineering`, `functional-test-design` — that predate this work; do not alter them).
- `api-contract-testing`'s existing Django/DRF + schemathesis scope stays untouched — Supertest/Bruno get their own new skill (`api-testing-tooling`), not a section inside `api-contract-testing`.
- Do not modify `mutation-testing`'s existing `## Purpose`, `## Core Concept`, or `## Python (mutmut)` sections — only add a new `## JS/TS (Stryker)` section and update the frontmatter `description` line.
- Do not modify `qa-playwright-testing`'s existing sections — only add a template file and one short reference to it.
- `docs/vault/00-Index.md`'s five-entry correction (Task 9) must not change any other line in that file.

---

### Task 1: Testing-conventions doc and index links

**Files:**
- Create: `docs/workflow/testing-conventions.md`
- Modify: `PROJECT_INDEX.md`
- Modify: `docs/vault/00-Index.md`

**Interfaces:**
- Consumes: nothing from earlier tasks (this is the first task).
- Produces: `docs/workflow/testing-conventions.md`, referenced by Tasks 4-6's new skills and Task 2-3's template additions via a `Canonical References` / prose link.

- [ ] **Step 1: Create `docs/workflow/testing-conventions.md`**

  ```markdown
  # Testing Conventions

  This is a convention for how a target app (once cloned via `scripts/reset-to-template.mjs` and paired with a real runtime app) should organize its test directories. It is a starting point to adapt, not a hard requirement — an existing target app's structure takes precedence if one is already in place.

  ## Folder Structure

  ```text
  tests/
  ├── e2e/          # Playwright specs — see .agents/skills/qa-playwright-testing/
  ├── api/          # Supertest specs, Bruno collections — see .agents/skills/api-testing-tooling/
  ├── unit/         # Jest/Vitest (JS/TS) or pytest (Python) — see .agents/skills/js-unit-testing/ or .agents/skills/python-unit-testing/
  └── mutation/     # Stryker or mutmut config/output, if kept separate from tests/unit/ — see .agents/skills/mutation-testing/
  ```

  ## Notes

  - `tests/mutation/` is optional — many projects keep mutation-testing config alongside the unit tests it mutates (`tests/unit/`) instead of a separate folder. Either is acceptable; pick one and stay consistent within a project.
  - This convention exists so a target app's test layout is predictable across projects that reuse this framework, not to prescribe one true folder shape for every possible stack.

  ## Canonical References

  - `.agents/skills/qa-playwright-testing/SKILL.md`
  - `.agents/skills/api-testing-tooling/SKILL.md`
  - `.agents/skills/js-unit-testing/SKILL.md`
  - `.agents/skills/python-unit-testing/SKILL.md`
  - `.agents/skills/mutation-testing/SKILL.md`
  ```

- [ ] **Step 2: Add the link to `PROJECT_INDEX.md`**

  Find (in the "Workflow Source Of Truth" section):

  ```markdown
  - [docs/workflow/handoff-contract.md](./docs/workflow/handoff-contract.md) - Required handoff fields and rules.
  ```

  Replace with:

  ```markdown
  - [docs/workflow/handoff-contract.md](./docs/workflow/handoff-contract.md) - Required handoff fields and rules.
  - [docs/workflow/testing-conventions.md](./docs/workflow/testing-conventions.md) - Test folder-structure convention for target apps.
  ```

- [ ] **Step 3: Add the link to `docs/vault/00-Index.md`**

  Find (in the "Governance (read these first)" section):

  ```markdown
  - [[../workflow/platform-readiness.md|platform-readiness.md]] — lifecycle labels and readiness gate
  ```

  Replace with:

  ```markdown
  - [[../workflow/platform-readiness.md|platform-readiness.md]] — lifecycle labels and readiness gate
  - [[../workflow/testing-conventions.md|testing-conventions.md]] — test folder-structure convention for target apps
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add docs/workflow/testing-conventions.md PROJECT_INDEX.md docs/vault/00-Index.md
  git commit -m "docs: add testing-conventions.md and index links"
  ```

---

### Task 2: Playwright config template

**Files:**
- Create: `.agents/skills/qa-playwright-testing/templates/playwright.config.template.ts`
- Create: `.claude/skills/qa-playwright-testing/templates/playwright.config.template.ts`
- Create: `.agent/skills/qa-playwright-testing/templates/playwright.config.template.ts`
- Modify: `.agents/skills/qa-playwright-testing/SKILL.md`
- Modify: `.claude/skills/qa-playwright-testing/SKILL.md`
- Modify: `.agent/skills/qa-playwright-testing/SKILL.md`

**Interfaces:**
- Consumes: `docs/workflow/testing-conventions.md` from Task 1 (referenced by path, not by function signature).
- Produces: nothing later tasks depend on programmatically; Task 10's regression test reads this file's content directly.

- [ ] **Step 1: Create the template file (identical content in all three locations)**

  ```typescript
  import { defineConfig, devices } from '@playwright/test';

  export default defineConfig({
    testDir: '../../../../tests/e2e',
    fullyParallel: true,
    retries: process.env.CI ? 2 : 0,
    reporter: 'html',
    use: {
      baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
      trace: 'on-first-retry',
    },
    projects: [
      { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],
  });
  ```

  Write this exact content to all three paths:
  - `.agents/skills/qa-playwright-testing/templates/playwright.config.template.ts`
  - `.claude/skills/qa-playwright-testing/templates/playwright.config.template.ts`
  - `.agent/skills/qa-playwright-testing/templates/playwright.config.template.ts`

- [ ] **Step 2: Reference the template from all three `SKILL.md` copies**

  Find (in each of `.agents/skills/qa-playwright-testing/SKILL.md`, `.claude/skills/qa-playwright-testing/SKILL.md`, `.agent/skills/qa-playwright-testing/SKILL.md`):

  ```markdown
  ## Automation Discipline
  ```

  Replace with:

  ```markdown
  ## Config Template

  `templates/playwright.config.template.ts` — adapt the `testDir` path and `baseURL` for the target app; see `docs/workflow/testing-conventions.md` for the expected `tests/e2e/` location.

  ## Automation Discipline
  ```

- [ ] **Step 3: Verify all three `SKILL.md` copies stay byte-identical to each other**

  ```bash
  diff .agents/skills/qa-playwright-testing/SKILL.md .claude/skills/qa-playwright-testing/SKILL.md
  diff .agents/skills/qa-playwright-testing/SKILL.md .agent/skills/qa-playwright-testing/SKILL.md
  diff .agents/skills/qa-playwright-testing/templates/playwright.config.template.ts .claude/skills/qa-playwright-testing/templates/playwright.config.template.ts
  diff .agents/skills/qa-playwright-testing/templates/playwright.config.template.ts .agent/skills/qa-playwright-testing/templates/playwright.config.template.ts
  ```

  Expected: no output from any command (files identical).

- [ ] **Step 4: Commit**

  ```bash
  git add .agents/skills/qa-playwright-testing .claude/skills/qa-playwright-testing .agent/skills/qa-playwright-testing
  git commit -m "feat: add Playwright config template to qa-playwright-testing skill"
  ```

---

### Task 3: Stryker section and template for mutation-testing

**Files:**
- Create: `.agents/skills/mutation-testing/templates/stryker.conf.template.json`
- Create: `.claude/skills/mutation-testing/templates/stryker.conf.template.json`
- Create: `.agent/skills/mutation-testing/templates/stryker.conf.template.json`
- Modify: `.agents/skills/mutation-testing/SKILL.md`
- Modify: `.claude/skills/mutation-testing/SKILL.md`
- Modify: `.agent/skills/mutation-testing/SKILL.md`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing later tasks depend on programmatically; Task 7 references this skill's updated description; Task 10 reads this file's content directly.

- [ ] **Step 1: Create the template file (identical content in all three locations)**

  ```json
  {
    "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
    "packageManager": "npm",
    "reporters": ["html", "clear-text", "progress"],
    "testRunner": "jest",
    "coverageAnalysis": "perTest",
    "mutate": ["src/**/*.ts", "!src/**/*.test.ts"]
  }
  ```

  Write this exact content to all three paths:
  - `.agents/skills/mutation-testing/templates/stryker.conf.template.json`
  - `.claude/skills/mutation-testing/templates/stryker.conf.template.json`
  - `.agent/skills/mutation-testing/templates/stryker.conf.template.json`

- [ ] **Step 2: Add the `## JS/TS (Stryker)` section to all three `SKILL.md` copies**

  Find (in each of `.agents/skills/mutation-testing/SKILL.md`, `.claude/skills/mutation-testing/SKILL.md`, `.agent/skills/mutation-testing/SKILL.md`):

  ```markdown
  ```bash
  uv run mutmut run              # run mutation testing
  uv run mutmut results          # summary
  uv run mutmut show <id>        # inspect one surviving mutant
  uv run mutmut html             # HTML report
  open html/index.html
  ```

  ## When to Apply
  ```

  Replace with:

  ```markdown
  ```bash
  uv run mutmut run              # run mutation testing
  uv run mutmut results          # summary
  uv run mutmut show <id>        # inspect one surviving mutant
  uv run mutmut html             # HTML report
  open html/index.html
  ```

  ## JS/TS (Stryker)

  ### Installation

  ```bash
  npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner
  ```

  ### Running

  ```bash
  npx stryker run                        # run mutation testing
  open reports/mutation/html/index.html  # HTML report
  ```

  See `templates/stryker.conf.template.json`.

  ## When to Apply
  ```

- [ ] **Step 3: Update the frontmatter `description` line in all three `SKILL.md` copies**

  Find:

  ```yaml
  description: Validate that Python test suites actually catch bugs, using mutmut to introduce deliberate code mutations and measure how many are killed. Use for QA Agent's Test Effectiveness rule on core business-logic/service-layer modules.
  ```

  Replace with:

  ```yaml
  description: Validate that Python or JS/TS test suites actually catch bugs, using mutmut (Python) or Stryker (JS/TS) to introduce deliberate code mutations and measure how many are killed. Use for QA Agent's Test Effectiveness rule on core business-logic/service-layer modules.
  ```

- [ ] **Step 4: Verify all three `SKILL.md` copies and template files stay byte-identical**

  ```bash
  diff .agents/skills/mutation-testing/SKILL.md .claude/skills/mutation-testing/SKILL.md
  diff .agents/skills/mutation-testing/SKILL.md .agent/skills/mutation-testing/SKILL.md
  diff .agents/skills/mutation-testing/templates/stryker.conf.template.json .claude/skills/mutation-testing/templates/stryker.conf.template.json
  diff .agents/skills/mutation-testing/templates/stryker.conf.template.json .agent/skills/mutation-testing/templates/stryker.conf.template.json
  ```

  Expected: no output from any command.

- [ ] **Step 5: Commit**

  ```bash
  git add .agents/skills/mutation-testing .claude/skills/mutation-testing .agent/skills/mutation-testing
  git commit -m "feat: add JS/TS (Stryker) parity to mutation-testing skill"
  ```

---

### Task 4: New skill — api-testing-tooling (Supertest + Bruno)

**Files:**
- Create: `.agents/skills/api-testing-tooling/SKILL.md`
- Create: `.agents/skills/api-testing-tooling/templates/supertest.example.spec.ts`
- Create: `.agents/skills/api-testing-tooling/templates/bruno-collection/bruno.json`
- Create: `.agents/skills/api-testing-tooling/templates/bruno-collection/health-check.bru`
- Create: `.agents/skills/api-testing-tooling/templates/bruno-collection/environments/local.bru`
- Create: `.claude/skills/api-testing-tooling/` (same five files, identical content)
- Create: `.agent/skills/api-testing-tooling/` (same five files, identical content)

**Interfaces:**
- Consumes: `docs/workflow/testing-conventions.md` from Task 1 (referenced by path).
- Produces: skill name `api-testing-tooling`, consumed by Task 7 (`SKILL_CATALOG.md` entry) and Task 8 (QA Skill Routing row).

- [ ] **Step 1: Create `.agents/skills/api-testing-tooling/SKILL.md`**

  ```markdown
  ---
  name: api-testing-tooling
  description: Write and run hand-scripted API tests with Supertest (Node/Express HTTP assertions) and manage versionable API collections with Bruno. Use for functional API test cases distinct from api-contract-testing's OpenAPI schema-fuzzing.
  ---

  # api-testing-tooling

  ## Purpose

  Operationalize functional API testing for a target app's own endpoints — hand-written assertions and reusable, versionable request collections — as a distinct concern from `api-contract-testing`'s schema-fuzzing against a published OpenAPI contract.

  ## When to Use

  - The target app has HTTP endpoints (any stack, not just Django/DRF) that need functional test coverage: specific request/response scenarios, auth flows, error cases.
  - A test needs to assert on a specific, hand-chosen scenario rather than fuzz the full schema space.
  - The team wants a git-friendly, versionable collection of API requests that can also run in CI (Bruno), separate from ad hoc manual exploration in a GUI client.

  ## Supertest (Node/Express)

  Use for integration-style tests that exercise the app's own HTTP layer directly.

  ### Installation

  ```bash
  npm install --save-dev supertest
  ```

  ### Example

  See `templates/supertest.example.spec.ts`.

  ## Bruno (API collections)

  Use for a versionable, git-friendly set of API requests — an open-source alternative to Postman that stores each request as a plain-text `.bru` file, diffable in pull requests.

  ### Installation

  ```bash
  npm install -g @usebruno/cli   # for `bru run` in CI
  ```

  ### Running

  ```bash
  bru run --env local
  ```

  See `templates/bruno-collection/` for a minimal collection structure.

  ## Where Tests Live

  Both tools' files live under `tests/api/` per `docs/workflow/testing-conventions.md`.

  ## Canonical References

  - `docs/workflow/role-definitions.md` (QA Agent → Skill Routing)
  - `docs/workflow/testing-conventions.md`
  - `docs/templates/TEST_REPORT.md`
  ```

- [ ] **Step 2: Create `.agents/skills/api-testing-tooling/templates/supertest.example.spec.ts`**

  ```typescript
  import request from 'supertest';
  import { app } from '../../src/app';

  describe('GET /health', () => {
    it('returns 200 with a status payload', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ status: 'ok' });
    });
  });
  ```

- [ ] **Step 3: Create `.agents/skills/api-testing-tooling/templates/bruno-collection/bruno.json`**

  ```json
  {
    "version": "1",
    "name": "api-collection",
    "type": "collection"
  }
  ```

- [ ] **Step 4: Create `.agents/skills/api-testing-tooling/templates/bruno-collection/health-check.bru`**

  ```text
  meta {
    name: Health Check
    type: http
    seq: 1
  }

  get {
    url: {{baseUrl}}/health
  }

  assert {
    res.status: eq 200
  }
  ```

- [ ] **Step 5: Create `.agents/skills/api-testing-tooling/templates/bruno-collection/environments/local.bru`**

  ```text
  vars {
    baseUrl: http://localhost:3000
  }
  ```

- [ ] **Step 6: Mirror all five files byte-identically to `.claude/skills/api-testing-tooling/` and `.agent/skills/api-testing-tooling/`**

  ```bash
  mkdir -p .claude/skills/api-testing-tooling/templates/bruno-collection/environments
  mkdir -p .agent/skills/api-testing-tooling/templates/bruno-collection/environments
  cp .agents/skills/api-testing-tooling/SKILL.md .claude/skills/api-testing-tooling/SKILL.md
  cp .agents/skills/api-testing-tooling/SKILL.md .agent/skills/api-testing-tooling/SKILL.md
  cp .agents/skills/api-testing-tooling/templates/supertest.example.spec.ts .claude/skills/api-testing-tooling/templates/
  cp .agents/skills/api-testing-tooling/templates/supertest.example.spec.ts .agent/skills/api-testing-tooling/templates/
  cp .agents/skills/api-testing-tooling/templates/bruno-collection/bruno.json .claude/skills/api-testing-tooling/templates/bruno-collection/
  cp .agents/skills/api-testing-tooling/templates/bruno-collection/bruno.json .agent/skills/api-testing-tooling/templates/bruno-collection/
  cp .agents/skills/api-testing-tooling/templates/bruno-collection/health-check.bru .claude/skills/api-testing-tooling/templates/bruno-collection/
  cp .agents/skills/api-testing-tooling/templates/bruno-collection/health-check.bru .agent/skills/api-testing-tooling/templates/bruno-collection/
  cp .agents/skills/api-testing-tooling/templates/bruno-collection/environments/local.bru .claude/skills/api-testing-tooling/templates/bruno-collection/environments/
  cp .agents/skills/api-testing-tooling/templates/bruno-collection/environments/local.bru .agent/skills/api-testing-tooling/templates/bruno-collection/environments/
  ```

- [ ] **Step 7: Verify parity**

  ```bash
  diff -r .agents/skills/api-testing-tooling .claude/skills/api-testing-tooling
  diff -r .agents/skills/api-testing-tooling .agent/skills/api-testing-tooling
  ```

  Expected: no output from either command.

- [ ] **Step 8: Commit**

  ```bash
  git add .agents/skills/api-testing-tooling .claude/skills/api-testing-tooling .agent/skills/api-testing-tooling
  git commit -m "feat: add api-testing-tooling skill (Supertest + Bruno)"
  ```

---

### Task 5: New skill — js-unit-testing (Jest + Vitest)

**Files:**
- Create: `.agents/skills/js-unit-testing/SKILL.md`
- Create: `.agents/skills/js-unit-testing/templates/jest.config.template.js`
- Create: `.agents/skills/js-unit-testing/templates/vitest.config.template.ts`
- Create: `.claude/skills/js-unit-testing/` (same three files, identical content)
- Create: `.agent/skills/js-unit-testing/` (same three files, identical content)

**Interfaces:**
- Consumes: `docs/workflow/testing-conventions.md` from Task 1, `.agents/skills/tdd-implementation/SKILL.md` (existing, referenced by path).
- Produces: skill name `js-unit-testing`, consumed by Task 7 and Task 8.

- [ ] **Step 1: Create `.agents/skills/js-unit-testing/SKILL.md`**

  ```markdown
  ---
  name: js-unit-testing
  description: Write and run unit/component tests for JS/TS code with Jest or Vitest. Use to operationalize tdd-implementation's red-green-refactor discipline with concrete tooling.
  ---

  # js-unit-testing

  ## Purpose

  Give `tdd-implementation`'s red-green-refactor process concrete tooling for JS/TS codebases. Covers both Jest and Vitest as sibling options — this skill does not mandate one over the other.

  ## Choosing Between Jest and Vitest

  - **Vitest** — Vite-based or ESM-first projects; faster startup, native ESM/TS support without extra transform config.
  - **Jest** — broader ecosystem compatibility, CRA-style or older Node/CommonJS projects, largest plugin/matcher ecosystem.

  If the target app already has one configured, use it. For a new project, prefer Vitest when the build tool is already Vite; otherwise Jest.

  ## Jest

  ### Installation

  ```bash
  npm install --save-dev jest
  ```

  ### Running

  ```bash
  npx jest
  npx jest --watch
  npx jest --coverage
  ```

  See `templates/jest.config.template.js`.

  ## Vitest

  ### Installation

  ```bash
  npm install --save-dev vitest
  ```

  ### Running

  ```bash
  npx vitest run
  npx vitest --watch
  npx vitest run --coverage
  ```

  See `templates/vitest.config.template.ts`.

  ## Where Tests Live

  Test files live under `tests/unit/` per `docs/workflow/testing-conventions.md`.

  ## Canonical References

  - `docs/workflow/role-definitions.md` (QA Agent → Skill Routing)
  - `.agents/skills/tdd-implementation/SKILL.md`
  - `docs/workflow/testing-conventions.md`
  - `docs/templates/TEST_REPORT.md`
  ```

- [ ] **Step 2: Create `.agents/skills/js-unit-testing/templates/jest.config.template.js`**

  ```javascript
  /** @type {import('jest').Config} */
  module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/unit/**/*.test.js'],
    collectCoverageFrom: ['src/**/*.js'],
  };
  ```

- [ ] **Step 3: Create `.agents/skills/js-unit-testing/templates/vitest.config.template.ts`**

  ```typescript
  import { defineConfig } from 'vitest/config';

  export default defineConfig({
    test: {
      environment: 'node',
      include: ['tests/unit/**/*.test.ts'],
      coverage: {
        provider: 'v8',
      },
    },
  });
  ```

- [ ] **Step 4: Mirror all three files byte-identically to `.claude/skills/js-unit-testing/` and `.agent/skills/js-unit-testing/`**

  ```bash
  mkdir -p .claude/skills/js-unit-testing/templates
  mkdir -p .agent/skills/js-unit-testing/templates
  cp .agents/skills/js-unit-testing/SKILL.md .claude/skills/js-unit-testing/SKILL.md
  cp .agents/skills/js-unit-testing/SKILL.md .agent/skills/js-unit-testing/SKILL.md
  cp .agents/skills/js-unit-testing/templates/jest.config.template.js .claude/skills/js-unit-testing/templates/
  cp .agents/skills/js-unit-testing/templates/jest.config.template.js .agent/skills/js-unit-testing/templates/
  cp .agents/skills/js-unit-testing/templates/vitest.config.template.ts .claude/skills/js-unit-testing/templates/
  cp .agents/skills/js-unit-testing/templates/vitest.config.template.ts .agent/skills/js-unit-testing/templates/
  ```

- [ ] **Step 5: Verify parity**

  ```bash
  diff -r .agents/skills/js-unit-testing .claude/skills/js-unit-testing
  diff -r .agents/skills/js-unit-testing .agent/skills/js-unit-testing
  ```

  Expected: no output from either command.

- [ ] **Step 6: Commit**

  ```bash
  git add .agents/skills/js-unit-testing .claude/skills/js-unit-testing .agent/skills/js-unit-testing
  git commit -m "feat: add js-unit-testing skill (Jest + Vitest)"
  ```

---

### Task 6: New skill — python-unit-testing (pytest)

**Files:**
- Create: `.agents/skills/python-unit-testing/SKILL.md`
- Create: `.agents/skills/python-unit-testing/templates/pytest.ini.template`
- Create: `.claude/skills/python-unit-testing/` (same two files, identical content)
- Create: `.agent/skills/python-unit-testing/` (same two files, identical content)

**Interfaces:**
- Consumes: `docs/workflow/testing-conventions.md` from Task 1, `.agents/skills/tdd-implementation/SKILL.md` and `.agents/skills/mutation-testing/SKILL.md` (existing, referenced by path).
- Produces: skill name `python-unit-testing`, consumed by Task 7 and Task 8.

- [ ] **Step 1: Create `.agents/skills/python-unit-testing/SKILL.md`**

  ```markdown
  ---
  name: python-unit-testing
  description: Write and run unit/component tests for Python code with pytest. Use to operationalize tdd-implementation's red-green-refactor discipline with concrete tooling.
  ---

  # python-unit-testing

  ## Purpose

  Give `tdd-implementation`'s red-green-refactor process concrete tooling for Python codebases, using pytest.

  ## Installation

  ```bash
  uv add --dev pytest   # or: pip install pytest
  ```

  ## Running

  ```bash
  uv run pytest                                        # run the suite
  uv run pytest -v                                      # verbose
  uv run pytest --cov                                   # coverage (requires pytest-cov)
  uv run pytest tests/unit/test_module.py::test_case    # single test
  ```

  See `templates/pytest.ini.template`.

  ## Where Tests Live

  Test files live under `tests/unit/` per `docs/workflow/testing-conventions.md`.

  ## Canonical References

  - `docs/workflow/role-definitions.md` (QA Agent → Skill Routing)
  - `.agents/skills/tdd-implementation/SKILL.md`
  - `.agents/skills/mutation-testing/SKILL.md` (mutmut runs against this same suite)
  - `docs/workflow/testing-conventions.md`
  - `docs/templates/TEST_REPORT.md`
  ```

- [ ] **Step 2: Create `.agents/skills/python-unit-testing/templates/pytest.ini.template`**

  ```ini
  [pytest]
  testpaths = tests/unit
  python_files = test_*.py
  python_functions = test_*
  ```

- [ ] **Step 3: Mirror both files byte-identically to `.claude/skills/python-unit-testing/` and `.agent/skills/python-unit-testing/`**

  ```bash
  mkdir -p .claude/skills/python-unit-testing/templates
  mkdir -p .agent/skills/python-unit-testing/templates
  cp .agents/skills/python-unit-testing/SKILL.md .claude/skills/python-unit-testing/SKILL.md
  cp .agents/skills/python-unit-testing/SKILL.md .agent/skills/python-unit-testing/SKILL.md
  cp .agents/skills/python-unit-testing/templates/pytest.ini.template .claude/skills/python-unit-testing/templates/
  cp .agents/skills/python-unit-testing/templates/pytest.ini.template .agent/skills/python-unit-testing/templates/
  ```

- [ ] **Step 4: Verify parity**

  ```bash
  diff -r .agents/skills/python-unit-testing .claude/skills/python-unit-testing
  diff -r .agents/skills/python-unit-testing .agent/skills/python-unit-testing
  ```

  Expected: no output from either command.

- [ ] **Step 5: Commit**

  ```bash
  git add .agents/skills/python-unit-testing .claude/skills/python-unit-testing .agent/skills/python-unit-testing
  git commit -m "feat: add python-unit-testing skill (pytest)"
  ```

---

### Task 7: SKILL_CATALOG.md updates

**Files:**
- Modify: `docs/operating-model/SKILL_CATALOG.md`

**Interfaces:**
- Consumes: skill names `api-testing-tooling` (Task 4), `js-unit-testing` (Task 5), `python-unit-testing` (Task 6), updated `mutation-testing` description (Task 3).
- Produces: catalog entries Task 10's regression test asserts on.

- [ ] **Step 1: Add three new `##` entries after the existing `test-quality-discipline` entry**

  Find:

  ```markdown
  ## test-quality-discipline
  ```

  (Read the full existing `## test-quality-discipline` entry block to find where it ends — it is followed by `## Skill Activation Examples`.)

  Find the exact boundary:

  ```markdown
  ## Skill Activation Examples
  ```

  Insert immediately before this heading (i.e., after the last line of the `test-quality-discipline` entry and before `## Skill Activation Examples`):

  ```markdown
  ## api-testing-tooling

  | Field | Detail |
  |---|---|
  | Trigger | Target app has HTTP endpoints needing hand-written functional test coverage or a versionable API request collection, distinct from schema-contract fuzzing |
  | Primary Agent | QA Agent |
  | Input | Target app's HTTP endpoints, auth requirements, target environment |
  | Output | Supertest test results or Bruno collection run output recorded in `TEST_REPORT.md` |
  | Do Not Use When | The task is schema-contract validation against a published OpenAPI schema — use `api-contract-testing` instead |
  | Next Skill / Agent | Developer Agent (implementation defect) |

  ## js-unit-testing

  | Field | Detail |
  |---|---|
  | Trigger | A JS/TS code behavior change needs unit/component-level test coverage per `tdd-implementation` |
  | Primary Agent | QA Agent / Developer Agent |
  | Input | Target module, existing test suite (if any), Jest or Vitest per project convention |
  | Output | Test run results recorded in `TEST_REPORT.md` |
  | Do Not Use When | The target app is not JS/TS — use `python-unit-testing` instead |
  | Next Skill / Agent | Developer Agent (failing/missing coverage), `mutation-testing` (verify test effectiveness) |

  ## python-unit-testing

  | Field | Detail |
  |---|---|
  | Trigger | A Python code behavior change needs unit/component-level test coverage per `tdd-implementation` |
  | Primary Agent | QA Agent / Developer Agent |
  | Input | Target module, existing test suite (if any), pytest |
  | Output | Test run results recorded in `TEST_REPORT.md` |
  | Do Not Use When | The target app is not Python — use `js-unit-testing` instead |
  | Next Skill / Agent | Developer Agent (failing/missing coverage), `mutation-testing` (verify test effectiveness) |

  ```

  (Keep the blank line before `## Skill Activation Examples` exactly as it already exists in the file.)

- [ ] **Step 2: Add a Planned Skills clarifying note for `api-testing-tooling`**

  Find (in the "Planned Skills" section):

  ```markdown
  Note: `api-contract-testing` (implemented this pass) validates an existing implementation against a published schema; the Planned "API Test Design" skill (still unbuilt) is for designing API test *cases* from a contract — related but distinct, not superseded. Similarly, `test-quality-discipline`'s anti-pattern review and `TEST_REPORT.md`'s new Root Cause Analysis section do not close the Planned "Defect Analysis" skill, which covers broader test-failure/log/screenshot analysis.
  ```

  Replace with:

  ```markdown
  Note: `api-contract-testing` (implemented this pass) validates an existing implementation against a published schema; the Planned "API Test Design" skill (still unbuilt) is for designing API test *cases* from a contract — related but distinct, not superseded. Similarly, `test-quality-discipline`'s anti-pattern review and `TEST_REPORT.md`'s new Root Cause Analysis section do not close the Planned "Defect Analysis" skill, which covers broader test-failure/log/screenshot analysis. `api-testing-tooling` (implemented this pass) provides Supertest/Bruno tooling for *executing* hand-scripted API tests; it does not close the Planned "API Test Design" skill either, since that skill is about designing what those test cases should be, not running them.
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add docs/operating-model/SKILL_CATALOG.md
  git commit -m "docs: add SKILL_CATALOG.md entries for the three new testing skills"
  ```

---

### Task 8: QA Agent Skill Routing updates

**Files:**
- Modify: `docs/workflow/role-definitions.md`
- Modify: `.claude/agents/qa-agent.md`

**Interfaces:**
- Consumes: skill names from Tasks 4-6.
- Produces: routing rows Task 10's regression test asserts on.

- [ ] **Step 1: Add three rows to the canonical Skill Routing table in `docs/workflow/role-definitions.md`**

  Find (inside the `## QA Agent` section):

  ```markdown
  | Review Developer Agent's unit/component tests for quality and anti-patterns | `.agents/skills/test-quality-discipline/` |
  ```

  Replace with:

  ```markdown
  | Review Developer Agent's unit/component tests for quality and anti-patterns | `.agents/skills/test-quality-discipline/` |
  | Hand-scripted API tests (Supertest) or versionable API collections (Bruno) | `.agents/skills/api-testing-tooling/` |
  | JS/TS unit/component testing (Jest or Vitest) | `.agents/skills/js-unit-testing/` |
  | Python unit/component testing (pytest) | `.agents/skills/python-unit-testing/` |
  ```

- [ ] **Step 2: Mirror the routing sentence in `.claude/agents/qa-agent.md`**

  Find:

  ```markdown
  Route to `functional-test-design`, `qa-playwright-testing`, `security-review`, `data-config-change`, `api-contract-testing`, `performance-testing`, `mutation-testing`, or `test-quality-discipline` per the canonical Skill Routing table.
  ```

  Replace with:

  ```markdown
  Route to `functional-test-design`, `qa-playwright-testing`, `security-review`, `data-config-change`, `api-contract-testing`, `performance-testing`, `mutation-testing`, `test-quality-discipline`, `api-testing-tooling`, `js-unit-testing`, or `python-unit-testing` per the canonical Skill Routing table.
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add docs/workflow/role-definitions.md .claude/agents/qa-agent.md
  git commit -m "docs: add QA Skill Routing rows for the three new testing skills"
  ```

---

### Task 9: Vault index — new links and stale-entry correction

**Files:**
- Modify: `docs/vault/00-Index.md`

**Interfaces:**
- Consumes: skill names from Tasks 4-6 (this task's link additions); no interface consumed for the correction (it targets pre-existing skills already on `main`).
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Add the three new skills to the "Mirrored (all three platforms)" list**

  Find:

  ```markdown
  - git-workflow-and-versioning — [[../../.agents/skills/git-workflow-and-versioning/SKILL.md|portable]] · [[../../.claude/skills/git-workflow-and-versioning/SKILL.md|claude]] · [[../../.agent/skills/git-workflow-and-versioning/SKILL.md|antigravity]]
  ```

  Replace with:

  ```markdown
  - git-workflow-and-versioning — [[../../.agents/skills/git-workflow-and-versioning/SKILL.md|portable]] · [[../../.claude/skills/git-workflow-and-versioning/SKILL.md|claude]] · [[../../.agent/skills/git-workflow-and-versioning/SKILL.md|antigravity]]
  - api-testing-tooling — [[../../.agents/skills/api-testing-tooling/SKILL.md|portable]] · [[../../.claude/skills/api-testing-tooling/SKILL.md|claude]] · [[../../.agent/skills/api-testing-tooling/SKILL.md|antigravity]]
  - js-unit-testing — [[../../.agents/skills/js-unit-testing/SKILL.md|portable]] · [[../../.claude/skills/js-unit-testing/SKILL.md|claude]] · [[../../.agent/skills/js-unit-testing/SKILL.md|antigravity]]
  - python-unit-testing — [[../../.agents/skills/python-unit-testing/SKILL.md|portable]] · [[../../.claude/skills/python-unit-testing/SKILL.md|claude]] · [[../../.agent/skills/python-unit-testing/SKILL.md|antigravity]]
  ```

- [ ] **Step 2: Move five pre-existing skills out of "Role-specific (portable only)" and into "Mirrored (all three platforms)"**

  Find:

  ```markdown
  **Role-specific (portable only, `.agents/skills/`):**

  - [[../../.agents/skills/ba-requirement-analysis/SKILL.md|ba-requirement-analysis]]
  - [[../../.agents/skills/sa-architecture-design/SKILL.md|sa-architecture-design]]
  - [[../../.agents/skills/data-config-change/SKILL.md|data-config-change]]
  - [[../../.agents/skills/qa-playwright-testing/SKILL.md|qa-playwright-testing]]
  - [[../../.agents/skills/security-review/SKILL.md|security-review]]
  - [[../../.agents/skills/frontend-ui-engineering/SKILL.md|frontend-ui-engineering]] (mirrored — see table above; listed here too since it's also role-relevant to BA/Developer)
  ```

  Replace with:

  ```markdown
  **Role-specific (portable only, `.agents/skills/`):**

  - None currently — the five entries previously listed here (`ba-requirement-analysis`, `sa-architecture-design`, `data-config-change`, `qa-playwright-testing`, `security-review`) are verified mirrored across all three platforms and moved to the "Mirrored" list above. `frontend-ui-engineering` is also mirrored and listed in the table above.
  ```

  Then find (in the "Mirrored (all three platforms)" table, immediately before the three new lines added in Step 1):

  ```markdown
  - git-workflow-and-versioning — [[../../.agents/skills/git-workflow-and-versioning/SKILL.md|portable]] · [[../../.claude/skills/git-workflow-and-versioning/SKILL.md|claude]] · [[../../.agent/skills/git-workflow-and-versioning/SKILL.md|antigravity]]
  - api-testing-tooling — [[../../.agents/skills/api-testing-tooling/SKILL.md|portable]] · [[../../.claude/skills/api-testing-tooling/SKILL.md|claude]] · [[../../.agent/skills/api-testing-tooling/SKILL.md|antigravity]]
  ```

  Replace with:

  ```markdown
  - git-workflow-and-versioning — [[../../.agents/skills/git-workflow-and-versioning/SKILL.md|portable]] · [[../../.claude/skills/git-workflow-and-versioning/SKILL.md|claude]] · [[../../.agent/skills/git-workflow-and-versioning/SKILL.md|antigravity]]
  - ba-requirement-analysis — [[../../.agents/skills/ba-requirement-analysis/SKILL.md|portable]] · [[../../.claude/skills/ba-requirement-analysis/SKILL.md|claude]] · [[../../.agent/skills/ba-requirement-analysis/SKILL.md|antigravity]]
  - sa-architecture-design — [[../../.agents/skills/sa-architecture-design/SKILL.md|portable]] · [[../../.claude/skills/sa-architecture-design/SKILL.md|claude]] · [[../../.agent/skills/sa-architecture-design/SKILL.md|antigravity]]
  - data-config-change — [[../../.agents/skills/data-config-change/SKILL.md|portable]] · [[../../.claude/skills/data-config-change/SKILL.md|claude]] · [[../../.agent/skills/data-config-change/SKILL.md|antigravity]]
  - qa-playwright-testing — [[../../.agents/skills/qa-playwright-testing/SKILL.md|portable]] · [[../../.claude/skills/qa-playwright-testing/SKILL.md|claude]] · [[../../.agent/skills/qa-playwright-testing/SKILL.md|antigravity]]
  - security-review — [[../../.agents/skills/security-review/SKILL.md|portable]] · [[../../.claude/skills/security-review/SKILL.md|claude]] · [[../../.agent/skills/security-review/SKILL.md|antigravity]]
  - api-testing-tooling — [[../../.agents/skills/api-testing-tooling/SKILL.md|portable]] · [[../../.claude/skills/api-testing-tooling/SKILL.md|claude]] · [[../../.agent/skills/api-testing-tooling/SKILL.md|antigravity]]
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add docs/vault/00-Index.md
  git commit -m "docs: add vault links for new testing skills and fix stale mirroring claims"
  ```

---

### Task 10: Regression coverage

**Files:**
- Modify: `test/validate-contracts.test.mjs`

**Interfaces:**
- Consumes: all files created/modified in Tasks 1-9.
- Produces: passing `npm test`, the final verification gate before Task 11.

- [ ] **Step 1: Write the failing tests**

  Add this block to `test/validate-contracts.test.mjs` (append after the existing `test('.agent/skills/ and .agents/skills/ carry identical skill directory names...')` test, keeping the same `readFile`/`readdir` imports already used at the top of the file):

  ```javascript
  test('the three new test-tooling skills carry their required content', async () => {
    const [apiTesting, jsUnit, pythonUnit, mutation] = await Promise.all([
      readFile('.agents/skills/api-testing-tooling/SKILL.md', 'utf8'),
      readFile('.agents/skills/js-unit-testing/SKILL.md', 'utf8'),
      readFile('.agents/skills/python-unit-testing/SKILL.md', 'utf8'),
      readFile('.agents/skills/mutation-testing/SKILL.md', 'utf8')
    ]);

    assert.match(apiTesting, /Supertest/);
    assert.match(apiTesting, /Bruno/);
    assert.match(apiTesting, /distinct from `api-contract-testing`/);

    assert.match(jsUnit, /## Choosing Between Jest and Vitest/);
    assert.match(jsUnit, /npx jest/);
    assert.match(jsUnit, /npx vitest/);

    assert.match(pythonUnit, /uv run pytest/);
    assert.match(pythonUnit, /tdd-implementation/);

    assert.match(mutation, /## JS\/TS \(Stryker\)/);
    assert.match(mutation, /npx stryker run/);
    assert.match(mutation, /## Python \(mutmut\)/);
  });

  test('SKILL_CATALOG.md carries the three new test-tooling skill entries', async () => {
    const catalog = await readFile('docs/operating-model/SKILL_CATALOG.md', 'utf8');

    assert.match(catalog, /^## api-testing-tooling$/m);
    assert.match(catalog, /^## js-unit-testing$/m);
    assert.match(catalog, /^## python-unit-testing$/m);
    assert.match(catalog, /api-testing-tooling.*implemented this pass/s);
  });

  test('QA Agent Skill Routing includes the three new test-tooling skills in role-definitions and the Claude adapter', async () => {
    const [roleDefinition, adapter] = await Promise.all([
      readFile('docs/workflow/role-definitions.md', 'utf8'),
      readFile('.claude/agents/qa-agent.md', 'utf8')
    ]);

    assert.match(roleDefinition, /`\.agents\/skills\/api-testing-tooling\/`/);
    assert.match(roleDefinition, /`\.agents\/skills\/js-unit-testing\/`/);
    assert.match(roleDefinition, /`\.agents\/skills\/python-unit-testing\/`/);

    assert.match(adapter, /`api-testing-tooling`/);
    assert.match(adapter, /`js-unit-testing`/);
    assert.match(adapter, /`python-unit-testing`/);
  });

  const newTestingSkillTemplatePaths = [
    ['qa-playwright-testing', 'playwright.config.template.ts'],
    ['mutation-testing', 'stryker.conf.template.json'],
    ['api-testing-tooling', 'supertest.example.spec.ts'],
    ['api-testing-tooling', 'bruno-collection/bruno.json'],
    ['api-testing-tooling', 'bruno-collection/health-check.bru'],
    ['api-testing-tooling', 'bruno-collection/environments/local.bru'],
    ['js-unit-testing', 'jest.config.template.js'],
    ['js-unit-testing', 'vitest.config.template.ts'],
    ['python-unit-testing', 'pytest.ini.template']
  ];

  test('test-tooling skill template files are byte-identical across all three platforms', async () => {
    for (const [skill, templateFile] of newTestingSkillTemplatePaths) {
      const [portable, claude, antigravity] = await Promise.all([
        readFile(`.agents/skills/${skill}/templates/${templateFile}`, 'utf8'),
        readFile(`.claude/skills/${skill}/templates/${templateFile}`, 'utf8'),
        readFile(`.agent/skills/${skill}/templates/${templateFile}`, 'utf8')
      ]);
      assert.equal(claude, portable, `.claude/skills/${skill}/templates/${templateFile} does not match .agents/`);
      assert.equal(antigravity, portable, `.agent/skills/${skill}/templates/${templateFile} does not match .agents/`);
    }
  });

  test('the three new test-tooling skills are byte-identical SKILL.md across all three platforms', async () => {
    const newSkillNames = ['api-testing-tooling', 'js-unit-testing', 'python-unit-testing'];
    for (const name of newSkillNames) {
      const [portable, claude, antigravity] = await Promise.all([
        readFile(`.agents/skills/${name}/SKILL.md`, 'utf8'),
        readFile(`.claude/skills/${name}/SKILL.md`, 'utf8'),
        readFile(`.agent/skills/${name}/SKILL.md`, 'utf8')
      ]);
      assert.equal(claude, portable, `.claude/skills/${name}/SKILL.md does not match .agents/`);
      assert.equal(antigravity, portable, `.agent/skills/${name}/SKILL.md does not match .agents/`);
    }
  });

  test('testing-conventions.md exists and is linked from PROJECT_INDEX.md and the vault index', async () => {
    const [conventions, projectIndex, vaultIndex] = await Promise.all([
      readFile('docs/workflow/testing-conventions.md', 'utf8'),
      readFile('PROJECT_INDEX.md', 'utf8'),
      readFile('docs/vault/00-Index.md', 'utf8')
    ]);

    assert.match(conventions, /tests\/e2e\//);
    assert.match(conventions, /tests\/api\//);
    assert.match(conventions, /tests\/unit\//);
    assert.match(conventions, /tests\/mutation\//);

    assert.match(projectIndex, /docs\/workflow\/testing-conventions\.md/);
    assert.match(vaultIndex, /testing-conventions\.md/);
  });
  ```

- [ ] **Step 2: Run the new tests to verify they fail**

  Run: `npm test`

  Expected: FAIL — the new skills/templates/routing rows/catalog entries don't exist yet if Tasks 1-9 weren't already done in this same session. (If Tasks 1-9 are already complete by the time this task runs, these tests should already PASS — in that case skip to Step 3 to confirm, rather than expecting a failure that won't occur.)

- [ ] **Step 3: Run the full suite and `validate:contracts` to confirm everything passes**

  ```bash
  npm test
  npm run validate:contracts
  npm run validate:skill-parity
  ```

  Expected: all commands exit 0. `validate:skill-parity` auto-discovers skills from `.agents/skills/` (no code change needed there) and will report the three new skills as `OK` once Tasks 4-6's mirroring is correct.

- [ ] **Step 4: Confirm zero live dependencies were introduced**

  ```bash
  git diff main -- package.json package-lock.json
  find . -maxdepth 2 -iname "pyproject.toml" -o -iname "requirements*.txt" | grep -v node_modules
  ```

  Expected: no diff on `package.json`/`package-lock.json`; no Python project files found.

- [ ] **Step 5: Commit**

  ```bash
  git add test/validate-contracts.test.mjs
  git commit -m "test: add regression coverage for test-tooling readiness skills"
  ```

---

### Task 11: Project-state closeout

**Files:**
- Modify: `PROJECT_STATUS.md`
- Modify: `TASK_LOG.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: the completed state of Tasks 1-10.
- Produces: nothing (terminal task).

- [ ] **Step 1: Update `PROJECT_STATUS.md`**

  Update the `## Current Work Item` `Status` line to `Implementation complete, evidence ready for QA`, update `## Current Stage` to describe implementation completion with commit references, and add a `## Completed` entry summarizing: the 3 new skills, the 2 template additions, the testing-conventions doc, the catalog/routing updates, the vault correction, and the regression test count (old count + new tests added). Follow the exact prose style of the existing `## Completed` entries in this file (see the Issue #63/#64 entries near the top for the expected level of detail and evidence-linking).

- [ ] **Step 2: Add a `TASK_LOG.md` row**

  Follow the exact table row format already used in this file (see the existing 2026-07-24 rows). Record: Date, Work Item (`GitHub Issue #68`), Agent (whichever agent/role executed this plan), Action (one sentence), Result (commit SHAs once known, test counts), Next Agent (`QA Agent` for independent verification against Issue #68's AC matrix), Notes (mention the bundled vault correction explicitly, same as the spec's Risks and Constraints section explains it).

- [ ] **Step 3: Add a `CHANGELOG.md` entry**

  Follow this repo's existing `CHANGELOG.md` format and add an entry for this work under the current unreleased/latest section, referencing Issue #68.

- [ ] **Step 4: Run the full verification suite one more time**

  ```bash
  npm test
  npm run validate:contracts
  npm run validate:project-state
  npm run validate:skill-parity
  git diff --check
  ```

  Expected: all commands exit 0 with no output from `git diff --check`.

- [ ] **Step 5: Commit**

  ```bash
  git add PROJECT_STATUS.md TASK_LOG.md CHANGELOG.md
  git commit -m "docs: update project state for test-tooling readiness implementation"
  ```

- [ ] **Step 6: Push and prepare for QA**

  ```bash
  git push
  ```

  Report to the user: implementation complete on branch `docs/test-tooling-readiness-spec`, all verification commands passing, ready for QA Agent to independently verify Issue #68's AC-01 through AC-10 before a PR is opened.
