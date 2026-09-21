# Issue #277 Package 1 — SEC-008 Developer Code Review Record

## Scope

Review target: `ded9f81` (`fix(control-plane): sync admission lock directory after recovery`).
This is the Developer self-review record for the approved Security finding SEC-008; it is not
the independent Code Review or Security verdict.

## Finding disposition

**SEC-008: addressed in implementation; independent verification required.**

`syncDirectorySync()` is now the shared directory durability primitive in
`scripts/lib/fenced-commit.mjs:20-31`. `atomicWriteFileSync()` reuses it at line 84, and
`unlockTask()` preserves the SDD recovery order at `scripts/lib/task-state-machine.mjs:196-199`:

1. durably increment generation;
2. unlink the nonce-validated admission lock;
3. sync the admission-lock parent directory;
4. return success only after the sync completes.

If the directory sync raises after unlink, the error propagates, the `finally` block releases the
commit guard, and the function never returns `unlocked: true`.

## Test evidence

- RED: before the implementation, the SEC-008 fault-injection test failed with `Missing expected exception` because no directory sync occurred.
- GREEN: `node --test test/control-plane-state-integrity.test.mjs --test-name-pattern='SEC-008|CR-005'` passed 19/19.
- Full suite: `npm test` passed 786/786.
- Named mutation 1: removing the `unlockTask()` directory-sync call was killed by SEC-008.
- Named mutation 2: removing `ops.fsyncSync(dirFd)` from `syncDirectorySync()` was killed by SEC-008.
- `git diff --check` passed.

## Limitations

- No Stryker/mutmut runner is installed or cached in this environment.
- No separate-process process-kill/restart campaign exists for TC-040/TC-047; SEC-004 remains runtime-blocked.
- This record does not claim independent Code Review, QA, or Security closure.

## Documentation Impact

<!-- documentation-impact: complete -->

The change is covered by the SDD recovery protocol and the SEC-008 Security Review record. No
additional user-facing documentation is required; `PROJECT_STATUS.md` and `TASK_LOG.md` record
the implementation and remaining runtime-evidence limitation.

## Handoff

- Reviewed Candidate SHA: `ded9f81`
- Handoff Record Commit SHA: resolved externally as the final branch SHA containing this record
- Next owner: Independent Code Review Gate
- Next action: re-derive SEC-008 ordering, failure cleanup and CR-001–CR-015 regressions, then route to QA/Security rerun.
