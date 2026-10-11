# Technical Design Document — Issue #294

## Metadata
- Work Item: https://github.com/chakrits/AI-Agent-Workflow/issues/294
- Owner: SA/Developer; Status: Draft, not implementation authorization.
- TDD here means Technical Design Document. Test-driven red/green steps below describe future implementation, not completed tests.
- Baseline: `87a0917f1c56859926097468c99023918dd314a7`; [SDD](../sdd/2026-10-11-issue-294-skill-library-decoupling-sdd.md).

## Implementation Plan
Follow IMP-001–IMP-006 in the [Implementation Plan](../implementation-plan/2026-10-11-issue-294-skill-library-decoupling.md). Land coherent, green slices; do not disable CI first and repair tests in a later PR. The old closed inventory remains authoritative until an approved slice retires its corresponding requirement.

## Files / Modules Expected to Change

| Component | Exact candidate files | Proposed change |
|---|---|---|
| Live library assertions | `test/validate-contracts.test.mjs`, `test/issue-237-ac14-consumers.test.mjs`, `test/validate-workflow-playbooks.test.mjs` | Separate library/domain/mirror/prose/index assertions from retained core contract assertions |
| CI presence assertions | `test/validate-ci-parity.test.mjs` | Replace required catalog invocation with absence-from-mandatory-path checks; keep generic parity tests |
| Optional diagnostics | `scripts/validate-skill-{catalog,parity,usage}.mjs`, `package.json`, associated unit tests | Preserve pure algorithms; expose manual audit commands without automatic invocation |
| Matrix validator/shadow | `scripts/lib/context-compatibility-v1.mjs`, `scripts/lib/context-shadow-adapter.mjs` | Core-only v3 matrix, route-only mapping, no catalog read; preserve core rejection/fallback |
| Current fixtures | `test/fixtures/context-pack-v1/required-source-matrix.json`, dependent vectors/specimens when they embed current source sets | Rebuild current core-only sources; preserve historical records |
| Compatibility tests | `test/validate-context-compatibility.test.mjs`, `test/context-shadow-adapter.test.mjs`, `test/repin-source-matrix.test.mjs` | v3 current contract and fixture-based historical checks; core negatives remain |
| Budget/edit guards | `scripts/validate-context-budget.mjs`, `scripts/validate-edit-guards.mjs`, `test/validate-context-budget.test.mjs`, `test/edit-guards.test.mjs` | Exclude library/catalog; core edits still get existing feedback |
| CI/hook/reset | `.github/workflows/validate-contracts.yml`, `.gitlab-ci.yml`, `.claude/settings.json`, `scripts/verify-reset-template.mjs`, relevant containment/setup tests | Remove mandatory skill invocations across all callers together |
| Policy | `AGENTS.md`, `docs/workflow/core-bootloader.md`, `docs/workflow/role-definitions.md`, matching role contexts, `docs/workflow/quality-gates.md` | Required core behaviors independent of optional skill selection |
| Discovery/docs | `docs/operating-model/{SKILL_CATALOG,CONTEXT_BUDGET,AGENT_EVALUATION_CHECKLIST,README}.md`, `docs/vault/00-Index.md`, `docs/workflows/stabilize-core.md`, affected workflow guidance | Optional editorial indexes/work-instruction references, no required listing/mirroring |
| New verification seams | `test/skill-decoupling-contract.test.mjs`, `scripts/verify-skill-decoupling.mjs` | Fast synthetic/config contract tests; separate explicitly invoked QA clone harness |

This is a discovery-backed file set, not permission for unrelated rewrites. Before each slice run `rg` over production callers/tests and add any newly discovered dependency to its report.

## Detailed Steps

