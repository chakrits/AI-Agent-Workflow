# Implementation Plan — Platform Readiness and QA Acceptance Traceability

## Summary

| Field | Value |
|---|---|
| Work Item | GitHub Issue #26 |
| Change type / risk | Workflow-process enhancement / Medium; PR-B is security-sensitive |
| Inputs | Approved requirements, SDD, and Security review at `7adc07c` |
| Delivery | Sequential PR-A Portable Contract, then PR-B Hosted Activation & Hardening |

## Dependency Map

```text
PR-A policy/templates -> adapter parity/tests -> QA-01 -> merge
                                                    |
                                                    v
PR-B security hardening -> SEC-02 -> hosted smoke/QA-02 -> merge
```

PR-B starts only after PR-A merges. PR-A must not change App permissions, rulesets, or privileged workflow behavior.

## Tasks

| ID | Task | Owner | Scope | Verification |
|---|---|---|---|---|
| PC-01 | Add canonical AC-traceability and platform-activation templates; update policy/gates/handoff trigger and ownership. | Developer / Documentation | `docs/templates/`, `docs/workflow/` | Focused regression fails if a required field is removed. |
| PC-02 | Add one fixed Issue matrix heading; PR/MR links Work Item, commit SHA, QA evidence without a duplicate AC list. | Developer | `.github/`, `.gitlab/` | GitHub/GitLab parity test passes. |
| PC-03 | Add non-tautological tests for source/evidence requirements and Developer/QA ownership. | Developer | `test/validate-contracts.test.mjs` and validators if needed | RED proof, `npm test`, contract/state validation. |
| CR-01 | Confirm PR-A contains no security-sensitive workflow/App/ruleset scope. | Code Reviewer | PR-A | Review record. |
| QA-01 | Verify all PR-A-applicable Issue #26 matrix rows at an exact commit; retain PR-B-only rows as Pending with reason. | QA | Issue + Draft PR-A | QA evidence comment/review. |
| HA-01 | Pin privileged Actions to immutable SHA or record approved exception; preserve trusted-default-branch execution/no token output. | Developer | readiness workflow/tests/docs | `SEC-26-01` resolved. |
| HA-02 | Verify/harden untrusted input, source binding, closeout allowlist, and fail-closed behavior when justified. | Developer | readiness code/tests | Focused TDD plus suite. |
| SEC-02 | Review PR-B token scope, action provenance, trusted execution, source pinning, logging, and closeout integrity. | Security Reviewer | PR-B | No unresolved Critical/High. |
| OPS-01 | Verify App installation, permissions, environment/ruleset source; record rollback/disable action without exposing secrets. | Human Maintainer | GitHub settings | Evidence linked. |
| QA-02 | Run hosted expected-fail and expected-pass smoke paths; verify App check source/name and ruleset. | QA + Human | PR-B / Actions | Run URLs and SHA recorded. |
| CLOSE-01 | Existing post-merge documentation closeout after each implementation merge. | Documentation | closeout PR | Audit and signal cleanup pass. |

## Verification / Rollback

Run: `npm test`, `npm run validate:contracts`, `npm run validate:project-state`, `git diff --check`.

- Revert only PR-A if its template policy regresses.
- Do not merge PR-B on a security/smoke failure; retain current App/ruleset and remediate or revert its isolated commit.
- If external configuration is unavailable, mark activation Pending; portable contract remains independently valid.

## Handoff

Developer receives approved requirements/SDD/security controls and this plan. Developer hands QA a Draft PR URL, exact commit SHA, changed files, tests, limitations, and matrix rows in scope. PR-B also goes to Security Reviewer before QA/human merge.
