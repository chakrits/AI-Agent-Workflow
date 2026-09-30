# Implementation Plan — Issue #290 Readiness Workflow Dependencies

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | Issue #290 — install validator dependencies in readiness workflow |
| Change Type | Bug Fix (GitHub Actions workflow) |
| Risk Level | Low |
| Owner | Developer Agent |
| Target Branch / Ticket | `codex/issue-290-readiness-dependencies` / https://github.com/chakrits/AI-Agent-Workflow/issues/290 |

## 2. Inputs Reviewed

| Artifact | Status | Notes |
|---|---|---|
| Requirement | Available | Issue #290 contains objective, scope, and AC-01–AC-03; authorized by Human Maintainer on 2026-09-30 |
| SDD | N/A | No architecture/API/data/permission/readiness-rule change |
| Bug Fix contract | Available | `docs/contracts/bug-fix-workflow.yaml`, contract version 1 |
| Debug evidence | Available | `docs/records/qa/2026-09-30-issue-290-debug-ledger.md` |

## 3. Affected Areas

| Area | Files / Components | Expected Change |
|---|---|---|
| CI config | `.github/workflows/work-item-readiness-refresh.yml` | Set up Node 22 and install lockfile dependencies with lifecycle scripts disabled, after trusted checkout and before the validator import |
| Contract tests | `test/validate-project-state.test.mjs` | Assert install ordering and preserve event, trusted checkout, and least-privilege boundaries |
| Work item | `docs/records/work-items/issue-290/` | Bug task-state and developer plan/evidence |
| QA evidence | `docs/records/qa/` | Root-cause ledger, structured review, and QA verification |
| Project state | `PROJECT_STATUS.md`, `TASK_LOG.md` | Track state and handoff |

## 4. Task Breakdown

| Task ID | Task | Agent / Owner | Files / Components | Verification |
|---|---|---|---|---|
| IMP-001 | Add a failing workflow contract assertion for Node/dependency setup before the trusted script | Developer Agent | `test/validate-project-state.test.mjs` | Focused test fails on baseline because setup/install steps are absent |
| IMP-002 | Add Node 22 setup and `npm ci --ignore-scripts` to the trusted readiness workflow | Developer Agent | `.github/workflows/work-item-readiness-refresh.yml` | Focused test passes; script import now resolves locked `yaml` and `ajv` |
| IMP-003 | Run focused and repository validators, full suite, and hosted PR checks; independently review the patch | QA Agent / Reviewer | Changed files and Issue #290 evidence | Local checks and all PR #291 checks except the required readiness context passed; independent review approved with comments and QA returned Conditional Pass. The required check still runs old `main` and reports the original dependency error; post-activation validation and PR #289 re-evaluation remain required. |
| IMP-004 | Resolve minor final-review findings and re-review the fix | Developer / Independent Reviewer | Workflow contract test and human activation handoff | Complete in commit `1e0907bbeb8bb0400c8e3adec02e5a7ed768564e`; scoped re-review confirmed both findings fixed with no new breakage. Focused and full test suites pass. |

## Task 4 — Address final branch review findings

1. Update the workflow `run:` extraction regex in `test/validate-project-state.test.mjs` to also recognize valid YAML sequence shorthand (`- run:`), and add a focused assertion/fixture proving that shorthand is detected.
2. Correct the human activation handoff question to refer to PR #291, not PR #290.

Verify with the focused test file and `git diff --check`. Do not change checks, rulesets, PR state, or activation decisions.

Outcome: **Complete**. The allowlist now recognizes both `run:` and `- run:` and the test asserts the shorthand case. The activation question names PR #291. Fix commit `1e0907bbeb8bb0400c8e3adec02e5a7ed768564e`; scoped re-review approved with no new findings.

## 5. Test Strategy

| Test Type | Required? | Scope | Owner |
|---|---|---|---|
| Unit / contract | Yes | Exact workflow setup ordering, Node version, trusted checkout, permissions, and event boundaries | Developer Agent; independent QA confirms |
| Full regression | Yes | `npm test` | QA Agent |
| Workflow validators | Yes | `validate:project-state`, `validate:ci-parity`, `validate:contracts`, `validate:review-gate`, `validate:skill-usage` | QA Agent |
| Hosted readiness integration | Yes | Re-evaluate current PR #289 after this fix reaches the default branch | QA Agent / Human Maintainer |
| Security review | No | No auth, permission, secret, or untrusted-code execution changes; existing least privilege and trusted checkout must remain unchanged | N/A |

## 6. Verification Commands

```bash
node --test test/validate-project-state.test.mjs
npm test
npm run validate:project-state
npm run validate:ci-parity
npm run validate:contracts
npm run validate:review-gate
npm run validate:skill-usage
git diff --check
```

## 7. Rollback / Fallback Plan

Revert the isolated workflow/test commit if dependency setup causes a hosted runner failure. This returns the readiness check to its current fail-closed behavior; do not skip the required check or change ruleset policy as a fallback.

## 8. Risks / Blockers

| Risk / Blocker | Impact | Mitigation / Next Action |
|---|---|---|
| `pull_request_target` workflow has a required App-owned check which evaluates only trusted `main` code | PR #291's `work-item-readiness-freshness` check fails with `YAML parser dependency unavailable` because `main` has not received this repair | Keep PR #291 Draft; ask Human Maintainer to choose an allowed activation/merge path; do not bypass autonomously |
| Dependency install executes lifecycle scripts | Untrusted-package execution risk | Use lockfile-backed `npm ci --ignore-scripts`; install only from the trusted default-branch checkout |

## 9. Handoff

| To | Reason | Required Evidence |
|---|---|---|
| QA Agent / Independent Reviewer | Confirm AC-01–AC-03 and review workflow trust boundary | Exact base/head SHAs, failing-before/passing-after contract test, full CI results, and explicit pending post-merge readiness check |

## Skill Output Metadata

- Skill Used: implementation-planning, data-config-change, debugging-discipline
- Mode: Focused
- Source Inputs: Issue #290, current `origin/main`, CI failure output, readiness workflow source, readiness validator, bug-fix workflow contract
- Confidence: High
- Assumptions: GitHub App workflow continues to run trusted default-branch code and the package lock is authoritative.
- Open Questions: Whether a human-approved bypass path is available for merging the required-check repair.
- Next Recommended Agent: Independent Reviewer, then QA Agent
- Quality Gate Status: Implementation complete; independent review approved with comments; QA Conditional Pass; hosted integration pending default-branch activation.
- Task State: verifying
- Contract Version: bug-fix workflow v1; task-state envelope v2
- Rework Count: 0
- Evidence References: Issue #290; `docs/records/qa/2026-09-30-issue-290-debug-ledger.md`
- Stop Reason: None
