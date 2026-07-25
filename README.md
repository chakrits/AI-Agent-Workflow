# AI Agent Dynamic Workflow

A cross-platform, contract-first workflow kit for software teams that use AI agents. It helps an agent decide **what kind of work this is**, choose the **smallest safe workflow**, produce reviewable artifacts, and stop at the right human approval gates.

The shared process is not tied to one tool. Codex, Claude Code, Antigravity, and compatible agents use the same canonical rules under `docs/`; their platform-specific files are adapters.

## What You Get

- Dynamic routing instead of a fixed PM → BA → SA → Developer → QA pipeline.
- All 11 roles — Orchestrator, PM, BA, SA, Developer, QA, Security Reviewer, Config, Data, Release, and Documentation — have concrete, regression-tested canonical rules, not just a one-line description.
- Required quality gates, structured handoffs, and explicit human approval boundaries.
- Two machine-checkable workflow contracts (Bug Fix + New Feature): legal states, evidence requirements, retry limits, and human escalation.
- 25 portable skills mirrored across 3 platform adapters (`.agents/`, `.claude/`, `.agent/`), with CI-enforced byte-identical parity.
- 27 reusable templates for briefs, requirements, designs, test plans, handoffs, completion checks, security/release reviews, post-merge documentation reviews, work item records, and lessons learned.
- Hosted CI on both GitHub Actions and GitLab CI, running 10 validation checks on every push and pull/merge request.
- Lifecycle labels (`phase:*`, `status:*`) and an automated PR/Issue readiness gate that blocks merge until the Work Item lifecycle is consistent.
- A [GitHub Project Kanban board](https://github.com/users/chakrits/projects/3) mapping `phase:*` labels to Todo / In Progress / Done columns for visual work tracking.
- An in-repo, merge-gated dispatch-receipt ledger for cross-turn agent handoffs, with CI-enforced matching and a loop-safety circuit breaker.
- Work Item records (`docs/records/work-items/`) that link each GitHub Issue to its SDD, PRs, postmortem, and lessons learned — bidirectional traceability in the Obsidian vault.
- A Lessons Learned vault (`docs/records/lessons-learned/`) with a structured template for session retrospectives.
- A Framework Metrics dashboard (`npm run validate:metrics`) that parses TASK_LOG and reports rework rate, subagent timeout rate, test growth trend, and more.
- A Context Budget validator (`npm run validate:context-budget`) that measures the token cost of canonical reading files — currently ~25,900 tokens across 8 files.
- 12 Architecture Decision Records (ADRs) with a CI-enforced 10:1 ratio check against TASK_LOG decisions.
- 7 tracked risks with a CI-enforced validation gate.
- Local housekeeping tooling: worktree cleanup and a one-command reset back to a blank template baseline for a new team's own clone.

## Project Structure

```text
AI-Agent-Workflow/
├── README.md                 # Start here: overview and quick start
├── AGENTS.md                 # Cross-platform rules, routing, and approval gates
├── PROJECT_INDEX.md          # Linked map of the repository
├── PROJECT_STATUS.md         # Current work item, blockers, and next agent
├── TASK_LOG.md               # Work history and handoff trail
├── DECISIONS.md              # Architecture and process decisions (12 ADRs)
├── RISKS.md                  # Owned risks and follow-ups (7 tracked risks)
├── CHANGELOG.md              # Human-facing change history
├── docs/
│   ├── operating-model/      # Operating model, skill catalog, evaluation checklist,
│   │                         #   context budget, metrics baseline
│   ├── workflow/             # Canonical roles, routing, quality gates, handoffs
│   ├── workflows/            # Playbooks for features, bugs, CI, config, and data
│   ├── contracts/            # Bug Fix + New Feature contracts, schemas, examples, fixtures
│   ├── templates/            # 27 reusable artifacts (incl. WORK_ITEM.md, LESSONS_LEARNED.md)
│   ├── records/              # Durable completion/review records, typed and dated:
│   │                         #   work-items/, lessons-learned/, sdd/, requirements/,
│   │                         #   security-review/, implementation-plan/, handoff/,
│   │                         #   qa/, postmortem/, dispatch-receipts/, misc/
│   ├── superpowers/          # Approved designs (specs/) and implementation plans (plans/)
│   └── vault/                # Obsidian knowledge-base index
├── .agents/                  # Portable skills (25) and workflow adapters
├── .claude/                  # Claude Code agent and skill adapters
├── .agent/                   # Antigravity CLI skill adapters
├── .codex/                   # Codex host adapters (e.g. in-turn dispatch supervision)
├── .githooks/                # Optional local git hooks (see Housekeeping below)
├── .obsidian/                 # Obsidian vault config (the whole repo is the vault root)
├── .worktrees/                # Local git worktrees for parallel branch work — gitignored, not shipped
├── test/                     # Regression checks (201 tests)
├── scripts/                  # 14 validators + housekeeping + reset scripts
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

Both commands should exit clean. This is the same check hosted CI runs on every push and pull/merge request — on GitHub Actions ([.github/workflows/validate-contracts.yml](./.github/workflows/validate-contracts.yml)) and on GitLab CI ([.gitlab-ci.yml](./.gitlab-ci.yml)), whichever platform this repo is hosted on. For lifecycle labels and platform-specific readiness operations, see [Platform Readiness Operations](./docs/workflow/platform-readiness.md).

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
| Vague idea / early-stage feature request | requirement-brainstorming → BA → SA → implementation-planning | [feature-discovery-to-plan.md](./docs/workflows/feature-discovery-to-plan.md) |
| New feature | PM/BA → SA → Developer → QA → Release | [new-feature.md](./docs/workflows/new-feature.md) |
| Bug fix | QA/BA → Developer → QA → Reviewer | [bug-fix.md](./docs/workflows/bug-fix.md) |
| CI failure or regression | Debugging discipline → appropriate owner | [ci-failure-debug.md](./docs/workflows/ci-failure-debug.md) |
| Config or data change | BA → Config/Data → QA → Release | [config-change.md](./docs/workflows/config-change.md) / [data-change.md](./docs/workflows/data-change.md) |
| API contract change | BA → SA → Developer → QA → Security when relevant | [role definitions](./docs/workflow/role-definitions.md) |
| Test-only change | QA → Reviewer | [quality gates](./docs/workflow/quality-gates.md) |
| Documentation-only change | Documentation → Reviewer | [post-merge review template](./docs/templates/POST_MERGE_DOCUMENTATION_REVIEW.md) |
| Framework / meta change (routing rules, skill boundaries, operating model) | Orchestrator → Documentation → Reviewer/QA → Human Approval | [stabilize-core.md](./docs/workflows/stabilize-core.md) |

The complete routing matrix and skip rules are in [dynamic-routing.md](./docs/workflow/dynamic-routing.md).

## Workflow Contracts

Two workflow types have machine-checkable YAML contracts with JSON Schema validation, example fixtures, and regression tests:

| Contract | States | Rework budget | File |
|---|---|---|---|
| Bug Fix | 7 (intake → investigating → implementing → verifying → rework → handoff → blocked) | 2 | [bug-fix-workflow.yaml](./docs/contracts/bug-fix-workflow.yaml) |
| New Feature | 10 (intake → discovery → designing → planning → implementing → verifying → rework → human-review → blocked → release) | 1 | [new-feature-workflow.yaml](./docs/contracts/new-feature-workflow.yaml) |

Validate the contracts and fixtures with:

```bash
npm run validate:contracts
```

## Skills

25 portable skills are mirrored byte-identically across `.agents/skills/`, `.claude/skills/`, and `.agent/skills/`. CI enforces md5 parity on every push.

Key skills include: `dynamic-workflow`, `tdd-implementation`, `verification-before-completion`, `code-review-gate`, `debugging-discipline`, `documentation-closeout`, `requirement-brainstorming`, `implementation-planning`, `git-workflow-and-versioning`, and more.

Browse the full catalog at [SKILL_CATALOG.md](./docs/operating-model/SKILL_CATALOG.md).

## CI Validation Checks

Every push and pull/merge request runs 10 validation checks:

| Check | Command | What it validates |
|---|---|---|
| Contracts | `npm run validate:contracts` | Bug Fix + New Feature contract YAML, schemas, fixtures |
| Project state | `npm run validate:project-state` | PROJECT_STATUS.md required fields |
| Skill parity | `npm run validate:skill-parity` | 25 skills byte-identical across 3 platforms |
| Skill usage | `npm run validate:skill-usage` | New TASK_LOG entries (post-2026-07-25) have skill notation |
| Review gate | `npm run validate:review-gate` | PRs with `.mjs`/`.js` changes have a code review record |
| ADR audit | `npm run adr:audit` | ADR-to-decision ratio ≤ 10:1 |
| Risk register | `npm run validate:risk-register` | RISKS.md is current |
| Worktree audit | `npm run housekeeping:worktrees` | No ghost worktrees |
| Context budget | `npm run validate:context-budget` | Canonical reading files ≤ 30,000 tokens |
| Framework metrics | `npm run validate:metrics` | Dashboard: rework rate, timeout rate, test trend |

## Work Item Traceability

Every GitHub Issue gets a Work Item Record at `docs/records/work-items/YYYY-MM-DD-issue-NN.md` using the [WORK_ITEM.md](./docs/templates/WORK_ITEM.md) template. This record links the Issue to its SDD, PRs, postmortem, and lessons learned — providing bidirectional traceability in the Obsidian vault graph.

**Important:** Use `Closes #NN` only in the terminal closeout PR. Intermediate PRs (sub-PRs, project status updates, docs) must NOT contain `Closes #NN` — GitHub auto-closes the issue on merge regardless of whether implementation is complete.

## Lessons Learned

Session retrospectives are recorded at `docs/records/lessons-learned/YYYY-MM-DD-session.md` using the [LESSONS_LEARNED.md](./docs/templates/LESSONS_LEARNED.md) template. Each entry links back to its Work Item Record and captures: lessons, metrics snapshot, and whether Hermes memory / skills were updated.

## Quality, Handoffs, and Documentation

Every meaningful stage should produce a structured artifact and handoff. Use the [handoff template](./docs/templates/HANDOFF.md) and the [quality gates](./docs/workflow/quality-gates.md) instead of informal "done" messages.

Before a pull request or merge request targets `main`, complete its Documentation Impact assessment and include affected documentation updates in the same change. GitHub validates the completed PR-template marker; GitLab provides the equivalent MR template. After merge, the project-state audit creates a `documentation-sync` issue only when it detects stale state. Use the [post-merge documentation review template](./docs/templates/POST_MERGE_DOCUMENTATION_REVIEW.md) only for that exception, then close the issue when its correction PR merges.

## Housekeeping

This repo accumulates local git worktrees (under `.worktrees/`, gitignored) as agents branch off to work on parallel Issues. Two scripts keep that manageable:

```bash
# List worktrees whose branch no longer exists on origin (merged/deleted) — dry run, safe to run anytime
npm run housekeeping:worktrees

# Actually remove the ones flagged as prunable
npm run housekeeping:worktrees -- --prune
```

Optionally enable a local git hook that warns about prunable worktrees after every merge/pull on `main` (informational only — it never deletes anything on its own):

```bash
git config core.hooksPath .githooks
```

### Resetting to a blank template

If you're starting a new project from a clone of this repo, `PROJECT_STATUS.md`, `TASK_LOG.md`, `CHANGELOG.md`, `RISKS.md`, and every file under `docs/records/*/` and `docs/superpowers/{specs,plans}/` still carry this repo's own history. Reset them to a blank baseline before your first commit:

```bash
# Preview what would change — nothing is modified
npm run reset:template

# Actually apply the reset
npm run reset:template -- --apply
```

This never touches the canonical workflow itself (`AGENTS.md`, `docs/workflow/`, `docs/templates/`, `.claude/`, `.agents/`, `.agent/`, `.codex/`, skills, or CI config) — only this repo's own accumulated project data.

## Knowledge Base (Obsidian)

The whole repo is a valid [Obsidian](https://obsidian.md/) vault (`.obsidian/` sits at the root). Open the repo root as a vault to get backlinks and a graph view across `docs/workflow/`, `docs/records/`, and every role/skill adapter. Start at [docs/vault/00-Index.md](./docs/vault/00-Index.md) — Obsidian hides dotfolders (`.claude/`, `.agents/`, `.agent/`, `.codex/`) from its file browser by default, so the index note is the reliable entry point into adapter files that live there.

The vault graph connects: GitHub Issues → Work Item Records → SDDs → PRs → Postmortems → Lessons Learned.

## Where to Go Next

- [PROJECT_INDEX.md](./PROJECT_INDEX.md) — full linked map of rules, workflows, templates, and adapters.
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) — active work, blockers, next quality gate, and recommended agent.
- [TASK_LOG.md](./TASK_LOG.md) — history of completed work and handoffs.
- [CHANGELOG.md](./CHANGELOG.md) — human-facing change history.
- [DECISIONS.md](./DECISIONS.md) — 12 architecture and process decisions.
- [RISKS.md](./RISKS.md) — 7 tracked risks and mitigations.
- [AGENTS.md](./AGENTS.md) — full cross-platform operating rules.
