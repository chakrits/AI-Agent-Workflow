# Project Index

This file is the navigation map for the repository. Prefer the linked sections below over a flat file list when orienting a human or agent.

## Start Here

- [README.md](./README.md) - Project overview and recommended structure.
- [AGENTS.md](./AGENTS.md) - Cross-platform agent rules and routing policy.
- [CLAUDE.md](./CLAUDE.md) - Claude-specific entry point and delegation to `AGENTS.md`.
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Current stage, blockers, classification, and next agent.
- [TASK_LOG.md](./TASK_LOG.md) - Work history and handoff trail.
- [DECISIONS.md](./DECISIONS.md) - Architecture and process decisions.
- [RISKS.md](./RISKS.md) - Known project risks.
- [CHANGELOG.md](./CHANGELOG.md) - Human-facing change history.
- [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) - Source attribution and license notices for incorporated or adapted third-party material.

## Canonical Operating Model

These documents define the shared source of truth for agent behavior.

- [docs/operating-model/README.md](./docs/operating-model/README.md) - Read order and operating-model guidance.
- [docs/operating-model/AGENT_OPERATING_MODEL.md](./docs/operating-model/AGENT_OPERATING_MODEL.md) - Agent autonomy, roles, routing, and stop conditions.
- [docs/operating-model/SKILL_CATALOG.md](./docs/operating-model/SKILL_CATALOG.md) - Skill selection rules, triggers, outputs, and boundaries.
- [docs/operating-model/AGENT_EVALUATION_CHECKLIST.md](./docs/operating-model/AGENT_EVALUATION_CHECKLIST.md) - Completion and quality checklist.

## Workflow Source Of Truth

Use these files for dynamic routing, role ownership, quality gates, and handoff structure.

- [docs/workflow/dynamic-routing.md](./docs/workflow/dynamic-routing.md) - Change classification, risk levels, and routing algorithm.
- [docs/workflow/role-definitions.md](./docs/workflow/role-definitions.md) - Responsibilities for PM, BA, SA, Dev, QA, Security, Config, Data, Release, and Documentation agents.
- [docs/workflow/quality-gates.md](./docs/workflow/quality-gates.md) - Stage gates and required evidence.
- [docs/workflow/handoff-contract.md](./docs/workflow/handoff-contract.md) - Required handoff fields and rules.

## Workflow Playbooks

Use these when a task matches a specific work pattern.

- [docs/workflows/new-feature.md](./docs/workflows/new-feature.md) - New feature workflow.
- [docs/workflows/feature-discovery-to-plan.md](./docs/workflows/feature-discovery-to-plan.md) - Requirement discovery through implementation planning.
- [docs/workflows/bug-fix.md](./docs/workflows/bug-fix.md) - Standard bug-fix workflow.
- [docs/workflows/bug-debug-fix.md](./docs/workflows/bug-debug-fix.md) - Debugging discipline for bugs and regressions.
- [docs/workflows/ci-failure-debug.md](./docs/workflows/ci-failure-debug.md) - CI failure investigation workflow.
- [docs/workflows/validated-bug-postmortem.md](./docs/workflows/validated-bug-postmortem.md) - RCA/postmortem after a validated fix.
- [docs/workflows/config-change.md](./docs/workflows/config-change.md) - Configuration change workflow.
- [docs/workflows/data-change.md](./docs/workflows/data-change.md) - Reference data or DB data change workflow.
- [docs/workflows/functional-test-design.md](./docs/workflows/functional-test-design.md) - Functional test design workflow.
- [docs/workflows/tdd-implementation-flow.md](./docs/workflows/tdd-implementation-flow.md) - TDD implementation workflow.
- [docs/workflows/code-review-gate.md](./docs/workflows/code-review-gate.md) - Code review gate workflow.
- [docs/workflows/stabilize-core.md](./docs/workflows/stabilize-core.md) - Core stabilization workflow.

## Templates

Use these files as artifact starters when a workflow requires structured output.

