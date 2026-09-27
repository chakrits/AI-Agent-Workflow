# Work Item: Issue #282 — Astra safe autonomy, persistence, and proportional verification

## Source
- Issue: https://github.com/chakrits/AI-Agent-Workflow/issues/282
- Umbrella issue: #280

## Classification
- Change type: Framework / Meta Change
- Risk level: Medium
- Lifecycle phase: `phase:verification`
- Workflow route: Documentation Agent → Reviewer / QA Agent → Human Approval

## Artifacts
- Design / ADR: `docs/records/sdd/2026-09-21-issue-282-safe-autonomy-proportional-verification-sdd.md`; ADR-0035
- Implementation plan: `docs/records/implementation-plan/2026-09-27-issue-282-safe-autonomy-plan.md`
- PRs: [#287](https://github.com/chakrits/AI-Agent-Workflow/pull/287) — Draft, linked to Issue #282

## Scope
- Define when reversible low-risk assumptions may proceed with disclosure.
- Preserve mandatory stops and human approval gates.
- Add completion-contract and risk-proportional verification guidance.

## Completion Contract
- Done when: Issue acceptance criteria are implemented, focused policy scenarios and repository validators pass, and independent review/QA records its result.
- May proceed through: In-scope documentation, contract-test, SHA re-pin, and targeted verification changes under the approved SDD.
- Must stop for: Any ambiguity that changes business meaning or approval authority, any weakening of security/human gates, or a newly discovered irreversible or production-impacting action.
- Assumptions: This work changes repository policy and tests only; it does not change runtime behavior or production data.

## Acceptance Traceability Matrix

| AC | Expected result | Developer evidence | QA result |
|---|---|---|---|
| AC-01 | Reversible, low-risk, in-scope assumptions proceed with disclosure; human-gate scenarios stop before mutation. | `test/issue-282-policy-contract.test.mjs`; `AGENT_OPERATING_MODEL.md#safe-assumption-boundary` | Pending independent QA |
| AC-02 | Completion claims cite evidence appropriate to the task and identify unchecked areas. | `quality-gates.md#proportional-verification`; policy contract test | Pending independent QA |
| AC-03 | Read-only/docs work avoids unrelated test suites. | `quality-gates.md#proportional-verification`; policy contract test | Pending independent QA |
| AC-04 | Security, production data, release, and irreversible work retain expanded review, tests, rollback evidence, and human approval. | `AGENT_OPERATING_MODEL.md#human-approval-gates`; `quality-gates.md#proportional-verification`; policy contract test | Pending independent QA |
| AC-05 | Positive autonomy and negative boundary scenarios are covered. | `test/issue-282-policy-contract.test.mjs` (5 focused tests) | Pending independent QA |

## Status
Approved SDD and implementation plan; developer changes are complete. Draft PR #287 is in independent review/QA.
