# PROJECT_STATUS.md

## Current Work Item
- Issue #214 — `reset-to-template` risk-register preservation. Implementation complete on branch `fix/preserve-risk-register`; awaiting independent QA against Acceptance Criteria AC-02 through AC-06 (AC-01 closed by investigation, no restoration performed).

## Current Stage
- Development complete, self-reviewed, PR opened. Awaiting QA.

## Change Classification
- Change Type: Bug Fix (`docs/contracts/bug-fix-workflow.yaml`)
- Risk Level: Medium (per Orchestrator routing comment on Issue #214)
- Code Change Required: Yes — `scripts/reset-to-template.mjs`, `scripts/validate-risk-register.mjs`
- Architecture Change Required: No
- Security Review Required: No

## Completed
- Blank-template reset completed through PR #205 (`aa2a871`); historical records remain recoverable from Git history.
- Issue #208 — `reset-to-template` no longer destroys the decision log, and `adr-audit` fails closed when the ADR count drops. Merged via PR #209 (squash) as `e820389`. Independent QA passed at `31b0b13` (518/518, mutation-verified). ADR-0017 and ADR-0019 restored to `DECISIONS.md`; the remaining 16 are recoverable via the command recorded there, by explicit Human Maintainer decision. Evidence: https://github.com/chakrits/AI-Agent-Workflow/issues/208#issuecomment-5551564975
- Issue #210 — GitLab CI now runs the same portable validators as GitHub CI, enforced by `scripts/validate-ci-parity.mjs` wired into both CI files. Merged via PR #211 (squash) as `be15d7b`. Independent QA ran three rounds (503 → 517 tests) before passing: round 1 found a committed `node_modules` symlink and three ways the parity detector could be defeated; round 2 found a fail-open where a renamed GitHub job silently disabled the check; round 3 (continued past the stated 2-round rework ceiling by explicit Human Maintainer decision) found the same guard didn't cover a job restructured to yield zero commands. Final round passed with one non-blocking Minor and one design Question left open below. Evidence: https://github.com/chakrits/AI-Agent-Workflow/issues/210#issuecomment-5551566808
- Issue #214 — `reset-to-template` no longer destroys the risk register, and `validate-risk-register` fails closed when the total risk-entry count drops relative to a prior commit (merge-base + branch-walk comparison, mirroring `adr-audit.mjs`'s `comparisonRefs`). `RISKS.md` itself is unmodified: AC-01 investigation found no currently open Issue cites a specific `RISKS.md` id, so no historical content was restored, per explicit instruction that this data-restoration scope question is a Human Maintainer decision, not a Developer Agent guess. Self-review record: `docs/records/qa/2026-09-05-issue-214-risk-register-preservation-code-review.md`. Suite 532 → 542 (mutation-verified: comparison-walk logic, regression check, and reset guard each individually confirmed load-bearing by deletion).

## In Progress
- None.

## Blockers / Open Questions
- No tooling exists to re-pin `test/fixtures/context-pack-v1/required-source-matrix.json`, so editing any of the ~20 canonical or skill files it pins fails 7 tests until the sha256 is corrected by hand. Same class as Issue #198. Parked with an owner, not fixed here.
- Whether to reconstruct any of the 7 historical `RISKS.md` entries destroyed by the resets (despite no currently open Issue citing one by id) is an open data-restoration scope question, explicitly left to the Human Maintainer per Issue #214's routing comment. Not decided or guessed at in this diff.
- Design Question from Issue #210's round-3 QA: `scripts/validate-ci-parity.mjs`'s `githubJobCommands` enumerates shapes that yield zero commands (missing job, empty steps, composite-action-only) rather than positively asserting job validity. No further gap was found after three rounds, but the recurring pattern is worth a design-level look independent of any further line-item fix. Owner: Human Maintainer.
- Minor from the same review: the "yielded no comparable commands" error message in `scripts/validate-ci-parity.mjs` says "if the job was restructured... into a composite action," which is misleading for a job that legitimately runs only ignored commands (`npm test`/`npm ci`). Cosmetic wording only, not fixed.
- Framework assessment recorded at `docs/records/misc/2026-09-05-framework-sdlc-assessment.md`. Its two largest open items: the canonical context budget has 15 tokens of headroom, which blocks any new role or skill definition, and role adapters exist only under `.claude/agents/` with no parity gate (roadmap IMP-006, never opened as an issue).
- PR #204 carries a stale `post-merge-closeout` label from an earlier session; not addressed by this closeout.

## Required Artifacts
- Self-review record (#208): `docs/records/qa/2026-09-05-issue-208-decision-log-preservation-code-review.md`
- Self-review record (#210): `docs/records/qa/2026-09-05-issue-210-ci-parity-code-review.md`
- Self-review record (#214): `docs/records/qa/2026-09-05-issue-214-risk-register-preservation-code-review.md`
- Framework assessment: `docs/records/misc/2026-09-05-framework-sdlc-assessment.md`

## Next Quality Gate
- Independent QA verification of Issue #214's Acceptance Criteria AC-02 through AC-06 (AC-01 closed by investigation; see Completed).

## Recommended Next Agent
- QA Agent, to verify Issue #214 against its Acceptance Criteria and this record's self-review findings.

## Notes
- Reset to template baseline by `npm run reset:template`.
