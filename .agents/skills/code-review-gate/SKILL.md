---
name: code-review-gate
description: Use this skill when code changes are ready for engineering review, especially after implementation and before QA/release. It produces a review request, review checklist, risk-focused review scope, and required fixes. Do not use for business requirement review or test-case design.
---

# Code Review Gate Skill

Make code review structured, risk-aware, and useful.

## When to use

- After implementation before QA handoff.
- Before merge / PR submission.
- After receiving AI-generated code.
- Before security-sensitive code is considered complete.
- When a reviewer needs focused context.

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
6. Produce review request.
7. Classify findings:
   - Critical: must fix before proceeding.
   - Major: should fix before merge unless explicitly accepted.
   - Minor: cleanup or improvement.
   - Question: requires clarification.

## Output

Use `templates/CODE_REVIEW_REQUEST.md` and `templates/CODE_REVIEW_FINDINGS.md` when applicable.
