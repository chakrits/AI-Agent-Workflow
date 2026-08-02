---
name: api-security-patterns
description: Design and verify API-specific authN/authZ and OWASP API Security Top 10 patterns — broken object-level authorization (BOLA/IDOR), broken authentication, excessive data exposure, mass assignment, and resource-consumption abuse. Distinct from security-review's project-wide generic Scan Checklist, which this skill extends for API surfaces specifically.
---

# api-security-patterns

## Purpose

`security-review`'s Scan Checklist catches project-wide issues (hardcoded secrets, `DEBUG=True`, missing `permission_classes`). It does not by itself check the per-endpoint, per-object authorization logic that OWASP's API Security Top 10 targets — the class of bug where authentication exists but authorization is still wrong for a specific object. This skill is the API-specific extension Security Reviewer applies before approving an endpoint.

## When to Use

- Any new or changed endpoint that accepts an object identifier (path param, body field) and Security Reviewer needs to verify per-object authorization, not just "is the requester authenticated."
- The user asks about OAuth/JWT/API key design, RBAC/scopes, or an "API security checklist."

## Checklist

- **Object-level authorization (BOLA/IDOR)** — for every endpoint that takes an object ID, confirm the check is "does *this* requester own/may access *this specific* object," not merely "is the requester authenticated." A `permission_classes` check alone does not prove this.
- **Excessive data exposure** — confirm the serializer returns only the fields the consumer needs, not the full model, relying on the client to filter what it displays.
- **Mass assignment** — deserializers use an explicit allow-list of writable fields, never a blocklist; confirm a client can't set a field (e.g. `is_admin`, `status`) it shouldn't be able to write by including it in the request body.
- **Authentication strength** — token expiry is enforced, refresh flow doesn't extend a compromised token's life indefinitely, and no endpoint silently accepts an unauthenticated request that should require one.
- **Resource consumption** — an endpoint with no pagination limit, no request-size limit, or no rate limit on an expensive operation is a resource-exhaustion risk; hand off the throttling design itself to `performance-testing`'s rate-limiting guidance.
- **Security misconfiguration** — verbose error responses that leak stack traces or internal identifiers to the client.

## Routing

A finding here follows Security Reviewer's existing Severity Scale and Fix-Before-Merge vs Hardening Opportunity rule — BOLA and broken authentication are Critical/High by that scale, not judgment calls. Route implementation fixes to Developer Agent; route a missing/insufficient contract (e.g. no documented auth requirement at all) to SA Agent.

## Canonical References

- `docs/workflow/role-definitions.md` (Security Reviewer → Scan Checklist, Severity Scale, Fix-Before-Merge vs Hardening Opportunity)
- `.agents/skills/security-review/` (the generic project-wide skill this extends)
- `.agents/skills/performance-testing/` (rate-limiting execution)
