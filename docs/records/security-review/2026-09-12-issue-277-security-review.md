# SECURITY_REVIEW.md: Control-Plane State Integrity & Architecture Remediation

## Metadata

- Work Item ID: Issue #277
- Title: Control-Plane State Integrity & Architecture Remediation (Package 1)
- Owner: Security Reviewer (`security-review`)
- Date: 2026-09-12
- Status: Conditional Approval (Design Phase Gate — Round 5 Rework, addressing maintainer review #5644601391 Blocking finding 4 and Additional correction 3; supersedes the Round 4 revision against #5644452415)
- Target Branch: `feat/control-plane-state-integrity`
- Governing SDD: `docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md` (Round 5 Rework, Draft)
- Governing Requirements: `docs/records/requirements/2026-09-12-control-plane-state-integrity-discovery.md`

---

## Scope

- **Change under review:** Control-plane architectural design hardening the task state machine, concurrency CAS verification, fail-closed shard locking with maintenance-only operator recovery, and status projection compilation. *Atomic stale-lock takeover was withdrawn in Round 4 and is no longer part of this change (ADR-0027).*
- **Trust boundaries touched:**
  1. Actor authorization and role policy enforcement during state transitions.
  2. Local-first file concurrency (multi-process race conditions, lost updates, TOCTOU/ABA lock risks) at two levels: the per-shard lock at `docs/records/work-items/.locks/{task_id}.lock` and the repository-wide projection lock.
  6. The operator lock-recovery surface (`unlock`) as a privileged, destructive maintenance boundary distinct from the engine's ordinary acquire/release paths.
  3. Task envelope cryptographic state hashing (RFC 8785 JCS SHA-256 integrity vs authenticity).
  4. Filesystem crash durability and atomic write operations (`wx` temp files, temp cleanup, `fsync`, directory sync).
  5. Shard archival lifecycle, exception rollback, and preflight drift reconciliation.

- **Scope narrowed during Round 5 (ADR-0031).** The durable envelope's `workflow_id` is reduced to
  `bug-fix` for Package 1. Only `bug-fix` shards reach the hardened control plane; the other four
  workflow types have no durable shard and hit the fail-closed unknown-`workflow_id` path. This shrinks
  the reviewed attack surface to the two live shards and their successors, and defers the other
  vocabularies to a later package under their own review.

---

## Scan Checklist

| Item | Status | Notes | Evidence |
|---|---|---|---|
| Hardcoded secret / insecure env fallback | Pass | No credentials, API tokens, or secrets involved in state machine control plane. | Clean repository scan across all touched files. |
| `DEBUG = True` in production settings | Pass | N/A (Node.js ESM architecture). | N/A |
| Raw SQL / ORM bypass | Pass | N/A (Local-first, Git-native JSON/Markdown storage; no SQL engine). | N/A |
| CORS allowlist (no wildcard) | Pass | N/A (Local CLI and script execution; no HTTP endpoint). | N/A |
| DRF `permission_classes` / `authentication_classes` present | Pass | N/A (Non-Django architecture). | N/A |
| Sensitive data in logs or URLs | Pass | Error objects emit error codes, task IDs, SHA-256 digests, and lock holder `pid`/`nonce`/`created_at`; no PII or sensitive system data leaked. | SDD Components 4 and 9 (reject codes and lock diagnostics). |
| Rate limiting on auth-sensitive endpoints | N/A | Lockfiles provide mutual exclusion against race conditions, not rate limiting. | Architecture review. |

---

## Threat Modeling & Security Analysis

### 1. Actor Authorization & Role Policy Boundary
- **Threat:** Rogue agents or compromised subagents attempting to bypass workflow stages (e.g. Developer self-certifying QA verification `verifying -> handoff`, or skipping human approval gates).
- **Planned Control:** `scripts/lib/task-state-machine.mjs` will enforce actor authorization strictly against `TRANSITION_MATRIX.actors`. Actor strings will be canonicalized to lowercase kebab-case against `ROLE_REGISTRY`. Unauthorized transitions will abort fail-closed with `UNAUTHORIZED_ACTOR`, leaving state untouched.
- **Residual Risk (Accepted & Documented):** Actor policy validation operates on caller-declared role identity without process authentication. Local callers can pass `--actor qa-agent`. Cryptographic agent signatures (e.g. Ed25519 payload signing) are out of scope for Package 1.

### 2. Concurrency, Lost Updates & Lock Identity
- **Threat:** Two concurrent processes interleaving mutations on one shard; two reclaimers racing over a stale lock such that one removes a replacement owner's live lock (TOCTOU/ABA); and, separately, a slow projection compiler overwriting a newer post-archive `PROJECT_STATUS.md` with its own atomically-complete but stale content.
- **Round 3 control withdrawn.** The previous review accepted an atomic-rename takeover and concluded "true atomic CAS under atomic-takeover lock will guarantee zero lost updates." **That verdict is withdrawn.** Maintainer review #5644452415 demonstrated a valid interleaving in which the second reclaimer's `renameSync` succeeds by moving the *replacement* lock, and no `fs`-level primitive available here makes removal conditional on the lock that was observed. The guarantee was unsupported as written.
- **Revised control (ADR-0027, amended Round 5).** The **engine** never removes a lock it does not own: no automatic reclaim code path exists, so the property "a live lock is never removed by another *engine* process" holds by construction. That is the whole of what fail-closed acquisition buys.
- **Race-safety claim for `unlock` — withdrawn (Round 5 Blocker 4).** Round 4 asserted that `unlock` "cannot remove a replacement lock" because it re-reads under "its own `wx` sentinel". **My analysis does not support that claim and it is withdrawn, not softened.** Two independent defects: (a) the sentinel was never given a pathname and no acquire or release path was ever required to honour it, so it constrains nothing; (b) even with the nonce compared correctly, read-nonce-then-unlink is a TOCTOU — a holder may release and a new holder acquire between the comparison and the `unlink`, and `unlink` is unconditional on the bytes observed. `unlock` **is** a reclaim path, and it is not race-safe. What replaces the claim: *`unlock` is a maintenance-only operation requiring explicit operator quiescence (`--quiesced`); nonce verification is retained as an operator-mistake filter, not a safety property.*
- **Classification predicate — the exposure is in the predicate itself, not only in the unlink window.** The Round 4 predicate classified a lock abandoned when it was older than 30 s **or** its PID was dead, which routed a **live, slow holder** into a destructive recovery path on age alone. That is a distinct defect from the TOCTOU and is fixed separately: abandonment is now classified by `ESRCH` only, and age becomes a diagnostic tier (`LOCK_ACQUISITION_TIMEOUT` carrying `LOCK_HELD_LONG` and holder details). The asymmetry is conservative — a live PID is not proof the original holder lives (PID reuse), but treating "live PID" as "not abandoned" can only withhold recovery, never authorize a wrong removal, so it cannot introduce a new integrity case. The residual cost is availability, recorded under SEC-003.
- **Why maintenance-only `unlock` is an acceptable residual risk.** The CAS check is **unconditional and lock-independent**: step 5 of `mutateTaskStateOnDisk` (SDD Component 9) compares `expected_digest` against the freshly-read `state_digest` inside the critical section regardless of how the lock was obtained. A wrong quiescence judgement therefore degrades to a detected `CAS_CONFLICT` (or `DIGEST_INTEGRITY_MISMATCH`) in the process whose lock was removed — a loud, rejected mutation — not a silent lost update. `unlock` can cost availability and an aborted transition; it cannot silently corrupt a shard. Had CAS been conditional on lock provenance, this route would not have been available and SEC-004 would rate High-unmitigated.
- **Rejected route (recorded).** The alternative permitted by Blocker 4 was a lock-management sentinel honoured by every `acquire`, `release` and `unlock` path, with an interleaving test forcing replacement between check and unlink. Rejected because the sentinel has the identical abandonment problem as the lock it protects (a SIGKILL between sentinel acquire and release wedges the recovery path itself, with no non-recursive recovery command), it taxes every ordinary transition with a second mandatory `wx` round-trip to protect a rare manual operation, and it enlarges the concurrency implementation surface at precisely the point Round 4 proved `fs`-interleaving reasoning to be error-prone. Removing the claim is sounder than narrowing the window.
- **Revised control (ADR-0030).** Writer atomicity does not serialize read-compile-write, so `PROJECT_STATUS.md` gets its own mutation lock; active shards are recompiled only after it is held; the total lock order is shard lock -> projection lock and may not be inverted.
- **Verdict:** **Conditional, not asserted.** Zero lost updates is a claim to be *demonstrated*, not granted at design time. It is accepted only on the evidence named in the conditions below — the seven-case closing set **TC-012, TC-014, TC-014b, TC-014c, TC-026, TC-027 and TC-028**, stated identically in the SEC-004 Evidence column and in the closing-set paragraph under the verdict. TC-014c is part of the set, not an addition to it: the abandonment predicate was a component of the Blocker 4 exposure (SEC-006), so a set that omits it would close SEC-004 while the predicate defect remained undemonstrated. Until those pass, this review records no availability or integrity guarantee for concurrent mutation. No race-safety property whatsoever is claimed for `unlock`.

### 3. State Tampering vs State Integrity (Integrity without Authenticity)
- **Threat:** Accidental, stale, or concurrent disk modifications; manual tampering with task state history or sequence numbers.
- **Planned Control:** ADR-0028 specifies `digestTaskEnvelope(envelope)` which excludes top-level `state_digest` and computes canonical RFC 8785 JCS SHA-256. `validateEnvelopeSchema` will enforce `data.state_digest === digestTaskEnvelope(data)` on load, transition, and resume.
- **Security Scope Clarification:** SHA-256 provides deterministic **state integrity and accidental corruption detection**, not **malicious tamper authentication** (an attacker with local filesystem write access can recompute the hash). Full authentication requires HMAC or digital signatures (deferred).

### 4. Mid-Write Corruption & Lock Abandonment
- **Threat:** System crash or power loss mid-write leaving truncated JSON, or abandoned locks blocking progress indefinitely.
- **Planned Control:** POSIX atomic writing with `wx` temp files, temp cleanup in catch blocks, `fsyncSync` data flush, atomic rename, and directory sync. Abandoned locks are **never reclaimed automatically**: they surface as a loud refusal (`LOCK_ABANDONED`, dead PID only) naming a recovery command. Removal is exclusively an operator act via maintenance-only `unlock --quiesced`, which is an explicit, non-race-safe reclaim path and is documented as such rather than claimed safe.

---

## Findings

| ID | Severity | Description | Fix-Before-Merge? | Status | Evidence |
|---|---|---|---|---|---|
| SEC-001 | Medium | Caller-declared actor parameter is not cryptographically signed. | No | Documented / Accepted | SDD NG-001; scoped as transition policy validation; cryptographic identity deferred. |
| SEC-002 | Medium | SHA-256 provides integrity against accidental mutation, not cryptographic authenticity against malicious local attackers. | No | Documented / Clarified | SDD Component 3; integrity verification enforced; authentication deferred. |
| SEC-003 | Medium | Fail-closed locking converts a liveness risk into an availability risk: an abandoned shard lock wedges one work item, and an abandoned projection lock wedges every status update including CI, until an operator intervenes. **Widened by the Round 5 predicate change:** narrowing abandonment to dead-PID-only means fewer locks are auto-classified, so an old-but-live lock, and a lock whose writer died off-host while its PID number is coincidentally live locally, now wedge until an operator establishes quiescence and runs `unlock --quiesced` — a slower, more deliberate intervention than before. | No | Accepted / Documented | ADR-0027 (Round 5 amendment), ADR-0030, Requirement R-006. Accepted deliberately: this is availability traded for integrity. An automatic clear is the same unsound primitive Round 4 rejected, a wrong clear on the projection lock corrupts repository-wide state, and admitting a live slow holder to the recovery path was itself the Round 5 Blocker 4 exposure. Critical sections are short; every refusal names its recovery command and its holder. |
| SEC-004 | High | Round 3's asserted zero-lost-update guarantee was unsupported and has been withdrawn; Round 4's successor claim that nonce-verified `unlock` cannot remove a replacement lock is **also withdrawn** (TOCTOU between nonce check and `unlink`; the `wx` sentinel was never specified). | **Yes — evidence required before merge** | Open | Maintainer reviews #5644452415 Blockers 1/4 and #5644601391 Blocking finding 4. Protocol now selected (maintenance-only `unlock --quiesced`, ADR-0027 Round 5 amendment); remains **Open** until the selected protocol is demonstrated by TC-012, TC-014, TC-014b, TC-014c, TC-026, TC-027, TC-028. |
| SEC-005 | Medium | A repairing `--check` would mutate the repository from inside a read-only governance gate and could mask the drift it exists to detect. | Yes | Design corrected | ADR-0029: detection is pure, repair is explicit; TC-028 asserts whole-tree byte equality. |
| SEC-006 | Medium | The Round 4 abandonment predicate (`age > 30 s` **or** dead PID) admitted a live, slow holder into a destructive operator-recovery path on age alone; the predicate, not merely the unlink window, was part of the exposure. | Yes | Design corrected | SDD Component 4 Acquisition; ADR-0027 Round 5 amendment (a). Abandonment is now dead-PID-only; age is a diagnostic tier. Evidence: TC-014c. |

---

## Assumptions

- Operating environment is POSIX-compliant filesystem supporting atomic directory rename, `wx` flags, and `fsync`.
- Local agents operate within designated workspace boundaries.

---

## Conditional Approval / Verdict

- **Reviewer:** Security Reviewer (`security-review`)
- **Decision:** **Conditional Approval (Design Gate Passed)**
- **Conditions for Final Code Merge:**
  1. Verify `digestTaskEnvelope` excludes `state_digest` without modifying the caller's object (TC-001).
  2. Verify lock acquisition writes `{pid, nonce, created_at}` and that **no automatic code path removes a lock the caller does not own** — the only two removal paths in the codebase are owner release (`parsed.nonce === myNonce`) and the operator `unlock` CLI; verify the abandoned lock is byte-identical after a refused acquisition (TC-014). *This condition no longer asserts that nonce verification makes removal safe; it asserts only that automatic reclaim does not exist.*
  3. Verify `unlock` refuses a mismatched nonce with `LOCK_NONCE_MISMATCH`, as an operator-mistake filter (TC-014).
  4. **Contract test, not a safety proof (TC-014b).** Force a replacement between `unlock`'s nonce read and its `unlink` and assert the **documented, expected** outcome: the replacement lock **is** removed, no error is raised by `unlock`, and the replacement owner's subsequent write is caught as `CAS_CONFLICT` (or `DIGEST_INTEGRITY_MISMATCH`) rather than silently lost. This case exists to pin the non-race-safe contract in place so a future change cannot quietly re-assert safety; a *passing* TC-014b is evidence the documentation is true, not evidence `unlock` is safe.
  5. **Predicate test (TC-014c).** A lock older than 30 s whose PID is live must yield `LOCK_ACQUISITION_TIMEOUT` carrying `LOCK_HELD_LONG` and holder diagnostics — **never** `LOCK_ABANDONED`; a lock with a dead PID must yield `LOCK_ABANDONED` at any age, including younger than 30 s; and `unlock` without `--quiesced` must refuse.
  6. Verify temp files are unlinked in the atomic writer's catch block (TC-017).
  7. Verify the barrier-synchronized two-process shard race yields exactly one success and one `CAS_CONFLICT`, with `sequence_number` exactly 2 (TC-012).
  8. Verify the archive-vs-projection interleaving leaves a projection matching filesystem reality, proving the compile happens after the projection lock is acquired (TC-026).
  9. Verify the total lock order is never inverted across the full suite, and that an abandoned projection lock is refused rather than cleared (TC-027).
  10. Verify whole-tree byte equality across `--check` and both pure projection functions (TC-028).
  11. Verify archival compensation, and that a failed compensation is reported rather than swallowed (TC-019).

**SEC-004 remains open until conditions 2–5 and 7–10 produce passing evidence.** Exact closing
set: **TC-014** (no automatic reclaim; byte-identical refused lock; nonce mismatch refused), **TC-014b**
(check/unlink interleaving pinned as documented contract, downstream `CAS_CONFLICT` observed),
**TC-014c** (dead-PID-only classification; `--quiesced` required), **TC-012** (barrier-synchronized
two-process shard race — exactly one success, one `CAS_CONFLICT`, `sequence_number` exactly 2; this is
the integrity backstop the `unlock` residual risk leans on), **TC-026**, **TC-027**, **TC-028**. QA owns
authoring these. This review grants a design gate only; it grants no concurrency guarantee, and
specifically none for `unlock`.
