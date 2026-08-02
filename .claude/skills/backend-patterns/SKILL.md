---
name: backend-patterns
description: Backend architecture patterns for repository/service layering, N+1 query prevention, caching, background jobs, and structured logging — for Django/DRF (this repo's default stack) or Node.js/Next.js API routes with Supabase/Redis (a future target app's stack). Distinct from api-security-patterns (authN/authZ) and performance-testing (rate-limit verification), which this skill cross-references rather than duplicates.
---

# backend-patterns

## Purpose

SA Agent's Dependency Boundary Rule already states *where* business logic belongs (a service layer, not views/serializers). This skill covers the recurring *shape* of that layer and its neighbors — repository abstraction, query efficiency, caching, background work, and logging — so Developer Agent has a reference instead of inventing a new shape per feature.

## When to Use

- Implementing or reviewing a repository/service layer, an API endpoint's data-access path, or a background job.
- Diagnosing an N+1 query problem or deciding a caching strategy.

## Do Not Use When

- The question is authentication/authorization/object-level access control — use `api-security-patterns`.
- The question is verifying rate-limiting or throughput under load — use `performance-testing`.
- The question is the API's own request/response contract shape — that's SA Agent's API Contract Governance.

## Repository Pattern

Abstract data access behind an interface so the service layer doesn't depend on a specific ORM/client:

- **Django/DRF**: a repository is typically a thin wrapper around the model manager (`Market.objects.filter(...)`) — the service layer calls the repository, never the ORM directly, so a later swap (e.g. adding a cache layer) doesn't touch business logic.
- **Node/Next.js + Supabase**: the same shape, wrapping the Supabase client (`supabase.from('markets').select(...)`) behind an interface (`MarketRepository.findById(id)`) rather than calling the client from route handlers directly.

## N+1 Query Prevention

The most common backend defect in both stacks: fetching a list, then querying once per item in a loop for related data.

- **Django/DRF**: use `select_related`/`prefetch_related` instead of accessing a related field inside a loop.
- **Node/Supabase**: batch-fetch related IDs in one query (`WHERE id IN (...)`) and build a lookup map, instead of awaiting one query per list item inside a loop.

## Caching Strategy

- Cache-aside: check cache, on miss fetch from the source of truth and populate the cache with a bounded TTL, never cache indefinitely without an invalidation path.
- **Redis** is the shared-store option for both stacks when the app runs more than one process/instance — this is the same constraint as rate-limiting counters (see Rate Limiting below): anything cached only in local process memory disappears or diverges across replicas and deploys.
- Invalidate explicitly on write; do not rely on TTL alone for data that changes on a known event.

## Rate Limiting

Rate limiting is a shared-store concern (Redis, a gateway, or the platform's native limiter), never a per-process in-memory counter — an in-memory counter resets on deploy, splits across replicas, and fails open in serverless/multi-instance environments. This skill states the constraint; `performance-testing`'s Rate Limiting & Throttling section verifies the behavior once implemented, and `api-security-patterns` covers the resource-consumption abuse case this protects against.

## Background Jobs

State explicitly, for any work moved off the request path: the queue/broker (Redis-backed queue, Django's async task framework, or platform-native), the retry policy, and what happens to a job that exhausts its retries (a dead-letter destination — see `api-integration-patterns`, not silent drop).

## Structured Logging

Every log entry should be a structured record (not a free-text string) carrying at minimum a timestamp, level, message, and a request/operation identifier for correlation — see `api-observability-monitoring`'s Structured Request Logging section for the full field set and the rule against logging PII/secrets.

## Canonical References

- `docs/workflow/role-definitions.md` (SA Agent → Dependency Boundary Rule, API Contract Governance)
- `.agents/skills/coding-standards/` (naming/error-handling baseline this skill builds on)
- `.agents/skills/api-security-patterns/`, `.agents/skills/performance-testing/`, `.agents/skills/api-observability-monitoring/`, `.agents/skills/api-integration-patterns/` (adjacent concerns this skill cross-references instead of duplicating)
