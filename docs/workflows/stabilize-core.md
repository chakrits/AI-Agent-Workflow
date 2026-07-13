# Workflow: Stabilize Core

## Purpose

Use this workflow when improving the agent operating model, routing rules, skill boundaries, evaluation checklists, or shared templates.

## Trigger

Use when the request involves:

- Adding or revising operating model rules
- Updating `AGENTS.md`
- Adding skill catalog entries
- Defining quality gates or evaluation checklists
- Clarifying role boundaries or routing behavior
- Improving cross-platform agent structure

## Recommended Flow

```text
Orchestrator
  ↓
Documentation Agent
  ↓
Reviewer / QA Agent
  ↓
Human Approval
```

For security-sensitive process changes:

```text
Orchestrator → Documentation Agent → Security Reviewer → Human Approval
```

## Required Artifacts

- `docs/operating-model/AGENT_OPERATING_MODEL.md`
- `docs/operating-model/SKILL_CATALOG.md`
- `docs/operating-model/AGENT_EVALUATION_CHECKLIST.md`
- `AGENTS.md` update or amendment
- `TASK_LOG.md` update if applied in a project repo

## Quality Gate

Before completion:

- New rules do not conflict with existing dynamic routing rules.
- Skill boundaries are clear and non-overlapping.
- Human approval gates are preserved.
- Completion checklist exists for agents to self-check output.
- Cross-platform paths remain clear: `.agents/`, `.claude/`, `.agent/`.

## Handoff

Use `docs/templates/COMPLETION_CHECK.md` when reporting the update.
