# Requirements — Platform Readiness and QA Acceptance Traceability

## Metadata

- Work Item ID: GitHub Issue #26
- Title: Add platform definition-of-ready and QA AC traceability
- Owner: BA Agent / Orchestrator
- Date: 2026-07-18
- Status: Ready for SA design and Security review
- Work Item URL: https://github.com/chakrits/AI-Agent-Workflow/issues/26

## Summary

Prevent medium-risk workflow/platform changes from reaching QA or human review with either (a) an incomplete set of approved acceptance criteria or (b) unproven hosting-platform configuration. Keep the existing dynamic lifecycle model; do not create an autonomous agent runtime.

## Scope

### P0 — Platform Definition of Ready

Create a portable platform-activation record for changes that add or modify hosted CI, GitHub/GitLab Apps or API bots, token scopes, required checks, rulesets, webhooks, or privileged workflows. The record distinguishes portable-contract completion from platform activation and identifies:

- affected platform/integration and the selected parity/manual/unsupported boundary;
- least-privilege permission inventory, installation/approval state, and human configuration owner;
- expected required-check name and trusted publisher/source where applicable;
- deterministic hosted smoke tests for both expected fail-closed and expected success behavior;
- evidence URLs, documented limitation, and a safe rollback/disable action.

### P1 — One Acceptance Traceability Matrix

Every medium-risk workflow/platform Work Item has exactly one `## Acceptance Traceability Matrix` in its Issue description. It contains one stable row for every approved criterion sourced from the Issue, approved SDD/design, or approved contract. Each row records ID, source link, testable criterion, owner, evidence, and result.

## Functional Requirements

| ID | Source | Requirement | Owner | Evidence / Result |
|---|---|---|---|---|
| FR-01 | Issue #26 / P1 | The Work Item template provides one canonical AC matrix with stable IDs, source, criterion, owner, evidence, and result fields. | Developer / QA | Template and regression test |
| FR-02 | Issue #26 / P1 | A new criterion in a design or contract comment is not considered complete until a row is added to the canonical matrix. | BA / SA / QA | Workflow policy and QA review |
| FR-03 | Issue #26 / P1 | QA verifies every in-scope matrix row against an exact commit SHA; every row has evidence or a justified `N/A`. | QA | Work Item comment or PR/MR review |
| FR-04 | Issue #26 / P1 | Developer supplies implementation evidence but cannot self-certify QA-owned criteria or automatically tick Issue AC. | Developer / QA | PR/MR template and regression test |
| FR-05 | Issue #26 / P0 | The platform-activation template records platform scope, owner, permissions, configuration prerequisites, hosted smoke plan/evidence, limitation, and rollback/disable action. | SA / Human Maintainer | Template and design review |
| FR-06 | Issue #26 / P0 | Portable contract completion and hosted-platform activation completion are separately visible; a pending external setting does not make the portable contract false or the platform integration complete. | SA / QA | Template, policy, hosted evidence |
| FR-07 | Issue #26 | GitHub and GitLab adapters preserve the portable contract; GitLab API automation remains explicitly out of scope without separately approved credentials. | Developer / Documentation | Adapter parity tests and platform guidance |
| FR-08 | Security recommendation | Privileged workflow execution uses trusted default-branch code only; Work Item/Change Request metadata is treated as untrusted data. | Developer / Security Reviewer | Workflow diff and regression coverage |
| FR-09 | Security recommendation | A required readiness check is source-pinned to the approved App; a platform record captures permission scope, installation approval, owner, and hosted verification. | Human Maintainer / Security Reviewer | Ruleset and smoke-test evidence |
| FR-10 | Security recommendation | Closeout behavior retains source-PR binding and allowlisted changed-file enforcement. | Developer / Security Reviewer | Focused readiness test and review |

## Non-functional / Security Constraints

- The model must remain portable: canonical terms are Work Item and Change Request, not GitHub-only wording.
- No additional `phase:` or `status:` labels are introduced by this work item.
- A privileged GitHub workflow must never check out, import, or execute PR-head code. It must not interpolate Issue/PR metadata into shell or executable JavaScript.
- GitHub App permissions remain least privilege. Any scope expansion requires a Security Reviewer and Human Maintainer approval before merge.
- A third-party action that can access a privileged token must use an immutable commit SHA, or have an explicitly approved time-bounded exception.
- Hosted activation must fail closed: missing/invalid App permission, check-source binding, or current Work Item state must not produce a passing readiness result.

## Out of Scope

- Agent runtime dispatcher, webhook worker, or automatic QA-agent invocation (P3).
- Additional lifecycle labels for platform activation (P2 is limited to future handoff-field design).
- A GitLab API bot, token, or automatic Issue/MR mutation.
- Any change to the Issue #19 lifecycle/readiness semantics except a separately approved hardening change in the hosted-activation PR.

## Assumptions

- Issue Markdown is portable enough to be the default canonical matrix location for GitHub and GitLab.
- For unusually large multi-PR work, an approved linked repository artifact may supplement the Issue matrix, but it may not become a second untracked checklist.
- The existing GitHub App and source-pinned ruleset remain available for hosted smoke verification.

## Open Questions

- Should a qualified large work item use a repository matrix artifact in addition to the Issue matrix? Recommendation: decide only if a real work item exceeds one Issue/PR; do not add that path now.
- Does the current repository policy accept immutable SHA pinning for all privileged third-party Actions in scope, or should a temporary exception format be defined? Security review must decide before hosted implementation.

## Risks

| Risk | Mitigation |
|---|---|
| Matrix becomes ceremony for low-risk work | Trigger it only for medium-risk workflow/platform changes; preserve the existing lightweight route. |
| External GitHub configuration blocks delivery late | Make owner, prerequisite, and smoke test part of Definition of Ready before Hosted Activation PR starts. |
| QA verifies only visible Issue checkboxes | Require the canonical matrix and exact commit SHA in the QA handoff/review. |
| Privileged workflow regression | Security design/diff reviews, trusted-code invariant, source-pinning, and hosted fail-closed smoke test. |

## Approval / Review

- Plan approval: Human Maintainer approved the Issue #26 draft plan on 2026-07-18.
- Next review: SA design, then Security Reviewer.
- `status:spec-ready`: Not yet eligible; apply only after SA and Security evidence are accepted.
