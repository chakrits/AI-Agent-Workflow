# Software Design Document — Issue #297

## Metadata
- Work Item: https://github.com/chakrits/AI-Agent-Workflow/issues/297 (body revision 2, 2026-10-11)
- Owner: SA Agent; Status: Proposed — awaiting Human approval (design gate). No implementation is authorized by this document.
- Baseline: `2dca980` on `feat/issue-297-effective-agent-execution`. Change type / risk: Framework / Meta · Medium (Human-confirmed).
- Decision record: ADR-0037 (Accepted 2026-10-11) records the Defer of AC-003 and the Drop of AC-005; this SDD covers AC-001, 002, 004, 006, 007, 008, 009.
- Test-case naming: Issue test cases are written `I297-TC-nnn`. Test cases that already exist in the repository are written `<file>::TC-nnn` so the two numbering schemes cannot be confused (the Issue's TC-007 and `test/task-state-machine.test.mjs` TC-007 are different tests).

## Context
Issue #297 found that most of the six rules already exist as text, so the real gap is enforcement and two identified defects. Every claim below was re-verified against the tree at `2dca980`; the Issue body matched the tree (no STOP condition). Verified facts that drive the design:

| ID | Fact | Evidence |
|---|---|---|
| F1 | Two evidence authorities exist. `TRANSITION_MATRIX` has 11 from-states, one `requires` set per from-state, plus `actors`. The YAML has per-transition `requires`. | `scripts/lib/task-state-machine.mjs:16-28`; `docs/contracts/bug-fix-workflow.yaml:6-22` |
| F2 | The matrix and YAML use different keys for the same gate (`root_cause_analysis` vs `fail_path`+`hypothesis_matrix`; `test_evidence`+`qa_report_ref` vs `original_repro_result`+`verification_result`). | same lines |
| F3 | `meaningful()` accepts any non-empty value, so `repro: "rp"` passes. | `task-state-machine.mjs:74` |
| F4 | Disk-bound mutation is policy-first: `validatePolicyTransition` checks YAML evidence (`:143-147`), then calls `makeTransition(..., validateMatrixEvidence:false)` (`:160-164`), which still reads matrix destinations and actors (`:88-96`). The only production caller is `task-machine-cli.mjs:135,172`. The pure `transitionTaskState`/`resumeTaskState` validate the matrix `requires` and have no production caller. | cited lines |
| F5 | The YAML is the declared canonical bug-fix policy and is the file `validate-contracts` loads for every `*-workflow.yaml`. | `docs/workflow/dynamic-routing.md:157-160`; `scripts/validate-contracts.mjs:45-57` |
| F6 | Fixtures and `validateHistory` use the YAML only; they check `hasMeaningfulValue`, not reference form. Fixtures carry `repro: test command`, `fail_path: validator`. `policy_contract_version !== 1` is checked at `validate-contracts.mjs:37` and hardcoded `1` also at `task-state-machine.mjs:70`, `backfill-task-state-v2.mjs:27,38`, `archive-work-item.mjs:233`, `compile-status-projection.mjs:16`. | cited lines |
| F7 | `validateActiveShards` skips `archive/` (`validate-contracts.mjs:23`). There are zero active shard directories today (`docs/records/work-items/` holds only `.md` files and `archive/`). The three archived shards (`issue-249`, `-275`, `-290`) are `contract_version 2`, `policy_contract_version 1`, `completed`; their `fail_path` values are prose. | `ls`; shard JSON |
| F8 | `durable-task-envelope.schema.json` types each evidence value as `string \| string[] \| object` (`additionalProperties: false` at the envelope level). `task-state.schema.json` types evidence as bare `object`. | schemas |
| F9 | Checks already run in the mandatory `validate` job of `.github/workflows/validate-contracts.yml` must also run in `.gitlab-ci.yml` or `validate:ci-parity` fails; parity compares only that job's commands (`scripts/validate-ci-parity.mjs:21-27,83-110`). The job has `fetch-depth: 0`; GitLab sets no `GIT_DEPTH`. | files |
| F10 | `adr-audit.mjs` already contains the base-ref resolution pattern (`comparisonRefs`, merge-base with `origin/<GITHUB_BASE_REF>` or `origin/main`). `validate-dispatch-receipts.mjs:264-277` already contains an evidence-shape classifier (commit SHA, `docs/records/(qa\|work-items)/` path, GitHub comment URL) used for terminal results. | files |
| F11 | Closeout PRs (body marker `<!-- post-merge-closeout: complete; source-pr-N -->`) may change only `PROJECT_STATUS.md`, `TASK_LOG.md`, `CHANGELOG.md`, `docs/records/HANDOFF-POST-MERGE-CLOSEOUT-*.md`, and `docs/records/work-items/archive/*/task-state.json`. They cannot edit a work-item `.md`. No existing work-item `.md` has a `Closed` status. | `scripts/work-item-readiness.mjs:270-283`; `git show --stat 2dca980` |
| F12 | Bootloader is 7,071 chars / 1,767 approximate tokens vs `BOOTLOADER_TARGET = 2500`; Tier 3 is 24,877 / 30,000. The bootloader is pinned 22 times in `required-source-matrix.json` (99 pins total). `dynamic-routing.md` is not in the pinned path set; `docs/contracts/bug-fix-workflow.yaml` is not pinned either. | `npm run validate:context-budget`; matrix fixture |
| F13 | ADR-0022: `.claude/settings.json` may only invoke a rule that `.githooks/` or CI already enforces; it may never originate a rule. No hook runtime exists outside Claude Code, so `.githooks/` is the only portable local hook point. | `DECISIONS.md` ADR-0022 Decision |
| F14 | ADR-0036 / Issue #294: a CI "pass" must be truthful; `continue-on-error` and broad `|| true` are rejected as a way to make an advisory check. Mandatory rules must not depend on a skill. | `DECISIONS.md` ADR-0036 |
| F15 | `AGENTS.md:22-30` Change Sizing (thresholds at `:24`: ~100 / ~300 / ~1000); `AGENTS.md:196-198` Implementation Planning Rule; `AGENTS.md:213` TDD Rule including "document why no test seam exists"; `docs/templates/TASK_BRIEF.md:14` `- Write set:`; `docs/workflow/task-execution-mode.md:22-26` (task-execution mode is optional). | cited lines |

## Goals / Non-goals
Goals: advisory enforcement of plan-before-code, diff size and write set (AC-001/002); verifiable Bug Fix evidence with one policy source (AC-004); advisory Lessons Learned check at closeout (AC-006); Bootloader and routing alignment within budget (AC-007/008); governance record (AC-009).

Non-goals (inherited from Issue Section 5, restated): no new `parallel-dispatch-contract.md`; no evidence key renames; no edit to `archive-work-item.mjs`; no raise of the 2,500 Bootloader ceiling; no new rule text in `AGENTS.md`; no blocking check for AC-001/002/006; no skill as an enforcer; no widening of the closeout PR allow-list; no machine-readable write-set field (that is the Deferred AC-003).

## Architecture Overview
Modular, script-first (house style per ADR-0022): pure functions exported from `scripts/*.mjs` / `scripts/lib/*.mjs`, behind an `import.meta.url` CLI guard, called by CI. No new service, no framework dependency.

| Concern | Placement | Callers |
|---|---|---|
| AC-001/002 advisory execution discipline | New `scripts/validate-execution-discipline.mjs` | `validate` job (GitHub), a new GitLab job, `.githooks/pre-push` (thin, advisory) |
| AC-006 lessons at closeout | New `scripts/validate-lessons-learned.mjs` (separate validator per Human decision) | `validate` job (GitHub), a new GitLab job |
| Shared diff scope helper | New `scripts/lib/diff-scope.mjs` (base-ref resolution, changed files, numstat) | both scripts above |
| AC-004 single source | `docs/contracts/bug-fix-workflow.yaml` becomes the only authority; `task-state-machine.mjs` derives its table from it | `task-machine-cli`, `validate-contracts` |
| AC-004 reference grammar | New `scripts/lib/evidence-reference.mjs` | `validatePolicyTransition` only |

## Component Design

### 1. Enforcement placement for AC-001 / AC-002 (ADR-0022, GitHub and GitLab parity)
Decision: one advisory script, `npm run validate:execution-discipline`, always exits 0 for findings and prints `WARN:` lines. It is wired as a step in the existing GitHub `validate` job and as a new job `validate_execution_discipline` in `.gitlab-ci.yml` (same `rules` as the other validate jobs). Because the step is in the `validate` job, `validate:ci-parity` already enforces GitLab parity with no change to that validator. `.githooks/pre-push` calls the same npm script and ignores the result (consistent with ADR-0022: advisory, never a commit gate). `.claude/settings.json` is not touched; it may only be added later because CI already enforces the rule (F13). No text is added to `AGENTS.md` (AC-001 constraint); the script cites `AGENTS.md` Change Sizing and does not restate it. A test pins the thresholds to `AGENTS.md:24` so they cannot drift silently.

Not a hook-originated rule: the rule is originated by the CI step; the hook is a caller. Not `continue-on-error`: the script's own exit status is truthfully 0 for advisory findings (F14); a crash or unreadable input prints `NOT EVALUATED: <reason>` and also exits 0, never a false "pass" line.

Inputs (all untrusted-by-default, see Security):
- Base ref: `scripts/lib/diff-scope.mjs#resolveBase(env)`. Order: `GITHUB_BASE_REF` then `CI_MERGE_REQUEST_TARGET_BRANCH_NAME`, each as `origin/<name>` then `<name>`; else `origin/main` then `main`; use `git merge-base <base> HEAD`. If the merge base equals HEAD (default-branch push) or cannot be resolved (shallow clone), print `NOT EVALUATED: no PR range` and exit 0. GitHub is `fetch-depth: 0`; GitLab shallow clones are handled by the fallback, and the GitLab job sets `GIT_DEPTH: 0` to make the range available.
- PR text: file named by `PR_BODY_FILE` (existing convention used by `.githooks/pre-push` and `validate-pr-readiness`), else env `PR_BODY`. GitHub step: `env: PR_BODY: ${{ github.event.pull_request.body }}` (never interpolated into `run:`). GitLab job: `PR_BODY: $CI_MERGE_REQUEST_DESCRIPTION`. If the description is truncated by GitLab (variable `CI_MERGE_REQUEST_DESCRIPTION_IS_TRUNCATED` — the implementer must confirm the variable name in current GitLab docs before wiring), a missing reference is reported as `NOT EVALUATED` instead of a warning. On pushes with no body: `NOT EVALUATED: no PR body`.

AC-001 (plan reference), advisory:
1. Classify changed files as behavior files: every changed file except `docs/**` (but including `docs/contracts/**/*.yaml|json`), `*.md`, `test/**`, `.obsidian/**`, lockfiles. The pattern list is one constant in the script. If none are behavior files: `OK: no behavior files changed`.
2. Otherwise scan the PR text for repo-relative references to `docs/records/(implementation-plan|task-brief|sdd)/<name>.md` (plain path, markdown link, or `[[...]]` wikilink). A reference resolves when the path has no `..` segment, is not absolute, stays inside the repo root after `realpath`, and the file exists at HEAD. Network URLs are not resolved (offline, deterministic).
3. No resolvable reference: `WARN [AC-001] behavior files changed (n) but the PR text cites no existing plan/Task Brief/SDD (AGENTS.md Implementation Planning Rule)`.
Known limitation (documented in the script header): `pull_request` runs do not re-trigger on body edits, so the warning can be stale until the next push.

AC-002 (size and write set), advisory:
1. Size: `git diff --numstat <merge-base>...HEAD`, excluding generated or record paths (`package-lock.json`, `docs/records/**`, `test/fixtures/**`). Thresholds as constants mirroring `AGENTS.md:24`: > 300 changed lines -> `WARN [AC-002] ... exceeds ~300 (acceptable for one logical change; consider splitting)`; > 1000 -> `WARN ... exceeds ~1000 (too large; must be split)`.
2. Write set, only when the PR text cites a Task Brief (`docs/records/task-brief/*.md`): parse the `- Write set:` field at `docs/templates/TASK_BRIEF.md:14` best-effort (same-line list or following indented bullets, comma/backtick separated, `*` and `**` globs). Each changed file outside the union of cited briefs' write sets -> `WARN [AC-002] <file> is outside the Task Brief write set`. If the field is missing, empty or unparsable -> `WARN [AC-002] write set not parseable; not compared` (never a silent pass). With no cited Task Brief the write-set comparison is skipped and a single `INFO` line says so; only size is evaluated. This is a best-effort Markdown read, not the machine-readable write-set field deferred under AC-003.
3. Who warns and where: the script, in the `validate` job on both hosts (annotations via `::warning::` when `GITHUB_ACTIONS=true`) and locally via pre-push. The Orchestrator's manual duty to record and check overlap (`task-execution-mode.md:24-26`) is unchanged.

### 2. AC-004: evidence references and one source of truth
Single-source decision: `docs/contracts/bug-fix-workflow.yaml` is the only source; `TRANSITION_MATRIX` stops being an independent authority. Rationale by consumer (F4-F6): the YAML is declared canonical, is what `validate-contracts`, the fixtures and the disk-bound CLI path already use, and supports per-transition evidence, `when` and `terminal_requirements` that a per-from-state matrix cannot express. Making the matrix primary would require generating the YAML and would diverge from the other three workflow contracts.

Where each matrix-only part goes:

| Matrix-only part | Disposition |
|---|---|
| `requires` per from-state | Removed. Evidence comes only from the YAML transition row (`policyTransition`). |
| `destinations` | Derived from YAML `transitions[].to` and `resume[].destinations`. Matrix-only destinations `designing`, `planning`, `cancelled` have no YAML row and are already unreachable on disk (`policyTransition` rejects them); they disappear from the pure API too. See OQ-1, OQ-5. |
| `actors` | Moved into the YAML as an additive per-row field `actors: [...]` (and per `resume` row), copying today's values for that from-state. `makeTransition` reads actors from the matched row. |
| `STATES` (11) | Kept as is: the envelope schema enumerates all 11 (`durable-task-envelope.schema.json` state enum) and status projection uses them. No schema change. |
| exported `TRANSITION_MATRIX` | Kept as a name for importers, but built at module load by `deriveTransitionTable(policy)` as `{destinations, actors}` only. A missing or invalid YAML at load fails closed with `POLICY_UNAVAILABLE`. |

The pure `transitionTaskState`/`resumeTaskState` now look up the same YAML row as the disk path; the `validateMatrixEvidence` flag is removed (both paths run one function, `validateEvidenceForRow`). Consequence tracked as I297-TC-003.

Evidence-reference grammar (`scripts/lib/evidence-reference.mjs`, pure, syntax-only plus local path existence through the supplied `io.fsOps`, no network). A reference is one of:
1. `path`: repo-relative, optional `#fragment`; no `..`, not absolute, no NUL; resolved under `rootDir`, `realpath` must stay inside it, file must exist. Not restricted to `docs/records/qa|work-items` (archive 249 cites a `test/` path), so the narrower `QA_FILE_PATTERN` from F10 is not reused.
2. `url`: `https://` URL without whitespace.
3. `issue-comment`: either the GitHub comment URL form already accepted at `validate-dispatch-receipts.mjs:268` or a bare `issuecomment-<digits>` id (OQ-2).
A value is a string, or a non-empty array of such strings (matches F8 typing; no schema change). Free text such as `"rp"` is rejected with `EVIDENCE_NOT_REFERENCE` (new code, status `REJECTED`, shard bytes unchanged as in `task-state-machine.test.mjs::TC-007` second test).

Which keys: declared in the YAML by a new additive top-level field `reference_evidence: [repro, fail_path, hypothesis_matrix]` (no key renamed). `failure_description` stays free text. `validatePolicyTransition` applies the check to those keys when they appear in a row's `requires`. The check runs only at transition time, on writes made after the change. It is not run by `validateHistory`, `validateActiveShards`, or the examples lane.

"No test seam" (AC-004(d), `AGENTS.md:213`): the escape remains valid because the rule checks form, not content. A `repro` that records why no test seam exists is satisfied by a reference to the record (path, URL or comment) containing that rationale. No new key or flag is introduced.

Migration and compatibility (what is kept, what must change):

| Item | Outcome |
|---|---|
| `docs/contracts/examples/bug-fix-*.yaml` (3 files) | Unchanged and valid. They are validated by `validateHistory` with `hasMeaningfulValue`, which ignores `reference_evidence` and `actors`. Their prose values (`test command`) are never checked by the new rule (it is transition-time only). |
| Invalid fixtures (`test/fixtures/invalid-*.yaml`, 14) | Unchanged; the YAML additions are ignored by `validateHistory`. Verified by running `npm run validate:contracts` and `test/validate-contracts.test.mjs` in slice 1. |
| `policy_contract_version !== 1` check (`validate-contracts.mjs:37`) and YAML `contract_version: 1` | Not bumped and not edited. The additions are additive keys; examples compare `state.contract_version` to `policy.contract_version` (`validate-contracts.mjs:270`), so a bump would invalidate every fixture and shard. Recorded as a compatibility rule: only additive keys while `contract_version` is 1. |
| 3 archived shards | Unchanged and valid: excluded from `validateActiveShards` (F7), never re-evaluated by the transition-time rule, and their prose `fail_path` values are immutable history. |
| `task-state-machine.test.mjs::TC-007` (first test, lines 398-427) | Must change, two exact edits: (a) the first assertion at 402-410 ("pure transitionTaskState must retain matrix evidence compatibility") encodes the very divergence being retired and is inverted to I297-TC-003; (b) the evidence `repro: 'rp'` in the disk-bound call (lines 411-416) becomes a valid reference (use a URL or `issuecomment-1` value so the temp root needs no file). The second TC-007 test (rejection preserves bytes, lines 429-454) is unchanged. |
| `TC-024b` (line 364, policy vs matrix destination intersection) | Obsolete (it is the drift test the Human rejected). Replaced by an assertion that the derived table equals the YAML destinations. |
| `TC-021`, `TC-022`, `TC-023`, `TC-024`, `TC-025`, `CLI: task-machine-cli commands` | Migrated from matrix-only evidence keys (`root_cause_analysis`, `test_evidence`, `qa_report_ref`, `requirement_discovery`, `issue_ref`, `sdd_ref`) and from `designing`/`planning` paths to YAML keys and paths. Verified call-site counts of matrix-only keys: TC-021 6, TC-022 2, TC-023 3, TC-024 8, TC-025 3, CLI 2, plus `test/control-plane-state-integrity.test.mjs:51`. `test/status-loader.test.mjs` hits are status-projection states, unrelated, and unaffected. |

### 3. AC-006: lessons learned at closeout (separate validator)
`npm run validate:lessons-learned` -> `scripts/validate-lessons-learned.mjs`. Always exits 0 on findings; prints `WARN [AC-006] ...`. No skill participates (F14); `documentation-closeout` may mention it as guidance only. `archive-work-item.mjs` and its journal are untouched. No dependency on `reset-to-template` (a reset repository has no closed work items, so the validator prints `INFO: no closeout scope`).

Closeout detection is decided by the script, because closeout PRs cannot edit work items (F11). A work item is in scope when either:
- (A) a `docs/records/work-items/*.md` file in the PR range has a Status beginning `Closed` (both formats: `## Status: Closed (YYYY-MM-DD)` and a `## Status` heading followed by a line starting `Closed`); or
- (B) the range adds or changes `docs/records/HANDOFF-POST-MERGE-CLOSEOUT-*.md`; the issue number is read from its `Work Item:` URL (`/issues/<N>`) and mapped to the work item file whose name contains `issue-<N>` as a whole token.
`--all` scans all closed work items (audit mode). Base-ref and changed files come from `scripts/lib/diff-scope.mjs`. Scope is limited to range files so historical items never create noise.

Check for each in-scope work item: its `## Lessons Learned` section passes when it contains (i) at least one non-placeholder prose or bullet line, or (ii) a link whose target resolves: a wikilink `[[../lessons-learned/<name>]]` or markdown link to `docs/records/lessons-learned/<name>.md`, where `<name>` matches `^\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]*$` (naming from `docs/templates/WORK_ITEM.md`, `YYYY-MM-DD-slug`) and the file exists. Failing cases (missing section, empty, template placeholder `YYYY-MM-DD-slug`, bare `N/A`, dangling link) -> one `WARN [AC-006]` naming the file and the reason. `N/A — <reason>` passes (OQ-3). For path (B), a non-empty `## Lessons Learned` section in the closeout handoff also satisfies the check, since the closeout PR cannot edit the work item. If no work-item record is found for the issue, print `INFO: no work-item record for #N; not evaluated` (Bug Fix shards live in `task-state.json`).
Wiring: GitHub `validate` job step and GitLab job `validate_lessons_learned` in the same slice (parity enforced by `validate:ci-parity`; the `documentation-sync.yml` project-state workflow is not used because it runs only on the default branch after merge).
Also in this slice: replace the stale `- [ ] Hermes memory updated with durable lessons` line in `docs/templates/LESSONS_LEARNED.md:20` with tool-neutral wording and add one sentence to `README.md:261` naming the validator.

### 4. AC-007: Bootloader additions (<= 2,500 approximate tokens)
Draft (633 characters, about 160 tokens) added as an unnumbered subsection after Section 1 so the five Golden Rules keep their numbers and the regexes in `test/issue-282-policy-contract.test.mjs:68` and `test/skill-decoupling-contract.test.mjs:63` stay satisfied:

```
### Execution Lifecycle

Input → Structure → Iterate → Systematize. Pointers only; the cited sources define the rules.

- **Input**: Plan before code. Non-trivial work follows the `AGENTS.md` Implementation Planning Rule before any edit.
- **Structure**: Root cause before fix. Reproduce and name the failing path first; Bug Fix work follows `docs/contracts/bug-fix-workflow.yaml`. Size diffs per `AGENTS.md` Change Sizing.
- **Iterate**: Verify per Golden Rule 3; at most two rework cycles (Section 3).
- **Systematize**: At closeout, record lessons under the work item's `## Lessons Learned` (`docs/templates/WORK_ITEM.md`).
```
Projected Bootloader: about 1,767 + 160 = 1,930 of 2,500 (hard cap for this slice: <= 2,300 measured, leaving the 2,500 ceiling unmoved). Pointers use section names, not line numbers. Steps: edit -> `npm run validate:context-budget` -> `npm run repin:source-matrix` (22 bootloader pins change; second run must be a no-op) -> update the measurement line at `docs/operating-model/CONTEXT_BUDGET.md:37` (current core measurement only; historical observations untouched) -> `npm test`. Rules 2, 3 and 5 are already in the Bootloader (Golden Rules 4, 3 and the Section 3 rework stop condition) and are not duplicated. `AGENTS.md` is not edited.

### 5. AC-008: Pattern Selection Matrix in `dynamic-routing.md`
Add one compact section (cap 1,600 characters, about 400 tokens) whose rows only point at existing mechanisms: Prompt Chaining -> lifecycle phases/handoffs; Routing -> Routing Algorithm and Change Types; Parallelization -> sequential by default, Task-Execution Mode write-set rule (parallel contracts deferred, ADR-0037); Orchestrator-Workers -> Orchestrator dispatch and Packet v1; Evaluator-Optimizer -> QA/Review with `max_rework_attempts: 2`. Budget: Tier 3 24,877 + up to ~400 = about 25,300 of 30,000 (headroom about 4,700). `dynamic-routing.md` is not in the pinned set (F12), so no repin; `CONTEXT_BUDGET.md` Tier 3 row and total are updated. Role adapters: `npm run validate:adapter-parity` is run; no adapter text is expected to change.

### 6. AC-009: governance
ADR-0037 (Accepted 2026-10-11) records Defer AC-003, Drop AC-005 and the decision to leave the Bootloader ceiling at 2,500. PR carries the Documentation Impact section. Human approval gate applies because the Bug Fix policy contract and the Bootloader change.

## API Contract
N/A — no HTTP endpoints, OpenAPI, pagination or authentication. Internal contract changes: `bug-fix-workflow.yaml` gains additive keys `actors` (per row) and `reference_evidence` (top level) with `contract_version` unchanged at 1; new error code `EVIDENCE_NOT_REFERENCE` (status `REJECTED`); new npm scripts `validate:execution-discipline` and `validate:lessons-learned`.

## Data Model / Data Impact
- Schema change summary: no database. YAML policy gains two additive keys; envelope and task-state JSON schemas unchanged (F8).
- Migration strategy: expand/contract. Expand: add `actors`, `reference_evidence`, derived-table code, new tests (slice 1-2). Contract: delete matrix `requires` and `validateMatrixEvidence` in the same slice that migrates the tests, because they are dead afterwards. No shard rewrite is needed (zero active shards; archives immutable).
- Backfill plan: none. Transition-time enforcement applies prospectively; stored evidence is never re-validated.
- Rollback plan: revert slices in reverse order (2 then 1); because `contract_version` and `policy_contract_version` stay 1, reverting leaves every stored shard readable. Advisory scripts roll back by removing their CI steps/jobs and scripts together (parity must move in the same revert).

## Error Handling
- Advisory scripts: findings -> `WARN`, exit 0; unreadable input, missing git or truncated PR text -> `NOT EVALUATED: <reason>`, exit 0; never a green "OK" for an unevaluated check.
- State machine: invalid reference -> `EVIDENCE_NOT_REFERENCE`, nothing written, locks and guards released (existing `finally` path); missing/invalid YAML at load -> `POLICY_UNAVAILABLE` (fail closed).
- Closeout/PR text that points outside the repo -> treated as unresolved, never read.

## Security Considerations
- PR body and Task Brief content are untrusted input (fork PRs). They are only pattern-matched; paths are validated (no `..`, not absolute, `realpath` containment) before any `existsSync`; nothing is executed; the body reaches the script through an environment variable, never interpolated into `run:`.
- The reference check reads only local paths under `rootDir` and performs no network call, so it cannot be used for SSRF or token exfiltration. Comment-id existence is not verified by the state machine (live API checking stays in `validate-dispatch-receipts.mjs`).
- The change touches the state-machine trust boundary and CI wiring, so Security review is required before merge (Issue Phase 5). No change to the readiness workflow, ruleset, or default-branch trusted-module loading.
- Advisory status must not become a bypass: the scripts are additions, none removes an existing check.

## NFRs
- Performance: each advisory script is one `git diff` plus file reads; target under 5 seconds on this repository; no extra `npm ci`.
- Reliability: deterministic offline behavior; advisory scripts must not fail CI on unexpected input.
- Observability: `WARN [AC-xxx]` and `NOT EVALUATED` lines; `::warning::` annotations on GitHub.
- Scalability: N/A — local repository tooling. Context: Bootloader <= 2,500 (projected ~1,930), Tier 3 <= 30,000 (projected ~25,300).

## Alternatives Considered
| Option | Assessment |
|---|---|
| AC-004: matrix primary, generate YAML | Rejected: YAML is canonical (F5), richer, and shared with three other workflows. |
| AC-004: keep both plus drift test | Rejected by Human decision (Section 9). |
| AC-004: bump `policy_contract_version` | Rejected: breaks `validate-contracts.mjs:37`, examples' version equality and five other hardcoded sites (F6). |
| AC-004: validate references in `validateHistory` / over archives | Rejected: archived prose `fail_path` values and legacy fixtures would fail; no benefit over write-time enforcement. |
| AC-004: network check of comment ids | Rejected: state machine stays offline; precedent exists in the dispatch-receipt validator. |
| AC-001/002: logic in a Claude hook | Rejected by ADR-0022 (hook cannot originate a rule). |
| AC-001/002: extend `work-item-readiness.mjs` | Rejected: it is the Human-gated required merge check and runs from the trusted default branch; advisory logic does not belong there. |
| AC-001/002: blocking CI | Rejected by Human decision (advisory). |
| AC-006: skill or `archive-work-item.mjs` hook | Rejected by Human decision and ADR-0036; archive path is fenced under ADR-0033 and does not see Framework `.md` items. |
| AC-006: key off `Status: Closed` only | Rejected: no item ever reaches `Closed` and closeout PRs cannot edit work items (F11), so the check would never fire. |

## Decision
Proposed for Human approval: YAML as the single Bug Fix policy source (actors and reference rule moved into it, additive, version unchanged); two new advisory scripts wired in the existing `validate` job and a mirrored GitLab job; Bootloader and routing additions within budget; ADR-0037 for the Defer/Drop and the unchanged ceiling.

## Testability Notes
Red test first for every behavior change. Before slice 2 and slice 1's behavior assertion, confirm the test fails on the current tree (the Issue states `TC-007` already passes, so it cannot serve as the red test).

### Traceability (Issue AC -> test cases)
| AC | Issue TC | Test (new unless noted) | Verifies |
|---|---|---|---|
| AC-004 | I297-TC-001 | `test/evidence-reference.test.mjs`, and a durable-mutation case in `test/task-state-machine.test.mjs` | `repro`/`fail_path`/`hypothesis_matrix` = `"rp"` or prose -> `EVIDENCE_NOT_REFERENCE`, bytes unchanged (red first) |
| AC-004 | I297-TC-002 | same files | valid path, URL, comment URL and `issuecomment-<n>` accepted; array form accepted |
| AC-004 | I297-TC-003 | `test/task-state-machine.test.mjs` (replaces `TC-024b`; inverts the first assertion of `::TC-007`) | pure and disk APIs use the same YAML evidence; matrix-only keys rejected; derived table equals YAML |
| AC-004 | I297-TC-004 | existing: `npm run validate:contracts`, `test/validate-contracts.test.mjs`, `test/task-state-machine.test.mjs::TC-007` (second test unchanged; first test edited as above) | fixtures, invalid fixtures, version-1 check, archives remain valid |
| AC-006 | I297-TC-005 | `test/validate-lessons-learned.test.mjs` | missing/empty/placeholder/bare `N/A`/dangling link -> WARN, exit 0 |
| AC-006 | I297-TC-006 | same file | non-empty bullets, valid wikilink, `N/A — reason`, closeout-handoff lessons, both Status formats -> no warning |
| AC-001 | I297-TC-007 | `test/validate-execution-discipline.test.mjs` | behavior file changed without plan reference -> WARN, exit 0 |
| AC-001 | I297-TC-008 | same file | cited plan/Task Brief exists -> no warning; `..`/absolute/missing target -> unresolved |
| AC-002 | I297-TC-009 | same file | > 300 / > 1000 lines and out-of-write-set file -> WARN, exit 0 |
| AC-002 | I297-TC-010 | same file | in-range diff, and no Task Brief -> no write-set warning; unparsable write set -> explicit WARN |
| AC-007 | I297-TC-011 | existing: `npm run validate:context-budget`, `test/validate-context-budget.test.mjs`, `test/issue-282-policy-contract.test.mjs` | Bootloader <= 2,500 (target <= 2,300); Tier 3 <= 30,000 |
| AC-007 | I297-TC-012 | existing: `npm run repin:source-matrix` twice, `test/validate-context-compatibility.test.mjs` | second run no-op; matrix tests pass |
| AC-008 | I297-TC-013 | existing: `npm run validate:context-budget`; `npm run validate:adapter-parity` | Tier 3 <= 30,000 with section <= ~400 tokens |
| AC-009 | I297-TC-014 | existing: `npm run adr:audit` (`test/validate-adr-audit.test.mjs`), `validate:project-state`, `validate:ci-parity` (`test/validate-ci-parity.test.mjs`) | exit 0; GitLab has both new commands |
| All | I297-TC-015 | `npm test` | baseline 783 passing, no net loss (deleted/replaced tests recorded) |
Extra: a drift test pinning the script thresholds to the `AGENTS.md` Change Sizing sentence; a test that `docs/contracts/bug-fix-workflow.yaml` keeps `contract_version: 1`.

### Implementation order (each slice <= ~300 changed lines; refactor and feature separate)
| Slice | Content | Est. lines |
|---|---|---|
| S1 (AC-004, behavior-changing consolidation) | YAML `actors`; `deriveTransitionTable`; remove matrix `requires`/`validateMatrixEvidence`; migrate TC-021..025, CLI test, control-plane test, replace TC-024b; I297-TC-003 red first. If the test migration exceeds ~300 lines, split S1a (code) and S1b (tests). | 200-300 |
| S2 (AC-004, feature) | `evidence-reference.mjs`; YAML `reference_evidence`; hook in `validatePolicyTransition`; `::TC-007` first-test edits; I297-TC-001/002 red first | ~200 |
| S3 (AC-006) | `diff-scope.mjs` (shared), `validate-lessons-learned.mjs`, tests, npm script, GitHub step + GitLab job, template wording fix, README sentence | ~280 |
| S4 (AC-001/002) | `validate-execution-discipline.mjs`, tests, npm script, GitHub step + GitLab job, pre-push call | ~280 (split by AC if over) |
| S5 (AC-007/008) | Bootloader lines, routing matrix, repin, `CONTEXT_BUDGET.md` | ~70 plus 22 pin lines |
| S6 | Full verification, Independent QA, Security review, Human merge approval | n/a |

## Open Questions — resolved by Human Maintainer 2026-10-11 (all six SA recommendations accepted; Section 9 decisions unchanged)
- **Accepted** OQ-1: Confirm that making the YAML the single source changes pure-API behavior: `::TC-007` first assertion is inverted, and about 24 matrix-key call sites in 6 tests (+1 in `control-plane-state-integrity.test.mjs`) migrate. This is required for a true single source; the Issue asked to keep TC-007 "as is" without migration, which cannot hold for that assertion.
- **Accepted** OQ-2: Bare comment id syntax (`issuecomment-<digits>`) in addition to the full comment URL, and path existence required: recommended yes to both; no network verification.
- **Accepted** OQ-3: Does bare `N/A` in `## Lessons Learned` count as empty (recommended: warn; `N/A — <reason>` passes)? `WORK_ITEM.md` currently offers `N/A` as a template option.
- **Accepted** OQ-4: The Issue header says Human approval is needed for `AGENTS.md` edits, but no remaining AC edits it (AC-001 forbids duplicate rule text). Confirm `AGENTS.md` stays untouched.
- **Accepted** OQ-5: `cancelled` (and `designing`/`planning`) exist only in the matrix, never in the YAML, so Bug Fix tasks cannot be cancelled on disk today. Recommended: do not add YAML rows in this Issue.
- **Accepted** OQ-6: Closeout PRs cannot edit work items (`work-item-readiness.mjs:270-283`), so lessons for path (B) may live in the closeout handoff. Recommended: do not widen the allow-list.

## Related Artifacts / Links
| Artifact | Purpose | URL / Repository Path |
|---|---|---|
| Issue #297 | Authoritative requirements and Human decisions | https://github.com/chakrits/AI-Agent-Workflow/issues/297 |
| ADR-0037 | Defer AC-003, Drop AC-005, Bootloader ceiling | `DECISIONS.md` |
| SDD template | Structure | `docs/templates/SDD.md` |
| Prior decisions | Hook invariant; optional skills | `DECISIONS.md` ADR-0022, ADR-0036 |
| Bug Fix policy | Canonical contract | `docs/contracts/bug-fix-workflow.yaml` |
