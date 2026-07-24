# Testing Conventions

This is a convention for how a target app (once cloned via `scripts/reset-to-template.mjs` and paired with a real runtime app) should organize its test directories. It is a starting point to adapt, not a hard requirement — an existing target app's structure takes precedence if one is already in place.

## Folder Structure

End-to-end specs live in `tests/e2e/`, API tests in `tests/api/`, unit tests in `tests/unit/`, and mutation config/output in `tests/mutation/`:

```text
tests/
├── e2e/          # Playwright specs — see .agents/skills/qa-playwright-testing/
├── api/          # Supertest specs, Bruno collections — see .agents/skills/api-testing-tooling/
├── unit/         # Jest/Vitest (JS/TS) or pytest (Python) — see .agents/skills/js-unit-testing/ or .agents/skills/python-unit-testing/
└── mutation/     # Stryker or mutmut config/output, if kept separate from tests/unit/ — see .agents/skills/mutation-testing/
```

## Notes

- `tests/mutation/` is optional — many projects keep mutation-testing config alongside the unit tests it mutates (`tests/unit/`) instead of a separate folder. Either is acceptable; pick one and stay consistent within a project.
- This convention exists so a target app's test layout is predictable across projects that reuse this framework, not to prescribe one true folder shape for every possible stack.

## Canonical References

- `.agents/skills/qa-playwright-testing/SKILL.md`
- `.agents/skills/api-testing-tooling/SKILL.md`
- `.agents/skills/js-unit-testing/SKILL.md`
- `.agents/skills/python-unit-testing/SKILL.md`
- `.agents/skills/mutation-testing/SKILL.md`
