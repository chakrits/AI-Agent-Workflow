---
name: dynamic-workflow
description: Use for dynamic AI agent routing, change classification, risk classification, quality gates, and agent handoff in software engineering workflows.
---

# dynamic-workflow

## Purpose

Use for dynamic AI agent routing, change classification, risk classification, quality gates, and agent handoff in software engineering workflows.

## Instructions

Read AGENTS.md, PROJECT_STATUS.md, and docs/workflow/*.md. Classify the request, choose the minimum safe workflow, list required agents/artifacts/gates, and produce a structured handoff.

## Canonical References

- `AGENTS.md`
- `PROJECT_STATUS.md`
- `docs/contracts/bug-fix-workflow.yaml`
- `docs/workflow/dynamic-routing.md`
- `docs/workflow/role-definitions.md`
- `docs/workflow/quality-gates.md`
- `docs/workflow/handoff-contract.md`
- `docs/templates/`
- `docs/operating-model/AGENT_PERSONAS.md`

## Output Rules

- Use the relevant template in `docs/templates/`.
- Document assumptions and open questions.
- Do not skip required gates.
- Update `PROJECT_STATUS.md` and `TASK_LOG.md` when the platform allows file edits.
- After selecting a role, read its matching canonical persona to calibrate collaboration and communication. A persona does not replace or override the operating policy, role definition, evidence requirement, or human gate.
- For a terminal handoff, follow `docs/workflow/handoff-contract.md`: choose exactly one `Next Action` (`Dispatch`, `Human review`, or `Blocked`). A non-human route requires a dispatch receipt/result in the active Orchestrator turn; a prose-only next owner is incomplete. Keep `dispatched` distinct from `acknowledged`; if no callback exists, report `acknowledgement pending`. Emit a Boss-visible event with outcome, evidence, owner, receipt state, and any decision needed.
- For an asynchronous dispatch, the parent records native child-terminal await/callback evidence before it ends or yields. Only a host that retains and resumes the same parent may claim event-driven completion; otherwise record `host_completion_unavailable` instead of claiming supervision. The resumed parent consumes a terminal result exactly once, emits one Boss event, and routes a permitted successor or stops. `timed_out` and `cancelled` are terminal outcomes; heartbeat/schedule use is diagnostic-only after a block and cannot route work.

For Bug Fix work, read and validate against `docs/contracts/bug-fix-workflow.yaml`.
It is the canonical state, evidence, and two-rework stop policy; this adapter must not redefine it.
