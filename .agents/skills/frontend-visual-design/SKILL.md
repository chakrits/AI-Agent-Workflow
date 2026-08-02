---
name: frontend-visual-design
description: Aesthetic direction for a new UI or a visual reshape — palette, typography, layout, motion, and copywriting voice that reads as a deliberate choice for this specific product rather than a generic AI-default look. Distinct from frontend-ui-engineering (accessibility/responsive delivery) and frontend-react-patterns (component architecture) — this skill governs how the result should look and read, not how it's built.
---

# frontend-visual-design

## Purpose

`frontend-ui-engineering` already warns against "generic AI visual defaults" in one line, but doesn't say how to arrive at something distinctive instead. This skill is that direction-setting step: a short design pass before (or alongside) implementation that pins down a specific, justified visual identity for the page/product at hand, rather than defaulting to whatever a generic prompt would produce for any similar page.

## When to Use

- Building a new user-facing page/product where the visual identity itself is undecided, or reshaping an existing one that currently reads as templated.
- The design brief doesn't pin down a visual direction and one needs to be chosen deliberately.

## Do Not Use When

- The visual direction is already fully specified by an existing design system/brand guide — apply it via `frontend-ui-engineering` instead of inventing a new one.
- The task is component architecture, state management, or accessibility compliance — use `frontend-react-patterns` / `frontend-ui-engineering`.

## Ground the Design in the Subject

Before choosing colors or type, name the concrete subject, its audience, and the page's one job. Distinctive choices come from that subject's own world (its materials, vocabulary, real content) — not from a palette picked in the abstract.

## Avoiding the Generic-AI-Default Look

Three looks currently dominate AI-generated design by default: a warm cream background with a high-contrast serif and terracotta accent; a near-black background with one acid-green/vermilion accent; a broadsheet layout with hairline rules and dense columns. None are wrong for every brief, but landing on one *by default* rather than by deliberate choice for this subject is the failure mode this skill exists to catch.

## Design Pass (two steps)

1. **Plan** — a compact token set: 4–6 named hex colors, 2+ typefaces with a defined role each (a characterful display face used with restraint, a body face, optionally a utility face for data/captions), a one-sentence layout concept (ASCII wireframe is fine to compare options), and one signature element the page will be remembered by.
2. **Critique before building** — check the plan against "would this be my default answer for any similar brief?" Revise anything that reads as the generic default, and state what changed and why, before writing any implementation code.

## Structure, Motion, and Restraint

Structural devices (numbering, dividers, eyebrows) should encode something true about the content — a numbered sequence only when the content really is ordered, not decoration. Use motion deliberately (a page-load sequence, a scroll reveal) where it serves the subject; excess ambient animation is itself a generic-AI tell. Spend boldness in one place (the signature element) and keep the rest disciplined — restraint is a choice, not an absence of one.

## Copywriting Voice

Words are interface material, not decoration. Name things by what the person controls, not by internal system names. Use active voice and keep an action's name consistent through the whole flow (a "Publish" button produces a "Published" toast, not "Submitted"). Write error and empty states in the interface's own voice — specific about what happened and what to do next, never vague or apologetic.

## Canonical References

- `docs/workflow/role-definitions.md` (Developer Agent → Skill Routing)
- `.agents/skills/frontend-ui-engineering/` (accessibility/responsive/design-system delivery this skill's output still has to satisfy)
- `.agents/skills/frontend-react-patterns/` (component architecture used to build the chosen direction)
- `THIRD_PARTY_NOTICES.md` (Anthropic `frontend-design`, Apache 2.0 — this skill restates the upstream philosophy in this repo's own format rather than reproducing its text)
