# Issue #277 Package 1 — SEC-004 Runtime Security Review

## Metadata

- Work Item ID: Issue #277 — Control-plane state integrity, Package 1
- Candidate under review: `7e7902d`
- Implementation candidate: `87967f3`
- Independent code review: `df17d30` — PASS
- QA evidence: `7e7902d` — functional PASS; runtime evidence blocked
- Reviewer: Security Reviewer (GPT-5.6 Luna)
- Date: 2026-09-21
- Risk: High — durable fencing, recovery and archive/compensation writes
- Status: **BLOCKED — SEC-004 runtime closure not demonstrated**

## Scope and threat re-derivation

SEC-004 covers the false-quiescence case: an operator removes a recoverable admission
lock while an old executor is still capable of continuing. The required invariant is that
the old executor cannot rename a shard, publish a projection, advance an archive journal,
or perform forward/compensating archive movement after the recovery generation has
linearized. The source of this invariant is BR-003/BR-005 in the requirements and G-007/G-008
in the SDD; the security blueprint records the same boundary in its Round 9 matrix.

This review separates source-level protocol evidence and deterministic in-process barriers
from process-kill/restart evidence. The latter cannot be inferred from the former.

## Security scan checklist

| Item | Status | Notes | Evidence |
|---|---|---|---|
| Hardcoded secret / insecure env fallback | Pass | No credential or secret path is introduced by the reviewed control-plane files. | Touched-file review; prior blueprint scan |
| `DEBUG = True` in production settings | N/A | Node.js local CLI/scripts; no production settings surface. | Blueprint § Scan Checklist |
| Raw SQL / ORM bypass | N/A | No SQL or ORM layer. | Blueprint § Scan Checklist |
| CORS allowlist | N/A | No HTTP endpoint. | Blueprint § Scan Checklist |
| DRF permission/authentication classes | N/A | Non-Django repository. | Blueprint § Scan Checklist |
| Sensitive data in logs or URLs | Pass | Errors expose operation codes, task IDs, generations and lock diagnostics; no credentials or PII observed. | `scripts/lib/fenced-commit.mjs:177-179`, blueprint § Scan Checklist |
| Rate limiting on auth endpoints | N/A | No auth endpoint. | Blueprint § Scan Checklist |

## Protocol evidence matrix

| Control | Source evidence | Independent result | Verdict |
|---|---|---|---|
| Durable monotonic generation | Generation is validated as schema v1/safe integer and written with atomic file + parent directory sync. | Source review confirms `readGeneration()`/`incrementGeneration()` behavior. | Pass at source level |
| Non-reclaimable commit guard | `acquireCommitGuard()` uses exclusive `wx`; `EEXIST` returns `COMMIT_GUARD_ABANDONED`; online recovery does not remove it. | Source review confirms no online guard unlink path. | Pass at source level |
| State writer fencing | Durable mutation snapshots generation, acquires guard, rereads generation/shard/digest, then atomically writes only after checks. | CR-001/CR-009/CR-015 and focused state tests pass. | Pass in deterministic tests |
| Projection fencing | Projection compiles after admission lock, checks generation inside projection guard, then atomically writes. | CR-001 and projection tests pass. | Pass in deterministic tests |
| Archive/compensation fencing | Archive and compensation revalidate generation, identity, digest, journal tuple and exact location before rename/phase advance. | CR-002/CR-009/CR-012–CR-015 tests pass. | Pass in deterministic tests |
| Recovery ordering | `unlockTask()` acquires guard, increments generation, then removes admission lock. | Source ordering is correct, but no process crash/restart execution proves persistence across each boundary. | Partial |
| False-quiescence old-writer rejection | Injected barriers demonstrate stale rejection before rename/write. | `test/control-plane-state-integrity.test.mjs`: 18/18 passed independently; this is in-process evidence. | Partial |
| Crash/restart convergence | SDD requires TC-040/TC-047 restart evidence across generation, guard, rename, sync and journal boundaries. | No executable process-kill/restart harness exists in the candidate; TC-013 reloads state in one process and is not equivalent. | **Blocked** |
| Mutation evidence | QA killed the two QA-277-001 mutations and named CR barriers pass. | Stryker/mutmut is unavailable (`ENOTCACHED`); complete security mutation ledger is not executed. | **Blocked** |
| Lock cleanup durability | Recovery unlinks the admission lock after generation write. | `unlockTask()` at `scripts/lib/task-state-machine.mjs:196` has no parent-directory `fsync` after `unlinkSync(target)`, although the SDD recovery protocol requires syncing that directory. | Finding SEC-008 |

## Finding SEC-008

**Severity: Medium — Fix before merge**

`unlockTask()` persists the new generation, then removes the admission lock with
`io.fsOps.unlinkSync(target)` but does not sync the lock directory. The SDD explicitly
requires the recovery sequence to remove the admission lock and sync its directory. A
crash after the unlink and before directory persistence can resurrect the old admission
directory entry after restart. The durable generation remains advanced, so this appears
to preserve stale-writer rejection but can leave a misleading stale lock and block or
confuse recovery. The required fix is to use the existing directory-sync primitive after
the unlink and add a fault-injection test for the unlink/sync boundary. This finding is
separate from the missing runtime campaign and does not justify weakening the fencing
requirement.

## Runtime verdict

**SEC-004: BLOCKED.** The implementation and deterministic barriers support the ADR-0032
protocol, but the acceptance contract requires executable process-kill/restart evidence and
mutation-backed security coverage. The available record proves only functional and
in-process behavior. No claim of runtime PASS is made.

The package remains blocked for merge. This is not a false positive: the QA plan marks
AC-006/AC-008 and BR-003/BR-005 as runtime-pending, and the QA final record explicitly
reports that TC-040/TC-047 and the complete mutation campaign were not executable.

## Exact evidence required for closure

1. Run a separate-process TC-040 campaign that kills or terminates workers at each
   generation-write, admission-unlink and guard-release boundary. Verify generation
   monotonicity, bump-before-unlink ordering, stale-writer rejection before rename, no
   replacement-lock removal, and no temp/guard leaks.
2. Run a separate-process TC-047 campaign across every journal phase, forward and reverse
   rename, parent-directory sync, projection publish and terminal-finalization boundary.
   Restart the real CLI from each durable state and verify the phase/path/generation matrix,
   append-only history and fail-closed `B`/`N`/malformed outcomes.
3. Execute the named security mutation ledger from the QA plan, including generation checks
   moved outside the guard, recovery unlink ordering, online guard reclaim, stale candidate
   reuse, unfenced forward/compensating rename, tuple omission, nested guards and generation
   reset/reuse. Record each killed mutant and any genuine equivalent mutant.
4. Add the directory-sync fix and a deterministic unlink/sync crash-boundary test for
   SEC-008, then repeat independent code review and QA.

## Approval / handoff

- Decision: **BLOCKED — Human approval gate**
- Next owner: Human Maintainer to decide the next evidence/fix route; no automatic Developer
  rework is dispatched from this security review.
- Security residuals carried forward: SEC-001 caller-declared actor identity and SEC-002
  local digest authenticity remain accepted/documented design residuals; SEC-003 availability
  cost of fail-closed locks remains accepted/documented.
- No push, PR, merge, Issue mutation or production change was performed.
