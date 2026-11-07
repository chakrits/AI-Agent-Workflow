---
name: code-review-gate
description: Use when changed code is ready for engineering review before QA, PR submission, merge, or release.
---

# Code Review Gate Skill

Make code review structured, risk-aware, and useful.

## When to use

- After implementation before QA handoff.
- Before merge / PR submission.
- After receiving AI-generated code.
- Before security-sensitive code is considered complete.
- When a reviewer needs focused context.

See also: `docs/workflows/code-review-gate.md` for this skill's place in the end-to-end workflow (who hands off to whom, and what happens before/after).

## Do not use when

- No code changed.
- The task is requirement clarification.
- The task is pure test-case design.
- The task is active debugging without a fix.

## Review dimensions

Check:

- Requirement alignment.
- Correctness and edge cases.
- Maintainability.
- Error handling.
- Observability/logging.
- Performance risk.
- Security risk.
- Test coverage.
- Backward compatibility.
- Migration/config safety.

## Process

1. Summarize change and intent.
2. List changed files/components.
3. Identify review focus areas.
4. Identify high-risk areas.
5. Confirm tests and verification.
6. Check for dead code and undisclosed new dependencies (see below).
7. Produce review request.
8. Classify findings:
   - Critical: must fix before proceeding.
   - Major: blocks progress and requires correction before proceeding.
   - Minor: cleanup or improvement.
   - Question: requires clarification.

## Structural Remedies

When a finding is structural (not a one-line fix), name the specific restructuring, not just the problem — the author should not have to guess what "fix" means:

- Replace a chain of conditionals with a typed model or explicit dispatcher.
- Collapse duplicate branches into a single clearer flow.
- Separate orchestration from business logic.
- Move feature-specific logic out of a shared module into the code that owns the concept.
- Reuse the existing canonical helper instead of a near-duplicate.

Prefer the remedy that removes moving pieces over one that just relocates the same complexity.

## Dead Code Hygiene

After a change, list anything left unreachable or unused. Do not delete it unasked and do not leave it silently — ask:

```text
DEAD CODE IDENTIFIED:
- <file>: <symbol> — <why it's now unused>
→ Safe to remove these?
```

## Dependency Discipline

Before approving a change that adds a dependency, confirm:

1. Does the existing stack already solve this?
2. Is it actively maintained, with a compatible license?
3. Any known vulnerabilities?

For a dependency version bump: review the changelog, not just the version number diff — a "patch" can still carry a behavior change. Bump one dependency per change so a break is traceable to its cause.

## Output

Use `templates/CODE_REVIEW_REQUEST.md` and `templates/CODE_REVIEW_FINDINGS.md` when applicable.

## Three-pass review and decision tiers

Run all three passes: (1) Bugs & Logic, including edge cases and regressions; (2) Security & Trust, including authorization, injection, secrets and guardrails; and (3) Spec & Plan Compliance, including acceptance criteria and approved design/plan.

- **Blocking**: All Critical and Major findings block progress and require correction.
- **Human Judgment Required**: architecture or business trade-offs outside agent authority block progress until the Human approval gate decides; present the alternatives and evidence.
- **Non-blocking Nit**: Minor style, naming or formatting observations with no behavior, security or acceptance impact. Report at most five useful nits per review round; record `Suppressed Nits Count: +N` for the remaining observations.

Never downgrade a logic defect, security issue, missing required test or acceptance mismatch to a Nit to evade a block or the cap. Do not duplicate reports for generated files or deterministic CI checks; report substantive risks and failed checks regardless of their source.

For scoped task re-review, review prior findings and regressions introduced by the latest fix only; preserve the task execution mode limit of two rework rounds. Other review and Human/Security gates remain in force.
