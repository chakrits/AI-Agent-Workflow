# Task Review

| Field | Value |
|---|---|
| Work Item / Task ID |  |
| Base SHA |  |
| Head SHA |  |
| Spec verdict | PASS / FAIL / CANNOT_VERIFY |
| Quality verdict | APPROVED / NEEDS_FIX |
| Task review rework count | 0 |

## Evidence and Findings

| ID | Severity | AC / path | Evidence | Required correction |
|---|---|---|---|---|
|  |  |  |  |  |

## Out-of-Scope Observations

- Observation / owner / next action:

## Round summary

- Review round: [number]
- Suppressed Nits Count: +0

## Three-pass review and decision tiers

Run all three passes: (1) Bugs & Logic, including edge cases and regressions; (2) Security & Trust, including authorization, injection, secrets and guardrails; and (3) Spec & Plan Compliance, including acceptance criteria and approved design/plan.

- **Blocking**: Critical or Major findings affecting behavior, security, data correctness or acceptance criteria block progress and require correction.
- **Human Judgment Required**: architecture or business trade-offs outside agent authority block progress until the Human approval gate decides; present the alternatives and evidence.
- **Non-blocking Nit**: Minor style, naming or formatting observations with no behavior, security or acceptance impact. Report at most five useful nits per review round; record `Suppressed Nits Count: +N` for the remaining observations.

Never downgrade a logic defect, security issue, missing required test or acceptance mismatch to a Nit to evade a block or the cap. Do not duplicate reports for generated files or deterministic CI checks; report substantive risks and failed checks regardless of their source.

For scoped task re-review, review prior findings and regressions introduced by the latest fix only; preserve the task execution mode limit of two rework rounds. Other review and Human/Security gates remain in force.
