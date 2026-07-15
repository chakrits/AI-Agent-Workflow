# PROJECT_STATUS.md

## Current Work Item
- ID: SECURITY-REVIEWER-INSTRUCTION-2026-07-15
- Title: Enrich Security Reviewer with a Django/DRF-adapted scan checklist, a security-specific severity scale, and a fix-before-merge/hardening-opportunity distinction
- Owner: Developer / Implementation Agent
- Status: Implemented, uncommitted — pending review

## Current Stage
- Security Reviewer Instruction / Reviewer Gate

## Change Classification
- Change Type: Documentation and process-governance change with regression coverage
- Risk Level: Low
- Code Change Required: Yes — scoped Node regression coverage
- Architecture Change Required: No — adds review criteria; no code behavior changed
- Security Review Required: No (this work item defines the Security Reviewer's own criteria; nothing to self-review against yet)

## Completed
- Engineering discipline skills batch (`4e2fd98`, committed and pushed to `origin/main`): new `git-workflow-and-versioning` skill, `AGENTS.md` Change Sizing, and enrichments to `tdd-implementation`/`code-review-gate`/`implementation-planning`.
- Reviewed four external `agency-agents` security-persona references (Penetration Tester, Security Architect, AppSec Engineer, Senior SecOps Engineer) per explicit instruction to judge on underlying concept, not stack match, then adapt to this project's Django/DRF/PostgreSQL stack.
- Excluded Penetration Tester almost entirely — it assumes a live, externally-authorized offensive engagement against a deployed target with real attack tooling, which this documentation-driven workflow has no equivalent of. Kept one concept: chained-findings review discipline (a set of low-severity findings can compose into a high-severity path).
- Synthesized Security Architect + AppSec Engineer + Senior SecOps Engineer into four Django-adapted concepts: a concrete Scan Checklist (hardcoded secrets/insecure fallbacks, `DEBUG = True`, raw-SQL ORM bypass, `CORS_ALLOW_ALL_ORIGINS`, missing DRF `permission_classes`/`authentication_classes`, sensitive data in logs/URLs, missing throttling on auth endpoints), a security-specific Severity Scale (Critical/High/Medium/Low/Informational, distinct from `code-review-gate`'s generic taxonomy), a Fix-Before-Merge vs Hardening-Opportunity rule (Critical/High block, matching `AGENTS.md`'s existing Stop Conditions; Medium/Low log and route to Developer Agent without blocking), and Chained Findings.
- Deliberately skipped a full STRIDE threat-model template (from Security Architect) as too heavy for this repo's scale, per explicit user instruction to skip it.
- Added the four rules to the canonical Security Reviewer section in `docs/workflow/role-definitions.md`.
- Restated the same four rules (briefly) in `.claude/agents/security-reviewer.md`.
- Enriched `.agents/skills/security-review/SKILL.md` (previously a skeletal purpose+instruction stub) with the same Scan Checklist and Severity Scale as the operational content the skill actually runs.
- Expanded `docs/templates/SECURITY_REVIEW.md` from a blank Summary/Details stub into a Scope section, a Scan Checklist table, and a Findings table (ID/Severity/Description/Fix-Before-Merge?/Status) — matching the pattern used for `TEST_PLAN.md` during QA Agent's enrichment.
- Added regression coverage in `test/validate-contracts.test.mjs`; verified it is not tautological (temporarily weakened the Fix-Before-Merge wording, confirmed FAIL, restored, confirmed PASS) — 31/31 tests passing.

## In Progress
- Independent review of the Security Reviewer rules, skill enrichment, template change, and regression coverage before commit.

## Blockers / Open Questions
- Three follow-up opportunities remain identified but deliberately deferred, not started: (1) a "Prototype/Spike" workflow route in `AGENTS.md`; (2) a Release Agent enrichment (two seeds waiting: DevOps Automator concepts, and SemVer/tag/changelog-for-humans content); (3) whether a shared cross-role template pattern should be extracted now that eight roles follow the same canonical/adapter structure.
- Three roles remain under-specified in `docs/workflow/role-definitions.md`: Config Agent, Data Agent, Release Agent.
- `docs/operating-model/SKILL_CATALOG.md` was found out of sync with `.agents/skills/` during earlier exploration (stale `playwright-qa` path, missing `ba-requirement-analysis`/`sa-architecture-design`/`data-config-change` entries) — still open, not fixed.
- A lighter STRIDE-style trust-boundary note (deferred, not a full threat-model template) remains an unscheduled idea if the user wants to revisit it later.

## Required Artifacts
- `docs/workflow/role-definitions.md` (canonical Security Reviewer section)
- `.claude/agents/security-reviewer.md`
- `.agents/skills/security-review/SKILL.md`
- `docs/templates/SECURITY_REVIEW.md`
- `test/validate-contracts.test.mjs`

## Next Quality Gate
- Reviewer confirms the canonical rule, Claude adapter, and skill all agree, that the Severity Scale is genuinely distinct from `code-review-gate`'s taxonomy rather than a duplicate, and that the regression test is meaningful.

## Recommended Next Agent
- Reviewer, then Human to select the next work item (Config Agent, Data Agent, Release Agent, or a deferred follow-up idea).

## Notes
- This work item intentionally excluded Penetration Tester's live-engagement content (recon tooling, AD attack chains, cloud exploitation, physical/social engineering) — no deployed target system exists in this workflow to test.
- This work item intentionally skipped the full STRIDE threat-model template per explicit user instruction, to avoid over-engineering relative to this repo's scale.
- R-001 is closed; see `RISKS.md` for the closure note.
