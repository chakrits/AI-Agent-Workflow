# Task Brief

| Field | Value |
|---|---|
| Work Item / Task ID | Issue #303 / IMP-303-03 |
| Objective | Make the independently reviewed IMP-303-02 production-seam regressions Green with the approved v5 contract/schema and workflow behavior. |
| Base SHA | `b6cdcd7ba4b18529a7d9e042f0c213281d3aa5b6` |
| Dependencies | Frozen RED patch SHA256 `32c3524e8974cda04f3ad2e2ffb4bf1823970e3ec7b06d8ebd78d5df87917850` over `d28ac8cc44170dab0bfa95ddc85751c7c3cce09c`; [RED report](../implementation/2026-11-05-issue-303-contract-red-report.md). Independent RED test-artifact consultation is required before dispatch; formal task_review occurs on integrated Green with real Git base/head. No failing RED-only commit is created. |
| Required reviewer mode | Distinct QA `task_review` plus static-logic-review; separate bounded Security and Code Review Gate for integrated Slice 1; task_review_rework_count starts at 0. |
| Human decision evidence (addressable URL) | [Published direct-chat approval and superseding execution authority](https://github.com/chakrits/AI-Agent-Workflow/blob/d28ac8cc44170dab0bfa95ddc85751c7c3cce09c/docs/records/approvals/2026-11-05-issue-303-plan-v5-human-approval.md). Actual spec-ready and phase:development verified. This is an approval evidence record, not a fabricated GitHub approval event. |
| Implementation owner | Developer `/root/issue303_orchestrator/contracts_red`, resumed only after distinct RED test-artifact consultation. |

## Allowed Scope

- Write set: `scripts/validate-contracts.mjs`, `docs/contracts/schemas/new-feature-state.schema.json`, `docs/contracts/new-feature-workflow.yaml`, `docs/workflows/new-feature.md`; new `docs/records/implementation/2026-11-05-issue-303-contract-green-report.md`.
- Frozen test artifact is a dependency. Any needed test correction requires an explicit evidence-backed explanation to Orchestrator; do not weaken assertions or silently alter the reviewed patch.
- Out of scope: metrics, routing/ADR/changelog, templates, other contracts, commits/pushes/labels, child dispatches and self-approval. Preserve shared-tree review/coordination records.

## Sources and Acceptance Criteria

| Source / AC | Required outcome |
|---|---|
| [Plan v5 §4 IMP-303-03](../implementation-plan/2026-11-05-issue-303-ai-native-sdlc-plan-v5.md#4-detailed-task-breakdown) | Exact Green write set and production validator/schema integration. |
| [Spec v5 §4.1 and §6.2](../sdd/2026-11-05-issue-303-rebuttal-and-executive-spec-v5.md) including retained v4 contracts | TC-001–TC-003E4: fail-closed parity, impact exits, causal prefix/episode branch selection, historical classification snapshots, mandatory design remediation, sunset hold and chronological cutoff. Preserve generic contract behavior and all10 examples. |
| [Initial task review](../qa/2026-11-05-issue-303-initial-task-review.md) | Independent bounded RED artifact consultation precedes Green. A patch digest is not a Git head and is not claimed as a canonical task_review. Integrated Green requires formal task_review pinned to actual commits. |

## Verification and Stop Condition

- Run `node --test test/validate-contracts.test.mjs` and `node scripts/validate-contracts.mjs`: both exit0 expected. Also run affected `test/validate-metrics.test.mjs` to check reader compatibility; report actual counts.
- `git diff --check`: exit0. Record exact baseline, changed paths, actual commands/output, and no unsupported CI/security/QA claim in Implementer Report.
- Run Green only after Orchestrator confirms independent RED artifact consultation. Stop for genuine design/source conflict, unexpected unrelated failure, or overlapping ownership; route Orchestrator/SA. No repeated approval of unchanged v5.
- Rollback: preserve compatible history reader after adoption; follow plan §7 two-regime runbook. Do not rewrite persisted history.
