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

### Normative envelope field contract

The following fields and rules are normative for `workflow-evidence/v1`. A future JSON schema may encode them, but implementation must not invent a different shape without an SA-approved revision.

| Field | Type / allowed values | Requiredness | Conditional rule |
|---|---|---|---|
| `schema_version` | string, exact value `workflow-evidence/v1` | Required for every record | No other version is valid for this work item |
| `evidence_id` | non-empty string, stable and unique | Required | Identifies this evidence record, not the work item |
| `work_item_id` | non-empty string | Required | Same work item across all correlated events |
| `run_id` | non-empty string | Required | One execution, measurement, or shadow run correlation key |
| `event_id` | non-empty string, stable and unique | Required | Parent event references use this value |
| `event_type` | enum listed in the event mapping below | Required | Unknown event types are invalid, not warnings |
| `observed_at` | RFC 3339 UTC timestamp string | Required | Time the source observed the event, not commit time |
| `source` | `orchestrator` \| `host_telemetry` \| `validator` \| `workflow_record` \| `human_record` | Required | Identifies where the observation came from |
| `authority` | `legacy` \| `shadow` \| `host_telemetry` \| `human_approval` | Required | `shadow` never authorizes a state or consumer switch |
| `correlation` | object with typed IDs | Required for correlated events | Must contain only the ID required by the event mapping; all IDs are non-empty strings |
| `outcome_status` | `recorded` \| `acknowledged` \| `success` \| `failure` \| `inconclusive` \| `consumed` \| `ignored` \| `cancelled` \| `timed_out` \| `host_completion_unavailable` \| `not_applicable` \| `not_run` | Conditional | Required for terminal, comparison, fallback, rollback, cancellation, outcome, and approval events |
| `reason` | non-empty string | Conditional | Required for failure, inconclusive, ignored, cancelled, timed-out, host-unavailable, `not_applicable`, `not_run`, and any metric recorded as `N/A` |
| `attributes` | closed JSON object constrained by event mapping | Required | Event-specific fields must match the mapping and type profile below; arbitrary analytics keys are not allowed |
| `digest_ref` | non-empty digest reference string | Conditional | Required as a top-level field for `context_loaded`, `context_baseline_observed`, and `shadow_compared`; absent for other v1 event types; it is never nested in `attributes` |
| `evidence_ref` | addressable URL or repository path string | Required | Must identify the source artifact or human decision evidence |
| `recorded_by` | non-empty string | Required | Agent, host, validator, or Human Maintainer identity that recorded the evidence |

The `correlation` object may contain only these typed fields: `handoff_event_id`, `terminal_result_id`, `pair_id`, `measurement_id`, and `parent_event_id`. Each value is a non-empty string. `handoff_event_id` uses the existing receipt identifier shape; `terminal_result_id` is required only when a terminal result exists; `pair_id` is required for shadow events; `measurement_id` is required for validator/baseline observations; `parent_event_id` is required for a child event in an event chain. Extra correlation keys are invalid.

The `attributes` object is also closed. Unless a row below gives an enum, identifiers, references, roles, reasons, paths, capabilities, digests, and sources are non-empty strings. The following types are fixed: `skipped_roles` is an array of non-empty strings and may be empty; `approximate_tokens` is a non-negative integer and is present only when `token_measurement_status=available`; `character_count` is a non-negative integer; `target_tokens` is a positive integer; `consumption_count` is the integer `1`; `rework_count` is a positive integer; `decision` is `approved | rejected | deferred`; `terminal_status` is `success | failure | inconclusive | cancelled | timed_out | host_completion_unavailable`; `delivery_class` is `duplicate_or_late`; `fallback_used` is boolean when present; and `rollback_result`, `comparison_result`, `token_measurement_status`, and `wait_policy` use the frozen values below. No additional attribute is valid. The top-level `digest_ref` is the only envelope digest reference; event-specific digest values such as `source_manifest_digest` and `legacy_result_digest` remain attributes and never replace it.

### Normative event mapping

