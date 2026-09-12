# SECURITY_REVIEW.md: Control-Plane State Integrity & Architecture Remediation

## Metadata

- Work Item ID: Issue #277
- Title: Control-Plane State Integrity & Architecture Remediation (Package 1)
- Owner: Security Reviewer (`security-review`)
- Date: 2026-09-12
- Status: Conditional Approval (Design Phase Gate)
- Target Branch: `feat/control-plane-state-integrity`
- Governing SDD: `docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md` (Round 2 Rework)
- Governing Requirements: `docs/records/requirements/2026-09-12-control-plane-state-integrity-discovery.md`

---

## Scope

- **Change under review:** Control-plane architectural design hardening task state machine, concurrency CAS verification, file locking, and status projection compilation.
- **Trust boundaries touched:**
  1. Actor authorization and role policy enforcement during state transitions.
  2. Local-first file concurrency (multi-process race conditions, lost updates, ABA lock risks).
  3. Task envelope cryptographic state hashing (RFC 8785 JCS SHA-256 integrity vs authenticity).
  4. Filesystem crash durability and atomic write operations (`wx` temp files, `fsync`, directory sync).
  5. Shard archival lifecycle and status projection integrity.

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
- **Planned Control:** `scripts/lib/task-state-machine.mjs` will enforce actor authorization dynamically against workflow policies (`transition.actors`). Actor strings will be canonicalized to lowercase kebab-case against `ROLE_REGISTRY`. Unauthorized transitions will abort fail-closed with `UNAUTHORIZED_ACTOR`, leaving state untouched.
- **Residual Risk (Accepted & Documented):** Actor policy validation operates on caller-declared role identity without process authentication. Local callers can pass `--actor qa-agent`. Cryptographic agent signatures (e.g. Ed25519 payload signing) are out of scope for Package 1.

### 2. Concurrency Race Conditions, Lost Updates & Lock Hijacking
- **Threat:** Two concurrent processes reading state simultaneously and interleaving mutations, or ABA lock deletion during stale lock recovery.
- **Planned Control:** ADR-0027 specifies per-shard file locks containing `{pid, nonce, created_at}` with compare-before-delete logic, paired with disk re-reading under lock. CAS digest verification will be strictly mandatory on transition and resume (`MISSING_EXPECTED_DIGEST` if omitted; `CAS_CONFLICT` if mismatched).
- **Verdict:** True atomic CAS under nonce-protected lock will guarantee zero lost updates.

### 3. State Tampering vs State Integrity (Integrity without Authenticity)
- **Threat:** Accidental, stale, or concurrent disk modifications; manual tampering with task state history or sequence numbers.
- **Planned Control:** ADR-0028 specifies `digestTaskEnvelope(envelope)` which excludes top-level `state_digest` and computes canonical RFC 8785 JCS SHA-256. `validateEnvelopeSchema` will enforce `data.state_digest === digestTaskEnvelope(data)`.
- **Security Scope Clarification:** SHA-256 provides deterministic **state integrity and accidental corruption detection**, not **malicious tamper authentication** (an attacker with local filesystem write access can recompute the hash). Full authentication requires HMAC or digital signatures (deferred).

### 4. Mid-Write Corruption & Lock Abandonment
- **Threat:** System crash or power loss mid-write leaving truncated JSON, or abandoned locks blocking progress.
- **Planned Control:** POSIX atomic writing with `wx` temp files, temp cleanup on failure, `fsyncSync` data flush, atomic rename, and directory sync. Nonce-based stale lock recovery will safely reclaim locks older than 30s with dead PIDs without ABA risks.

---

## Findings

| ID | Severity | Description | Fix-Before-Merge? | Status | Evidence |
|---|---|---|---|---|---|
| SEC-001 | Medium | Caller-declared actor parameter is not cryptographically signed. | No | Documented / Accepted | SDD Non-goals; scoped as transition policy validation; cryptographic identity deferred. |
| SEC-002 | Medium | SHA-256 provides integrity against accidental mutation, not cryptographic authenticity against malicious local attackers. | No | Documented / Clarified | SDD Component 2; integrity verification enforced; authentication deferred. |

---

## Assumptions

- Operating environment is POSIX-compliant filesystem supporting atomic directory rename, `wx` flags, and `fsync`.
- Local agents operate within designated workspace boundaries.

---

## Conditional Approval / Verdict

- **Reviewer:** Security Reviewer (`security-review`)
- **Decision:** **Conditional Approval (Design Gate Passed)**
- **Conditions for Final Code Merge:**
  1. Verify implementation of `digestTaskEnvelope` excludes `state_digest` cleanly without modifying caller objects.
  2. Verify lock acquisition writes `{pid, nonce, created_at}` and uses compare-before-delete on release and stale cleanup.
  3. Verify temp files are unlinked in atomic writer catch blocks.
