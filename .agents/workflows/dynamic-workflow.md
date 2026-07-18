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

Supervision is in-turn only: the parent invokes the target child and awaits its terminal receipt within the same active Orchestrator turn, recording native `Completion Event Evidence` before it ends or yields; no host capability in this contract resumes a parent after it ends or yields. If a required dispatch cannot complete in-turn, record `host_completion_unavailable` and stop in that turn rather than end or yield on a claimed continuation. The parent consumes each terminal result exactly once, emits one Boss event, and routes a permitted successor or stops within that turn. `timed_out` and `cancelled` are terminal outcomes; cross-turn/event-driven resumption is deferred to GitHub Issue #35; heartbeat/schedule use is diagnostic-only after a block and cannot route work.

`status:spec-ready` is the portable specification readiness gate before Developer implementation. It is separate from `status:development-done` and `status:verification-done`; see `docs/workflow/dynamic-routing.md` for the canonical labels, exceptions, and backward routing.

For Bug Fix work, read and validate against `docs/contracts/bug-fix-workflow.yaml`.
It is the canonical state, evidence, and two-rework stop policy; this adapter must not redefine it.
