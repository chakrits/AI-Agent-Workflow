# Test Report

## Metadata

- Work Item ID: Issue #297, slice S3 (AC-006)
- Build/Version: branch `feat/issue-297-effective-agent-execution`, HEAD `9ad5bb1` (base `609f45a`)
- Environment: local, macOS, Node v22.22.3, scratch git repos outside the repo
- Tester / Agent: QA Agent (independent verifier; did not implement)
- Date: 2026-10-12

## Scope

S3 of the Issue #297 plan: `scripts/lib/diff-scope.mjs`, `scripts/validate-lessons-learned.mjs`, CI wiring (GitHub step, GitLab job, package script), README sentence, template wording, and the finding-1 bounds fix. Out: S4-S6, security findings 2, 3, 5 (accepted follow-ups).

## Test Summary

| Type | Total | Passed | Failed | Blocked | Notes |
|---|---:|---:|---:|---:|---|
| Unit | 26 | 26 | 0 | 0 | `validate-lessons-learned` + `diff-scope` tests |
| API | 0 | 0 | 0 | 0 | N/A |
| E2E | 41 | 41 | 0 | 0 | QA scratch-repo behavior matrix + bounds/timeout runs, all exit 0 |
| Regression | 825 | 825 | 0 | 0 | `npm test`; CI-reading tests 117/117 |

## PR/Issue Comment Summary

**Overall Status:** Conditional Pass

| Type | Total | Passed | Failed | Blocked |
|---|---:|---:|---:|---:|
| Unit | 26 | 26 | 0 | 0 |
| API | 0 | 0 | 0 | 0 |
| E2E | 41 | 41 | 0 | 0 |
| Regression | 825 | 825 | 0 | 0 |

**Defect Severity Summary:** Critical: 0 · High: 0 · Medium: 0 · Low: 3 · Informational: 2

**Tester's Note:** AC-006 behavior is verified. The Conditional is for one test gap: the whole-token `issue-<N>` boundary mutation survives the suite (F1). Not a behavior defect. GitLab predefined-variable behavior (`CI_MERGE_REQUEST_TARGET_BRANCH_NAME`, `GIT_DEPTH: 0` effect, whether the target branch ref exists in the job clone) cannot be verified offline and is Not validated.

## Failed Tests / Defects

**Defect Severity Count:** Critical: 0 · High: 0 · Medium: 0 · Low: 3 · Informational: 2

| ID | Scenario | Expected | Actual | Severity | Evidence |
|---|---|---|---|---|---|
| F1 | Mutation: drop `(?<![a-z0-9])`/`(?![a-z0-9])` from `workItemsForIssue` | A test fails | 0 failures; behavior differs (handoff for `issues/1` then also warns on `issue-12.md`) | Low (test gap) | Probe M4; the TC-006 test uses 900 vs `issue-90-other`, the direction the boundary does not protect (it needs n=90 vs a `issue-900` name) |
| F2 | Mutation: remove `LINK_NAME_RE` check | A test fails | 0 failures; `linkResolves(root,'sub/2026-10-12-y')` becomes true for a nested file | Low (test gap, partly defense in depth) | Probe M5; realpath containment still blocks `..` escape |
| F3 | Over-long line (>4096) is reported at level `warn` as `WARN [AC-006] ...: NOT EVALUATED: ...` | Plan says NOT EVALUATED | Output is a WARN, a false-positive style warning for a not-evaluated file; oversize FILE is `INFO` (inconsistent) | Low | bounds run: issue-7/8 WARN, issue-9 INFO |
| F4 | Mutation: placeholder branch removed | n/a | Survives, equivalent: `YYYY-MM-DD-slug` fails `LINK_NAME_RE`, so the result is still WARN; only the reason text differs | Informational | Probe M12 |
| F5 | Mutation M2 (set exitCode in WARN print) | n/a | Survives, equivalent: `process.exitCode = main()` overwrites it; the real non-zero-on-warn mutant (M2b) was killed (9 fail) | Informational | Probe M2/M2b |

## Root Cause Analysis

### Defect F1

1. Why did it fail? The mutation is not detected.
2. Why? The test checks that `issue-900` does not pull in `issue-90-other`, which a plain substring match also satisfies.
3. Why? The negative case has the wrong direction.
4. Root cause: no fixture where the shorter number (e.g. 90) is a prefix of a longer file token (`issue-900`).

**Fix Recommendation:** Developer Agent adds a case: handoff for `issues/1` plus work items `issue-1` and `issue-12`; assert only `issue-1` is evaluated. Same idea for F2: a nested `sub/<name>` link must not resolve. Not fixed here.

## Coverage

- Acceptance criteria covered: AC-006 (advisory WARN, exit 0, scope A and B, both Status formats, `N/A` rules, link containment, bounds, CI wiring).
- Not covered: GitLab runtime behavior (Not validated: offline); NFR performance beyond the bounded-input runs.
- Regression risk: Low; no existing script or skill touched.

## Release Recommendation

Conditional Go (for slice S3): fix test gap F1 (and optionally F2/F3) before or alongside S4; no blocker.

## Notes

### Verification commands (all re-derived)

