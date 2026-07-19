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
