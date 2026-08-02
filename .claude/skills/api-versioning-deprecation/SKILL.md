---
name: api-versioning-deprecation
description: Classify an API change as breaking vs non-breaking, choose a versioning approach (URI vs header), and design a deprecation/sunset flow for a retired API version. Distinct from Release Agent's project-wide SemVer rule, which versions releases, not individual API surfaces that may retire on their own independent timeline.
---

# api-versioning-deprecation

## Purpose

Release Agent's Versioning and Changelog Contract versions the *release* (`MAJOR.MINOR.PATCH`, tagged). An individual API endpoint can need its own version lifecycle independent of the release train — especially once more than one consumer (another app, an external client) depends on it and can't upgrade in lockstep with every release. This skill designs that lifecycle.

## When to Use

- SA Agent or Developer Agent is changing an existing endpoint's request/response shape and needs to classify whether the change is breaking.
- An API version needs to be retired and consumers need a migration path before it's removed.

## Breaking vs Non-Breaking Classification

**Breaking** (requires a new version or a documented migration):
- Removing or renaming a field, or changing its type.
- Changing a status code's meaning, or an error response's shape.
- Tightening validation on an existing field (a previously-valid request now fails).
- Removing an endpoint or changing its auth requirement to be stricter.

**Non-breaking** (safe within the current version):
- Adding a new optional request field or new response field.
- Adding a new endpoint.
- Relaxing validation (a previously-invalid request now succeeds).

When unsure whether a change is breaking, treat it as breaking — same default Release Agent already applies to release-level SemVer.

## Versioning Approach

Default to URI-path versioning (`/v1/...`, `/v2/...`) for this project's stack unless SA Agent states a reason to deviate (e.g. an existing header-based convention already in place). State the chosen approach in the OpenAPI schema per SA Agent's API Contract Governance rule — do not leave it implicit.

## Deprecation Flow

- Mark the deprecated version with a `Deprecation` response header (and `Sunset` header stating the retirement date, per RFC 8594) as soon as a replacement version ships.
- State a minimum notice window before removal — long enough for known consumers to migrate; record the chosen window and why in the SDD/ADR.
- Publish a migration guide (old field/endpoint → new equivalent) before the old version is removed, not after.
- Do not remove a version with active traffic; confirm via `api-observability-monitoring`'s request logging before retiring it.

### Worked Example (wire format, language-agnostic)

Response headers while the deprecated version is still live:

```http
Deprecation: true
Sunset: Sat, 01 Jan 2027 00:00:00 GMT
Link: <https://api.example.com/v2/users>; rel="successor-version"
```

Response after the sunset date has passed:

```http
HTTP/1.1 410 Gone
Content-Type: application/json

{
  "error": "version_sunset",
  "message": "API v1 was sunset on 2027-01-01. Please migrate to v2.",
  "migration_guide": "https://docs.example.com/migrations/v1-to-v2",
  "successor_endpoint": "https://api.example.com/v2/users"
}
```

## Canonical References

- `docs/workflow/role-definitions.md` (SA Agent → API Contract Governance; Release Agent → Versioning and Changelog Contract)
- `.agents/skills/api-observability-monitoring/` (confirming a version has no remaining traffic before removal)
