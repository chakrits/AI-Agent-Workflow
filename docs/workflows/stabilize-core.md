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

Library-only skill/catalog/vault-skill-link or `.agents/workflows/*.md` edits are optional instruction contributions, not core-policy changes by themselves. No listing, mirror or audit-pass prerequisite applies. If a contribution changes core rules, routing, executable code or security controls, classify and review that core impact normally; generic Issue/PR readiness still applies.

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

- `docs/operating-model/AGENT_OPERATING_MODEL.md` ([[../operating-model/AGENT_OPERATING_MODEL.md|AGENT_OPERATING_MODEL.md]])
- Optional discovery: `docs/operating-model/SKILL_CATALOG.md` ([[../operating-model/SKILL_CATALOG.md|SKILL_CATALOG.md]]) when relevant; not required to exist or be complete
- `docs/operating-model/AGENT_EVALUATION_CHECKLIST.md` ([[../operating-model/AGENT_EVALUATION_CHECKLIST.md|AGENT_EVALUATION_CHECKLIST.md]])
- `AGENTS.md` ([[../../AGENTS.md|AGENTS.md]]) update or amendment
- `TASK_LOG.md` ([[../../TASK_LOG.md|TASK_LOG.md]]) update if applied in a project repo

## Quality Gate

Before completion:

- New rules do not conflict with existing dynamic routing rules.
- Skill boundaries are clear and non-overlapping.
- Human approval gates are preserved.
- Completion checklist exists for agents to self-check output.
- Cross-platform paths remain clear: `.agents/`, `.claude/`, `.agent/`.

## Handoff

Use `docs/templates/COMPLETION_CHECK.md` ([[../templates/COMPLETION_CHECK.md|COMPLETION_CHECK.md]]) when reporting the update.
