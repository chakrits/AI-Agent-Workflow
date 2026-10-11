# Evidence and Specification Completion Check — Issue #294

## 1. Completion Claim
Specification bundle accepted by Human Maintainer on 2026-10-11 at `def7008ce9e4676605cee4ab94c4af1accb28369`; OQ-01–04 and all artifacts are approved. No skill validator, workflow, core instruction, matrix, hook, or branch-protection implementation has changed on this branch. All implementation acceptance remains Pending in https://github.com/chakrits/AI-Agent-Workflow/issues/294.

Baseline reviewed: `87a0917f1c56859926097468c99023918dd314a7` on 2026-10-11. Baseline survey experiments were executed in disposable archive copies under `/private/tmp`; those copies were not candidate commits and are not independent QA. Evidence below distinguishes commands/output observed in this conversation from future evidence requirements.

## 2. Baseline Evidence Register
| ID | Method / source at baseline | Observed result / limitation |
|---|---|---|
| EV-01 | `validateSkillCatalog`, `checkSkillParity`, `validateSkillUsage`, `collectBudget`, `validateSourceMatrix` | 39 skills; 39 descriptions; 4,352 code points; parity failures 0; usage true; core-reference total 28,231 approximate tokens; matrix valid |
| EV-02 | Add temporary canonical-only valid skill; run catalog/parity and two selected content tests | Missing mirrors, catalog and vault entries; parity fails; tests fail 2/2. Platform-only `.agent` case: catalog stale-inventory error; parity failed count 0 |
| EV-03 | Add three identical temporary skill files plus catalog and three vault links | Catalog validator accepts 40 skills / 4,411 description code points; fixed Workflow domain-membership test fails on extra skill |
| EV-04 | Append ordinary catalog prose; call `validateSourceMatrix` | Invalid, 11 errors, unique cause `stale hash for docs/operating-model/SKILL_CATALOG.md`; source mapping contains 10 unique pinned skill files |
| EV-05 | Remove only GitHub catalog invocation; run selected CI-enforcement test | Fails 1/1: `GitHub validate job must run the skill catalog validator` |
| EV-06 | Read GitHub ruleset 18992836; legacy protection endpoint; git hook configuration | Active Protect main: required `work-item-readiness-freshness`, app integration 4329997, strict policy, no bypass. Legacy protection endpoint 404; local hooksPath unset, default pre-push absent. This is an observation at survey time, not a lasting guarantee |
| EV-07 | Focused baseline commands below | 46 + 120 + 4 = 170 passed; no full-suite or hosted-candidate claim |

Source anchors: `scripts/validate-skill-catalog.mjs:90-157`; `scripts/validate-skill-parity.mjs:25-79`; `test/validate-contracts.test.mjs:16-108`; `test/validate-ci-parity.test.mjs:111-140`; `scripts/lib/context-compatibility-v1.mjs:16-35,114-152`; `scripts/validate-edit-guards.mjs:64-73`; `.github/workflows/validate-contracts.yml:12-33`. Resolve all against the baseline SHA, not the eventual implementation head.

## 3. Commands / Reproduction
```bash
node --test test/validate-skill-catalog.test.mjs test/validate-skill-parity.test.mjs test/validate-skill-usage.test.mjs test/validate-ci-parity.test.mjs
# Observed: 46/46
node --test test/validate-contracts.test.mjs test/issue-237-ac14-consumers.test.mjs test/validate-workflow-playbooks.test.mjs
# Observed: 120/120
node --test --test-name-pattern='context-pack/v1 accepts exact|context-source-matrix/v2 makes|source matrix rejects' test/validate-context-compatibility.test.mjs
# Observed: 4/4
gh api repos/chakrits/AI-Agent-Workflow/rulesets/18992836
```
Probe recipe: reproduce EV-02–05 only in a temporary baseline checkout, add name `exploration-probe` with description `Use for an isolated audit of skill onboarding dependencies.`, then independently add mirrors/catalog/vault registration, append catalog prose, or remove the CI line as the table specifies. Compare exact errors above. Node imports of some CLI modules require a nonempty `process.argv[1]`; use a real audit script entrypoint or the native CLI, not bare stdin imports. Raw temporary terminal logs were displayed in this conversation; they are not immutable external log URLs.

## 4. Specification Verification Evidence
- Documentation preparation verification on 2026-10-11: eight Issue #294 documents, including the Human-review handoff, have valid relative Markdown links; all 12 AC IDs have proposed cases; diff scope is documentation-only.
- Full current regression on this documentation worktree: `npm test -- --test-reporter=dot` exited 0. Reporter displayed dots rather than a count; no fabricated full-suite total is given. This verifies the unchanged current implementation with draft documents, not the proposed decoupling behavior.
- Existing validators exited 0: contracts, project-state, CI parity, skill catalog/parity/usage, context budget/compatibility, status projection, clearable refs, and ADR audit. Catalog still reports 39 skills / 4,352 code points; projection digest remains `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`; ADR ratio 2.15:1. `git diff --check` also passed.
- Locked dependency installation used `npm ci --ignore-scripts --offline --no-audit --no-fund`. The first sandboxed install could not create this managed worktree's node_modules; the authorized escalated retry succeeded. No dependency versions changed.
- Native platform activation: Not Run; no native activation claim.
- Independent implementation QA/Security review: Not Run; no implementation exists.
- Hosted PR/default-branch candidate checks: Not Run; no PR/merge exists for this issue.
- Historical specification branch-push evidence at `def7008ce9e4676605cee4ab94c4af1accb28369`: [run 38113491394](https://github.com/chakrits/AI-Agent-Workflow/actions/runs/38113491394) succeeded, 808 tests/pass, 0 fail/skipped. This is not decoupling implementation acceptance.
- Human approval authority and decisions: [approval record](../HANDOFF-2026-10-11-issue-294-design-approval.md).

## 5. Required Candidate Evidence Shape
Specification verification commit is resolved externally by the published branch head; design-content SHA and record commit resolution are in the Human-review handoff. Human design acceptance is recorded separately; independent implementation QA has not run.
For each TC/AC: candidate full SHA, baseline full SHA when comparing, OS/Node/dependency versions, configured mandatory-command inventory, fixture/edit description, companion-file hashes, stdout/stderr, exit status, test totals, raw-log URL/hash, reviewer identity, and Pass/Fail/Not Run with reason. Required hosted evidence includes PR head SHA/run URLs, readiness check name/source, merge SHA, and default-branch run. Independent reviewers re-derive outcomes; author reports are inputs, not proof.

No fabricated log links or candidate passes. A failed/unsupported case remains Fail/Pending and blocks the corresponding acceptance milestone. Native checks may be Unavailable only with a reason; they never become a CI/native-activation equivalence claim.

## 6. Artifacts / Residual Risks
Requirements, SDD, TDD, implementation/test plans, work item, Accepted ADR-0036, PROJECT_STATUS/TASK_LOG, Human-review handoff and approval record exist. CHANGELOG is N/A for this documentation-only branch. Test report is N/A until implementation QA. Risks and accepted scope decisions are in requirements and SDD.

## 7. Recommendation
Design and ASM/OQ decisions are approved; record spec-ready based on explicit Human approval and follow the implementation plan. Do not add development-done/verification-done based on baseline evidence. Issue #284 should adopt the new approved discovery expectations before its scenario corpus is frozen; do not silently amend its ACs or mark it implemented.
