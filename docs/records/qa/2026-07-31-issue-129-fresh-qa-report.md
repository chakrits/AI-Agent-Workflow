# Issue #129 Reset-to-Template Fresh QA Report

## Metadata

| Item | Value |
|---|---|
| Work Item | [GitHub Issue #129](https://github.com/chakrits/AI-Agent-Workflow/issues/129) |
| Draft Change Request | [Draft PR #130](https://github.com/chakrits/AI-Agent-Workflow/pull/130) |
| Role | Fresh Independent QA Agent; did not implement or review the change |
| Branch / exact verification commit | `codex/issue-129-reset-template` / `ffcb1211adfa63f26b8df3ac2f6f4cd227f20f19` |
| Date / environment | 2026-07-31; macOS; Node.js v22.22.3 |
| Change type / risk | Framework/Meta enhancement / Medium; destructive local verification |
| Authoritative source | Amended implementation plan, ADR-0016, Issue #129 Owner decisions, AC-01 through AC-12 |
| Verdict | **DONE** |

## Independence and Safety Boundary

This pass independently re-derived all acceptance results from the exact clean commit. Developer, Reviewer, and prior QA records were read as required context but were not reused as pass evidence. The prior blocked report remains byte-identical to the pinned commit (`SHA-256 ed4aa65a50d90daba3aa98cfc3b69fe4573c60a8d163cbade7fcb8cda525d24d`).

Confirmed reset was executed exactly once by the QA Agent and solely through the repository-owned `node scripts/verify-reset-template.mjs` harness from the clean primary tip. The reset script was never invoked directly. No ad hoc clone/apply sequence, primary-worktree reset, branch/history rewrite, push, label change, PR-readiness change, or GitHub comment was performed.

The harness owned candidate creation, unguessable marker, canonical root/common-directory/script/cwd proofs, exact-commit and clean-state attestation, QA sentinel, dirty refusal/no-mutation proof, restoration, re-attestation, confirmed apply, validators, baseline commit, second attestation, idempotency, cleanup, and primary HEAD/status/tree-digest comparison.

## Acceptance Criteria

| AC | Result | Fresh evidence |
|---|---|---|
| AC-01 | PASS | Focused dry-run snapshot test passed; no-flag CLI remained non-mutating and inventory-only. |
| AC-02 | PASS | Harness reset five stub files and cleared 12 declared directories; work-items/lessons became `.gitkeep` baselines and `DECISIONS.md` passed the blank-state ADR audit. |
| AC-03 | PASS | Harness-owned ignored QA sentinel was hashed before apply and verified after apply and idempotency; focused byte-for-byte sentinel test also passed. |
| AC-04 | PASS | Static scope confirms README and both indexes are absent from `STUB_CONTENT`; focused outside-scope preservation passed. |
| AC-05 | PASS | `--apply` without `--confirm-reset` refused non-zero before mutation in the focused matrix. |
| AC-06 | PASS | Tracked, staged, untracked, and symlink/containment refusal cases preserved complete pre/post snapshots; harness dirty refusal preserved its full candidate digest. |
| AC-07 | PASS | Only the repository harness spawned confirmed reset. Expected disposable-clone apply and second post-baseline apply succeeded; every injected failed proof recorded zero reset calls. |
| AC-08 | PASS | Normal and post-reset suites passed 316/316. All 11 Section 8 commands passed in both environments. |
| AC-09 | PASS | Deterministic TASK_LOG and review-record tests passed with specific grouping and Issue #106 positive/adversarial assertions retained. |
| AC-10 | PASS | GitHub/GitLab folded and literal destructive forms were detected; harmless dry runs were permitted; repository CI scan was clean. |
| AC-11 | PASS | Operator guide matches the five-file/12-directory scope, both guards, recovery limits, human-only orphan flow, remote coordination, and non-security-purge boundary. |
| AC-12 | PASS | Exact clean tip used; direct reset/history operations were absent; prior incidents remain in TASK_LOG/prior report; final harness review exists; this fresh pass used only the approved harness and preserved primary integrity. |

## Command Evidence and Counts

| Command / group | Result |
|---|---|
| `node --test test/reset-to-template.test.mjs test/backfill-work-item-records.test.mjs test/validate-review-gate.test.mjs test/verify-reset-template.test.mjs` | PASS — 68/68 |
| Harness guard subset | PASS — 14/14; opaque seams, forged ownership, canonical-root and commit failures, common-dir alias, dirty clone, script/cwd mismatch, zero reset calls on failed proofs, cleanup/error aggregation, and primary-integrity observation |
| `npm test` on primary | PASS — 316/316 |
| Normal Section 8 validators/checks | PASS — 11/11 |
| `node scripts/verify-reset-template.mjs` | PASS at exact commit; 316/316 post-reset tests and 11/11 post-reset commands |
| Harness idempotency | PASS — second confirmed apply after baseline commit reported inventory total 0 and left status clean |
| Final primary integrity | PASS — HEAD remained `ffcb1211...`; status, unstaged diff, staged diff, and diff check clean; harness tree digest comparison passed |

Command accounting: 68 focused tests, 316 normal tests, 316 post-reset tests, 11 normal validators/checks, 11 post-reset validators/checks, and one harness-owned destructive verification invocation. The 14 harness tests are included in both the 68 focused count and each 316 full-suite count and are not additional unique tests.

## Test-Quality Assessment

The changed tests satisfy FIRST for this Git/filesystem CLI boundary: local temporary repositories, deterministic setup/cleanup, self-validating assertions, and no live network/database. Assertions cover exact outputs/state rather than only callback invocation. Opaque simulation seams cannot select the candidate, marker/token, reset cwd, or script; negative proofs assert zero reset calls. No overmocking, weak assertion, test-only production method, incomplete mock, or pyramid imbalance was found.

## Limitations and Residual Risk

- The CI detector remains a conservative textual GitHub/GitLab scanner, not a complete YAML/shell interpreter; dynamic construction, includes/aliases, and other CI systems are outside AC-10.
- Post-reset verification reused the primary worktree's installed `node_modules` through a harness-created symlink; it verifies reset behavior against the same dependency installation, not a fresh install.
- The harness's primary tree digest intentionally excludes `.git` and `node_modules`; HEAD and full porcelain status are checked separately. This is adequate for the approved working-tree integrity contract but is not a forensic disk audit.
- QA evidence does not approve merge, release, label changes, or PR readiness. Human merge approval remains mandatory.

## Lifecycle Recommendation

All AC-01 through AC-12 pass at the exact pinned commit. Recommend the Orchestrator/Human Maintainer consume this report and, under the lifecycle contract, move from `phase:blocked` to `phase:human-review` and add `status:verification-done` only after confirming this report commit is the intended evidence. Keep PR #130 Draft/readiness and merge approval under Human control; this QA Agent made no external lifecycle mutation.

## Completion Check

| Item | Status | Notes |
|---|---|---|
| Scope / grounding | PASS | Exact Issue/PR, amended plan/ADR, implementation, tests, all review records, and prior QA read |
| AC traceability | PASS | AC-01 through AC-12 each have fresh executable/static evidence |
| Positive / negative / edge coverage | PASS | Normal, refusal, alias/common-dir, commit/clean, ownership, cleanup, sentinel, order, idempotency |
| Test quality | PASS | No actionable test-quality defect |
| Safety | PASS | Repository-owned harness only; primary integrity preserved |
| Artifact | PASS | New report only; prior report unchanged |
| Quality gate | PASS | DONE; human lifecycle/merge gate remains |
| Open questions | None | Residual limitations are explicit |
| Next owner | Orchestrator / Human Maintainer | Consume evidence; decide lifecycle and merge-review actions |
