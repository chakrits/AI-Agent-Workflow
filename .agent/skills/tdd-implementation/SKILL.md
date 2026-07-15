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

## Test Design Rules

Apply when writing the test in the RED step:

- **Test sizing** — most tests should be small (single process, no I/O/network/DB). Reach for a medium test (crosses a boundary — API, DB, filesystem) or a large test (E2E, critical path) only when a small test cannot prove the behavior.
- **Prefer real implementations over mocks.** Preference order: real implementation > fake (in-memory) > stub (canned data) > mock (interaction verification). Use a mock only when the real dependency is slow, non-deterministic, or has side effects you cannot control.
- **Test state, not interactions.** Assert on the outcome, not on which internal method was called — interaction-based tests break under refactors that don't change behavior.
- **DAMP over DRY in tests.** A test should read as a self-contained specification. Some duplication across tests is acceptable if it keeps each test independently understandable; do not extract shared setup just to avoid repeating the input shape.

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
