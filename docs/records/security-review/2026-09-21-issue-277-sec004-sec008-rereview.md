# Issue #277 Package 1 — SEC-004 / SEC-008 Security Re-review

## Metadata

- Work Item: Issue #277 — Control-plane state integrity, Package 1
- Reviewed candidate: `c89878d`
- Implementation under review: `ded9f81`
- Independent code review: `21d5862` — PASS
- QA evidence: `c89878d` — SEC-008 PASS; SEC-004 runtime limitations preserved
- Prior security review: `8c616f1` — SEC-004 BLOCKED; SEC-008 finding
- Reviewer: Security Reviewer (GPT-5.6 Luna)
- Date: 2026-09-21
- Risk: High — durable fencing, recovery and archive/compensation writes
- Status: **SEC-008 PASS; SEC-004 BLOCKED for runtime closure**

## Scope and source of truth

This re-review verifies the approved SEC-008 remediation and re-evaluates whether the
available evidence closes SEC-004. The SDD recovery protocol, ADR-0032, the security
blueprint, the QA plan and the prior security finding remain authoritative. The review
does not treat a deterministic in-process barrier as evidence of a separate-process
crash/restart campaign.

Sources reviewed:

- `docs/records/security-review/2026-09-21-issue-277-package1-sec004-runtime-review.md`
- `docs/records/qa/2026-09-21-issue-277-sec008-developer-handoff.md`
- `docs/records/qa/2026-09-21-issue-277-sec008-independent-code-review.md`
- `docs/records/qa/2026-09-21-issue-277-sec008-final-qa.md`
- `docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md`
- `docs/records/qa/2026-09-12-issue-277-test-plan.md`
- `scripts/lib/fenced-commit.mjs`
- `scripts/lib/task-state-machine.mjs`
- `test/control-plane-state-integrity.test.mjs`

## Security scan checklist

| Item | Status | Evidence / scope |
|---|---|---|
| Hardcoded secret / insecure fallback | Pass | No secret or credential path was added by `ded9f81`; touched-file review and prior blueprint scan remain clean. |
| `DEBUG = True` in production settings | N/A | Node.js local CLI/scripts; no production settings surface. |
| Raw SQL / ORM bypass | N/A | No SQL or ORM layer. |
| CORS allowlist | N/A | No HTTP endpoint. |
| DRF permission/authentication classes | N/A | Non-Django repository. |
| Sensitive data in logs or URLs | Pass | Reviewed errors expose operation diagnostics, IDs, generations and lock metadata; no credentials or PII observed. |
| Rate limiting on auth endpoints | N/A | No authentication endpoint. |

## SEC-008 verification

**Verdict: PASS at the required deterministic implementation and QA gate.**

`syncDirectorySync()` in `scripts/lib/fenced-commit.mjs:20-31` opens the requested
directory, calls `fsyncSync()` and closes the descriptor in a `finally` block. The
existing atomic replacement path reuses this helper at line 84, preserving its prior
durability behavior.

`unlockTask()` in `scripts/lib/task-state-machine.mjs:186-200` now has the required
recovery ordering:

1. acquire the non-reclaimable commit guard;
2. re-read and validate the current admission lock;
3. persist generation `g + 1` through `incrementGeneration()`; that atomic write syncs
   the fencing directory;
4. unlink the nonce-validated admission lock;
5. sync `path.dirname(target)`, the admission-lock parent directory;
6. release the commit guard in `finally`.

The injected `EIO` test at
`test/control-plane-state-integrity.test.mjs:67-91` exercises the post-unlink directory
sync boundary. It verifies that the error is returned, generation `2` remains durable,
the lock is absent, and the commit guard is cleaned up. This is the intended fail-closed
result for a sync failure after the unlink.

The QA record independently reports both named load-bearing mutations killed:

- removing the `unlockTask()` directory-sync call;
- removing the shared directory `fsyncSync()`.

The independent code review re-derived the same ordering and reran the fault barrier.
No weakening was found in nonce validation, malformed-lock recovery, explicit quiescence,
non-reclaimable guards, generation monotonicity, fencing or cleanup.

SEC-008 is therefore closed at this gate. The result does not imply that a complete
automated mutation campaign was available; Stryker/mutmut remains absent from the
environment, so the named mutations are the evidence actually present.

