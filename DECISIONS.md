# DECISIONS.md

## Decision Log

Restored on 2026-09-05 under Issue #208. The blank-template resets of 2026-08-12 (PR #162) and
2026-08-22 (PR #205) each blanked this file. Restoration is deliberately limited to the two ADRs
that currently-open issues cite; ADR-0002 through ADR-0016 and ADR-0018 remain recoverable via
`git show afe8091:DECISIONS.md` and were left out by Human Maintainer decision.

### ADR-0019: No-Go and freeze for IMP-003 T2-B

- Date: 2026-08-22
- Work Items: [Issue #133](https://github.com/chakrits/AI-Agent-Workflow/issues/133), [Issue #203](https://github.com/chakrits/AI-Agent-Workflow/issues/203)
- Status: Accepted — deferred

#### Context

T2-B expanded the framework into a controlled writer and publication system involving
protected refs, CAS enforcement, credentials, approval authority, retention, rollback, and
predecessor recovery. The Human Maintainer determined that the operational value is not yet
demonstrated for the current personal, single-user workflow and that the design/verification
overhead exceeds the current benefit.

#### Decision

Do not proceed with T2-B at this time. Freeze the code baseline at `a739286` and keep
Issues #133 and #203 as deferred initiatives. The SA design at `eb15450` is reference-only
and is not approved for implementation.

No Developer dispatch, `status:spec-ready`, Security Review, writer/publication activation,
authority migration, release, or Go/No-Go execution is authorized by this decision.

Reopening requires a new Human-approved scope, a demonstrated user-value hypothesis, and
explicit measurable exit criteria. This is a process/code freeze, not a destructive history
rewrite; all prior commits remain recoverable through Git history.

#### Consequences

- T2-A evidence and scope-cleanup work remain available as the frozen baseline.
- T2-B design artifacts remain deferred and create no runtime obligations.
- Future work should prioritize practical orchestration, dispatch, terminal-result consumption,
  and context efficiency over status publication infrastructure.

### ADR-0017: Use One Authoritative Path During Progressive Context and Status Migration

- Date: 2026-07-31
- Status: Accepted — Human Maintainer approved the independently-reviewed compatibility design and plan on 2026-07-31; CP-1 baseline/measurement evidence remains required before `status:spec-ready` and Developer dispatch
- Context: Issue #132 originally proposed reducing context and compiling a shared root status projection, but code-backed counter-review showed the token target was unsatisfiable as written, host activation was unproven, and committing a generated root projection could retain conflicts or silently lose updates. The accepted split created #132 for progressive context and #133 for worktree-scoped status. Both affect workflow routing, dispatch/handoff continuity, and project-state consumers.
- Decision: Use a bounded shadow compatibility migration with exactly one authoritative path per phase. Legacy behavior remains authoritative while the new path is read-only. Each slice runs its own 36-case deterministic corpus plus 20 historical replays; Slice B also runs 10 real-Git permutations. Context measurement protocol v1 requires host-native paired input-token observations, at least 36 per observable supported host, per-host median reduction of at least 50%, 5th-percentile reduction of at least 40%, and operational fallback at most 5%. After bounded live shadow, independent review/QA, and Human approval, authority may switch once; the legacy representation is then generated from the new source rather than independently written. Critical structured behavior requires 100% parity. Independent dual-write is prohibited. An incomplete live sample on day 30 remains blocked pending Human extension or termination.
- Alternatives Considered: Immediate cutover (rejected because host behavior and consumer completeness are not yet proven); permanent dual-write (rejected because it creates split-brain and attribution ambiguity); long-lived manual A/B worktrees (rejected because behavior can be paired using disposable worktrees without housekeeping debt); accepting an 85% context-reduction claim from corpus size alone (rejected because corpus size does not prove host boot loading).
- Consequences: #132 and #133 have separate implementation/Go decisions; new code must include normalized compatibility evidence and fail-closed fallback; feature branches do not independently commit a changing root status projection; compatibility removal requires a later Human approval. Existing dirty, detached, or host-managed worktrees remain preserved until owner disposition.
- Owner: Human Maintainer / Orchestrator / SA Agent
