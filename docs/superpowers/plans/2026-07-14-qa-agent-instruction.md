# QA Agent Instruction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix QA Agent's inverted canonical/adapter relationship, add three new canonical rules (Evidence-Based Reporting, API Contract Validation, NFR Validation), and expand `TEST_PLAN.md` and the `qa-playwright-testing` skill to match.

**Architecture:** `docs/workflow/role-definitions.md` becomes the canonical source of QA Agent's full operating policy (skill routing, dynamic routing, output expectations, and the three new rules). `.claude/agents/qa-agent.md` is reduced to a faithful adapter that restates but does not redefine the canonical rule, matching the pattern already used for `.claude/agents/sa-agent.md` and `.claude/agents/ba-agent.md`. `docs/templates/TEST_PLAN.md` and `.agents/skills/qa-playwright-testing/SKILL.md` gain new required content. A Node regression test asserts all of it stays present.

**Tech Stack:** Markdown, existing Node `node:test` quality checks, Git.

## Global Constraints

- The canonical QA Agent section must contain, verbatim in structure: Skill Routing table, Functional Testing Rule, Dynamic Routing, Output Expectations, Evidence-Based Reporting, API Contract Validation, NFR Validation.
- The Evidence-Based Reporting rule must NOT include a "find a minimum of N issues" quota — that mechanic was explicitly rejected in the design spec as a fantasy-reporting failure mode, just inverted.
- `.claude/agents/qa-agent.md` keeps its `Source of Truth` reading list (adapter-specific) but must not duplicate the full policy prose that now lives only in the canonical file.
- `docs/templates/TEST_PLAN.md`'s existing Metadata, Assumptions, Open Questions, Risks, and Approval / Review sections must remain unchanged.
- Do not change `AGENTS.md` Dynamic Routing Rules or `docs/contracts/bug-fix-workflow.yaml`.

---

### Task 1: Replace the canonical QA Agent section and reduce the Claude adapter

**Files:**
- Modify: `docs/workflow/role-definitions.md`
- Modify: `.claude/agents/qa-agent.md`

**Interfaces:**
- Consumes: approved design at `docs/superpowers/specs/2026-07-14-qa-agent-instruction-design.md`.
- Produces: the canonical QA Agent lifecycle rule (all seven subsections) that Task 3's regression test and Task 2's template/skill changes reference.

- [ ] **Step 1: Replace the `## QA Agent` section in `docs/workflow/role-definitions.md`.**

  Find the current section:

  ```markdown
  ## QA Agent

  Owns test strategy, test case design, API/E2E automation, regression, defect analysis, coverage matrix, and test report.
  ```

  Replace it with:

  ```markdown
  ## QA Agent

  Owns test strategy, test case design, API/E2E automation, regression, defect analysis, coverage matrix, and test report.

  ### Skill Routing

  | Task | Skill |
  |------|-------|
  | Functional test analysis, IPO, happy/negative, BVA/EP, risk, traceability | `.agents/skills/functional-test-design/` |
  | Playwright E2E automation | `.agents/skills/qa-playwright-testing/` |
  | Security-sensitive test review | `.agents/skills/security-review/` |
  | Config or data validation workflow | `.agents/skills/data-config-change/` |

  ### Functional Testing Rule

  When the user asks for functional test cases, TDD test cases, requirement coverage, FS analysis, IPO matrix, happy/negative cases, BVA, EP, exploratory charter, or traceability, invoke the `functional-test-design` skill. Do not implement automation scripts unless explicitly requested. Produce automation-ready functional test design first.

  ### Dynamic Routing

  QA work is bidirectional:

  - If acceptance criteria are unclear, route back to BA Agent.
  - If function spec or API contract is insufficient, route back to SA Agent.
  - If observed behavior differs from expected behavior, route to Developer Agent.
  - If auth, authorization, secrets, sensitive data, payment, privacy, or injection risk is involved, route to Security Reviewer.
  - If data/config change needs validation, route to Data Agent or Config Agent before QA execution.

  ### Output Expectations

  Use Markdown tables. Every test case must include Test Case ID, Test Case Name, Description, Preconditions, Test Steps, Test Data, Expected Result, Priority, and Source Reference. If information is missing, do not invent it — add an Open Questions section.

  ### Evidence-Based Reporting

  Every QA claim — pass/fail count, coverage percentage, defect status — must reference the actual command output, screenshot, or log that produced it. Do not assert a result without evidence attached. Record evidence references in `docs/templates/TEST_REPORT.md`'s existing fields. Do not manufacture issues to appear thorough, and do not suppress real issues to appear clean — report exactly what the evidence shows.

  ### API Contract Validation

  When SA Agent has produced an OpenAPI schema under its API Contract Governance rule, QA Agent validates the implementation against that schema before approving: request/response schema compliance, error response format, pagination, versioning, and authentication requirement. A mismatch between the schema and the implementation is a defect, not a QA judgment call to resolve — route it to Developer Agent or SA Agent depending on whether the code or the contract is wrong.

  ### NFR Validation

  When the SDD states Performance, Reliability, Observability, or Scalability targets, QA Agent checks whether they were validated and records the result — measured value, method, and pass/fail — in the test report. If a target cannot be validated within the current QA workflow (e.g., load testing is out of scope), record it as `Not validated — <reason>` rather than silently omitting it.
  ```

