# Issue #129 Reset Verification Harness — Independent Code Review

## Review Context

| Item | Value |
|---|---|
| Role | Independent Reviewer Agent |
| Branch / Reviewed Commit | `codex/issue-129-reset-template` / `1bbe76dee46ceb4e281ac3df204d90c583570cb7` |
| Review Range | `4e4cbab..1bbe76dee46ceb4e281ac3df204d90c583570cb7` |
| Change Type / Risk | Framework/Meta enhancement / Medium, destructive verification boundary |
| Governing Contract | Plan D3a and AC-07, AC-08, AC-12 |
| Prior QA | Preserved unchanged: `docs/records/qa/2026-07-31-issue-129-qa-report.md` remains BLOCKED |
| Review Result | **BLOCKED** |

## Change Reviewed

- `scripts/verify-reset-template.mjs`: repository-owned clone setup, disposable-root attestation, confirmed reset invocation, post-reset validators, idempotency, cleanup, and primary-tree integrity comparison.
- `test/verify-reset-template.test.mjs`: eight attestation tests using injected probes and reset child.

## Blocking Findings

### CR-129-H01 — Major — ownership marker is self-consistent caller data, not proof of harness creation

**Evidence:** `scripts/verify-reset-template.mjs:43-48,60-63`. `attestDisposableClone()` accepts `marker` and `readMarker` from its caller, then proves ownership only by comparing the object returned by one caller-controlled input with the other caller-controlled input. Any caller can point the function at an existing standalone clean clone and supply matching fabricated values; the comparison does not establish that `runDisposableVerification()` created that candidate during the current run. The positive test demonstrates this false positive directly at `test/verify-reset-template.test.mjs:94-103`: no harness-created marker file exists, yet matching in-memory objects authorize `spawnReset`.

**Impact:** D3a proof 1 and AC-07 are not met. The destructive child can be exposed after a self-consistent ownership claim without evidence that the harness created the candidate.

**Required rework:** make ownership capability internal to the harness operation and inseparable from candidate creation. The destructive attestation path must derive/read the marker from the harness-created directory and compare it to run-local state that external callers cannot independently provide as matching data. Keep test seams below that ownership boundary (filesystem/process adapters), and add a negative case proving that a pre-existing standalone clone with a forged self-consistent marker cannot spawn reset.

### CR-129-H02 — Major — the harness skips the required pre-apply sentinel and dirty-refusal proof

**Evidence:** `scripts/verify-reset-template.mjs:125-145` clones, checks out, writes the marker, attests, and immediately spawns confirmed reset. It never seeds a QA-preservation sentinel, captures its bytes/hash, deliberately dirties a reset target, proves refusal/no mutation, or restores clean state before the confirmed apply. These are explicit harness-owned steps in plan §8 and D3a's setup/evidence boundary; the later validators at lines 151-151 do not substitute for them.

**Impact:** AC-07/AC-08 verification can report success without proving the harness preserved QA evidence or that the dirty-target refusal left candidate and primary state unchanged in the actual harness flow.

**Required rework:** before confirmed apply, have the repository-owned harness seed and hash the QA sentinel, exercise the dirty-target refusal through a non-destructive child-injection seam, prove zero reset spawn/no mutation, restore and attest exact clean commit state, then apply. Recheck the sentinel after apply and idempotency. Add integration assertions for each step and for cleanup on both success and injected failure.

## Test-Quality Findings

The focused suite passes 8/8 but is insufficient for this destructive boundary:

- The positive case at `test/verify-reset-template.test.mjs:90-106` tests mocks rather than real ownership behavior: synthetic directories, mocked Git probes, and matching caller data can authorize the reset child without a clone or marker file.
- There are no refusal tests for canonical Git-root mismatch, wrong exact commit, or primary/common-directory path aliases, despite D3a requiring every failed proof to demonstrate zero reset spawn.
- There is no end-to-end harness test asserting setup, sentinel preservation, dirty refusal/no mutation, validator binding, cleanup, and primary integrity on injected success and failure.

