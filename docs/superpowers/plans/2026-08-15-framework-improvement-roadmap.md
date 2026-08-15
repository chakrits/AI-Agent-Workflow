# AI-Agent-Workflow Framework Improvement Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Each implementation task must be independently verified before the next task starts.

**Goal:** Improve the framework from a strong policy-and-validation toolkit into an evidence-backed, context-efficient, host-neutral workflow layer without changing authority, lifecycle contracts, or dispatch semantics prematurely.

**Architecture:** Keep `docs/workflow/` as the normative policy source, keep `.agents/`, `.claude/`, and `.agent/` as platform adapters, and add small machine-readable evidence seams around context loading, status projection, routing decisions, and dispatch outcomes. Progressive context and worktree-scoped status remain shadow-only until compatibility and rollback gates pass. Runtime invocation remains owned by host adapters; this repository must not pretend to be a persistent orchestration runtime.

**Tech Stack:** Markdown/YAML/JSON contracts, Node.js 22 ESM validators and tests, GitHub Actions/GitLab CI checks, Git worktrees, and host-provided agent invocation/wait primitives.

## Global Constraints

- Preserve the existing lifecycle contracts in `docs/contracts/`; no retry-budget changes are included.
- Preserve human approval gates; no authority switch, release, or durable asynchronous orchestration is authorized by this plan.
- Keep `docs/records/qa/` intact; it is historical evidence and is not a migration target.
- Treat `docs/workflow/` as normative policy and platform-specific files as adapters.
- Keep progressive context and worktree-scoped status non-mutating until a later Human authority decision.
- Do not raise the 30,000-token canonical-context target to make a check pass.
- Use exact commit ranges and structured evidence; acknowledgement or receipt consumption never substitutes for terminal execution evidence.
- Treat operator-requested no-timeout waiting as a wait-policy value for measurement; it does not remove canonical `timed_out` or `host_completion_unavailable` outcomes.
- Use `implementation-planning`, `tdd-implementation` for behavior changes, `code-review-gate`, and independent QA verification at each implementation increment.
- This is an umbrella roadmap; each implementation increment must become its own bounded Issue/PR.

## 1. Current Baseline and Problem Statement

The repository currently provides:

- dynamic routing policy and eleven role definitions;
- Packet v1 and a durable dispatch-receipt schema/validator;
- 38 mirrored skills with passing parity across `.agents/`, `.claude/`, and `.agent/`;
- 16 npm validators and 414 passing tests;
- a current observed context budget of 29,937/30,000 approximate tokens, leaving 63 tokens of headroom, bound to the 2026-08-15 observation at commit `5d70f6e`; the older 25,910/30,000 document snapshot is historical;
- a bounded `context-compatibility/v1` seam from Issue #132;
- a bounded status parser/loader/JCS/CAS foundation from Issue #133;
- a Codex-specific in-turn supervision contract, but no repository-owned child-agent runtime, queue, webhook, persistent worker, or parent-resume mechanism.

The improvement work targets four measurable gaps:

1. Context is nearly at the hard budget and current loading guidance is broader than role-specific work requires.
2. Dispatch contracts and receipt validation are stronger than the runtime evidence available from host platforms.
3. Metrics are primarily derived from `TASK_LOG.md` text and are informational rather than authoritative event telemetry.
4. `PROJECT_STATUS.md` and validators do not reconcile the current work item against live GitHub state or the actual open queue.

## 2. Scope and Non-Goals

### In scope

- A baseline event/evidence model for routing, context loading, status shadowing, and dispatch outcomes.
- Progressive context loading as a shadow compatibility experiment built on Issue #132.
- Worktree-scoped status as a shadow compatibility experiment built on Issue #133.
- A small host-adapter capability contract for Codex, Claude, and Gemini integrations.
- Reconciliation validators for project state, open Issues, PR closeout state, and orphan records.
- Replacement or augmentation of keyword-only framework metrics with structured evidence.
- Canonical-source consolidation and adapter parity checks after evidence proves which content is duplicated.

### Out of scope

- Changing lifecycle workflow YAML, Bug Fix retry limits, or `task_review_rework_count`.
- Activating a new authority for context or status.
- Consumer migration of the target application before shadow evidence is accepted.
- Production deployment, release approval, or automatic merge.
- Durable cross-turn orchestration; that remains a separately approved Issue #35 design.
- Adding roles or skills without a measured routing/coverage gap.

## 3. Dependency Graph

