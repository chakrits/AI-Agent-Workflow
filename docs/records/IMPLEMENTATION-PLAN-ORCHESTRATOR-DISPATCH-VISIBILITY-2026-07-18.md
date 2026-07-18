# Implementation Plan: Orchestrator Dispatch and Boss Visibility

## Metadata

| Field | Value |
|---|---|
| Work Item | GitHub Issue #33 |
| Approved inputs | Requirements and SDD at `3d1ea64`; P0/P1 Human acceptance: Issue comment `5011716865`; P0.5 design acceptance pending |
| Change type | Medium-risk workflow/process contract enhancement |
| Delivery shape | One independently reviewable portable-contract Change Request |
| Required route | Developer → QA → Human review → Documentation closeout |

## Scope Boundary

The original P0/P1 contract is implemented in PR #34 at `ef57d0e`. The P0.5 delta below remediates its observed runtime gap: Root can yield after a real dispatch while an asynchronous target later completes, leaving its terminal result unconsumed and Boss unnotified.

P0.5 implements a host-native, per-handoff temporary monitor/continuation contract and its regression evidence. It must not introduce an event listener, webhook, queue, credential, secret, permission, GitHub App/ruleset change, automatic QA judgment, repository automation, automatic merge, or human-gate bypass.

## Dependency Flow

