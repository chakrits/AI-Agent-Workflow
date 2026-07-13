# Workflow: CI Failure Debug

Use when CI, build, lint, unit, integration, E2E, or deployment checks fail.

## Primary Flow

```text
CI Failure
  ↓
Collect Evidence
  ↓
Classify Failure
  ↓
Debugging Discipline
  ↓
Fix / Handoff
  ↓
Re-run Failed Check
  ↓
Regression Validation
```

## Classification

| CI Failure Type | Owner | Notes |
|---|---|---|
| Build / compile | Developer Agent | Check dependency/version/build config |
| Lint / formatting | Developer Agent | Avoid unrelated mass-format changes |
| Unit test failure | Developer Agent + QA review | Validate original assertion remains meaningful |
| E2E failure | QA Agent | Classify product bug vs flaky test vs env issue |
| Deployment failure | Release/DevOps Agent | Validate env/config/secret changes |
| Security scan failure | Security Reviewer | Do not suppress without review |

## Required Evidence

- CI run link or copied log
- failing job name
- failing command
- branch/commit
- environment/runtime version
- last known passing run, if available

## Rules

- Reproduce locally if possible.
- If not reproducible locally, document CI-only hypotheses and required evidence.
- Never skip failing tests without explicit approval.
- Never weaken assertions to hide product failures.
- If flaky, measure flake rate before and after.
