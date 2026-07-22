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
