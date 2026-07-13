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
5. Execute only the current stage.
6. Validate quality gate.
7. Produce handoff.
8. Update state and task log.

For Bug Fix work, read and validate against `docs/contracts/bug-fix-workflow.yaml`.
It is the canonical state, evidence, and two-rework stop policy; this adapter must not redefine it.
