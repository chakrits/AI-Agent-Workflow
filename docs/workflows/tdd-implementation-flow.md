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
