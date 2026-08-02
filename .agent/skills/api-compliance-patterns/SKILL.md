---
name: api-compliance-patterns
description: Design GDPR/HIPAA/PCI-DSS/SOC2-aligned API patterns — field-level PII/PHI classification, masking in logs/responses, retention and right-to-be-forgotten endpoints, consent capture, and audit-log schema. Use for any endpoint that handles personal, health, or payment data.
---

# api-compliance-patterns

## Purpose

Security Reviewer's Scan Checklist catches sensitive data reaching a log or URL; it does not by itself design the *pattern* an API needs to stay compliant with a named regulation — retention windows, deletion endpoints, consent versioning, audit trails. This skill fills that design gap, most relevant to a healthcare/insurance/e-claim style domain where PHI redaction is a hard constraint, but written generically for any regulated-data API.

## When to Use

- An endpoint reads, writes, or returns personal data (GDPR/CCPA), health data (HIPAA-style), or payment data (PCI-DSS), or the change needs a SOC2-style audit trail.
- The user asks about data retention, "right to be forgotten," consent management, or a compliance checklist for an API.

## Do Not Use When

- No regulated data is involved — use the generic `security-review` skill's Scan Checklist instead.
- The question is about the underlying data change itself (not the API pattern) — route to Data Agent's PII Routing rule.

## Compliance Pattern Checklist

- **Data classification** — tag every field a schema returns or accepts as PII / PHI / PCI / none. An untagged field touching a regulated table is treated as sensitive until classified.
- **Masking** — sensitive fields never appear in logs, error messages, or URLs (query params); mask or omit them in any response the requester isn't explicitly authorized to see the raw value of.
- **Retention & deletion** — state the retention window per data class, and whether a "right to be forgotten" / data-export endpoint is required. A regulated field with no stated retention policy is not ready to ship.
- **Consent** — if the data's use depends on user consent, the API must record which consent version was in effect at capture time, not just a boolean "consented" flag.
- **Audit log** — every mutating request against regulated data records who, when, what changed, and the before/after values (or a reference to them) — this is the SOC2-style audit trail, separate from ordinary application logging.

## Routing

A compliance gap found here is not self-approved — route to Security Reviewer before the endpoint ships (Security Reviewer's Scan Checklist already covers the mechanics of not leaking the data; this skill's job is to trigger that review with a concrete pattern, not replace it). If the data change itself (not the API surface) is in question, route to Data Agent's PII Routing rule instead.

## Canonical References

- `docs/workflow/role-definitions.md` (Security Reviewer → Scan Checklist; Data Agent → PII Routing)
- `docs/templates/SECURITY_REVIEW.md`
