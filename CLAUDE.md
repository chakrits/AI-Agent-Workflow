# CLAUDE.md

Claude-specific instructions.

Before starting any task:

1. Read `AGENTS.md`.
2. Read `PROJECT_STATUS.md`.
3. Use `.claude/agents/` subagents when the task clearly matches a role.
4. Treat `docs/workflow/` as source of truth.
5. Do not rely only on auto-delegation; follow routing policy in `AGENTS.md`.

Claude subagents are adapters. If a rule conflicts with `AGENTS.md` or `docs/workflow/`, the canonical workflow files win.
