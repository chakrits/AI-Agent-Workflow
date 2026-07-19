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
