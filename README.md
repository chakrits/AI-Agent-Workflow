# AI Agent Dynamic Workflow

A cross-platform, contract-first workflow kit for software teams that use AI agents. It helps an agent decide **what kind of work this is**, choose the **smallest safe workflow**, produce reviewable artifacts, and stop at the right human approval gates.

The shared process is not tied to one tool. Codex, Claude Code, Antigravity, and compatible agents use the same canonical rules under `docs/`; their platform-specific files are adapters.

## What You Get

- Dynamic routing instead of a fixed PM → BA → SA → Developer → QA pipeline.
- All 11 roles — Orchestrator, PM, BA, SA, Developer, QA, Security Reviewer, Config, Data, Release, and Documentation — have concrete, regression-tested canonical rules, not just a one-line description.
- Required quality gates, structured handoffs, and explicit human approval boundaries.
- A machine-checkable Bug Fix workflow contract: legal states, evidence requirements, retry limits, and human escalation.
- Reusable templates for briefs, requirements, designs, test plans, handoffs, completion checks, security/release reviews, and post-merge documentation reviews.
- Portable skills and platform adapters that refer back to the same canonical policy.
- Hosted CI on both GitHub Actions and GitLab CI, running the same test/contract-validation suite.

## Project Structure

```text
AI-Agent-Workflow/
├── README.md                 # Start here: overview and quick start
├── AGENTS.md                 # Cross-platform rules, routing, and approval gates
├── PROJECT_INDEX.md          # Linked map of the repository
├── PROJECT_STATUS.md         # Current work item, blockers, and next agent
├── TASK_LOG.md               # Work history and handoff trail
├── DECISIONS.md              # Architecture and process decisions
├── RISKS.md                  # Owned risks and follow-ups
├── CHANGELOG.md              # Human-facing change history
├── docs/
│   ├── operating-model/      # Operating model, skill catalog, evaluation checklist
│   ├── workflow/             # Canonical roles, routing, quality gates, handoffs
│   ├── workflows/            # Playbooks for features, bugs, CI, config, and data
│   ├── contracts/            # Bug Fix policy, schema, examples, and fixtures
│   ├── templates/            # Reusable artifacts for each workflow stage
│   ├── records/              # Durable completion and review records
│   └── superpowers/          # Approved designs and implementation plans
├── .agents/                  # Portable skills and workflow adapters
├── .claude/                  # Claude Code agent and skill adapters
├── .agent/                   # Antigravity CLI skill adapters
├── test/                     # Regression checks for workflow rules and docs
├── scripts/                  # Contract validation command
├── .github/workflows/        # GitHub Actions validation
└── .gitlab-ci.yml            # GitLab CI validation (same checks, different platform)
```

## Quick Start

### 1. Clone and install

