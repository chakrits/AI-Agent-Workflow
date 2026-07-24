# AI-Agent-Workflow — Knowledge Base Index

This is the entry point for browsing this repo as an Obsidian vault. The vault root is the repo root (`.obsidian/` lives there). Obsidian's file explorer hides dotfolders by default, so `.claude/`, `.agents/`, `.agent/`, and `.codex/` will not appear in the sidebar even though they're part of the vault — every file in those folders is linked explicitly below so you can still open, backlink, and graph them.

## Governance (read these first)

- [[../../AGENTS.md|AGENTS.md]] — cross-platform operating rules, routing policy, boundaries index
- [[../../CLAUDE.md|CLAUDE.md]] — Claude Code-specific read order and subagent policy
- [[../workflow/role-definitions.md|role-definitions.md]] — canonical rules for all 11 roles (source of truth)
- [[../workflow/dynamic-routing.md|dynamic-routing.md]] — routing matrix and skip rules
- [[../workflow/handoff-contract.md|handoff-contract.md]] — terminal handoff / dispatch-receipt contract
- [[../workflow/quality-gates.md|quality-gates.md]] — required gates per stage
- [[../workflow/platform-readiness.md|platform-readiness.md]] — lifecycle labels and readiness gate
- [[../workflow/testing-conventions.md|testing-conventions.md]] — test folder-structure convention for target apps

## Operating Model

- [[../operating-model/AGENT_OPERATING_MODEL.md|AGENT_OPERATING_MODEL.md]]
- [[../operating-model/AGENT_PERSONAS.md|AGENT_PERSONAS.md]]
- [[../operating-model/AGENT_EVALUATION_CHECKLIST.md|AGENT_EVALUATION_CHECKLIST.md]]
- [[../operating-model/SKILL_CATALOG.md|SKILL_CATALOG.md]] — the reconciled index of every skill below

## Role Adapters — Claude Code (`.claude/agents/`)

| Role | Adapter |
|---|---|
| Orchestrator | [[../../.claude/agents/orchestrator-agent.md]] |
| PM | [[../../.claude/agents/pm-agent.md]] |
| BA | [[../../.claude/agents/ba-agent.md]] |
| SA | [[../../.claude/agents/sa-agent.md]] |
| Developer | [[../../.claude/agents/developer-agent.md]] |
| QA | [[../../.claude/agents/qa-agent.md]] |
| Security Reviewer | [[../../.claude/agents/security-reviewer.md]] |
| Config | [[../../.claude/agents/config-agent.md]] |
| Data | [[../../.claude/agents/data-agent.md]] |
| Release | [[../../.claude/agents/release-agent.md]] |
| Documentation | [[../../.claude/agents/documentation-agent.md]] |

## Skills — three portable copies (`.agents/`, `.claude/`, `.agent/`)

Thirteen skills are mirrored across all three platforms (Claude Code, portable, Antigravity); five are role-specific and live only in `.agents/skills/`.

**Mirrored (all three platforms):**

