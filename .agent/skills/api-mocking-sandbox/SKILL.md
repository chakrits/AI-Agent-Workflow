---
name: api-mocking-sandbox
description: Produce mock server, stub, or fixture definitions for a dependency's API so a consumer can be developed and tested in isolation, before or independent of the real dependency being available. Distinct from api-testing-tooling, which tests against a real running endpoint.
---

# api-mocking-sandbox

## Purpose

Lets Developer Agent or QA Agent build and test a consumer of an API that either doesn't exist yet (consumer-driven development ahead of the provider), is flaky/slow/rate-limited (a third-party dependency), or needs to be isolated for a specific cross-repo debugging session.

## When to Use

- A consumer needs to be developed/tested before the real provider endpoint is ready.
- A dependency (internal or third-party) is unreliable, slow, or rate-limited in CI and needs a stand-in.
- Isolating one side of a cross-repo integration bug (see `api-integration-patterns`'s boundary-first triage) by replaying a captured real interaction instead of hitting the live dependency.

## Do Not Use When

- The real endpoint is available and stable enough to test against directly — use `api-testing-tooling` or `api-contract-testing` instead; a mock that drifts from reality is worse than no mock.

## Mock Strategies

- **Schema-driven mock** — generate the mock directly from SA Agent's published OpenAPI schema (per API Contract Governance) so it can't silently drift from the real contract; regenerate when the schema changes rather than hand-maintaining a copy.
- **Record-and-replay** — capture a real request/response pair once (the same evidence-bundle idea used for cross-repo debugging), then replay it as a fixture. Mark clearly which fixtures are schema-driven vs recorded, since a recorded fixture can go stale silently if the real endpoint changes and nobody regenerates it.

## Where Fixtures Live

Store fixtures under `tests/api/fixtures/` alongside the collections/specs `api-testing-tooling` already places under `tests/api/` per `docs/workflow/testing-conventions.md`.

## Canonical References

- `docs/workflow/role-definitions.md` (SA Agent → API Contract Governance)
- `docs/workflow/testing-conventions.md`
- `.agents/skills/api-contract-testing/` (the schema a mock must stay honest against)
- `.agents/skills/api-integration-patterns/` (the cross-repo debugging case this supports)
