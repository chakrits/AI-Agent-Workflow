---
name: frontend-ui-engineering
description: Use when building or changing user-facing interfaces, pages, components, responsive layouts, or visual/UX behavior. Produces accessible, maintainable UI that follows the host project's design system; do not use for backend-only changes.
---

# Frontend UI Engineering

Build production-quality, content-led UI that belongs in the target product rather than a generic AI-looking interface.

## When to use

- New or changed pages, components, forms, interaction states, responsive layouts, or visual/UX fixes.
- Accessibility improvements to a user-facing interface.

Do not use for backend-only work, requirement discovery without a UI change, or generic test design. Route browser automation to `qa-playwright-testing` after the UI behavior is defined.

## Delivery workflow

1. Inspect the target project's component library, design tokens, existing patterns, and supported breakpoints before designing. Reuse them; do not invent a parallel design system.
2. Keep components focused and compose them from clear parts. Keep data fetching/state orchestration separate from presentational components when that separation clarifies ownership. Choose the simplest state scope that works: local, lifted, context, URL, server, then global state.
3. Use semantic HTML first. Meet WCAG 2.1 AA: native interactive elements, visible keyboard focus, logical focus movement after UI changes, labelled controls, sufficient contrast, and information that is not conveyed by color alone. Use ARIA to supplement native semantics, not replace them.
4. Design mobile-first and check 320px, 768px, 1024px, and 1440px. Handle real content length, overflow, empty data, errors, and loading, error, and empty states rather than leaving blank or unstable screens.
5. Follow the host design system's spacing, type, color, elevation, and radius tokens. Avoid arbitrary values, stock-card grids, excessive gradients/shadows, generic hero sections, and other generic AI visual defaults.

## Verification

- Render without console errors.
- Tab through every interactive control; verify keyboard activation and focus order.
- Check accessible names, semantic headings, labels, and status/error messaging.
- Check the defined responsive breakpoints with realistic content.
- Verify loading, error, and empty states as well as the happy path.
- When browser automation is warranted, hand off scenarios and acceptance criteria to `qa-playwright-testing`.

## Source note

This repository-specific instruction is an independent adaptation informed by [Addy Osmani's Frontend UI Engineering skill at commit `98967c4`](https://github.com/addyosmani/agent-skills/tree/98967c45a42b88d6b8fb3a88b7ff6273920763d6/skills/frontend-ui-engineering), licensed under the MIT License, Copyright (c) 2025 Addy Osmani. It deliberately avoids copying its framework-specific examples or full text; the durable notice is in `THIRD_PARTY_NOTICES.md`.
