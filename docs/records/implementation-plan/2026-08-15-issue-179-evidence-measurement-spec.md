# Draft Measurement Specification: Issue #179 / IMP-001

> Status: **Draft — pending SA re-review and Human Maintainer approval**

## Purpose

Define the smallest evidence and measurement boundary needed before the framework can run the context, status, host-dispatch, and structured-metrics improvement workstreams. This document is a specification and review artifact; it does not activate a new runtime authority or change lifecycle state machines.

## Source-of-truth boundary

| Concern | Authoritative source | What it proves | What it does not prove |
|---|---|---|---|
| Workflow policy | `docs/workflow/` and `docs/contracts/` | Normative roles, states, gates, and transitions | That a host executed a task |
| Host telemetry | Host/orchestrator event evidence | Native invocation, acknowledgement, terminal, cancellation, or unavailable capability when supplied | Acceptance or QA quality by itself |
| Durable dispatch receipt | `docs/records/dispatch-receipts/` and its schema | Internal receipt and exactly-once consumption paper trail | Runtime-attested execution or named-agent identity |
| Metrics | Structured evidence projection defined by `METRICS.md` | Reproducible measurements and denominators | Lifecycle authority or approval |
| Historical compatibility | `TASK_LOG.md` keyword-derived projection | Historical trend only | Current authoritative event counts |
| Context baseline | Validator output tied to commit, timestamp, command, and manifest | The measured canonical reading set at that observation | Exact model-specific token usage |

## Minimum evidence envelope v1

IMP-001 defines the envelope conceptually first. A JSON schema or runtime writer is deferred until SA confirms that the existing receipt/reference seams cannot carry the required references.

Every evidence record must provide:

- `schema_version`, `work_item_id`, `run_id`, `event_id`, and `event_type`;
- `observed_at`, `source`, and `authority`;
- a correlation reference to the relevant `handoff_event_id`, `terminal_result_id`, `pair_id`, or `measurement_id` when applicable;
- a result/status or digest reference;
- an explicit reason for fallback, cancellation, unavailable evidence, mismatch, or `N/A`;
- an addressable evidence reference and a recorded-by identity.

The envelope is append-only evidence. It must not duplicate lifecycle labels, receipt lifecycle states, or replace the existing human approval gates.

### Shadow compatibility fields

Context and status shadow observations use one paired-input correlation shape:

```text
pair_id
input_digest
source_manifest_digest
authority = legacy
legacy_result_digest
candidate_result_digest
comparison_result = match | mismatch | inconclusive
fallback_used
fallback_reason
rollback_result
```

Token fields are diagnostic evidence only. When a host cannot provide native token counts, the value is `N/A` with a reason; it is not silently treated as zero.

### Dispatch and wait-policy fields

Dispatch evidence retains the existing distinction between runtime control and the durable receipt ledger. It records attempt, acknowledgement, terminal result, consumption, duplicate/late delivery, cancellation, and host-unavailable outcomes by event type or referenced evidence.

The orchestrator may request an operator-wait/no-timeout mode. That preference does not remove the canonical `timed_out` or `host_completion_unavailable` states. Metrics must record `wait_policy` so timeout rate only uses dispatches with an actual configured deadline; operator-wait and unsupported callback cases are reported separately or as explicit `N/A`.

## Metric definition rules

Each IMP-001 metric must identify owner, event source, numerator, denominator, `N/A` rule, retention, and approval status. The initial registry is intentionally small:

| Metric | Owner | Event source | Denominator | `N/A` rule | Retention | Status |
|---|---|---|---|---|---|---|
| Route decision coverage | Orchestrator | `route_selected` evidence | Classified work items | `N/A` only when classification is not required | Work-item lifetime + closeout | Draft |
| Skipped-role reason completeness | Orchestrator | `role_skipped` evidence | Skipped-role decisions | `N/A` when no role was skipped | Work-item lifetime + closeout | Draft |
| Context source-manifest coverage | Context loader/host | `context_loaded` evidence | Context load runs | Unsupported host loader is `N/A` with reason | Work-item lifetime + measurement record | Draft |
| Native token measurement availability | Host adapter | Context token evidence | Context load runs with token request | Unsupported native token signal is `N/A` | Measurement record | Draft |
| Dispatch terminal-evidence rate | Orchestrator/host adapter | Dispatch attempt and terminal evidence | Dispatches with an invocation attempt | No invocation attempt is excluded, not counted as failure | Work-item lifetime + closeout | Draft |
| Exact-once consumption compliance | Orchestrator | Receipt and consumption events | Terminal results delivered | No terminal result is `N/A`, not consumed | Receipt retention policy | Draft |
| Shadow semantic equivalence | Experiment owner | Paired legacy/candidate evidence | Paired runs with both comparable outputs | Missing candidate or legacy output is `inconclusive` | Experiment record | Draft |
| Shadow fallback rate | Experiment owner | Fallback evidence | Shadow attempts | No shadow attempt is excluded | Experiment record | Draft |
| Rollback success | Developer/QA | Rollback evidence | Rollback rehearsals | No rollback rehearsal is `N/A` | Experiment record | Draft |
| Human intervention and outcome | Orchestrator | Human decision/outcome evidence | Work items requiring a decision | No intervention is zero, not `N/A` | Work-item lifetime + closeout | Draft |

Retention means at least through work-item closeout and the linked measurement record. Any platform-specific event-retention period remains a Human Maintainer decision and must not be invented by an adapter.

## Baseline protocol

The current observed context baseline is the output of:

```bash
npm run validate:context-budget
```

Observed in the current repository state: `29,937 / 30,000` approximate tokens, status PASS. The `25,910 / 30,000` value in `docs/operating-model/CONTEXT_BUDGET.md` is retained as an older dated snapshot until the Human-approved reconciliation updates that document. The measurement record must include observation timestamp, commit SHA, command, canonical file list, character/token approximation, and result.

The current `npm run validate:metrics` output is also an observed projection, not an authoritative baseline: 25 work items, 4% keyword-derived timeout rate, 4% keyword-derived rework rate, and 38 skills. The older `METRICS.md` table remains historical until this specification is approved.

## Risk mapping proposal

- Re-scope existing R-001 to framework-wide canonical-context headroom, with trigger and escalation when the validator approaches or exceeds target.
- Re-scope existing R-002 to host completion evidence, with escalation when a required terminal result cannot be delivered in-turn.
- Add one metric-authority risk covering keyword-derived counts being mistaken for telemetry.
- Add one project-state-reconciliation risk covering disagreement between local status, GitHub state, and records.

The risk rows must name owner, trigger, mitigation, status, and escalation condition. No lifecycle or retry contract changes are implied.

## Explicit non-goals

- No authority switch for context or status.
- No lifecycle phase or retry-budget change.
- No modification of the existing receipt state machine merely to carry analytics.
- No durable cross-turn orchestration or parent-resume mechanism.
- No threshold becomes a CI pass/fail gate in IMP-001.
- No implementation or QA sign-off is claimed by this draft.

## Approval decisions required

1. Confirm the source-of-truth boundary above.
2. Confirm denominator, retention, and `N/A` rules.
3. Confirm the minimal append-only envelope and receipt reference boundary.
4. Confirm reconciliation of the context-budget snapshots.
5. Confirm that operator-wait/no-timeout is a wait policy and not a removal of canonical timeout/unavailable outcomes.

## Required verification after approval

```bash
npm test
npm run validate:contracts
npm run validate:risk-register
npm run validate:metrics
npm run validate:context-budget
git diff --check
```

Then obtain independent SA re-review before `status:spec-ready` or Developer dispatch.