```text
IMP-001 Evidence schema and baseline
  ├── IMP-002 Context shadow experiment (#132)
  ├── IMP-003 Status shadow experiment (#133)
  ├── IMP-004 Host-adapter capability contract
  └── IMP-005 Project-state reconciliation and structured metrics
        └── IMP-006 Canonical-source consolidation and adapter parity
```

`IMP-002` and `IMP-003` may be planned in parallel after `IMP-001`, but their implementation and authority decisions remain separate. `IMP-004` may be designed in parallel, but runtime claims must not be made until a host supplies evidence.

## 4. Task Breakdown

### IMP-001: Freeze the evidence model and measurement baseline

**Owner:** Orchestrator + SA Agent
**Risk:** Medium
**Files / artifacts:**

- Create the implementation-plan/measurement record under `docs/records/implementation-plan/`; keep it Draft until SA re-review and Human approval.
- Add or extend a structured evidence schema under `docs/contracts/schemas/` only if the existing dispatch schema cannot represent the fields.
- Extend `docs/operating-model/METRICS.md` with definitions, denominators, source-of-truth rules, and approval status.
- Update `RISKS.md` with context headroom, host completion, metric authority, and state-reconciliation risks.

**Required measurements:** route/change type/risk/skipped roles; context mode/source manifest/tokens/fallback and measurement availability; dispatch attempt/acknowledgement/terminal result/wait policy/timeout/cancellation/consumption/duplicate result; rework/human intervention/final outcome/rollback result; source, owner, denominator, retention, and explicit `N/A` rule for every metric.

**Verification:** `npm test`, `npm run validate:contracts`, `npm run validate:risk-register`, `npm run validate:metrics`, `npm run validate:context-budget`, `git diff --check`, plus independent SA re-review of the Draft measurement record.

**Exit gate:** The Draft record defines the source-of-truth boundary, one minimal evidence envelope, baseline observation protocol, metric owner/source/denominator/retention/`N/A` rules, risk coverage, and non-goals. SA re-review finds no unresolved Major/High design gap, and the Human Maintainer approves the specification. No threshold is a pass/fail gate until that approval.

### IMP-002: Run progressive context loading as a shadow-only experiment

**Owner:** Developer Agent + QA Agent
**Risk:** Medium
**Dependency:** IMP-001; Issue #132 `context-compatibility/v1` foundation and approved measurement plan.

**Files / components:** Only the context compatibility seam, progressive-loader adapter, fixtures, tests, and measurement record named by the approved #132 slice. Do not modify lifecycle contracts, dispatch semantics, authority fields, or legacy-loader behavior.

**Implementation steps:**

1. Freeze the existing 36 normalized fixture pairs as the semantic compatibility corpus.
2. Add host-specific measurement adapters that report native input tokens where available and record `N/A` with a reason where unavailable.
3. Run full and progressive paths against identical paired inputs; compare normalized result digests while excluding diagnostic token fields only.
4. Record fallback rate, reduction distribution, unsupported-host results, and every semantic mismatch.
5. Rehearse rollback by disabling the progressive path and re-running the legacy path with the same inputs.

**Verification:** focused compatibility tests; all 36 fixture scenarios; `npm test`; `validate:project-state`; `validate:contracts`; `validate:context-budget`; host matrix evidence; independent QA on the exact base/head range.

**Proposed Go criteria, subject to Human approval:** 36/36 semantic equivalence per supported host, at least 36 valid paired measurements per host, median reduction ≥50%, 5th-percentile reduction ≥40%, measured fallback denominator, zero unexplained critical mismatch, and successful rollback rehearsal. Fewer than 10 qualifying live items by the agreed observation checkpoint is `BLOCKED`.

### IMP-003: Run worktree-scoped status as a read-only shadow experiment

**Owner:** Developer Agent + QA Agent
**Risk:** High
**Dependency:** IMP-001; Issue #133 status loader/schema/JCS/CAS foundation.

**Files / components:** Only the status-loader projection/shadow adapter, normalized comparison, fixtures, runtime matrix tests, consumer inventory, and rollback evidence named by the approved #133 slice. Legacy status reads remain authoritative and increment-2 modes remain deferred.

**Implementation steps:**

1. Freeze the status fixture corpus and archive/shard/projection/rollback boundaries.
2. Complete the repository-derived consumer inventory and classify every consumer as legacy-only, shadow-capable, or migration-blocked.
3. Run legacy and shadow reads against the same worktree state and record normalized differences plus projection digest evidence.
4. Test stale projection, missing shard, archive closure, branch/worktree isolation, and rollback to legacy reads.
5. Stop on any unexplained semantic or lineage mismatch; never repair by weakening the comparator.

