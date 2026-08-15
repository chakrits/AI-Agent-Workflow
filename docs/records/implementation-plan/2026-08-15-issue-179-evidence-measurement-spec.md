# Draft Measurement Specification: Issue #179 / IMP-001

> Status: **Draft — Human correction set approved; pending SA re-review**

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

IMP-001 selects a separate append-only `workflow-evidence/v1` envelope. The existing dispatch receipt remains a bookkeeping ledger and is referenced by `handoff_event_id` and `terminal_result_id`; its lifecycle schema is not extended with analytics fields. A JSON schema and runtime writer remain a later implementation task.

Every evidence record must provide:

- `schema_version`, `work_item_id`, `run_id`, `event_id`, and `event_type`;
- `observed_at`, `source`, and `authority`;
- a correlation reference to the relevant `handoff_event_id`, `terminal_result_id`, `pair_id`, or `measurement_id` when applicable;
- a result/status or digest reference;
- an explicit reason for fallback, cancellation, unavailable evidence, mismatch, or `N/A`;
- an addressable evidence reference and a recorded-by identity.

The envelope is append-only evidence. It must not duplicate lifecycle labels, receipt lifecycle states, or replace the existing human approval gates.

### Typed outcomes

The following values are frozen for this specification:

```text
token_measurement_status = available | unsupported | not_requested | unavailable
comparison_result = match | mismatch | inconclusive
rollback_result = not_applicable | not_run | succeeded | failed | inconclusive
wait_policy = bounded_deadline | operator_wait | host_managed
```

`not_run` is not a successful rollback when rollback is required. `unavailable` is not equivalent to `unsupported`; it means the measurement was required or requested but the source did not provide it.

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

Token fields are diagnostic evidence only. When a host cannot provide native token counts, record `token_measurement_status` and a reason; never silently treat the value as zero.

### Dispatch and wait-policy fields

Dispatch evidence retains the existing distinction between runtime control and the durable receipt ledger. It records attempt, acknowledgement, terminal result, consumption, duplicate/late delivery, cancellation, and host-unavailable outcomes by event type or referenced evidence.

The orchestrator may request an operator-wait/no-timeout mode. That preference does not remove the canonical `timed_out` or `host_completion_unavailable` states. Required terminal evidence that is missing remains `host_completion_unavailable`; it is never converted to `N/A`. Metrics must record `wait_policy` so timeout rate only uses dispatches with an actual configured deadline.

## Metric definition rules

Each IMP-001 metric must identify owner, event source, numerator, denominator, calculation/exclusion rule, `N/A` rule, retention, and approval status. `N/A` is excluded from numerator and denominator only when the measurement is not applicable or the host capability is genuinely unsupported. `inconclusive`, missing required terminal evidence, cancellation, and failed required rollback remain in the denominator and are not numerator successes. Duplicate/late results do not create a second denominator event.

