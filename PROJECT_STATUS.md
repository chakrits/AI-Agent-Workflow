# PROJECT_STATUS.md

## Current Work Item
- Issue #210 — GitLab CI runs a weaker validator set than GitHub CI, and nothing detects the drift

## Current Stage
- Bug Fix — implementation complete, awaiting independent QA. Governed by `docs/contracts/bug-fix-workflow.yaml`.

## Change Classification
- Change Type: N/A
- Risk Level: N/A
- Code Change Required: N/A
- Architecture Change Required: N/A
- Security Review Required: N/A

## Completed
- Blank-template reset completed through PR #205 (`aa2a871`); historical records remain recoverable from Git history.

## In Progress
- Issue #210: three portable validators added to `.gitlab-ci.yml`, plus `validate:ci-parity` wired into both CI files so the drift cannot recur silently. Suite 503 → 509.
- Issue #208 is in flight on a separate branch (`fix/preserve-decision-log`, PR #209) and also edits this file; on merge, keep the branch being merged and let each closeout sync its own state.

## Blockers / Open Questions
- No tooling exists to re-pin `test/fixtures/context-pack-v1/required-source-matrix.json`, so editing any of the ~20 canonical or skill files it pins fails 7 tests until the sha256 is corrected by hand. Same class as Issue #198. Parked with an owner, not fixed here.

## Required Artifacts
- Self-review record: `docs/records/qa/2026-09-05-issue-210-ci-parity-code-review.md`

## Next Quality Gate
- Independent QA verification of Issue #210's Acceptance Criteria AC-01–AC-06.

## Recommended Next Agent
- QA Agent — independent verifier. The implementer must not self-certify this gate.

## Notes
- Reset to template baseline by `npm run reset:template`.