- [docs/templates/PROJECT_BRIEF.md](./docs/templates/PROJECT_BRIEF.md) - Project brief template.
- [docs/templates/REQUIREMENT_DISCOVERY.md](./docs/templates/REQUIREMENT_DISCOVERY.md) - Requirement discovery template.
- [docs/templates/REQUIREMENTS.md](./docs/templates/REQUIREMENTS.md) - Requirements template.
- [docs/templates/SDD.md](./docs/templates/SDD.md) - Software design document template.
- [docs/templates/TDD.md](./docs/templates/TDD.md) - Technical design document template.
- [docs/templates/IMPLEMENTATION_PLAN.md](./docs/templates/IMPLEMENTATION_PLAN.md) - Implementation plan template.
- [docs/templates/TDD_CHECKLIST.md](./docs/templates/TDD_CHECKLIST.md) - TDD checklist template.
- [docs/templates/TEST_PLAN.md](./docs/templates/TEST_PLAN.md) - Test plan template.
- [docs/templates/FUNCTION_TEST_REPORT.md](./docs/templates/FUNCTION_TEST_REPORT.md) - Functional test report template.
- [docs/templates/FOCUSED_FUNCTIONAL_TEST_PACK.md](./docs/templates/FOCUSED_FUNCTIONAL_TEST_PACK.md) - Focused functional test pack template.
- [docs/templates/TEST_REPORT.md](./docs/templates/TEST_REPORT.md) - Test report template.
- [docs/templates/DEBUG_LEDGER.md](./docs/templates/DEBUG_LEDGER.md) - Debugging experiment ledger template.
- [docs/templates/HYPOTHESIS_MATRIX.md](./docs/templates/HYPOTHESIS_MATRIX.md) - Debugging hypothesis matrix template.
- [docs/templates/REPRO_STEPS.md](./docs/templates/REPRO_STEPS.md) - Reproduction steps template.
- [docs/templates/BUG_POSTMORTEM.md](./docs/templates/BUG_POSTMORTEM.md) - Bug postmortem template.
- [docs/templates/POSTMORTEM_CHECKLIST.md](./docs/templates/POSTMORTEM_CHECKLIST.md) - Postmortem quality checklist.
- [docs/templates/CODE_REVIEW_REQUEST.md](./docs/templates/CODE_REVIEW_REQUEST.md) - Code review request template.
- [docs/templates/CODE_REVIEW_FINDINGS.md](./docs/templates/CODE_REVIEW_FINDINGS.md) - Code review findings template.
- [docs/templates/SECURITY_REVIEW.md](./docs/templates/SECURITY_REVIEW.md) - Security review template.
- [docs/templates/CONFIG_CHANGE_PLAN.md](./docs/templates/CONFIG_CHANGE_PLAN.md) - Config change plan template.
- [docs/templates/DATA_CHANGE_PLAN.md](./docs/templates/DATA_CHANGE_PLAN.md) - Data change plan template.
- [docs/templates/HANDOFF.md](./docs/templates/HANDOFF.md) - Agent handoff template.
- [docs/templates/COMPLETION_CHECK.md](./docs/templates/COMPLETION_CHECK.md) - Completion evidence template.
- [docs/templates/POST_MERGE_DOCUMENTATION_REVIEW.md](./docs/templates/POST_MERGE_DOCUMENTATION_REVIEW.md) - Documentation-state audit exception record after a failed `main` validation.
- [docs/templates/RELEASE_PLAN.md](./docs/templates/RELEASE_PLAN.md) - Release plan template.

## Platform Adapter Layers

These directories are shareable project adapters for specific agent platforms. They are not secrets. Keep the canonical source of truth in `docs/workflow/` and `docs/operating-model/`.

- [.agents/skills](./.agents/skills) - Portable skills for Codex, Antigravity, and compatible agents.
- [.agents/workflows](./.agents/workflows) - Portable workflow adapters.
- [.claude/agents](./.claude/agents) - Claude Code native agent wrappers.
- [.claude/skills](./.claude/skills) - Claude Code skill adapters.
- [.agent/skills](./.agent/skills) - Antigravity CLI skill adapters.