| Metric | Owner | Event source | Numerator | Denominator | Calculation / exclusion rule | `N/A` rule | Retention | Status |
|---|---|---|---|---|---|---|---|---|
| Route decision coverage | Orchestrator | `route_selected` evidence | Classified items with a route event | Classified work items | Numerator / denominator | Only when classification is not required | Work-item lifetime + closeout | Draft |
| Skipped-role reason completeness | Orchestrator | `role_skipped` evidence | Skips with non-empty reason and owner | All skipped-role decisions | Numerator / denominator | No skipped role | Work-item lifetime + closeout | Draft |
| Context source-manifest coverage | Context loader/host | `context_loaded` evidence | Loads with complete manifest | All context load runs | Numerator / denominator | Host loader genuinely unsupported | Work-item lifetime + measurement record | Draft |
| Native token measurement availability | Host adapter | Token evidence | Available native token measurements | Requests on hosts declaring native-token capability | Unsupported hosts excluded and counted separately | No token measurement requested | Measurement record | Draft |
| Dispatch terminal-evidence rate | Orchestrator/host adapter | Dispatch attempt and terminal evidence | Attempts with one valid terminal result | All invocation attempts | Missing terminal is denominator with zero numerator; no attempt is excluded | None for required terminal evidence | Work-item lifetime + closeout | Draft |
| Exact-once consumption compliance | Orchestrator | Receipt and consumption events | Results consumed exactly once with duplicate/late handling | Terminal results delivered | Duplicate/late deliveries do not add denominator events | No terminal result delivered | Receipt retention policy | Draft |
| Shadow semantic equivalence | Experiment owner | Paired legacy/candidate evidence | Pairs with `match` | All shadow attempts | `mismatch` and `inconclusive` remain denominator observations | No shadow attempt | Experiment record | Draft |
| Shadow fallback rate | Experiment owner | Fallback evidence | Shadow attempts that fall back | All shadow attempts | Unsupported host is not a shadow attempt | No shadow attempt | Experiment record | Draft |
| Rollback success | Developer/QA | Rollback evidence | Required rehearsals with `succeeded` | Required rollback rehearsals | `not_run`, `failed`, and `inconclusive` are denominator failures | Rollback not applicable | Experiment record | Draft |
| Rework cycle rate | Orchestrator/QA | Rework evidence | Verification events that route to rework | Verification events | Zero rework is a valid zero, not `N/A` | No verification event | Work-item lifetime + closeout | Draft |
| Human intervention rate | Orchestrator | Human decision evidence | Work items with an intervention | Work items requiring a decision | Zero intervention is a valid zero | No decision gate | Work-item lifetime + closeout | Draft |
| Final outcome evidence completeness | Orchestrator | Outcome evidence | Closed items with final outcome evidence | Closed work items | Missing required outcome is denominator failure | No closed item | Work-item lifetime + closeout | Draft |

Retention means at least through work-item closeout and the linked measurement record. Platform-specific event retention is not assumed; if a required host source cannot retain or provide evidence, record that limitation and do not use the affected metric as an authoritative trend.

## Baseline protocol

The current observed context baseline is the output of:

```bash
npm run validate:context-budget
```

Observed at `2026-08-15T12:12:14Z` on commit `5d70f6e`: `29,937 / 30,000` approximate tokens, status PASS. The measurement record includes the command, canonical file list, character/token approximation, target, and result. The previous `25,910 / 30,000` value is retained as a historical snapshot in `docs/operating-model/CONTEXT_BUDGET.md`.

Observed at `2026-08-15T12:12:14Z` on commit `5d70f6e`, `npm run validate:metrics` reports 27 work items, 1/27 (3.7%) keyword-derived timeout rate, 1/27 (3.7%) keyword-derived rework rate, and 38 skills. This is a bound historical compatibility snapshot, not authoritative telemetry. The older `METRICS.md` table remains historical.

## Risk mapping applied

- Re-scope existing R-001 to framework-wide canonical-context headroom, with trigger and escalation when the validator approaches or exceeds target.
- Re-scope existing R-002 to host completion evidence, with escalation when a required terminal result cannot be delivered in-turn.
- R-003 covers metric authority and prevents keyword-derived counts from being mistaken for telemetry.
- R-004 covers project-state reconciliation and blocks status promotion when local, GitHub, and record state disagree.

All four rows now name owner, trigger, mitigation, status, and escalation condition. No lifecycle or retry contract changes are implied.

## Explicit non-goals

- No authority switch for context or status.
- No lifecycle phase or retry-budget change.
- No modification of the existing receipt state machine merely to carry analytics.
- No durable cross-turn orchestration or parent-resume mechanism.
- No threshold becomes a CI pass/fail gate in IMP-001.
- No implementation or QA sign-off is claimed by this draft.

## Approval decisions recorded

1. Human approved the source-of-truth boundary and separate append-only envelope correction set for this revision.
2. Human approved the numerator, denominator, retention, and `N/A` correction rules above.
3. Human approved reconciliation of the context-budget snapshots at the bound observation above.
4. Human approved operator-wait/no-timeout as a wait policy, not a removal of canonical timeout/unavailable outcomes.

Final SA re-review is still required before `status:spec-ready`.

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