Developer should retain the fast injected guard tests, but add realistic local-Git integration coverage around the complete harness-owned operation. No production or test code was changed by the Reviewer.

## Verification Evidence

| Command | Result |
|---|---|
| `node --test test/verify-reset-template.test.mjs` | PASS, 8/8 |
| `npm test` | PASS, full normal suite |
| `npm run validate:contracts` | PASS |
| `npm run validate:project-state` | PASS |
| `npm run validate:skill-parity` | PASS, 25 skills |
| `npm run adr:audit` | PASS |
| `npm run validate:risk-register` | PASS |
| `npm run validate:review-gate` | PASS |
| `npm run validate:skill-usage` | PASS |
| `npm run validate:metrics` | PASS |
| `npm run validate:context-budget` | PASS |
| `git diff --check` | PASS |
| Repository-owned destructive harness | **NOT RUN** — safety review failed before destructive verification |

All commands above ran against a clean exact starting tip `1bbe76dee46ceb4e281ac3df204d90c583570cb7`. GitHub Issue #129 and Draft PR #130, including owner clarification and the prior blocked QA report, were read independently. Existing failing PR checks (`validate-documentation-impact` and `work-item-readiness-freshness`) predate this review record and remain separate lifecycle/CI evidence for the blocked Draft PR.

## Gate and Handoff

| Item | Result |
|---|---|
| Findings | 0 Critical, 2 Major, 0 Minor, 0 Questions |
| Review gate | **BLOCKED** |
| Acceptance status | AC-07/AC-08/AC-12 not approved by Reviewer |
| Required route | Developer rework, then fresh independent review; fresh QA remains downstream and prior QA verdict is unchanged |
| QA focus after rework | Forged/pre-existing candidate ownership, path aliases/common-dir linkage, exact commit/clean state, zero spawn for every failed proof, sentinel and dirty-refusal flow, cleanup and primary integrity on success/failure |

## Completion Check

| Item | Status | Notes |
|---|---|---|
| Workflow / Agent | PASS | Independent Reviewer; no Developer code fixes |
| Skill Used | PASS | `code-review-gate`, `test-quality-discipline`, `verification-before-completion`, `git-workflow-and-versioning` |
| Artifacts Updated | PASS | This review record only |
| Tests / Checks | PASS with scope limit | Normal branch checks passed; destructive harness intentionally withheld after blocking safety findings |
| Quality Gate | **BLOCKED** | Two Major findings require Developer rework |
| Risks / Limitations | RECORDED | No fresh QA claim; no destructive reset or history rewrite executed |
| Next Recommended Agent | Developer Agent | Rework CR-129-H01 and CR-129-H02, then independent re-review |

## Re-review — Commit `7dacb82e440880f1abfe59b03a498a47ab77b591`

### Re-review Result

**BLOCKED.** CR-129-H01 and CR-129-H02 are closed at the production-flow level, but one new Major cleanup/integrity defect remains and the previously recorded zero-spawn test-quality gap is only partially addressed. The repository-owned destructive harness was therefore not run.

### Finding Closure

| Finding | Status | Independent evidence |
|---|---|---|
| CR-129-H01 | **CLOSED** | `scripts/verify-reset-template.mjs:67-137` now creates `candidateRoot` and frozen run ownership inside `runDisposableVerification()`, writes and reads the marker internally, and keeps the attestation closure private. Callers cannot provide a candidate root, marker, marker reader, script path, or destructive cwd. `test/verify-reset-template.test.mjs:45-64` confirms the old public attestation export is absent and a pre-existing clone with a forged marker never becomes any reset call's cwd. |
| CR-129-H02 | **CLOSED** | `scripts/verify-reset-template.mjs:139-181` now seeds an ignored QA sentinel, attests the source commit, dirties `DECISIONS.md`, requires dirty refusal, hashes the complete candidate before/after refusal, restores the exact bytes, re-attests commit/clean state, applies, rechecks the sentinel, validates, commits a baseline, re-attests, and runs idempotency. `test/verify-reset-template.test.mjs:66-84` confirms phase order, evidence flags, candidate cleanup, and primary cleanliness. |

