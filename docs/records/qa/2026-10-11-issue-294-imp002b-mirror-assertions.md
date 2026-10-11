# IMP-002B — Retire mandatory live skill mirror assertions

## Scope / authorization
Issue #294; Human-approved IMP-002 continuation, 2026-10-11.
Baseline: `347cbac8e4dc9b3ec049d39ce102595d6ecd418c`.
Done when: the nine pure mirror tests are retired, retained core/mixed test bodies unchanged, focused/full regression passes, and drift diagnostics still return a truthful failure.
May proceed through: approved test retirement and records/commit/push. Must stop for: new scope/security-policy decisions or human merge. Assumptions: none added.
First two slices of IMP-002 are implemented; remaining skill-content/mixed/AC-14/playbook work is pending. This checkpoint is not independent QA acceptance.

## Exact retirement manifest
Baseline one-based starts in `test/validate-contracts.test.mjs`:

| Start | Retired assertion |
|---|---|
| 1172 | .agent/skills/ and .agents/skills/ carry identical skill directory names, with byte-identical content for the skills this work touches |
| 1266 | test-tooling skill template files are byte-identical across all three platforms |
| 1278 | the three new test-tooling skills are byte-identical SKILL.md across all three platforms |
| 1362 | the 7 new API skills are byte-identical SKILL.md across all three platforms |
| 1383 | the new Postman collection template is byte-identical across all three platforms |
| 1473 | the 4 new Developer Agent skills are byte-identical SKILL.md across all three platforms |
| 1893 | test-quality-discipline SKILL.md is byte-identical across all three platforms after the Issue #149 TC-ID checklist addition |
| 1903 | functional-test-design SKILL.md is byte-identical across all three platforms after the Issue #143 technique expansion |
| 1930 | defect-analysis SKILL.md is byte-identical across all three platforms (Issue #152) |

Removed the sole-consumer `newTestingSkillTemplatePaths` constant and unused `readdir` import.
Remaining90 test bodies are byte-identical to baseline99 bodies; exactly9 tests retired. No mixed/core assertion altered.
The static-review limits test (baseline961), browser-content trust boundary, secret incident-response and release rollback checks remain untouched. All30 synthetic catalog/parity/usage tests remain unchanged.
No skill content, core policy, catalog, vault, source matrix, production validator, CI/hook/reset caller, dependency or readiness configuration changed.

## Reproduction and evidence
Created a disposable archive from baseline with `git archive HEAD | tar -x -C <mktemp-directory>`; copied installed locked dependencies.
Only fixture mutation: insert `Platform-specific contributor note for the isolated Issue 294 mirror probe.` after the title of `.claude/skills/python-unit-testing/SKILL.md`. Canonical and Antigravity copies are unchanged.

| Stage / command | Observed outcome |
|---|---|
| RED: baseline `node --test test/validate-contracts.test.mjs` in probe | 99 tests:98 pass/1 fail; byte-equality test at1278 reports Claude python skill differs from canonical; exit1 |
| GREEN: copy candidate contract test file into same probe; rerun same command | 90 tests:90 pass/0 fail/skip; exit0 |
| Diagnostic negative: `node scripts/validate-skill-parity.mjs` in same probe | 38 in sync/1 drifted or missing; check FAILED; exit1 |
| Candidate focused: contract tests + three synthetic skill-validator test files | 120/120 pass; exit0 |
| Candidate full: `npm test -- --test-reporter=tap` | 786/786 pass; 0 fail/skip; exit0, authorized execution permits readiness temporary fixture writes |
| Contracts/context compatibility/CI parity/diff whitespace | exit0; corpus and matrix valid |

After synchronizing candidate test file, `diff -qr --exclude=node_modules --exclude=.git <candidate-worktree> <probe>` reported only the Claude python skill file. No companion/catalog/vault/core edit hid the drift.
The parity command deliberately remains a failing diagnostic in this negative case; no `|| true`, skip or blanket error suppression was added. It is still invoked by mandatory CI until approved IMP-004.
Raw execution results observed in this session, not immutable hosted logs. Archive probes are not final exact-candidate Git clones; full acceptance harness and independent QA remain IMP-006.

## Checkpoint evaluation
Scope/source grounding, artifact/evidence, minimal diff, safety boundary and next action checked using Agent Evaluation Checklist. TDD uses the fresh RED/GREEN probe and retained real diagnostic negative. No new production logic or dependency.
CHANGES MADE: pure live mirror tests and their sole-use helper/import, records.
NOTICED BUT NOT TOUCHING: remaining skill-prose and mixed-policy coupling; source matrix, CI and readiness.
CONCERNS: current CI still rejects drift; this is deliberate intermediate state, not completed contributor decoupling.

## Next owner / action
Developer continues IMP-002: pure content assertions, mixed splits, AC-14 consumers, playbook reachability. Preserve/migrate core safety coverage before retiring safety-content tests.
Independent Reviewer/QA/Security verifies final candidate at IMP-006. All Issue acceptance outcomes stay Pending; human merge remains mandatory.
