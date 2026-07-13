# AI Agent Dynamic Workflow v2

Cross-platform-first workflow kit for software engineering teams using AI agents.

This version uses a canonical shared layer so the process is not locked to Claude Code, Codex, or Antigravity.

## Core Idea

```text
Request
  -> Orchestrator
  -> Change Type Classification
  -> Risk Classification
  -> Minimum Safe Workflow
  -> Agent Routing
  -> Quality Gate
  -> Handoff
  -> Forward / Backward / Skip / Stop
```

The workflow is graph-based, not linear-only. It supports:

- Forward handoff
- Backward clarification
- Stage skipping
- Parallel work
- Human approval gates
- Non-code changes such as config and reference-data updates

## Recommended Structure

```text
project/
├── AGENTS.md
├── CLAUDE.md
├── PROJECT_STATUS.md
├── TASK_LOG.md
├── DECISIONS.md
├── RISKS.md
├── CHANGELOG.md
├── docs/
│   ├── workflow/
│   │   ├── dynamic-routing.md
│   │   ├── role-definitions.md
│   │   ├── quality-gates.md
│   │   └── handoff-contract.md
│   ├── workflows/
│   └── templates/
├── .agents/
│   ├── skills/
│   └── workflows/
├── .claude/
│   ├── agents/
│   └── skills/
└── .agent/
    └── skills/
```

## Layer Responsibilities

| Layer | Purpose |
|---|---|
| `AGENTS.md` | Cross-platform project rules and routing policy |
| `docs/workflow/` | Source of truth for workflow, roles, gates, handoff contracts |
| `.agents/skills/` | Portable skill layer for Codex / Antigravity / compatible agents |
| `.claude/agents/` | Claude Code native subagent wrappers |
| `.claude/skills/` | Claude Code skill adapter |
| `.agent/skills/` | Antigravity CLI compatibility adapter |

## First Prompt

```text
Read AGENTS.md and PROJECT_STATUS.md.
Classify the request by change type and risk.
Select the minimum safe workflow.
List required artifacts, required agents, skipped agents, and quality gates.
Do not implement until the workflow route is clear.
```
