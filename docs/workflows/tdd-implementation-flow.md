# Workflow: TDD Implementation Flow

## Use when

A code behavior change is required.

## Flow

```text
Implementation Plan
  ↓
tdd-implementation
  ↓
verification-before-completion
  ↓
code-review-gate
  ↓
QA handoff
```

## Rules

- Define target behavior before editing production code.
- Create or identify a failing test first.
- Implement the smallest fix.
- Refactor only after tests pass.
- Do not weaken tests to make the build pass.
- State validation scope honestly.

## Gate Rules

Full red-green-refactor rules live in the `tdd-implementation` skill
([[../../.agents/skills/tdd-implementation/SKILL.md|tdd-implementation]]); before
completion (see `verification-before-completion`
([[../../.agents/skills/verification-before-completion/SKILL.md|verification-before-completion]])
and `code-review-gate` ([[../../.agents/skills/code-review-gate/SKILL.md|code-review-gate]])),
confirm evidence for:

- A failing test existed before the implementation change (RED).
- The smallest change needed to pass was applied (GREEN), not unrelated refactoring.
- All tests pass after the fix, including the originally failing one.
- No test assertion was weakened or removed to make the build pass.

## Handoff

Include:

- PR/commit/branch
- test count before and after (failing → passing)
- changed files
- validation evidence (command run, output/result)
