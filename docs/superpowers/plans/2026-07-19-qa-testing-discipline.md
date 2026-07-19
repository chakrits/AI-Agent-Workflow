# QA Testing-Discipline Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give QA Agent's already-shipped `API Contract Validation` and `NFR Validation` rules an executable skill each, add a new `Test Effectiveness` policy (test-quality/anti-pattern review, mutation testing) QA had no coverage for at all, and bring the Antigravity CLI adapter (`.agent/skills/`) to full parity with the portable skill set (`.agents/skills/`).

**Architecture:** `docs/workflow/role-definitions.md` gains one new canonical rule and four new Skill Routing rows; `.claude/agents/qa-agent.md` mirrors it in the same restatement style already used for its three existing QA rules. Four new skill files land under `.agents/skills/`, and `qa-playwright-testing/SKILL.md` gains an Accessibility Testing section. `.agent/skills/` is brought to full parity with `.agents/skills/` — both the five files this work touches and four pre-existing skills that were never backfilled. `docs/templates/TEST_REPORT.md` and `docs/templates/TEST_PLAN.md` gain small additive sections, and `docs/operating-model/SKILL_CATALOG.md` gets an entry for each new skill (the catalog's own rule requires this before any agent can select them). A Node regression test locks in every change, including a directory-and-content parity check between the two skill adapters.

**Tech Stack:** Markdown, existing Node `node:test` quality checks, Git.

## Global Constraints

- No fixed Quality Gate Metrics numbers (coverage %, MTTR, defect leakage rate, flaky rate, mutation-score pass/fail threshold) anywhere in any new content — explicit Boss decision to keep these case-by-case per work item.
- Do not install or wire up `schemathesis`, `drf-spectacular`, `mutmut`, Locust, or k6 as actual dependencies in this repo. These are documented as *methodology* in the new skill files only — this repo has no Django/Python target application yet, only Node `.mjs` governance tooling.
- `API Contract Validation` and `NFR Validation` rule text in `docs/workflow/role-definitions.md` must stay byte-for-byte unchanged — their policy was already correct; only a Skill Routing row is added for each.
- `.agent/skills/` and `.agents/skills/` must end this work carrying the identical 20 skill directories with byte-identical `SKILL.md` content per shared name.
- Do not change `AGENTS.md` Dynamic Routing Rules or `docs/contracts/bug-fix-workflow.yaml`.
- Do not modify `docs/templates/TEST_REPORT.md`'s or `docs/templates/TEST_PLAN.md`'s existing sections — only add new ones.

---

### Task 1: Canonical QA Agent rule and Claude Code adapter mirror

**Files:**
- Modify: `docs/workflow/role-definitions.md`
- Modify: `.claude/agents/qa-agent.md`

**Interfaces:**
- Consumes: approved design at `docs/superpowers/specs/2026-07-19-qa-testing-discipline-design.md`, SA Agent's already-landed `Dependency Boundary Rule` (`role-definitions.md` SA Agent section) and QA Agent's own already-landed `Dynamic Routing` rule.
- Produces: the `Test Effectiveness` canonical rule and eight-row Skill Routing table that Task 2's skill files, Task 4's `SKILL_CATALOG.md` entries, and Task 6's regression test all reference.

- [ ] **Step 1: Replace the Skill Routing table in `docs/workflow/role-definitions.md`.**

  Find (inside the `## QA Agent` section):

  ```markdown
  ### Skill Routing

  | Task | Skill |
  |------|-------|
  | Functional test analysis, IPO, happy/negative, BVA/EP, risk, traceability | `.agents/skills/functional-test-design/` |
  | Playwright E2E automation | `.agents/skills/qa-playwright-testing/` |
  | Security-sensitive test review | `.agents/skills/security-review/` |
  | Config or data validation workflow | `.agents/skills/data-config-change/` |
  ```

  Replace with:

  ```markdown
  ### Skill Routing

  | Task | Skill |
  |------|-------|
  | Functional test analysis, IPO, happy/negative, BVA/EP, risk, traceability | `.agents/skills/functional-test-design/` |
  | Playwright E2E automation | `.agents/skills/qa-playwright-testing/` |
  | Security-sensitive test review | `.agents/skills/security-review/` |
  | Config or data validation workflow | `.agents/skills/data-config-change/` |
  | Validate implementation against SA Agent's OpenAPI schema | `.agents/skills/api-contract-testing/` |
  | Execute Performance/Reliability/Scalability NFR targets (load, stress, spike, soak) | `.agents/skills/performance-testing/` |
  | Validate test effectiveness via mutation testing | `.agents/skills/mutation-testing/` |
  | Review Developer Agent's unit/component tests for quality and anti-patterns | `.agents/skills/test-quality-discipline/` |
  ```

- [ ] **Step 2: Insert the `Test Effectiveness` rule after `### NFR Validation` in `docs/workflow/role-definitions.md`.**

  Find:

  ```markdown
  ### NFR Validation

  When the SDD states Performance, Reliability, Observability, or Scalability targets, QA Agent checks whether they were validated and records the result — measured value, method, and pass/fail — in the test report. If a target cannot be validated within the current QA workflow (e.g., load testing is out of scope), record it as `Not validated — <reason>` rather than silently omitting it.
  ```

  Replace with:

  ```markdown
  ### NFR Validation

  When the SDD states Performance, Reliability, Observability, or Scalability targets, QA Agent checks whether they were validated and records the result — measured value, method, and pass/fail — in the test report. If a target cannot be validated within the current QA workflow (e.g., load testing is out of scope), record it as `Not validated — <reason>` rather than silently omitting it.

  ### Test Effectiveness

  QA Agent checks that Developer Agent's unit and component tests are effective, not merely present. Apply `test-quality-discipline`'s FIRST principles, Test Automation Pyramid balance, and Test Data Isolation Rule (a unit test must not hit a live database or network — mock or stub the I/O boundary) as review criteria, and flag anti-patterns (overmocking, fragile/implementation-detail assertions, weak/vague assertions, test-only production methods, incomplete mocks) as defects. For modules containing non-trivial business logic in the service layer (SA Agent's Dependency Boundary Rule), run mutation testing (`mutation-testing` skill) and record the measured mutation score and any unaddressed survived mutants in the test report — there is no fixed pass/fail threshold; the appropriate bar is a per-work-item judgment call, not a hardcoded gate. QA Agent does not rewrite Developer Agent's tests; a test-effectiveness gap is a defect routed to Developer Agent.
  ```

- [ ] **Step 3: Update the Skill Routing sentence in `.claude/agents/qa-agent.md`.**

  Find:

  ```markdown
  ## Skill Routing

  Route to `functional-test-design`, `qa-playwright-testing`, `security-review`, or `data-config-change` per the canonical Skill Routing table.
  ```

  Replace with:

  ```markdown
  ## Skill Routing

  Route to `functional-test-design`, `qa-playwright-testing`, `security-review`, `data-config-change`, `api-contract-testing`, `performance-testing`, `mutation-testing`, or `test-quality-discipline` per the canonical Skill Routing table.
  ```

- [ ] **Step 4: Insert a `Test Effectiveness` section into `.claude/agents/qa-agent.md`, mirroring the canonical rule.**

  Find:

  ```markdown
  ## NFR Validation

  Check the SDD's stated NFR targets were validated; record `Not validated — <reason>` when out of scope rather than omitting it.

  ## Required Behavior
  ```

  Replace with:

  ```markdown
  ## NFR Validation

  Check the SDD's stated NFR targets were validated; record `Not validated — <reason>` when out of scope rather than omitting it.

  ## Test Effectiveness

  Check that Developer Agent's unit/component tests are effective, not merely present, using `test-quality-discipline`'s FIRST principles, pyramid balance, and data isolation rule; flag anti-patterns as defects. For core business-logic/service-layer modules, run mutation testing and record the measured score — no fixed threshold. Route test-effectiveness gaps to Developer Agent; do not rewrite Developer Agent's tests.

  ## Required Behavior
  ```

- [ ] **Step 5: Check structure and whitespace.**

  Run:

  ```bash
  rg -n "api-contract-testing|performance-testing|mutation-testing|test-quality-discipline|Test Effectiveness" docs/workflow/role-definitions.md .claude/agents/qa-agent.md
  git diff --check
  ```

  Expected: all five terms appear in both files; `git diff --check` has no output.

- [ ] **Step 6: Commit.**

  ```bash
  git add docs/workflow/role-definitions.md .claude/agents/qa-agent.md
  git commit -m "docs: add QA Agent Test Effectiveness rule and route four new skills"
  ```

### Task 2: New `.agents/skills/` content — four new skills and the qa-playwright-testing accessibility extension

**Files:**
- Create: `.agents/skills/api-contract-testing/SKILL.md`
- Create: `.agents/skills/performance-testing/SKILL.md`
- Create: `.agents/skills/mutation-testing/SKILL.md`
- Create: `.agents/skills/test-quality-discipline/SKILL.md`
- Modify: `.agents/skills/qa-playwright-testing/SKILL.md`

**Interfaces:**
- Consumes: the `Test Effectiveness`, `API Contract Validation`, and `NFR Validation` canonical rules from Task 1; SA Agent's `API Contract Governance` and `Dependency Boundary Rule` (already landed, unmodified); QA Agent's `Dynamic Routing` rule and Developer Agent's ownership statement (already landed, unmodified).
- Produces: the five files Task 3 (Antigravity mirror), Task 4 (`SKILL_CATALOG.md` entries), and Task 6 (regression test) all reference.

- [ ] **Step 1: Create `.agents/skills/api-contract-testing/SKILL.md`.**

  ```bash
  mkdir -p .agents/skills/api-contract-testing
  ```

  Write:

  ```markdown
  ---
  name: api-contract-testing
  description: Validate REST API implementations against SA Agent's OpenAPI schema (request/response compliance, error format, pagination, versioning, auth). Use when SA Agent has published a machine-readable API contract and Developer Agent's implementation needs contract verification before QA sign-off.
  ---

  # api-contract-testing

  ## Purpose

  Operationalize QA Agent's API Contract Validation rule for this project's Django/DRF stack: verify an implementation actually matches the OpenAPI schema SA Agent's API Contract Governance rule requires, rather than trusting it by inspection alone.

  ## When to Use

  - SA Agent has produced or updated an OpenAPI schema (typically via `drf-spectacular`) for a new or changed endpoint.
  - Developer Agent has implemented against that schema and needs QA verification before the Cross-Platform Acceptance Criteria Gate can pass.

  ## Validation Approach

  1. Generate or refresh the schema: `python manage.py spectacular --file schema.yaml` (or this project's equivalent `drf-spectacular` command).
  2. Schema-driven property testing: run `schemathesis run schema.yaml --base-url <env>` against the live/staging DRF endpoint to fuzz request shapes the schema declares and assert the implementation's responses satisfy it.
  3. Checks the fuzzer can't infer on its own: authentication requirement enforced (401/403 as declared), pagination envelope matches (`?page=` / `?cursor=` per schema), API version path/header matches, error response body shape matches the schema's declared error format.
  4. Record each check's result in `docs/templates/TEST_REPORT.md` with the schemathesis run output (or manual request/response) attached as evidence, per QA Agent's Evidence-Based Reporting rule.

  ## Defect Routing

  A schema/implementation mismatch is a defect, not a QA judgment call to resolve — per the canonical API Contract Validation rule, route to Developer Agent if the code is wrong, or SA Agent if the schema itself is wrong or incomplete.

  ## Canonical References

  - `docs/workflow/role-definitions.md` (QA Agent → API Contract Validation; SA Agent → API Contract Governance)
  - `docs/templates/TEST_REPORT.md`
  ```

- [ ] **Step 2: Create `.agents/skills/performance-testing/SKILL.md`.**

  ```bash
  mkdir -p .agents/skills/performance-testing
  ```

  Write:

  ```markdown
  ---
  name: performance-testing
  description: Execute Performance/Reliability/Scalability NFR targets stated in an SDD — load, stress, spike, and soak testing methodology. Use when QA Agent's NFR Validation rule applies and the SDD states a measurable NFR target.
  ---

  # performance-testing

  ## Purpose

  Give QA Agent a repeatable method for validating the SDD's stated Performance/Reliability/Scalability NFR targets, so NFR Validation has an executable path instead of defaulting to `Not validated — <reason>` by default.

  ## Test Types

  - **Load Testing** — verify response times/throughput under the SDD's expected standard traffic volume.
  - **Stress Testing** — ramp traffic beyond the expected volume to find the breaking point.
  - **Spike Testing** — sudden extreme traffic surge; evaluate recovery and stability.
  - **Soak Testing** — sustained load over hours; surface memory leaks, resource exhaustion, data fragmentation.

  Choose the subset that matches the SDD's stated NFR target — not every change needs all four.

  ## Tooling

  No fixed tool is mandated by this skill — pick per the SDD or work item. Two options that fit this project's stack:

  - **Locust** — Python-native; scenarios are written in the same language as the Django app.
  - **k6** — JavaScript-based; useful when the team already has k6 infrastructure or CI integration.

  State the chosen tool and version in the test report.

  ## Recording Results

  Record every validated NFR target in `docs/templates/TEST_PLAN.md`'s "NFR Targets Under Test" table (Target / SDD Reference / Validation Method) and the measured outcome in `docs/templates/TEST_REPORT.md`: measured value, method, pass/fail. If a target genuinely cannot be validated in the current QA workflow, record `Not validated — <reason>` per the canonical NFR Validation rule — this skill exists to make that the exception, not the default, not to remove the escape hatch.

  ## Canonical References

  - `docs/workflow/role-definitions.md` (QA Agent → NFR Validation)
  - `docs/templates/TEST_PLAN.md`, `docs/templates/TEST_REPORT.md`
  ```

- [ ] **Step 3: Create `.agents/skills/mutation-testing/SKILL.md`.**

  ```bash
  mkdir -p .agents/skills/mutation-testing
  ```

  Write:

  ```markdown
  ---
  name: mutation-testing
  description: Validate that Python test suites actually catch bugs, using mutmut to introduce deliberate code mutations and measure how many are killed. Use for QA Agent's Test Effectiveness rule on core business-logic/service-layer modules.
  ---

  # mutation-testing

  ## Purpose

  Coverage percentage only proves code executed during a test run — not that the test would fail if the code were wrong. Mutation testing proves the latter by deliberately breaking the code in small ways and checking whether the test suite notices.

  ## Core Concept

  - **Mutant** — a small automated code change (e.g. `>` → `>=`, `and` → `or`, `True` → `False`).
  - **Killed** — a test failed against the mutant (good — the test caught the bug).
  - **Survived** — every test still passed against the mutant (bad — a weak test, or a coverage gap).
  - **Score** — percentage of mutants killed.

  ## Python (mutmut)

  ### Installation

  ```bash
  uv add --dev mutmut   # or: pip install mutmut
  ```

  ### Running

  ```bash
  uv run mutmut run              # run mutation testing
  uv run mutmut results          # summary
  uv run mutmut show <id>        # inspect one surviving mutant
  uv run mutmut html             # HTML report
  open html/index.html
  ```

  ## When to Apply

  Not every change needs mutation testing. Apply it to modules with non-trivial business logic in the service layer (SA Agent's Dependency Boundary Rule) — the modules where a weak test is most costly. Skip it for thin views/serializers/migrations.

  ## Scoring

  Record the measured score and the list of any unaddressed survived mutants in `docs/templates/TEST_REPORT.md`. There is no fixed pass/fail threshold mandated by this skill — the acceptable bar is a per-work-item judgment call (see the canonical Test Effectiveness rule), not a hardcoded gate.

  ## Improving a Survived Mutant

  A surviving mutant usually means either the assertion is too weak (assert a specific value, not just "is defined") or a boundary condition isn't tested. Route the finding to Developer Agent per the canonical Test Effectiveness rule — QA Agent does not rewrite Developer Agent's tests.

  ## Canonical References

  - `docs/workflow/role-definitions.md` (QA Agent → Test Effectiveness; SA Agent → Dependency Boundary Rule)
  - `docs/templates/TEST_REPORT.md`
  ```

- [ ] **Step 4: Create `.agents/skills/test-quality-discipline/SKILL.md`.**

  ```bash
  mkdir -p .agents/skills/test-quality-discipline
  ```

  Write:

  ```markdown
  ---
  name: test-quality-discipline
  description: Review Developer Agent's unit/component tests for effectiveness and anti-patterns — overmocking, fragile assertions, test-only production code, incomplete mocks. Use for QA Agent's Test Effectiveness rule on any change that adds or modifies unit/component tests.
  ---

  # test-quality-discipline

  ## Purpose

  A test suite that passes isn't automatically a good test suite. This skill gives QA Agent a concrete checklist for judging whether Developer Agent's unit/component tests are effective — a review discipline, not an authoring discipline; Developer Agent owns writing and fixing the tests themselves, per its role definition's opening ownership statement ("Owns implementation, refactoring, unit tests, migrations, and code-level fixes").

  ## FIRST Principles

  Every unit/component test should be:

  1. **Fast** — milliseconds, not seconds.
  2. **Isolated** — no dependency on other tests or execution order.
  3. **Repeatable** — same result every run, any machine.
  4. **Self-validating** — a clear programmatic pass/fail, no manual inspection.
  5. **Timely** — written alongside the code it covers, not weeks later.

  ## Test Automation Pyramid

  Expect the bulk of automated coverage as unit tests, a moderate layer of integration/API tests, and a thin layer of E2E tests (`qa-playwright-testing` scope). A change that is mostly E2E tests with few or no unit tests is itself a finding — flag it rather than treating "tests exist" as sufficient.

  ## Test Data Isolation Rule

  A unit or component test must not hit a live database, filesystem, or network — mock or stub the I/O boundary. An integration/E2E test that does hit real infrastructure must use proper setup/teardown so it leaves no residual state (this pairs with, and does not replace, `qa-playwright-testing`'s existing "seed test data through the API" rule, which governs E2E specifically).

  ## Anti-Pattern Checklist

  | Anti-Pattern | Symptom | Fix |
  |---|---|---|
  | Overmocking | More than 3-4 mocks in one test, or mocking pure functions/business logic | Mock only I/O boundaries; use real implementations for pure logic |
  | Testing Mocks | Assertion checks `mock.called` instead of actual output/state | Assert on behavior and output, not on whether a mock was invoked |
  | Fragile Tests | Test breaks on unrelated refactors (brittle selectors, internal-structure assertions) | Assert on public behavior/output, not implementation structure |
  | Poor/Weak Assertions | e.g. `assertIsNotNone(result)` where a specific value is knowable | Assert the specific expected value |
  | Test-Only Production Methods | Production code has `_reset_for_test()` or similar test-only hooks | Instantiate a fresh instance per test instead |
  | Incomplete Mocks | Stub returns a trivial shape (e.g. `{"success": True}`) that doesn't match real payload complexity | Use a factory that mirrors real production payload shape |

  ## Reporting

  Record findings in `docs/templates/TEST_REPORT.md`. A test-quality finding is a defect, routed to Developer Agent — QA Agent does not edit Developer Agent's test files.

  ## Canonical References

  - `docs/workflow/role-definitions.md` (QA Agent → Test Effectiveness and Dynamic Routing; Developer Agent → ownership of implementation, refactoring, unit tests, migrations, and code-level fixes)
  - `docs/templates/TEST_REPORT.md`
  ```

- [ ] **Step 5: Add the Accessibility Testing section to `.agents/skills/qa-playwright-testing/SKILL.md`.**

  Find:

  ```markdown
  - A flaky test leaves the merge-blocking suite within 24 hours and enters a triage queue with a root-cause note. Do not delete a flaky test without diagnosis, and do not leave it in the blocking suite "retried until green."

  ## Technical Reference
  ```

  Replace with:

  ```markdown
  - A flaky test leaves the merge-blocking suite within 24 hours and enters a triage queue with a root-cause note. Do not delete a flaky test without diagnosis, and do not leave it in the blocking suite "retried until green."

  ## Accessibility Testing

  Baseline: WCAG 2.1 AA. Integrate `@axe-core/playwright` into E2E flows that render UI.

  ```typescript
  import { AxeBuilder } from '@axe-core/playwright';

  test('homepage has no accessibility violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
  ```

  Classify violations by axe's own impact level (critical/serious/moderate/minor) in the test report. Route a violation to Developer Agent when it's an implementation defect (missing `alt`, unlabeled form control, insufficient contrast in an existing design). Route it to BA Agent when it traces back to a design/content decision — BA Agent is the correct first stop, but per its own Escalation: Production UI/UX Need rule, BA Agent does not resolve a production UI/UX design change itself and escalates it to Human; do not treat BA Agent as the terminus that fixes the decision.

  ## Technical Reference
  ```

  Note: the code block above is written with 2-space-indented triple-backtick fences because it sits inside this plan's own Step 5 fence — when applying this edit, use plain (non-indented) triple-backtick fences in the actual `qa-playwright-testing/SKILL.md` file, exactly as they appear in every other section of that file.

- [ ] **Step 6: Check structure and whitespace.**

  Run:

  ```bash
  rg -n "^name: (api-contract-testing|performance-testing|mutation-testing|test-quality-discipline)$" .agents/skills/*/SKILL.md
  rg -n "Accessibility Testing|axe-core" .agents/skills/qa-playwright-testing/SKILL.md
  git diff --check
  ```

  Expected: four `name:` matches, one file each; two `Accessibility Testing`/`axe-core` matches in `qa-playwright-testing/SKILL.md`; `git diff --check` has no output.

- [ ] **Step 7: Commit.**

  ```bash
  git add .agents/skills/api-contract-testing .agents/skills/performance-testing .agents/skills/mutation-testing .agents/skills/test-quality-discipline .agents/skills/qa-playwright-testing/SKILL.md
  git commit -m "feat: add four QA testing-discipline skills and accessibility testing"
  ```

### Task 3: Template changes — TEST_REPORT.md and TEST_PLAN.md

**Files:**
- Modify: `docs/templates/TEST_REPORT.md`
- Modify: `docs/templates/TEST_PLAN.md`

**Interfaces:**
- Consumes: nothing from Tasks 1-2 (these templates are referenced by, not dependent on, the new skills).
- Produces: the "Root Cause Analysis" section and the two new checkboxes that Task 6's regression test checks for.

- [ ] **Step 1: Add "Root Cause Analysis" to `docs/templates/TEST_REPORT.md`.**

  Find:

  ```markdown
  ## Failed Tests / Defects

  | ID | Scenario | Expected | Actual | Severity | Evidence |
  |---|---|---|---|---|---|
  |  |  |  |  |  |  |

  ## Coverage
  ```

  Replace with:

  ```markdown
  ## Failed Tests / Defects

  | ID | Scenario | Expected | Actual | Severity | Evidence |
  |---|---|---|---|---|---|
  |  |  |  |  |  |  |

  ## Root Cause Analysis

  For each Defect ID in the table above with a non-trivial root cause, add a block:

  ### Defect <ID>

  1. Why did it fail? —
  2. Why did that happen? —
  3. Why did that happen? —
  4. Why did that happen? —
  5. Why did that happen (root cause)? —

  **Fix Recommendation:**

  ## Coverage
  ```

- [ ] **Step 2: Add the two new checkboxes to `docs/templates/TEST_PLAN.md`.**

  Find:

  ```markdown
  ## Test Types In Scope

  - [ ] Unit
  - [ ] API
  - [ ] E2E
  - [ ] Regression
  - [ ] Performance / NFR

  ## Environment
  ```

  Replace with:

  ```markdown
  ## Test Types In Scope

  - [ ] Unit
  - [ ] API
  - [ ] E2E
  - [ ] Regression
  - [ ] Performance / NFR
  - [ ] Mutation Testing
  - [ ] Contract Validation

  ## Environment
  ```

- [ ] **Step 3: Check structure and whitespace.**

  Run:

  ```bash
  rg -n "Root Cause Analysis|Why did it fail" docs/templates/TEST_REPORT.md
  rg -n "Mutation Testing|Contract Validation" docs/templates/TEST_PLAN.md
  git diff --check
  ```

  Expected: both phrases found in `TEST_REPORT.md`; both checkboxes found in `TEST_PLAN.md`; `git diff --check` has no output.

- [ ] **Step 4: Commit.**

  ```bash
  git add docs/templates/TEST_REPORT.md docs/templates/TEST_PLAN.md
  git commit -m "docs: add Root Cause Analysis to TEST_REPORT.md and two checkboxes to TEST_PLAN.md"
  ```

### Task 4: Skill catalog entries

**Files:**
- Modify: `docs/operating-model/SKILL_CATALOG.md`

**Interfaces:**
- Consumes: the four skill names, triggers, and routing outcomes defined in Task 2.
- Produces: the catalog entries the existing test `'every .agents/skills/ directory is named somewhere in SKILL_CATALOG.md'` (`test/validate-contracts.test.mjs:14`) will check once Task 2's four new directories exist, plus content Task 6 checks explicitly.

- [ ] **Step 1: Add four new skill sections after the `git-workflow-and-versioning` section.**

  Find:

  ```markdown
  ## git-workflow-and-versioning

  | Field | Detail |
  |---|---|
  | Trigger | Every commit, or handing off a diff for review |
  | Primary Agent | Any agent |
  | Input | Staged changes |
  | Output | An atomic, type-prefixed commit; a change summary when handing off |
  | Do Not Use When | Nothing has been changed yet; choosing a release version or writing a changelog entry (Release Agent's job) |
  | Next Skill / Agent | code-review-gate, QA Agent |




  ## Skill Activation Examples
  ```

  Replace with:

  ```markdown
  ## git-workflow-and-versioning

  | Field | Detail |
  |---|---|
  | Trigger | Every commit, or handing off a diff for review |
  | Primary Agent | Any agent |
  | Input | Staged changes |
  | Output | An atomic, type-prefixed commit; a change summary when handing off |
  | Do Not Use When | Nothing has been changed yet; choosing a release version or writing a changelog entry (Release Agent's job) |
  | Next Skill / Agent | code-review-gate, QA Agent |

  ## api-contract-testing

  | Field | Detail |
  |---|---|
  | Trigger | SA Agent has published or updated an OpenAPI schema and Developer Agent's implementation needs contract verification before QA sign-off |
  | Primary Agent | QA Agent |
  | Input | OpenAPI schema (`drf-spectacular`), implemented endpoint, target environment |
  | Output | Contract validation evidence (schemathesis run output, checks) recorded in `TEST_REPORT.md` |
  | Do Not Use When | No OpenAPI schema exists yet — route to SA Agent's API Contract Governance rule first; or the task is designing API test *cases* rather than validating an existing implementation against a schema (that remains the still-unbuilt "API Test Design" Planned Skill) |
  | Next Skill / Agent | Developer Agent (implementation mismatch), SA Agent (schema mismatch) |

  ## performance-testing

  | Field | Detail |
  |---|---|
  | Trigger | SDD states a Performance/Reliability/Scalability NFR target that needs load/stress/spike/soak validation |
  | Primary Agent | QA Agent |
  | Input | SDD's stated NFR target, target environment, chosen tool (Locust/k6/other per SDD) |
  | Output | Measured value, method, pass/fail recorded in `TEST_PLAN.md`'s NFR Targets table and `TEST_REPORT.md` |
  | Do Not Use When | No NFR target is stated in the SDD — record `Not validated — <reason>` per the canonical NFR Validation rule instead of running this skill speculatively |
  | Next Skill / Agent | SA Agent (target itself questioned), Developer Agent (performance defect) |

  ## mutation-testing

  | Field | Detail |
  |---|---|
  | Trigger | QA Agent's Test Effectiveness rule applies to a core business-logic/service-layer module and coverage percentage alone isn't sufficient evidence |
  | Primary Agent | QA Agent |
  | Input | Existing unit/component test suite, target module (service layer) |
  | Output | Mutation score and survived-mutant list recorded in `TEST_REPORT.md` |
  | Do Not Use When | The module is a thin view/serializer/migration with no business logic; or coverage itself is still low (fix coverage gaps first) |
  | Next Skill / Agent | Developer Agent (weak test / survived mutant fix) |

  ## test-quality-discipline

  | Field | Detail |
  |---|---|
  | Trigger | QA Agent reviewing Developer Agent's unit/component tests for effectiveness — overmocking, fragile assertions, test-only hooks, weak assertions |
  | Primary Agent | QA Agent |
  | Input | Developer Agent's test files for the change under review |
  | Output | Anti-pattern findings recorded in `TEST_REPORT.md`, routed as defects |
  | Do Not Use When | Reviewing E2E/Playwright tests (use `qa-playwright-testing`'s own automation discipline instead) or designing new test cases (use `functional-test-design`) |
  | Next Skill / Agent | Developer Agent (test rewrite) |




  ## Skill Activation Examples
  ```

- [ ] **Step 2: Update the `Playwright QA` row in the top "Current Skills" table.**

  Find:

  ```markdown
  | Playwright QA | `.agents/skills/qa-playwright-testing/` | Need browser E2E automation, UI flow testing, screenshots/traces | Test scenarios, target URL/app, credentials/test data, selectors/locators | Playwright specs, test run notes, screenshots/traces | Need only functional test design without automation | QA Agent, Defect Analysis |
  ```

  Replace with:

  ```markdown
  | Playwright QA | `.agents/skills/qa-playwright-testing/` | Need browser E2E automation, UI flow testing, screenshots/traces, or WCAG 2.1 AA accessibility checks | Test scenarios, target URL/app, credentials/test data, selectors/locators | Playwright specs, test run notes, screenshots/traces, accessibility violation reports | Need only functional test design without automation | QA Agent, Defect Analysis |
  ```

- [ ] **Step 3: Add a clarifying note under the "Planned Skills" table.**

  Find:

  ```markdown
  Superseded (removed from this table because a real skill already covers the purpose): Data Change Validation and Config Change Validation → `data-config-change`; Code Review → `code-review-gate`; System Design Review → `sa-architecture-design`.


  ## ba-requirement-analysis
  ```

  Replace with:

  ```markdown
  Superseded (removed from this table because a real skill already covers the purpose): Data Change Validation and Config Change Validation → `data-config-change`; Code Review → `code-review-gate`; System Design Review → `sa-architecture-design`.

  Note: `api-contract-testing` (implemented this pass) validates an existing implementation against a published schema; the Planned "API Test Design" skill (still unbuilt) is for designing API test *cases* from a contract — related but distinct, not superseded. Similarly, `test-quality-discipline`'s anti-pattern review and `TEST_REPORT.md`'s new Root Cause Analysis section do not close the Planned "Defect Analysis" skill, which covers broader test-failure/log/screenshot analysis.


  ## ba-requirement-analysis
  ```

- [ ] **Step 4: Check structure and whitespace.**

  Run:

  ```bash
  rg -n "^## (api-contract-testing|performance-testing|mutation-testing|test-quality-discipline)$" docs/operating-model/SKILL_CATALOG.md
  rg -n "WCAG 2.1 AA accessibility checks" docs/operating-model/SKILL_CATALOG.md
  rg -n "API Test Design.*still unbuilt|Defect Analysis.*broader test-failure" docs/operating-model/SKILL_CATALOG.md
  git diff --check
  ```

  Expected: four `##` section matches; the updated Playwright QA row found; the clarifying note found; `git diff --check` has no output.

- [ ] **Step 5: Commit.**

  ```bash
  git add docs/operating-model/SKILL_CATALOG.md
  git commit -m "docs: add four QA skills to SKILL_CATALOG.md"
  ```

### Task 5: `.agent/skills/` (Antigravity CLI) full parity

**Files:**
- Create: `.agent/skills/api-contract-testing/SKILL.md`
- Create: `.agent/skills/performance-testing/SKILL.md`
- Create: `.agent/skills/mutation-testing/SKILL.md`
- Create: `.agent/skills/test-quality-discipline/SKILL.md`
- Create: `.agent/skills/qa-playwright-testing/SKILL.md`
- Create: `.agent/skills/ba-requirement-analysis/SKILL.md`
- Create: `.agent/skills/data-config-change/SKILL.md`
- Create: `.agent/skills/sa-architecture-design/SKILL.md`
- Create: `.agent/skills/security-review/SKILL.md`

**Interfaces:**
- Consumes: the five files Task 2 created/modified under `.agents/skills/`, plus the four pre-existing `.agents/skills/` files this step backfills unchanged.
- Produces: full parity between `.agent/skills/` and `.agents/skills/` that Task 6's regression test verifies.

- [ ] **Step 1: Copy the five files Task 2 touched.**

  ```bash
  mkdir -p .agent/skills/api-contract-testing .agent/skills/performance-testing .agent/skills/mutation-testing .agent/skills/test-quality-discipline .agent/skills/qa-playwright-testing
  cp .agents/skills/api-contract-testing/SKILL.md .agent/skills/api-contract-testing/SKILL.md
  cp .agents/skills/performance-testing/SKILL.md .agent/skills/performance-testing/SKILL.md
  cp .agents/skills/mutation-testing/SKILL.md .agent/skills/mutation-testing/SKILL.md
  cp .agents/skills/test-quality-discipline/SKILL.md .agent/skills/test-quality-discipline/SKILL.md
  cp .agents/skills/qa-playwright-testing/SKILL.md .agent/skills/qa-playwright-testing/SKILL.md
  ```

- [ ] **Step 2: Backfill the four skills missing from `.agent/skills/` since before this work.**

  These are straight copies of already-approved, already-shipped content — no new authoring.

  ```bash
  mkdir -p .agent/skills/ba-requirement-analysis .agent/skills/data-config-change .agent/skills/sa-architecture-design .agent/skills/security-review
  cp .agents/skills/ba-requirement-analysis/SKILL.md .agent/skills/ba-requirement-analysis/SKILL.md
  cp .agents/skills/data-config-change/SKILL.md .agent/skills/data-config-change/SKILL.md
  cp .agents/skills/sa-architecture-design/SKILL.md .agent/skills/sa-architecture-design/SKILL.md
  cp .agents/skills/security-review/SKILL.md .agent/skills/security-review/SKILL.md
  ```

- [ ] **Step 3: Verify full parity by directory name and content.**

  ```bash
  diff <(ls .agents/skills | sort) <(ls .agent/skills | sort)
  for name in $(ls .agents/skills); do
    diff ".agents/skills/$name/SKILL.md" ".agent/skills/$name/SKILL.md" && echo "OK: $name"
  done
  ```

  Expected: the first `diff` prints nothing (both directories list the same 20 names); every `diff` in the loop prints nothing and every line prints `OK: <name>`.

- [ ] **Step 4: Commit.**

  ```bash
  git add .agent/skills
  git commit -m "chore: bring .agent/skills/ (Antigravity CLI) to full parity with .agents/skills/"
  ```

### Task 6: Regression coverage

**Files:**
- Modify: `test/validate-contracts.test.mjs`

**Interfaces:**
- Consumes: the canonical rule and adapter mirror from Task 1, the five skill files from Task 2, the template changes from Task 3, the catalog entries from Task 4, and the `.agent/skills/` parity from Task 5.
- Produces: the tests this plan's `Final Review Scope` and the design spec's Acceptance Criteria 9-10 require.

- [ ] **Step 1: Extend the existing QA Agent canonical test to cover `Test Effectiveness` and the new templates.**

  Find (in `test/validate-contracts.test.mjs`):

  ```js
  test('QA Agent canonical rule carries its policy and the new evidence, contract, and NFR rules', async () => {
    const [roleDefinition, adapter, testPlan, playwrightSkill] = await Promise.all([
      readFile('docs/workflow/role-definitions.md', 'utf8'),
      readFile('.claude/agents/qa-agent.md', 'utf8'),
      readFile('docs/templates/TEST_PLAN.md', 'utf8'),
      readFile('.agents/skills/qa-playwright-testing/SKILL.md', 'utf8')
    ]);

    assert.match(roleDefinition, /### Skill Routing/);
    assert.match(roleDefinition, /### Dynamic Routing/);
    assert.match(roleDefinition, /### Output Expectations/);

    for (const content of [roleDefinition, adapter]) {
      assert.match(content, /Evidence-Based Reporting/);
      assert.match(content, /must reference the actual command output|attached evidence/i);
      assert.match(content, /API Contract Validation/);
      assert.match(content, /NFR Validation/);
    }
    assert.doesNotMatch(roleDefinition, /minimum of \d+[-–]\d+ issues/i);

    assert.match(testPlan, /Test Types In Scope/);
    assert.match(testPlan, /NFR Targets Under Test/);

    assert.match(playwrightSkill, /Automation Discipline/);
    assert.match(playwrightSkill, /No hard waits/);
    assert.match(playwrightSkill, /role-based selectors/i);
    assert.match(playwrightSkill, /24 hours/);
  });
  ```

  Replace with:

  ```js
  test('QA Agent canonical rule carries its policy and the new evidence, contract, and NFR rules', async () => {
    const [roleDefinition, adapter, testPlan, testReport, playwrightSkill] = await Promise.all([
      readFile('docs/workflow/role-definitions.md', 'utf8'),
      readFile('.claude/agents/qa-agent.md', 'utf8'),
      readFile('docs/templates/TEST_PLAN.md', 'utf8'),
      readFile('docs/templates/TEST_REPORT.md', 'utf8'),
      readFile('.agents/skills/qa-playwright-testing/SKILL.md', 'utf8')
    ]);

    assert.match(roleDefinition, /### Skill Routing/);
    assert.match(roleDefinition, /### Dynamic Routing/);
    assert.match(roleDefinition, /### Output Expectations/);
    assert.match(roleDefinition, /### Test Effectiveness/);
    assert.match(roleDefinition, /api-contract-testing/);
    assert.match(roleDefinition, /performance-testing/);
    assert.match(roleDefinition, /mutation-testing/);
    assert.match(roleDefinition, /test-quality-discipline/);

    for (const content of [roleDefinition, adapter]) {
      assert.match(content, /Evidence-Based Reporting/);
      assert.match(content, /must reference the actual command output|attached evidence/i);
      assert.match(content, /API Contract Validation/);
      assert.match(content, /NFR Validation/);
      assert.match(content, /Test Effectiveness/);
    }
    assert.doesNotMatch(roleDefinition, /minimum of \d+[-–]\d+ issues/i);

    assert.match(testPlan, /Test Types In Scope/);
    assert.match(testPlan, /NFR Targets Under Test/);
    assert.match(testPlan, /Mutation Testing/);
    assert.match(testPlan, /Contract Validation/);

    assert.match(testReport, /Root Cause Analysis/);
    assert.match(testReport, /Why did it fail\?/);

    assert.match(playwrightSkill, /Automation Discipline/);
    assert.match(playwrightSkill, /No hard waits/);
    assert.match(playwrightSkill, /role-based selectors/i);
    assert.match(playwrightSkill, /24 hours/);
    assert.match(playwrightSkill, /Accessibility Testing/);
    assert.match(playwrightSkill, /WCAG 2\.1 AA/);
    assert.match(playwrightSkill, /axe-core\/playwright/);
  });
  ```

- [ ] **Step 2: Add a test for the four new skill files' key content.**

  Find (in `test/validate-contracts.test.mjs`, immediately after the block just replaced in Step 1, before `test('Developer Agent requires architecture compliance...`):

  ```js
  test('Developer Agent requires architecture compliance, definition-of-done restatement, incremental verification, and escalation discipline', async () => {
  ```

  Insert a new test directly before that line:

  ```js
  test('the four new QA testing-discipline skills carry their required content', async () => {
    const [apiContract, performance, mutation, testQuality] = await Promise.all([
      readFile('.agents/skills/api-contract-testing/SKILL.md', 'utf8'),
      readFile('.agents/skills/performance-testing/SKILL.md', 'utf8'),
      readFile('.agents/skills/mutation-testing/SKILL.md', 'utf8'),
      readFile('.agents/skills/test-quality-discipline/SKILL.md', 'utf8')
    ]);

    assert.match(apiContract, /schemathesis/);
    assert.match(apiContract, /drf-spectacular/);
    assert.match(apiContract, /## Defect Routing/);

    assert.match(performance, /Load Testing/);
    assert.match(performance, /Stress Testing/);
    assert.match(performance, /Spike Testing/);
    assert.match(performance, /Soak Testing/);
    assert.match(performance, /Locust/);
    assert.match(performance, /## Recording Results/);

    assert.match(mutation, /## Core Concept/);
    assert.match(mutation, /mutmut/);
    assert.match(mutation, /## Scoring/);
    assert.doesNotMatch(mutation, /pass\/fail threshold of \d+%/i);

    assert.match(testQuality, /## FIRST Principles/);
    assert.match(testQuality, /Test Automation Pyramid/);
    assert.match(testQuality, /Test Data Isolation Rule/);
    assert.match(testQuality, /Overmocking/);
    assert.match(testQuality, /Test-Only Production Methods/);
    assert.match(testQuality, /Incomplete Mocks/);
  });

  test('SKILL_CATALOG.md carries all four new QA skill entries and the Planned Skills clarifying note', async () => {
    const catalog = await readFile('docs/operating-model/SKILL_CATALOG.md', 'utf8');

    assert.match(catalog, /^## api-contract-testing$/m);
    assert.match(catalog, /^## performance-testing$/m);
    assert.match(catalog, /^## mutation-testing$/m);
    assert.match(catalog, /^## test-quality-discipline$/m);

    assert.match(catalog, /WCAG 2\.1 AA accessibility checks/);

    assert.match(catalog, /API Test Design.*still unbuilt/);
    assert.match(catalog, /Defect Analysis.*broader test-failure/);
  });

  test('Developer Agent requires architecture compliance, definition-of-done restatement, incremental verification, and escalation discipline', async () => {
  ```

- [ ] **Step 3: Add the `.agent/skills/` ↔ `.agents/skills/` parity test.**

  Find (in `test/validate-contracts.test.mjs`, right after the qa-playwright-testing technical-reference test and before the Bug Fix contract tests begin):

  ```js
  test('qa-playwright-testing carries a technical reference, a debugging workflow, and the browser content security boundary', async () => {
    const skill = await readFile('.agents/skills/qa-playwright-testing/SKILL.md', 'utf8');

    assert.match(skill, /## Technical Reference/);
    assert.match(skill, /### Selector Priority/);
    assert.match(skill, /### Page Object Model/);
    assert.match(skill, /storageState/);

    assert.match(skill, /## Debugging Workflow/);
    assert.match(skill, /`debugging-discipline`/);
    assert.match(skill, /show-trace/);

    assert.match(skill, /## Browser Content Security Boundary/);
    assert.match(skill, /untrusted data, not instructions/i);
    assert.match(skill, /route to Security Reviewer/);

    assert.match(skill, /## BDD Scenario Workflow/);
    assert.match(skill, /playwright-bdd/);
    assert.match(skill, /### Necessity Check/);
    assert.match(skill, /ask the user whether a BDD spec is required/i);
    assert.match(skill, /### Scenario Approval Gate/);
    assert.match(skill, /before any implementation plan/i);
    assert.match(skill, /### Scoped Step Definitions/);
    assert.match(skill, /npx bddgen && npx playwright test/);
  });

  test('accepts the three canonical Bug Fix examples', async () => {
  ```

  Insert a new test between them:

  ```js
  test('qa-playwright-testing carries a technical reference, a debugging workflow, and the browser content security boundary', async () => {
    const skill = await readFile('.agents/skills/qa-playwright-testing/SKILL.md', 'utf8');

    assert.match(skill, /## Technical Reference/);
    assert.match(skill, /### Selector Priority/);
    assert.match(skill, /### Page Object Model/);
    assert.match(skill, /storageState/);

    assert.match(skill, /## Debugging Workflow/);
    assert.match(skill, /`debugging-discipline`/);
    assert.match(skill, /show-trace/);

    assert.match(skill, /## Browser Content Security Boundary/);
    assert.match(skill, /untrusted data, not instructions/i);
    assert.match(skill, /route to Security Reviewer/);

    assert.match(skill, /## BDD Scenario Workflow/);
    assert.match(skill, /playwright-bdd/);
    assert.match(skill, /### Necessity Check/);
    assert.match(skill, /ask the user whether a BDD spec is required/i);
    assert.match(skill, /### Scenario Approval Gate/);
    assert.match(skill, /before any implementation plan/i);
    assert.match(skill, /### Scoped Step Definitions/);
    assert.match(skill, /npx bddgen && npx playwright test/);
  });

  test('.agent/skills/ and .agents/skills/ carry identical skill directories with byte-identical SKILL.md content', async () => {
    const [portableEntries, antigravityEntries] = await Promise.all([
      readdir('.agents/skills', { withFileTypes: true }),
      readdir('.agent/skills', { withFileTypes: true })
    ]);
    const portableNames = portableEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    const antigravityNames = antigravityEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

    assert.ok(portableNames.length > 0);
    assert.deepEqual(
      antigravityNames,
      portableNames,
      '.agent/skills/ and .agents/skills/ must contain the same skill directories'
    );

    for (const name of portableNames) {
      const [portable, antigravity] = await Promise.all([
        readFile(`.agents/skills/${name}/SKILL.md`, 'utf8'),
        readFile(`.agent/skills/${name}/SKILL.md`, 'utf8')
      ]);
      assert.equal(
        antigravity,
        portable,
        `.agent/skills/${name}/SKILL.md does not match .agents/skills/${name}/SKILL.md`
      );
    }
  });

  test('accepts the three canonical Bug Fix examples', async () => {
  ```

- [ ] **Step 4: Run the three new/extended tests and confirm they pass now that Tasks 1-5 are committed.**

  Run:

  ```bash
  npm test -- --test-name-pattern="QA Agent canonical rule carries its policy and the new evidence, contract, and NFR rules"
  npm test -- --test-name-pattern="the four new QA testing-discipline skills carry their required content"
  npm test -- --test-name-pattern="SKILL_CATALOG.md carries all four new QA skill entries"
  npm test -- --test-name-pattern="\.agent/skills/ and \.agents/skills/ carry identical skill directories"
  ```

  Expected: all four PASS.

- [ ] **Step 5: Sanity-check the parity test is not tautological.**

  ```bash
  cp .agent/skills/mutation-testing/SKILL.md /tmp/mutation-testing-skill-backup.md
  echo "" >> .agent/skills/mutation-testing/SKILL.md
  npm test -- --test-name-pattern="\.agent/skills/ and \.agents/skills/ carry identical skill directories"
  cp /tmp/mutation-testing-skill-backup.md .agent/skills/mutation-testing/SKILL.md
  npm test -- --test-name-pattern="\.agent/skills/ and \.agents/skills/ carry identical skill directories"
  ```

  Expected: first run FAILS (content mismatch on `mutation-testing`), second run (after restore) PASSES.

- [ ] **Step 6: Run the full test suite, contract validation, and whitespace check.**

  ```bash
  npm test
  npm run validate:contracts
  git diff --check
  ```

  Expected: all Node tests pass, three more than before this task (the new-skills test, the `SKILL_CATALOG.md` test, and the `.agent/skills/` parity test — the QA Agent canonical test grew more assertions but is still one test, not a new one); contract validation prints `Contract validation passed.`; whitespace check has no output.

- [ ] **Step 7: Commit.**

  ```bash
  git add test/validate-contracts.test.mjs
  git commit -m "test: add regression coverage for QA testing-discipline skills and Antigravity parity"
  ```

### Task 7: Record project state and reviewer handoff

**Files:**
- Modify: `PROJECT_STATUS.md`
- Modify: `TASK_LOG.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: the implemented rule, skills, templates, catalog entries, adapter parity, and test results from Tasks 1-6.
- Produces: durable state/history evidence for QA/reviewer handoff and the eventual PR body.

- [ ] **Step 1: Replace `PROJECT_STATUS.md`'s `## Current Work Item` and add a `## In Progress` line.**

  Find:

  ```markdown
  ## Current Work Item
  - None — no active in-progress item. GitHub Issue #41 (repo housekeeping) is complete and closed. GitHub Issue #35 is closed (`COMPLETED`) by Human Maintainer decision; Phase A and Phase B v1 are both merged to `main` and no further phase is authorized.

  ## Current Stage
  - Idle — awaiting next intake

  ## Change Classification
  - Not applicable — no active work item
  ```

  Replace with:

  ```markdown
  ## Current Work Item
  - ID: QA-TESTING-DISCIPLINE-2026-07-19
  - Title: QA Agent testing-discipline enrichment — Test Effectiveness rule, four new skills, Antigravity CLI full parity
  - Owner: Developer / Implementation Agent
  - Status: Ready for Review
  - Tracked as GitHub Issue #44; SA Agent design review returned "Approve with minor notes" (both findings fixed in the spec before implementation)

  ## Current Stage
  - QA Testing-Discipline Enrichment / Reviewer Gate

  ## Change Classification
  - Change Type: Documentation and process-governance change with regression coverage
  - Risk Level: Medium
  - Code Change Required: Yes — scoped Node regression coverage
  - Architecture Change Required: No — extends the existing QA/SA rule cross-references already landed this session
  - Security Review Required: No
  ```

- [ ] **Step 2: Add Completed bullets.**

  Find:

  ```markdown
  - GitHub Issue #41 (repo housekeeping and knowledge-base setup) merged through PR #42 as commit `1448b63`, then closed. Delivered: `docs/records/` reorganized into type subfolders with `YYYY-MM-DD-slug.md` naming (and `scripts/validate-dispatch-receipts.mjs` updated to match); `scripts/housekeeping-worktrees.mjs` (list/prune `.worktrees/`, using `gh pr list --state merged` as the primary signal for this repo's squash-merge convention, with a `git branch --merged` fallback) plus an optional `.githooks/post-merge` warn-only hook; `scripts/reset-to-template.mjs` (dry-run by default, `--apply` to reset project-state files and clear `docs/records/*/`); README updated to document both scripts and previously-undocumented systems (lifecycle/readiness gate, dispatch-receipt ledger); `.obsidian/` tracked as a shared vault with `docs/vault/00-Index.md` hand-linking every role/skill adapter. A same-PR follow-up commit `da1e3e5` fixed QA-3 (`--prune` could force-remove a worktree with uncommitted/untracked changes) and was independently re-verified RESOLVED by QA. Four non-blocking findings from the same review — QA-1 (handoff-folder scan no longer filename-filtered), QA-2 (stale docstring path), QA-4 (`clearDirectory` silent no-op on a missing declared directory), QA-5 (`isWorktreeDirty` has no error handling for a worktree deleted outside git's knowledge) — are Boss-approved, tracked, unscheduled follow-up, not open work on this Issue.

  ## In Progress
  - None. No active work item is in progress.
  ```

  Replace with:

  ```markdown
  - GitHub Issue #41 (repo housekeeping and knowledge-base setup) merged through PR #42 as commit `1448b63`, then closed. Delivered: `docs/records/` reorganized into type subfolders with `YYYY-MM-DD-slug.md` naming (and `scripts/validate-dispatch-receipts.mjs` updated to match); `scripts/housekeeping-worktrees.mjs` (list/prune `.worktrees/`, using `gh pr list --state merged` as the primary signal for this repo's squash-merge convention, with a `git branch --merged` fallback) plus an optional `.githooks/post-merge` warn-only hook; `scripts/reset-to-template.mjs` (dry-run by default, `--apply` to reset project-state files and clear `docs/records/*/`); README updated to document both scripts and previously-undocumented systems (lifecycle/readiness gate, dispatch-receipt ledger); `.obsidian/` tracked as a shared vault with `docs/vault/00-Index.md` hand-linking every role/skill adapter. A same-PR follow-up commit `da1e3e5` fixed QA-3 (`--prune` could force-remove a worktree with uncommitted/untracked changes) and was independently re-verified RESOLVED by QA. Four non-blocking findings from the same review — QA-1 (handoff-folder scan no longer filename-filtered), QA-2 (stale docstring path), QA-4 (`clearDirectory` silent no-op on a missing declared directory), QA-5 (`isWorktreeDirty` has no error handling for a worktree deleted outside git's knowledge) — are Boss-approved, tracked, unscheduled follow-up, not open work on this Issue.
  - GitHub Issue #44 (QA testing-discipline enrichment) design spec produced via `superpowers:brainstorming`, expanded through two Boss-directed scope rounds (full `.agent/skills/` parity backfill, `SKILL_CATALOG.md` linkage), reviewed by SA Agent (Approve with minor notes — two citation-precision findings, both fixed before implementation planning). Implementation added: canonical `Test Effectiveness` rule and four new Skill Routing rows; four new skills (`api-contract-testing`, `performance-testing`, `mutation-testing`, `test-quality-discipline`); an Accessibility Testing section in `qa-playwright-testing`; `Root Cause Analysis` in `TEST_REPORT.md` and two new checkboxes in `TEST_PLAN.md`; four `SKILL_CATALOG.md` entries; full `.agent/skills/`↔`.agents/skills/` parity (20 identical skills); regression coverage including a directory-and-content parity test.

  ## In Progress
  - Independent review of the QA testing-discipline rule, four new skills, template/catalog changes, and Antigravity parity (uncommitted until this item's reviewer handoff lands).
  ```

- [ ] **Step 3: Update `## Blockers / Open Questions` and `## Required Artifacts`.**

  Find:

  ```markdown
  ## Blockers / Open Questions
  - R-002: `.gitlab-ci.yml` has not yet been validated on a live GitLab runner; this is an external verification follow-up, not an active implementation task.
  - Deferred and unscheduled: a Prototype/Spike workflow route and a shared cross-role template pattern.
  - Deferred and unscheduled housekeeping follow-up (Issue #41, Boss-approved, non-blocking): QA-1, QA-2, QA-4, QA-5 — see the Completed section entry for detail. No Issue is open for this yet; track it when the follow-up is scheduled.
  - Any Issue #35 durable-dispatcher continuation (host-invocation capability or GitLab Phase C) requires opening a fresh Issue and a new Human Maintainer sponsorship decision; Issue #35 itself is closed.

  ## Required Artifacts
  - None pending.
  ```

  Replace with:

  ```markdown
  ## Blockers / Open Questions
  - R-002: `.gitlab-ci.yml` has not yet been validated on a live GitLab runner; this is an external verification follow-up, not an active implementation task.
  - Deferred and unscheduled: a Prototype/Spike workflow route and a shared cross-role template pattern.
  - Deferred and unscheduled housekeeping follow-up (Issue #41, Boss-approved, non-blocking): QA-1, QA-2, QA-4, QA-5 — see the Completed section entry for detail. No Issue is open for this yet; track it when the follow-up is scheduled.
  - Any Issue #35 durable-dispatcher continuation (host-invocation capability or GitLab Phase C) requires opening a fresh Issue and a new Human Maintainer sponsorship decision; Issue #35 itself is closed.
  - `api-contract-testing`, `performance-testing`, and `mutation-testing` document tooling (`schemathesis`, `drf-spectacular`, Locust/k6, `mutmut`) that is not installed anywhere in this repo — intentional per the design spec, since this repo has no Django/Python target application yet. Wiring is deferred to whenever a real work item first needs to execute one of these skills.

  ## Required Artifacts
  - `docs/superpowers/specs/2026-07-19-qa-testing-discipline-design.md`
  - `docs/superpowers/plans/2026-07-19-qa-testing-discipline.md`
  - `docs/workflow/role-definitions.md` (QA Agent → Test Effectiveness)
  - `.claude/agents/qa-agent.md`
  - `.agents/skills/api-contract-testing/SKILL.md`, `.agents/skills/performance-testing/SKILL.md`, `.agents/skills/mutation-testing/SKILL.md`, `.agents/skills/test-quality-discipline/SKILL.md`
  - `.agents/skills/qa-playwright-testing/SKILL.md`
  - `.agent/skills/` (full parity mirror)
  - `docs/templates/TEST_REPORT.md`, `docs/templates/TEST_PLAN.md`
  - `docs/operating-model/SKILL_CATALOG.md`
  - `test/validate-contracts.test.mjs`
  ```

- [ ] **Step 4: Update `## Next Quality Gate` and `## Recommended Next Agent`.**

  Find:

  ```markdown
  ## Next Quality Gate
  - None active. A future durable-dispatcher continuation (new Issue) would require Human Maintainer sponsorship, then SA design → Security review → human approval before implementation planning.

  ## Recommended Next Agent
  - None — idle. Human Maintainer decides intake for the next work item.
  ```

  Replace with:

  ```markdown
  ## Next Quality Gate
  - Reviewer confirms the canonical rule, Claude adapter, and four new skills agree; that the `.agent/skills/` parity test is meaningful (verified non-tautological in Task 6); and that no fixed Quality Gate Metrics number was introduced anywhere.

  ## Recommended Next Agent
  - Reviewer, then QA Agent for the Cross-Platform Acceptance Criteria Gate on GitHub Issue #44
  ```

- [ ] **Step 5: Add a Notes entry.**

  Find the end of `## Notes` (the last bullet in the file, currently):

  ```markdown
  - This closeout (`docs/issue-41-closeout-pr42`) covers PR #42 (Issue #41). `gh pr list --state all --label post-merge-closeout` confirmed only PR #42 carried the signal at the time this closeout started, so its marker cites `source-pr-42` with no other label to clear manually. Separately, GitHub Issue #35 was closed today (`COMPLETED`) by Human Maintainer decision; that closure is unrelated to Issue #41/PR #42 but is reconciled in this same closeout since project state had not yet reflected it.
  ```

  Add immediately after it:

  ```markdown
  - GitHub Issue #44's design spec went through two Boss-directed scope expansions after initial brainstorming: first, mirroring the four new QA skills into `.agent/skills/` (Antigravity CLI) rather than leaving it out of scope by analogy to `qa-playwright-testing` not living there; second, backfilling the four pre-existing `.agent/skills/` gaps unrelated to QA (`ba-requirement-analysis`, `data-config-change`, `sa-architecture-design`, `security-review`) in the same pass rather than deferring them. SA Agent's design review (in-turn dispatch, same session) returned two non-blocking citation-precision findings — both about which existing rule a new skill's `Canonical References` cited, not about policy correctness — fixed in the spec before this plan was written.
  ```

- [ ] **Step 6: Append a `TASK_LOG.md` row.**

  ```markdown
  | 2026-07-19 | QA-TESTING-DISCIPLINE-2026-07-19 | Developer / Implementation Agent | User asked for a review of QA Agent's skill coverage; identified that `API Contract Validation` and `NFR Validation` had no executable skill, and that QA had no test-effectiveness coverage at all. Reviewed 4 `secondsky` reference skills and one user-supplied `test-master` reference, adopting reduced concepts from `test-quality-analysis`, `mutation-testing` (Python/mutmut only), and `playwright` (accessibility), excluding `vitest-testing` (off-stack) and `test-master`'s TDD/DoR/OWASP/quota content (belongs to other roles) | Added canonical `Test Effectiveness` rule and four Skill Routing rows; created `api-contract-testing`, `performance-testing`, `mutation-testing`, `test-quality-discipline` skills; added Accessibility Testing to `qa-playwright-testing`; added `Root Cause Analysis` to `TEST_REPORT.md` and two checkboxes to `TEST_PLAN.md`; added four `SKILL_CATALOG.md` entries; brought `.agent/skills/` to full 20-skill parity with `.agents/skills/` (backfilling four pre-existing unrelated gaps at Boss's direction); added regression coverage including a directory-and-content parity test, verified non-tautological | SA Agent (design review, in-turn dispatch), then Reviewer | Explicitly excluded: fixed Quality Gate Metrics numbers, a separate accessibility skill, standardizing one performance-testing tool, and mirroring into `.codex/` (different adapter shape, no existing parity pattern) |
  ```

- [ ] **Step 7: Add a `CHANGELOG.md` entry.**

  In `CHANGELOG.md`, under `## Unreleased` / `### Added`, add as the first bullet:

  ```markdown
  - QA Agent testing-discipline enrichment (Issue #44): a new `Test Effectiveness` canonical rule; four new skills (`api-contract-testing`, `performance-testing`, `mutation-testing`, `test-quality-discipline`); Accessibility Testing (WCAG 2.1 AA, `@axe-core/playwright`) added to `qa-playwright-testing`; `Root Cause Analysis` (5 Whys) added to `TEST_REPORT.md` and Mutation Testing/Contract Validation checkboxes to `TEST_PLAN.md`; four new `SKILL_CATALOG.md` entries; and full `.agent/skills/` (Antigravity CLI) parity with `.agents/skills/` across all 20 skills, with regression coverage.
  ```

- [ ] **Step 8: Run final evidence checks.**

  ```bash
  npm test
  npm run validate:contracts
  git diff --check
  git status --short
  ```

  Expected: all tests pass, contract validation passes, no whitespace errors, and only Task 7 files are unstaged before commit.

- [ ] **Step 9: Commit.**

  ```bash
  git add PROJECT_STATUS.md TASK_LOG.md CHANGELOG.md
  git commit -m "docs: record QA testing-discipline enrichment rollout"
  ```

## Final Review Scope

- Confirm the canonical `Test Effectiveness` rule and its Claude adapter mirror agree, and that `API Contract Validation`/`NFR Validation` rule text is byte-for-byte unchanged (`git diff` on `role-definitions.md` should show only additions, no deletions inside those two sections).
- Confirm each of the four new skill files has correct frontmatter (`name`, `description`) and matches the content specified in the design spec exactly.
- Confirm `.agent/skills/` and `.agents/skills/` carry the identical 20-skill set with byte-identical content (Task 5, Step 3's `diff` output and Task 6's regression test).
- Confirm the parity regression test is meaningful: it fails when a mirrored file is edited on only one side (verified in Task 6, Step 5) and passes when restored.
- Confirm `TEST_REPORT.md` and `TEST_PLAN.md` retain all pre-existing sections unchanged in intent — only additive sections/checkboxes were introduced.
- Confirm no new content anywhere states a fixed Quality Gate Metrics number (coverage %, MTTR, defect leakage rate, flaky rate, or a mutation-score/performance pass/fail threshold).
- Confirm `api-contract-testing` and `performance-testing` correctly reference SA Agent's existing `API Contract Governance` and NFR framing rather than redefining them, and that `mutation-testing`/`test-quality-discipline` correctly reference SA Agent's `Dependency Boundary Rule` and QA Agent's own `Dynamic Routing` rule (not Developer Agent's `Escalation Discipline` — the citation SA Agent's review flagged and this plan already fixed in the spec).
- Confirm project state correctly hands off to Reviewer and then QA Agent for the Cross-Platform Acceptance Criteria Gate on GitHub Issue #44.
