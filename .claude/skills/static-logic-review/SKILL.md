---
name: static-logic-review
description: Review changed production logic by dry-running source-level input/output traces against an approved requirement, acceptance criterion, specification, or API contract. QA-owned; not a runtime test or universal PR gate.
---

# Static Logic Review Skill

## Purpose

Use this QA-owned sub-check to inspect a changed production-logic diff without executing it. Compare source-level paths to an approved requirement/AC/contract, then record only what the trace supports.

This complements `code-review-gate`'s broad engineering review. It does not replace runtime QA execution, `functional-test-design`, `test-quality-discipline`, `mutation-testing`, Security Reviewer review, or human approval.

## When to Use

Invoke when a changed production-logic diff has an approved AC/specification/contract and changes one or more of:

- decision branch or validation rule
- calculation/threshold or mapping/transformation
- state transition, async operation, or side effect
- authorization decision or error mapping

Risk determines review depth and priority; it does not override an explicit non-trigger case.

Do not use for documentation/assets-only work, pure test-quality review, runtime execution, or when no behavioral source of truth exists. In the last case, return `Potential Requirement Gap`, not a defect.

## Inputs

- Exact diff/commit range and changed production files
- Approved requirement/AC/specification/API contract to compare
- Relevant callers, state, side effects, and compatibility constraints when reachable from the diff

## Method

1. Scope the exact changed decision path; identify entry, exit, state reads/writes, awaited work, and side effects.
2. Trace at least a happy path plus applicable boundary and negative/counterexample inputs.
3. Check applicable null/empty, boolean, boundary, fallback, error-mapping, async/side-effect, and backward-compatibility behavior.
4. Compare each inferred trace result with the approved expectation. Do not present inference as observed runtime output.
5. Reuse the existing code-review record structure. Prefix each static finding with `SLR-` and include every field below.

| Required finding field | Requirement |
|---|---|
| Source | Requirement/AC/contract reference |
| Location | Exact file and lines |
| Precondition/input | State and input that select the traced path |
| Inferred trace result | Source-level result; explicitly inferred, not executed |
| Expected result | Approved expectation |
| Impact | User/system consequence if the difference is real |
| Confidence | High / Medium / Low, with evidence limit |
| Next owner | Developer Agent, BA Agent, SA Agent, or Security Reviewer |

## Finding and Backward Routing

| Evidence outcome | Result / next owner |
|---|---|
| Trace contradicts approved expectation | `SLR-` finding → Developer Agent |
| Requirement or business rule missing/ambiguous | `Potential Requirement Gap` → BA Agent |
| API, error, or design contract missing/insufficient | `Potential Requirement Gap` → SA Agent |
| Auth/authz, secrets, sensitive data, payment, privacy, or injection concern | `SLR-` security concern → Security Reviewer |

Developer self-use is advisory only. It cannot certify QA acceptance criteria, runtime behavior, test coverage, security approval, or human merge approval.

## Boundaries

- This skill cannot certify runtime behavior or QA acceptance criteria completion.
- This skill cannot establish test coverage, performance, or security approval.
- This is not a universal PR gate; invoke only for the documented trigger and source conditions.
- It produces static evidence, not a substitute for functional/regression execution or independent QA judgment.

## Output

Record the scope, source reference, traces attempted, `SLR-` findings or `Potential Requirement Gap`, confidence, limitations, and next owner in the existing code-review record. If no contradiction is found, state only that the reviewed traces had no static contradiction; do not claim full behavior verification.
