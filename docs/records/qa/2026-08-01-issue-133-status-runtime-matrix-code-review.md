# Issue #133 Runtime Matrix — Targeted Code Re-review

## Review Context

| Item | Detail |
|---|---|
| Work Item | GitHub Issue #133 |
| Reviewer Role | Independent Code Reviewer; did not implement the change |
| Reviewed Commit | `456842077246cb077ee3748d4448e0fec89a651c` |
| Reviewed Parent | `c4cd0f42a4b4dd5f71570a7ff27b09beb82e80e9` |
| Scope | `.gitattributes`, status runtime workflow, Python JCS verifier/tests, workflow structural test, and referenced JCS fixtures only |
| Skills | `code-review-gate`; supporting `test-quality-discipline`, targeted `security-review`, and `verification-before-completion` |
| Verdict | **PASS — targeted runtime-matrix gate** |
| Next Owner | Independent Security implementation Reviewer, then QA Agent |

## Decision

The prior raw-fixture integrity finding is closed. The verifier now checks each selected fixture's raw SHA-256 against manifest `inputSha256` before JSON parsing or canonicalization. Checkout attributes pin LF for the manifest and complete `jcs-*.json` corpus, while Python independently computes restricted-domain canonical bytes and SHA-256 rather than hashing manifest-provided canonical bytes.

No Critical, Major, Minor, or Question finding remains in the reviewed runtime-matrix scope.

## Finding Closure and Review Results

| Area | Result | Evidence |
|---|---|---|
| CRLF alteration | **CLOSED** | Independent LF-to-CRLF mutation returned only `INPUT_DIGEST_MISMATCH` on stderr and exit 65 before parsing. |
| Negative-vector substitution | **CLOSED** | Replacing `jcs-negative-zero.json` with the fraction fixture returned `INPUT_DIGEST_MISMATCH` and exit 65 before parsing. |
| LF checkout | **PASS** | `.gitattributes` applies `text eol=lf` to `manifest.json` and all `jcs-*.json`; `git check-attr` and structural tests confirm the scope. |
| Independent JCS | **PASS** | Python stdlib implementation validates the restricted JSON domain, removes only top-level `recordDigest`, sorts evidence by UTF-8 bytes and keys by UTF-16 units, serializes independently, and matches all three positive bytes/digests plus four negative vectors. |
| Path and symlink containment | **PASS** | Empty, parent, POSIX/Windows absolute, unresolved, non-regular, and symlink-component paths fail with stable codes; resolved fixtures must remain beneath the fixture root. |
| Size before read | **PASS** | Manifest and fixture limits are checked from `lstat` before `open`; an independent patched-`open` oversized probe returned `FIXTURE_SIZE_LIMIT` without attempting a read. |
| Stable errors | **PASS** | CLI emits code-only stderr and exit 65 for controlled data failures; raw values and paths are not echoed. |
| Workflow security | **PASS** | Pull-request-only trigger, top-level `contents: read`, disabled checkout credential persistence, no secret references, and bounded 15/5-minute jobs. |
| Action/runtime matrix | **PASS** | Checkout, setup-node, and setup-python use full 40-character commit pins; Node 22 and Python 3.12 run on Ubuntu and Windows with stable job names. |
| Windows compatibility | **PASS** | Commands use cross-platform `python`, `node`, and npm invocations; path validation handles both POSIX and Windows path semantics; fixture LF is repository-enforced. |
| Dependency hydration | **PASS** | `npm ci --ignore-scripts --no-audit --no-fund` succeeded from the committed lockfile. It installs the existing six locked packages, runs no lifecycle scripts, performs no audit/funding network side tasks, and adds no Python dependency installation. |
| Structural tests | **PASS** | Node tests parse the workflow and assert permissions, OS matrices, timeouts, exact action pins, disabled credential persistence, safe npm command, absence of secret expressions, and LF attributes. |

## Verification Evidence

| Command / Probe | Result |
|---|---|
| `python3 -m unittest discover -s test -p 'test_status_jcs_reference.py' -v` | PASS — 7/7 |
| `python3 scripts/verify_status_jcs.py` | PASS — 7 vectors |
| Independent CRLF and negative-substitution temporary-root probes | PASS — both rejected pre-parse with exit 65 and `INPUT_DIGEST_MISMATCH` |
| Independent patched-`open` oversized fixture probe | PASS — `FIXTURE_SIZE_LIMIT`, no read attempted |
| `node --test test/status-loader.test.mjs test/status-runtime-matrix.test.mjs` | PASS — 29/29 |
| `npm ci --ignore-scripts --no-audit --no-fund` | PASS — six lockfile packages hydrated |
| `npm test` | PASS — 346/346 |
| Contract, project-state, dispatch-receipt, skill-parity, ADR, risk, skill-usage, metrics, and context validators | PASS |
| `npm run validate:review-gate` before this record | Expected FAIL because the implementation tip lacked its targeted record |
| Workflow YAML parse, `git check-attr`, `git diff --check c4cd0f42..4568420`, dependency-manifest diff, and git status | PASS; no dependency change and clean review start |

## Security Checklist

Hardcoded credentials, production settings, SQL/ORM, CORS, DRF authentication, sensitive logging/URLs, and auth throttling are N/A because this change contains a read-only CI workflow and local stdlib verifier only. The relevant supply-chain and workflow controls—full action pins, read-only token permissions, disabled credential persistence, no secret expressions, no lifecycle scripts, and no Python package install—pass.

## Residual Boundaries and Handoff

This record covers only runtime-matrix commit `456842077246cb077ee3748d4448e0fec89a651c`. Local macOS execution cannot substitute for hosted Ubuntu/Windows results; the workflow itself must run successfully on both hosts. This PASS does not authorize QA sign-off, hosted writer/CAS activation, authority switch, rollback, release, or Go. Security implementation review, independent QA, hosted matrix evidence, and Human approval remain required.

## Completion Check

| Item | Status | Notes |
|---|---|---|
| Scope Match | PASS | Only the requested runtime-matrix parent range and fixture usage reviewed |
| Source Grounding | PASS | Accepted Issue #133 JCS/runtime requirements and exact manifest vectors used |
| Artifact Complete | PASS | Exact SHA, prior closure, evidence, security boundary, and handoff recorded |
| Quality Gate | PASS | No blocking finding remains; post-commit review-gate check required |
| Test Quality | PASS | Exact raw-integrity, containment, size-order, structural, and canonical behavior asserted |
| No Unsafe Action | PASS | No code/workflow/test/state/GitHub/push/QA/activation/Go mutation |
| Minimal Change | PASS | Reviewer adds only this record |
| Next Action | REQUIRED | Run hosted matrix and route to Security implementation review, then QA and Human review |
