# QA Testing-Discipline Enrichment Design

**Date:** 2026-07-19
**Status:** Approved for implementation planning
**Work item:** QA-TESTING-DISCIPLINE-2026-07-19

## Goal

Close the gap between QA Agent's canonical rules that already shipped (API Contract Validation, NFR Validation) and the fact that neither has an executable skill behind it, and add a genuinely new policy — Test Effectiveness — covering test-quality/anti-pattern review and mutation testing, which QA Agent had no coverage for at all.

## Scope

In scope:

- Four new skills under `.agents/skills/`: `api-contract-testing`, `performance-testing`, `mutation-testing`, `test-quality-discipline`.
- One new canonical QA Agent rule, `Test Effectiveness`, in `docs/workflow/role-definitions.md`.
- Four new rows in the QA Agent canonical Skill Routing table (no changes to the existing four rows or to the `API Contract Validation` / `NFR Validation` rule text — their policy was already correct; they only needed a skill to route to).
- Accessibility testing (WCAG 2.1 AA, `@axe-core/playwright`) added to the existing `.agents/skills/qa-playwright-testing/SKILL.md`.
- `docs/templates/TEST_REPORT.md`: new "Root Cause Analysis" (5 Whys) section.
- `docs/templates/TEST_PLAN.md`: two new checkboxes ("Mutation Testing", "Contract Validation") in "Test Types In Scope".
- `.claude/agents/qa-agent.md` adapter updates mirroring the canonical changes, matching how it already mirrors Evidence-Based Reporting / API Contract Validation / NFR Validation in full.
- Regression coverage in `test/validate-contracts.test.mjs` for all of the above.

Out of scope:

