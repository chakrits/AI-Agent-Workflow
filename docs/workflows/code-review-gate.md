# Workflow: Code Review Gate

## Use when

Code changes are ready for review before QA, merge, or release.

## Flow

```text
Developer Agent
  ↓
verification-before-completion
  ↓
code-review-gate
  ↓
Reviewer / Security / QA
```

Developer Agent runs `verification-before-completion` ([[../../.agents/skills/verification-before-completion/SKILL.md|verification-before-completion]]) before requesting review.

## Gate Rules

Full review dimensions and process live in the `code-review-gate` skill ([[../../.agents/skills/code-review-gate/SKILL.md|code-review-gate]]). This
playbook blocks progress on:

- Critical correctness issue.
- Security-sensitive behavior without review.
- Tests not run and not explicitly justified.
- Requirement/AC mismatch.
- Missing rollback for risky data/config/migration change.

## Handoff

Use `CODE_REVIEW_REQUEST.md` ([[../templates/CODE_REVIEW_REQUEST.md|CODE_REVIEW_REQUEST.md]]) to structure the request and
`CODE_REVIEW_FINDINGS.md` ([[../templates/CODE_REVIEW_FINDINGS.md|CODE_REVIEW_FINDINGS.md]]) to record findings.

Include:

- review findings, grouped by dimension (see skill's Review dimensions)
- severity per finding: Critical / Major / Minor / Question
- blocking (must fix before proceeding) vs non-blocking findings, stated explicitly
- re-review scope — which files/areas need a second pass after fixes land

## Three-pass review and decision tiers

Run all three passes: (1) Bugs & Logic, including edge cases and regressions; (2) Security & Trust, including authorization, injection, secrets and guardrails; and (3) Spec & Plan Compliance, including acceptance criteria and approved design/plan.

- **Blocking**: Critical or Major findings affecting behavior, security, data correctness or acceptance criteria block progress and require correction.
- **Human Judgment Required**: architecture or business trade-offs outside agent authority block progress until the Human approval gate decides; present the alternatives and evidence.
- **Non-blocking Nit**: Minor style, naming or formatting observations with no behavior, security or acceptance impact. Report at most five useful nits per review round; record `Suppressed Nits Count: +N` for the remaining observations.

Never downgrade a logic defect, security issue, missing required test or acceptance mismatch to a Nit to evade a block or the cap. Do not duplicate reports for generated files or deterministic CI checks; report substantive risks and failed checks regardless of their source.

For scoped task re-review, review prior findings and regressions introduced by the latest fix only; preserve the task execution mode limit of two rework rounds. Other review and Human/Security gates remain in force.
