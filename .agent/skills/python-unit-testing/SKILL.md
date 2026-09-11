---
name: python-unit-testing
description: Write and run unit/component tests for Python code with pytest. Use to operationalize tdd-implementation's red-green-refactor discipline with concrete tooling.
---

# python-unit-testing

## Purpose

Give `tdd-implementation`'s red-green-refactor process concrete tooling for Python codebases, using pytest.

## Installation

```bash
uv add --dev pytest   # or: pip install pytest
```

## Running

```bash
uv run pytest                                        # run the suite
uv run pytest -v                                      # verbose
uv run pytest --cov                                   # coverage (requires pytest-cov)
uv run pytest tests/unit/test_module.py::test_case    # single test
```

See `templates/pytest.ini.template`.

## Where Tests Live

Test files live under `tests/unit/` per `docs/workflow/testing-conventions.md`.

## Canonical References

- `docs/workflow/role-definitions.md` (QA Agent → Skill Routing)
- `.agents/skills/tdd-implementation/SKILL.md`
- `.agents/skills/mutation-testing/SKILL.md` (mutmut runs against this same suite)
- `docs/workflow/testing-conventions.md`
- `docs/templates/TEST_REPORT.md`
