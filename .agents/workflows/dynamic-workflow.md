# Portable Workflow: Dynamic Software Engineering Agent Flow

```text
Request -> Classify -> Route -> Execute -> Gate -> Handoff -> Forward/Backward/Skip/Stop
```

Use this workflow for all software engineering tasks unless a more specific workflow exists.

## Core Steps

1. Read `AGENTS.md` and `PROJECT_STATUS.md`.
2. Classify change type and risk.
3. Decide if code, architecture, config, data, QA, security, or release work is required.
4. Select minimum safe workflow.
5. For Feature and Enhancement work, record exactly one current `phase:` label and verify specification readiness before development.
6. Execute only the current stage.
7. Validate quality gate.
8. Produce handoff.
9. Update state and task log.

For every terminal handoff, use `docs/workflow/handoff-contract.md` and choose exactly one `Next Action`: `Dispatch`, `Human review`, or `Blocked`. A non-human route is complete only when the active Orchestrator turn records a dispatch receipt and dispatch result; a prose-only next owner is not a dispatch. Keep `dispatched` distinct from `acknowledged`; where callback evidence is unavailable, report `acknowledgement pending` rather than claiming receipt or completion. Every terminal result needs a Boss-visible event with the outcome, evidence, owner, receipt state, and any decision needed.

For an asynchronous dispatch, the parent must register native child-terminal await/callback evidence before it ends or yields. Only a host that retains and resumes the same parent may claim event-driven completion; otherwise record `host_completion_unavailable` as blocked. The resumed parent consumes each terminal result exactly once, emits one Boss event, then routes a permitted successor or stops. `timed_out` and `cancelled` are terminal outcomes; heartbeat/schedule use is diagnostic-only after a block and cannot route work.

`status:spec-ready` is the portable specification readiness gate before Developer implementation. It is separate from `status:development-done` and `status:verification-done`; see `docs/workflow/dynamic-routing.md` for the canonical labels, exceptions, and backward routing.

For Bug Fix work, read and validate against `docs/contracts/bug-fix-workflow.yaml`.
It is the canonical state, evidence, and two-rework stop policy; this adapter must not redefine it.
