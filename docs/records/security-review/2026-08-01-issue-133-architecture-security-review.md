# Security Review — Issue #133 Flat Immutable Peer Archive Design

## Metadata

- Work Item ID: GitHub Issue #133
- Work Item URL: https://github.com/chakrits/AI-Agent-Workflow/issues/133
- Title: Worktree-scoped status — flat immutable peer archive and status data policy
- Owner: Independent Security Reviewer
- Date: 2026-08-01
- Reviewed commit: `404b1ddf3381ed5b17b8ac2a15227a1a44ca4acc`
- Reviewed SDD digest: SHA-256 `a946dc56df8418ed5a682f6da54379eaa4384efc8b5d940d0bce4f1d2f61cf78`
- Decision: **PASS for Human architecture review**
- Boundary: This review does not approve implementation, `status:spec-ready`, authority switch, release, or Go.

## Scope and evidence

The review covered the flat immutable peer archive model and status data policy in `docs/records/sdd/2026-07-31-issue-133-cp1-status.md`, ADR-0017/ADR-0018 in `DECISIONS.md`, and the Issue #133 portions of `docs/records/implementation-plan/2026-07-31-progressive-context-and-worktree-status.md`. The current schema and `scripts/lib/status-loader.mjs` were inspected only as migration evidence; they are superseded and are not evidence that the reviewed controls exist.

Trust boundaries include untrusted YAML bytes, filesystem paths and Git worktrees, active/archive authority transitions, repository review controls, evidence references, generated projection metadata, retained public workflow metadata, and optional canonicalization dependencies.

## Project security scan checklist

| Item | Status | Notes | Evidence |
|---|---|---|---|
| Hardcoded secret / insecure env fallback | N/A — design-only | The commit adds no executable settings or credential value. The data policy prohibits credentials, tokens, cookies, private keys, and authorization headers. | SDD lines 104-114; exact commit changes only the SDD and ADR log. |
| `DEBUG = True` in production settings | N/A — no Django settings surface | No application runtime or production settings are changed. | Commit `404b1dd` file list. |
| Raw SQL / ORM bypass | N/A — no database surface | The design uses repository files and Git, not SQL or Django ORM. | SDD lines 31-45 and 124-160. |
| CORS allowlist (no wildcard) | N/A — no HTTP application surface | No web endpoint or browser-origin policy is introduced. | Commit `404b1dd` file list. |
| DRF permissions / authentication | N/A — no DRF endpoint | The proposed transition is a repository/Git operation, not an API endpoint. | SDD lines 133-148 and 205-211. |
| Sensitive data in logs or URLs | Pass | URLs reject userinfo, query, fragment, non-default ports, IP literals, traversal and credential-like patterns; rejected raw values and URLs must not be logged. Status data excludes secrets, private/customer data, payloads, logs, and arbitrary evidence content. | SDD lines 104-114, 192, and NFR observability/security controls. |
| Rate limiting on auth-sensitive endpoints | N/A — no auth endpoint | No login, registration, reset, MFA, or comparable endpoint is introduced. | Commit `404b1dd` file list. |

## Threat review

