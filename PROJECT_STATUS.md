# PROJECT_STATUS.md

## Current Work Item
- GitHub Issue #215 — no tooling to re-pin `required-source-matrix.json`'s sha256 hashes after a legitimate doc edit. Draft PR open, awaiting QA.

## Current Stage
- Developer implementation complete, self-reviewed, handed off to QA.

## Change Classification
- Change Type: New Feature
- Risk Level: Low
- Code Change Required: Yes
- Architecture Change Required: No
- Security Review Required: No

## Completed
- Blank-template reset completed through PR #205 (`aa2a871`); historical records remain recoverable from Git history.
- Issue #208 — `reset-to-template` no longer destroys the decision log, and `adr-audit` fails closed when the ADR count drops. Merged via PR #209 (squash) as `e820389`. Independent QA passed at `31b0b13` (518/518, mutation-verified). ADR-0017 and ADR-0019 restored to `DECISIONS.md`; the remaining 16 are recoverable via the command recorded there, by explicit Human Maintainer decision. Evidence: https://github.com/chakrits/AI-Agent-Workflow/issues/208#issuecomment-5551564975
- Issue #210 — GitLab CI now runs the same portable validators as GitHub CI, enforced by `scripts/validate-ci-parity.mjs` wired into both CI files. Merged via PR #211 (squash) as `be15d7b`. Independent QA ran three rounds (503 → 517 tests) before passing: round 1 found a committed `node_modules` symlink and three ways the parity detector could be defeated; round 2 found a fail-open where a renamed GitHub job silently disabled the check; round 3 (continued past the stated 2-round rework ceiling by explicit Human Maintainer decision) found the same guard didn't cover a job restructured to yield zero commands. Final round passed with one non-blocking Minor and one design Question left open below. Evidence: https://github.com/chakrits/AI-Agent-Workflow/issues/210#issuecomment-5551566808

## In Progress
- Issue #215 — `scripts/repin-source-matrix.mjs` (new) recomputes and rewrites stale sha256 entries in `test/fixtures/context-pack-v1/required-source-matrix.json`, wired to `npm run repin:source-matrix`, exporting the existing `sha256(bytes)` helper from `scripts/lib/context-compatibility-v1.mjs` for reuse. Fails closed on non-uniform pre-existing hashes or a fixture-formatting drift; updates every occurrence of a redundantly-pinned path; byte-identical no-op when nothing changed. Documented in `docs/operating-model/CONTEXT_BUDGET.md` (not `docs/workflow/platform-readiness.md`, since that file is itself one of the 25 pinned paths — see the self-review record). Draft PR open against `main`; awaiting QA. Self-review: `docs/records/qa/2026-09-05-issue-215-repin-source-matrix-code-review.md`.

## Blockers / Open Questions
- `RISKS.md` is the same class of defect `DECISIONS.md` was: `scripts/reset-to-template.mjs` stubs it as a clearable record. Deliberately left out of Issue #208's scope. Needs its own decision about what a risk register means after a reset before anything changes.
- Design Question from Issue #210's round-3 QA: `scripts/validate-ci-parity.mjs`'s `githubJobCommands` enumerates shapes that yield zero commands (missing job, empty steps, composite-action-only) rather than positively asserting job validity. No further gap was found after three rounds, but the recurring pattern is worth a design-level look independent of any further line-item fix. Owner: Human Maintainer.
- Minor from the same review: the "yielded no comparable commands" error message in `scripts/validate-ci-parity.mjs` says "if the job was restructured... into a composite action," which is misleading for a job that legitimately runs only ignored commands (`npm test`/`npm ci`). Cosmetic wording only, not fixed.
- Framework assessment recorded at `docs/records/misc/2026-09-05-framework-sdlc-assessment.md`. Its two largest open items: the canonical context budget has 15 tokens of headroom, which blocks any new role or skill definition, and role adapters exist only under `.claude/agents/` with no parity gate (roadmap IMP-006, never opened as an issue).
- PR #204 carries a stale `post-merge-closeout` label from an earlier session; not addressed by this closeout.

## Required Artifacts
- Self-review record (#208): `docs/records/qa/2026-09-05-issue-208-decision-log-preservation-code-review.md`
- Self-review record (#210): `docs/records/qa/2026-09-05-issue-210-ci-parity-code-review.md`
- Self-review record (#215): `docs/records/qa/2026-09-05-issue-215-repin-source-matrix-code-review.md`
- Framework assessment: `docs/records/misc/2026-09-05-framework-sdlc-assessment.md`

## Next Quality Gate
- Independent QA review of Issue #215's draft PR against AC-01–AC-05.

## Recommended Next Agent
- QA Agent (Issue #215).

## Notes
- Reset to template baseline by `npm run reset:template`.