| Check | Result |
|---|---|
| `npm test` | tests 825, pass 825, fail 0 |
| `node --test test/validate-lessons-learned.test.mjs test/diff-scope.test.mjs` | pass 26, fail 0 |
| `npm run validate:lessons-learned` (this branch) | `INFO: no closeout scope`, exit 0 |
| `npm run validate:ci-parity` | `CI parity check PASSED: GitLab runs every command the GitHub validate job enforces.` |
| `npm run validate:contracts` | `Contract validation passed.` |
| `npm run validate:project-state` | `Project state validation passed.` |
| `npm run validate:clearable-refs` | `PASS: no changed content file depends on a cleared document for meaning.` |
| skill-decoupling-contract, validate-ci-parity, validate-contracts, reset-to-template tests | pass 117, fail 0 |

### Red/green

Temporary worktree at `609f45a` with only the two new test files copied in: `# pass 0`, `# fail 21`, `ERR_MODULE_NOT_FOUND ... scripts/lib/diff-scope.mjs` (scripts absent; the `validate-lessons-learned` tests also fail since the script is absent). Green at `9ad5bb1`: 26/26. Worktree removed; `git worktree list` shows no leftover.

### Behavior matrix (scratch repos, `GITHUB_BASE_REF=main`, every case rc=0)

Run for both Status formats (`## Status: Closed (...)` inline and `## Status` + next-line `Closed`), identical results:

- real lesson -> `OK [AC-006] ... records lessons`
- empty -> `WARN ... section is empty`; missing heading -> `WARN ... no ## Lessons Learned section`
- `[[../lessons-learned/YYYY-MM-DD-slug]] or N/A` -> `WARN ... template placeholder left in place`
- `N/A` and `- N/A` -> `WARN ... bare N/A`; `N/A — no session, docs only` -> OK
- existing wikilink -> OK; dangling -> `WARN ... does not resolve`; symlink to a file outside the directory -> WARN
- B: handoff `issues/1` with work items issue-1 and issue-12 (both bare N/A) -> WARN only `issue-1.md`; `issues/12` -> WARN only `issue-12.md`; handoff with its own Lessons Learned -> `OK ... records lessons for #1`; `issues/99` -> `INFO: no work-item record for #99; not evaluated`
- non-closed item, and a change with no closeout files -> `INFO: no closeout scope`
- unresolvable base, `ma;in`, `../x`, `-x`, HEAD equal to merge-base, no git repo -> `NOT EVALUATED: no PR range`
- no env var (defaults to main) -> evaluated; `--all` -> WARN lines, rc=0

### Bounds (finding-1 fix)

5000-char line in a work item: `NOT EVALUATED: a Lessons Learned line exceeds 4096 characters` in 0.046 s total; 300000-byte file: `INFO ... NOT EVALUATED (file exceeds 262144 bytes)`; 190 repeated `[[../lessons-learned/` (3990 chars) evaluated in 0.049 s. Git timeout: fake `git` that sleeps 60 s, `makeGit(timeoutMs=500)` returned `undefined` after 0.53 s. Existing repo records: `isClosed` + `checkLessons` output for all 10 work-items/handoffs is IDENTICAL between `ce3a9cc` (pre-fix, the `609f45a` base has no script) and `9ad5bb1`: 3 ok, 7 not ok, 0 NOT EVALUATED.

### Wiring and untouched files

- GitHub: `- run: npm run validate:lessons-learned` is a bare step in `validate` after `validate:ci-parity`; `fetch-depth: 0` set at checkout; no `continue-on-error` in file.
- GitLab: `validate_lessons_learned` has `GIT_DEPTH: 0`; stage, cache and rules identical to `validate_ci_parity`. `package.json` script present.
- Not validated: GitLab predefined variables and runner clone depth (offline).
- `git diff 609f45a..9ad5bb1 --stat` contains none of `archive-work-item.mjs`, `adr-audit.mjs`, skills, `AGENTS.md`, `core-bootloader.md`, `DECISIONS.md`.
- README: one sentence appended; "Hermes memory / skills" wording kept. Template line 20 reworded to "Durable lessons saved to the project's agent memory or notes (if any)".

### Mutation probes (scratch copy, restored and `cmp`-verified)

| Probe | Result |
|---|---|
| M1 bare N/A accepted | killed (4) |
| M2b non-zero exit on warn | killed (9); M2 survived, equivalent (F5) |
| M3 skip scope B | killed (4) |
| M4 drop issue-N token boundary | SURVIVED, gap (F1) |
| M5 skip link-name regex | SURVIVED, gap (F2) |
| M6 skip realpath containment | killed (1) |
| M7 remove line cap | killed (2) |
| M8 remove git timeout | killed (1) |
| M9 remove file-size cap | killed (2) |
| M10 allow unsafe ref | killed (1) |
| M11 ignore handoff own lessons | killed (1) |
| M12 placeholder check removed | survived, equivalent (F4) |
| M13 block-status ignored | killed (1) |
| M14 handoff line cap removed | killed (1) |
| M15 wrong diff-filter | killed (11) |
| M16 HEAD==base not NO_RANGE | killed (2) |

### Open Questions

None blocking.
