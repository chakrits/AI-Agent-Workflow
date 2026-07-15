# PROJECT_STATUS.md

## Current Work Item
- ID: QA-PLAYWRIGHT-BDD-WORKFLOW-2026-07-15
- Title: Add a BDD Scenario Workflow (playwright-bdd) to qa-playwright-testing
- Owner: Documentation Agent
- Status: Implemented, uncommitted — pending review

## Current Stage
- Skill Enrichment / Reviewer Gate

## Change Classification
- Change Type: Documentation-only skill enrichment
- Risk Level: Low
- Code Change Required: Yes — regression coverage extended in the same existing test
- Architecture Change Required: No
- Security Review Required: No

## Completed
- Technical Playwright reference, debugging workflow, and browser-content security boundary added to `qa-playwright-testing` (`QA-PLAYWRIGHT-TESTING-ENRICHMENT-2026-07-15`, same working tree, uncommitted — see Blockers).
- GitLab CI parity and README onboarding update (`GITLAB-CI-AND-README-ONBOARDING-2026-07-15`, same working tree, uncommitted — see Blockers).
- Skill catalog sync (`SKILL-CATALOG-SYNC-2026-07-15`, same working tree, uncommitted — see Blockers).
- User pointed to `vitalets/playwright-bdd` — a real, actively maintained npm package (converts Gherkin `.feature` files into native Playwright tests) that ships its own official agent skill for AI-driven BDD workflows, a higher-confidence source than the persona references reviewed in earlier rounds.
- Assessed fit: BDD scenarios are a different artifact from `functional-test-design`'s test-case tables (design/analysis) — Gherkin scenarios belong to `qa-playwright-testing` (E2E automation) specifically when BDD is requested, not by default. Flagged explicitly to the user that this names a specific tool (`playwright-bdd`) as the project's recommended BDD approach — a bigger call than a generic technique — and got confirmation before implementing.
- Added a **BDD Scenario Workflow** section to `.agents/skills/qa-playwright-testing/SKILL.md`: a Necessity Check (ask before writing any `.feature` file — BDD is opt-in, not default), a Scenario Approval Gate (show the exact Gherkin diff/content and get explicit approval before any implementation plan — mirrors the approval-before-implementation pattern already used across BA/PM/QA), Scenario Writing Rules (E2E flows with meaningful outcomes, minimal scenario count, reuse steps, business-aware step names, DataTables for repeated inputs), Scoped Step Definitions (`@`-prefixed directories), and the verification command (`npx bddgen && npx playwright test`).
- Extended the existing `qa-playwright-testing` regression test (added assertions rather than a new test, since it's the same file) rather than duplicating it; verified non-tautological (temporarily changed the "Necessity Check" heading, confirmed FAIL, restored, confirmed PASS) — 36/36 tests passing.

## In Progress
- Independent review of the BDD Scenario Workflow addition, alongside the three other pending `qa-playwright-testing`/onboarding/catalog work items in the same working tree, before commit.

## Blockers / Open Questions
- Four work items (`QA-PLAYWRIGHT-TESTING-ENRICHMENT-2026-07-15`, `GITLAB-CI-AND-README-ONBOARDING-2026-07-15`, `SKILL-CATALOG-SYNC-2026-07-15`, and this one) are all uncommitted in the same working tree — confirm commit/push plan.
- `.gitlab-ci.yml` has not been validated against a live GitLab runner (no GitLab instance available in this environment).
- Two follow-up opportunities remain identified but deliberately deferred, not started: (1) a "Prototype/Spike" workflow route in `AGENTS.md`; (2) whether a shared cross-role template pattern should be extracted now that all 11 roles follow the same canonical/adapter structure.

## Required Artifacts
- `.agents/skills/qa-playwright-testing/SKILL.md`
- `test/validate-contracts.test.mjs`

## Next Quality Gate
- Reviewer confirms the BDD Scenario Workflow's boundary against `functional-test-design` is stated clearly (BDD is opt-in, not a replacement), that the Scenario Approval Gate is consistent with this repo's existing approval-before-implementation pattern, and that the regression coverage is meaningful.

## Recommended Next Agent
- Reviewer, then Human to confirm the combined commit/push plan for all four pending work items.

## Notes
- R-001 is closed; see `RISKS.md` for the closure note.
