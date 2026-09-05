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

## Review Decision

Approved. CR-1101 is the defect; CR-1102 and CR-1103 are what stop it returning; CR-1104 is the check that kept the fix from being cosmetic on the other host; CR-1105 and CR-1106 mark the two things this change does **not** claim.

## Independent Review

Not dispatched at self-review time. Recorded per this repository's `code-review-gate` convention before requesting independent QA verification of Issue #210's Acceptance Criteria.
