---
name: dynamic-workflow
description: Use for dynamic routing, quality gates, and handoff across PM, BA, SA, Developer, QA, Security, Config, Data, Release, and Documentation roles.
---

# Dynamic Workflow Adapter

This is a platform adapter. The canonical source is:

- `AGENTS.md`
- `docs/workflow/`
- `.agents/skills/dynamic-workflow/SKILL.md`
- `docs/operating-model/AGENT_PERSONAS.md`

Follow the canonical files. Do not treat this adapter as the source of truth.

For Feature and Enhancement work, require `status:spec-ready` before Developer implementation and keep exactly one current `phase:` label. Follow `docs/workflow/dynamic-routing.md` for the portable lifecycle contract and exceptions.

After selecting a role, read its matching canonical persona to calibrate collaboration and communication. A persona does not replace or override the operating policy, role definition, evidence requirement, or human gate.

For every terminal handoff, follow `docs/workflow/handoff-contract.md` and select exactly one `Next Action`: `Dispatch`, `Human review`, or `Blocked`. A non-human route needs a dispatch receipt/result from the active Orchestrator turn, not prose alone. Keep `dispatched` separate from `acknowledged`; when callback evidence cannot be supplied, report `acknowledgement pending`. Emit a Boss-visible event with the outcome, evidence, owner, receipt state, and any decision needed.

Supervision is in-turn only: the parent invokes the target child and awaits its terminal receipt within the same active Orchestrator turn, recording native `Completion Event Evidence` before it ends or yields; no host capability in this contract resumes a parent after it ends or yields. If a required dispatch cannot complete in-turn, record `host_completion_unavailable` and stop in that turn rather than end or yield on a claimed continuation. The parent consumes each terminal result exactly once, emits one Boss event, and routes a permitted successor or stops within that turn. `timed_out` and `cancelled` are terminal outcomes; cross-turn/event-driven resumption is deferred to GitHub Issue #35; heartbeat/schedule use is diagnostic-only after a block and cannot route work.

For Bug Fix work, read and validate against `docs/contracts/bug-fix-workflow.yaml`.
It is the canonical state, evidence, and two-rework stop policy; this adapter must not redefine it.
