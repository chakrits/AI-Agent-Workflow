# Requirement Discovery — Synthetic Duplicate Delivery

> Synthetic workflow exercise only. This is not an organization's approved business requirement and does not authorize implementation against a real system.

## 1. Request Summary

| Item | Detail |
|---|---|
| Change Type | Synthetic requirement refinement |
| Business Goal | Make the fixture's duplicate-delivery meaning explicit for role-collaboration evaluation |
| Target Users / Actors | Synthetic event sender and Example Event Gateway fixture |
| Business Criticality | Low (exercise only) |
| Code Change Required | Unknown; no runtime exists in this repository |
| Security/Data Sensitivity | No; public synthetic data only |

## 2. Confirmed Facts

| # | Fact | Source / Reference |
|---|---|---|
| 1 | The fixture uses an idempotency key to recognize the same submission attempt. | `KMS-SYN-001`, revision `issue-298-synthetic-v1`, SHA-256 `3c2e01e659aba1f2d396dabad937d672fc59277d6e4ff13e3cdc7a9007300174` |
| 2 | Same key plus same normalized payload identifies the same event. | `KMS-SYN-002`, revision `issue-298-synthetic-v1`, SHA-256 `07f1480980b0d08e6d45d499acaa188edecf33e593283a1da7fe0f684d8f8019` |
| 3 | Same key plus different normalized payload is a conflict requiring owner review. | `KMS-SYN-002`, same revision and hash as above |
| 4 | The example interface is `POST /synthetic/v1/events`. | `KMS-SYN-003`, revision `issue-298-synthetic-v1`, SHA-256 `cbe01609d443d36798bea1d02d7df0146432bcf05f464adbb2c5b5ed56938d63` |

## 3. Assumptions

| # | Assumption | Impact if Wrong | Validation Needed |
|---|---|---|---|
| 1 | None. | N/A | N/A |

## 4. Open Questions

| # | Question | Owner | Blocks Progress? |
|---|---|---|---|
| 1 | What response status/body represents same-event recognition and key/payload conflict? | SA Agent with system owner | Yes, before an API contract or implementation |
| 2 | What retry, timeout, retention, and key-expiry behavior applies? | SA Agent with system owner | Yes, before production design |
| 3 | Which real business process owns these semantics? | Business/process owner; none identified | Yes, before treating this as business policy |

## 5. Scope

### In Scope

- Refine the three synthetic source facts into traceable, testable semantic acceptance criteria.
- Preserve unknown HTTP, retry, and retention behavior as open questions.

### Out of Scope

- Production API behavior, schema, code, database, or data migration.
- Business approval, SIT, UAT, or claims about a live service.

## 6. User Stories

| Story ID | As a | I want | So that | Priority |
|---|---|---|---|---|
| US-001 | Synthetic event sender | To identify a repeated submission consistently | The fixture can distinguish a repeat from a conflicting reuse of a key | Low |

## 7. Acceptance Criteria

| AC ID | Related Story | Given | When | Then | Testable? |
|---|---|---|---|---|---|
| AC-001 | US-001 | A previously accepted fixture event and a second submission with the same key and normalized payload | The second submission is evaluated | The requirement classifies it as the same event; it does not invent a wire response or assert runtime persistence | Yes, as a source-backed semantic rule |
| AC-002 | US-001 | A previously accepted fixture event and a second submission with the same key but a different normalized payload | The second submission is evaluated | The requirement classifies it as a conflict and routes the unresolved outcome to the owner; no HTTP status is guessed | Yes, as a source-backed semantic rule |
| AC-003 | US-001 | No approved API response contract exists | A consumer or implementation needs an HTTP outcome | The work stops and routes the response, retry, and retention questions to SA/system owner | Yes |

## 8. Business Rules

| Rule ID | Rule | Source | Impacted Area |
|---|---|---|---|
| BR-001 | Same idempotency key and same normalized payload identify the same fixture event. | `KMS-SYN-002`, synthetic only | Requirement and future API contract |
| BR-002 | Same idempotency key and different normalized payload is a conflict that requires owner review. | `KMS-SYN-002`, synthetic only | Requirement and future API contract |

## 9. Risk / Edge Case Notes

| Risk ID | Risk / Edge Case | Impact | Suggested Coverage |
|---|---|---|---|
| R-001 | API response, retry, and key-retention semantics are absent. | Guessing would create an unsupported contract. | Keep implementation blocked until system owner resolves the questions. |
| R-002 | Source is explicitly synthetic. | Misuse could turn an exercise into false business policy. | Preserve source IDs and synthetic label in every handoff. |

## 10. Recommended Next Step

| Next Agent / Skill | Reason | Required Input |
|---|---|---|
| SA Agent / `sa-architecture-design` | Define API response and retry contract only after an authorized system owner supplies behavior | Named system/business owner and approved response/retry rules |

## C1 outcome

Owner: BA Agent mode using `ba-requirement-analysis`; no child was invoked. Result: PASS for source traceability and ambiguity handling. Implementation readiness: BLOCKED by the explicit open questions and lack of a business owner. This is not application acceptance evidence.