### CR-129-H03 — Major — cleanup failure skips the primary-integrity proof

**Evidence:** `scripts/verify-reset-template.mjs:192-203` performs `await rm(runParent, { recursive: true, force: true })` before collecting `primaryAfter`. If cleanup rejects, JavaScript exits the `finally` block at line 193, so commit/status/tree-digest integrity is never compared and the candidate may remain. This is exactly the requested cleanup-failure boundary. The test named `injected failure cleans candidate and preserves primary integrity` at `test/verify-reset-template.test.mjs:128-146` injects an **apply** failure and then observes successful cleanup; it does not cause cleanup itself to fail.

**Impact:** the harness cannot prove primary integrity or complete candidate cleanup on one of its required failure modes. A cleanup error also masks whether the primary remained byte-for-byte clean.

**Required rework:** put cleanup and primary-integrity collection into independent guarded operations so the integrity comparison always runs even when cleanup fails. Preserve both errors when both occur. Add an injected cleanup adapter below the ownership boundary and a test that forces cleanup failure, asserts the primary comparison still executes, reports the cleanup failure, and performs safe test teardown afterward.

### Remaining Test-Quality Gap — Major

The rework adds realistic local-Git integration for forged candidates, canonical Git-root mismatch, wrong commit, a primary path alias, phase ordering, successful cleanup, and apply-failure cleanup. It does **not** satisfy the recorded requirement that every failed D3a proof demonstrates zero destructive spawn:

- No missing or foreign ownership-marker refusal test.
- No linked-worktree/shared-common-directory or canonical common-directory alias refusal test.
- No dirty-clone attestation refusal test.
- No reset-script/cwd mismatch refusal test.
- No cleanup-failure test; the existing failure test is an apply failure followed by successful cleanup.

These cases were present in the approved D3a regression list or explicitly requested in the re-review packet. The private attestation closure makes direct unit invocation unavailable, but the existing dependency seam can still inject Git-root/common-dir/commit/status outcomes; a narrowly scoped post-creation test hook or filesystem adapter can exercise marker/script conditions without exposing candidate selection or destructive cwd. Every such case must assert no `runReset` call occurred and primary integrity was checked.

### Re-review Verification Evidence

| Command | Result |
|---|---|
| `node --test test/verify-reset-template.test.mjs` | PASS, 7/7 |
| `npm test` | PASS, 309/309 |
| `npm run validate:contracts` | PASS |
| `npm run validate:project-state` | PASS |
| `npm run validate:skill-parity` | PASS, 25 skills |
| `npm run adr:audit` | PASS, 15 ADRs / 41 decision keywords |
| `npm run validate:risk-register` | PASS |
| `npm run validate:review-gate` before review-record commit | Expected FAIL: tip changes two scripts and the re-review evidence was not yet in `HEAD~1..HEAD` |
| `npm run validate:skill-usage` | PASS |
| `npm run validate:metrics` | PASS |
| `npm run validate:context-budget` | PASS, 26,020 / 30,000 |
| `git diff --check` | PASS |
| Repository-owned destructive harness | **NOT RUN** — re-review gate remains blocked |

### Re-review Gate and Handoff

| Item | Result |
|---|---|
| Rework range | `576f5cc..7dacb82e440880f1abfe59b03a498a47ab77b591` |
| Findings after re-review | CR-129-H01 closed; CR-129-H02 closed; CR-129-H03 Major open; Major test-quality gap open |
| Review gate | **BLOCKED** |
| Prior QA | Unchanged and still BLOCKED; this is not fresh QA evidence |
| Required route | Developer fixes CR-129-H03 and completes every recorded negative case, then a fresh independent re-review |
| Fresh-QA focus after PASS review | Real repository-owned harness at exact clean review tip; AC-01–AC-12 re-derived independently; sentinel/refusal/restoration/order; aliases/common-dir linkage; exact commit/clean state; zero spawn on all proofs; cleanup and primary integrity on success/failure; post-reset validators and idempotency |
