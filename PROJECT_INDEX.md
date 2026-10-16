# Project Index

Navigation guide for the AI Agent Dynamic Workflow repository. The canonical process lives in docs/workflow/; platform files adapt that process to individual agent hosts.

## Start here

- [README.md](README.md) — framework purpose, structure, and quick start
- [AGENTS.md](AGENTS.md) — repository-wide instructions
- [ROADMAP-SDLC-FRAMEWORK.md](ROADMAP-SDLC-FRAMEWORK.md) — framework direction and planned development
- [PROJECT_STATUS.md](PROJECT_STATUS.md) — current status template
- [TASK_LOG.md](TASK_LOG.md) — work log template
- [DECISIONS.md](DECISIONS.md) — decision register template
- [RISKS.md](RISKS.md) — risk register template
- [CHANGELOG.md](CHANGELOG.md) — change history
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) — third-party notices

## Operating model

- [Operating model overview](docs/operating-model/README.md)
- [Agent operating model](docs/operating-model/AGENT_OPERATING_MODEL.md) — lifecycle, approval gates, and state-update rules
- [Agent personas](docs/operating-model/AGENT_PERSONAS.md)
- [Agent evaluation checklist](docs/operating-model/AGENT_EVALUATION_CHECKLIST.md)
- [Skill catalog](docs/operating-model/SKILL_CATALOG.md)
- [Context budget policy](docs/operating-model/CONTEXT_BUDGET.md)
- [Metrics](docs/operating-model/METRICS.md)

## Canonical workflow policy

- [Core bootloader](docs/workflow/core-bootloader.md) — required first read for repository tasks
- [Dynamic routing](docs/workflow/dynamic-routing.md) — task classification, lifecycle labels, and route selection
- [Role definitions](docs/workflow/role-definitions.md)
- [Dispatch packet contract](docs/workflow/dispatch-packet-contract.md)
- [Handoff contract](docs/workflow/handoff-contract.md)
- [Quality gates](docs/workflow/quality-gates.md)
- [Task execution mode](docs/workflow/task-execution-mode.md)
- [Testing conventions](docs/workflow/testing-conventions.md)
- [Platform readiness](docs/workflow/platform-readiness.md)
- [Template reset policy](docs/workflow/reset-to-template.md)

Role-specific instructions are in [docs/workflow/roles](docs/workflow/roles/).

## Workflow playbooks

End-to-end procedures are in [docs/workflows](docs/workflows/):

- [Feature discovery to plan](docs/workflows/feature-discovery-to-plan.md)
- [New feature](docs/workflows/new-feature.md)
- [Bug fix](docs/workflows/bug-fix.md)
- [Bug debug and fix](docs/workflows/bug-debug-fix.md)
- [CI failure debugging](docs/workflows/ci-failure-debug.md)
- [Config change](docs/workflows/config-change.md)
- [Data change](docs/workflows/data-change.md)
- [TDD implementation](docs/workflows/tdd-implementation-flow.md)
- [Functional test design](docs/workflows/functional-test-design.md)
- [Code review gate](docs/workflows/code-review-gate.md)
- [Validated bug postmortem](docs/workflows/validated-bug-postmortem.md)
- [Stabilize the framework core](docs/workflows/stabilize-core.md)

## Workflow contracts

Contracts, schemas, and examples are under [docs/contracts](docs/contracts/).

| Contract | Purpose |
| --- | --- |
| [New Feature](docs/contracts/new-feature-workflow.yaml) | Feature lifecycle and readiness evidence |
| [Bug Fix](docs/contracts/bug-fix-workflow.yaml) | Reproduction, fix, verification, and bounded rework |
| [Config Change](docs/contracts/config-change-workflow.yaml) | Configuration change planning and validation |
| [Data Change](docs/contracts/data-change-workflow.yaml) | Data/reference-data change and rollback evidence |
| [Schemas](docs/contracts/schemas/) | Shared contract schemas |
| [Examples](docs/contracts/examples/) | Example contract instances |

## Templates

Reusable work artifacts are in [docs/templates](docs/templates/).

**Discovery and requirements:** [PROJECT_BRIEF](docs/templates/PROJECT_BRIEF.md), [REQUIREMENT_DISCOVERY](docs/templates/REQUIREMENT_DISCOVERY.md), [REQUIREMENTS](docs/templates/REQUIREMENTS.md), [TASK_BRIEF](docs/templates/TASK_BRIEF.md), [WORK_ITEM](docs/templates/WORK_ITEM.md), [SDD](docs/templates/SDD.md), [TECHNICAL_DESIGN](docs/templates/TECHNICAL_DESIGN.md), [AC_TRACEABILITY](docs/templates/AC_TRACEABILITY.md), [IMPLEMENTATION_PLAN](docs/templates/IMPLEMENTATION_PLAN.md).

**Implementation and handoff:** [HANDOFF](docs/templates/HANDOFF.md), [IMPLEMENTER_REPORT](docs/templates/IMPLEMENTER_REPORT.md), [COMPLETION_CHECK](docs/templates/COMPLETION_CHECK.md), [TDD_CHECKLIST](docs/templates/TDD_CHECKLIST.md), [PLATFORM_ACTIVATION](docs/templates/PLATFORM_ACTIVATION.md).

