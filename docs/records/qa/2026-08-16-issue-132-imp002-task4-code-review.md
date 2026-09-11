# Engineering Code Review: Issue #132 / IMP-002 Task 4 host activation and measurement adapter

- Date: 2026-08-16
- Reviewer: Developer Agent self-review gate
- Review type: Same-change engineering code review; this is not independent QA acceptance
- Issue: https://github.com/chakrits/AI-Agent-Workflow/issues/132
- Approved SDD: `docs/records/sdd/2026-08-16-issue-132-imp002-task4-host-activation-measurement-contract.md`
- Parent commit: `86c6c88`
- Branch: `codex/imp-002-task-4-host-activation-measurement-adapter`

## Review decision

**DONE_WITH_CONCERNS — implementation review passed; independent QA remains required.**

The implementation is limited to the approved repository-owned host-neutral capability and
measurement boundary. It preserves `legacy` as the only authority, rejects caller-provided
support flags without native evidence, keeps repository simulation separate from host evidence,
and reuses the existing `human_approval` workflow-evidence event contract. No native host was
activated and no host support claim was produced by this macOS run.

## Scope reviewed

- `scripts/lib/host-capability-adapter.mjs`
- `test/host-capability-adapter.test.mjs`
- this same-change review record

The adapter validates the frozen capability fields, closed host/status/decision values, named
ownership, immutable adapter version, canonical/resolvable activation/token evidence, UTC timestamps,
measurement identity, host/configuration alignment, terminal-result identity/timestamps, and
existing approved `human_approval` evidence. Invalid input returns structured legacy-authority
fallback. `operator_wait` is retained as policy metadata and does not rewrite `timed_out` or
`host_completion_unavailable`.

## Findings

| Finding ID | Severity | File / Area | Finding | Recommendation | Blocks Progress? |
|---|---|---|---|---|---|
| CR-IMP002-T4-001 | None | Capability boundary | No in-scope implementation defect identified. | Continue to independent QA with exact changed range. | No |
| CR-IMP002-T4-002 | Resolved | Evidence references | QA identified that arbitrary strings and caller-only evidence classes could promote `supported`. | Require canonical resolvable `docs/records/...#fragment` references and native evidence objects; fail closed to `unknown` with legacy authority. | No |
| CR-IMP002-T4-003 | Resolved | Evidence content binding | Independent QA identified that a generic code-review record could still be marked `host_native` and promote `supported` because only path, file, and heading addressability were checked. | Require canonical `host-native-evidence/v1` JSON content under `docs/records/evidence/host-native/`, with fixed evidence type, host, owner, adapter, measurement, status, timestamp, source, authority, and reference bindings. | No |

## Corrective rework

The QA Major finding on `f9eab66` was reproduced before implementation. The corrective change
removes caller-only class metadata as proof, requires both activation and token evidence objects
for `supported`, checks that each evidence ID matches its reference fragment, resolves the
reference under `docs/records/`, rejects traversal/simulation/unresolvable references, and
sanitizes invalid support claims to `capabilityDecision: unknown` with a structured reason.
Legacy authority and `mutationAttempted: false` remain unchanged.

The second QA Major finding on `0fa36f9` was also reproduced before implementation: a generic
code-review record with caller-supplied `class: host_native` was accepted as native evidence. The
corrective rework now parses only canonical JSON evidence references matching
`docs/records/evidence/host-native/*.json#<evidence_id>`. Each record must use
`schema_version: host-native-evidence/v1`, identify `native_activation` or
`native_token_measurement`, and bind `host`, `host_owner`, `adapter_version`, `measurement_id`,
`measurement_status`, `observed_at`, `evidence_ref`, `source: host_telemetry`,
`authority: host_telemetry`, and `recorded_by`. Activation and token records must share the
capability host/owner/adapter/timestamp and measurement identity; measurement validation also
binds the token record to the measurement identity. Generic QA/contract records, missing content,
wrong evidence types, and mismatched identities fail closed to `unknown` with legacy authority.

## Verification performed

- `node --test test/host-capability-adapter.test.mjs` — **15/15 passed**.
- `npm test` — **468/468 passed**.
- `npm run validate:context-compatibility` — **passed**; corpus and matrix valid.
- `npm run validate:contracts` — **passed**.
- `npm run validate:project-state` — **passed**.
- `npm run validate:context-budget` — **passed**, 29,937/30,000 tokens.
- `npm run validate:review-gate` — **passed**.
- `git diff --check HEAD^ HEAD` and `git show --check --oneline HEAD` — **passed**.

## CHANGES MADE

- Added the host-neutral capability/measurement validator and legacy-authoritative fallback seam.
- Added focused TDD coverage for valid, unknown, unsupported, unavailable, `N/A`, malformed,
  missing/stale/simulation evidence, approval linkage, measurement identity, and wait-preservation
  behavior.
- Added this same-change engineering review record because production `.mjs` and test `.mjs` files
  changed.

## NOTICED BUT NOT TOUCHING

- Existing `workflow-evidence/v1` schema/writer/validator, context-pack/schema/matrix/JCS seams,
  and Task 3 shadow adapter are reused and unchanged.
- No capability record was added for a real host; no credentials, remote telemetry, live host
  integration, replay/live-shadow runner, Task 5 evidence, routing/dispatch/lifecycle/retry,
  consumer migration, authority switch, Go/No-Go, or project-state/lifecycle mutation was added.

## CONCERNS

- This record proves repository behavior only. It does not prove native activation, native token
  telemetry, host completion delivery, or support for Codex, Claude, Gemini, Cursor, or Antigravity.
- Independent QA must inspect the exact final commit, recompute the evidence boundary, and verify
  that no simulation or fixture result can promote a host to `supported`.

## Handoff

- Acceptance Criteria Verification Status: **Developer verification complete within Task 4 scope; independent QA pending**
- QA Evidence URL: this record is the code-review evidence; independent QA must add its own evidence
- Platform Activation Record URL / Status: **N/A — no native activation performed**
- Stop Reason: `human_review_required_for_merge`
- Recommended next owner: Independent QA Agent
- Next action: Verify the exact final implementation range against the approved Task 4 SDD and run the required QA checks

Skill Used: `tdd-implementation`, `implementation-planning`, `coding-standards`, `git-workflow-and-versioning`, `verification-before-completion`.
