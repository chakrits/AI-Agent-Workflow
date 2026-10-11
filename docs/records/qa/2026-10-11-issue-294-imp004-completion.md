# IMP-004 implementation checkpoint — Issue #294

## Scope / completion contract
Base: `6d862318b9efff3519bb6760ec28159171c91704`; implementation: `6d95f72361d610481448edb6af776e8987623092`.
Final implementation plus review fix: `5d7bc2267c8b2196a5348f7fe3619c9334024d4c`.
Framework/meta, Medium risk; approved TDD steps6–7 and IMP-004. Developer implementation is verified locally; overall Issue acceptance and merge readiness remain pending.
Done when: automatic audit callers migrated coherently, RED/GREEN and retained controls verified, scoped independent review consumed and records published.
May proceed through: approved implementation/verification/branch publishing. Must stop for: new scope/security decisions, destructive operations and human merge. Assumptions: none added; ADR-0036 governs exclusions.

## Changes / regression inventory
- Removed three optional skill invocations from GitHub validate steps and their three GitLab jobs; retained all other jobs, triggers, commands and protections.
- Replaced three npm `validate:skill-*` aliases with manual `audit:skills` (catalog then parity, fail-fast) and `audit:skill-usage`. Diagnostics remain the same algorithms with truthful exit codes.
- Removed skill-usage from SubagentStop; existing advisory dispatch-receipt command/containment remains. No new `|| true` or other fail-open behavior added.
- Removed parity/usage from disposable-reset post-validation; reset ownership, exact-commit attestation, primary integrity, dirty refusal, idempotency and cleanup code unchanged. Retained nine verification commands.
- Added three fast config contract tests: no optional callers, explicit manual aliases, preserved core CI/PR/reset controls. Retired the two old catalog-required CI tests/helper; generic parity tests unchanged, added audit-name normalization coverage.
- Hook classification now distinguishes three manual diagnostics from the pre-existing test-only QA validator. Synthetic diagnostic unit/CLI negative tests remain unchanged; no live inventory audit in default tests.
- Narrow review fix pulled forward executable README/reset guidance from IMP-005: removed invalid aliases and mandatory CI claims, documented optional audits, repinned only reset-to-template (one hash occurrence). Broad policy/discovery remains IMP-005.
- CHANGES MADE: CI/package/hooks/reset caller migration and associated tests. NOTICED BUT NOT TOUCHING: policy/discovery text still names old mandatory commands (IMP-005), final clone harness/hosted acceptance (IMP-006), six unrelated old worktrees.

## Runtime evidence
| Command / experiment | Observed result |
|---|---|
| New config/hook/parity expectations before implementation |21 tests:17 pass,4 fail; automatic CI/hook invocation, missing manual alias and old SubagentStop boundary |
| Same suite after caller migration |21/21 pass;0 failed/skipped |
| Diagnostic + config/parity + setup-hooks + disposable-reset tests |78/78 pass;0 failed/skipped; includes truthful synthetic CLI failures |
| Full `npm test -- --test-reporter=tap` |775/775 pass;0 failed/cancelled/skipped/todo |
| Review finding regression |RED3/4, GREEN4/4; final full776/776 pass,0 failed/skipped; context compatibility valid |
| `npm run audit:skills` |exit0;39 catalog entries/descriptions,39 in-sync skills |
| `npm run audit:skill-usage` |exit0;138 entries,0 missing notation |
| `npm run validate:ci-parity` |exit0;13 GitHub/14 GitLab comparable commands;0 host-only exemptions |
| Configured npm-run inventory derived from both CI YAMLs |13 commands exit0, housekeeping exit1; no optional audit command remains |
| Additional core context compatibility |exit0; corpus/matrix valid |
| Runtime caller scan / whitespace check |no optional invocation in production callers outside diagnostic modules; diff check clean |

Focused command: `node --test test/validate-skill-catalog.test.mjs test/validate-skill-parity.test.mjs test/validate-skill-usage.test.mjs test/skill-decoupling-contract.test.mjs test/hook-containment.test.mjs test/validate-ci-parity.test.mjs test/setup-hooks.test.mjs test/verify-reset-template.test.mjs`.
Configured npm-run inventory: contracts, dispatch-receipts, workflow-evidence, housekeeping:worktrees, adapter-parity, adr:audit, risk-register, review-gate, clearable-refs, metrics, context-budget, status-projection, ci-parity, project-state (validator names carry `validate:` except housekeeping/ADR).
Dependency installation reused locked modules; no hosted `npm ci` claim. Raw local logs: `/private/tmp/issue294-imp004-{red,green,focused,full}.log`, not immutable hosted evidence. Authorized test execution accommodates readiness temporary fixture writes.

## Review / security / evaluation
Independent [review](2026-10-11-issue-294-imp004-code-review.md) returned NEEDS_FIX for one Minor stale-command finding at the original implementation SHA; corrected in the final fix commit and verified by author RED/GREEN/full regression. No second independent review or final QA/Security acceptance claimed. Reviewer uses `gpt-6-luna`, reasoning high, isolated context, per Human's lower-model request.
Developer security checklist: secrets/insecure defaults, production DEBUG, SQL, CORS, endpoint permissions, sensitive logging and auth throttling N/A — no application surface edited. Applicable boundary: optional library audits versus mandatory role-adapter/core integrity/PR readiness/reset safety. No new dependency, credentials, ruleset change, failure suppression or lowered core limit.
Source grounding, scope, assumptions, evidence, minimal change, retained gates, risks and next owner checked against Agent Evaluation Checklist. Skill Used: implementation-planning, tdd-implementation, ponytail, security-review, code-review-gate, requesting-code-review, verification-before-completion, git-workflow-and-versioning. Native/build/type checks N/A for this config/Node caller slice; no platform activation claim.

## Limits / next planned task
Housekeeping still truthfully exits1 for six pre-existing local worktrees. None pruned; Orchestrator/Human owns ownership/recoverability investigation. No all-checks-green/readiness claim.
Next planned: Documentation/Developer IMP-005 policy/discovery alignment and owning core repin. No successor auto-dispatched. Final independent contributor matrix, QA/Security, hosted PR/default-branch evidence and human merge remain IMP-006. All12 Issue acceptance outcomes remain Pending; labels unchanged. No PR or merge performed.
