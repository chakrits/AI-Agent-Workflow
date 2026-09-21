# Issue #277 Package 1 — SEC-008 Final QA

## Metadata

- Work Item: Issue #277 — Control-plane state integrity, Package 1
- Candidate: `21d5862`
- Implementation: `ded9f81`
- Independent Code Review: `21d5862` — PASS
- Tester: QA Agent (GPT-5.6 Luna)
- Date: 2026-09-21
- Risk: High — filesystem durability and recovery fencing

## Verdict

**PASS for SEC-008 and the available regression scope.** The package remains blocked on the
pre-existing SEC-004 runtime evidence gap and must proceed to Security Reviewer re-review.

## SEC-008 verification

The implementation preserves the required recovery order in
`scripts/lib/task-state-machine.mjs`:

1. `incrementGeneration()` durably writes the next generation and syncs the fencing directory.
2. The nonce-validated admission lock is unlinked.
3. `syncDirectorySync(path.dirname(target), io)` syncs the admission-lock parent directory.
4. The commit guard is released from `finally`.

The focused fault injection raises `EIO` at the lock-directory sync after unlink. The test
confirmed the error is not reported as success, generation advances to `2`, the lock remains
absent, and the commit guard is cleaned up.

## Mutation evidence

Both named load-bearing mutations were independently re-run against the focused control-plane
test and were killed:

| Mutation | Result |
|---|---|
| Remove `unlockTask()` admission-lock directory sync | Killed; test exit 1, 18 passed / 1 failed |
| Remove shared directory `fsyncSync()` | Killed; test exit 1, 18 passed / 1 failed |

No Stryker/mutmut runner is installed or cached. These are named deterministic mutation results,
not a claim of complete automated mutation coverage.

## Regression and validation evidence

- `node --test test/control-plane-state-integrity.test.mjs --test-name-pattern='SEC-008|CR-005'` — PASS, 19/19; includes CR-001–CR-015 barriers.
- `node --test test/task-state-machine.test.mjs test/compile-status-projection.test.mjs` — PASS, 21/21.
- `npm test` — PASS, 786/786.
- `npm run validate:contracts` — PASS.
- `npm run validate:project-state` — PASS.
- `npm run validate:workflow-evidence` — PASS.
- `npm run validate:dispatch-receipts` — PASS.
- `npm run adr:audit` — PASS, 2.56:1.
- `git diff --check` — PASS.
- Worktree was clean after restoring the temporary mutation probes.

## Coverage and limitations

Covered: SEC-008 ordering, post-unlink sync failure, generation monotonicity, guard cleanup,
named directory-sync mutations, CR-001–CR-015 regression barriers, state-machine/projection
regression, contracts, project state and workflow evidence validators.

Not covered: the separate-process crash/restart campaign required by TC-040/TC-047 and a full
Stryker/mutmut security mutation ledger. These limitations remain attached to SEC-004 and are
not silently treated as passed by this QA record.

## Routing

- SEC-008: QA PASS.
- SEC-004: remains runtime-blocked pending Security disposition of the unavailable process-kill/
  restart and complete mutation evidence.
- Next owner: Security Reviewer for SEC-004/SEC-008 re-review.
- Human merge approval remains required.

## Change Summary

CHANGES MADE:
- Added this independent QA record for SEC-008.
- Updated `PROJECT_STATUS.md` and `TASK_LOG.md` with the QA verdict and next owner.

NOTICED BUT NOT TOUCHING:
- No production code changed.
- No attempt was made to claim SEC-004 runtime closure or to add an unavailable crash harness.

CONCERNS:
- The environment still lacks Stryker/mutmut and the separate-process TC-040/TC-047 harness.
