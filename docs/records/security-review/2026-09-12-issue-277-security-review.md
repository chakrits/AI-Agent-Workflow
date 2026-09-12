# SECURITY_REVIEW.md: Control-Plane State Integrity & Architecture Remediation

## Metadata

- Work Item ID: Issue #277
- Title: Control-Plane State Integrity & Architecture Remediation (Package 1)
- Owner: Security Reviewer (`security-review`)
- Date: 2026-09-12
- Status: Approved
- Target Branch: `feat/control-plane-state-integrity`
- Governing SDD: `docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md`
- Governing Requirements: `docs/records/requirements/2026-09-12-control-plane-state-integrity-discovery.md`

---

## Scope

- **Change under review:** Control-plane architectural remediation hardening task state machine, concurrency CAS verification, file locking, and status projection compilation.
- **Trust boundaries touched:**
  1. Actor authorization and role policy enforcement during state transitions.
  2. Local-first file concurrency (multi-process race conditions, lost updates).
  3. Task envelope cryptographic state hashing (RFC 8785 JCS SHA-256).
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
| Sensitive data in logs or URLs | Pass | Error objects emit error codes, task IDs, and SHA-256 digests; no PII or sensitive system data leaked. | SDD §317–§326, Structured Error Responses. |
| Rate limiting on auth-sensitive endpoints | Pass | Per-shard mutual exclusion lock (`.lock` via `wx`) prevents rapid concurrent race conditions and brute-force disk writes. | SDD Component 3, §179–§195. |

---

## Threat Modeling & Security Analysis

### 1. Actor Authorization & Role Policy Boundary
- **Threat:** Rogue agents or compromised subagents attempting to bypass workflow stages (e.g. Developer self-certifying QA verification `verifying -> handoff`, or skipping human approval gates).
- **Control:** `scripts/lib/task-state-machine.mjs` enforces `TRANSITION_MATRIX[fromState].actors` on every mutation. All actor strings are canonicalized to kebab-case against `ROLE_REGISTRY`. Unauthorized transitions abort fail-closed with `UNAUTHORIZED_ACTOR`, leaving state untouched.
- **Residual Risk (Accepted & Documented):** Actor policy validation operates on caller-declared role identity. Local OS processes can supply `--actor qa-agent`. Cryptographic agent signatures (e.g. Ed25519 payload signing) are out of scope for Package 1 and deferred to future multi-agent identity infrastructure.

### 2. Concurrency Race Conditions & Lost Updates
- **Threat:** Two concurrent processes or subagents reading state simultaneously and interleaving mutations, resulting in silent state overwrites and corrupt history.
- **Control:** ADR-0027 implements per-shard mutual exclusion file locking (`.lock` via `openSync('wx')`) paired with disk re-reading under lock. CAS digest verification is strictly mandatory (`MISSING_EXPECTED_DIGEST` if omitted; `CAS_CONFLICT` if mismatched).
- **Verdict:** True atomic CAS guarantees zero lost updates.

### 3. State Tampering & History Truncation
- **Threat:** Malicious or faulty process editing task state directly, truncating history, or tampering with sequence numbers.
- **Control:** ADR-0028 unifies state hashing with canonical RFC 8785 JCS SHA-256 (`scripts/lib/status-jcs.mjs`). Any tampering invalidates subsequent CAS transitions and fails closed in `validateEnvelopeSchema`.

### 4. Mid-Write Corruption & Lock Stalling
- **Threat:** System crash or power interruption mid-write leaving half-written JSON or stranded `.lock` files blocking future transitions indefinitely.
- **Control:** POSIX atomic writing with `wx` temp files, `fsyncSync` data flush, atomic rename, and directory sync. Stale lock recovery detects `.lock` older than 30 seconds, checks PID liveness (`process.kill(pid, 0)`), and cleans up stranded locks.

---

## Findings

| ID | Severity | Description | Fix-Before-Merge? | Status | Evidence |
|---|---|---|---|---|---|
| SEC-001 | Medium | Caller-declared actor parameter is not cryptographically signed. | No | Documented / Accepted | SDD §381; scoped as transition policy validation; cryptographic process signing deferred. |
| SEC-002 | Low | Stale lock recovery PID check is local to single OS host. | No | Documented / Accepted | Git-native local worktree design; lockfiles are local to working tree. |

---

## Assumptions

- Operating environment is POSIX-compliant filesystem supporting atomic directory rename and `fsync`.
- Local agents act within their designated workspace boundaries.

---

## Open Questions

- None. All security gates and trust boundaries for Package 1 are fully defined and aligned.

---

## Risks

- If a developer manually edits `task-state.json` on disk, the SHA-256 digest will diverge, requiring an explicit `inspect` before any subsequent automated transition can succeed. This is an intended security feature.

---

## Approval / Review

- **Reviewer:** Security Reviewer (`security-reviewer`)
- **Decision:** **Approved**
- **Notes:** Control-plane state integrity architecture addresses all identified vulnerabilities (F-01, F-02, F-03, W1, F-10) with fail-closed mechanisms, per-shard mutual exclusion, mandatory cryptographic CAS, and POSIX crash durability.
