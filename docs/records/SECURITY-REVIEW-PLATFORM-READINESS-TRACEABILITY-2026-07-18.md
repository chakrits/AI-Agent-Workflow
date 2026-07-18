# Security Review — Platform Readiness and QA Acceptance Traceability Design

## Metadata

- Work Item ID: GitHub Issue #26
- Title: Add platform definition-of-ready and QA AC traceability
- Owner: Security Reviewer
- Date: 2026-07-18
- Status: Approved for specification readiness with mandatory Hosted Activation controls

## Scope

- Reviewed artifacts: `REQUIREMENTS-PLATFORM-READINESS-TRACEABILITY-2026-07-18.md` and `SDD-PLATFORM-READINESS-TRACEABILITY-2026-07-18.md`.
- Existing sensitive surface inspected: trusted GitHub readiness evaluator, GitHub App token, required App-owned Check Run, and post-merge closeout boundary.
- This is a design review. It does not approve a future workflow/App/ruleset diff; that change requires a separate Security diff review in `SEC-02`.

## Scan Checklist

| Item | Status | Notes |
|---|---|---|
| Hardcoded secret / insecure env fallback | Pass | Design does not add a credential value. Existing private key remains an environment secret, not a repository value. |
| `DEBUG = True` in production settings | N/A | No application runtime/settings change. |
| Raw SQL / ORM bypass | N/A | No data-access change. |
| CORS allowlist | N/A | No HTTP application change. |
| Endpoint auth/authorization | N/A | No endpoint change. |
| Sensitive data in logs or URLs | Pass with constraint | Work Item/PR metadata must remain untrusted input and token values must never be logged. |
| Auth-sensitive rate limiting | N/A | No user authentication endpoint. |
| Privileged GitHub workflow trust boundary | Pass with mandatory control | Existing evaluator checks out default-branch code with `persist-credentials: false`; Hosted Activation must preserve and regression-test this invariant. |
| App permission / check provenance | Pass with mandatory control | Current intended scope is Checks write, Pull requests read, Issues read, with source pinning to AI Agent Workflow. Expansion requires human approval. |
| Third-party Action provenance | Medium finding | Privileged workflow actions currently use mutable major-version tags. Hosted Activation must pin those actions to immutable SHAs or obtain a documented time-bounded exception. |
| Closeout integrity | Pass with mandatory control | Existing focused tests cover authenticated closeout and allowed files. Hosted Activation must keep source binding and allowlist coverage. |

## Findings

| ID | Severity | Description | Required disposition | Status |
|---|---|---|---|---|
| SEC-26-01 | Medium | A workflow that mints a GitHub App token invokes third-party Actions by mutable major-version tag. A changed upstream tag could alter code in a privileged execution context. | Pin every privileged Action to an immutable commit SHA in the Hosted Activation PR, or record a Security Reviewer + Human Maintainer-approved time-bounded exception in the activation record. | Open — must complete before Hosted Activation merge. |
| SEC-26-02 | Informational | The issue matrix and activation record introduce metadata that could later be parsed by automation. | Treat all Issue/PR/MR title, body, label, comment, and URL fields as untrusted data; allowlist formats, validate same-repository linkage, and never use them as executable input. | Design constraint accepted; test in Hosted Activation where parser behavior changes. |

## Required Security Controls

1. Trusted default-branch code only in privileged workflows; no PR-head checkout, import, or execution.
2. Least-privilege, short-lived App token; permission additions require Security Reviewer and Human Maintainer approval.
3. Required readiness check source remains pinned to **AI Agent Workflow**, never “Any source.”
4. Privileged third-party Actions use immutable SHA pins or an approved exception.
5. Work Item/Change Request metadata is allowlisted, same-repository validated, and never interpolated into shell or executable code.
6. Hosted smoke testing proves fail-closed and passing paths, including App permissions, check name/source, and ruleset binding.
7. Closeout source binding and allowed changed-file behavior remain regression-tested.

## Decision

The design may advance to Human specification acceptance because it creates no new privileged behavior and explicitly separates the Hosted Activation PR. `SEC-26-01` does not block the Portable Contract PR, but it blocks merge of any Hosted Activation PR until remediated or explicitly accepted by the Human Maintainer.

## Handoff

| From | To | Required evidence |
|---|---|---|
| Security Reviewer | Human Maintainer | This review, requirements record, SDD, and explicit decision on specification readiness |
| Security Reviewer | Developer (future Hosted Activation) | Security controls above, immutable Action requirement, and `SEC-26-01` disposition |
