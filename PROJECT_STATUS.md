# PROJECT_STATUS.md

## Current Work Item
- Issue #210 — GitLab CI runs a weaker validator set than GitHub CI, and nothing detects the drift

## Current Stage
- Bug Fix — independent QA passed after 3 rounds (evidence: https://github.com/chakrits/AI-Agent-Workflow/issues/210#issuecomment-5551566808), awaiting merge. Governed by `docs/contracts/bug-fix-workflow.yaml`, not the `phase:`/`status:` lifecycle label contract.

## Change Classification
- Change Type: N/A
- Risk Level: N/A
- Code Change Required: N/A
- Architecture Change Required: N/A
- Security Review Required: N/A

## Completed
- Blank-template reset completed through PR #205 (`aa2a871`); historical records remain recoverable from Git history.

## In Progress
- Issue #210: three portable validators added to `.gitlab-ci.yml`, plus `validate:ci-parity` wired into both CI files so the drift cannot recur silently. Independent QA ran three rounds. Round 1 (`973180d`) returned NEEDS_REVISION (1 Critical, 4 Major, 3 Minor): the Critical was a `node_modules` symlink holding an absolute home path, committed because `.gitignore` used `node_modules/` with a trailing slash, which matches directories only; the detector was also defeatable by a commented-out GitLab job, by `node`/`npx` invocation, and produced a false failure on a GitHub-only job, all fixed by parsing both files with the `yaml` package and scoping to the named validate job. Round 2 (`681a40e`) found CR-1114: that job-scoping fix meant a renamed or restructured job resolved to an empty command set and reported a silent PASS; fixed by throwing when the named job cannot be found. This reached `task_review_rework_count`'s stated ceiling of 2. Round 3 (`0e1244c` → `050705c`), continued by explicit Human Maintainer decision past that ceiling, found CR-1115: the CR-1114 guard did not cover a job whose `steps` exist but yield zero commands (composite-action restructure, `steps: []`); fixed and mutation-verified, and independent QA then returned PASS with one non-blocking Minor and one design Question (three consecutive rounds targeting the same guard-scope defect class) flagged for the Human Maintainer rather than fixed as a fourth round. Suite 503 → 517. Issue #208 merged separately (PR #209, squash-merged as `e820389`) restoring ADR-0017 and ADR-0019 to `main`; this branch has been updated against that merge.

## Blockers / Open Questions
- No tooling exists to re-pin `test/fixtures/context-pack-v1/required-source-matrix.json`, so editing any of the ~20 canonical or skill files it pins fails 7 tests until the sha256 is corrected by hand. Same class as Issue #198. Parked with an owner, not fixed here.
- Design Question from QA's round 3: `githubJobCommands` enumerates shapes that yield zero commands (missing job, empty steps, composite-action-only) rather than positively asserting job validity. No further gap was found, but the pattern recurring across two rounds is worth a design-level look independent of any further line-item fix. Owner: Human Maintainer.
- Minor from QA's round 3: the "yielded no comparable commands" error message says "if the job was restructured... into a composite action," which is misleading for a job that legitimately runs only ignored commands (`npm test`/`npm ci`). Cosmetic wording only, not fixed.

## Required Artifacts
- Self-review record: `docs/records/qa/2026-09-05-issue-210-ci-parity-code-review.md`

## Next Quality Gate
- Merge decision for PR #211. Independent QA has passed; no further verification gate required before merge.

## Recommended Next Agent
- QA Agent — independent verifier. The implementer must not self-certify this gate.

## Notes
- Reset to template baseline by `npm run reset:template`.
