---
name: api-testing-tooling
description: Write and run hand-scripted API tests with Supertest (Node/Express HTTP assertions), manage versionable API collections with Bruno, or run existing Postman collections via Newman in CI. Use for functional API test cases distinct from api-contract-testing's OpenAPI schema-fuzzing.
---

# api-testing-tooling

## Purpose

Operationalize functional API testing for a target app's own endpoints — hand-written assertions and reusable, versionable request collections — as a concern distinct from `api-contract-testing`'s schema-fuzzing against a published OpenAPI contract.

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

## Postman + Newman (team-standard alternative)

Use when the team already maintains its API collections in Postman rather than Bruno — both are equally valid per this skill; do not migrate an existing Postman collection to Bruno solely for tooling consistency.

### Installation

```bash
npm install -g newman   # CLI runner for Postman collections in CI
```

### Running

```bash
newman run collection.json -e environment.json
```

Export the Postman collection and environment as JSON (`File > Export`) and commit both alongside the tests under `tests/api/` — an uncommitted, GUI-only collection is not CI-runnable and not reviewable in a PR diff.

See `templates/postman-collection.example.json` for a minimal collection structure.

## Where Tests Live

Both tools' files live under `tests/api/` per `docs/workflow/testing-conventions.md`.

## Canonical References

- `docs/workflow/role-definitions.md` (QA Agent → Skill Routing)
- `docs/workflow/testing-conventions.md`
- `docs/templates/TEST_REPORT.md`
