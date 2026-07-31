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
