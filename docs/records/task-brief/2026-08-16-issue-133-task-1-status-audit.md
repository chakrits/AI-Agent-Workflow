# Task Brief

| Field | Value |
|---|---|
| Work Item / Task ID | GitHub Issue #133 / IMP-003-T1 — `status-audit/v1` contract foundation |
| Objective | Implement the validated `status-audit/v1` schema and deterministic digest/preimage helpers as a read-only foundation. Do not activate a writer, projection authority, migration, or rollback command in this task. |
| Base SHA | `4ae3d3b362759dcf552ae8e181975bffb7e96b24` (`main`) |
| Dependencies | Human-approved specification revision [5306317563](https://github.com/chakrits/AI-Agent-Workflow/issues/133#issuecomment-5306317563); fresh SA result [5306345358](https://github.com/chakrits/AI-Agent-Workflow/issues/133#issuecomment-5306345358); Human approval [5306360102](https://github.com/chakrits/AI-Agent-Workflow/issues/133#issuecomment-5306360102) |
| Required reviewer mode | QA `task_review` with pinned `base_sha` and `head_sha`; independent Reviewer remains required before lifecycle QA/release gates |
| Human decision evidence | [Issue #133 Human approval](https://github.com/chakrits/AI-Agent-Workflow/issues/133#issuecomment-5306360102) |

## Allowed Scope

- **Write set:**
  - `docs/records/task-brief/2026-08-16-issue-133-task-1-status-audit.md`
  - `docs/contracts/schemas/status-audit.schema.json`
  - `scripts/lib/status-audit.mjs`
  - `test/status-audit.test.mjs`
  - `test/fixtures/status-audit/v1/**`
- **Out of scope:**
  - Any status writer or GitHub/remote mutation.
  - `docs/status/active/**`, `docs/status/archive/**`, `docs/status/manifest.yaml`, `PROJECT_STATUS.md`, and `docs/records/status-audit/**` runtime writes.
  - Consumer migration, legacy/shadow comparison, projection generation, authority switch, rollback activation, release/Go decision, and housekeeping deletion.
  - Dispatch/terminal-result relay redesign; this remains a separate orchestration-control-plane work item.
  - Changes to lifecycle labels, Issue comments, PR metadata, or workflow files.

## Sources and Acceptance Criteria

| Source / AC | Required outcome |
|---|---|
| AC-133-01 | Schema defines identity, required fields, uniqueness, lifecycle, archive, malformed/stale/duplicate/unsupported-version behavior, and rollback-related audit operation values. |
| AC-133-03 | Contract/helper behavior is read-only and cannot mutate status, dispatch, or receipt state. |
| AC-133-04 | Canonical field is `contentTreeDigest`; `treeDigest` is rejected as an unknown field. |
| Approved digest contract | Implement exact JCS/SHA-256 preimages for `setDigest`, `headDigest`, `projectionDigest`, `manifestDigest`, `contentTreeDigest`, and dedicated `auditDigest`; do not infer alternate preimages. |
| Approved archive/audit contract | Enforce `auditDigest` exclusion of only the top-level digest field, canonical path rules, and deterministic event/operation mapping at the schema/helper seam. |

## Required implementation behavior

- Use `additionalProperties: false` at every schema object boundary where the contract is closed.
- Keep `approval.independent: false` explicit for the personal single-maintainer profile.
- Validate canonical IDs, repository/issue identity, URL, timestamps, SHA formats, event/operation mapping, and unique canonical changed paths.
- Implement a dedicated audit-digest helper. Do not silently reuse the existing record-digest exclusion helper.
- Define `contentTreeDigest` over UTF-8 records `<normalized-path>\\0<Git-blob-SHA1(candidate-bytes)>\\0`, sorted by UTF-8 path bytes, excluding every `docs/records/status-audit/**` path, and rejecting an empty input set.
- Keep all helpers deterministic, side-effect free, and independently unit-testable.

## Verification and Stop Condition

- **Commands:**
  - `npm test -- --test-name-pattern='status-audit'`
  - `npm run validate:contracts`
  - `npm run validate:project-state`
  - `git diff --check`
  - `git status --short` (must be clean after commit)
- **Required negative coverage:** unknown `treeDigest`, unsupported schema version, unknown fields, malformed IDs/digests/timestamps, event/operation mismatch, duplicate/non-canonical paths, audit-path self-inclusion attempt, and empty content-tree input.
- **Stop and route to:** SA Agent for any specification conflict or undefined preimage; Orchestrator/Human Maintainer for any request to expand the write set or activate a writer/projection; QA Agent if the implementation cannot produce deterministic negative evidence.

## Handoff expectation

Developer must return an Implementer Report containing `base_sha`, `head_sha`, exact changed paths, command results, known limitations, and a single terminal next action: `Dispatch` to QA task-review mode or `Blocked` with evidence.
