---
name: tdd-implementation
description: Use this skill for code behavior changes where tests should drive or accompany implementation. Apply red-green-refactor discipline: write or identify a failing test first, implement the smallest change, then refactor after tests pass. Do not use for pure documentation, config-only, reference-data-only, or exploratory debugging without a known behavior target.
---

# TDD Implementation Skill

Use test-driven discipline for code behavior changes.

## When to use

- New feature implementation.
- Bug fix with known root cause and expected behavior.
- Refactor that must preserve behavior.
- API/business logic changes.
- Validation or error-handling behavior changes.

## Do not use when

- No code behavior changes are required.
- The issue has no reliable repro or root cause; use `debugging-discipline`.
- The task is data/config-only.
- The user explicitly asks for test design only.

## Process

### 1. Define target behavior

Identify:

- Requirement/AC or bug reference.
- Expected behavior.
- Current behavior.
- Test seam.

### 2. RED

Create or identify a failing test that proves the desired behavior is absent or broken.

Rules:

- The test must fail for the right reason.
- If an existing failing test already proves the issue, reference it.
- Do not write implementation before the test is defined unless the project has no test harness; if so, document why.

### 3. GREEN

Implement the smallest change required to make the test pass.

Rules:

- Avoid unrelated refactoring.
- Do not weaken assertions.
- Do not remove failing tests to pass.

### 4. REFACTOR

Clean up only after tests pass.

Rules:

- Preserve behavior.
- Re-run relevant tests.
- Keep the diff reviewable.

### 5. Handoff

Provide changed files, tests added/updated, commands run, and known gaps.

## Output

Use `templates/TDD_CHECKLIST.md` when recording work.

## Completion checklist

- Failing test was created or identified.
- Test failed for the right reason before fix.
- Minimal implementation made it pass.
- Relevant regression tests passed.
- No unrelated refactor was mixed in.
- Validation scope is stated honestly.