1. Classify each existing assertion as core-runtime/core-policy versus optional-library bookkeeping. Mixed tests must retain core assertions. Pin before/after test manifest to show what was retired and why.
2. Add contributor-decoupling probes to controlled temporary repositories. Establish RED using missing mirrors/catalog entries and edited pinned skill; then retire only obsolete conditions. Pure diagnostic unit tests remain independent of live inventory.
3. Author source-matrix/v3 rows: boot = `[AGENTS.md, core-bootloader.md]`; on-demand = boot plus four shared core sources (role definitions, quality gates, handoff, evaluation checklist) plus existing role route document. Set reserved allowedSkillIds empty. Remove skill/catalog membership/path/hash loops and unconditional catalog read.
4. Retain exact core paths/order, row-role/mode counts, SHA syntax and byte match, allowed trigger reasons, authority and fallback checks. Reject old v2 at current boundary. Adapt current packs from v3 rows; do not edit immutable historical evidence.
5. Exclude catalog from budget and edit-trigger lists; leave core limits unchanged. Editing any optional instruction must schedule no repin/budget/parity guard. Core-source repin behavior remains tested. `.claude/agents` role adapters remain a separate core concern.
6. Keep optional diagnostic algorithms as manual `audit:skills` and `audit:skill-usage` commands. No automatic invocation from CI, default tests, hooks, or reset. Optional fixture-based unit tests do not run audits on the actual repository.
7. In the same green slice, remove mandatory invocations from GitHub/GitLab and their enforcement tests. Keep generic CI parity. Preserve role-adapter parity for `.*/agents`; it is not skill parity. Remove the redundant role-adapter validator trigger on `.claude/skills` edits.
8. Update policy wording: consult discovered descriptions and specific SKILL.md when useful/available; catalog is optional; fall back to core role requirements. Repin core policy once after this migration. New library edits then change no core hashes.
9. Verify the full contributor matrix, core-negative mutations, and hosted candidate checks. Synchronize Issue evidence only after independent review. Merge/default-branch checks belong to later human-approved integration.

## Unit Test Plan
- Skill diagnostic algorithms: keep synthetic good/bad fixtures and accurate diagnostic results; no live-directory assertion.
- Source matrix: valid v3; missing/stale core source, unknown core path/role, duplicate row, invalid authority, invalid fallback, unsupported v2; all negatives reject.
- Edit guards: library/catalog paths produce no applicable guard; core paths retain repin/budget; role adapter paths retain adapter checks.
- CI command classification: skill commands absent from mandatory graphs; retained GitHub/GitLab commands still match.

## Integration Test Plan
- Disposable git clones preserve exact candidate commit and GitHub origin shape. Apply one library-only edit, run all mandatory commands, record companion-file identity.
- Real PR workflow run at final candidate; verify required readiness check name/source and Issue/QA metadata.
- Post-merge default-branch run is a separate later outcome; an unmerged design cannot supply it.
- Native platform smoke test is optional compatibility evidence with an explicit unavailable reason, not an acceptance substitute.
- The full-command clone harness is explicitly invoked outside default test discovery. A default test must never spawn `npm test` recursively; fast tests inspect controlled fixtures/config contracts only. The harness runs the candidate's actual configured commands and records expected pass/reject outcomes per case.

## Migration / Config / Data Changes
No dependencies, database, credentials, GitHub App configuration, or ruleset changes. Current matrix v2 → v3 is committed together with validator/test changes. Audit npm aliases replace automatic invocations only after their callers are migrated. One migration repin for changed core sources is expected; library edits after migration require none.

## Rollback Considerations
Revert each owning slice in reverse dependency order. Matrix-validator and current fixtures must roll back as a pair. Restore old invocations/tests only with their old requirement; leave readiness protection active. Rollback requires the applicable human decision and does not delete historical evidence.

## Risks
Registry removal can expose optional-library drift; manual audits keep visibility. A careless test split could drop core safety coverage; require retained negative traces. Platform discoverability can differ; record native observations honestly. Core-only budget is a deliberate measurement change, not proof of lower real model tokens.

## Related Artifacts / Links
- [Requirements](../requirements/2026-10-11-issue-294-skill-library-decoupling.md)
- [Test Plan](../qa/2026-10-11-issue-294-skill-library-decoupling-test-plan.md)
- [Evidence](../qa/2026-10-11-issue-294-skill-library-decoupling-evidence.md)