**Testing and defects:** [TEST_PLAN](docs/templates/TEST_PLAN.md), [TEST_REPORT](docs/templates/TEST_REPORT.md), [FOCUSED_FUNCTIONAL_TEST_PACK](docs/templates/FOCUSED_FUNCTIONAL_TEST_PACK.md), [FUNCTION_TEST_REPORT](docs/templates/FUNCTION_TEST_REPORT.md), [DEFECT_REPORT](docs/templates/DEFECT_REPORT.md), [REPRO_STEPS](docs/templates/REPRO_STEPS.md), [DEBUG_LEDGER](docs/templates/DEBUG_LEDGER.md), [HYPOTHESIS_MATRIX](docs/templates/HYPOTHESIS_MATRIX.md).

**Review, security, and release:** [CODE_REVIEW_REQUEST](docs/templates/CODE_REVIEW_REQUEST.md), [CODE_REVIEW_FINDINGS](docs/templates/CODE_REVIEW_FINDINGS.md), [TASK_REVIEW](docs/templates/TASK_REVIEW.md), [TASK_REVIEW_REREVIEW](docs/templates/TASK_REVIEW_REREVIEW.md), [SECURITY_REVIEW](docs/templates/SECURITY_REVIEW.md), [CONFIG_CHANGE_PLAN](docs/templates/CONFIG_CHANGE_PLAN.md), [DATA_CHANGE_PLAN](docs/templates/DATA_CHANGE_PLAN.md), [RELEASE_PLAN](docs/templates/RELEASE_PLAN.md).

**Learning and closeout:** [BUG_POSTMORTEM](docs/templates/BUG_POSTMORTEM.md), [POSTMORTEM_CHECKLIST](docs/templates/POSTMORTEM_CHECKLIST.md), [LESSONS_LEARNED](docs/templates/LESSONS_LEARNED.md), [POST_MERGE_DOCUMENTATION_REVIEW](docs/templates/POST_MERGE_DOCUMENTATION_REVIEW.md).

## Project state, records, and knowledge

- Root lifecycle files ([PROJECT_STATUS](PROJECT_STATUS.md), [TASK_LOG](TASK_LOG.md), [DECISIONS](DECISIONS.md), [RISKS](RISKS.md)) are reset to blank project templates.
- [docs/records](docs/records/) is the evidence archive. It currently includes preserved QA records, selected historical handoffs and work records, and empty category placeholders for future work.
- [docs/vault/00-Index.md](docs/vault/00-Index.md) is the knowledge-vault entry point.
- [docs/superpowers/specs](docs/superpowers/specs/) and [docs/superpowers/plans](docs/superpowers/plans/) are optional planning/spec workspaces.

The reset policy at [docs/workflow/reset-to-template.md](docs/workflow/reset-to-template.md) defines what is cleared and preserved. Check its current inventory before making assumptions about historical records.

## Framework tooling

The executable tooling is under [scripts](scripts/) and commands are declared in [package.json](package.json).

- **Reset and housekeeping:** [reset-to-template.mjs](scripts/reset-to-template.mjs), [housekeeping-worktrees.mjs](scripts/housekeeping-worktrees.mjs), [setup-hooks.mjs](scripts/setup-hooks.mjs)
- **Workflow and state:** [task-machine-cli.mjs](scripts/task-machine-cli.mjs), [compile-status-projection.mjs](scripts/compile-status-projection.mjs), [archive-work-item.mjs](scripts/archive-work-item.mjs), [show-session-context.mjs](scripts/show-session-context.mjs), [inject-role-context.mjs](scripts/inject-role-context.mjs)
- **Validation orchestration:** [run-scoped-validations.mjs](scripts/run-scoped-validations.mjs), [validation scripts](scripts/), [shared libraries](scripts/lib/)
- **Contract and record maintenance:** [backfill-work-item-records.mjs](scripts/backfill-work-item-records.mjs), [backfill-task-state-v2.mjs](scripts/backfill-task-state-v2.mjs), [adr-audit.mjs](scripts/adr-audit.mjs), [repin-source-matrix.mjs](scripts/repin-source-matrix.mjs)

The scripts are repository tooling; they do not start an application server or provision infrastructure.

## Agent platform adapters

- [Portable agents](.agents/agents/), [portable skills](.agents/skills/), and [portable workflows](.agents/workflows/)
- [Antigravity agents](.agent/agents/) and [Antigravity skills](.agent/skills/)
- [Claude Code agents](.claude/agents/) and [Claude Code skills](.claude/skills/)
- [Claude Code settings](.claude/settings.json)
- [Codex supervision guidance](.codex/orchestrator-supervision.md)
- [Claude Code entry point](CLAUDE.md)

These are adapter and instruction libraries. Their availability and activation depend on the host platform; see [platform readiness](docs/workflow/platform-readiness.md).

## CI, templates, and tests

- [GitHub Actions workflows](.github/workflows/)
- [GitHub issue templates](.github/ISSUE_TEMPLATE/)
- [GitHub pull request template](.github/pull_request_template.md)
- [GitLab CI](.gitlab-ci.yml) and [GitLab issue templates](.gitlab/issue_templates/)
- [GitLab merge request templates](.gitlab/merge_request_templates/)
- [Git hooks](.githooks/)
- [Test suite and fixtures](test/)
- [Obsidian vault settings](.obsidian/)

CI runs selected, scoped checks. Consult the workflow configuration and package.json for the current command set and execution conditions.
