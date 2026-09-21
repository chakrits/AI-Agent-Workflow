# Issue #277 Package 1 — SEC-008 Independent Code Review

| Field | Value |
|---|---|
| Work item | Issue #277 — Control-plane state integrity, Package 1 |
| Candidate | `35009ac` (`ded9f81` implementation) |
| Reviewer | Independent Code Review Gate (GPT-5.6 Luna) |
| Decision | **PASS** |
| Scope | SEC-008 directory durability remediation and regression review; no production edits, push, PR or Issue mutation |

## Review basis

This review independently re-derived `unlockTask()` and the shared directory-sync primitive
against the SDD Component 4 recovery protocol, ADR-0032, the SEC-008 finding and the developer
handoff. The review also reran the SEC-008 fault boundary, CR-001–CR-015 control-plane paths,
related state-machine/projection tests and repository validators. Test counts are reported as
verification evidence, never as an acceptance criterion.

## SEC-008 verification

**Closed at the independent code-review gate.** `syncDirectorySync()` in
`scripts/lib/fenced-commit.mjs:20-31` opens and `fsyncSync`s the requested directory, while
`atomicWriteFileSync()` reuses the same primitive. `unlockTask()` at
`scripts/lib/task-state-machine.mjs:196-200` preserves the required recovery order:

1. `incrementGeneration()` durably writes generation `g + 1` and syncs the fencing directory;
2. the nonce-validated admission lock is unlinked;
3. the admission-lock parent directory is synced;
4. the commit guard is released in `finally`.

The sync failure is propagated after unlink, so `unlockTask()` cannot return success. The guard
cleanup still runs, and the generation bump remains durable. This matches the SDD requirement
that the generation rename precedes admission removal and that the lock directory is synced
after removal.

## Failure and mutation evidence

The SEC-008 test injects `EIO` specifically on the admission-lock directory `fsyncSync` after
unlink. It proves the error is surfaced, generation is `2`, the lock is absent, and the commit
guard is cleaned up. The two named load-bearing mutations reported by the developer were also
reviewed: removing the `unlockTask()` directory-sync call and removing the shared directory
`fsyncSync` are both killed by the fault-injection barrier. No Stryker/mutmut runner is installed
or cached, so this is named deterministic mutation evidence only.

No weakening was found in nonce validation, malformed-lock recovery, explicit quiescence,
non-reclaimable commit guards, generation monotonicity, fencing, or cleanup. The shared helper
refactor leaves existing atomic file replacement ordering unchanged.

## Regression and verification

- `node --test test/control-plane-state-integrity.test.mjs --test-name-pattern='SEC-008|CR-005'` — **PASS**, 19/19.
- `node --test test/task-state-machine.test.mjs test/compile-status-projection.test.mjs` — **PASS**, 21/21.
- `npm test` — **PASS**, 786/786.
- `npm run validate:contracts` — **PASS**.
- `npm run validate:project-state` — **PASS**.
- `npm run validate:workflow-evidence` — **PASS**.
- `npm run validate:dispatch-receipts` — **PASS**.
- `npm run adr:audit` — **PASS**, 2.56:1.
- `git diff --check` — **PASS**.

The focused control-plane run includes CR-001 through CR-015 and all named archive,
compensation, adoption, projection, fencing and byte-identity barriers. The working tree was
clean before this review-record update.

## Decision and routing

**PASS for the independent code-review gate.** Route to **QA Full Mode** for independent
verification of SEC-008 and the remaining runtime evidence. Then route to **Security Reviewer**
for SEC-004/SEC-008 re-review as required by the security gate. This review does not claim that
SEC-004 is runtime-closed: the separate-process TC-040/TC-047 crash/restart harness and complete
mutation ledger remain unavailable, and no Stryker/mutmut runner is present.

## Handoff summary

CHANGES MADE:
- Added this independent SEC-008 code-review record.

NOTICED BUT NOT TOUCHING:
- Production code was not modified by this reviewer.
- QA Full Mode, Security re-review and Human merge approval remain pending.
- SEC-004 runtime limitations remain explicitly open.

NEXT OWNER:
- QA Agent — rerun Full Mode with SEC-008 fault evidence and preserve the SEC-004 runtime limitation.

Skill Used: code-review-gate, static-logic-review, verification-before-completion, git-workflow-and-versioning
