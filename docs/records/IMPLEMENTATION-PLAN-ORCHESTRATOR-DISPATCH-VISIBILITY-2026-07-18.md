# Implementation Plan: Orchestrator Dispatch and Boss Visibility

## Metadata

| Field | Value |
|---|---|
| Work Item | GitHub Issue #33 |
| Approved inputs | Requirements and SDD at `3d1ea64`; Human acceptance: Issue comment `5011716865` |
| Change type | Medium-risk workflow/process contract enhancement |
| Delivery shape | One independently reviewable portable-contract Change Request |
| Required route | Developer → QA → Human review → Documentation closeout |

## Scope Boundary

This plan implements P0/P1 only: canonical rules, handoff template, supported adapters, and regression coverage. It must not introduce an event listener, webhook, queue, credential, secret, permission, GitHub App/ruleset change, automatic QA judgment, or human-gate bypass.

## Dependency Flow

```text
RED regression
  -> canonical handoff/receipt contract
  -> routing + quality-gate behavior
  -> platform/agent adapter parity
  -> full validation
  -> QA evidence on Draft PR
```

## Implementation Tasks

### IMP-33-01 — Add failing enforcement for terminal routing outcomes

**Owner:** Developer Agent
**Files:** `test/validate-contracts.test.mjs`

1. Add focused assertions that initially fail because the current contract lacks terminal `Next Action`, dispatch receipt state/result, and Boss-event fields.
2. Add negative assertions for a non-human next owner without a dispatch outcome and a terminal handoff without Boss-event requirements.
3. Add adapter-parity assertions for the canonical workflow, portable workflow, Claude Orchestrator adapter, and Antigravity adapter.

**Verification:** `node --test test/validate-contracts.test.mjs`

**Exit:** RED evidence is recorded; tests fail only for the intended missing contract.

### IMP-33-02 — Implement canonical terminal-handoff and receipt contract

**Owner:** Developer Agent
**Files:** `AGENTS.md`, `docs/workflow/handoff-contract.md`, `docs/workflow/dynamic-routing.md`, `docs/workflow/quality-gates.md`, `docs/workflow/role-definitions.md`, `docs/templates/HANDOFF.md`

1. Add one valid `Next Action` vocabulary and required `Next Owner` rule.
2. Add receipt fields and the state vocabulary: `pending`, `dispatched`, `acknowledged`, `completed`, `blocked`.
3. Require dispatch-or-block in the active Orchestrator turn, distinct acknowledgement evidence, and a Boss-visible terminal event.
4. Preserve existing lifecycle labels, Bug Fix retry contract, role separation, and human-gate stop conditions.

**Verification:** `node --test test/validate-contracts.test.mjs`, `npm run validate:contracts`

**Exit:** focused RED assertions pass; contract is internally consistent with the template.

### IMP-33-03 — Synchronize platform and agent adapters

**Owner:** Developer Agent
**Files:** `.agents/workflows/dynamic-workflow.md`, `.agents/skills/dynamic-workflow/SKILL.md`, `.agent/skills/dynamic-workflow/SKILL.md`, `.claude/agents/orchestrator-agent.md`

1. Make adapters direct users of the canonical contract, not independent policy sources.
2. Require actual receipt/outcome before an agent says a non-human handoff is routed.
3. Require an honest `acknowledgement pending` report where the platform cannot provide callback evidence.

**Verification:** `node --test test/validate-contracts.test.mjs`

**Exit:** adapter parity tests pass without GitHub-only terminology or execution claims.

### IMP-33-04 — Run integration checks and prepare QA handoff

**Owner:** Developer Agent
**Files:** scoped files above plus `PROJECT_STATUS.md`, `TASK_LOG.md` as needed

1. Run full repository checks and review the diff for scope/secrets.
2. Create a Draft PR linked to Issue #33 with explicit handoff/receipt evidence.
3. Apply `status:development-done` only after implementation and local verification are ready.
4. Provide QA with exact commit SHA and focus on `ORCH-01` through `ORCH-07`; Documentation Agent owns `ORCH-08` only after merge.

**Verification:** `npm test`, `npm run validate:contracts`, `npm run validate:project-state`, `git diff --check`

**Exit:** Draft PR is ready for independent QA; Developer does not self-certify the Issue matrix.

## Test Strategy

| Layer | Owner | Evidence |
|---|---|---|
| Contract regression | Developer | RED/GREEN focused Node tests for field/state/adapter violations |
| Full regression | Developer | `npm test`, contract validator, project-state validator, whitespace check |
| AC verification | QA | Exact Draft PR commit; every `ORCH-01`–`ORCH-07` row has evidence or justified N/A |
| Documentation closeout | Documentation Agent | `ORCH-08`, source PR marker, project-state/history/changelog evidence after merge |

## Risks and Rollback

| Risk | Mitigation / rollback |
|---|---|
| Contract becomes performative prose | Negative tests require a receipt/outcome and Boss-event content. |
| Adapter drift | One parity test reads canonical and supported adapters. |
| Contract implies unsupported background automation | State definition limits “same turn” to the active Orchestrator run; unsupported callback remains `acknowledgement pending`. |
| Scope expands into execution runtime | Stop and route to SA + Security + Human; revert the isolated contract PR if needed. |

## Handoff

| From | To | Condition |
|---|---|---|
| SA / Orchestrator | Developer Agent | This plan and Human specification acceptance are available. |
| Developer Agent | QA Agent | Draft PR, exact commit, complete handoff receipt, and local evidence are available. |
| QA Agent | Human Maintainer | All applicable Issue AC pass; QA evidence and PR checklist are synchronized. |
| Human Maintainer | Documentation Agent | Source PR merges to `main`; normal closeout signal is available. |
