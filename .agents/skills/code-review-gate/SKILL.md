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
6. Check for dead code and undisclosed new dependencies (see below).
7. Produce review request.
8. Classify findings:
   - Critical: must fix before proceeding.
   - Major: should fix before merge unless explicitly accepted.
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