## SEC-004 re-evaluation

### Controls that remain supported

The current candidate and QA evidence continue to support these controls at source and
deterministic in-process level:

- durable monotonic generation and generation-before-admission-unlink ordering;
- non-reclaimable `wx` commit guards with owner-nonce release;
- inside-guard generation, identity and digest checks for state writers;
- projection fencing and lock ordering;
- fenced archive and compensation forward/reverse paths;
- journal identity, digest, revision and phase/path/generation checks;
- CR-001 through CR-015 stale-writer, stale-journal, adoption, compensation and byte-
  identity barriers.

The latest focused run passed 19/19 control-plane cases, including SEC-008 and CR-001
through CR-015. The related state-machine/projection run passed 21/21 and the full suite
passed 786/786. Required contract, project-state, workflow-evidence, dispatch-receipt,
ADR and diff checks also passed. These are verification results, not a numeric acceptance
threshold.

### Runtime evidence still missing

**SEC-004 remains BLOCKED for runtime closure.** The repository and QA evidence still do
not provide the evidence required by TC-040 and TC-047:

1. There is no executable separate-process crash/restart campaign that kills or terminates
   workers at the generation-write, admission-unlink, guard-release, archive rename,
   compensation rename, projection publish and journal-finalization boundaries, then
   restarts the real CLI and verifies the durable phase/path/generation matrix.
2. The environment has no installed or cached Stryker/mutmut runner, so there is no
   complete security mutation ledger covering every named fencing, recovery, journal and
   stale-candidate mutant.

The existing `CR-013` test uses restart-shaped state transitions inside one process; it
does not establish OS process-kill, filesystem restart or durable crash-boundary evidence.
The SEC-008 fault injection is intentionally narrower: it models an `EIO` at the sync
call and does not claim separate-process crash/restart closure.

### Verdict separation

| Finding / control | Verdict | Reason |
|---|---|---|
| SEC-008 admission-lock directory durability | **PASS** | Source ordering, post-unlink `EIO` fail-closed behavior, generation durability, guard cleanup and named mutations are evidenced and independently reviewed. |
| SEC-004 false-quiescence fencing — source/in-process controls | **PASS at deterministic level** | CR-001–CR-015 and fencing barriers preserve stale-writer rejection and zero-write invariants. |
| SEC-004 runtime closure | **BLOCKED** | TC-040/TC-047 separate-process crash/restart evidence and the complete mutation ledger are unavailable. |

No Critical or High new finding was identified in this re-review. SEC-004 is not marked
runtime PASS by inference from unit or in-process evidence.

## Required next evidence

To close SEC-004, run the previously required evidence route:

1. A separate-process TC-040 campaign across generation persistence, admission unlink and
   guard-release boundaries, verifying monotonic generations, stale-writer rejection,
   no replacement-lock removal and no temporary/guard leaks.
2. A separate-process TC-047 campaign across journal phases, forward/reverse rename,
   directory sync, projection publish and terminal finalization, restarting the real CLI
   from each durable state and checking the phase/path/generation matrix and append-only
   history.
3. The named security mutation ledger, recording each killed mutant and any genuine
   equivalent mutant. If the required tools remain unavailable, record the limitation and
   do not substitute test count for the missing evidence.

## Handoff and gate

- Skill Used: `security-review`
- Mode: Full security re-review
- Confidence: High for SEC-008 and deterministic controls; High that SEC-004 runtime closure is not demonstrated
- Assumptions: None material; verdicts follow the approved SDD/security/QA contracts
- Open Questions: Whether the environment can supply the separate-process crash/restart harness and complete mutation runner
- Quality Gate Status: **SEC-008 Passed; SEC-004 Blocked**
- Task State: `blocked` for Issue #277 package runtime closure
- Contract Version: Packet v1; durable workflow policy v1; envelope v2
- Rework Count: No further Developer rework is recommended from this review; the remaining item is evidence availability
- Next Recommended Agent: Human Maintainer, to decide the SEC-004 evidence route or accept/document the residual
- Stop Reason: `human_review_required` for the unresolved SEC-004 runtime evidence gap
- Decision: **Human merge gate required; do not merge while SEC-004 remains runtime-blocked.**
- No push, PR, merge, Issue mutation or production change was performed.
