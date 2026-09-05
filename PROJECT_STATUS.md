# PROJECT_STATUS.md

## Current Work Item
- Issue #208 — `reset-to-template` destroys the ADR log, and `adr-audit` reports PASS while it happens

## Current Stage
- Bug Fix — implementation complete, awaiting independent QA. Governed by `docs/contracts/bug-fix-workflow.yaml`, not the `phase:`/`status:` lifecycle label contract.

## Change Classification
- Change Type: Bug Fix (tooling / data preservation)
- Risk Level: High — the defect silently destroyed governing decisions for three currently-blocked issues, and the control meant to catch it reported PASS
- Code Change Required: Yes — `scripts/reset-to-template.mjs`, `scripts/adr-audit.mjs`, and their tests
- Architecture Change Required: No
- Security Review Required: No — no auth, secrets, sensitive data, or trust boundary involved

## Completed
- Blank-template reset completed through PR #205 (`aa2a871`); historical records remain recoverable from Git history.

## In Progress
- Issue #208: the reset now refuses to blank a `DECISIONS.md` holding recorded ADRs unless `--reset-decisions` is passed explicitly, naming the ids at risk; `adr-audit` now fails when the ADR count drops against the comparison commit, resolved by merge base with the declared base branch. ADR-0017 and ADR-0019 restored. Suite 503 → 509.

## Blockers / Open Questions
- `RISKS.md` is the same class of defect as `DECISIONS.md` and was deliberately left out of Issue #208. It needs its own decision about what a risk register means after a reset before anything changes.
- Restoring ADR-0017 and ADR-0019 does not by itself unblock Issues #132, #133, or #203; it only makes the decisions those issues cite readable again.
- Framework assessment recorded at `docs/records/misc/2026-09-05-framework-sdlc-assessment.md`. Its two largest open items: the canonical context budget has 15 tokens of headroom, which blocks any new role or skill definition, and role adapters exist only under `.claude/agents/` with no parity gate (roadmap IMP-006, never opened as an issue).

## Required Artifacts
- Self-review record: `docs/records/qa/2026-09-05-issue-208-decision-log-preservation-code-review.md`
- Framework assessment: `docs/records/misc/2026-09-05-framework-sdlc-assessment.md`

## Next Quality Gate
- Independent QA verification of Issue #208's Acceptance Criteria AC-01–AC-06 against the exact candidate diff.

## Recommended Next Agent
- QA Agent — independent verifier. The implementer must not self-certify this gate.

## Notes
- Reset to template baseline by `npm run reset:template`.
