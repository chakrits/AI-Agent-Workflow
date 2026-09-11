---
name: api-test-design
description: Design API test cases (happy path, negative, boundary, auth, pagination, error-format) from an OpenAPI schema, request/response example, or endpoint description. Distinct from api-contract-testing's schema-fuzzing (validates an existing implementation) and api-testing-tooling's execution (Supertest/Bruno/Postman) — this skill decides what test cases an endpoint needs before any script or fuzz run exists.
---

# api-test-design

## Purpose

Closes the gap between "the OpenAPI schema exists" and "someone ran a meaningful test against it." `api-contract-testing` validates an implementation against a schema; `api-testing-tooling` executes hand-scripted requests — neither one decides *what* to test. This skill applies `functional-test-design`'s IPO/BVA/EP method specifically to API surfaces.

## When to Use

- SA Agent has published an OpenAPI schema (or a Postman/Bruno collection, or a plain endpoint description) and QA Agent needs to decide the test case list before writing or running anything.
- The user asks to "write tests for this endpoint," "what should I test on this API," or similar, without yet specifying a framework.

## Do Not Use When

- The task is validating an already-implemented endpoint against a published schema — use `api-contract-testing`.
- The task is writing/running the actual test scripts against a known scenario list — use `api-testing-tooling`.

## Design Approach

Apply IPO per endpoint, the same method `functional-test-design` uses for business logic:

- **Input** — path/query params, headers, request body fields (required vs optional, type, enum, length/range constraints).
- **Process** — auth/authz check, business-rule validation, side effects (idempotent vs not).
- **Output** — response schema per status code, error format, pagination envelope.

Apply BVA/EP to every constrained field (enum values, pagination `page`/`limit` bounds, string length limits, numeric ranges) — only where the schema states a real constraint, not invented ones.

## Coverage Checklist (per endpoint)

- Happy path — one case per documented success status code (200/201/204, etc.).
- Every documented error status code, with a request that genuinely triggers it (not just an assertion the code exists).
- Auth: missing token, expired/invalid token, valid token with insufficient scope/role.
- Pagination boundary: first page, last page, `limit=0`/negative, `limit` beyond max.
- Malformed request body: missing required field, wrong type, extra unexpected field (ties to `api-security-patterns`'s mass-assignment check).
- Idempotency for PUT/DELETE: repeat the same request and confirm the documented idempotent behavior.

## Output

Use the same table shape as `functional-test-design`'s Function Test Report / `docs/templates/TEST_PLAN.md` — one row per case with Input, Steps, Expected Result. Do not invent an endpoint behavior the schema doesn't state; record it as an Open Question instead.

## Handoff

- Case list needs execution → `api-testing-tooling` (hand-scripted) or automation per project convention.
- Case list needs to be run as a fuzz/property check against the schema itself → `api-contract-testing`.
- A designed case reveals the schema is ambiguous or incomplete → SA Agent.

## Canonical References

- `docs/workflow/role-definitions.md` (QA Agent → Skill Routing, Functional Testing Rule)
- `.agents/skills/functional-test-design/` (IPO/BVA/EP method this skill specializes)
- `docs/templates/TEST_PLAN.md`, `docs/templates/TEST_REPORT.md`
