# Final Security Re-review — Issue #133 Manifest and Default-Ref CAS

## Metadata

- Work Item ID: GitHub Issue #133
- Work Item URL: https://github.com/chakrits/AI-Agent-Workflow/issues/133
- Role: Independent Security Reviewer
- Date: 2026-08-01
- Reviewed design commit: `d65706828bb782994f7dbf584cd6f573fb9a7f20`
- Reviewed architecture PASS record commit: `ddcf373d639b47461c9f10c7b19c09b28e9c3e93`
- Design SDD SHA-256: `f762c42e494cb9f5ddbe2f5e05aa3a8fb66c3d54b2930eb58b7dd56dd4f2acbf`
- Architecture record SHA-256: `75f204bee6745baf6d1beab4f5bd5bcbe0bffbb12b83c656df100ee06d7719e4`
- Superseded security-reviewed design: `404b1ddf3381ed5b17b8ac2a15227a1a44ca4acc`
- Verdict: **PASS for Human architecture decision**
- Boundary: This review does not authorize implementation, `status:spec-ready`, authority switch, release, rollback execution, or Go.

## Scope and evidence boundary

This targeted review covers the manifest/default-ref compare-and-swap additions in the Issue #133 SDD, amended ADR-0018, implementation plan, Work Item, and the independent architecture PASS record. The current schema, loader, and tests remain superseded migration evidence; they do not implement or prove the proposed manifest, controlled writer, approval, Git-hosting, credential, or incident controls.

Trust boundaries reviewed: feature-worktree proposal to controlled writer; approver identities and approval evidence; short-lived writer credential to Git hosting; protected default-ref update; C/M/S/H and archive sequence integrity; local filesystem to Git index/tree; accepted commit to external anchor; and incident recovery from sensitive-data or writer-credential compromise.

## Project security checklist

| Item | Status | Notes | Evidence |
|---|---|---|---|
| Hardcoded secret / insecure fallback | N/A — design-only | Neither reviewed commit adds executable credentials or fallback secrets. The design requires short-lived protected-environment credentials and prohibits feature-worktree access. | SDD lines 159-163; exact commit file lists. |
| `DEBUG = True` in production settings | N/A — no Django settings | No Django/application settings are changed. | `d657068` changes four documentation records; `ddcf373` adds one review record. |
| Raw SQL / ORM bypass | N/A — no database surface | State is repository/Git-backed; no SQL or ORM operation is designed. | SDD lines 31-46 and 151-163. |
| CORS wildcard | N/A — no HTTP application surface | No browser-facing endpoint or CORS policy is introduced. | Exact commit file lists. |
| DRF authentication/permissions | N/A — no DRF endpoint | The writer is a controlled Git integration boundary, not a DRF service. Concrete GitHub App and branch rules remain a separate activation review. | SDD lines 155-163. |
| Sensitive data in logs or URLs | Pass at design gate | Rejected values, URLs, secrets and parser details cannot be logged; evidence URLs retain the prior strict restrictions; credentials cannot enter worktree code. | SDD lines 105-113 and 361-369. |
| Auth-sensitive endpoint throttling | N/A — no auth endpoint | No login, reset, registration, MFA, or public mutation endpoint is introduced. | Exact commit file lists. |

## Targeted threat assessment