- [ ] **Step 2: Replace `.claude/agents/qa-agent.md` in full.**

  Overwrite the file with:

  ```markdown
  ---
  name: qa-agent
  description: Use this agent for QA analysis, functional test design, test planning, test-case design, Playwright/API automation coordination, regression analysis, defect triage, QA handoff, and release-quality assessment.
  tools: Read, Grep, Glob, Bash, Edit, Write
  ---

  # qa-agent

  ## Canonical Source

  Follow `AGENTS.md` and `docs/workflow/`, especially `docs/workflow/role-definitions.md`. This file is a Claude Code adapter and must not redefine canonical policy.

  ## Source of Truth

  Before working, read:

  ```text
  AGENTS.md
  PROJECT_STATUS.md
  docs/workflow/dynamic-routing.md
  docs/workflow/quality-gates.md
  docs/workflow/handoff-contract.md
  ```

  ## Responsibilities

  - Analyze requirements and acceptance criteria for testability.
  - Design functional, negative, boundary, equivalence, exploratory, regression, API, and baseline security/performance tests.
  - Select the minimum safe QA workflow based on change type and risk.
  - Produce QA artifacts using project templates.
  - Hand off automation implementation to the correct skill when script generation is requested.

  ## Skill Routing

  Route to `functional-test-design`, `qa-playwright-testing`, `security-review`, or `data-config-change` per the canonical Skill Routing table.

  ## Functional Testing Rule

  Invoke `functional-test-design` for functional test cases, TDD test cases, requirement coverage, FS analysis, IPO matrix, happy/negative cases, BVA, EP, exploratory charter, or traceability requests. Do not implement automation unless explicitly requested.

  ## Dynamic Routing

  Report ambiguity back to BA Agent, insufficient contract back to SA Agent, implementation failures to Developer Agent, security-sensitive behavior to Security Reviewer, and data/config validation needs to Data Agent or Config Agent.

  ## Output Expectations

  Use Markdown tables with the required test-case fields from the canonical rule. Do not invent missing information — add an Open Questions section instead.

  ## Evidence-Based Reporting

  Every claim requires attached evidence — command output, screenshot, or log. Do not manufacture or suppress issues.

  ## API Contract Validation

  Validate implementations against SA Agent's OpenAPI schema before approving. Mismatches are defects, routed to Developer or SA Agent.

  ## NFR Validation

  Check the SDD's stated NFR targets were validated; record `Not validated — <reason>` when out of scope rather than omitting it.

  ## Required Behavior

  1. Read `PROJECT_STATUS.md` before starting.
  2. Check routing and quality gate requirements.
  3. Produce structured artifacts using `docs/templates/`.
  4. Create a handoff using `docs/templates/HANDOFF.md`.
  5. Update `PROJECT_STATUS.md` and `TASK_LOG.md` when appropriate.
  6. Do not perform work outside this role unless explicitly routed.
  ```

- [ ] **Step 3: Check Markdown structure and whitespace.**

  Run:

  ```bash
  rg -n "Evidence-Based Reporting|API Contract Validation|NFR Validation|Skill Routing|Dynamic Routing" docs/workflow/role-definitions.md .claude/agents/qa-agent.md
  git diff --check
  ```

  Expected: all five headings/rules appear in both files; `git diff --check` has no output.