| Area | Result | Security evidence and residual implementation obligation |
|---|---|---|
| Malicious YAML aliases, tags, expansion and cycles | Pass | Raw bytes are bounded before decode/parse; strict UTF-8 is required; aliases, anchors, merge keys, tags, directives, duplicate/non-string keys, multiple documents and cyclic node identity are rejected; graph/domain checks are iterative with depth/node limits. Parser options are explicitly only defense in depth. Adversarial boundary fixtures are mandatory. |
| Pre-parse and context exhaustion | Pass | Per-file, aggregate, file-count, canonical-preimage, normalized-output, projection and resident-memory limits are frozen. Default active mode must perform zero archive enumeration/read/parse. Limits fail the complete candidate before acceptance or projection. Peak-memory tests include a tolerance plus exact allocation counters. |
| Canonicalization and hash assumptions | Pass | The design narrows RFC 8785 to safe integers, defines digest exclusion, UTF-8 evidence ordering, UTF-16 object-key ordering, string/integer serialization, lowercase SHA-256, frozen positive/negative vectors, and a cross-runtime verifier. It correctly states that hashes prove connectivity, not authorship or protection from wholesale replacement without an external anchor. SHA-256 collision resistance is an accepted integrity assumption, not an authorization control. |
| Tampering, rollback, branching and races | Pass | Expected active/head and authoritative-set digests provide optimistic concurrency; branches, cycles, duplicate/disconnected peers, stale writers and path collisions fail closed. Exact predecessor bytes are retained and rollback restores them without rewriting archive peers. Whole-bundle replacement requires comparison with an independently retained expected digest. |
| Traversal, symlink and TOCTOU | Pass at design gate | Paths are fixed and repository-relative; unsafe evidence paths and symlinks are rejected; transitions require absent immutable paths and exact side-effect fixtures across Linux/macOS/Windows. Implementation review must verify containment after canonical path resolution, no-follow/open semantics where available, revalidation immediately before mutation/commit, and fail-closed behavior when a path or inode changes between inspection and use. |
| Unauthorized archive correction | Pass with Human governance decision | The loader intentionally proves consistency rather than authorship; Git review is the change-control boundary. Corrections require expected head/set digests and explicit confirmation after a stale retry; no auto-merge is allowed. Human must identify the authorized correction approver(s), protected default-branch mechanism, and controlled writer credentials before activation. Until then, no correction path or authority switch is authorized. |
| Evidence URLs, secrets and PII duplication | Pass | Canonical Issue URLs and allow-listed evidence references reject userinfo/query/fragment/token-bearing forms; mutable remote references cannot satisfy immutable-evidence gates without commit/digest. The schema is metadata-only, unknown keys fail, sensitive material is prohibited, and incident handling prevents recursive duplication through ordinary correction. Implementation tests must include percent-encoding/case variants, Unicode/confusable inputs, traversal, credential keywords, and sensitive fixtures without echoing rejected values. |
| Retention, deletion and incident response | Pass with Human decision | Routine archive deletion/GC is forbidden. Limit exhaustion stops corrections for Human disposition. Sensitive-data contamination triggers distribution stop, credential rotation/revocation, out-of-bundle incident evidence, and Security Reviewer plus Human approval for purge/redaction and clone/remote coordination. The design accurately notes that purge invalidates digests and anchors. |
| Error and log disclosure | Pass | Deterministic error classes and path ordering avoid data-dependent ambiguity; all failures suppress projection and preserve the last accepted set. Logs may include digests, versions, commit and error codes but must never include rejected raw values, URLs, or secrets. Implementation review must ensure parser exception causes are sanitized before user-visible output. |
| JCS dependency and supply chain | Pass | No new dependency is required. Any JCS package must be exactly one separately reviewed, lockfile-pinned dependency with license, maintenance, transitive-risk and vector review. A direct implementation is constrained by frozen vectors and an independent Python reference verifier. |
| Cross-platform determinism | Pass | Node 22 on Linux/macOS/Windows is mandatory, with Python 3.12 independently verifying JCS vectors. Byte ordering avoids locale collation and normalization; exact bytes, digests, errors and filesystem side effects are manifest-controlled. Unsupported CI cells block specification readiness unless Human explicitly narrows supported hosts. |

## Findings

No Critical, High, Medium, or Low design findings were identified. The following are non-blocking constraints, not accepted exceptions:

| ID | Severity | Description | Required disposition | Status |
|---|---|---|---|---|
| SEC-133-01 | Informational | Integrity validation does not establish archive-correction authorship. | Before activation, Human records authorized approver(s), protected-branch/review enforcement, and controlled writer identity/credentials. Security reviews the concrete mechanism. | Open Human activation decision; no implementation authorization. |
| SEC-133-02 | Informational | Symlink rejection alone does not prove a TOCTOU-safe implementation. | Implementation must use platform-appropriate containment/no-follow/revalidation controls and pass race/path-collision/symlink fixtures on all supported Node runtimes. | Open implementation verification. |
| SEC-133-03 | Informational | The current schema/loader accept behavior forbidden by the reworked design, including conversion-first YAML parsing, locale collation, reconstructed predecessors, unbounded inputs and verbose raw parser errors. | Treat current code only as migration evidence; replace through TDD and verify the complete manifest before any authority switch. | Known superseded implementation; not a finding against this design commit. |

