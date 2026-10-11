# Implementation Plan — Issue #297

## 1. Plan Summary
| Item | Detail |
|---|---|
| Work Item / Branch | https://github.com/chakrits/AI-Agent-Workflow/issues/297 / `feat/issue-297-effective-agent-execution` |
| Change Type / Risk | Framework / Meta; Medium (Human-confirmed) |
| Owner / Status | Developer Agent (plan author); plan is Proposed until the Orchestrator records spec-ready. It authorizes no implementation by itself. |
| Governing artifacts | SDD `docs/records/sdd/2026-10-11-issue-297-effective-agent-execution-sdd.md` (Human-approved: its Open Questions section records all six OQs accepted by the Human Maintainer on 2026-10-11; approval commits `f8c163b`, `4628f97`). ADR-0037 (`DECISIONS.md`, Accepted). Issue #297 Section 9 decisions. |
| Scope | AC-001, 002, 004, 006, 007, 008, 009. AC-003 Deferred and AC-005 Dropped (ADR-0037); not planned here. |
| Baseline | HEAD `4628f97`. `git diff --stat 2dca980 4628f97` touches only `DECISIONS.md` and the SDD, so every SDD source line reference to code/config still holds at HEAD (re-derived below). `npm test` = 783 pass / 0 fail. |

### 1.1 Definition-of-Done restatement (checklist before any slice starts)
- [ ] AC-004: evidence refs for `repro`, `fail_path`, `hypothesis_matrix` are path / URL / issue-comment (`https://github.com/.../#issuecomment-N` or bare `issuecomment-N`); additive only, no key renamed; `docs/contracts/bug-fix-workflow.yaml` is the single policy source; `contract_version` stays 1; fixtures, `validate:contracts`, 3 archived shards, `::TC-007` second test stay valid.
- [ ] AC-006: separate advisory validator `validate:lessons-learned` (exit 0, `WARN [AC-006]`), GitHub + GitLab wired, no skill enforcer, `archive-work-item.mjs` untouched, `LESSONS_LEARNED.md` stale Hermes line fixed.
- [ ] AC-001/002: advisory `validate:execution-discipline` (exit 0), GitHub + GitLab + `.githooks/pre-push` caller, no new rule text in `AGENTS.md`, `.claude/settings.json` untouched, thresholds pinned to `AGENTS.md:24`.
- [ ] AC-007: Bootloader gains the Execution Lifecycle subsection; measured Bootloader <= 2,300 (hard cap for this slice), ceiling 2,500 unchanged; `repin:source-matrix` second run no-op.
- [ ] AC-008: Pattern Selection Matrix <= 1,600 chars in `dynamic-routing.md`; Tier 3 <= 30,000.
- [ ] AC-009: ADR-0037 present (done); PR carries Documentation Impact; Human approval gate honoured.
- [ ] NFR: each advisory script < 5 s, offline, deterministic; never a false green (`NOT EVALUATED` instead of `OK` when unevaluated); no `continue-on-error`, no broad `|| true`.
- [ ] Every behavior change has a red test seen failing on the current tree first (Issue: `TC-001/002` baseline already passes, so they are not the red test).

## 2. Inputs Reviewed
| Artifact | Status | Notes |
|---|---|---|
| Issue #297 body (rev 2) | Available | Read via `gh issue view`; AC table and TC-001..015 match the SDD traceability. Not edited. |
| SDD | Available, Human-approved | Header still says "Proposed — awaiting Human approval" (stale); see OQ-P6. |
| ADR-0037 | Accepted | `DECISIONS.md`. |
| Requirement / TDD / API contract | N/A / N/A / N/A | Requirements live in the Issue; no HTTP API. |
| Template + house style | Read | `docs/templates/IMPLEMENTATION_PLAN.md`; Issue #294 plan. |