- Fixed Quality Gate Metrics (coverage %, MTTR, defect leakage rate, flaky rate, mutation-score pass/fail threshold) — explicit Boss decision to keep these case-by-case per work item rather than hardcoding numbers into a skill.
- A separate accessibility skill — folded into `qa-playwright-testing` since it's Playwright/E2E-specific tooling, not a standalone domain.
- Standardizing on one performance-testing tool (Locust vs k6) — `performance-testing` documents both as options; the SDD or work item picks per case.
- TDD Iron Laws / Red-Green-Refactor, Definition-of-Ready / Three Amigos / Gherkin, and the OWASP security checklist from the reviewed `test-master` reference — these belong to Developer Agent (`tdd-implementation` skill), BA Agent (existing Illustrative Draft Rule / `qa-playwright-testing`'s BDD workflow), and Security Reviewer (existing Django/DRF-specific Scan Checklist) respectively. Re-homing them under QA Agent would duplicate or override another role's already-established authority.
- The `vitest-testing` reference skill — Vitest/Bun is not this project's stack (Django/Python/PostgreSQL/REST); nothing from it is adopted.
- "Reject PRs lacking tests" language from `test-master` — QA Agent has no unilateral merge-block authority under the existing Cross-Platform Acceptance Criteria Gate; only Human/CI hold that gate.
- Mirroring the four new skills into `.agent/skills/` or `.codex/` — `qa-playwright-testing` itself only exists under `.agents/skills/` today, so the new skills follow the same precedent rather than backfilling parity gaps that predate this work.

## Research Input

Reviewed four `secondsky` reference skills and one externally supplied `test-master` reference (`tmp/skill.md`, now superseded by this spec). Adopted, in reduced/adapted form:

- **`test-quality-analysis`** (secondsky) → anti-pattern checklist in `test-quality-discipline` (Overmocking, Fragile Tests, Poor/Weak Assertions), FIRST principles, AAA structure reference.
- **`mutation-testing`** (secondsky) → `mutation-testing` skill, **Python/`mutmut` section only** — the Stryker/JS/Bun sections are dropped entirely as off-stack.
- **`playwright`** (secondsky) → Accessibility Testing addition to `qa-playwright-testing` (`@axe-core/playwright`, impact-level classification). Its selector/POM/network-mocking/auth-state content already exists in `qa-playwright-testing` and is not duplicated.
- **`test-master`** (`tmp/skill.md`) → Test Automation Pyramid, Test Data Isolation Rule, two anti-pattern entries not covered by `test-quality-analysis` (Test-Only Methods, Incomplete Mocks), Performance testing types (Load/Stress/Spike/Soak), Defect Report Template (5 Whys structure). Quality Gate Metrics numbers explicitly excluded per Boss's decision.

Excluded entirely: `vitest-testing` (off-stack), and from `test-master`: TDD Iron Laws, DoR/Three Amigos/Gherkin, OWASP security checklist, PR-rejection language, Quality Gate Metrics fixed numbers, Usability/Localization testing (judged out of proportion to a REST-API backend project; can be revisited if a future work item needs it).

## Canonical QA Agent Section — `docs/workflow/role-definitions.md`

### Skill Routing table (replace existing table with this)

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

### New rule — insert after the existing `### NFR Validation` section

```markdown
### Test Effectiveness

QA Agent checks that Developer Agent's unit and component tests are effective, not merely present. Apply `test-quality-discipline`'s FIRST principles, Test Automation Pyramid balance, and Test Data Isolation Rule (a unit test must not hit a live database or network — mock or stub the I/O boundary) as review criteria, and flag anti-patterns (overmocking, fragile/implementation-detail assertions, weak/vague assertions, test-only production methods, incomplete mocks) as defects. For modules containing non-trivial business logic in the service layer (SA Agent's Dependency Boundary Rule), run mutation testing (`mutation-testing` skill) and record the measured mutation score and any unaddressed survived mutants in the test report — there is no fixed pass/fail threshold; the appropriate bar is a per-work-item judgment call, not a hardcoded gate. QA Agent does not rewrite Developer Agent's tests; a test-effectiveness gap is a defect routed to Developer Agent.
```

`API Contract Validation` and `NFR Validation` rule text is otherwise unchanged.

## Adapter Changes — `.claude/agents/qa-agent.md`

The current adapter already restates `Evidence-Based Reporting`, `API Contract Validation`, and `NFR Validation` as near-verbatim mirrored sections (not just a routing pointer). Match that existing pattern:

1. Update the `## Skill Routing` sentence to list all eight skills: `functional-test-design`, `qa-playwright-testing`, `security-review`, `data-config-change`, `api-contract-testing`, `performance-testing`, `mutation-testing`, `test-quality-discipline`.
2. Add a new `## Test Effectiveness` section mirroring the canonical rule text above, placed after the existing `## NFR Validation` section — same restatement style already used for the other three rules in this file.

## New Skill Files

### `.agents/skills/api-contract-testing/SKILL.md`

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

### `.agents/skills/performance-testing/SKILL.md`

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

### `.agents/skills/mutation-testing/SKILL.md`

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

### `.agents/skills/test-quality-discipline/SKILL.md`

```markdown
---
name: test-quality-discipline
description: Review Developer Agent's unit/component tests for effectiveness and anti-patterns — overmocking, fragile assertions, test-only production code, incomplete mocks. Use for QA Agent's Test Effectiveness rule on any change that adds or modifies unit/component tests.
---

# test-quality-discipline

## Purpose

A test suite that passes isn't automatically a good test suite. This skill gives QA Agent a concrete checklist for judging whether Developer Agent's unit/component tests are effective — a review discipline, not an authoring discipline; Developer Agent owns writing and fixing the tests themselves per its Escalation Discipline.

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

- `docs/workflow/role-definitions.md` (QA Agent → Test Effectiveness; Developer Agent → Escalation Discipline)
- `docs/templates/TEST_REPORT.md`
```

## Skill Changes — `.agents/skills/qa-playwright-testing/SKILL.md`

Add a new `## Accessibility Testing` section (placed after the existing `## Automation Discipline` section):

```markdown
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

Classify violations by axe's own impact level (critical/serious/moderate/minor) in the test report. Route a violation to Developer Agent when it's an implementation defect (missing `alt`, unlabeled form control, insufficient contrast in an existing design) and to BA Agent when it traces back to a design/content decision that needs to change (per BA Agent's Escalation: Production UI/UX Need rule).
```

## Template Changes

### `docs/templates/TEST_REPORT.md`

Add a new section after the existing "Failed Tests / Defects" table:

```markdown
## Root Cause Analysis

For each Defect ID in the table above with a non-trivial root cause, add a block:

### Defect <ID>

1. Why did it fail? —
2. Why did that happen? —
3. Why did that happen? —
4. Why did that happen? —
5. Why did that happen (root cause)? —

**Fix Recommendation:**
```

All other existing sections (Metadata, Scope, Test Summary, Coverage, Release Recommendation, Notes) are unchanged.

### `docs/templates/TEST_PLAN.md`

Add two checkboxes to the existing "Test Types In Scope" list:

```markdown
## Test Types In Scope

- [ ] Unit
- [ ] API
- [ ] E2E
- [ ] Regression
- [ ] Performance / NFR
- [ ] Mutation Testing
- [ ] Contract Validation
```

All other existing sections are unchanged.

## Acceptance Criteria

1. `docs/workflow/role-definitions.md`'s QA Agent Skill Routing table has all eight rows; a new `Test Effectiveness` rule exists after `NFR Validation`; `API Contract Validation` and `NFR Validation` rule text is byte-for-byte unchanged.
2. `.claude/agents/qa-agent.md` lists all eight skills in its Skill Routing sentence and has a new `## Test Effectiveness` section mirroring the canonical rule, matching the restatement style already used for the other three rules in this file.
3. Four new skill files exist at `.agents/skills/api-contract-testing/SKILL.md`, `.agents/skills/performance-testing/SKILL.md`, `.agents/skills/mutation-testing/SKILL.md`, `.agents/skills/test-quality-discipline/SKILL.md`, each with valid frontmatter (`name`, `description`) and the content specified above.
4. `.agents/skills/qa-playwright-testing/SKILL.md` has the new `## Accessibility Testing` section.
5. `docs/templates/TEST_REPORT.md` has the new "Root Cause Analysis" section; existing sections are unchanged.
6. `docs/templates/TEST_PLAN.md` has the two new checkboxes; existing sections are unchanged.
7. `test/validate-contracts.test.mjs` has regression coverage: the new Skill Routing rows, the `Test Effectiveness` rule, each new skill file's presence and key content, the `qa-playwright-testing` accessibility section, and both template changes each fail the test if removed.
8. `npm test`, `npm run validate:contracts`, and `git diff --check` all pass.

## Risks and Constraints

- This is a larger single work item than a typical single-role pass (one new canonical rule + four new skill files + one skill extension + two template files + adapter mirror). Consistent with the precedent already accepted for the original QA Agent instruction work — kept as one spec/plan rather than split further, since all four new skills exist only to serve the one new `Test Effectiveness` rule plus the two already-shipped rules.
- `api-contract-testing` and `performance-testing` reference tools (`schemathesis`, `drf-spectacular`, Locust/k6) that are not yet installed anywhere in this repo. This spec documents the *methodology*; actual tool installation/CI wiring is deferred to when a real work item first needs to execute one of these skills; do not add these as new dependencies in this pass.
- `Test Effectiveness` depends on SA Agent's Dependency Boundary Rule (service-layer scoping, already landed) and Developer Agent's Escalation Discipline (already landed) to state the QA/Developer ownership boundary correctly. If either of those SA/Developer rules changes shape later, this rule's cross-references should be revisited.
- No fixed mutation-score or performance-target pass/fail threshold is set anywhere in this spec, per explicit Boss direction. This is intentional, not an oversight — do not add one during implementation without checking back.

## Recommended Next Step

Human reviewer confirms this spec. Then invoke the writing-plans skill to create the execution plan before any canonical/adapter/skill/template changes begin.