The informational items do not compose into a higher-severity path because the design keeps the new store read-only during shadow, requires Human approval before implementation/activation, fails stale and malformed transitions closed, and retains Git review as the authorship boundary.

## Required controls for implementation and activation review

1. Preserve every frozen raw/parser/domain/canonical/output/memory limit and exact error precedence; no parser conversion before node-graph inspection.
2. Preserve default active-mode zero archive I/O and identity-scoped archive loading by default.
3. Implement filesystem containment, symlink/no-follow defenses, pre-mutation revalidation, expected digest concurrency and no-side-effect failures; do not claim filesystem atomicity merely from a later atomic Git commit.
4. Keep rejected raw YAML, URLs, evidence values, parser exception detail, tokens and PII out of stdout/stderr/logs.
5. Do not add a JCS package in the implementation change unless a separate supply-chain review approves the exact lockfile-resolved dependency graph.
6. Run the versioned fixture manifest on Node 22 Linux/macOS/Windows and the independent Python 3.12 JCS verifier, including aliases/tags/cycles, limit+1, URL encodings, Unicode edge cases, branches/races/symlinks, rollback, purge-stop behavior and deterministic errors.
7. Security must review the concrete implementation diff and default-branch writer/credential configuration before activation. Human approval remains mandatory for architecture, implementation resumption, authority switch, rollback, retention exception, incident purge and release.

## Residual Human decisions

- Approve or reject amended ADR-0018's flat immutable peer model and frozen resource/JCS limits.
- Confirm the Node 22 Linux/macOS/Windows plus Python 3.12 support matrix, or explicitly narrow supported hosts before specification readiness.
- Approve repository-lifetime retention and the Security Reviewer + Human incident-only purge exception.
- Define authorized archive-correction approvers and the protected Git/default-branch enforcement that makes Git review an effective authorship boundary.
- Select the controlled default-branch trigger, least-privilege writer identity/credentials, external digest anchor, authority-switch procedure, and rollback owner.
- Decide disposition of migration inputs whose genuine predecessor preimage cannot be recovered; reconstruction or silent waiver remains forbidden.

## Decision and handoff

**PASS** — commit `404b1ddf3381ed5b17b8ac2a15227a1a44ca4acc` may advance to Human architecture review. This PASS accepts no security exception and does not authorize implementation, GitHub changes, `status:spec-ready`, authority switch, release, or Go.

- From Agent: Independent Security Reviewer
- To Agent: Human Maintainer / Architecture approver
- Change Type: Framework / Meta; security-sensitive design
- Risk Level: Medium
- Lifecycle Phase: `phase:design`
- Specification Readiness: Not ready; Human architecture decision and CP-1 evidence remain required
- Verification Performed: Exact-commit diff inspection; SDD/ADR/plan consistency review; current schema/loader inspected only as migration evidence; project Security Gate and checklist evaluated
- Acceptance Criteria Verification Status: Security design scope passed; implementation and activation criteria unverified
- Verified Commit SHA: `404b1ddf3381ed5b17b8ac2a15227a1a44ca4acc`
- Stop Reason: `human_review_required`
- Next Action: Human review
- Next Owner: Human Maintainer / Architecture approver

## Completion check

| Item | Status | Notes |
|---|---|---|
| Workflow / Agent | Pass | Independent Security Reviewer; Framework/Meta security design gate. |
| Skill Used | Pass | `security-review`; `git-workflow-and-versioning` for the scoped record commit. |
| Source Inputs | Pass | Required operating-model sources, Issue #133 SDD, ADR-0017/0018, implementation plan, exact diff, schema/loader migration evidence. |
| Artifact Complete | Pass | Canonical security-review record with checklist, threat review, severity, controls, assumptions and Human decisions. |
| Quality Gate | Passed | Security Gate passed for Human architecture review only. |
| Risks / Limitations | Pass | Authorship enforcement, TOCTOU implementation, runtime coverage, retention/purge, writer credentials and anchors remain explicit gates. |
| No Unsafe Action | Pass | No implementation, project-state, GitHub, push, approval, release, or Go action taken. |
| Minimal Change | Pass | Only this security-review record is added. |
| Next Step | Pass | Human architecture review; implementation remains paused. |
