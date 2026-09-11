---
name: coding-standards
description: Baseline naming, immutability, error-handling, and code-smell conventions shared across every stack this project targets (Python/Django today, TypeScript/React/Next.js/Supabase/Redis for a future target app). Use for general code-quality review; route to `backend-patterns`/`frontend-react-patterns` for framework-specific architecture, or `sa-architecture-design` for structural decisions.
---

# coding-standards

## Purpose

This is the shared floor beneath every stack Developer Agent might implement in, not a framework playbook. SA Agent's Architecture Pattern Selection and Dependency Boundary Rule already govern structural decisions (service layer, module boundaries); this skill governs the code inside those boundaries — naming, mutability, error handling — regardless of which stack owns the module.

## When to Use

- Reviewing or writing code for naming, readability, or code-smell issues.
- Setting up linting/formatting/type-checking conventions for a module.
- The specific stack-level pattern (backend architecture, React component design) is better covered by `backend-patterns` or `frontend-react-patterns` — use this skill for the baseline that applies regardless of which one also applies.

## Do Not Use When

- The question is about service/repository-layer architecture, caching, or database access patterns — use `backend-patterns`.
- The question is about React component composition, hooks, or state management — use `frontend-react-patterns`.
- The question is a structural/architecture decision (module boundaries, new dependency) — route to SA Agent / `sa-architecture-design`.

## Core Principles

- **Readability first** — code is read far more often than written; prefer a clear name over a clever one-liner.
- **KISS** — the simplest solution that satisfies the current requirement; no speculative abstraction.
- **DRY** — extract genuinely repeated logic; do not extract on the first occurrence, only once repetition is real (ties to YAGNI below).
- **YAGNI** — do not build a capability before a real requirement needs it.

## Immutability

Prefer creating a new value over mutating an existing one — this applies in both stacks, expressed differently per language:

- **Python**: reassign rather than mutate a shared list/dict in place when the object is passed by reference and shared elsewhere; use `dataclasses.replace()` or a new dict/list literal instead of in-place `.update()`/`.append()` on a value another caller may still hold a reference to.
- **TypeScript/React**: use the spread operator (`{ ...state, field: value }`, `[...items, next]`) instead of assigning to a property or calling a mutating array method (`push`, `splice`) on a value React state or another consumer depends on.

The concern is the same in both: a shared reference mutated in place produces bugs that only appear in the caller that didn't expect the change — not a language-specific style preference.

## Naming

- Functions: verb-first (`fetch_market_data` / `fetchMarketData`), not a bare noun.
- Booleans: `is_`/`has_`/`should_` prefix (Python) or `is`/`has`/`should` prefix (TypeScript) — a bare noun boolean (`active`) reads ambiguously at the call site.
- Constants: `UPPER_SNAKE_CASE` in both stacks.
- No single-letter or abbreviated names outside a tight, obviously-scoped loop variable.

## Error Handling

- Handle errors explicitly at the boundary where they can be meaningfully acted on; do not swallow an exception silently.
- User-facing messages stay generic and safe; log the full context (stack trace, request/operation identifiers) server-side only — never the reverse.
- Never use a bare `except:` (Python) or an empty `catch {}` (TypeScript) that discards the error.

## Code Smells to Watch For

- **Long functions** — split once a function's responsibilities stop being describable in one sentence; a hard line count (e.g. 50 lines) is a smell indicator, not a mechanical rule.
- **Deep nesting** — prefer early returns/guard clauses over 4+ levels of nested conditionals.
- **Magic numbers/strings** — name a repeated literal as a constant once its meaning isn't obvious from context.

## Canonical References

- `docs/workflow/role-definitions.md` (SA Agent → Architecture Pattern Selection, Dependency Boundary Rule; Developer Agent → Scope Discipline)
- `.agents/skills/backend-patterns/`, `.agents/skills/frontend-react-patterns/` (stack-specific architecture patterns this skill does not cover)
- `.agents/skills/code-review-gate/`, `.agents/skills/test-quality-discipline/`
