---
name: api-observability-monitoring
description: Design health-check endpoints, SLA/SLO/SLI targets, and API-specific structured logging/alerting for a service. Distinct from performance-testing, which measures a system against these targets under load rather than defining what the targets and log fields should be.
---

# api-observability-monitoring

## Purpose

`performance-testing` executes load/stress/spike/soak tests against an NFR target the SDD already states. This skill designs the targets and the observability surface those tests (and production monitoring) measure against — health checks, SLA/SLO/SLI definitions, and structured request logging.

## When to Use

- SA Agent needs to define liveness/readiness checks or SLA/SLO/SLI targets for a new service or endpoint tier in the SDD.
- The user asks "how do I know if my API is down," or about health endpoints, alerting thresholds, or request logging strategy.

## Health Checks

- **Liveness** — is the process running at all (used to decide whether to restart it). Should not depend on downstream services.
- **Readiness** — can the process currently serve traffic (used to decide whether to route traffic to it). May depend on a database/cache connection check, but keep the check cheap — it runs frequently.
- Do not conflate the two: a liveness check that also verifies the database creates a restart loop when only the database is briefly down.

## SLA/SLO/SLI Definition

State per endpoint tier (not per individual endpoint unless it's unusually critical): availability target (e.g. 99.9%), latency budget (p95/p99), and the error-rate threshold that counts as a breach. Record these in the SDD as the NFR targets `performance-testing` later validates against — this skill does not itself run the load test.

## Structured Request Logging

Every request log entry should carry: a correlation/request ID (propagate it across service boundaries — see `api-integration-patterns` for cross-app propagation), endpoint, status code, latency, and caller identity. Never log request/response bodies or headers containing PII/secrets — that's Security Reviewer's Scan Checklist and `api-compliance-patterns`'s masking rule, not optional here.

## Alerting

Alert on error-rate and latency burn-rate against the stated SLO, not solely on raw uptime — a service can be "up" while failing most requests. State the alerting threshold alongside the SLO it protects, not as a separate, disconnected number.

## Canonical References

- `docs/workflow/role-definitions.md` (SA Agent → API Contract Governance; QA Agent → NFR Validation)
- `.agents/skills/performance-testing/` (executing against the targets this skill defines)
- `.agents/skills/api-compliance-patterns/`, `.agents/skills/security-review/` (no PII/secrets in logs)
