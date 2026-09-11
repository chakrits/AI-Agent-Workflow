---
name: frontend-react-patterns
description: React/Next.js component architecture patterns — composition, compound components, custom hooks, state-scope selection, memoization, form handling, and error boundaries. Distinct from frontend-ui-engineering (accessibility/responsive/design-system delivery workflow) and frontend-visual-design (aesthetic direction) — this skill is the component-architecture reference those two draw on.
---

# frontend-react-patterns

## Purpose

`frontend-ui-engineering` governs the delivery workflow for a UI change (inspect the design system, meet WCAG 2.1 AA, check breakpoints, verify states) — it does not itself catalog *how* to structure a component or manage state. This skill is that architecture reference, for any target app using React/Next.js.

## When to Use

- Deciding how to structure a component (composition vs a large monolithic component), a custom hook, or where a piece of state should live.
- Choosing a memoization or code-splitting point for a performance concern.

## Do Not Use When

- The question is accessibility, responsive breakpoints, or design-system token compliance — use `frontend-ui-engineering`.
- The question is visual/aesthetic direction (palette, typography, motion) — use `frontend-visual-design`.
- The question is browser E2E automation — use `qa-playwright-testing`.

## Component Composition

Prefer composing small, focused components over one large component with many conditional branches. A **compound component** (e.g. `Tabs` + `TabList` + `Tab`, sharing state via context) is the right escalation only once plain prop-drilling composition becomes awkward — reach for it deliberately, not as the default starting shape.

## Custom Hooks

Extract a custom hook when the same stateful logic (a debounce, a data-fetch-with-loading-state pattern) is needed in more than one component. A hook that wraps an async fetcher must keep the latest fetcher/options in a ref rather than a dependency array entry when the caller passes a fresh inline function/object each render — otherwise the effect re-runs every render and creates an infinite fetch loop, a common defect class in ad hoc data-fetching hooks.

## State-Scope Selection

Choose the narrowest scope that works, escalating only when the narrower scope proves insufficient: local component state → lifted to a shared parent → context → URL state → server state (cache-backed fetch) → global store. Defaulting to a global store for state only one component tree needs adds indirection without benefit.

## Memoization

Memoize a computation only when it is demonstrably expensive (e.g. sorting/filtering a large list) or when referential stability itself matters (a callback passed to a memoized child) — not by default on every value and function, which adds complexity without a measured benefit.

## Form Handling

Use schema-based validation (e.g. Zod) at the form boundary so client-side validation and the API's own input-validation schema can share one source of truth rather than drifting into two independently-maintained rule sets.

## Error Boundaries

Wrap a section of the tree that can fail independently (a widget fetching its own data) in its own error boundary, so its failure doesn't blank the whole page — this is a rendering-time safety net, distinct from the request-level error handling `backend-patterns` covers.

## Canonical References

- `docs/workflow/role-definitions.md` (Developer Agent → Skill Routing)
- `.agents/skills/frontend-ui-engineering/` (delivery workflow: accessibility, responsive, design-system compliance)
- `.agents/skills/frontend-visual-design/` (aesthetic direction)
- `.agents/skills/coding-standards/` (naming/immutability baseline)
