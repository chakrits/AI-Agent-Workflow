# AI Agent Dynamic Workflow

A cross-platform, artifact-driven framework for coordinating AI-assisted software delivery through specialized roles, risk-based routing, reusable workflows, and human approval gates.

This repository contains the framework's policies, templates, adapters, scripts, and validation tooling. It does not include a web application, database, Docker runtime, or hosted KMS service. Shared project knowledge is represented through versioned project documents and records; connect or build a separate knowledge service if runtime retrieval is required.

## What the framework provides

- **Dynamic work routing** — classify a task by change type and risk, then select the smallest workflow that safely covers it.
- **Specialist roles** — role definitions cover product/business analysis, architecture, implementation, QA, security, release, documentation, configuration, data, and orchestration.
- **Portable skills and adapters** — reusable skill/workflow libraries sit alongside host-specific adapters for Codex, Claude Code, and Antigravity. Availability depends on the agent host.
- **Artifact-based collaboration** — contracts, templates, and handoff records keep requirements, design decisions, test evidence, and ownership explicit.
- **Quality checks** — scripts and CI workflows validate contracts, project state, workflow evidence, documentation impact, and repository conventions.
- **Project knowledge conventions** — root state files, decision/risk registers, docs/records/, and the Obsidian vault index provide places to retain project context.

## Start here

1. Read [AGENTS.md](AGENTS.md) for repository-wide operating rules.
2. Read the [core bootloader](docs/workflow/core-bootloader.md) to classify a task and find only the policy sources it needs.
3. Use [PROJECT_INDEX.md](PROJECT_INDEX.md) to navigate the framework.
4. Review [ROADMAP-SDLC-FRAMEWORK.md](ROADMAP-SDLC-FRAMEWORK.md) for the broader framework direction.

## Repository structure

    AI-Agent-Workflow/
    ├── AGENTS.md                     # Cross-platform agent instructions
    ├── README.md                     # Framework overview and quick start
    ├── PROJECT_INDEX.md              # Navigation map
    ├── ROADMAP-SDLC-FRAMEWORK.md     # Framework roadmap
    ├── PROJECT_STATUS.md             # Current project state (template baseline)
    ├── TASK_LOG.md                   # Work history (template baseline)
    ├── DECISIONS.md                  # Decision register (template baseline)
    ├── RISKS.md                      # Risk register (template baseline)
    ├── CHANGELOG.md                  # Change history
    ├── THIRD_PARTY_NOTICES.md        # Third-party notices
    ├── .agents/                      # Portable agents, skills, workflows
    ├── .agent/                       # Antigravity adapters
    ├── .claude/                      # Claude Code adapters
    ├── .codex/                       # Codex-specific guidance
    ├── docs/
    │   ├── contracts/                # Machine-readable workflow contracts
    │   ├── operating-model/          # Policy, personas, metrics, evaluation
    │   ├── records/                  # Project evidence and historical records
    │   ├── templates/                # Reusable work artifacts
    │   ├── vault/                    # Knowledge vault index
    │   ├── workflow/                 # Canonical routing, roles, gates, policies
    │   ├── workflows/                # End-to-end workflow playbooks
    │   └── superpowers/              # Optional planning/spec workspace
    ├── scripts/                      # Reset, routing, validation, maintenance tools
    ├── test/                         # Script, contract, and workflow checks
    ├── .github/workflows/            # GitHub automation
    └── .gitlab-ci.yml                # GitLab pipeline entry point

The repository also includes issue and pull-request templates, Git hooks, GitLab templates, and Obsidian settings.

## Quick start

Prerequisites: Git and Node.js 22 or later.

    npm install
    npm run setup:hooks
    npm test
    npm run validate:contracts

npm run setup:hooks configures Git's `core.hooksPath` to `.githooks`, enabling the repository's local hooks. npm test runs the repository test suite. The project reset leaves active project-state files at their template baseline; some legacy checks still depend on historical record examples, so inspect the reported test output rather than assuming a clean result. Contract validation can be run independently.

For available commands, see [package.json](package.json), and for the checks used by CI, see [GitHub workflows](.github/workflows/) and [GitLab CI](.gitlab-ci.yml).

## CI Validation Checks