### 2.1 Tree verification (every reference re-derived at HEAD)
Matches the SDD unless marked. No STOP condition found.
| Reference | Result |
|---|---|
| `scripts/lib/task-state-machine.mjs`: `TRANSITION_MATRIX` 16-28 (11 from-states); `meaningful()` 74; `makeTransition` 81 (`validateMatrixEvidence` param, used at 113); `transitionTaskState` 124, `resumeTaskState` 127, `transitionTaskStateWithPolicyEvidence` 130; `policyFor` 133; `policyTransition` 137; `validatePolicyTransition` 143-147; call at 160-164; hardcoded `policy_contract_version: 1` at 70 | Confirmed |
| `docs/contracts/bug-fix-workflow.yaml:6-22`: `contract_version: 1`; rows investigating->blocked and verifying->blocked only; resume `blocked -> [investigating, verifying]` | Confirmed |
| Only prod caller of disk mutation: `scripts/task-machine-cli.mjs` | Confirmed. Importers of `task-state-machine.mjs`: `archive-work-item`, `compile-status-projection`, `backfill-task-state-v2`, `task-machine-cli`, `validate-contracts`. Only tests import `TRANSITION_MATRIX`/`transitionTaskState`. |
| `validate-contracts.mjs:23` (skip `archive`), `:37` (`policy_contract_version !== 1`); schemas loaded are only `docs/contracts/schemas/*-state.schema.json` (task state), never the workflow YAML | Confirmed. Workflow-policy rows have no schema, so adding `actors` / `reference_evidence` needs no schema edit (SDD claim holds). |
| `validate-dispatch-receipts.mjs:264-277` (`COMMIT_SHA_PATTERN`, `QA_FILE_PATTERN`, `COMMENT_URL_PATTERN` at 268) | Confirmed |
| `work-item-readiness.mjs:270-283` closeout allow-list | Confirmed |
| `adr-audit.mjs:51` `comparisonRefs` (uses `GITHUB_BASE_REF` only; not GitLab) | Confirmed; `diff-scope.mjs` adds the GitLab variable and must not change `adr-audit`. |
| `AGENTS.md:22` Change Sizing heading, `:24` thresholds, `:196-198` Implementation Planning Rule, `:213` TDD sentence; `docs/templates/TASK_BRIEF.md:14` `- Write set:` | Confirmed |
| `docs/templates/LESSONS_LEARNED.md:20` Hermes line; `README.md:261` Lessons Learned paragraph; `docs/operating-model/CONTEXT_BUDGET.md:35` Tier 3 total, `:37` headroom/bootloader measurement | Confirmed |
| `.githooks/pre-push`: `PR_BODY_FILE` early `exit 0` precedes any later call | Confirmed (see S4 constraint) |
| `validate` job in `.github/workflows/validate-contracts.yml` has `fetch-depth: 0`; `.gitlab-ci.yml` has no `GIT_DEPTH`; GitLab runs validators as separate jobs | Confirmed |
| `npm run validate:context-budget`: Bootloader 7,071 chars / 1,767 tokens; Tier 3 24,877/30,000 | Confirmed |
| Pin set (`test/fixtures/context-pack-v1/required-source-matrix.json`, 22 `core-bootloader` mentions): bootloader pinned; `dynamic-routing.md` and `bug-fix-workflow.yaml` are not in the pin set | Confirmed. Only S5 needs a repin. |
| `docs/records/work-items/` has no active shard dirs (only `.md` + `archive/`); `docs/records/lessons-learned/` is empty | Confirmed. Lessons link tests must use temp-dir fixtures. |
| `npm run validate:project-state`, `npm run validate:contracts` | Pass at HEAD |
| `CONTEXT_BUDGET.md:51-65` second table | Historical; do not edit |
| `dynamic-routing.md` is 10,264 bytes on disk vs 10,258 in `CONTEXT_BUDGET.md:32`: unit difference (bytes vs chars); S5 re-measures with the validator, does not hand-compute. | Informational |

## 3. Affected Areas
| Area | Files / Components | Expected Change |
|---|---|---|
| State machine | `scripts/lib/task-state-machine.mjs`, new `scripts/lib/evidence-reference.mjs`, `docs/contracts/bug-fix-workflow.yaml` | S1, S2 |
| Advisory validators | new `scripts/lib/diff-scope.mjs`, `scripts/validate-lessons-learned.mjs`, `scripts/validate-execution-discipline.mjs` | S3, S4 |
| CI / hooks | `package.json`, `.github/workflows/validate-contracts.yml`, `.gitlab-ci.yml`, `.githooks/pre-push` | S3, S4 |
| Docs | `docs/workflow/core-bootloader.md`, `docs/workflow/dynamic-routing.md`, `docs/operating-model/CONTEXT_BUDGET.md`, `docs/templates/LESSONS_LEARNED.md`, `README.md`, test fixture `required-source-matrix.json` | S3 (template, README), S5 |
| Tests | `test/task-state-machine.test.mjs`, `test/control-plane-state-integrity.test.mjs`, new `test/evidence-reference.test.mjs`, `test/validate-lessons-learned.test.mjs`, `test/validate-execution-discipline.test.mjs`, `test/diff-scope.test.mjs` | all |
| Frontend / database / API | N/A | none |

Out of scope (must not be edited): `AGENTS.md`, `archive-work-item.mjs`, `work-item-readiness.mjs`, `.claude/settings.json`, `validate-ci-parity.mjs`, `validate-dispatch-receipts.mjs`, `adr-audit.mjs`, `DECISIONS.md`, `PROJECT_STATUS.md`/`TASK_LOG.md` (Orchestrator/Documentation at closeout), the SDD, JSON schemas, `policy_contract_version` / `contract_version`.

## 4. Slice Order and Dependencies
```
S1 -> S2          (S2 edits the same state-machine file and relies on S1 test values)
S3 -> S4          (S4 imports scripts/lib/diff-scope.mjs created in S3)
S1/S2 and S3/S4 are independent chains; S5 independent of both.
S6 last.
```
Run sequentially (S1, S2, S3, S4, S5, S6): overlapping `package.json` and both CI files between S3/S4 and one shared test suite make parallel mutation unsafe. Size and cumulative range: see OQ-P4.

Cross-slice rules:
- Refactor and feature separate. S1 is a behavior-changing consolidation (YAML becomes sole authority) and S2 is the feature; they are not merged.
- Each slice leaves `npm test` and all validators green at its own commit (no red-only intermediate commit). The red test is committed together with its implementation but must be shown failing first (recorded in the handoff).
- Edit `docs/operating-model/CONTEXT_BUDGET.md` only in the current table (lines 32, 35, 37).
- "Test count" below = 783 plus or minus named `test()` calls; the Developer records the exact figure in each handoff.