**Verification:** focused status/runtime tests; full regression; authorized Node/Python runtime evidence; `validate:contracts`; `validate:project-state`; `validate:dispatch-receipts`; independent QA and explicit rollback result.

**Exit gate:** No authority switch, writer activation, consumer migration, release, or final Go decision is permitted from this task alone.

### IMP-004: Define a host-neutral dispatch capability contract

**Owner:** SA Agent + Orchestrator
**Risk:** High
**Dependency:** IMP-001; no runtime implementation is authorized by the design task.

**Files / artifacts:**

- Add a small capability matrix under `docs/workflow/` or `docs/contracts/`.
- Add adapter conformance fixtures under `test/fixtures/` for contract semantics, not pretend host invocation.
- Update `.codex/orchestrator-supervision.md` only when approved wording remains Codex-specific where required.
- Add Claude/Gemini integration notes only when their host capabilities are verified.

**Required interface semantics:**

```text
dispatch(packet) -> dispatch_id
await(dispatch_id, deadline) -> terminal_result | timed_out | cancelled | host_completion_unavailable
consume(dispatch_id, terminal_result_id) -> exactly_once
```

The contract must preserve the distinction between runtime dispatch control and the durable receipt ledger. It must not imply parent resume after a yielded turn.

**Verification:** fixtures for acknowledgement without completion, receipt consumption without execution proof, timeout, cancellation, duplicate result, stale result, and unsupported capability; `npm test`; `npm run validate:dispatch-receipts`; `npm run validate:contracts`; security review if credentials or hosted mutation are introduced.

**Exit gate:** A platform is marked supported only with host-specific evidence for child invocation, bounded wait, terminal result, cancellation/timeout, and exact-once consumption.

### IMP-005: Reconcile project state and replace keyword-only health signals

**Owner:** Developer Agent + Documentation Agent + QA Agent
**Risk:** Medium
**Dependency:** IMP-001; may run in parallel with IMP-002/003 after evidence fields are frozen.

**Files / components:**

- Extend `scripts/validate-project-state.mjs` to validate the current `PROJECT_STATUS.md` structure.
- Extend `scripts/validate-risk-register.mjs` to understand the current status format.
- Add a read-only GitHub reconciliation module/test seam; fail closed on unavailable API data and never mutate GitHub.
- Extend `scripts/validate-metrics.mjs` to consume structured evidence while retaining a historical `TASK_LOG.md` compatibility parser.
- Add tests for closed current Issue, open-queue mismatch, orphan record, stale PR closeout, missing denominator, and unavailable hosted evidence.

**Verification:** targeted unit tests; `npm test`; all CI validators in `.github/workflows/validate-contracts.yml`; live read-only reconciliation with network credentials; `git diff --check`.

**Exit gate:** A passing validator means state is parseable and reconciled, not merely that an old marker pattern is absent.

### IMP-006: Consolidate canonical sources and add adapter conformance checks

**Owner:** Documentation Agent + Orchestrator
**Risk:** Medium
**Dependency:** IMP-002 through IMP-005 evidence; do not start by deleting prose.

**Files / components:** Refactor `AGENTS.md`, `docs/workflow/role-definitions.md`, `dynamic-routing.md`, `handoff-contract.md`, and `SKILL_CATALOG.md` only after a source-ownership map is approved. Keep `docs/workflow/` normative; make bootstrap/adapters short pointers; add conformance checks for role/workflow adapters; add a role-scoped context manifest.

**Verification:** compatibility corpus unchanged; `npm run validate:context-budget` with an agreed reserve; `npm run validate:skill-parity`; adapter conformance tests; full `npm test`; independent QA confirms human gates and negative-scope rules remain.

**Exit gate:** Every moved rule has one normative owner and a passing pointer/conformance test. No source is deleted solely to reduce token count.

## 5. Test Strategy

| Test Type | Required | Scope | Owner |
|---|---|---|---|
| Unit / contract | Yes | Evidence schema, compatibility comparison, state reconciliation | Developer Agent |
| Regression | Yes | Existing 414-test suite plus validators | QA Agent |
| Shadow compatibility | Yes | 36 context fixtures and frozen status corpus | QA Agent |
| Runtime matrix | Yes for claimed host support | Host-native tokens and dispatch capability evidence | QA Agent / host owner |
| Mutation testing | Conditional | Non-trivial production decision logic | QA Agent |
| Security review | Conditional | Credentials, GitHub mutation, hosted writer, external anchor | Security Reviewer |
| E2E/UI | No | This repository has no target application UI | N/A |

