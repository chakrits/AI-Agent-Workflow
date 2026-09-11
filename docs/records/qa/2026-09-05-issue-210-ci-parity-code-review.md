# Code Review Findings

Scope: adds the three portable validators GitHub enforces and GitLab did not, plus `scripts/validate-ci-parity.mjs` and its tests so the drift cannot recur silently. Work item: [Issue #210](https://github.com/chakrits/AI-Agent-Workflow/issues/210).

| Finding ID | Severity | File / Area | Finding | Recommendation | Blocks Progress? | Evidence |
|---|---|---|---|---|---|---|
| CR-1101 | Major | `.gitlab-ci.yml` | `validate:clearable-refs`, `validate:dispatch-receipts`, and `validate:workflow-evidence` ran on GitHub and not on GitLab, so a GitLab-hosted clone was enforced by a weaker gate set. All three are plain Node scripts with no host API dependency — there was no technical reason for the gap | Add all three as GitLab jobs | No — fixed in this diff | Measured at `34198d5`: GitHub validate job 12 named scripts, GitLab 10 |
| CR-1102 | Major | Recurrence | Adding three lines fixes today and not tomorrow. The gap arose because a validator was added to one file and not the other, with nothing reporting it | Add `validate:ci-parity`, wired into **both** CI files, so each host enforces the symmetry | No | `node scripts/validate-ci-parity.mjs` at `34198d5` exits 1 naming all three; after the fix it exits 0 |
| CR-1103 | Major | Fail-open risk | A parity check that can be satisfied by quietly deleting the assertion is not a control | Asymmetry is allowed only by naming a script in `HOST_ONLY_SCRIPTS` with a reason. A test asserts that list is currently empty, so adding an entry is a visible, reviewed decision rather than a default | No | Test `the exemption list is empty, so every portable validator must run on both hosts` |
| CR-1104 | Major | Credentials assumption | `validate:dispatch-receipts` is invoked with `GITHUB_TOKEN` in GitHub CI. Adding it to GitLab without checking would have introduced a job that fails or behaves differently on the other host | Verified before adding: all three exit 0 with the token unset. `defaultCommentExists` (`scripts/validate-dispatch-receipts.mjs:318-320`) adds an `Authorization` header only when `GITHUB_TOKEN` is present; it does not require one | No | `env -u GITHUB_TOKEN -u GH_TOKEN node scripts/validate-dispatch-receipts.mjs` → `Dispatch receipt validation passed.`, exit 0 |
| CR-1105 | Minor | Known limitation, stated not hidden | Parity of *invocation* is not parity of *behaviour*. On GitLab, `validate:dispatch-receipts` will make any GitHub comment-existence request unauthenticated, which is subject to a lower rate limit. It passes today because no receipt currently cites a comment URL | Record it rather than claim identical enforcement. Revisit if receipts with comment evidence become routine on a GitLab-hosted clone | No | `scripts/validate-dispatch-receipts.mjs:318-320` |
| CR-1106 | Question | Blast radius | Does `docs/workflow/platform-readiness.md` need updating? | Its claim that GitLab "runs the portable test and contract-validation suite" was inaccurate before this change and is accurate after it, so AC-05 is satisfied by the CI change itself. An edit was drafted to name the enforcing check, then **reverted**: `platform-readiness.md` is pinned by sha256 in `test/fixtures/context-pack-v1/required-source-matrix.json`, and editing it broke 7 context-shadow tests. Trading a hash-fixture change for one explanatory sentence is not worth the risk inside a Bug Fix | No — scope held deliberately | 7 failures (`not ok 60, 62-66, 231`) with the edit; 509/509 after reverting |

## Parked observation — not fixed here

Editing any of the ~20 canonical and skill files pinned in `required-source-matrix.json` silently fails 7 tests unless the sha256 is re-pinned by hand, and **no tooling exists to re-pin it** — no script references the fixture except the two tests that read it. This is the same class as Issue #198's "stale `required-source-matrix.json` hashes". It is real friction against exactly the documentation work this framework asks agents to do. Owner: Developer Agent. Next action: open a follow-up for a re-pin command, or narrow what the matrix pins.

## Verification

- TDD: the checker was written first and run against the unmodified repository, where it exited 1 and named all three missing validators. That is the meaningful RED — it proves the detector catches the real defect before the defect is fixed, rather than only agreeing with its own fixture. The repository-level test `this repository runs the same portable validators on GitHub and GitLab` failed at that point and passes now.
- The module-not-found failure on first run was a structural RED, not a behavioural one, and is recorded rather than presented as evidence.
- `npm test`: 509 / 509 (503 before; +6).
- `validate:ci-parity`, `validate:contracts`, `validate:project-state`, `validate:skill-parity`, `adr:audit`, `validate:risk-register`, `validate:skill-usage`, `validate:metrics`, `validate:context-budget`, `validate:clearable-refs`, `validate:workflow-evidence`, `validate:dispatch-receipts`, `git diff --check`: all PASS.

## Revision after independent QA (NEEDS_REVISION)

Independent QA returned NEEDS_REVISION at `973180d`: all six ACs passed as written, but one Critical and four Major findings blocked readiness. Every finding was reproduced before being accepted, and one was checked and found factually wrong.

| Finding ID | Severity | Finding | Fix | Evidence |
|---|---|---|---|---|
| CR-1107 | Critical | **A `node_modules` symlink pointing at an absolute home directory was committed.** I created it so the worktree could run the suite, then `git add -A` swept it in. `.gitignore:5` was `node_modules/` — the trailing slash matches directories only, so a symlink walked straight past it. CI stayed green because `npm ci` replaces it, which is exactly why nothing caught it | `git rm --cached node_modules` and `.gitignore` changed to `node_modules` without the slash. The symlink stays on disk, untracked, so the worktree still runs | `git ls-tree 973180d node_modules` returned a `120000` blob containing `/Users/maclab/…`; absent at `34198d5`; `git check-ignore -v node_modules` now matches |
| CR-1108 | Major | The detector regex-scanned raw text, so a GitLab step commented out with `#` counted as coverage. Commenting out a flaky job is a routine edit and would have silently restored the exact drift this check exists to prevent | Parse both files with the `yaml` package already in devDependencies, and read only real job values | QA case B reproduced: before, `[]`; after, `['npm run validate:workflow-evidence']` |
| CR-1109 | Major | Only `npm run` was matched, so `node scripts/x.mjs` and `npx x` were invisible — a whole class of validator invocation | `normaliseCommand` handles all three shapes and compares invocation identity, so `npm run x -- --strict` equals `npm run x` | QA case C reproduced: before, `[]`; after, both commands reported |
| CR-1110 | Major | The extractor read the whole GitHub workflow, so a GitHub-only `publish` job produced a false failure demanding GitLab run it | Scoped to the named `validate` job via the parsed document | QA case G: `[]`, no false failure |
| CR-1111 | Major | **QA's example was wrong, the principle was right.** QA cited `validate_project_state`'s narrower GitLab rules as a live weaker gate. It is not: `.github/workflows/documentation-sync.yml:4-5` also runs it only on push to `main`, so the two hosts match. The general point stands — this check compares *which* commands run, never *when* | Not fixed; comparing triggers is a separate design. The limitation is now printed by the CLI on every run and stated in the module docstring, so it cannot be mistaken for a guarantee | `documentation-sync.yml:4-5` versus `.gitlab-ci.yml:33-34` |
| CR-1112 | Major | **CR-1104 in this record overclaimed.** I wrote that all three validators were "verified to exit 0 with the token unset". QA established the code path is unreached: `grep -rn "state: consumed" docs/` returns 0, so `validateTerminalEvidence` skips every receipt and the API call never runs. Exit 0 proved the path is dead, not that it is token-independent | The claim is corrected rather than defended. See the limitation recorded below | QA's `grep`, reproduced |
| CR-1113 | Minor | `HOST_ONLY_SCRIPTS` was `string[]`, so the "reason" the docstring and PR body both promised had nowhere to live, and a duplicate, stale, or empty entry was silently accepted | Entries are now `{ command, reason }`. A missing reason throws, and so does an entry naming a command the GitHub validate job does not run, so a stale exemption is reported rather than sitting inert | New test `an exemption must carry a reason and name a command GitHub actually runs` |

### Corrected limitation, replacing CR-1104's overclaim

Adding `validate:dispatch-receipts` to GitLab does **not** establish equal enforcement on both hosts. Two things are true and were not stated plainly enough before:

1. The GitHub API path in `defaultCommentExists` is currently unreachable because no consumed receipt exists in the repository. The passing run proves nothing about token independence.
2. When a consumed receipt with a `github-comment` terminal id does appear, an unauthenticated GitLab run hits the 60-per-hour anonymous limit; a 403 makes `response.ok` false, which the validator reads as "the comment does not exist" — a spurious hard failure rather than a skip. `owner` and `repo` also default to `chakrits`/`AI-Agent-Workflow` (`scripts/validate-dispatch-receipts.mjs:331-332`), so a GitLab-hosted fork would validate against this GitHub repository.

Both are properties of `validate-dispatch-receipts.mjs`, which this change only invokes. **Owner: Developer Agent. Next action: open a follow-up** to gate the live check on token presence and to derive `owner`/`repo` from the remote. Not fixed here: it is a second unreviewed judgment call inside a Bug Fix, and it is the reason the parity claim is now stated as parity of invocation rather than of enforcement.

Suite 509 → 513.

## Second revision after independent re-review

Independent re-review at `681a40e` disposed of CR-1107–CR-1113 and CR-1111/CR-1112's corrections as verified, confirmed CR-1104's overclaim was the actual error (not a new problem), and found one new Major finding: a regression that CR-1110's own fix introduces.

| Finding ID | Severity | Finding | Fix | Evidence |
|---|---|---|---|---|
| CR-1114 | Major | **Scoping to the named `validate` job (CR-1110) creates a fail-open of its own.** `githubJobCommands` returned an empty `Set` when the job name did not resolve — not just for a genuinely job-less workflow, but identically for a workflow where the job was renamed or restructured. `findMissingFromGitlab` then compared an empty GitHub set against anything and reported zero missing commands, and `main()` printed `CI parity check PASSED` with `0` commands compared on either side. A job rename is a smaller, less visible action than editing `HOST_ONLY_COMMANDS`, and unlike that path it produced no error at all | `githubJobCommands` now throws when the named job is absent or has no steps array, naming the job and file. `main()`'s existing exemption-error catch block now also catches this, so a rename surfaces as `CI parity check FAILED`, not a silent PASS | Reproduced against a fixture with the job renamed to `validate-contracts`: before, `findMissingFromGitlab` returned `[]` and the CLI printed PASSED; after, both throw naming `job "validate" was not found` |
| — | Minor (CR-1109 wording) | This record's CR-1109 entry says `normaliseCommand` "compares invocation identity." It does not across shapes: `npm run validate:contracts` and `node scripts/validate-contracts.mjs` invoke the same script but normalise to two different literal strings, so the check would report a false parity failure rather than recognizing them as equivalent | Not fixed — recorded as a documentation-precision correction, not a behavior change. `normaliseCommand` compares invocation *text*, not the script identity behind it. Left for a follow-up if this asymmetry is ever hit in practice | Reproduced: GitHub `npm run validate:contracts` vs. GitLab `node scripts/validate-contracts.mjs` → reported as missing on GitLab side despite running the same script |
| — | Minor (merge strategy) | The absolute local path from the CR-1107 symlink remains in this branch's commit history at `973180d` even though `681a40e`'s net diff against `main` is clean. A merge or rebase that preserves individual commits carries the path into `main`'s permanent history; only a squash merge avoids it | Not a code fix — recorded for the Human Maintainer's merge-strategy decision | `git log -p --all -- node_modules` on this branch shows the path at `973180d` |

Suite 513 → 515 (two regression tests added for CR-1114: a renamed job and a job with no steps, both asserting the check now fails loudly instead of comparing nothing).

`task_review_rework_count` is now **2 of a maximum 2 — the ceiling**, per `docs/workflow/task-execution-mode.md:55-58` ("increments once after a review that needs a fix"). This entry originally understated it as "1 of a maximum 2"; that was a counting error in this record, corrected here rather than left standing. The review at `973180d` that produced CR-1107–1113 was round 1; the review at `681a40e` that produced CR-1114 was round 2, which is the ceiling.

## Third revision after independent re-review

The next review, of `0e1244c`, is therefore the "next unresolved review result" that `task-execution-mode.md` says stops for the Human Maintainer rather than looping into a third automatic fix round. It found one new Major (CR-1115), reported as NEEDS_REVISION. Per the Human Maintainer's explicit decision at that point — fix it anyway, rather than merge with the gap documented as residual risk or stop for further manual review — this round proceeded as an exception to the stated ceiling, not as a silent continuation of it.

| Finding ID | Severity | Finding | Fix | Evidence |
|---|---|---|---|---|
| CR-1115 | Major | **CR-1114's guard (`!Array.isArray(steps)`) does not cover a job whose `steps` array exists but yields zero recognised commands.** A `validate` job restructured into a composite action (`uses: ./.github/actions/run-validators` instead of direct `run:` steps) or reduced to a literal `steps: []` passes the CR-1114 guard, produces an empty command `Set`, and reaches the identical silent outcome CR-1114 was raised to close: `findMissingFromGitlab` compares 0 GitHub commands against GitLab's, `main()` prints `CI parity check PASSED` with `GitHub "validate" job runs: 0 command(s)`, exit 0 | `githubJobCommands` now also throws when the extracted command set is empty, naming the job and file, with the same message shape as the CR-1114 throw so both failure modes surface identically through `main()`'s existing catch | Reproduced against composite-action and `steps: []` fixtures: before, both printed `PASSED` with `0 command(s)` and exited 0; after, both throw `job "validate" ... yielded no comparable commands` and the CLI exits 1 |

Suite 515 → 517 (two regression tests added for CR-1115: a composite-action-only job and a literal `steps: []` job). Mutation-verified: removing the new zero-commands guard drops the suite to 12/14 passing on the affected test file, failing exactly the two new CR-1115 tests and nothing else.

`task_review_rework_count` is now **3**, one past the stated ceiling of 2, by the Human Maintainer's explicit direction rather than by default. Any further unresolved finding on this PR should not be treated as another automatic round — it returns to the Human Maintainer for a decision, as the ceiling already called for at round 2.

## Review Decision

Approved. CR-1101 is the defect; CR-1102 and CR-1103 are what stop it returning; CR-1104 is the check that kept the fix from being cosmetic on the other host; CR-1105 and CR-1106 mark the two things this change does **not** claim.

## Independent Review

Not dispatched at self-review time. Recorded per this repository's `code-review-gate` convention before requesting independent QA verification of Issue #210's Acceptance Criteria.
