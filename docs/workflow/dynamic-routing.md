# Dynamic Routing Policy

## Purpose

Route work by change type, risk, and required artifacts instead of forcing a linear PM -> BA -> SA -> Dev -> QA sequence.

## Routing Algorithm

```text
1. Read request and PROJECT_STATUS.md
2. Classify change type
3. Classify risk level
4. Decide whether code, architecture, data, config, QA, or security work is required
5. Select the minimum safe workflow
6. List skipped stages and reasons
7. Execute one stage at a time
8. Validate quality gate
9. Handoff to next agent or route backward
10. Update PROJECT_STATUS.md and TASK_LOG.md
```

## Terminal Routing and Dispatch Receipt

A terminal handoff must end with exactly one `Next Action`: `Dispatch`, `Human review`, or `Blocked`. `Next Owner` is mandatory: a named non-human agent for `Dispatch`, the human gate owner for `Human review`, or the resolution owner for `Blocked`.

The Orchestrator must record the outcome in the same active Orchestrator turn that accepts the terminal handoff. A `Dispatch` outcome needs a receipt with source/target, Work Item/Change Request references, supplied evidence, and the dispatch result. A prose-only instruction such as “send to QA” is not a routed handoff.

Use the portable dispatch-state vocabulary `pending`, `dispatched`, `acknowledged`, `awaiting_terminal`, `completed`, `cancelled`, `timed_out`, and `blocked`. `dispatched` records an attempt; it must not be represented as `acknowledged` without receiving-agent or runtime evidence. Where callbacks are unavailable, report `acknowledgement pending` rather than claiming receipt or completion.

Every terminal outcome must produce a Boss-visible event with completed work and gate result, next action/owner, dispatch state/evidence, and a blocker or decision need where applicable. `Human review` stops autonomous routing: record `Dispatch State: blocked` and `Stop Reason: human_review_required`. These dispatch-control states are not lifecycle labels and do not replace phase/status evidence.

### Event-driven Child Completion

Every terminal handoff has a stable `Handoff Event ID`, `Parent Orchestrator ID`, and `Child Task ID`. For an asynchronous dispatch, after target invocation succeeds and before the parent ends or yields, the parent registers its native child-terminal await/callback receipt as `Completion Event Evidence`. A target completion resumes that parent with immutable completion-event and terminal-result identities; a terminal result is complete only when the parent consumes `(Handoff Event ID, Terminal Result ID)` exactly once, emits one Boss event, then routes a permitted successor or stops with `Consumption Evidence`.

The native completion primitive only delivers the child receipt. It cannot judge QA, merge, approve, alter a repository, or bypass a human gate. If the host cannot retain and resume the parent, record `blocked` with `host_completion_unavailable`; a deadline expiry records `timed_out`, and an explicit cancellation records `cancelled`. These are explicit Boss-visible outcomes, not a fallback to prose routing or polling. A heartbeat/schedule may be used only as an operator-invoked diagnostic after a block; it cannot route work or establish acceptance evidence.

## Lifecycle Labels for Feature and Enhancement Work

Keep the current lifecycle stage separate from evidence milestones.

| Category | Labels | Rule |
|---|---|---|
| Current phase | `phase:requirements`, `phase:design`, `phase:planning`, `phase:development`, `phase:verification`, `phase:human-review`, `phase:blocked` | Exactly one current phase applies to an open Feature or Enhancement work item. |
| Evidence milestone | `status:spec-ready`, `status:development-done`, `status:verification-done` | Additive evidence only; these labels never replace role ownership, QA judgment, or human merge approval. |

### Specification Readiness

Developer must not begin implementation until `status:spec-ready` is present.

- A low-risk route may use an approved lightweight specification in the Work Item: objective, scope, acceptance criteria, risk, required artifacts, and accepted open questions.
- A route with architecture, API, data, NFR, or security-design impact requires the applicable approved SDD/design and implementation plan before `status:spec-ready`.
- Documentation-only work follows the Documentation Agent route without an invented SDD.
- Bug Fix work keeps `docs/contracts/bug-fix-workflow.yaml` as its task-state policy; use these labels only when a separate feature/design route is selected.

### Standard and Backward Paths

```text
Low-risk feature:
phase:requirements -> status:spec-ready -> phase:development -> phase:verification -> phase:human-review

Design-required feature:
phase:requirements -> phase:design -> phase:planning -> status:spec-ready -> phase:development -> phase:verification -> phase:human-review

Rework:
phase:verification or phase:human-review -> phase:development | phase:design | phase:requirements | phase:blocked
```

When work routes backward, remove the superseded current `phase:` label, retain truthful evidence milestones, and record the reason and receiving owner in the handoff.

## Change Types

| Change Type | Default Workflow | Can Skip |
|---|---|---|
| New Feature | PM/BA -> SA -> Dev -> QA -> Release | PM if already approved |
| Bug Fix | QA/BA -> Dev -> QA -> Review | SA if no design impact |
| Config Change | BA -> Config -> QA -> Release | Dev, SA |
| DB / Reference Data Change | BA -> Data -> QA -> Release | Dev, SA |
| API Contract Change | BA -> SA -> Dev -> QA | PM if scope approved |
| Test-only Change | QA -> Reviewer | PM, BA, SA, Dev |
| Documentation-only Change | Documentation -> Reviewer | PM, BA, SA, Dev, QA |
| Security-sensitive Change | Relevant Agent -> Security -> QA -> Human Approval | Never skip Security |

## Risk Levels

### Low

- Localized change
- No production data impact
- No auth/security impact
- Easy rollback

### Medium

- User-visible behavior
- Business rule/config change
- Data mapping/reference data
- Multiple screens/APIs affected

### High

- Auth/authz
- Payment/financial logic
- Sensitive data
- Production DB change
- Integration contract change
- Hard rollback

### Critical

- Production incident
- Data loss risk
- Security incident
- Regulatory/compliance impact

## Stop Conditions

Stop and request human decision when:

- Scope is unclear
- Architecture decision affects multiple systems
- Security risk is high or critical
- Production data is destructive or irreversible
- A Bug Fix reaches two rework transitions and the next verification fails; set the `task-state` to `blocked` with `stop_reason: human_review_required` and hand off to a human
- Test failures cannot be explained
- Required approval is missing

## Bug Fix Contract Routing

For Bug Fix work, `docs/contracts/bug-fix-workflow.yaml` is the canonical
state, transition, evidence, and retry policy. Validate the current `task-state`
before each Bug Fix handoff.

Allow at most two rework transitions from verifying -> rework. On the next failed
verification, set state to blocked with `stop_reason: human_review_required` and
hand off to a human. Preserve backward routing: unclear expected behavior goes to
BA, contract or design gaps go to SA, and auth/security concerns go to Security
Reviewer.
