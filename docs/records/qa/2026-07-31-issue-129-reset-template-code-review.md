# Issue #129 Reset-to-Template Code Review

## 1. Review Context

| Item | Detail |
|---|---|
| Work Item | GitHub Issue #129 |
| Reviewer Role | Reviewer — independent; did not implement the change |
| Change Type / Risk | Framework / Meta Change; Medium planned risk with destructive local apply behavior |
| Branch / Reviewed Commit | `codex/issue-129-reset-template` / `a0bbc7dd059bde30ad5237cb8c192fe4e4cafb3f` |
| Commit Range | `d10f579..a0bbc7d` |
| Authoritative Source | `docs/records/implementation-plan/2026-07-28-reset-to-template-history-scrub.md` |
| Review Policy | `docs/workflows/code-review-gate.md` and `.agents/skills/code-review-gate/SKILL.md` |
| Files Reviewed | All 8 changed files in the range |
| Gate Verdict | **BLOCKED** |
| Next Owner | Developer Agent |

## 2. Change Summary and Review Focus

The change expands the reusable reset command to clear work-item and lessons-learned history, stub `DECISIONS.md`, preserve QA evidence, require a second destructive confirmation, reject dirty targets, scan CI definitions for destructive invocation, isolate historical tests from live repository data, and document the operator workflow.

The review independently inspected correctness, fail-closed behavior, git-status handling, path containment, no-mutation guarantees, QA preservation, CI scanner evasions, documentation accuracy, test strength, dependency changes, and dead-code hygiene. No Developer acceptance claims were treated as review evidence.

| Changed File | Review Result / Risk Focus |
|---|---|
| `PROJECT_STATUS.md` | State/handoff wording reviewed; no independent-verification claim accepted |
| `README.md` | Invocation and preservation wording match implemented flags |
| `TASK_LOG.md` | Developer evidence treated as historical context only |
| `docs/workflow/reset-to-template.md` | Scope, safeguards, recovery limits, and human-only history wording reviewed |
| `scripts/reset-to-template.mjs` | Destructive target containment, dirty guard, inventory, CI scan, and argument behavior reviewed |
| `test/backfill-work-item-records.test.mjs` | Deterministic fixture retains grouping assertions |
| `test/reset-to-template.test.mjs` | Positive, refusal, idempotency, QA-preservation, and CI cases reviewed adversarially |
| `test/validate-review-gate.test.mjs` | Deterministic history and Issue #106 naming adversary retained |

## 3. Findings

| Finding ID | Severity | File / Line | Finding | Required Remedy | Blocks Progress? | Evidence |
|---|---|---|---|---|---|---|
| CR-129-001 | Critical | `scripts/reset-to-template.mjs:100-111`, `scripts/reset-to-template.mjs:143-173`, `scripts/reset-to-template.mjs:232-237`; missing case near `test/reset-to-template.test.mjs:172-218` | Declared directory targets are never resolved and verified to remain inside the repository before `readdir`, recursive `rm`, `mkdir`, and `.gitkeep` writes. A clean, committed symlink at a cleared-directory path passes `git status`, then causes apply to delete entries in the symlink destination outside the repository. The command exits successfully, violating the declared target boundary and no-mutation safety contract. | Add a fail-closed preflight that rejects symlinked targets and verifies the real path of every existing target/parent remains beneath the resolved repository root before any mutation. Keep orchestration separate from deletion, validate the complete target set first, and add a disposable-repository regression proving an outside sentinel remains byte-identical and apply refuses without partial mutation. | Yes | Reviewer disposable fixture committed `docs/records/work-items` as a symlink to an outside directory. `node scripts/reset-to-template.mjs --apply --confirm-reset` exited 0 and the outside `sentinel.txt` was deleted (`sentinelOutsideRepoSurvived:false`). Maps to AC-06 and the plan's path-containment/no-mutation review boundary. |
| CR-129-002 | Major | `scripts/reset-to-template.mjs:128-140`; `test/reset-to-template.test.mjs:220-240` | The CI guard scans each physical line independently and only blocks when the reset command and `--apply` appear on that same line. Valid YAML folded scalars combine separate lines into one destructive shell command, so a GitHub Actions `run: >` block with the reset command on one line and `--apply --confirm-reset` on the next evades the guard. The test covers only same-line examples and therefore does not establish AC-10. | Parse the relevant YAML command values or conservatively normalize YAML block scalars before command analysis. Add GitHub and GitLab multiline/folded/literal regression fixtures, including direct-node and npm-script forms, while retaining harmless dry-run acceptance. | Yes | Reviewer fixture used `run: >` followed by `npm run reset:template --` and `--apply --confirm-reset` on separate folded lines. `findDestructiveCiInvocations()` returned `[]`. Maps to AC-10. |

No Minor or Question findings were identified.

## 4. Acceptance-Criteria Mapping

