# Software Design — Platform Readiness and QA Acceptance Traceability

## Metadata

- Work Item ID: GitHub Issue #26
- Title: Add platform definition-of-ready and QA AC traceability
- Owner: SA Agent
- Date: 2026-07-18
- Status: Draft — Security Review required

## Context

Issue #19 showed two independent failure modes: approved criteria existed in more than one place, so QA passed the Issue-level list before discovering a detailed contract list; and GitHub App/ruleset activation was proven after implementation rather than treated as an external prerequisite. The design must reduce those failure modes without turning every work item into a heavyweight process.

## Goals / Non-goals

### Goals

- Define a single, portable acceptance-criteria evidence model.
- Define a separate, auditable platform-activation model for hosted automation.
- Retain the existing phase/status lifecycle as the execution-state model.
- Permit a portable policy/template PR to ship independently from hosted activation.
- Make security-sensitive hosted automation explicitly reviewable and fail closed.

### Non-goals

- No GitHub/GitLab API bot beyond the existing approved GitHub App evaluator.
- No autonomous agent dispatch, event queue, or agent-runtime claim.
- No new lifecycle label category.
- No general redesign of Bug Fix workflow or post-merge closeout contract.

## Architecture Overview

```text
Work Item Issue (canonical scope + AC matrix)
    │ links
    ▼
Draft Change Request (implementation evidence + exact commit SHA)
    │ QA independently verifies matrix rows
    ▼
QA evidence / human review

Platform Activation Record (separate configuration + smoke evidence)
    │ informs, but does not replace, Work Item evidence
    ▼
Trusted readiness evaluator / required check
```

There are three distinct control planes:

| Plane | Responsibility | Canonical source |
|---|---|---|
| Work-item | Scope, lifecycle, and all approved AC | Work Item Issue |
| Platform activation | External configuration and operational proof | Platform-activation record linked from the Work Item/Change Request |
| Enforcement | Structural readiness only; no QA decision | Trusted evaluator and source-pinned required check |

## Component Design

### 1. Acceptance Traceability Matrix

The GitHub Work Item Issue template and GitLab Work Item Issue template will expose one fixed Markdown heading, `## Acceptance Traceability Matrix`, with these fields:

| Field | Meaning |
|---|---|
| AC ID | Stable, unique identifier such as `AC-01` |
| Source | Issue, approved SDD/design, or approved contract URL |
| Criterion | Concise, testable expected result |
| Owner | Developer, QA, Security Reviewer, or Human Maintainer |
| Evidence | Test/review/hosted-run URL or `N/A — reason` |
| Result | Pending, Pass, Fail, or N/A |

The Issue is canonical. PR/MR templates reference the Work Item and require the verified commit SHA plus QA evidence URL; they do not duplicate an AC checklist. A detailed contract comment must be copied into matrix rows before it can be used as a QA-completion condition.

### 2. Platform Activation Record

A reusable Markdown template records:

- affected platform and portable-contract versus hosted-activation scope;
- configuration owner and approval/installation state;
- least-privilege permission inventory and check/ruleset source;
- trusted-code/external-input boundary;
- deterministic hosted fail and pass smoke scenarios with evidence URLs;
- GitLab parity/manual/unsupported boundary;
- activation status (`Not required`, `Pending`, `Passed`, `Deferred`);
- rollback/disable action and known limitation.

It is a record, not a lifecycle label. The record may be linked from the Issue or stored with a design artifact; the template must work on both platforms.

### 3. Hosted enforcement boundary

The existing `work-item-readiness-freshness` Check Run remains structural. Its security invariants are:

- trusted default-branch checkout/import only;
- no PR-head code execution;
- Issue/PR metadata parsed as data through allowlisted same-repository formats;
- App-owned Check Run required from source **AI Agent Workflow**, never any source;
- least-privilege, short-lived App token; no token output;
- authenticated closeout requires source binding and an allowed changed-file set.

The Hosted Activation PR evaluates these invariants and action provenance. It must not broaden token privileges merely to make a smoke test pass.

## Data / Evidence Model

No production data model changes occur. The matrix and activation record are human-readable Markdown artifacts. The existing evaluator may validate only their structural presence/links where parsing is deterministic; it never infers a QA pass from a checkbox or CI result.

## Error Handling and Failure Semantics

| Condition | Behavior |
|---|---|
| Matrix is incomplete | QA cannot provide a complete pass; route to BA/SA/Developer based on missing owner/source. |
| Platform record is pending | Portable contract may proceed; Hosted Activation PR cannot claim platform completion. |
| App permission/ruleset/check source is missing | Hosted smoke fails closed; route to named Human Maintainer, never add broad permissions automatically. |
| Metadata cannot be resolved safely | Readiness evaluator publishes a failure for that PR; it does not skip the check. |
| GitLab needs API mutation | Remain manual/CI-only; create a separate approved security/design work item before adding credentials. |

## Security Considerations

- Security Reviewer is mandatory for the Hosted Activation PR and for any token/app/ruleset/privileged workflow change.
- Pin privileged third-party Actions to immutable commit SHAs, unless Security and Human approve a time-bounded exception documented in the activation record.
- Keep concurrency and bounded API pagination; evaluator paths must not make destructive changes to Issues or PRs.
- Existing post-merge closeout uses a marker; hosted hardening must retain source-PR binding and changed-file allowlisting.

## Testability Notes

| Layer | Test |
|---|---|
| Contract | Remove a required matrix/activation field from a template; regression test must fail. |
| Adapter parity | GitHub and GitLab templates must expose equivalent portable fields. |
| Readiness logic | Malformed/external linkage, missing source binding, and unauthorized files fail deterministically. |
| Security workflow | Exact workflow script still compiles and contains no PR-head checkout/import path. |
| Hosted smoke | Verify one expected failure and one expected success; confirm App-owned check name/source and active ruleset binding. |

## Alternatives Considered

| Alternative | Decision |
|---|---|
| Add activation labels | Rejected: configuration state is platform-specific and would overload portable lifecycle labels. |
| Store a separate repository matrix for every Issue | Rejected for default use: creates unnecessary artifacts. Issue-native matrix is simpler and cross-platform. |
| Parse Markdown checkboxes as QA truth | Rejected: CI cannot replace independent QA judgment. |
| Build an event-driven QA agent dispatcher now | Deferred to P3: it creates a new runtime/trust boundary beyond P0/P1. |

## Decision

Adopt an Issue-native canonical AC matrix and a separate platform-activation record. Deliver their policy/template/test support in a Portable Contract PR, then deliver any privileged hosted enforcement/hardening in a separately reviewed Hosted Activation PR.

## Approval Needed

Security Reviewer must confirm the trusted-code, token, action-provenance, source-pinning, and closeout-binding constraints. Human Maintainer then decides whether this SDD is accepted and whether `status:spec-ready` can be added.
