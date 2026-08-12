# Implementation Plan

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | [Issue #166](https://github.com/chakrits/AI-Agent-Workflow/issues/166) |
| Change Type | Framework / Meta (`framework_meta`) |
| Risk Level | Medium |
| Owner | Orchestrator; implementation route starts with Documentation Agent |
| Target Branch / Ticket | Issue #166; branch only after detailed-specification approval |

## 2. Inputs Reviewed

| Artifact | Status | Notes |
|---|---|---|
| Issue #166 | Available | Authoritative approved direction, scope, AC, and task breakdown. |
| `docs/workflow/dispatch-packet-contract.md` | Available | Preserve the concise Packet v1 contract. |
| `docs/workflow/handoff-contract.md` | Available | Preserve terminal lifecycle handoff and receipt semantics. |
| `.codex/orchestrator-supervision.md` | Available | Codex native supervision is bounded and in-turn only. |
| `docs/contracts/bug-fix-workflow.yaml` | Available | Out of scope; its retry limit and state machine must remain unchanged. |
| `docs/contracts/new-feature-workflow.yaml` | Available | Lifecycle `max_rework_attempts: 1`; #166’s two-round rule is explicitly nested and must not alter this contract. |
| [Independent QA planning review](https://github.com/chakrits/AI-Agent-Workflow/issues/166#issuecomment-5263220187) | Available | Evidence-backed revision inputs accepted by Human Maintainer. |
| [Human planning decision](https://github.com/chakrits/AI-Agent-Workflow/issues/166#issuecomment-5263292765) | Available | Addressable approval of corrections only; not specification readiness. |
| `npm run validate:context-budget` | Available | 29,776 / 30,000 tokens; 224-token headroom is a hard design constraint. |
| Superpowers SDD prompts | Available | Conceptual reference only; no verbatim adoption. |

## 3. Affected Areas

| Area | Files / Components | Expected Change |
|---|---|---|
| Routing policy | `docs/workflow/dynamic-routing.md`, `docs/workflow/dispatch-packet-contract.md`, `docs/workflow/handoff-contract.md` | Define optional task-execution entry criteria, preflight, review semantics, and boundary to terminal handoff. |
| Roles | `docs/workflow/role-definitions.md` | Describe task-review/re-review as modes, not new canonical roles; preserve QA independence. |
| Host adapter | `.codex/orchestrator-supervision.md` | Make bounded-native waiting and unsupported cross-turn continuation explicit. |
| Templates | `docs/templates/` | Add concise Task Brief, Implementer Report, Task Review, and Re-review templates. |
| Catalog / skills | `docs/operating-model/SKILL_CATALOG.md`, `.agents/skills/dynamic-workflow/` | Route the execution mode without duplicating role responsibilities. |
| Tests / validators | `test/`, `scripts/` | Only if required to protect new normative rules or template availability. |
| Decision / attribution | `DECISIONS.md`, ADR record, `THIRD_PARTY_NOTICES.md` if required | Record exclusions/deferment and an explicit external-source notice decision. |
| Risk register | `RISKS.md` | Track the measured canonical-context headroom as an open implementation risk. |
| Lifecycle contracts | `docs/contracts/`, `docs/contracts/examples/` | Evidence-only, out of scope. No counter or contract change is authorized. |

## 4. Task Breakdown

| Task ID | Task | Agent / Owner | Files / Components | Verification |
|---|---|---|---|---|
| SUBAGENT-01 | Record ADR for the execution layer, nested-counter boundary, model-selection exclusion, bounded-native limitation, durable-async deferral, and third-party-notice decision. | Documentation Agent | `DECISIONS.md`, ADR record, `THIRD_PARTY_NOTICES.md` if required | `npm run adr:audit`; addressable source/license decision. |
| SUBAGENT-01A | Write detailed lightweight specification: entry/exit criteria, task-review threshold, nested `task_review_rework_count`, context-budget allocation/offset, and AC-07/08 gap analysis. | Documentation Agent | Canonical docs as evidence; specification record | Cross-document consistency review; human approval before `status:spec-ready`. |
| SUBAGENT-02 | Introduce concise task artifacts and wire their purpose into routing, role definitions, and skill catalog. Preserve `HANDOFF.md` for lifecycle transitions. | Documentation Agent | `docs/templates/`, `docs/workflow/`, `docs/operating-model/`, `.agents/skills/` | Link/template validation, context budget ≤ 30,000, and focused policy assertions. |
| SUBAGENT-03 | Add only justified automated regression coverage for normative behavior and templates. Start with a failing test when code behavior changes. | Developer Agent, conditional | `test/`, `scripts/` if needed | TDD evidence, focused tests, and full applicable validation suite. |
| SUBAGENT-04 | Independently assess every AC and verify the exact diff preserves dynamic routing, QA/security/human gates, Bug Fix precedence, New Feature lifecycle counters, and truthful adapter semantics. | QA Agent | Exact candidate diff and AC matrix | Independent commands, QA/review record, explicit PASS/FAIL/CANNOT_VERIFY evidence. |
| SUBAGENT-05 | Make merge decision; if merged, run normal documentation closeout. | Human Maintainer → Documentation Agent | Issue, PR, project-state records | Human approval, merged SHA, closeout checks. |

Dependencies: `SUBAGENT-01 → SUBAGENT-01A → SUBAGENT-02 → SUBAGENT-03 (if justified) → SUBAGENT-04 → SUBAGENT-05`. These steps are sequential because each changes shared workflow policy or evaluates its integrated outcome.

## 5. Test Strategy

| Test Type | Required? | Scope | Owner |
|---|---|---|---|
| Documentation / link validation | Yes | New templates and canonical cross-references | Documentation Agent |
| Focused contract tests | Yes when normative text has an existing machine-checkable seam | Lifecycle, template, or dispatch/receipt invariant affected | Developer Agent |
| Full unit suite | Yes before QA handoff if code/tests change | `npm test` | Developer Agent, independently QA Agent |
| Regression review | Yes | Existing Bug Fix/New Feature contracts, lifecycle labels, handoff requirements, receipt meaning | QA Agent |
| Security review | N/A by current scope | Re-classify if host capability, credentials, or access control design enters scope | Orchestrator |

## 6. Verification Commands

```bash
npm test
npm run validate:contracts
npm run validate:project-state
npm run validate:dispatch-receipts
npm run housekeeping:worktrees
npm run validate:skill-parity
npm run adr:audit
npm run validate:risk-register
npm run validate:skill-usage
npm run validate:metrics
npm run validate:review-gate
npm run validate:context-budget
git diff --check
```

Run only commands that exist at the candidate revision; record exact output and any N/A reason in the QA evidence. Add focused test commands when SUBAGENT-03 establishes the affected seam.

## 7. Rollback / Fallback Plan

| Scenario | Rollback / Fallback Action | Owner |
|---|---|---|
| New execution mode is unclear or duplicates terminal handoff | Keep current Packet v1 and `HANDOFF.md` behavior; do not merge the new mode. | Human Maintainer |
| Automated rule breaks legitimate workflows | Revert the new validator/test change; retain documentation-only clarification until a revised design is approved. | Developer Agent + Human Maintainer |
| Durable async requirement emerges | Stop this work item’s implementation path and open/route a separate architecture decision; do not simulate cross-turn continuation. | Orchestrator + Human Maintainer |

## 8. Risks / Blockers

| Risk / Blocker | Impact | Mitigation / Next Action |
|---|---|---|
| Canonical context has only 224 tokens headroom | CI failure or unreadable canonical set | Budget additions before writing; remove duplicate prose or use one-line pointers; do not raise `TARGET` in #166. |
| Risk-register validator does not recognize the current `PROJECT_STATUS.md` shape as active work (`Active work items: No`) | A passing validator is not evidence that this active work item has a tracked risk | Record R-001 manually in `RISKS.md`; do not rely on the validator for this work item’s active-work detection. Assess a separate bug/work item before changing that validator. |
| Task artifacts become a second handoff contract | Duplicate or conflicting evidence | State purpose and precedence explicitly; retain `HANDOFF.md` for owner/phase changes. |
| Two review rounds are confused with lifecycle rework | Accidental New Feature contract conflict | Use nested `task_review_rework_count`; verify lifecycle contracts are unchanged. |
| Extra review becomes universal ceremony | Slower low-risk work | Make entry risk-triggered; documentation/mechanical work remains optional. |
| Receipt state is mistaken for runtime completion | False completion claims | Add explicit mapping and negative assertions. |
| “No timeout” is interpreted as supported | Orchestration claims exceed host capability | Document bounded-native policy; defer durable async architecture. |
| External source is copied rather than adapted | Policy mismatch or licensing/process drift | Attribute sources, record the third-party-notice decision, and retain canonical documents as authority. |

## 9. Handoff

| To | Reason | Required Evidence |
|---|---|---|
| Documentation Agent | Record ADR, then produce the detailed specification and documentation-impact assessment. | Issue #166, this plan, approval comment, canonical workflow documents, source links, scope exclusions, and budget constraint. |
| Human Maintainer | Approve the specification before `status:spec-ready` and any implementation dispatch. | Reviewed specification, resolved open questions, exact proposed file list. |
| QA Agent | Independently review the implementation candidate after work is complete. | Pinned diff, AC matrix, test output, review/re-review artifacts. |
