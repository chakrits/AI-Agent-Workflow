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