| Event type | `source` | `authority` | Required correlation | Required attributes | Required outcome / reason |
|---|---|---|---|---|---|
| `route_selected` | `orchestrator` | `legacy` | `measurement_id` | `change_type`, `risk_level`, `selected_route`, `skipped_roles` | `recorded`; `reason` when a role is skipped |
| `role_skipped` | `orchestrator` | `legacy` | `parent_event_id` | `role`, `skip_reason`, `next_owner` | `recorded`; `reason` required |
| `context_loaded` | `workflow_record` | `legacy` or `shadow` | `measurement_id` | `context_mode`, `source_manifest_digest`, `token_measurement_status`; `approximate_tokens` when available | `success`, `failure`, or `inconclusive`; reason for non-success; top-level `digest_ref` required |
| `context_baseline_observed` | `validator` | `legacy` | `measurement_id` | `validator_name`, `command`, `source_manifest_digest`, `character_count`, `target_tokens`, `token_measurement_status`; `approximate_tokens` when available | `success` when `token_measurement_status=available` and `approximate_tokens` is within target; `failure` when available measurement exceeds target or required evidence is missing; `inconclusive` when measurement is unsupported/unavailable/not requested; reason for non-success; top-level `digest_ref` required |
| `dispatch_attempted` | `orchestrator` | `legacy` | `handoff_event_id` | `target_agent`, `wait_policy` | `recorded` |
| `dispatch_acknowledged` | `host_telemetry` | `host_telemetry` | `handoff_event_id` | `acknowledgement_source` | `acknowledged` |
| `dispatch_terminal` | `host_telemetry` or `orchestrator` | `host_telemetry` or `legacy` | `handoff_event_id`, `terminal_result_id` when one exists | `terminal_status` | Same value as `terminal_status`; reason for non-success |
| `dispatch_consumed` | `orchestrator` | `legacy` | `handoff_event_id`, `terminal_result_id` | `consumption_count` exact value `1` | `consumed` |
| `dispatch_duplicate` | `orchestrator` | `legacy` | `handoff_event_id`, `terminal_result_id`, `parent_event_id` | `first_terminal_result_id`, `delivery_class` exact value `duplicate_or_late` | `ignored`; reason required |
| `dispatch_cancelled` | `host_telemetry` or `orchestrator` | `host_telemetry` or `legacy` | `handoff_event_id` | `cancellation_source` | `cancelled`; reason required |
| `dispatch_host_unavailable` | `host_telemetry` or `orchestrator` | `host_telemetry` or `legacy` | `handoff_event_id` | `capability`, `wait_policy` | `host_completion_unavailable`; reason required |
| `human_approval` | `human_record` | `human_approval` | `measurement_id` | `decision` enum `approved` \| `rejected` \| `deferred`, `approver` | `success` for approved; `failure` for rejected; `inconclusive` for deferred; reason for rejected/deferred |
| `shadow_compared` | `workflow_record` | `shadow` | `pair_id` | `input_digest`, `legacy_result_digest`, `candidate_result_digest`, `comparison_result` | `success` for `match`; `failure` for `mismatch`; `inconclusive` for `inconclusive`; reason for non-success; top-level `digest_ref` required |
| `shadow_fallback` | `workflow_record` | `shadow` | `pair_id` | `fallback_used` exact value `true`, `fallback_reason`, `legacy_path` | `failure`; reason required |
| `rollback_completed` | `workflow_record` | `shadow` | `pair_id` | `rollback_result`, `rollback_target` | `success` only for `succeeded`; `failure` for `failed`; `inconclusive` for `not_run` or `inconclusive`; `not_applicable` for `not_applicable`; reason for every non-success |
| `rework_started` | `workflow_record` | `legacy` | `parent_event_id` | `rework_count`, `finding_ref`, `next_owner` | `recorded` |
| `outcome_recorded` | `orchestrator` | `legacy` | `measurement_id` | `final_outcome` enum `completed` \| `blocked` \| `cancelled` \| `failed` | `success` for `completed`; `failure` for `blocked`, `cancelled`, or `failed`; reason for non-completed |

Acknowledgement never implies terminal completion. Receipt consumption never implies execution proof. Human approval is evidence of a decision only and cannot be emitted by an agent on the Human's behalf.

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

Shadow observations use the same envelope; they are not a second record shape. For every shadow event, `authority=shadow`, `correlation.pair_id` is the required pair identifier, and all event-specific values are under `attributes`. The value `legacy_result_digest` identifies the legacy observation being compared; it does not change the envelope authority to `legacy`. The top-level `digest_ref` is required for `shadow_compared` only in this v1 mapping and must not be copied into `attributes`.

| Shadow event | `correlation` | Required `attributes` | Outcome mapping |
|---|---|---|---|
| `shadow_compared` | `pair_id` | `input_digest`, `legacy_result_digest`, `candidate_result_digest`, `comparison_result` | `success` for `match`; `failure` for `mismatch`; `inconclusive` for `inconclusive` |
| `shadow_fallback` | `pair_id` | `fallback_used` exact value `true`, `fallback_reason`, `legacy_path` | `failure`; reason required |
| `rollback_completed` | `pair_id` | `rollback_result`, `rollback_target` | `success` only for `succeeded`; `failure` for `failed`; `inconclusive` for `not_run` or `inconclusive`; `not_applicable` for `not_applicable` |

