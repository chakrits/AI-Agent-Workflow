# Issue #132/#133 Compatibility-First Delivery Roadmap

**Parent:** [Issue #132](https://github.com/chakrits/AI-Agent-Workflow/issues/132)

**Slice B:** [Issue #133](https://github.com/chakrits/AI-Agent-Workflow/issues/133)

**Date:** 2026-07-31

**Status:** Design / planning; implementation is not authorized

## Purpose

This roadmap supersedes the original combined implementation proposal. It preserves the two validated problem statements but splits delivery and makes compatibility evidence—not the existence of a new extractor or status compiler—the release gate.

- **Slice A / #132:** Progressive Context Loading.
- **Slice B / #133:** Worktree-Scoped Status Engine.

Canonical design: [compatibility design](../specs/2026-07-31-progressive-context-and-worktree-status-compatibility-design.md)

Executable plan: [implementation plan](../../records/implementation-plan/2026-07-31-progressive-context-and-worktree-status.md)

## Non-negotiable compatibility contract

Both slices must preserve:

1. Change classification, route, risk, role/skill selection, lifecycle phase, and next owner.
2. Human stop gates, Security/QA requirements, backward routing, and retry/circuit-breaker behavior.
3. Dispatch packet mandatory fields, acknowledgement semantics, terminal-result identity, and exactly-once consumption.
4. Existing project-state consumers, reset/closeout behavior, and evidence traceability.
5. Safe fail-closed fallback whenever progressive context or sharded status is unavailable, stale, or malformed.

Prose may differ. Structured behavior may not.

## Evidence ladder

| Gate | Minimum evidence |
|---|---|
| Deterministic compatibility corpus | 36 scenarios per slice: routing 12, dispatch/handoff 10, stop/backward/rework 8, slice-specific fallback/error 6 |
| Host activation | Every supported adapter; host-independent core cases are not multiplied artificially |
| Historical replay | 20 closed work items covering Feature, Bug Fix, Documentation, Framework/Meta, security-sensitive, and backward-routing paths |
| Worktree integration | 10 real-Git permutations: two merge orders for 2 worktrees, six merge orders for 3 worktrees, two stale/crash rebuilds |
| Live shadow | 10 consecutive work items or 14 calendar days, whichever is later; an incomplete sample on day 30 is BLOCKED pending Human extension/termination |

## Migration sequence

1. **Baseline:** Freeze current structured outputs and record actual host-loading behavior.
2. **Shadow:** Legacy remains authoritative. New logic is read-only and only emits normalized comparisons.
3. **Controlled authority switch:** New source becomes authoritative; legacy output is generated as a compatibility projection from that single source.
4. **Default-on:** Enable only after Go criteria pass and Human Maintainer approves.
5. **Compatibility removal:** Separate approval after 10 fallback-free live work items.

Independent dual-write is prohibited.

## Go / No-Go

### Go requires

- 100% parity for critical structured behavior.
- Zero unexplained routing, stop-gate, dispatch, handoff, status-union, or terminal-consumption divergence.
- Zero lost updates, duplicate active records, stale projections, or status-artifact merge conflicts across all worktree permutations.
- Under measurement protocol v1, each observable supported host has at least 36 paired runs, median reduction at least 50%, and 5th-percentile reduction at least 40%.
- Safe fallback rate at most 5%.
- Full repository gates pass at the exact reviewed commit.
- Independent Reviewer and QA evidence plus Human approval.

### Immediate No-Go

- Any weaker route, risk, approval, Security, QA, backward-routing, or retry result.
- Missing dispatch/handoff field, false acknowledgement, duplicate/missing terminal consumption.
- Lost status update, duplicate active issue, stale projection accepted as valid, or dirty worktree removed.
- Fallback rate above 10%.

A 5–10% fallback rate or non-critical unexplained difference is Conditional Go and must be resolved before default-on.

## Housekeeping boundary

- A/B means paired behavior comparison, not two long-lived manually maintained worktrees.
- Test worktrees are disposable: create, run, capture evidence, remove in one scenario.
- Run npm run housekeeping:worktrees before and after the experiment.
- Remove clean merged worktrees within 24 hours.
- Never force-remove dirty, detached host-managed, or owner-unknown worktrees.
- Track stale detached/closed-Issue worktrees as manual review; improving the housekeeping classifier is a separate work item, not hidden #132/#133 scope.

## Current repository inventory (2026-07-31)

- 12 worktrees including the primary checkout.
- 7 classified as prunable.
- 6 prunable worktrees are clean.
- .worktrees/pr-122 is dirty due to untracked QA evidence and must be preserved pending manual disposition.
- Three additional clean worktrees map to closed Issues #7, #33, and #116 but require owner/session confirmation because the current audit reports them as active.
- The Codex-managed detached worktree remains untouched.

No prune or deletion is authorized by this planning artifact.

## Workflow

Orchestrator → SA → Documentation Agent → Human Approval/status:spec-ready → Developer per slice → Independent Reviewer → QA → Human review

Current state for both slices is phase:design. Do not dispatch Developer or add status:spec-ready until the design and executable plan pass independent review and are explicitly approved.
