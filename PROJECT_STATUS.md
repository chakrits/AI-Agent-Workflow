# PROJECT_STATUS.md

## Current Work Item
- ID: CONFIG-DATA-AGENT-INSTRUCTION-2026-07-15
- Title: Enrich Config Agent and Data Agent together — boundary between them, stack-specific mechanics, and an escalation guard against disguised code changes
- Owner: Developer / Implementation Agent
- Status: Implemented, uncommitted — pending review

## Current Stage
- Config Agent / Data Agent Instruction / Reviewer Gate

## Change Classification
- Change Type: Documentation and process-governance change with regression coverage
- Risk Level: Low
- Code Change Required: Yes — scoped Node regression coverage
- Architecture Change Required: No — cross-references SA Agent's Data Migration Safety and Security Reviewer's Scan Checklist rather than redefining them; no code behavior changed
- Security Review Required: No

## Completed
- Release Agent instruction (implemented this session, uncommitted from the prior turn, now bundled forward — see below).
- Proposed both Config Agent and Data Agent as one batch because their content depends on each other (the Config vs Data boundary needs to be written once, consistently, from both sides) and because the user gave a specific rationale: these two roles exist so a code-free config/master-data change can skip PM and Developer Agent entirely (already true in `AGENTS.md`'s Config Change / DB Data Change flows and Skip Rules) — the enrichment should make that shortcut safe, not just faster.
- Config Agent: added Config vs Data Boundary (behavior-controlling vs displayed/referenced information), Restart-Required vs Hot-Reloadable (Django settings read at process start vs a DB-backed flag), Feature Flag Lifecycle (owner + removal condition required), and an Escalation Guard (stop and route to Orchestrator/SA Agent if the change turns out to need code beyond the config value — added at the user's explicit request after they explained the Skip-PM/Skip-Dev rationale, to keep the shortcut from being misused to bypass code review).
- Data Agent: added Non-Destructive Mechanics (transaction-wrapped, idempotent `ON CONFLICT DO UPDATE` upsert, stated row-count delta), a Boundary vs SA Agent's Data Migration Safety (DML vs DDL — Data Agent does not author Django migration files), Idempotent Re-run Safety, PII Routing (to Security Reviewer, before execution, not just noted in the plan), and the same Escalation Guard pattern.
- Added all rules to the canonical sections in `docs/workflow/role-definitions.md`, restated (briefly) in `.claude/agents/config-agent.md` and `.claude/agents/data-agent.md`.
- Enriched the shared `.agents/skills/data-config-change/SKILL.md` (previously a skeletal stub) with the Config vs Data Boundary, Escalation Guard, and both roles' stack-specific rules as the operational content the skill runs.
- Expanded `docs/templates/CONFIG_CHANGE_PLAN.md` (Reload Behavior column, Feature Flags table, Escalation Check) and `docs/templates/DATA_CHANGE_PLAN.md` (Touches PII field, Escalation Check, expected row-count delta, idempotency reminders in the SQL blocks).
- Added regression coverage for both roles in `test/validate-contracts.test.mjs`; verified each is not tautological (temporarily weakened a required phrase in each adapter, confirmed FAIL, restored, confirmed PASS) — 34/34 tests passing.

## In Progress
- Independent review of the Config Agent and Data Agent rules, shared skill enrichment, template changes, and regression coverage before commit.

## Blockers / Open Questions
- The Release Agent work from the prior turn and this Config/Data Agent work are both uncommitted in the same working tree — confirm whether to commit them as one combined commit or two separate commits before pushing.
- Two follow-up opportunities remain identified but deliberately deferred, not started: (1) a "Prototype/Spike" workflow route in `AGENTS.md`; (2) whether a shared cross-role template pattern should be extracted now that all 11 roles (once this lands) follow the same canonical/adapter structure.
- All 11 roles will be enriched once this work item is committed — this closes the role-enrichment initiative that ran through this session.
- `docs/operating-model/SKILL_CATALOG.md` was found out of sync with `.agents/skills/` during earlier exploration (stale `playwright-qa` path, missing `ba-requirement-analysis`/`sa-architecture-design`/`data-config-change` entries) — still open, not fixed.

## Required Artifacts
- `docs/workflow/role-definitions.md` (canonical Config Agent and Data Agent sections)
- `.claude/agents/config-agent.md`, `.claude/agents/data-agent.md`
- `.agents/skills/data-config-change/SKILL.md`
- `docs/templates/CONFIG_CHANGE_PLAN.md`, `docs/templates/DATA_CHANGE_PLAN.md`
- `test/validate-contracts.test.mjs`

## Next Quality Gate
- Reviewer confirms the Config vs Data boundary is stated consistently in both roles, that Data Agent's boundary against SA Agent's migration rule is correctly cross-referenced rather than redefined, and that both regression tests are meaningful.

## Recommended Next Agent
- Reviewer, then Human to decide the commit/push plan and select the next area of focus now that all 11 roles are enriched (e.g. the two deferred follow-up ideas, or a fresh area).

## Notes
- R-001 is closed; see `RISKS.md` for the closure note.