- [ ] **Step 4: Commit.**

  ```bash
  git add docs/workflow/role-definitions.md .claude/agents/qa-agent.md
  git commit -m "docs: fix QA Agent canonical/adapter inversion and add evidence, contract, and NFR rules"
  ```

### Task 2: Expand TEST_PLAN.md and the qa-playwright-testing skill

**Files:**
- Modify: `docs/templates/TEST_PLAN.md`
- Modify: `.agents/skills/qa-playwright-testing/SKILL.md`

**Interfaces:**
- Consumes: the canonical NFR Validation rule and API Contract Validation rule from Task 1 (the TEST_PLAN.md NFR table references the SDD, consistent with SA Agent's SDD.md NFR section already in the repo).
- Produces: the template and skill content Task 3's regression test checks.

- [ ] **Step 1: Replace the `Summary` / `Details` sections of `docs/templates/TEST_PLAN.md`.**

  Current file:

  ```markdown
  # TEST_PLAN.md

  ## Metadata

  - Work Item ID:
  - Title:
  - Owner:
  - Date:
  - Status: Draft / Review / Approved

  ## Summary


  ## Details


  ## Assumptions

  - 

  ## Open Questions

  - 

  ## Risks

  - 

  ## Approval / Review

  - Reviewer:
  - Decision:
  - Notes:
  ```

  Replace the `## Summary` and `## Details` sections (keep everything else unchanged) with:

  ```markdown
  ## Test Types In Scope

  - [ ] Unit
  - [ ] API
  - [ ] E2E
  - [ ] Regression
  - [ ] Performance / NFR

  ## Environment

  - Target environment:
  - Test data source:
  - Tools / automation scope:

  ## Entry Criteria

  - 

  ## Exit Criteria

  - 

  ## NFR Targets Under Test

  (Copy from the SDD's NFR section when applicable; leave `N/A — no SDD or no stated NFR target` otherwise.)

  | Target | SDD Reference | Validation Method |
  |---|---|---|
  |  |  |  |
  ```

  The full resulting file:

  ```markdown
  # TEST_PLAN.md

  ## Metadata

  - Work Item ID:
  - Title:
  - Owner:
  - Date:
  - Status: Draft / Review / Approved

  ## Test Types In Scope

  - [ ] Unit
  - [ ] API
  - [ ] E2E
  - [ ] Regression
  - [ ] Performance / NFR

  ## Environment

  - Target environment:
  - Test data source:
  - Tools / automation scope:

  ## Entry Criteria

  - 

  ## Exit Criteria

  - 

  ## NFR Targets Under Test

  (Copy from the SDD's NFR section when applicable; leave `N/A — no SDD or no stated NFR target` otherwise.)

  | Target | SDD Reference | Validation Method |
  |---|---|---|
  |  |  |  |

  ## Assumptions

  - 

  ## Open Questions

  - 

  ## Risks

  - 

  ## Approval / Review

  - Reviewer:
  - Decision:
  - Notes:
  ```

- [ ] **Step 2: Add an automation-discipline section to `.agents/skills/qa-playwright-testing/SKILL.md`.**

  Current file:

  ```markdown
  ---
  name: qa-playwright-testing
  description: Use for QA strategy, test cases, Playwright E2E automation, API tests, regression, and defect reports.
  ---

  # qa-playwright-testing

  ## Purpose

  Use for QA strategy, test cases, Playwright E2E automation, API tests, regression, and defect reports.

  ## Instructions

  Create test scenarios, test plans, Playwright/API tests, and TEST_REPORT.md. Route findings to BA/SA/Developer based on root cause.

  ## Canonical References

  - `AGENTS.md`
  - `PROJECT_STATUS.md`
  - `docs/workflow/dynamic-routing.md`
  - `docs/workflow/role-definitions.md`
  - `docs/workflow/quality-gates.md`
  - `docs/workflow/handoff-contract.md`
  - `docs/templates/`

  ## Output Rules

  - Use the relevant template in `docs/templates/`.
  - Document assumptions and open questions.
  - Do not skip required gates.
  - Update `PROJECT_STATUS.md` and `TASK_LOG.md` when the platform allows file edits.
  ```

  Insert a new `## Automation Discipline` section after `## Instructions` and before `## Canonical References`:

  ```markdown
  ## Automation Discipline

  - No hard waits. Never use a fixed-time wait (e.g. `waitForTimeout`); wait on conditions — element state, network response, URL change.
  - Prefer role-based selectors (`getByRole`, accessible name/label) over CSS chains; `data-testid` is a fallback, not the default.
  - Seed test data through the API, not through the UI. Each test owns its data and tolerates parallel runs.
  - A flaky test leaves the merge-blocking suite within 24 hours and enters a triage queue with a root-cause note. Do not delete a flaky test without diagnosis, and do not leave it in the blocking suite "retried until green."
  ```

  The full resulting file:

  ```markdown
  ---
  name: qa-playwright-testing
  description: Use for QA strategy, test cases, Playwright E2E automation, API tests, regression, and defect reports.
  ---

  # qa-playwright-testing

  ## Purpose

  Use for QA strategy, test cases, Playwright E2E automation, API tests, regression, and defect reports.

  ## Instructions

  Create test scenarios, test plans, Playwright/API tests, and TEST_REPORT.md. Route findings to BA/SA/Developer based on root cause.

  ## Automation Discipline

  - No hard waits. Never use a fixed-time wait (e.g. `waitForTimeout`); wait on conditions — element state, network response, URL change.
  - Prefer role-based selectors (`getByRole`, accessible name/label) over CSS chains; `data-testid` is a fallback, not the default.
  - Seed test data through the API, not through the UI. Each test owns its data and tolerates parallel runs.
  - A flaky test leaves the merge-blocking suite within 24 hours and enters a triage queue with a root-cause note. Do not delete a flaky test without diagnosis, and do not leave it in the blocking suite "retried until green."

  ## Canonical References

  - `AGENTS.md`
  - `PROJECT_STATUS.md`
  - `docs/workflow/dynamic-routing.md`
  - `docs/workflow/role-definitions.md`
  - `docs/workflow/quality-gates.md`
  - `docs/workflow/handoff-contract.md`
  - `docs/templates/`

  ## Output Rules

  - Use the relevant template in `docs/templates/`.
  - Document assumptions and open questions.
  - Do not skip required gates.
  - Update `PROJECT_STATUS.md` and `TASK_LOG.md` when the platform allows file edits.
  ```

- [ ] **Step 3: Check Markdown structure and whitespace.**

  Run:

  ```bash
  rg -n "Test Types In Scope|NFR Targets Under Test|Automation Discipline|No hard waits" docs/templates/TEST_PLAN.md .agents/skills/qa-playwright-testing/SKILL.md
  git diff --check
  ```

  Expected: all headings/phrases found; `git diff --check` has no output.

- [ ] **Step 4: Commit.**

  ```bash
  git add docs/templates/TEST_PLAN.md .agents/skills/qa-playwright-testing/SKILL.md
  git commit -m "docs: expand TEST_PLAN.md and qa-playwright-testing automation discipline"
  ```

### Task 3: Add regression coverage

**Files:**
- Modify: `test/validate-contracts.test.mjs`

**Interfaces:**
- Consumes: the canonical rule from Task 1 and the template/skill content from Task 2.
- Produces: a Node test that fails if the three new QA rules, the skill-routing/dynamic-routing content, the TEST_PLAN.md fields, or the automation-discipline rules are removed.

- [ ] **Step 1: Write the failing QA governance test.**

  Open `test/validate-contracts.test.mjs` and add this test immediately after the existing `BA Agent requires the illustrative-draft boundary and production-UI escalation` test (which currently ends right before `test('accepts the three canonical Bug Fix examples', ...)`):

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

- [ ] **Step 2: Run the focused test and confirm it fails before Tasks 1–2 land (or confirm it passes if Tasks 1–2 are already committed).**

  Run:

  ```bash
  npm test -- --test-name-pattern="QA Agent canonical rule carries its policy and the new evidence, contract, and NFR rules"
  ```

  If Tasks 1 and 2 are already committed (recommended dependency order), this test should PASS immediately. If run before Tasks 1–2, expect FAIL.

- [ ] **Step 3: Run the full test suite, contract validation, and whitespace check.**

  Run:

  ```bash
  npm test
  npm run validate:contracts
  git diff --check
  ```

  Expected: all Node tests pass (21 total: 20 existing + 1 new); contract validation prints `Contract validation passed.`; whitespace check has no output.

- [ ] **Step 4: Sanity-check the test is not tautological.**

  Temporarily remove the `24 hours` phrase from `.agents/skills/qa-playwright-testing/SKILL.md`, rerun the focused test from Step 2 and confirm it FAILS, then restore the file and rerun to confirm it PASSES again.

  ```bash
  cp .agents/skills/qa-playwright-testing/SKILL.md /tmp/qa-playwright-skill-backup.md
  sed -i '' 's/within 24 hours/within a day/' .agents/skills/qa-playwright-testing/SKILL.md
  npm test -- --test-name-pattern="QA Agent canonical rule carries its policy and the new evidence, contract, and NFR rules"
  cp /tmp/qa-playwright-skill-backup.md .agents/skills/qa-playwright-testing/SKILL.md
  npm test -- --test-name-pattern="QA Agent canonical rule carries its policy and the new evidence, contract, and NFR rules"
  ```

  Expected: first run FAILS, second run (after restore) PASSES.

- [ ] **Step 5: Commit.**

  ```bash
  git add test/validate-contracts.test.mjs
  git commit -m "test: add QA Agent instruction regression coverage"
  ```

### Task 4: Record project state and reviewer handoff

**Files:**
- Modify: `PROJECT_STATUS.md`
- Modify: `TASK_LOG.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: the implemented rule, template, skill, and test results from Tasks 1–3.
- Produces: durable state/history evidence for reviewer handoff.

- [ ] **Step 1: Replace `PROJECT_STATUS.md` in full.**

  ```markdown
  # PROJECT_STATUS.md

  ## Current Work Item
  - ID: QA-AGENT-INSTRUCTION-2026-07-14
  - Title: Fix QA Agent's canonical/adapter inversion and add evidence-based reporting, API contract validation, and NFR validation rules
  - Owner: Developer / Implementation Agent
  - Status: Ready for Review

  ## Current Stage
  - QA Agent Instruction / Reviewer Gate

  ## Change Classification
  - Change Type: Documentation and process-governance change with regression coverage
  - Risk Level: Medium
  - Code Change Required: Yes — scoped Node regression coverage for the QA rules
  - Architecture Change Required: No — restructures existing QA Agent content and extends the SDD/API-contract loop already landed for SA Agent
  - Security Review Required: No

  ## Completed
  - BA Agent instruction committed to `main` (`ed1090e`): illustrative draft rule, sketch boundary, production-UI escalation; regression-tested.
  - Fixed QA Agent's canonical/adapter inversion: policy that only lived in `.claude/agents/qa-agent.md` (skill routing, dynamic routing, output expectations) now lives in `docs/workflow/role-definitions.md`; the Claude adapter restates without redefining, matching the SA/BA Agent pattern.
  - Reviewed eight external testing-persona references; adopted reduced concepts from API Tester, Test Automation Engineer, Evidence Collector, Reality Checker, and Performance Benchmarker; excluded Test Results Analyzer, Tool Evaluator, and Workflow Optimizer as out of scope.
  - Added Evidence-Based Reporting: QA claims require attached command-output/screenshot/log evidence; explicitly rejected the "find a minimum of 3-5 issues" quota mechanic as a fantasy-reporting failure mode in disguise.
  - Added API Contract Validation: QA validates implementations against SA Agent's OpenAPI schema (from SA's API Contract Governance rule); mismatches are defects routed to Developer or SA Agent.
  - Added NFR Validation: QA checks the SDD's stated Performance/Reliability/Observability/Scalability targets were validated, or records `Not validated — <reason>`.
  - Expanded `docs/templates/TEST_PLAN.md` from a blank Summary/Details stub into QA-specific fields (Test Types In Scope, Environment, Entry/Exit Criteria, NFR Targets Under Test).
  - Added an Automation Discipline section to `.agents/skills/qa-playwright-testing/SKILL.md` (no hard waits, role-based selectors, API-seeded test data, 24-hour flake quarantine with root cause).
  - Added regression coverage; verified it is not tautological (fails when a required phrase is removed, passes when restored).

  ## In Progress
  - Independent review of the QA Agent canonical/adapter fix, the three new rules, the template and skill changes, and regression coverage (uncommitted until Task 4 lands).

  ## Blockers / Open Questions
  - Three follow-up opportunities remain identified but deliberately deferred, not started: (1) a "Prototype/Spike" workflow route in `AGENTS.md`; (2) a Release Agent enrichment from a DevOps Automator reference; (3) whether a shared cross-role template pattern should be extracted now that six roles (Documentation, PM, Orchestrator, SA, BA, QA) follow the same canonical/adapter structure. None are scheduled.
  - R-001 (Phase 1 hosted-CI confirmation) remains a separate open item owned by Reviewer / QA Agent.

  ## Required Artifacts
  - `docs/superpowers/specs/2026-07-14-qa-agent-instruction-design.md`
  - `docs/superpowers/plans/2026-07-14-qa-agent-instruction.md`
  - `docs/workflow/role-definitions.md` (canonical QA Agent section)
  - `.claude/agents/qa-agent.md`
  - `docs/templates/TEST_PLAN.md`
  - `.agents/skills/qa-playwright-testing/SKILL.md`
  - `test/validate-contracts.test.mjs`

  ## Next Quality Gate
  - Reviewer confirms the canonical rule and Claude adapter agree, that API Contract Validation correctly references SA Agent's existing rule rather than redefining it, and that the regression test is meaningful.

  ## Recommended Next Agent
  - Reviewer, then Reviewer / QA Agent for the outstanding Phase 1 hosted-CI confirmation (R-001)

  ## Notes
  - This work item intentionally did not create a new "Reality Checker" role — that responsibility is folded into QA Agent's own Evidence-Based Reporting rule and the existing Reviewer gate used throughout this session's role-enrichment work.
  - This work item intentionally did not adopt statistical/ML defect prediction, tool procurement/TCO evaluation, or generic business-process optimization — all judged disproportionate to or out of scope for this repo.
  - R-001 (Phase 1 hosted-CI confirmation) is unaffected by this work item and remains open.
  ```

- [ ] **Step 2: Append a `TASK_LOG.md` row.**

  ```markdown
  | 2026-07-14 | QA-AGENT-INSTRUCTION-2026-07-14 | Developer / Implementation Agent | Fixed QA Agent's canonical/adapter inversion and applied selected concepts from external testing-persona references | Moved skill routing, dynamic routing, and output expectations from the Claude adapter into the canonical rule; added Evidence-Based Reporting, API Contract Validation, and NFR Validation; expanded TEST_PLAN.md and qa-playwright-testing's automation discipline; added regression coverage, verified it is not tautological | Reviewer | Excluded Test Results Analyzer, Tool Evaluator, and Workflow Optimizer as out of scope; explicitly rejected the "minimum issues quota" pattern from two references as a fantasy-reporting failure mode in disguise |
  ```

- [ ] **Step 3: Add a CHANGELOG.md entry.**

  In `CHANGELOG.md`, under `## Unreleased` / `### Added`, add:

  ```markdown
  - QA Agent canonical/adapter fix with evidence-based reporting, API contract validation, and NFR validation rules, plus an expanded `TEST_PLAN.md` and `qa-playwright-testing` automation discipline, with regression coverage.
  ```

- [ ] **Step 4: Run final evidence checks.**

  ```bash
  npm test
  npm run validate:contracts
  git diff --check
  git status --short
  ```

  Expected: all tests pass, contract validation passes, no whitespace errors, and only Task 4 files are unstaged before commit.

- [ ] **Step 5: Commit.**

  ```bash
  git add PROJECT_STATUS.md TASK_LOG.md CHANGELOG.md
  git commit -m "docs: record QA Agent instruction rollout"
  ```

## Final Review Scope

- Confirm the canonical role definition and Claude adapter agree on skill routing, dynamic routing, output expectations, and all three new rules — and that the adapter does not duplicate the full canonical prose.
- Confirm the regression test is meaningful: it fails if a required phrase is removed (verified in Task 3, Step 4) and passes when restored.
- Confirm `TEST_PLAN.md` still contains Metadata, Assumptions, Open Questions, Risks, and Approval / Review unchanged in intent.
- Confirm API Contract Validation correctly references SA Agent's existing API Contract Governance rule rather than redefining or duplicating it.
- Confirm no artifact reintroduces the rejected "minimum issues quota" mechanic.
- Confirm project state correctly hands off to Reviewer and leaves R-001 untouched.
