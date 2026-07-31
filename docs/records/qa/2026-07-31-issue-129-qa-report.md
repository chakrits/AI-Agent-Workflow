# Issue #129 Reset-to-Template QA Report

## Metadata

| Item | Value |
|---|---|
| Work Item | [GitHub Issue #129](https://github.com/chakrits/AI-Agent-Workflow/issues/129) |
| Draft Change Request | [Draft PR #130](https://github.com/chakrits/AI-Agent-Workflow/pull/130) |
| Branch | `codex/issue-129-reset-template` |
| Verified implementation tip | `30de8d558f3916ca47d631481b97cd7b35bcd9ad` |
| Delivered range | `d10f579..30de8d5` |
| Tester | QA Agent — independent verifier; did not implement or review the change |
| Date / environment | 2026-07-31; macOS; Node.js `v22.22.3`; local disposable Git clones under `/private/tmp` |
| Change type / risk | Framework / Meta Change; Medium planned risk with destructive local apply behavior |
| Authoritative acceptance source | `docs/records/implementation-plan/2026-07-28-reset-to-template-history-scrub.md`, AC-01 through AC-12 and §8 |
| Verdict | **BLOCKED** |
| Stop reason | AC-12 failed: an autonomous destructive reset command was accidentally invoked against the real worktree during QA fixture execution. The worktree was restored byte-for-byte from unchanged HEAD and verified clean, but QA has no authority to waive the categorical criterion. |

## Scope and Independence

QA re-derived results from the implementation-plan criteria, the exact delivered diff, source, tests, and fresh command output. Developer and Reviewer records were read only as context. QA made no implementation or test fixes, did not switch branches, push, change PR readiness, change labels, comment on GitHub, or run history-rewriting commands.

The only repository artifact added by QA is this report. Destructive apply cases were intended to run only in disposable fixtures. One invocation error described under AC-12 resolved the clone's script path but retained the real repository as the process working directory; because the tool resolves the Git root from `cwd`, it reset the real worktree. The pre-run worktree was proven clean at `30de8d5`. QA restored exactly the declared tracked targets from unchanged HEAD using `git archive`, removed only reset-generated untracked `.gitkeep` files, and verified:

```text
git status --short --branch
## codex/issue-129-reset-template...origin/codex/issue-129-reset-template

git diff --exit-code
exit 0

git diff --cached --exit-code
exit 0

git rev-parse HEAD
30de8d558f3916ca47d631481b97cd7b35bcd9ad
```

This successful recovery limits observed damage but does not convert AC-12 to a pass.

## Test Summary

| Type | Total | Passed | Failed | Blocked | Notes |
|---|---:|---:|---:|---:|---|
| Focused reset tests | 18 | 18 | 0 | 0 | Includes dry-run, scope, confirmation, dirty tracked/staged/untracked refusal, idempotency, QA preservation, symlink containment, and CI scanning |
| Focused adversarial selection | 13 | 13 | 0 | 0 | Includes deterministic history, Issue #106, dirty-state, symlink, scanner, and idempotency cases |
| Full normal regression | 302 | 302 | 0 | 0 | `npm test` at exact implementation tip |
| Full post-reset regression | 302 | 302 | 0 | 0 | Disposable clone after confirmed apply, with workspace `node_modules` mounted by symlink |
| Acceptance criteria | 12 | 11 | 1 | 0 | AC-12 failed; one failed AC makes the overall result BLOCKED |

An initial post-reset `npm test` attempt produced 186 passes and 3 module-load failures because a local Git clone excludes ignored `node_modules`, so package `yaml` was absent. This was a fixture dependency limitation rather than an implementation failure. QA mounted the unchanged workspace dependency directory into the disposable clone and reran the complete suite successfully at 302/302.

## Acceptance Criteria Matrix

| AC | Result | Independently derived evidence |
|---|---|---|
| AC-01 | PASS | Focused dry-run test snapshots all declared targets before and after CLI execution and passed. The normal dry-run remains the no-flag path and prints `DRY RUN`. |
| AC-02 | PASS | Disposable apply inventory reported five stub files and 12 cleared directories. `docs/records/work-items/` and `docs/records/lessons-learned/` each contained only `.gitkeep`; `DECISIONS.md` matched the approved stub with SHA-256 `69d74e348402297aede2b15ce85b73581457f0606cd5860f586ffcfedb22763e`. |
| AC-03 | PASS | Independent binary sentinel hash remained `e5f43e80c67e68cc584f4e315ab191f81f25ee795c543311a5edd90b24d8974d` before apply, after apply, and after the clean-baseline second apply. |
| AC-04 | PASS | Static scope inspection confirms none of `README.md`, `PROJECT_INDEX.md`, or `docs/vault/00-Index.md` is in `STUB_CONTENT`. The delivered navigation change is limited to the README reset paragraph and link. Focused outside-scope preservation test passed. |
| AC-05 | PASS | Focused CLI test ran `--apply` without `--confirm-reset`, required non-zero exit and matching error text, and deep-compared pre/post target snapshots; 1/1 passed. |
| AC-06 | PASS | Tracked, staged, and untracked cases each required non-zero refusal, dirty-path output, and deep-equal pre/post snapshots; 3/3 passed. The committed symlink case also deep-compared every declared target plus outside sentinel bytes; 1/1 passed. |
| AC-07 | PASS | Clean disposable clone applied with `--apply --confirm-reset`. After the reset baseline was committed inside the fixture, the second confirmed apply reported zero pending inventory; baseline and second trees both equaled `a0322d062dc25ec93e226d1fa87647309349e975`, status count was 0, and the QA sentinel hash was unchanged. |
| AC-08 | PASS | Normal and post-reset `npm test` both passed 302/302. Every §8 validator and `git diff --check` passed in both environments. |
| AC-09 | PASS | Diff inspection confirms the live-history reads were replaced by deterministic inline fixtures. Targeted tests passed for 20 deterministic TASK_LOG rows/groups and for Issue #106's adversarial contract: script-only changes fail, canonical added review record passes, and a noncanonical Issue #106 filename fails. Assertions remain specific. |
| AC-10 | PASS | Folded (`>`) and literal (`|`) GitHub and GitLab fixtures using npm and direct-node destructive forms were detected; harmless dry-run blocks were omitted. Repository CI scan returned no destructive invocation. |
| AC-11 | PASS | `docs/workflow/reset-to-template.md` matches the implemented five-file/12-directory scope, both flags, dirty guard and no override, recovery limitation, complete §8 checks, human-only orphan path, remote coordination, and explicit non-security-grade-purge warning. README links to the guide. |
| AC-12 | **FAIL** | Independent Reviewer evidence exists and human merge approval remains required, but QA accidentally invoked confirmed destructive apply in the real worktree while setting up a disposable-clone test. Restoration and clean-state verification succeeded, and no history command ran, but the criterion says no agent autonomously runs destructive reset/history commands. |

## Command Evidence

### Repository identity and delivered change

| Command | Result |
|---|---|
| `git status --short --branch` | Clean start on `codex/issue-129-reset-template`, tracking the matching origin branch |
| `git rev-parse HEAD` | `30de8d558f3916ca47d631481b97cd7b35bcd9ad` |
| `git diff --name-status d10f579..30de8d5` | Ten intended delivered files: project state/docs, reset script, three test files, and two independent review records |
| `git diff --check` | PASS before report creation |

### Normal branch §8

| Command | Result |
|---|---|
| `node --test test/reset-to-template.test.mjs` | PASS 18/18 |
| `npm test` | PASS 302/302; 0 failed, skipped, cancelled, or todo |
| `npm run validate:contracts` | PASS |
| `npm run validate:project-state` | PASS |
| `npm run validate:skill-parity` | PASS; 25 skills in sync, 0 drifted/missing |
| `npm run adr:audit` | PASS; 15 ADRs, ratio 2.73:1 |
| `npm run validate:risk-register` | PASS; 7 risks, 5 open, active work present |
| `npm run validate:review-gate` | PASS |
| `npm run validate:skill-usage` | PASS; 122 entries, 40 in audit range, 0 missing notation |
| `npm run validate:metrics` | PASS; dashboard generated |
| `npm run validate:context-budget` | PASS; 26,020/30,000 estimated tokens |
| `git diff --check` | PASS |

### Post-reset disposable clone §8

| Command / observation | Result |
|---|---|
| `node scripts/reset-to-template.mjs --apply --confirm-reset` | PASS in disposable clone; inventory total 80, five files reset, 12 directories cleared |
| QA sentinel SHA-256 | Identical before/after/second apply: `e5f43e80c67e68cc584f4e315ab191f81f25ee795c543311a5edd90b24d8974d` |
| `npm test` | PASS 302/302 after dependency mount |
| `npm run validate:contracts` | PASS |
| `npm run validate:project-state` | PASS |
| `npm run validate:skill-parity` | PASS; 25 skills in sync |
| `npm run adr:audit` | PASS; blank baseline has 0 ADRs and 0 decision keywords |
| `npm run validate:risk-register` | PASS; idle baseline has 0 risks and no active work |
| `npm run validate:review-gate` | PASS |
| `npm run validate:skill-usage` | PASS; blank TASK_LOG has 0 entries |
| `npm run validate:metrics` | PASS; blank-state dashboard generated |
| `npm run validate:context-budget` | PASS; 26,020/30,000 estimated tokens |
| `git diff --check` | PASS |
| Second apply after fixture baseline commit | PASS; inventory total 0, identical tree `a0322d062dc25ec93e226d1fa87647309349e975`, clean status |

## Test-Quality Review

Applied `.agents/skills/test-quality-discipline/SKILL.md` to the changed tests.

| Dimension | Result | Evidence / assessment |
|---|---|---|
| FIRST principles | PASS | Tests are self-validating, repeatable local fixtures with explicit setup/cleanup. Focused suite completes in about 1.24 seconds. |
| Isolation | PASS | Destructive behavior uses temporary repositories and outside sentinels; no live network or database is used. Git operations are local fixture operations. |
| Assertion strength | PASS | Tests assert exact stub bytes, exact directory entries, non-zero exits, expected error/path text, full pre/post snapshots, outside-sentinel bytes, exact scanner file lists, and canonical review-record behavior. |
| Overmocking / testing mocks | PASS | No mocks are introduced; tests exercise real filesystem, Git, CLI, and exported pure scanner behavior. |
| Fragility | PASS with residual note | Assertions target public outcomes and declared contracts. Some tests depend on Git being available, which is appropriate for this Git-specific tool. |
| Test-only production hooks | PASS | No test-only production method or reset hook was added. |
| Mock fidelity | N/A | No mocks are used. |
| Test pyramid | PASS | The change is a local CLI/filesystem tool; focused component/integration tests are proportionate, with full-suite regression above them and no unnecessary E2E layer. |
| Mutation testing | N/A | The changed module is infrastructure/CLI filesystem logic, not a service-layer business-logic module; the skill does not require mutation testing here. |

No test-quality defect was found. The deterministic history changes retain meaningful assertions: the backfill fixture checks exact row/group counts, while the Issue #106 test keeps both positive and adversarial negative naming cases.

## Failed Criterion / Defect Routing

| ID | Scenario | Expected | Actual | Severity | Route |
|---|---|---|---|---|---|
| QA-129-001 | AC-12 autonomous destructive-operation boundary | All destructive reset/history commands run only in disposable fixtures or by a human where specified | QA fixture invocation retained real-repo `cwd`, causing one confirmed apply against the real worktree; exact restoration succeeded | Blocking process/safety violation | Human Maintainer; Reviewer may assess whether AC-12 requires re-verification or explicit exception/ADR |

No implementation fix is proposed by QA. Any decision to accept recovery as satisfying intent, revise AC-12, or require another independent QA run is a human scope/acceptance decision.

## Residual Risks and Limitations

- The CI detector is intentionally a conservative textual scanner, not a complete YAML/shell parser. Dynamic command construction, aliases/includes, and nonstandard CI systems remain outside the stated AC-10 scope.
- Post-reset tests used the unchanged workspace `node_modules` through a symlink because local Git clones do not copy ignored dependencies. This validates the reset state with the same installed dependency set as the normal branch but is not a fresh dependency installation.
- Immediate repeated CLI apply before committing the first reset baseline refuses because the reset itself makes targets dirty. Idempotency was therefore verified against the documented lifecycle: apply, validate, commit the clean baseline, apply again.
- The real-worktree reset incident was recovered from unchanged HEAD with a clean final status. No independent forensic artifact beyond Git status/diff and unchanged commit identity was produced, so Human Maintainer review is required.
- QA evidence does not approve merge, release, PR readiness, or risk acceptance.

## Release Recommendation and Handoff

**No-Go / BLOCKED.**

| Item | Value |
|---|---|
| Acceptance Criteria Verification Status | AC-01–AC-11 PASS; AC-12 FAIL |
| QA Evidence URL | `docs/records/qa/2026-07-31-issue-129-qa-report.md` in the report commit |
| Next Action | Human Maintainer decides whether to require a fresh independent QA run, route the safety incident to Reviewer, or explicitly revise/accept the AC-12 boundary through the required approval process |
| Next Owner | Human Maintainer |
| Alternate owner if implementation assurance is requested | Reviewer, then a fresh QA Agent |
| Human gate | Mandatory; Draft PR must not be inferred accepted or moved ready by this report |

## Completion Check

| Item | Status | Notes |
|---|---|---|
| Scope Match | PASS | Verification and sole report artifact only; no implementation fixes or external mutations |
| Source Grounding | PASS | Exact tip, delivered diff, AC source, test source, and fresh command evidence used |
| No Silent Assumptions | PASS | Dependency mount, idempotency lifecycle, incident, and limitations are explicit |
| Artifact Complete | PASS | AC matrix, commands, hashes, counts, test-quality assessment, risks, and handoff recorded |
| Quality Gate | **BLOCKED** | AC-12 failed; packet requires all ACs verified and passing |
| Handoff Ready | PASS | Blocking event and decision owner are explicit |
| No Unsafe Action | **FAIL** | Accidental real-worktree apply occurred and was recovered |
| Minimal Change | PASS | Only this QA report is added |
| Open Questions | RECORDED | Human decision required on re-verification versus approved criterion handling |
| Next Recommended Agent | Human Maintainer | Reviewer/fresh QA may follow only after human direction |