| AC | Review Status | Independent Evidence |
|---|---|---|
| AC-01 | PASS | CLI dry-run test snapshots declared targets before/after; focused and full suites pass. |
| AC-02 | PASS | `STUB_CONTENT`, `CLEARED_DIRECTORIES`, and reset tests cover the two new directories, `.gitkeep`, and the decision stub. |
| AC-03 | PASS | QA is excluded from cleared targets and a byte-buffer sentinel comparison passes. |
| AC-04 | PASS | Navigation files are absent from `STUB_CONTENT`; diff contains only a targeted README reset-section update. |
| AC-05 | PASS | CLI checks `--confirm-reset` before dirty inspection or apply; refusal snapshot test passes. |
| AC-06 | **FAIL** | Ordinary tracked/staged/untracked cases pass, but CR-129-001 proves a clean tracked symlink can mutate outside the repository. |
| AC-07 | PASS with blocked safety caveat | Clean ordinary-directory fixture applies and is idempotent; this does not mitigate CR-129-001. |
| AC-08 | PENDING POST-REVIEW-COMMIT RECHECK | Normal `npm test` is 301/301. The required review record must first be committed so the post-reset `validate:review-gate` run can be evaluated at the final reviewed tip. |
| AC-09 | PASS | Historical TASK_LOG and review-record assumptions use deterministic in-memory fixtures; Issue #106 canonical-name adversarial assertion remains. |
| AC-10 | **FAIL** | CR-129-002 proves a valid folded GitHub Actions command bypasses the scanner. |
| AC-11 | PASS | Operator guide states exact declared scope, dirty/confirmation behavior, recovery limitations, human-only orphan path, remote coordination, and non-security-purge boundary. |
| AC-12 | BLOCKED | Independent review evidence exists, but the Critical/Major findings block QA routing; independent QA and human merge approval remain pending. |

## 5. Verification Evidence

| Command / Experiment | Result |
|---|---|
| `git status --short --branch`; `git rev-parse HEAD`; `git branch --show-current` | Clean review start on the requested branch and commit |
| `git diff --stat d10f579..a0bbc7d`; `git diff --name-status d10f579..a0bbc7d`; full range diff | Exactly 8 changed files reviewed |
| `git diff --check d10f579..a0bbc7d` | PASS |
| `node --test test/reset-to-template.test.mjs test/backfill-work-item-records.test.mjs test/validate-review-gate.test.mjs` | PASS — 53/53 |
| `npm test` | PASS — 301/301 |
| Disposable committed-symlink apply experiment | FAIL safety contract — exit 0 and outside sentinel deleted |
| Folded GitHub Actions `run: >` scanner experiment | FAIL CI contract — destructive invocation not reported |
| `npm run validate:review-gate` before this record | Expected FAIL — implementation tip lacked a new review record |

The post-commit review-gate result, final `git diff --check`, and final commit SHA are recorded in the reviewer handoff after this artifact is committed.

## 6. Dead Code and Dependency Hygiene

- Dead code identified: none in the reviewed range.
- New or bumped dependencies: none; no package manifest or lockfile changed.
- The new Node imports use built-in modules only.
- No implementation files were changed by the Reviewer.

## 7. Review Decision and Required Follow-up

**Decision: BLOCKED — changes requested.**

| Item | Owner | Re-review Scope | Required Evidence |
|---|---|---|---|
| Enforce real-path containment and reject symlinked destructive targets | Developer Agent | `scripts/reset-to-template.mjs` and focused reset tests | Outside-repository sentinel remains unchanged; refusal is non-zero and no declared target is partially mutated |
| Make the CI guard resistant to multiline/folded command forms | Developer Agent | CI scanner and focused CI fixtures | GitHub/GitLab folded/literal multiline destructive forms fail; dry-run forms pass |
| Re-run all required gates after fixes | Developer Agent, then independent Reviewer | Exact fix commit range | Focused tests, 301+ full suite, plan §8 validators in normal and post-reset disposable repositories, review gate, and diff check |

QA must not receive this change until both blocking findings are fixed and independently re-reviewed. Human merge approval remains required after Reviewer and QA evidence.

## 8. Completion Check

| Item | Status | Notes |
|---|---|---|
| Scope Match | PASS | Reviewed only `d10f579..a0bbc7d`; artifact-only reviewer change |
| Source Grounding | PASS | AC-01..AC-12 and workflow gate used as authoritative sources |
| Artifact Complete | PASS | Structured findings, severity, AC mapping, evidence, risks, and handoff included |
| Quality Gate | BLOCKED | One Critical and one Major finding |
| No Unsafe Action | PASS | Destructive checks ran only in disposable temporary fixtures |
| Minimal Change | PASS | Only this review record is to be committed |
| Risks / Limitations | RECORDED | Post-reset final-tip validators require the review record commit; implementation remains blocked regardless |
| Next Action | REQUIRED | Developer fixes CR-129-001 and CR-129-002, then requests independent re-review |