## 5. Slices

### S1 — AC-004: single Bug Fix policy source (consolidation)
**Affected files**: `docs/contracts/bug-fix-workflow.yaml` (add `actors` per transition and resume row, copying today's matrix actors; no other key); `scripts/lib/task-state-machine.mjs`; `test/task-state-machine.test.mjs`; `test/control-plane-state-integrity.test.mjs`.

**Tasks**
- S1.1 Red tests first, run against current tree (expect failures): (a) derived table equals YAML destinations/actors; (b) pure `transitionTaskState` and disk `mutateTaskStateOnDisk` accept/reject the same evidence for `intake -> investigating`; (c) matrix-only keys (`root_cause_analysis`, `requirement_discovery`+`issue_ref`) no longer satisfy the pure API; (d) `contract_version: 1` pin for the YAML.
- S1.2 Add `actors` to every YAML transition row and the resume row (values copied per from-state from `TRANSITION_MATRIX`).
- S1.3 Add `deriveTransitionTable(policy)` returning `{ [state]: { destinations, actors } }`; export `TRANSITION_MATRIX` built from it (name kept for importers). Invalid or missing YAML -> `POLICY_UNAVAILABLE` (fail closed). See OQ-P3 on load timing.
- S1.4 `makeTransition`: actors and destinations from the matched YAML row; remove the `validateMatrixEvidence` parameter and the matrix `requires`; pure `transitionTaskState`/`resumeTaskState` call one shared `validateEvidenceForRow` (same function `validatePolicyTransition` uses). `STATES` (11) unchanged.
- S1.5 Migrate tests to YAML keys and paths: TC-021, TC-022, TC-023, TC-024, TC-025, `CLI: task-machine-cli commands`, `control-plane-state-integrity.test.mjs:51`; remove `designing`/`planning`/`cancelled` and matrix-only edges. Use reference-form values (`issuecomment-1`, `https://example.invalid/r`) for `repro`, `fail_path`, `hypothesis_matrix` here so S2 does not re-touch the same sites. Matrix-key occurrences by range in `test/task-state-machine.test.mjs`: TC-021 (102-192) 6, TC-022 (193-239) 5, TC-023 (240-294) 3, TC-024 (295-363) 10, TC-025 (456-496) 2, CLI (542-end) 2; the extra counts versus the SDD (24 total) include non-evidence mentions and the second `::TC-007` test (lines 429-454, stays unchanged). The Developer re-counts with `grep -o` per range before editing.
- S1.6 Replace `TC-024b` (line 364) by "derived table equals YAML destinations"; invert the first assertion of `::TC-007` (lines 398-427, assertion at 402-410) per I297-TC-003. In the disk-bound call (411-416), keep `repro: 'rp'` for now and do NOT change it in S1 (S2 changes it).
- S1.7 Delete dead matrix `requires` code and `validateMatrixEvidence` in the same commit (expand/contract).

**Red test (written first)**: `test/task-state-machine.test.mjs`, new test `I297-TC-003: pure and disk-bound transitions share YAML evidence`. Failing assertion today: pure `transitionTaskState(task, { to: 'investigating', actor: 'ba-agent', evidence: { failure_description: 'fd', repro: 'rp' } })` must succeed (YAML keys) while `evidence: { requirement_discovery: 'req' }` must throw `MISSING_REQUIRED_EVIDENCE`; on the current tree the first throws (matrix requires `requirement_discovery`/`issue_ref`) and the second succeeds. Second red: `deriveTransitionTable` is not exported (import fails).

**Verification**
```bash
node --test test/task-state-machine.test.mjs test/control-plane-state-integrity.test.mjs   # expect all pass
node --test test/validate-contracts.test.mjs                                                 # invalid fixtures + version-1 still pass
npm run validate:contracts        # expect: Contract validation passed.
npm run validate:project-state    # expect pass
npm test                          # expect 0 fail
```
Test count: TC-024b replaced (net 0); new named tests (a), (b)+(c) as one, (d) => about +3; expected `npm test` about 786 pass. Exact count recorded in handoff.
**Validators**: `validate:contracts` (reads the YAML with new keys), `validate:ci-parity` (no CI change; sanity run only). No repin (YAML not pinned). `adr:audit`: not relevant.
**Est. changed lines**: ~350-450 (code ~60, YAML ~15, test migration ~250-350). Exceeds ~300. A split into S1a (code) / S1b (tests) has no green boundary: derivation removes matrix-only paths that the existing tests use. Judgment call: keep S1 whole, record it as one logical change (AGENTS.md:24 "~300 acceptable for one logical change; ~1000 must split") in the handoff and PR; confirm in OQ-P4.
**Risks**: lost pure-API edges (OQ-P1); module-load fail-closed blast radius (OQ-P3); CAS / actor authorization regression because actors move into YAML (Security review); test-migration mistakes weakening assertions (QA diffs the assertion set).
**Rollback**: revert the S1 commit; `contract_version` and `policy_contract_version` stay 1, stored shards stay readable. If S2 already landed, revert S2 first.
**Dependencies**: none (first). **Human gate**: policy contract change (SDD section 6); Human merge approval required; see 7.
**Next handoff**: Security Reviewer (actor authorization moves from code to YAML) then QA.

### S2 — AC-004: evidence reference grammar (feature)
**Affected files**: new `scripts/lib/evidence-reference.mjs`; `scripts/lib/task-state-machine.mjs` (`validatePolicyTransition`); `docs/contracts/bug-fix-workflow.yaml` (additive top-level `reference_evidence: [repro, fail_path, hypothesis_matrix]`); new `test/evidence-reference.test.mjs`; `test/task-state-machine.test.mjs`.

**Tasks**
- S2.1 Red tests first (module missing -> import fails; durable mutation currently accepts `'rp'`).
- S2.2 `evidence-reference.mjs` (pure, no network): `parseEvidenceReference(value, { rootDir, fsOps })` for `path` (repo-relative, optional `#fragment`, no `..`, not absolute, no NUL, `realpath` stays inside `rootDir`, file exists), `url` (`https://`, no whitespace), `issue-comment` (full GitHub comment URL per `validate-dispatch-receipts.mjs:268` shape, or `issuecomment-<digits>`). A value is a string or non-empty array of strings. Do not reuse `QA_FILE_PATTERN`.
- S2.3 YAML: add `reference_evidence`. No key renamed; `contract_version` stays 1.
- S2.4 `validatePolicyTransition`: order is (1) key presence via `validateEvidenceForRow` (so `{ repro: 'rp' }` alone still raises `MISSING_REQUIRED_EVIDENCE` and `::TC-007` second test stays unchanged), then (2) reference-form check on keys in `reference_evidence` that appear in the row's `requires`; failure -> new code `EVIDENCE_NOT_REFERENCE`, status `REJECTED`, shard bytes unchanged, lock and guard released. Not run from `validateHistory`, `validateActiveShards`, examples, or archives.
- S2.5 `::TC-007` first test: change the disk-bound `repro: 'rp'` (lines 411-416) to a URL or `issuecomment-1` value; leave the second test untouched.
- S2.6 Document in the module header that "no test seam" is satisfied by referencing a record holding the rationale; no new key or flag.

**Red test (written first)**: `test/evidence-reference.test.mjs`, test `I297-TC-001: free text and "rp" are not references` asserting `parseEvidenceReference('rp', ctx)` returns an invalid result with code `EVIDENCE_NOT_REFERENCE`; and in `test/task-state-machine.test.mjs` test `I297-TC-001: durable mutation rejects prose fail_path/hypothesis_matrix/repro and preserves bytes`, failing assertion `error.code === 'EVIDENCE_NOT_REFERENCE'` plus byte-equal shard (today the mutation succeeds). Order-guard test: `{ repro: 'rp' }` alone (missing `failure_description`) still raises `MISSING_REQUIRED_EVIDENCE`.

**Verification**
```bash
node --test test/evidence-reference.test.mjs test/task-state-machine.test.mjs    # expect all pass
npm run validate:contracts          # expect pass (examples + 14 invalid fixtures + archived shards unchanged)
npm test                            # expect 0 fail
```
Test count: about +7 named tests (valid forms/array incl. I297-TC-002; invalid forms; traversal, absolute, NUL, symlink escape, missing file; durable reject with bytes unchanged; check-order guard); expected about 793 pass (cumulative from S1). Exact count recorded.
**Validators**: `validate:contracts`; `validate:ci-parity` unchanged. No repin.
**Est. changed lines**: ~200.
**Risks**: path containment bug = trust-boundary escape (Security); rejecting object-valued evidence (OQ-P7); pure API not reference-checked (OQ-P2); real callers passing prose through CLI `--evidence` now rejected (intended; document in CLI help only if it already lists examples; otherwise no change).
**Rollback**: revert S2 only; S1 stands alone and is green.
**Dependencies**: S1. **Human gate**: policy contract (YAML key) -> Human merge approval. **Next handoff**: Security Reviewer (path containment, `realpath`, no network) then QA.

### S3 — AC-006: lessons learned at closeout
**Affected files**: new `scripts/lib/diff-scope.mjs`; new `scripts/validate-lessons-learned.mjs`; `package.json` (script `validate:lessons-learned`); `.github/workflows/validate-contracts.yml` (step in `validate` job); `.gitlab-ci.yml` (job `validate_lessons_learned`, same `rules` and `cache` as the other validate jobs, `variables: GIT_DEPTH: 0`); `docs/templates/LESSONS_LEARNED.md:20`; `README.md:261`; new `test/validate-lessons-learned.test.mjs`, `test/diff-scope.test.mjs`.

**Tasks**
- S3.1 Red tests first (scripts absent; `npm run validate:lessons-learned` unknown).
- S3.2 `diff-scope.mjs`: `resolveBase(env, git)` (`GITHUB_BASE_REF`, then `CI_MERGE_REQUEST_TARGET_BRANCH_NAME`, each `origin/<n>` then `<n>`; else `origin/main`, `main`; `git merge-base`), `changedFiles`, `numstat`; unresolved or merge-base == HEAD -> `NOT EVALUATED: no PR range`. Branch names pass through `git` as `execFile` arguments, never a shell string. Do not edit `adr-audit.mjs`.
- S3.3 `validate-lessons-learned.mjs` per SDD section 3: scope (A) changed `docs/records/work-items/*.md` whose Status begins `Closed` (both formats), (B) changed `docs/records/HANDOFF-POST-MERGE-CLOSEOUT-*.md` -> `Work Item:` URL `/issues/<N>` -> work item file with whole token `issue-<N>`; `--all` audit; pass on non-placeholder line, or resolving `[[../lessons-learned/<name>]]` / markdown link with `^\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]*$` and existing file; `N/A — <reason>` passes (OQ-3); bare `N/A`, `YYYY-MM-DD-slug` placeholder, missing/empty section, dangling link -> one `WARN [AC-006]`; path (B) accepts a non-empty `## Lessons Learned` in the handoff; no record -> `INFO ... not evaluated`; always exit 0; `::warning::` when `GITHUB_ACTIONS=true`.
- S3.4 Wire `package.json`, GitHub step and GitLab job in this same slice (parity); template wording fix; one README sentence naming the validator.

**Red test (written first)**: `test/validate-lessons-learned.test.mjs`, test `I297-TC-005: closed work item with no lessons warns and exits 0`. Fails today because `scripts/validate-lessons-learned.mjs` does not exist (spawn exit 1 / import error); target assertions `exitCode === 0` and stdout matches `/WARN \[AC-006\]/`.

**Verification**
```bash
node --test test/validate-lessons-learned.test.mjs test/diff-scope.test.mjs   # expect pass
npm run validate:lessons-learned     # at HEAD expect exit 0, INFO/NOT EVALUATED or OK (no closed items in range)
npm run validate:ci-parity           # expect pass (GitLab has the new command)
node --test test/skill-decoupling-contract.test.mjs test/validate-ci-parity.test.mjs test/validate-contracts.test.mjs test/reset-to-template.test.mjs   # tests that read CI files
npm run validate:contracts && npm test
```
Test count: about +12 (I297-TC-005 five failing cases, I297-TC-006 five passing cases plus both Status formats, NOT EVALUATED, `--all`, path (B) mapping; diff-scope 3); cumulative about 805. Exact count recorded.
**Validators**: `validate:ci-parity`, `validate:contracts`; `validate:adapter-parity` not needed (no role text). No repin (README / template not in the pin set).
**Est. changed lines**: ~280. If the Developer measures > 300, split S3a (`diff-scope.mjs` + tests, refactor-like helper) and S3b (validator, wiring); each green.
**Risks**: link resolution reading outside repo (validate name regex and `realpath` containment before `existsSync`); GitLab shallow clone (`GIT_DEPTH: 0`); closeout handoffs today (e.g. `HANDOFF-POST-MERGE-CLOSEOUT-PR295.md`) have no `## Lessons Learned` heading, so path (B) will WARN on real closeouts; this is advisory by design. Record in handoff.
**Rollback**: remove the GitHub step and GitLab job together with the script (parity moves in the same revert); template and README edits revert independently.
**Dependencies**: none on S1/S2. **Human gate**: none beyond PR merge (CI wiring is additive, advisory). **Next handoff**: Security Reviewer (link/path resolution, git-argument handling, CI wiring) then QA.

### S4 — AC-001 / AC-002: execution discipline (advisory)
**Affected files**: new `scripts/validate-execution-discipline.mjs`; `package.json`; `.github/workflows/validate-contracts.yml`; `.gitlab-ci.yml` (job `validate_execution_discipline`, `GIT_DEPTH: 0`, `PR_BODY: $CI_MERGE_REQUEST_DESCRIPTION`); `.githooks/pre-push`; new `test/validate-execution-discipline.test.mjs`; `test/setup-hooks.test.mjs` (only if its assertions need an extension).

**Tasks**
- S4.1 Red tests first.
- S4.2 AC-001: behavior-file classifier (single constant list; includes `docs/contracts/**/*.yaml|json`; excludes `docs/**`, `*.md`, `test/**`, `.obsidian/**`, lockfiles); plan reference scan for `docs/records/(implementation-plan|task-brief|sdd)/<name>.md` (plain, markdown link, `[[wikilink]]`); resolvable = no `..`, not absolute, `realpath` inside repo, file exists at HEAD; no network. Warn `WARN [AC-001] ...`.
- S4.3 AC-002: size from `git diff --numstat <merge-base>...HEAD` excluding `package-lock.json`, `docs/records/**`, `test/fixtures/**`; constants 300 / 1000; a test pins these to the `AGENTS.md:24` sentence (parses `~300` / `~1000`). Write-set check only when a Task Brief is cited; best-effort parse of `- Write set:` (same-line list or indented bullets, backtick/comma, `*`/`**` globs); missing/unparsable -> explicit `WARN [AC-002] write set not parseable; not compared`; no brief -> one `INFO` line.
- S4.4 Input handling: `PR_BODY_FILE` else env `PR_BODY`; GitHub step uses `env: PR_BODY: ${{ github.event.pull_request.body }}` (never in `run:`); GitLab truncated description (`CI_MERGE_REQUEST_DESCRIPTION_IS_TRUNCATED`; confirm the exact variable name in current GitLab docs before wiring and record the evidence) -> `NOT EVALUATED`; no body -> `NOT EVALUATED: no PR body`. Exit status 0 always; crash prints `NOT EVALUATED: <reason>`.
- S4.5 `.githooks/pre-push`: add the advisory call (result ignored, thin caller) BEFORE the `PR_BODY_FILE` early `exit 0` (otherwise it never runs on ordinary pushes); keep the `grep -q` package.json guard style so it is skipped when the script is absent; `test/setup-hooks.test.mjs` `thin caller` assertions must still pass.
- S4.6 Documented limitation in the script header: body edits do not re-trigger `pull_request` runs, so a warning can be stale until the next push.

**Red test (written first)**: `test/validate-execution-discipline.test.mjs`, test `I297-TC-007: behavior file changed without plan reference warns and exits 0`. Fails today (script missing); asserts exit code 0 and stdout `/WARN \[AC-001\]/` in a temp git repo with a changed `scripts/x.mjs` and empty PR body. Companion red: `I297-TC-009` > 300 lines produces `WARN [AC-002]`.

**Verification**
```bash
node --test test/validate-execution-discipline.test.mjs test/setup-hooks.test.mjs   # expect pass
npm run validate:execution-discipline    # expect exit 0 with WARN/INFO/NOT EVALUATED lines (see OQ-P4 for this very branch)
npm run validate:ci-parity               # expect pass
node --test test/skill-decoupling-contract.test.mjs test/validate-ci-parity.test.mjs test/validate-pr-readiness.test.mjs test/reset-to-template.test.mjs
sh -c 'GITHUB_ACTIONS=true npm run --silent validate:execution-discipline'   # expect ::warning:: annotations, exit 0
npm run validate:contracts && npm test
```
Test count: about +12 (I297-TC-007/008/009/010 variants, `..`/absolute/missing target, threshold drift pin, unparsable write set, no-brief INFO, NOT EVALUATED cases); cumulative about 817. Exact count recorded.
**Validators**: `validate:ci-parity`, `validate:contracts`. No repin.
**Est. changed lines**: ~280; if > 300, split S4a (AC-001) / S4b (AC-002) plus wiring in S4a.
**Risks**: untrusted PR body (fork PR) parsing; Task Brief content untrusted; hook ordering; GitLab variable name; own validator will warn on this PR (OQ-P4).
**Rollback**: remove script with both CI entries and the hook line together.
**Dependencies**: S3 (`diff-scope.mjs`). **Human gate**: none beyond PR merge. **Next handoff**: Security Reviewer (PR body env-var trust boundary, path containment, no shell interpolation) then QA.

### S5 — AC-007 / AC-008: Bootloader and routing documentation
**Affected files**: `docs/workflow/core-bootloader.md`; `docs/workflow/dynamic-routing.md`; `docs/operating-model/CONTEXT_BUDGET.md` (lines 32 row, 35 total, 37 measurement line only); `test/fixtures/context-pack-v1/required-source-matrix.json` (via repin only; 22 bootloader pin lines).

**Tasks**
- S5.1 Red test first: extend `test/issue-282-policy-contract.test.mjs` or a small new assertion in an existing context test so that the Bootloader must contain `### Execution Lifecycle` with pointers to `Implementation Planning Rule`, `bug-fix-workflow.yaml`, `Change Sizing`, `## Lessons Learned`; and `dynamic-routing.md` must contain a `Pattern Selection` section with all five pattern names. Both fail on the current tree.
- S5.2 Insert the SDD section 4 draft as an unnumbered subsection after Section 1 (after the five Golden Rules, before `## 2.`); numbered rules untouched so regexes at `test/issue-282-policy-contract.test.mjs:68` and `test/skill-decoupling-contract.test.mjs:63` remain satisfied. Section-name pointers, no line numbers.
- S5.3 Add the Pattern Selection Matrix section (<= 1,600 chars) to `dynamic-routing.md`, rows only pointing at existing mechanisms (Prompt Chaining, Routing, Parallelization, Orchestrator-Workers, Evaluator-Optimizer).
- S5.4 `npm run validate:context-budget` -> `npm run repin:source-matrix` -> repeat `repin:source-matrix` (second run must be a no-op, verified with `git diff --stat` unchanged) -> update `CONTEXT_BUDGET.md` current table and line 37 from the measured output (do not hand-compute) -> `npm test`.

**Red test (written first)**: assertion `bootloader matches /### Execution Lifecycle/` in the chosen existing policy test file (named in the handoff), failing today with no match.

**Verification**
```bash
npm run validate:context-budget   # expect Bootloader <= 2,300 (projected ~1,930), Tier 3 <= 30,000 (projected ~25,300), PASSED
npm run repin:source-matrix       # first run changes the bootloader pins
npm run repin:source-matrix && git diff --stat   # second run: no new change
npm run validate:adapter-parity   # expect pass, no adapter text change
node --test test/validate-context-compatibility.test.mjs test/validate-context-budget.test.mjs test/issue-282-policy-contract.test.mjs test/skill-decoupling-contract.test.mjs test/core-source-matrix.test.mjs test/repin-source-matrix.test.mjs
npm run validate:contracts && npm test
```
Test count: about +2 named tests (bootloader subsection, routing matrix); cumulative about 819.
**Validators**: `validate:context-budget`, `repin:source-matrix`, `validate:adapter-parity`, `validate:contracts`; `validate:ci-parity` sanity.
**Est. changed lines**: ~70 plus 22 repinned hash lines (fixture; treat as generated).
**Risks**: Bootloader is the highest-blast-radius file (22 pins; every context pack); budget breach; wording that creates a second rule source (pointers only); a stale second repin.
**Rollback**: revert the S5 commit entirely including the repinned fixture and the CONTEXT_BUDGET edit (one commit so they cannot desync).
**Dependencies**: none; sequenced after S4 only so earlier slices do not carry fixture churn. **Human gate**: yes (Bootloader change, SDD section 6). **Next handoff**: QA (no new trust boundary), then Human approval.

### S6 — Full verification and release gate
**Tasks**: run the full list in section 6 on the final PR head SHA; Independent QA (not the implementer) maps every AC to evidence; Security Reviewer reviews S1, S2, S3, S4 trust boundaries; PR carries the Documentation Impact section (AC-009); hosted GitHub and GitLab checks on the exact head SHA; Human merge approval. Orchestrator updates `PROJECT_STATUS.md` / `TASK_LOG.md` (not part of this plan's write set).
**Red test**: n/a (verification). **Est. changed lines**: 0 code.
**Rollback**: per slice, reverse order S5, S4, S3, S2, S1 (with CI step/job and script removed together).
**Next handoff**: Orchestrator -> Human Maintainer.

## 6. Verification Commands (full gate, run at S6 and after S5)
```bash
npm ci --ignore-scripts
npm test                           # baseline 783 pass; expected about 819 after S5 (sum of named test() additions, no net loss)
npm run validate:contracts
npm run validate:project-state
npm run validate:ci-parity
npm run validate:context-budget
npm run validate:adapter-parity
npm run adr:audit
npm run validate:lessons-learned
npm run validate:execution-discipline
npm run validate:status-projection
npm run repin:source-matrix        # twice; second run no-op
git diff --check
```

## 7. Human Gate and Handoff Matrix
Design gate: satisfied (SDD + ADR-0037 + OQ-1..6 accepted 2026-10-11). Merge gate remains Human.
| Slice | Human approval needed | Reason | Next agent | Required evidence |
|---|---|---|---|---|
| S1 | Yes (merge) | Bug Fix policy contract + actor authorization move; also deletes `TC-024b` and inverts a `::TC-007` assertion (AGENTS "removing or weakening tests"; see OQ-P1) | Security Reviewer -> QA | red/green runs, assertion-set diff |
| S2 | Yes (merge) | Policy contract keys, reference-form trust boundary | Security Reviewer -> QA | red/green, containment cases |
| S3 | No extra | Additive advisory CI wiring | Security Reviewer -> QA | parity, tests |
| S4 | No extra | Additive advisory CI wiring, PR-body input | Security Reviewer -> QA | parity, tests, env-var handling |
| S5 | Yes (merge) | Bootloader / core policy (SDD section 6) | QA | budget numbers, repin no-op |
| S6 | Yes (final merge) | Release decision | Orchestrator -> Human | QA + Security reports, hosted checks |

## 8. Traceability (AC -> slice -> test)
| AC | Slice | Issue TC | Test (file, name) | Red first? |
|---|---|---|---|---|
| AC-004 | S2 | I297-TC-001 | `test/evidence-reference.test.mjs` (free text rejected); `test/task-state-machine.test.mjs` (durable reject, bytes unchanged) | yes |
| AC-004 | S2 | I297-TC-002 | same files (path, URL, comment URL, `issuecomment-N`, array accepted) | yes |
| AC-004 | S1 | I297-TC-003 | `test/task-state-machine.test.mjs` (replaces `TC-024b`; inverted `::TC-007` first assertion) | yes |
| AC-004 | S1, S2 | I297-TC-004 | existing: `validate:contracts`, `test/validate-contracts.test.mjs`, `::TC-007` second test | existing, must stay green |
| AC-006 | S3 | I297-TC-005 | `test/validate-lessons-learned.test.mjs` | yes |
| AC-006 | S3 | I297-TC-006 | same file | yes |
| AC-001 | S4 | I297-TC-007 | `test/validate-execution-discipline.test.mjs` | yes |
| AC-001 | S4 | I297-TC-008 | same file | yes |
| AC-002 | S4 | I297-TC-009 | same file | yes |
| AC-002 | S4 | I297-TC-010 | same file | yes |
| AC-007 | S5 | I297-TC-011 | `validate:context-budget`, `test/validate-context-budget.test.mjs`, `test/issue-282-policy-contract.test.mjs` plus new subsection assertion | yes (new assertion) |
| AC-007 | S5 | I297-TC-012 | `repin:source-matrix` x2, `test/validate-context-compatibility.test.mjs` | existing |
| AC-008 | S5 | I297-TC-013 | `validate:context-budget`, `validate:adapter-parity`, new routing-matrix assertion | yes (new assertion) |
| AC-009 | S6 | I297-TC-014 | `adr:audit`, `validate:project-state`, `validate:ci-parity` | existing |
| All | S6 | I297-TC-015 | `npm test`, baseline 783, no net loss | existing |
Extra: threshold-pin test (S4), `contract_version: 1` pin test (S1), check-order guard test (S2).

## 9. Risks / Blockers
| Risk | Impact | Mitigation |
|---|---|---|
| S1 test migration larger than 300 lines with no green boundary | Review burden | Keep whole, document as one logical change, QA reviews assertion-set diff |
| Pure API loses matrix-only edges | Behavior change for callers of pure API (none in production) | OQ-P1 confirmation; tests record the removed edges |
| Module-load YAML read fails closed in five importing scripts | Status projection and archive tooling break on a bad YAML | OQ-P3; `validate:contracts` guards the YAML in CI |
| Advisory scripts masked by `|| true` or `continue-on-error` | False green (ADR-0036) | Neither allowed; scripts exit 0 by design |
| Bootloader growth | Context budget | Hard cap 2,300 measured; ceiling 2,500 unchanged |
| GitLab variable name unverified | Wrong truncation handling | Confirm in current docs in S4.4 |

## 10. Open Questions (gaps found; none silently assumed)
| ID | Question | Owner | Blocks |
|---|---|---|---|
| OQ-P1 | Beyond `designing`, `planning`, `cancelled` (OQ-1/OQ-5), deriving from the YAML also removes these matrix-only edges from the pure API: `implementing -> blocked`, `rework -> blocked`, `handoff -> blocked`, and `blocked -> {intake, implementing, rework, handoff, completed}` (YAML resume allows only `investigating`, `verifying`). Disk behavior is unchanged (already rejected). Confirm this is covered by the accepted OQ-1/OQ-5, or add YAML rows. Also confirm S1 may delete `TC-024b` / invert `::TC-007` under the "removing tests" Human gate (SDD and Issue already require it). | SA / Human | S1 |
| OQ-P2 | The SDD runs the reference check only in `validatePolicyTransition` (disk path, has `rootDir`). I297-TC-003 says pure and disk paths share evidence. After S2 the pure API would accept `'rp'` while disk rejects it. Confirm the reference check is disk-only and TC-003 asserts key-presence parity only. | SA | S2 test edits |
| OQ-P3 | SDD builds `TRANSITION_MATRIX` at module load and fails closed with `POLICY_UNAVAILABLE`. Five scripts import this module; a bad YAML would break their import, and a load-time read bypasses the injected `io.fsOps` used by fault-injection tests. Confirm eager load, or approve a lazily memoized derivation (needs a getter/Proxy for the exported name). | SA | S1 |
| OQ-P4 | The cumulative #297 range will count about 1,100+ lines (`test/**` is not excluded), so S4's own validator will warn "exceeds ~1000, must be split" on a single PR. Choose one PR or stacked PRs per slice chain (S1-S2, S3-S4, S5). | Orchestrator / Human | PR strategy, not code |
| OQ-P5 | `README.md:261` keeps "Hermes memory" wording; the SDD only adds a sentence. Update that wording too (tool-neutral) or leave it? Default: leave and add the sentence only. | PM / Human | non-blocking |
| OQ-P6 | SDD metadata is stale: header says "Proposed — awaiting Human approval" with baseline `2dca980`; approval is evidenced only by its Open Questions section and commit `4628f97`. SDD is not to be edited here; Orchestrator may ask SA to refresh the header. | Orchestrator / SA | non-blocking |
| OQ-P7 | Grammar accepts a string or non-empty array of strings. Envelope schema also allows object-valued evidence (F8). Confirm objects are rejected for the three reference keys. | SA | S2 |
| OQ-P8 | Real closeout handoffs (for example `HANDOFF-POST-MERGE-CLOSEOUT-PR295.md`) contain no `## Lessons Learned` heading, so scope (B) will warn on the next closeout. Confirm that a one-time advisory warning is acceptable and the closeout handoff template is not changed here. | Documentation / Human | non-blocking |

## 10a. Human decisions on Section 10 (2026-10-11)
Human Maintainer approved this plan and confirmed the Developer's recommendations. Where Section 10 stated no explicit recommendation, the SDD-approved default or the plan's stated default applies.

| ID | Decision |
|---|---|
| OQ-P1 | Confirmed: removed matrix-only edges are covered by accepted OQ-1/OQ-5; S1 may delete `TC-024b` and invert `::TC-007` |
| OQ-P2 | Confirmed: reference check is disk-only; I297-TC-003 asserts key-presence parity only |
| OQ-P3 | Eager derivation at module load, as the approved SDD specifies (no lazy Proxy); S1 must keep fault-injection tests green |
| OQ-P4 | Not decided; PR shape (single vs stacked S1-S2 / S3-S4 / S5) is chosen by the Human at PR time |
| OQ-P5 | Default: leave `README.md:261`; add the SDD sentence only |
| OQ-P6 | Non-blocking; header refresh deferred |
| OQ-P7 | Confirmed: object-valued evidence is rejected for the three reference keys |
| OQ-P8 | Confirmed: one-time advisory warning is acceptable; closeout handoff template unchanged |

## 11. Handoff
To Orchestrator: record spec-ready only after the Human reviews OQ-P1, OQ-P2, OQ-P3, OQ-P7 (they gate S1/S2 tests); OQ-P4 decides PR shape. Implementation then proceeds S1 -> S2 -> S3 -> S4 -> S5 -> S6 with a Packet v1 per dispatch. Nothing in this plan edits the Issue, labels, `PROJECT_STATUS.md` or `TASK_LOG.md`.
