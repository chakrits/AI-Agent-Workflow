# PROJECT_STATUS.md

## Current Work Item
- None — repository is idle, awaiting the next assignment.

## Current Stage
- Idle.

## Change Classification
- Change Type: N/A
- Risk Level: N/A
- Code Change Required: N/A
- Architecture Change Required: N/A
- Security Review Required: N/A

## Completed
- Blank-template reset completed through PR #205 (`aa2a871`); historical records remain recoverable from Git history.
- Issue #208 — `reset-to-template` no longer destroys the decision log, and `adr-audit` fails closed when the ADR count drops. Merged via PR #209 (squash) as `e820389`. Independent QA passed at `31b0b13` (518/518, mutation-verified). ADR-0017 and ADR-0019 restored to `DECISIONS.md`; the remaining 16 are recoverable via the command recorded there, by explicit Human Maintainer decision. Evidence: https://github.com/chakrits/AI-Agent-Workflow/issues/208#issuecomment-5551564975
- Issue #210 — GitLab CI now runs the same portable validators as GitHub CI, enforced by `scripts/validate-ci-parity.mjs` wired into both CI files. Merged via PR #211 (squash) as `be15d7b`. Independent QA ran three rounds (503 → 517 tests) before passing: round 1 found a committed `node_modules` symlink and three ways the parity detector could be defeated; round 2 found a fail-open where a renamed GitHub job silently disabled the check; round 3 (continued past the stated 2-round rework ceiling by explicit Human Maintainer decision) found the same guard didn't cover a job restructured to yield zero commands. Final round passed with one non-blocking Minor and one design Question left open below. Evidence: https://github.com/chakrits/AI-Agent-Workflow/issues/210#issuecomment-5551566808
- Issue #214 — `reset-to-template` no longer destroys the risk register, and `validate-risk-register` fails closed when the total risk-entry count drops relative to a prior commit (merge-base + branch-walk comparison, mirroring `adr-audit.mjs`'s `comparisonRefs`). `RISKS.md` itself is unmodified: AC-01 investigation found no currently open Issue cites a specific `RISKS.md` id, so no historical content was restored, per explicit instruction that this data-restoration scope question is a Human Maintainer decision, not a Developer Agent guess. Merged via PR #216 (squash) as `b44c057`. Independent QA passed at `6064154` (542/542, mutation-verified: comparison-walk logic, regression check, and reset guard each individually confirmed load-bearing by deletion) with one non-blocking Question left open below. Evidence: https://github.com/chakrits/AI-Agent-Workflow/issues/214#issuecomment-5551998929
- Issue #215 — `scripts/repin-source-matrix.mjs` (new, `npm run repin:source-matrix`) recomputes and rewrites stale sha256 entries in `test/fixtures/context-pack-v1/required-source-matrix.json`, closing the tooling gap where editing any of the 25 pinned canonical/skill files broke 7 tests with no way to fix it but a hand-computed hash edit. Reuses the existing `sha256(bytes)` helper (newly exported) from `scripts/lib/context-compatibility-v1.mjs` for hash-computation parity with the validator; updates every occurrence of a redundantly-pinned path; fails closed on pre-existing hash inconsistency or format drift; byte-identical no-op when nothing changed. Merged via PR #217 (squash) as `e4bc02b`. Independent QA passed at `ea6767b` (551/551 after merging in Issue #214's closeout, all three load-bearing claims mutation-verified) with two non-blocking Minors on test-quality precision left open below. Evidence: https://github.com/chakrits/AI-Agent-Workflow/issues/215#issuecomment-5552109777

## In Progress
- None.

## Blockers / Open Questions
- Whether to reconstruct any of the 7 historical `RISKS.md` entries destroyed by the resets (despite no currently open Issue citing one by id) is an open data-restoration scope question, explicitly left to the Human Maintainer per Issue #214's routing comment. Not decided or guessed at in that diff.
- Design Question from Issue #214's QA: `validate-risk-register.mjs`'s `runRiskValidation` returns `passed: true` when `previousTotal === undefined` (comparison commit unreadable) — an untested fail-open path, structurally similar to a finding from Issue #210's round 2. Not required by AC-05 as written; not fixed. Owner: Human Maintainer.
- Design Question from Issue #210's round-3 QA: `scripts/validate-ci-parity.mjs`'s `githubJobCommands` enumerates shapes that yield zero commands (missing job, empty steps, composite-action-only) rather than positively asserting job validity. No further gap was found after three rounds, but the recurring pattern is worth a design-level look independent of any further line-item fix. Owner: Human Maintainer.
- Minor from the same review: the "yielded no comparable commands" error message in `scripts/validate-ci-parity.mjs` says "if the job was restructured... into a composite action," which is misleading for a job that legitimately runs only ignored commands (`npm test`/`npm ci`). Cosmetic wording only, not fixed.
- Two Minors from Issue #215's QA on `scripts/repin-source-matrix.mjs`'s test suite: the round-trip-guard test's fixture already has a correct hash, so it proves the guard throws but not that it prevents reformatting a real write; and a test named for "stops after first occurrence" is a shape-duplicate of the preceding test with no unique discriminating power. Routed to Developer Agent, not fixed here — test-quality precision only, no functional gap.
- Framework assessment recorded at `docs/records/misc/2026-09-05-framework-sdlc-assessment.md`. Its two largest open items: the canonical context budget has 15 tokens of headroom, which blocks any new role or skill definition, and role adapters exist only under `.claude/agents/` with no parity gate (roadmap IMP-006 — now tracked as Issue #212, `phase:requirements`, blocked on a Human Maintainer design-option decision).
- PR #204 carries a stale `post-merge-closeout` label from an earlier session; not addressed by this closeout.

## Required Artifacts
- Self-review record (#208): `docs/records/qa/2026-09-05-issue-208-decision-log-preservation-code-review.md`
- Self-review record (#210): `docs/records/qa/2026-09-05-issue-210-ci-parity-code-review.md`
- Self-review record (#214): `docs/records/qa/2026-09-05-issue-214-risk-register-preservation-code-review.md`
- Self-review record (#215): `docs/records/qa/2026-09-05-issue-215-repin-source-matrix-code-review.md`
- Framework assessment: `docs/records/misc/2026-09-05-framework-sdlc-assessment.md`

## Next Quality Gate
- None — awaiting next assignment.

## Recommended Next Agent
- None — awaiting next assignment.

## Notes
- Reset to template baseline by `npm run reset:template`.