- api-contract-testing — [[../../.agents/skills/api-contract-testing/SKILL.md|portable]] · [[../../.claude/skills/api-contract-testing/SKILL.md|claude]] · [[../../.agent/skills/api-contract-testing/SKILL.md|antigravity]]
- code-review-gate — [[../../.agents/skills/code-review-gate/SKILL.md|portable]] · [[../../.claude/skills/code-review-gate/SKILL.md|claude]] · [[../../.agent/skills/code-review-gate/SKILL.md|antigravity]]
- debugging-discipline — [[../../.agents/skills/debugging-discipline/SKILL.md|portable]] · [[../../.claude/skills/debugging-discipline/SKILL.md|claude]] · [[../../.agent/skills/debugging-discipline/SKILL.md|antigravity]]
- dynamic-workflow — [[../../.agents/skills/dynamic-workflow/SKILL.md|portable]] · [[../../.claude/skills/dynamic-workflow/SKILL.md|claude]] · [[../../.agent/skills/dynamic-workflow/SKILL.md|antigravity]]
- engineering-postmortem — [[../../.agents/skills/engineering-postmortem/SKILL.md|portable]] · [[../../.claude/skills/engineering-postmortem/SKILL.md|claude]] · [[../../.agent/skills/engineering-postmortem/SKILL.md|antigravity]]
- functional-test-design — [[../../.agents/skills/functional-test-design/SKILL.md|portable]] · [[../../.claude/skills/functional-test-design/SKILL.md|claude]] · [[../../.agent/skills/functional-test-design/SKILL.md|antigravity]]
- implementation-planning — [[../../.agents/skills/implementation-planning/SKILL.md|portable]] · [[../../.claude/skills/implementation-planning/SKILL.md|claude]] · [[../../.agent/skills/implementation-planning/SKILL.md|antigravity]]
- mutation-testing — [[../../.agents/skills/mutation-testing/SKILL.md|portable]] · [[../../.claude/skills/mutation-testing/SKILL.md|claude]] · [[../../.agent/skills/mutation-testing/SKILL.md|antigravity]]
- performance-testing — [[../../.agents/skills/performance-testing/SKILL.md|portable]] · [[../../.claude/skills/performance-testing/SKILL.md|claude]] · [[../../.agent/skills/performance-testing/SKILL.md|antigravity]]
- requirement-brainstorming — [[../../.agents/skills/requirement-brainstorming/SKILL.md|portable]] · [[../../.claude/skills/requirement-brainstorming/SKILL.md|claude]] · [[../../.agent/skills/requirement-brainstorming/SKILL.md|antigravity]]
- tdd-implementation — [[../../.agents/skills/tdd-implementation/SKILL.md|portable]] · [[../../.claude/skills/tdd-implementation/SKILL.md|claude]] · [[../../.agent/skills/tdd-implementation/SKILL.md|antigravity]]
- test-quality-discipline — [[../../.agents/skills/test-quality-discipline/SKILL.md|portable]] · [[../../.claude/skills/test-quality-discipline/SKILL.md|claude]] · [[../../.agent/skills/test-quality-discipline/SKILL.md|antigravity]]
- verification-before-completion — [[../../.agents/skills/verification-before-completion/SKILL.md|portable]] · [[../../.claude/skills/verification-before-completion/SKILL.md|claude]] · [[../../.agent/skills/verification-before-completion/SKILL.md|antigravity]]
- git-workflow-and-versioning — [[../../.agents/skills/git-workflow-and-versioning/SKILL.md|portable]] · [[../../.claude/skills/git-workflow-and-versioning/SKILL.md|claude]] · [[../../.agent/skills/git-workflow-and-versioning/SKILL.md|antigravity]]
- ba-requirement-analysis — [[../../.agents/skills/ba-requirement-analysis/SKILL.md|portable]] · [[../../.claude/skills/ba-requirement-analysis/SKILL.md|claude]] · [[../../.agent/skills/ba-requirement-analysis/SKILL.md|antigravity]]
- sa-architecture-design — [[../../.agents/skills/sa-architecture-design/SKILL.md|portable]] · [[../../.claude/skills/sa-architecture-design/SKILL.md|claude]] · [[../../.agent/skills/sa-architecture-design/SKILL.md|antigravity]]
- data-config-change — [[../../.agents/skills/data-config-change/SKILL.md|portable]] · [[../../.claude/skills/data-config-change/SKILL.md|claude]] · [[../../.agent/skills/data-config-change/SKILL.md|antigravity]]
- qa-playwright-testing — [[../../.agents/skills/qa-playwright-testing/SKILL.md|portable]] · [[../../.claude/skills/qa-playwright-testing/SKILL.md|claude]] · [[../../.agent/skills/qa-playwright-testing/SKILL.md|antigravity]]
- security-review — [[../../.agents/skills/security-review/SKILL.md|portable]] · [[../../.claude/skills/security-review/SKILL.md|claude]] · [[../../.agent/skills/security-review/SKILL.md|antigravity]]
- api-testing-tooling — [[../../.agents/skills/api-testing-tooling/SKILL.md|portable]] · [[../../.claude/skills/api-testing-tooling/SKILL.md|claude]] · [[../../.agent/skills/api-testing-tooling/SKILL.md|antigravity]]
- js-unit-testing — [[../../.agents/skills/js-unit-testing/SKILL.md|portable]] · [[../../.claude/skills/js-unit-testing/SKILL.md|claude]] · [[../../.agent/skills/js-unit-testing/SKILL.md|antigravity]]
- python-unit-testing — [[../../.agents/skills/python-unit-testing/SKILL.md|portable]] · [[../../.claude/skills/python-unit-testing/SKILL.md|claude]] · [[../../.agent/skills/python-unit-testing/SKILL.md|antigravity]]

**Role-specific (portable only, `.agents/skills/`):**

- None currently — the five entries previously listed here (`ba-requirement-analysis`, `sa-architecture-design`, `data-config-change`, `qa-playwright-testing`, `security-review`) are verified mirrored across all three platforms and moved to the "Mirrored" list above. `frontend-ui-engineering` is also mirrored and listed in the table above.

## Codex Host Adapters (`.codex/`)

- [[../../.codex/orchestrator-supervision.md]] — in-turn dispatch supervision (Issue #33 contract)

## Records (`docs/records/`, typed and dated — `YYYY-MM-DD-slug.md`)

- [[../records/sdd/|sdd/]] — Solution Design Documents
- [[../records/requirements/|requirements/]] — approved requirements
- [[../records/security-review/|security-review/]] — Security Reviewer records
- [[../records/implementation-plan/|implementation-plan/]] — Developer implementation plans
- [[../records/handoff/|handoff/]] — terminal handoffs and dispatch-receipt inputs
- [[../records/qa/|qa/]] — TDD checklists, completion checks, code-review requests, debug ledgers
- [[../records/postmortem/|postmortem/]] — RCA / postmortem records
- [[../records/misc/|misc/]] — earlier records that predate this taxonomy
- [[../records/dispatch-receipts/|dispatch-receipts/]] — the live cross-turn dispatch-receipt ledger (Issue #35)

## Superpowers designs (`docs/superpowers/`)

- [[../superpowers/specs/|specs/]] — approved brainstorming specs
- [[../superpowers/plans/|plans/]] — approved implementation plans

## Templates (`docs/templates/`)

See the full set in [[../templates/|docs/templates/]] — one reusable artifact template per workflow stage (brief, requirements, SDD, test plan, handoff, completion check, security/release review, post-merge documentation review, and more).

---

*This index is hand-maintained. When a new role adapter, skill, or canonical workflow file is added, add a link here too — Obsidian's graph view is only as complete as this index.*
