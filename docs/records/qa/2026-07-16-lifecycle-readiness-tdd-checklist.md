# TDD Checklist — Lifecycle Stages and Specification Readiness

| Field | Evidence |
|---|---|
| Work Item | GitHub Issue #19 |
| Requirement | Feature/Enhancement work uses one current `phase:` label and requires `status:spec-ready` before Developer implementation. |
| Test seam | `test/validate-contracts.test.mjs` reads canonical policy, handoff contract/template, and routing adapters. |
| RED | `node --test --test-name-pattern='lifecycle stages' test/validate-contracts.test.mjs` failed because `docs/workflow/dynamic-routing.md` did not contain `phase:requirements`. |
| GREEN | The focused lifecycle and handoff-parity tests passed after the policy, template, and adapter updates. |
| Regression | `npm test`, `npm run validate:contracts`, `npm run validate:project-state`, and `git diff --check` passed. |

## Scope Boundary

This TDD slice validates the portable policy contract only. GitHub/GitLab request templates, repository label provisioning, and GitHub readiness automation are separate planned tasks and are not claimed complete here.
