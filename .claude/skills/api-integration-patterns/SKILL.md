---
name: api-integration-patterns
description: Design webhook, event-driven, and API-chaining integration patterns between services or apps that call each other's APIs — inbound signature verification, outbound retry/idempotency, correlation-ID propagation, and dead-letter handling for failed async events.
---

# api-integration-patterns

## Purpose

Covers the integration surface between two API-owning services — most relevant once more than one target app exists and they call each other's APIs, a case distinct from a single app's own contract (SA Agent's API Contract Governance already covers a single endpoint's own shape).

## When to Use

- One app's endpoint calls another app's API as part of handling a request (synchronous chaining), or emits/consumes webhooks or async events.
- Designing retry behavior for a call to another service, or verifying an inbound webhook is genuine.

## Inbound Webhooks

- Verify the sender's signature (HMAC over the raw request body with a shared secret, or the sender's documented scheme) before processing — never trust an unsigned webhook body.
- Reject replayed requests: require a timestamp within a small tolerance window plus a nonce or event ID checked against recently-seen IDs.
- Respond quickly and process asynchronously for anything non-trivial; a slow synchronous handler risks the sender's own retry/timeout logic re-delivering the same event.

## Outbound Calls to Another App's API

- Require an idempotency key on any outbound call that isn't naturally idempotent (a POST creating a resource), so a retry after a timeout doesn't double-process on the receiving side.
- State the retry/backoff policy explicitly (attempts, backoff curve, what counts as retryable vs terminal failure) — do not retry indefinitely on a 4xx that will never succeed.
- Propagate a correlation ID on every outbound call so the calling and called service's logs can be joined for one logical request — see `api-observability-monitoring`'s structured logging fields.

## Async Event Consumption

- State what happens to an event that fails processing after retries are exhausted: a dead-letter queue or equivalent, not silent drop. Record who is responsible for reviewing the dead-letter contents.

## Cross-Repo Debugging Note

When a bug spans two apps calling each other's APIs, capture the actual request/response at the API boundary and diff it against the OpenAPI contract before assuming a deeper cross-repo bug — this boundary-first triage is often enough to localize the fault to one side. `api-mocking-sandbox`'s record-and-replay approach can turn a captured boundary interaction into a reusable fixture for this.

## Canonical References

- `docs/workflow/role-definitions.md` (SA Agent → API Contract Governance)
- `.agents/skills/api-observability-monitoring/` (correlation ID propagation)
- `.agents/skills/api-mocking-sandbox/` (turning a captured boundary interaction into a fixture)