| Threat / control | Result | Evidence and residual gate |
|---|---|---|
| C/M/S/H integrity | Pass | `C` binds the protected default tip; `M` covers the complete manifest; `S` covers generation and every identity's active/head tuple; `H` binds the target lineage head. The writer revalidates all four immediately before commit/publication. `previousSetDigest`, generation, record references and manifest digest provide continuity and drift detection. |
| Controlled-writer trust boundary | Pass with activation gate | Feature worktrees can submit only proposals and never receive writer credentials, reserve paths, mutate the authoritative manifest/projection, or claim acceptance. The writer rebuilds in a clean checkout from current protected `C`; local validation or a local commit is explicitly non-authoritative. Human must approve the concrete trigger, environment and no-bypass branch rules. |
| Correction authorization | Pass with activation gate | Two-party approval prohibits self-approval and requires both current owner and allow-listed Human Maintainer; sensitive-policy/retention/purge/credential changes also require Security. Approval binds semantic delta, identity, request ID, expiry and C/M/S/H; any stale retry requires fresh approval. Human must freeze the actual owner/Maintainer allowlists and identity-verification source. |
| Credential least privilege, rotation and revocation | Pass with activation gate | The proposed dedicated App/service identity uses short-lived credentials, protected-environment access and contents-write only for the configured repository/default branch, with no feature-worktree exposure. Human must approve credential owner, rotation/revocation procedure and ensure the App cannot bypass required approval/check rules. Concrete permissions and secret handling require implementation/activation Security review. |
| Protected non-force ref update | Pass | The sole serialization point is an ordinary non-force update from expected parent `C`; stale/non-fast-forward publication fails. Exactly one child of a given tip can be authoritative. Force updates, automatic merge/replay and feature-worktree publication are forbidden. Hosted branch/ruleset evidence remains mandatory before activation. |
| Replay and stale proposals | Pass | A stale proposal fails on C/M/S/H, discards candidate allocation, reloads state, obtains fresh semantic approval and allocates a new sequence/path. A→B and B→A fixtures cover initial/correction and correction/correction races with one winner and exact final union. |
| TOCTOU, symlink and path traversal | Pass at design gate | Canonical allow-listed roots, no-follow/exclusive-create where supported, open-then-verify fallback, regular-file/inode checks, same-filesystem temporary writes, pre-index revalidation, and explicit symlink/reparse/containment failures close the design gap. Platform-specific behavior must pass adversarial fixtures; a check-then-open-only implementation is forbidden. |
| Sequence collision and path overwrite | Pass | Per-identity, cross-year, monotonically increasing ten-digit sequence comes from the accepted digest-covered manifest. Only the controlled writer allocates it. Existing paths, digest/path mismatch and symlinks fail closed; stale retries cannot reuse allocation. Sequence overflow/boundary behavior must be frozen in the manifest schema and boundary fixtures before activation. |
| Atomic records + manifest + projection | Pass | The writer creates one Git tree/commit with archive/active mutations, manifest and projection and publishes that exact child through ref CAS. Partial filesystem state and locally created commits are not acceptance; interrupted projection and partial-commit cases are required fixtures. |
| External anchor custody | Pass with Human decision | The design correctly limits hashes to internal consistency and requires independently retained commit/set/manifest/head evidence to detect wholesale replacement. Human must select a custodian and storage independent of the mutable repository/writer credential, define update verification, access control and recovery use, and prohibit the controlled writer from being sole anchor custodian. |
| Error/log secret leakage | Pass | Deterministic named errors may expose digests, versions and result codes, but not rejected YAML, URLs, approval payloads, credentials, parser causes or PII. Fixture manifest requires exact stdout/stderr. Concrete error wrapping and hosted logs require Security verification. |
| Incident recovery | Pass with Human activation decision | Sensitive-data incidents already stop distribution, rotate/revoke credentials first, retain evidence outside the contaminated bundle and require Security+Human purge coordination. Before activation, the Human-owned runbook must also cover writer compromise: disable trigger/App, revoke credentials, freeze mutation, compare protected ref and C/M/S/H to the independent anchor, preserve audit evidence, reconcile or restore only through an approved non-force transaction, rotate credentials, reapprove pending requests, and re-anchor the recovered state. No history rewrite or purge is ordinary rollback. |

## Prior control regression check

The `d657068` diff preserves the controls passed at `404b1dd`/`5e904c6`:

- raw per-file, aggregate, file-count, resident-memory, normalized-output, projection and canonical-preimage limits remain unchanged;
- strict UTF-8 and iterative pre-conversion YAML node inspection still reject aliases, anchors, merges, tags, directives, duplicate/non-string keys, multiple documents, cycles and non-JSON values;
- restricted RFC 8785/JCS ordering, integer/string rules, SHA-256 vectors, dependency review and Node/Python runtime matrix remain unchanged;
- metadata-only status policy, evidence URL restrictions, no rejected-value logging, repository-lifetime retention and Security+Human incident purge remain unchanged;
- default active loading still performs zero archive enumeration/read/parse, and archive verification remains bounded and iterative.

## Findings

No Critical, High, Medium, or Low design findings were identified. The following are non-blocking activation constraints, not accepted security exceptions:

| ID | Severity | Constraint | Required disposition |
|---|---|---|---|
| SEC-133-CAS-01 | Informational | The proposed security properties depend on hosted branch/ruleset enforcement and the writer having no bypass path. | Human approves the exact rules; implementation Security verifies ref CAS, required reviews/checks and App bypass settings before activation. |
| SEC-133-CAS-02 | Informational | External-anchor value collapses if the mutable repository or controlled writer is its sole custodian. | Human selects independent custody, update verification, retention and recovery procedures before authority switch. |
| SEC-133-CAS-03 | Informational | Credential revocation is named, but the concrete compromise runbook is intentionally deferred to Human activation design. | Record and rehearse disable/revoke/freeze/anchor-compare/reconcile/rotate/reapprove/re-anchor steps before activation. |
| SEC-133-CAS-04 | Informational | Sequence is fixed-width but overflow behavior is not yet executable. | Manifest schema and fixtures must reject exhaustion before path allocation; no wrap, truncation or reuse. |

These items do not compose into a higher-severity design path because Slice B remains blocked, feature worktrees have no authority or credentials, acceptance requires protected-ref CAS, and implementation/hosted Security review is mandatory before activation.

## Verification performed

| Check | Result |
|---|---|
| Exact design and architecture records | PASS — `d65706828bb782994f7dbf584cd6f573fb9a7f20` and `ddcf373d639b47461c9f10c7b19c09b28e9c3e93` inspected |
| Scope/file inventory | PASS — design commit changes four documentation records; architecture commit adds one review record |
| Baseline secret/security scan | PASS/N/A as recorded above; no credential values found |
| `npm test` | PASS — 327/327 |
| `npm run validate:contracts` | PASS |
| `npm run validate:project-state` | PASS |
| `npm run validate:context-budget` | PASS — 26,020/30,000 |
| `npm run validate:skill-usage` | PASS — 0 missing entries |
| `npm run adr:audit` | PASS — 2.47:1, threshold <= 10:1 |
| `git diff --check` | PASS |

These checks validate repository consistency and the documentation contract. They do not execute the unimplemented manifest/CAS writer, cross-platform fixture matrix, hosted branch protection, App credentials, external anchor or incident runbook.

## Residual Human decisions

1. Approve or reject amended ADR-0018 and manifest/default-ref CAS.
2. Approve owner/Maintainer/Security approver allowlists, identity source, approval expiry and reapproval policy.
3. Approve protected default-branch rules, required checks/reviews, explicit no-force/no-bypass posture and controlled trigger.
4. Name credential owner; approve exact App permissions, environment, rotation, revocation and compromise-recovery runbook.
5. Name an independent external-anchor custodian and approve anchor storage, verification, update and recovery procedures.
6. Confirm sequence exhaustion semantics, runtime matrix, resource limits, retention/purge, migration exceptions, authority switch and rollback ownership.

## Decision and handoff

**PASS** — design commit `d65706828bb782994f7dbf584cd6f573fb9a7f20`, with architecture evidence at `ddcf373d639b47461c9f10c7b19c09b28e9c3e93`, may advance to the mandatory Human architecture decision. This supersedes the security conclusion tied only to `404b1dd`; prior parser/resource/privacy/JCS/retention controls remain accepted and are carried forward.

- From Agent: Independent Security Reviewer
- To Agent: Human Maintainer / Architecture Approver
- Change Type: Framework / Meta; security-sensitive design
- Risk Level: Medium
- Lifecycle Phase: `phase:blocked`
- Specification Readiness: Not ready pending Human architecture and governance decisions
- Stop Reason: `human_review_required`
- Next Action: Human review
- Next Owner: Human Maintainer / Architecture Approver
- Explicit exclusions: no design/code/test/project-state/GitHub edit; no push; no implementation, `status:spec-ready`, authority-switch, release, rollback-execution or Go authorization

## Completion check

| Item | Status | Notes |
|---|---|---|
| Scope/source grounding | Pass | Exact design and architecture commits plus superseded security baseline reviewed. |
| Security checklist/gate | Pass | Checklist includes evidence-backed N/A reasons; all named CAS threats assessed. |
| Findings/severity | Pass | Four informational activation constraints; no blocking finding or composed escalation. |
| Tests/validators | Pass | 327 tests and all listed validators/checks passed in this review session. |
| Artifact/minimal change | Pass | Only this exact-SHA Security re-review record is added. |
| Limitations | Pass | Implementation, hosted controls, credentials, anchors and incident rehearsal remain unverified gates. |
| Unsafe action | None | No authorization or external mutation performed. |
