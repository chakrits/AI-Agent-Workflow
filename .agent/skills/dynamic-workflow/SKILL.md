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

For an asynchronous dispatch, register the receipt-scoped bounded monitor before Root yields. Root consumes a terminal result exactly once, emits the Boss event without a new Boss message, then cancels the monitor; a host without monitor-and-wake support records `monitor_unavailable` instead of claiming supervision.

For Bug Fix work, read and validate against `docs/contracts/bug-fix-workflow.yaml`.
It is the canonical state, evidence, and two-rework stop policy; this adapter must not redefine it.
