# Debug Ledger — Issue #290 Readiness Workflow

| Item | Detail |
|---|---|
| Work Item / Ticket | Issue #290; blocked required check on PR #289 |
| Feature / Module | `.github/workflows/work-item-readiness-refresh.yml` → `scripts/work-item-readiness-check.mjs` → `scripts/work-item-readiness.mjs` |
| Owner | Orchestrator / Developer Agent |
| Started | 2026-09-30 |
| Current Status | Root cause confirmed; implementation and local verification complete; independent QA pending |

## Symptom

| Field | Detail |
|---|---|
| Observed Failure | Required check `work-item-readiness-freshness` fails on valid PR #289 metadata |
| Error / Log / Stack Trace | `Linked Issue is missing: YAML parser dependency unavailable.` |
| Environment | GitHub Actions `pull_request_target` readiness refresh, trusted `main` checkout |
| Frequency | Deterministic on current `main` for frontmatter PRs |
| First Seen | 2026-09-30 on PR #289 |

## Repro

| Field | Detail |
|---|---|
| Repro Status | Deterministic; hosted check reproduced on PR #289 after both pushes and PR-body edit |
| Steps | Trigger `work-item-readiness-refresh.yml` for PR #289; workflow checks out `main`, imports readiness helper, then publishes failure |
| Command / Test | `gh api repos/chakrits/AI-Agent-Workflow/commits/a0104023bd0864f71f2026371b4902004955b76a/check-runs` |
| Test Data | Valid Mode A PR frontmatter and linked Issue #283 URL in PR #289 |
| Expected | Readiness check evaluates the trusted validator using installed `yaml` and `ajv` packages |
| Actual | `validateReadiness()` returns `YAML parser dependency unavailable` |

## Fail Path

| Layer | Evidence |
|---|---|
| Entry point | `.github/workflows/work-item-readiness-refresh.yml`, `pull_request_target` job `publish-current-readiness` |
| Failing function / module | `scripts/work-item-readiness.mjs` → `getYaml()` → `require('yaml')` |
| Relevant branch / condition | The `require('yaml')` catch sets `_YAML = null`; `extractFrontmatter()` returns `YAML parser dependency unavailable` before parsing input |
| Relevant config / data | `yaml` and `ajv` are listed in `package.json`/lockfile as devDependencies; workflow has no `setup-node` or `npm ci` step |
| Last known good state | `validate-contracts.yml` installs Node 22 and runs `npm ci` before validators |
| First bad state | Readiness workflow invokes source from checkout without installing package dependencies |

## Hypothesis Matrix

| ID | Hypothesis | Why plausible | Proof | Disproof | Experiment | Result | Status |
|---|---|---|---|---|---|---|---|
| H-001 | Trusted readiness runner never installs `yaml`/`ajv` | Workflow imports the validator but contains no dependency setup; other CI workflows install packages | Exact source shows missing install step; hosted check emits the parser-unavailable branch | A setup/install step before import would disprove this | Compare readiness workflow with `validate-contracts.yml`; inspect `package.json` and lockfile | Confirmed; direct cause | Ruled in |
| H-002 | PR frontmatter itself is malformed | Readiness failure names the linked Issue as missing | `extractFrontmatter()` returns the dependency error before reaching YAML parsing/schema checks | Same error occurs before examining frontmatter syntax | Trace exact validator branch and inspect valid PR #289 body | Disproved | Ruled out |
| H-003 | GitHub App lacks permissions to create or publish the check | App-owned check is the failed context | Failure summary is present in completed check; workflow source includes check creation and required App permissions | Missing dependency error originates before issue-state validation, not from API authorization | Inspect check-run output and workflow permissions/create call | Disproved as cause of this failure | Ruled out |

## Experiment Ledger

| Run ID | Timestamp | Change / Command | Observation | Ruled In | Ruled Out | Next Action |
|---|---|---|---|---|---|---|
| RUN-001 | 2026-09-30 | `gh pr checks 289`; retrieve failed check summary via GitHub API | Required check failed identically after PR commits and body edit | Deterministic failure is on trusted default-branch workflow | Sandbox `gh` auth as cause; PR-specific body edits as cause | Trace source dependency loading |
| RUN-002 | 2026-09-30 | Read `work-item-readiness-refresh.yml`, `work-item-readiness.mjs`, `package.json`, and `validate-contracts.yml` | Readiness workflow has no Node/dependency setup; parser is imported with `require`; package deps are only installed by other CI | Missing dependency installation | Invalid body as source of this exact error | Add contract test first, then minimal trusted install step |
| RUN-003 | 2026-09-30 | Added the workflow contract test, ran it red on baseline; added trusted Node 22/npm setup, then ran `node --test test/validate-project-state.test.mjs` and `npm test` | Regression test failed before implementation for missing Node setup; then all focused tests passed 9/9 and full suite passed 794/794 | Missing dependency setup is the fix seam | Assertion syntax issue was corrected after a separate false failure (`run:` is a distinct YAML field under named steps) | Independent QA and review |

## Current Conclusion

- Confirmed root cause: the `pull_request_target` readiness job imports trusted validator modules without installing the lockfile dependencies `yaml` and `ajv`.
- Confidence: High
- Remaining uncertainty: The repair PR cannot make the App-owned check pass before the updated workflow reaches `main`; human must decide the permitted merge path under repository rules.

## Fix Direction

- Proposed fix (implemented): set up pinned Node 22 and run `npm ci --ignore-scripts` after trusted default-branch checkout and before invoking `github-script`.
- Why it addresses root cause: dependencies required by the imported trusted code become available while preserving lockfile integrity and disabling package lifecycle execution.
- Risks: Running npm install in a privileged `pull_request_target` workflow; mitigated by never checking out or executing PR code and using `--ignore-scripts`.
- Validation plan: failing-before/passing-after workflow contract test, full tests and validators passed locally; hosted CI and fresh readiness check on PR #289 remain pending after this fix reaches `main`.