**Prerequisites:** [Node.js](https://nodejs.org/) 22 or later, and `git`. That's the only runtime dependency this repo itself has — it's a Node.js tooling/documentation kit. The Django/Python/PostgreSQL references you'll see in role definitions (e.g. SA Agent, Security Reviewer) describe the *target application stack this workflow is configured for*, not a dependency of this repo.

```bash
git clone <this-repo-url>
cd AI-Agent-Workflow
npm install
```

### 2. Verify your clone

```bash
npm test
npm run validate:contracts
```

Both commands should exit clean. This is the same check hosted CI runs on every push and pull/merge request — on GitHub Actions ([.github/workflows/validate-contracts.yml](./.github/workflows/validate-contracts.yml)) and on GitLab CI ([.gitlab-ci.yml](./.gitlab-ci.yml)), whichever platform this repo is hosted on.

### 3. Give your agent a safe first prompt

```text
Read AGENTS.md, PROJECT_STATUS.md, and the operating-model read order.
Classify this request by change type and risk.
Select the minimum safe workflow.
List required artifacts, required agents, skipped agents, quality gates,
and any human approval gate before implementation begins.
```

### 4. Work from the canonical layer

Use [PROJECT_INDEX.md](./PROJECT_INDEX.md) to navigate. Treat `docs/operating-model/` and `docs/workflow/` as the source of truth; do not let a platform adapter redefine policy.

## How Work Flows

```text
Request
  → Change and risk classification
  → Minimum safe workflow
  → Role / skill routing
  → Artifact and quality gate
  → Structured handoff
  → Forward, backward, skip, stop, or human approval
```

The flow is deliberately bidirectional. For example, QA can send ambiguous acceptance criteria back to BA, and a Developer can send an insufficient API contract back to SA. An agent may skip irrelevant stages, but it must not skip required security, quality, or human-approval gates.

## Roles at a Glance

| Role | Primary responsibility |
|---|---|
| Orchestrator | Classifies work, chooses routes, enforces gates, and maintains project state. |
| PM / BA | Clarify business value, scope, requirements, acceptance criteria, and rules. |
| SA | Owns architecture, API/data contracts, NFRs, trade-offs, and ADRs. |
| Developer | Implements code, migrations, and unit-level verification. |
| QA | Designs and executes test coverage, reports evidence, and routes defects correctly. |
| Security Reviewer | Reviews trust boundaries, auth, sensitive data, input handling, and dependency risk. |
| Config / Data | Own configuration or reference-data changes with validation and rollback considerations. |
| Release | Prepares release, rollback, evidence, and final deployment handoff. |
| Documentation | Keeps docs, status, history, risks, and post-merge documentation review records accurate. |

See the complete [role definitions](./docs/workflow/role-definitions.md).

## Choose a Workflow

| Work type | Default route | Start here |
|---|---|---|
| New feature | PM/BA → SA → Developer → QA → Release | [new-feature.md](./docs/workflows/new-feature.md) |
| Bug fix | QA/BA → Developer → QA → Reviewer | [bug-fix.md](./docs/workflows/bug-fix.md) |
| CI failure or regression | Debugging discipline → appropriate owner | [ci-failure-debug.md](./docs/workflows/ci-failure-debug.md) |
| Config or data change | BA → Config/Data → QA → Release | [config-change.md](./docs/workflows/config-change.md) / [data-change.md](./docs/workflows/data-change.md) |
| API contract change | BA → SA → Developer → QA → Security when relevant | [role definitions](./docs/workflow/role-definitions.md) |
| Test-only change | QA → Reviewer | [quality gates](./docs/workflow/quality-gates.md) |
| Documentation-only change | Documentation → Reviewer | [post-merge review template](./docs/templates/POST_MERGE_DOCUMENTATION_REVIEW.md) |

The complete routing matrix and skip rules are in [dynamic-routing.md](./docs/workflow/dynamic-routing.md).

## Bug Fix Contract

Bug Fix work uses [docs/contracts/bug-fix-workflow.yaml](./docs/contracts/bug-fix-workflow.yaml) as the canonical policy. It defines allowed task states and transitions, required evidence, and the rework limit.

- A task cannot enter implementation without debugging evidence.
- A task cannot hand off as verified without verification evidence.
- After two `verifying → rework` transitions, the next failed verification must become `blocked` with `stop_reason: human_review_required`.

Validate the examples and task-state fixtures with:

```bash
npm run validate:contracts
```

## Quality, Handoffs, and Documentation

Every meaningful stage should produce a structured artifact and handoff. Use the [handoff template](./docs/templates/HANDOFF.md) and the [quality gates](./docs/workflow/quality-gates.md) instead of informal “done” messages.

After every pull request merge into `main`, GitHub creates a `documentation-sync` follow-up issue for the Documentation Agent. The agent reviews the impact on project index, state, history, changelog, decisions, risks, and canonical/adapter parity from a `codex/documentation-sync/<issue-number>` branch. Use the [post-merge documentation review template](./docs/templates/POST_MERGE_DOCUMENTATION_REVIEW.md) to record the result, then close the issue when its documentation-sync PR merges.

## Where to Go Next

- [PROJECT_INDEX.md](./PROJECT_INDEX.md) — full linked map of rules, workflows, templates, and adapters.
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) — active work, blockers, next quality gate, and recommended agent.
- [TASK_LOG.md](./TASK_LOG.md) — history of completed work and handoffs.
- [CHANGELOG.md](./CHANGELOG.md) — human-facing change history.
- [AGENTS.md](./AGENTS.md) — full cross-platform operating rules.
