# Targeted Security Re-review — Issue #133 Runtime Matrix

## Metadata

- Work Item: GitHub Issue #133
- Role: Independent Defensive Security Reviewer
- Date: 2026-08-01
- Verified commit: `456842077246cb077ee3748d4448e0fec89a651c`
- Prior reviewed runtime-matrix commit: `c4cd0f42a4b4dd5f71570a7ff27b09beb82e80e9`
- Verdict: **PASS for the runtime-matrix security gate; Human review remains required**

## Scope and authority boundary

This targeted re-review covers only the Node 22 Linux/Windows and Python 3.12 JCS runtime-matrix workflow, independent Python verifier, checkout byte-normalization attributes, and their tests. It verifies least privilege, pull-request checkout trust, Action/dependency provenance, bounded resource use, path containment, raw-byte digest integrity, and safe deterministic failures.

This PASS does not authorize QA acceptance, hosted activation, CAS/writer behavior, consumer migration, authority switch, rollback activation, release, or Go.

## Prior finding closure

| Prior finding | Result | Evidence |
|---|---|---|
| Mutable Action tags | **Closed** | Both checkout steps and setup-node/setup-python use full immutable SHAs from the official `actions` organization, with release comments and regression assertions for the exact pins. |
| Checkout credential exposure to PR-controlled tests | **Closed** | Both checkout steps set `persist-credentials: false`; workflow permissions remain only `contents: read`; no secret context is referenced. |
| Runtime dependency installation concern | **Closed / correctly classified** | `npm ci --ignore-scripts --no-audit --no-fund` hydrates the exact committed lockfile graph required by Node tests. It adds no dependency, changes no manifest/lockfile, disables package lifecycle scripts, and suppresses audit/funding network calls. This is bounded CI dependency hydration, not a new shipped runtime dependency. Python remains standard-library-only with no package install. |
| Uncontained fixture paths | **Closed** | Manifest paths reject POSIX/Windows absolute paths and traversal, resolve under the fixture root, reject symlink components, and require a regular final file. Tests cover traversal, absolute substitution, and symlink substitution. |
| Unbounded pre-read inputs | **Closed** | Manifest and fixture limits are checked from metadata before opening and rechecked by reading at most `limit + 1`; manifest limit is 65,536 bytes and fixture limit is 98,304 bytes. |
| Unsafe/non-deterministic failures | **Closed** | Operational/path/data failures map to stable verifier codes and CLI exit 65 without rejected values, absolute paths, or exception causes in output. |

No Critical, High, Medium, Low, or composed security finding remains in this reviewed runtime-matrix increment.

## Defensive-control assessment

| Control | Result | Evidence |
|---|---|---|
| Trigger and checkout trust boundary | PASS | Uses `pull_request`, never `pull_request_target`; PR content executes only with read-only contents permission, no persisted Git credential, and no secret reference. |
| Workflow least privilege | PASS | Top-level permissions are exactly `contents: read`; no write permission, environment credential, App token, or mutation step exists. |
| Script-injection resistance | PASS | No event payload, PR title/body, branch, matrix-supplied shell fragment, or secret is interpolated into a `run` command. Commands are fixed literals. |
| Action provenance | PASS | Official checkout/setup actions are full-SHA pinned consistently across both jobs. |
| Node dependency hydration | PASS | Lockfile-only `npm ci` with scripts/audit/fund disabled; job timeout is 15 minutes; no dependency files changed. |
| Python dependency boundary | PASS | Verifier and tests use Python standard library only; workflow performs no pip/package installation. |
| Resource bounds | PASS | Job timeouts are 15 minutes for Node and 5 minutes for Python; verifier bounds manifest, fixture, canonical bytes, integer domain, and container depth. Existing Node loader resource controls remain covered by focused/full tests. |
| Fixture path safety | PASS | POSIX/Windows absolute and traversal forms, symlink components/final symlink, non-regular files, missing paths, and containment failures are rejected with stable codes. |
| Raw-byte integrity | PASS | SHA-256 is checked before JSON parsing/canonicalization for positive and negative vectors; CRLF and negative-vector substitution tests fail with `INPUT_DIGEST_MISMATCH`; `.gitattributes` pins fixture text to LF on every runner. |
| Artifact and log safety | PASS | No artifact upload/download; success output lists only fixed vector IDs; failure output is one stable code and does not disclose paths, fixture contents, parser causes, tokens, or PII. |

## Project security checklist

| Item | Status | Evidence / N/A reason |
|---|---|---|
| Hardcoded secret or insecure fallback | PASS | No secret or credential value was added. |
| `DEBUG = True` in production | N/A — no Django settings | Scope is CI YAML and local Node/Python verification. |
| Raw SQL / ORM bypass | N/A — no database surface | No SQL or ORM code is present. |
| CORS wildcard | N/A — no HTTP surface | No endpoint or browser application is introduced. |
| DRF authentication/permissions | N/A — no DRF endpoint | No Django/DRF code is present. |
| Sensitive data in logs or URLs | PASS | Workflow references no secrets; verifier emits fixed IDs or stable error codes only. |
| Auth-sensitive endpoint throttling | N/A — no auth endpoint | No authentication endpoint exists in scope. |

## Verification performed

| Check | Result |
|---|---|
| Exact commit/diff inventory | PASS — `456842077246cb077ee3748d4448e0fec89a651c` reviewed against `c4cd0f42a4b4dd5f71570a7ff27b09beb82e80e9` |
| Python verifier unit suite | PASS — 7/7 |
| Independent fixed-vector verifier | PASS — 7/7 vectors |
| Focused workflow + status-loader tests | PASS — 29/29 |
| Full Node test suite | PASS — 346/346 |
| `npm run validate:contracts` | PASS |
| `npm run validate:project-state` | PASS |
| `git diff --check c4cd0f4..4568420` | PASS |
| Dependency manifest/lockfile diff | PASS — no changes |
| Secret/write-permission/install/log scan | PASS |
| `npm run validate:review-gate` | N/A for this security artifact — it reports the absence of a QA code-review record in `HEAD~1..HEAD`; this targeted Security role was not authorized to create or modify QA records |

## Assumptions, limitations, and next action

- Local execution was on Node 22/Python 3 for macOS. This review validates workflow configuration and local behavior; hosted Ubuntu/Windows run evidence remains a separate execution gate.
- Full-SHA pinning establishes immutability. Hosted provenance verification and future pin updates remain normal dependency-maintenance responsibilities.
- No security exception is accepted.
- Next action: Human review of this exact-SHA security evidence; hosted matrix execution and QA remain separate gates.

## Completion check

| Item | Status | Notes |
|---|---|---|
| Scope match | PASS | Runtime-matrix remediation and all prior findings re-reviewed. |
| Source grounding | PASS | Exact diff, workflow, verifier, tests, lockfile boundary, and local command evidence used. |
| Artifact complete | PASS | Canonical targeted security review record. |
| Security quality gate | PASS | Prior findings closed; no remaining security finding in scope. |
| No unsafe action | PASS | No implementation/workflow/test/state/GitHub/QA/activation/Go change made. |
| Minimal change | PASS | Only this review record is added. |
| Next owner | Human Maintainer | Human review and hosted evidence remain required. |