```text
P0/P1 contract in PR #34
  -> P0.5 RED end-to-end monitor scenarios
  -> canonical monitor / consumption contract
  -> host adapter and template parity
  -> full validation
  -> Security scope review (monitor boundary)
  -> QA recheck of amended ORCH-04 + P0.5 scenarios
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

## P0.5 Implementation Delta — requires Human design acceptance before Developer starts

### IMP-33-05 — Add RED supervision and idempotency scenarios

**Owner:** Developer Agent
**Files:** `test/validate-contracts.test.mjs` and the existing host/orchestrator test seam identified during implementation

1. Add a RED acceptance scenario that records a dispatch, Root yield, target terminal result, Root wake-up, exactly-once terminal consumption, Boss event without a new user message, and monitor cancellation.
2. Add negative scenarios for missing monitor registration before Root yield, `monitor_unavailable`, bounded expiry, and duplicate/late terminal notifications.
3. Keep these tests host-capability-aware: if the repository has no executable host seam, create a deterministic contract/adapter test and document the required live-host QA proof rather than simulating an unsupported autonomous service.

**Verification:** focused Node test command; retain RED output in the Developer handoff.

**Exit:** tests fail only because monitor identity, terminal consumption, and lifecycle evidence are absent.

### IMP-33-06 — Implement portable P0.5 monitor/consumption contract

**Owner:** Developer Agent
**Files:** `AGENTS.md`, `docs/workflow/handoff-contract.md`, `docs/workflow/dynamic-routing.md`, `docs/workflow/quality-gates.md`, `docs/workflow/role-definitions.md`, `docs/templates/HANDOFF.md`

1. Add stable `Handoff Event ID`, `Monitor ID`, owner/target/state, terminal-result ID, terminal-consumption evidence, and expiry/cancellation fields.
2. Require monitor registration after a successful asynchronous target invocation and before Root yields.
3. Require Root continuation to consume a terminal result exactly once, emit Boss event, choose the next permitted route/human/blocked outcome, and cancel the monitor.
4. Define `monitor_unavailable`, `monitor_failed`, and `monitor_expired` as explicit blocked outcomes; do not silently fall back to a prose dispatch.
5. Preserve distinct target acknowledgement and Root-consumed completion semantics.

**Verification:** focused Node contract tests and `npm run validate:contracts`.

**Exit:** P0.5 contract passes RED scenarios without adding repository execution infrastructure.

### IMP-33-07 — Synchronize Codex-host adapter and portable fallback

**Owner:** Developer Agent
**Files:** `.agents/workflows/dynamic-workflow.md`, `.agents/skills/dynamic-workflow/SKILL.md`, `.agent/skills/dynamic-workflow/SKILL.md`, `.claude/agents/orchestrator-agent.md`, and a Codex-facing adapter/document if one exists in the repository

1. State that only a host with a temporary task/thread monitor plus Root wake-up may claim P0.5 supervised completion.
2. Make the monitor identity and consumption proof mandatory in the host adapter; other adapters must honestly use `monitor_unavailable` until their host supplies equivalent primitives.
3. Prohibit monitor authority to merge, approve, alter GitHub/GitLab, judge QA, or bypass human gates.

**Verification:** parity regression confirms the same vocabulary and no GitHub/GitLab automation claim.

**Exit:** host-specific capability is explicit; portable policy does not over-promise.

### IMP-33-08 — Security scope check, live-host proof, and QA recheck

**Owner:** Developer Agent → Security Reviewer → QA Agent
**Files:** scoped contract/adapter/tests, `PROJECT_STATUS.md`, `TASK_LOG.md`, and Draft PR #34 handoff evidence

1. Developer runs full validation and provides exact commit plus a monitor registration/terminal-consumption/cancellation transcript.
2. Security Reviewer confirms no secret, permission, webhook, queue, persistent worker, repository mutation, untrusted-content execution, or human-gate bypass was introduced.
3. QA rechecks the original AC matrix, treating old ORCH-04 PASS as superseded. QA verifies the end-to-end no-new-user-message scenario and the negative/idempotency cases before returning to `phase:human-review`.
4. Developer/QA synchronise PR fields, evidence comment, and lifecycle status only after the amended evidence is complete.

**Verification:** `npm test`, `npm run validate:contracts`, `npm run validate:project-state`, `git diff --check`, scoped security review, and host-native E2E proof.

**Exit:** PR #34 returns to Human review only with P0.5 evidence. Documentation Agent retains ORCH-08 after merge.

## Test Strategy

| Layer | Owner | Evidence |
|---|---|---|
| Contract regression | Developer | RED/GREEN focused Node tests for field/state/adapter violations |
| Supervision regression | Developer | Root-yield / terminal-wake / exactly-once-consumption / cancellation and negative monitor tests |
| Full regression | Developer | `npm test`, contract validator, project-state validator, whitespace check |
| Security scope review | Security Reviewer | Exact P0.5 diff confirms no execution-plane, credential, permission, or human-gate change |
| AC verification | QA | Exact Draft PR commit; recheck `ORCH-01`–`ORCH-07`, especially amended ORCH-04 end-to-end proof |
| Documentation closeout | Documentation Agent | `ORCH-08`, source PR marker, project-state/history/changelog evidence after merge |

## Risks and Rollback

| Risk | Mitigation / rollback |
|---|---|
| Contract becomes performative prose | Negative tests require a receipt/outcome and Boss-event content. |
| Adapter drift | One parity test reads canonical and supported adapters. |
| Contract implies unsupported background automation | State definition limits “same turn” to the active Orchestrator run; unsupported callback remains `acknowledgement pending`. |
| Root yields and target completion is never consumed | P0.5 requires receipt-scoped monitor registration before yield, Root wake-up, terminal-consumption evidence, one Boss event, and cancellation proof. |
| Duplicate wake-up dispatches twice or spams Boss | Stable handoff/result consumption key makes the first consumption authoritative; duplicates are no-op evidence. |
| Monitor persists or becomes hidden infrastructure | Monitor is per-handoff, bounded, cancelled after consumption, and cannot use repository events, credentials, queues, or background workers. |
| Scope expands into execution runtime | Stop and route to SA + Security + Human; revert the isolated contract PR if needed. |

## Handoff

| From | To | Condition |
|---|---|---|
| SA / Orchestrator | Developer Agent | This plan and Human specification acceptance are available. |
| Developer Agent | QA Agent | Draft PR, exact commit, complete handoff receipt, and local evidence are available. |
| SA Agent | Human Maintainer | P0.5 amended SDD and this delta need design acceptance before IMP-33-05..08 begin. |
| Developer Agent | Security Reviewer | P0.5 implementation is complete; review exact diff for execution-plane/security-boundary regressions. |
| Security Reviewer | QA Agent | No blocking scope/security finding; exact review evidence is available. |
| QA Agent | Human Maintainer | All applicable Issue AC pass; QA evidence and PR checklist are synchronized. |
| Human Maintainer | Documentation Agent | Source PR merges to `main`; normal closeout signal is available. |