## 6. Verification Commands

```bash
npm test
npm run validate:contracts
npm run validate:project-state
npm run validate:dispatch-receipts
npm run validate:skill-parity
npm run validate:skill-usage
npm run validate:review-gate
npm run validate:clearable-refs
npm run validate:risk-register
npm run validate:metrics
npm run validate:context-budget
npm run adr:audit
git diff --check
```

For any PR changing `.mjs`/`.js`, run the review gate against the actual merge-base range and add a new `docs/records/qa/*-code-review.md` record in the same diff. For dispatch changes, run receipt validation with live terminal-evidence checks where a receipt uses a GitHub comment URL.

## 7. Rollback / Fallback Plan

| Scenario | Action | Owner |
|---|---|---|
| Context shadow mismatch | Keep legacy context authoritative; disable progressive path; preserve evidence | Human Maintainer / Orchestrator |
| Status shadow mismatch | Keep legacy status authoritative; discard projection proposal; reconcile stale shards | Human Maintainer / SA Agent |
| Host lacks bounded completion | Record `host_completion_unavailable`; stop in active turn; do not claim continuation | Orchestrator |
| Metric source unavailable | Report `N/A — evidence unavailable`; do not infer pass | QA Agent |
| Project state cannot reconcile | Block readiness decision; keep state unchanged until recheck succeeds | Documentation Agent / Human |
| Context budget exceeds target | Split/remove duplicated normative prose; do not raise target without ADR | Documentation Agent / SA Agent |

## 8. Go / No-Go Checkpoints

### Checkpoint A — before implementation

- Human approves umbrella scope and metric definitions.
- #132/#133 remain explicitly limited to shadow migration.
- No authority switch or runtime support claim is included.

### Checkpoint B — after each shadow increment

- Focused and full tests pass.
- Every AC has exact commit evidence or justified `N/A`.
- No unexplained semantic mismatch exists.
- Rollback rehearsal passes.
- Independent QA returns `PASS`, otherwise stop for rework/human decision.

### Checkpoint C — before authority switch

- Human approval is recorded at an addressable URL.
- Approved host-matrix thresholds are met.
- Fallback/rollback evidence is fresh.
- Consumer inventory is complete.
- No Critical/High finding or host-completion blocker remains.

## 9. Risks / Blockers

| Risk | Impact | Mitigation |
|---|---|---|
| Canonical context has 63-token headroom | Small edits can fail CI or force rushed deletion | Measure first; then source ownership and role-scoped loading |
| Host completion times out | Parent cannot honestly complete dispatch in-turn | Capability matrix and explicit terminal outcomes |
| Shadow comparison misses a critical field | Migration appears compatible while changing behavior | Frozen normalized schema, digest validation, mutation fixtures, independent QA |
| Metrics are incomplete or keyword-derived | False Go/No-Go decisions | Structured evidence with denominators and N/A |
| Project state drifts from GitHub | Wrong owner or stale readiness claim | Read-only reconciliation validator |
| More process increases delivery cost | Framework becomes ceremony-heavy | Risk-triggered mode, skip rules, measure manual effort and cycle time |
| Cross-platform claims exceed evidence | Hosts behave differently in real use | Mark support Unknown until native evidence exists |

## 10. Handoff and Next Action

**Current status:** Draft plan only. No implementation, authority switch, runtime activation, label change, or PR creation is authorized by this document.

**Recommended next action:** Human review of this roadmap and approval of `IMP-001` only. After approval, open one umbrella Issue plus separate bounded Issues for `IMP-001` through `IMP-005`; keep `IMP-006` deferred until shadow evidence exists.

**First route:** Orchestrator → SA Agent for evidence-model/measurement review → Human approval → Documentation/Developer implementation → independent QA.

**Required handoff evidence:** approved scope comment, plan commit SHA, affected-file list, metric definitions, explicit non-goals, and the first checkpoint decision.

**No automatic continuation:** If the host cannot provide the required terminal result, record `host_completion_unavailable` and stop; do not consume stale partial output.

## 11. Plan Self-Review

- All six tasks have bounded owners, components, tests, and exit gates.
- Context migration and status migration have independent rollback paths.
- Runtime support is a capability contract, not an assumption from documentation parity.
- Existing lifecycle contracts and human gates are protected.
- Current metrics are not claimed to be authoritative; metric authority is a deliverable.
- Unresolved choices are named as Human approval checkpoints.
