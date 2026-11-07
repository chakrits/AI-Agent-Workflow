# Intent

> Human-triaged proposal. A completed intent or metric breach grants no implementation, merge, or release approval.

## Identity and Source of Truth
- Work Item / Title:
- Owner / Date / Status: Draft
- Origin: Human / Metric advisory
- Source repository and full commit SHA:
- Source artifact paths / Issue URL / evidence references:
- Confirmed facts (each with source):
- Assumptions and validation owner:

Record the immutable source commit and artifact paths used to form this intent. If sources change, record the new SHA and revalidate affected claims; do not silently replace provenance.

## Problem and Desired Outcome
- Problem / affected users:
- Desired outcome and measurable success criteria:
- Constraints / in scope / out of scope:

## Open Questions and Triage
| Question / conflicting evidence | Owner | Resolution / scope decision | Blocks progress? |
|---|---|---|---|
| | | | |

- Human triage decision / decision evidence:
- Next owner / required artifacts / stop boundary:

## Metric Advisory Header (N/A for Human-origin intents)
```text
Intent-Fingerprint: sha256:<64-hex>
Draft-Content-SHA256: sha256:<64-hex>
```
- Signal / metric / evaluated cohort / sample count / observation interval:
- Observed value / threshold / source artifact paths / source commit SHA:

These placeholders are not computed digests. The metric producer computes `Intent-Fingerprint` from the anomaly object using RFC 8785 JCS, excluding Git HEAD. It computes `Draft-Content-SHA256` over the entire file with its own header line replaced by `Draft-Content-SHA256: <self>`. Human edits require triage and must not be overwritten silently. An advisory neither changes policy nor bypasses approval.

## Canonical Equivalence and Routing
| Intent content | Canonical [REQUIREMENT_DISCOVERY.md](REQUIREMENT_DISCOVERY.md) coverage |
|---|---|
| Identity, problem, outcome, constraints | Request Summary; Scope |
| Sourced facts, assumptions, questions | Confirmed Facts; Assumptions; Open Questions |
| Triage and next owner | Recommended Next Step |

INTENT is the initial capture. Stories, testable acceptance criteria, business rules and risk/edge cases must be completed in [SPEC.md](SPEC.md) or the canonical discovery artifact before specification readiness. Fast-track requires all six SPEC eligibility checks: low risk, no security/API/data impact, clear requirements and independent verification. Any failed/unknown check routes to the stated owner. Continue with [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) only after the applicable readiness/approval gates.