GitHub Actions selects validations from the changed paths through `scripts/run-scoped-validations.mjs`. Changes to code, tests, or package metadata run the test suite and applicable contract checks; ordinary documentation-only changes run `git diff --check`, while changes to README.md or PROJECT_INDEX.md also check their local links. CI also has dedicated gates for documentation impact and pull-request work-item readiness. The path rules and command allowlist are defined in [validation-scope.mjs](scripts/lib/validation-scope.mjs).

## Optional Library Audits

Skill catalog and skill-usage audits are opt-in checks. They are not part of the mandatory CI validation set; run `npm run audit:skills` or `npm run audit:skill-usage` when those libraries change or need review.

## How work flows

The framework does not force every task through a fixed PM → BA → SA → Developer → QA sequence. Start with the [core bootloader](docs/workflow/core-bootloader.md), classify the change, then follow the applicable route in [dynamic-routing.md](docs/workflow/dynamic-routing.md).

| Work type | Typical route |
| --- | --- |
| New feature | Requirements → architecture as needed → implementation → QA → security/release when relevant |
| Bug fix | Reproduction and defect analysis → fix → focused verification and review |
| Config or reference-data change | Assess impact → change plan → validation and rollback evidence |
| API contract change | Requirements → API/data/integration design → implementation → contract and security checks as relevant |
| Test-only or documentation-only change | Focused specialist work → proportionate review |
| Framework/process change | Orchestrator and documentation review → applicable validation → human approval |

Routes are risk-based; the canonical policies define when to skip or add a stage. Human approval remains required at the gates defined in the [operating model](docs/operating-model/AGENT_OPERATING_MODEL.md#human-approval-gates).

Workflow playbooks: [Feature discovery to plan](docs/workflows/feature-discovery-to-plan.md), [New feature](docs/workflows/new-feature.md), [Bug fix](docs/workflows/bug-fix.md), [Bug debug and fix](docs/workflows/bug-debug-fix.md), [CI failure debugging](docs/workflows/ci-failure-debug.md), [Config change](docs/workflows/config-change.md), [Data change](docs/workflows/data-change.md), [TDD implementation](docs/workflows/tdd-implementation-flow.md), [Functional test design](docs/workflows/functional-test-design.md), [Code review gate](docs/workflows/code-review-gate.md), [Validated bug postmortem](docs/workflows/validated-bug-postmortem.md), and [Stabilize the framework core](docs/workflows/stabilize-core.md).

## Workflow contracts and reusable artifacts

Machine-readable contracts currently cover [New Feature](docs/contracts/new-feature-workflow.yaml), [Bug Fix](docs/contracts/bug-fix-workflow.yaml), [Config Change](docs/contracts/config-change-workflow.yaml), and [Data Change](docs/contracts/data-change-workflow.yaml). Schemas and examples live under [docs/contracts](docs/contracts/).

Reusable artifacts live in [docs/templates](docs/templates/), including requirements, technical design, implementation plans, test plans, defect reports, security reviews, handoffs, and completion checks. The framework expects concrete evidence and measurable outcomes where a workflow requires them.

## Project state and shared knowledge

The root state files describe the current project lifecycle. After the template reset, PROJECT_STATUS.md, TASK_LOG.md, DECISIONS.md, and RISKS.md are clean starting points rather than populated project history. docs/records/ contains preserved QA evidence and selected historical records alongside empty record-category placeholders.

Use [docs/vault/00-Index.md](docs/vault/00-Index.md) as the entry point to the knowledge vault. These files provide versioned, reviewable project context; they are not a live memory database or hosted KMS.

## Resetting project records

Review the inventory and reset policy before applying a reset. The dry-run inventory is authoritative.

    npm run reset:template
    npm run reset:template -- --apply --confirm-reset

The reset protects decision and risk registers by default. Only after reviewing the inventory and intending to clear those records, include the corresponding flags:

    npm run reset:template -- --apply --confirm-reset --reset-decisions --reset-risks

See [reset-to-template.md](docs/workflow/reset-to-template.md) for exact scope, preserved paths, and safeguards.

## Contributing

Keep changes focused and follow [AGENTS.md](AGENTS.md). Classify the work first, select the minimum safe workflow, preserve evidence at lifecycle transitions, and run the relevant checks before handing work to a reviewer.
