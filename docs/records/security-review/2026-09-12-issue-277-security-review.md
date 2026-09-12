# SECURITY_REVIEW.md: Control-Plane State Integrity & Architecture Remediation

## Metadata

- Work Item ID: Issue #277
- Title: Control-Plane State Integrity & Architecture Remediation (Package 1)
- Owner: Security Reviewer (`security-review`)
- Date: 2026-09-12
- Status: Conditional Approval (Design Phase Gate — Round 4 Rework, addressing maintainer review #5644452415)
- Target Branch: `feat/control-plane-state-integrity`
- Governing SDD: `docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md` (Round 4 Rework, Draft)
- Governing Requirements: `docs/records/requirements/2026-09-12-control-plane-state-integrity-discovery.md`

---

## Scope

- **Change under review:** Control-plane architectural design hardening task state machine, concurrency CAS verification, atomic stale-lock takeover, and status projection compilation.
- **Trust boundaries touched:**
  1. Actor authorization and role policy enforcement during state transitions.
  2. Local-first file concurrency (multi-process race conditions, lost updates, TOCTOU/ABA lock risks) at two levels: the per-shard lock and the repository-wide projection lock.
  3. Task envelope cryptographic state hashing (RFC 8785 JCS SHA-256 integrity vs authenticity).
  4. Filesystem crash durability and atomic write operations (`wx` temp files, temp cleanup, `fsync`, directory sync).
  5. Shard archival lifecycle, exception rollback, and preflight drift reconciliation.

---

## Scan Checklist

| Item | Status | Notes | Evidence |
|---|---|---|---|
| Hardcoded secret / insecure env fallback | Pass | No credentials, API tokens, or secrets involved in state machine control plane. | Clean repository scan across all touched files. |
| `DEBUG = True` in production settings | Pass | N/A (Node.js ESM architecture). | N/A |
| Raw SQL / ORM bypass | Pass | N/A (Local-first, Git-native JSON/Markdown storage; no SQL engine). | N/A |
| CORS allowlist (no wildcard) | Pass | N/A (Local CLI and script execution; no HTTP endpoint). | N/A |
| DRF `permission_classes` / `authentication_classes` present | Pass | N/A (Non-Django architecture). | N/A |
| Sensitive data in logs or URLs | Pass | Error objects will emit error codes, task IDs, and SHA-256 digests; no PII or sensitive system data leaked. | SDD Structured Error Responses. |
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
- **Revised control (ADR-0027).** The engine never removes a lock it does not own. Staleness and dead PIDs are diagnostics: acquisition raises `LOCK_ABANDONED` and names a nonce-verified operator `unlock`. Under this design the property "a live lock never leaves the canonical path while its owner is active" holds by construction, because no reclaim code path exists.
- **Revised control (ADR-0030).** Writer atomicity does not serialize read-compile-write, so `PROJECT_STATUS.md` gets its own mutation lock; active shards are recompiled only after it is held; the total lock order is shard lock -> projection lock and may not be inverted.
- **Verdict:** **Conditional, not asserted.** Zero lost updates is a claim to be *demonstrated*, not granted at design time. It is accepted only on the evidence named in the conditions below — TC-012, TC-014, TC-026, TC-027 and TC-028. Until those pass, this review records no availability or integrity guarantee for concurrent mutation.

### 3. State Tampering vs State Integrity (Integrity without Authenticity)
- **Threat:** Accidental, stale, or concurrent disk modifications; manual tampering with task state history or sequence numbers.
- **Planned Control:** ADR-0028 specifies `digestTaskEnvelope(envelope)` which excludes top-level `state_digest` and computes canonical RFC 8785 JCS SHA-256. `validateEnvelopeSchema` will enforce `data.state_digest === digestTaskEnvelope(data)` on load, transition, and resume.
- **Security Scope Clarification:** SHA-256 provides deterministic **state integrity and accidental corruption detection**, not **malicious tamper authentication** (an attacker with local filesystem write access can recompute the hash). Full authentication requires HMAC or digital signatures (deferred).

### 4. Mid-Write Corruption & Lock Abandonment
- **Threat:** System crash or power loss mid-write leaving truncated JSON, or abandoned locks blocking progress indefinitely.
- **Planned Control:** POSIX atomic writing with `wx` temp files, temp cleanup in catch blocks, `fsyncSync` data flush, atomic rename, and directory sync. Abandoned locks are **not** reclaimed: they surface as a loud refusal with a named recovery command.

---

## Findings

| ID | Severity | Description | Fix-Before-Merge? | Status | Evidence |
|---|---|---|---|---|---|
| SEC-001 | Medium | Caller-declared actor parameter is not cryptographically signed. | No | Documented / Accepted | SDD Non-goals; scoped as transition policy validation; cryptographic identity deferred. |
| SEC-002 | Medium | SHA-256 provides integrity against accidental mutation, not cryptographic authenticity against malicious local attackers. | No | Documented / Clarified | SDD Component 3; integrity verification enforced; authentication deferred. |
| SEC-003 | Medium | Fail-closed locking converts a liveness risk into an availability risk: an abandoned shard lock wedges one work item, and an abandoned projection lock wedges every status update including CI, until an operator intervenes. | No | Accepted / Documented | ADR-0027, ADR-0030, Requirement R-006. Accepted deliberately: an automatic clear is the same unsound primitive that Round 4 rejected, and a wrong clear on the projection lock corrupts repository-wide state. Critical sections are short, and every refusal names its recovery command. |
| SEC-004 | High | Round 3's asserted zero-lost-update guarantee was unsupported and has been withdrawn. | **Yes — evidence required before merge** | Open | Maintainer review #5644452415 Blocker 1 and Blocker 4. Closes only on the concurrency evidence in the conditions below. |
| SEC-005 | Medium | A repairing `--check` would mutate the repository from inside a read-only governance gate and could mask the drift it exists to detect. | Yes | Design corrected | ADR-0029: detection is pure, repair is explicit; TC-028 asserts whole-tree byte equality. |

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
  2. Verify lock acquisition writes `{pid, nonce, created_at}` and that **no code path removes a lock the caller neither owns nor nonce-verified**; verify the abandoned lock is byte-identical after a refused acquisition (TC-014).
  3. Verify `unlock` refuses a stale nonce with `LOCK_NONCE_MISMATCH` (TC-014).
  4. Verify temp files are unlinked in the atomic writer's catch block (TC-017).
  5. Verify the barrier-synchronized two-process shard race yields exactly one success and one `CAS_CONFLICT`, with `sequence_number` exactly 2 (TC-012).
  6. Verify the archive-vs-projection interleaving leaves a projection matching filesystem reality, proving the compile happens after the projection lock is acquired (TC-026).
  7. Verify the total lock order is never inverted across the full suite, and that an abandoned projection lock is refused rather than cleared (TC-027).
  8. Verify whole-tree byte equality across `--check` and both pure projection functions (TC-028).
  9. Verify archival compensation, and that a failed compensation is reported rather than swallowed (TC-019).

**SEC-004 remains open until conditions 5–8 produce passing evidence.** This review grants a design gate
only; it grants no concurrency guarantee.