`source_manifest_digest` is an attribute of `context_loaded` or `context_baseline_observed`, not a correlation ID. `fallback_used`, `fallback_reason`, and rollback fields are attributes of their named events only. Token fields are diagnostic evidence only; when a host cannot provide native token counts, record `token_measurement_status` and a reason, never silently treat the value as zero.

Token fields are diagnostic evidence only. When a host cannot provide native token counts, record `token_measurement_status` and a reason; never silently treat the value as zero.

### Dispatch and wait-policy fields

Dispatch evidence retains the existing distinction between runtime control and the durable receipt ledger. It records attempt, acknowledgement, terminal result, consumption, duplicate/late delivery, cancellation, and host-unavailable outcomes by event type or referenced evidence.

The orchestrator may request an operator-wait/no-timeout mode. That preference does not remove the canonical `timed_out` or `host_completion_unavailable` states. Required terminal evidence that is missing remains `host_completion_unavailable`; it is never converted to `N/A`. Metrics must record `wait_policy` so timeout rate only uses dispatches with an actual configured deadline.

## Metric definition rules

Each IMP-001 metric must identify owner, event source, numerator, denominator, calculation/exclusion rule, `N/A` rule, retention, and approval status. `N/A` is excluded from numerator and denominator only when the measurement is not applicable or the host capability is genuinely unsupported. `inconclusive`, missing required terminal evidence, cancellation, and failed required rollback remain in the denominator and are not numerator successes. Duplicate/late results do not create a second denominator event.

| Metric | Owner | Event source | Numerator | Denominator | Calculation / exclusion rule | `N/A` rule | Retention | Status |
|---|---|---|---|---|---|---|---|---|
| Route decision coverage | Orchestrator Agent | `route_selected` evidence | Classified items with a route event | Classified work items | Numerator / denominator | Only when classification is not required | Work-item lifetime + closeout | Draft |
| Skipped-role reason completeness | Orchestrator Agent | `role_skipped` evidence | Skips with non-empty reason and owner | All skipped-role decisions | Numerator / denominator | No skipped role | Work-item lifetime + closeout | Draft |
| Context source-manifest coverage | Developer Agent | `context_loaded` evidence | Loads with complete manifest | All context load runs | Numerator / denominator | Host loader genuinely unsupported | Work-item lifetime + measurement record | Draft |
| Native token measurement availability | Developer Agent | Token evidence | Available native token measurements | Requests on hosts declaring native-token capability | Unsupported hosts excluded and counted separately | No token measurement requested | Measurement record | Draft |
| Dispatch terminal-evidence rate | Orchestrator Agent | Dispatch attempt and terminal evidence | Attempts with one valid terminal result | All invocation attempts | Missing terminal is denominator with zero numerator; no attempt is excluded | None for required terminal evidence | Work-item lifetime + closeout | Draft |
| Exact-once consumption compliance | Orchestrator Agent | Receipt and consumption events | Results consumed exactly once with duplicate/late handling | Terminal results delivered | Duplicate/late deliveries do not add denominator events | No terminal result delivered | Receipt retention policy | Draft |
| Shadow semantic equivalence | QA Agent | Paired legacy/candidate evidence | Pairs with `match` | All shadow attempts | `mismatch` and `inconclusive` remain denominator observations | No shadow attempt | Experiment record | Draft |
| Shadow fallback rate | QA Agent | Fallback evidence | Shadow attempts that fall back | All shadow attempts | Unsupported host is not a shadow attempt | No shadow attempt | Experiment record | Draft |
| Rollback success | QA Agent | Rollback evidence | Required rehearsals with `succeeded` | Required rollback rehearsals | `not_run`, `failed`, and `inconclusive` are denominator failures | Rollback not applicable | Experiment record | Draft |
| Rework cycle rate | QA Agent | Rework evidence | Verification events that route to rework | Verification events | Zero rework is a valid zero, not `N/A` | No verification event | Work-item lifetime + closeout | Draft |
| Human intervention rate | Orchestrator Agent | Human decision evidence | Work items with an intervention | Work items requiring a decision | Zero intervention is a valid zero | No decision gate | Work-item lifetime + closeout | Draft |
| Final outcome evidence completeness | Orchestrator Agent | Outcome evidence | Closed items with final outcome evidence | Closed work items | Missing required outcome is denominator failure | No closed item | Work-item lifetime + closeout | Draft |

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
