# Implementation Plan: Issue #282 Safe Autonomy and Proportional Verification

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | Issue #282 — Astra safe autonomy, persistence, and proportional verification |
| Change Type | Framework / Meta |
| Risk Level | Medium |
| Owner | Documentation Agent / Orchestrator |
| Target Branch / Ticket | `codex/issue-282-autonomy-design` / #282 |

## 2. Inputs Reviewed

| Artifact | Status | Notes |
|---|---|---|
| Issue acceptance criteria | Available | `gh issue view 282`; scenario coverage and lifecycle-only state updates are explicit. |
| SDD / ADR | Approved | Child SDD and ADR-0035; Human Maintainer approved the SDD on 2026-09-27. |
| Core loading decision | Available | Issue #281 / PR #285; `AGENTS.md` and the bootloader are SHA-pinned and budget-checked. |
| Workflow | Available | `docs/workflows/stabilize-core.md`, `docs/workflow/dynamic-routing.md`. |

## 3. Affected Areas

| Area | Files / Components | Expected Change |
|---|---|---|
| Canonical operating policy | `docs/operating-model/AGENT_OPERATING_MODEL.md` | Define safe-assumption conditions, fail-closed stop cases, and lifecycle-bounded state updates. |
| Tier 1 / cross-platform instructions | `docs/workflow/core-bootloader.md`, `AGENTS.md` | Add compact imperative pointers; preserve source-matrix paths and the 2,500-token bootloader budget. |
| Completion contract | `docs/workflow/handoff-contract.md`, `docs/templates/HANDOFF.md`, `docs/templates/WORK_ITEM.md` | Require `Done when`, `May proceed through`, `Must stop for`, and `Assumptions` in work-item and handoff artifacts. |
| Verification policy | `docs/workflow/quality-gates.md`, `docs/operating-model/AGENT_EVALUATION_CHECKLIST.md` | Map read-only, docs-only, code/config, and high-risk work to minimum evidence, preserving stricter gates. |
| Scenario contract tests | `test/issue-282-policy-contract.test.mjs`, `package.json` if test discovery needs registration | Cover permitted reversible assumptions, fail-closed boundaries, lifecycle-only state updates, and proportional evidence. |
| Project state | Issue #282 work item, `PROJECT_STATUS.md`, `TASK_LOG.md`, `DECISIONS.md` | Record lifecycle transitions and implementation handoff; avoid step-by-step log churn. |
| SHA / budget guards | `test/fixtures/context-pack-v1/required-source-matrix.json` only if re-pin reports drift | Re-pin changed boot sources through the repository script; do not edit hashes manually. |

## 4. Task Breakdown

| Task ID | Task | Owner | Files / Components | Verification |
|---|---|---|---|---|
| IMP-001 | Add policy and concise source pointers | Documentation Agent | Operating model, core bootloader, `AGENTS.md` | Focused policy contract tests; `npm run repin:source-matrix`; `npm run validate:context-budget` |
| IMP-002 | Add completion-contract fields to work-item and handoff artifacts | Documentation Agent | Handoff contract, `HANDOFF.md`, `WORK_ITEM.md` | Contract tests require all four fields and clear descriptions. |
| IMP-003 | Add proportional verification matrix and scenario coverage | Documentation Agent / QA Agent | Quality gates, evaluation checklist, focused test file | Focused scenario tests; all applicable repository validators. Independent Reviewer / QA checks AC coverage. |

Tasks are sequential because later contracts and scenario assertions depend on canonical policy wording. No task is parallelized.

## 5. Test Strategy

| Test Type | Required? | Scope | Owner |
|---|---|---|---|
| Focused contract/scenario tests | Yes | Positive and negative policy scenarios plus required evidence and completion fields | Developer / QA |
| Full unit suite | No, local | Unrelated runtime behavior is outside this documentation change; CI remains the full-suite gate. | CI / QA |
| Repository contract validators | Yes | `validate:contracts`, project state, skill usage, ADR audit | Documentation Agent |
| Boot source integrity / budget | Yes | Source-matrix re-pin and bootloader token budget | Documentation Agent |
| Security review | No separate review | No security controls are removed or weakened; security and human gates are asserted by contract tests and reviewed by QA. Escalate if implementation changes that boundary. | Reviewer / QA |

## 6. Verification Commands

```bash
node --test test/issue-282-policy-contract.test.mjs
npm run validate:contracts
npm run validate:project-state
npm run validate:skill-usage
npm run adr:audit
npm run repin:source-matrix
npm run validate:context-budget
git diff --check
```

Run the relevant source-matrix validation and focused contract tests after each 2–3 task checkpoint. Run all listed validators against the final candidate. CI's full test suite remains required before merge.

## 7. Rollback / Fallback Plan

| Scenario | Rollback / Fallback Action | Owner |
|---|---|---|
| Wording conflicts with existing gates | Revert the policy change and preserve the prior canonical gate; revise the SDD/ADR before retrying if the conflict requires a design change. | Documentation / SA |
| Source-matrix or token-budget validation fails | Correct through `repin:source-matrix` or shorten the bootloader pointer; never bypass the guard. | Documentation Agent |
| Scenario contract tests expose ambiguity | Stop at the affected case, clarify policy against the approved SDD, and route material semantic changes to Human Maintainer. | Orchestrator / Human Maintainer |

The change is documentation and test-only; reverting the isolated commit/PR restores the prior guidance. No runtime or production data is changed.

## 8. Risks / Blockers

| Risk / Blocker | Impact | Mitigation / Next Action |
|---|---|---|
| Broad pointer wording could duplicate canonical policy or expand boot context | Conflicting guidance or budget failure | Keep Tier 1/`AGENTS.md` as pointers and validate source matrix plus token budget. |
| “Low risk” may be read as permission to decide business meaning | Unauthorized policy or scope choice | Require every SDD condition; make uncertainty fail closed and test boundary scenarios. |
| State-update scope could suppress meaningful lifecycle traceability | Missing handoff state | Limit `PROJECT_STATUS.md` / `TASK_LOG.md` updates to lifecycle or work-item transitions, as Issue #282 requires. |

## 9. Handoff

| To | Reason | Required Evidence |
|---|---|---|
| Independent Reviewer / QA Agent | Verify policy against approved Issue #282 ACs and ensure no gate was weakened | Exact candidate SHA, focused scenario test output, validator output, changed-file summary, open risks |
| Human Maintainer | Final framework/meta approval before merge | Reviewer/QA result, acceptance traceability, readiness checks |
