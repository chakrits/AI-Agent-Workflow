---
name: js-unit-testing
description: Write and run unit/component tests for JS/TS code with Jest or Vitest. Use to operationalize tdd-implementation's red-green-refactor discipline with concrete tooling.
---

# js-unit-testing

## Purpose

Give `tdd-implementation`'s red-green-refactor process concrete tooling for JS/TS codebases. Covers both Jest and Vitest as sibling options — this skill does not mandate one over the other.

## Choosing Between Jest and Vitest

- **Vitest** — Vite-based or ESM-first projects; faster startup, native ESM/TS support without extra transform config.
- **Jest** — broader ecosystem compatibility, CRA-style or older Node/CommonJS projects, largest plugin/matcher ecosystem.

If the target app already has one configured, use it. For a new project, prefer Vitest when the build tool is already Vite; otherwise Jest.

## Jest

### Installation

```bash
npm install --save-dev jest
```

### Running

```bash
npx jest
npx jest --watch
npx jest --coverage
```

See `templates/jest.config.template.js`.

## Vitest

### Installation

```bash
npm install --save-dev vitest
```

### Running

```bash
npx vitest run
npx vitest --watch
npx vitest run --coverage
```

See `templates/vitest.config.template.ts`.

## Where Tests Live

Test files live under `tests/unit/` per `docs/workflow/testing-conventions.md`.

## Canonical References

- `docs/workflow/role-definitions.md` (QA Agent → Skill Routing)
- `.agents/skills/tdd-implementation/SKILL.md`
- `docs/workflow/testing-conventions.md`
- `docs/templates/TEST_REPORT.md`
