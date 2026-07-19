---
name: mutation-testing
description: Validate that Python test suites actually catch bugs, using mutmut to introduce deliberate code mutations and measure how many are killed. Use for QA Agent's Test Effectiveness rule on core business-logic/service-layer modules.
---

# mutation-testing

## Purpose

Coverage percentage only proves code executed during a test run — not that the test would fail if the code were wrong. Mutation testing proves the latter by deliberately breaking the code in small ways and checking whether the test suite notices.

## Core Concept

- **Mutant** — a small automated code change (e.g. `>` → `>=`, `and` → `or`, `True` → `False`).
- **Killed** — a test failed against the mutant (good — the test caught the bug).
- **Survived** — every test still passed against the mutant (bad — a weak test, or a coverage gap).
- **Score** — percentage of mutants killed.

## Python (mutmut)

### Installation

```bash
uv add --dev mutmut   # or: pip install mutmut
```

### Running

```bash
uv run mutmut run              # run mutation testing
uv run mutmut results          # summary
uv run mutmut show <id>        # inspect one surviving mutant
uv run mutmut html             # HTML report
open html/index.html
```

## When to Apply

Not every change needs mutation testing. Apply it to modules with non-trivial business logic in the service layer (SA Agent's Dependency Boundary Rule) — the modules where a weak test is most costly. Skip it for thin views/serializers/migrations.

## Scoring

Record the measured score and the list of any unaddressed survived mutants in `docs/templates/TEST_REPORT.md`. There is no fixed pass/fail threshold mandated by this skill — the acceptable bar is a per-work-item judgment call (see the canonical Test Effectiveness rule), not a hardcoded gate.

## Improving a Survived Mutant

A surviving mutant usually means either the assertion is too weak (assert a specific value, not just "is defined") or a boundary condition isn't tested. Route the finding to Developer Agent per the canonical Test Effectiveness rule — QA Agent does not rewrite Developer Agent's tests.

## Canonical References

- `docs/workflow/role-definitions.md` (QA Agent → Test Effectiveness; SA Agent → Dependency Boundary Rule)
- `docs/templates/TEST_REPORT.md`
