# Implementation Plan — Compatibility-First Context and Status Migration

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Items | #132 Progressive Context; #133 Worktree-Scoped Status |
| Change Type | Framework / Meta Change |
| Risk Level | Medium |
| Current Owner | Orchestrator / SA / Documentation Agent |
| Target Branch | 132-feature-progressive-context-loading-strategy-worktree-scoped-status-architecture |
| Authorization | Human approved design/plan; CP-1 baseline and measurement evidence still gates status:spec-ready and Developer dispatch |

## 2. Dependency graph

    Baseline + normalized contract
      ├─> Slice A shadow adapter ─> historical replay ─> live shadow ─> Go/No-Go A
      └─> Slice B schema/loader ─> consumer migration ─> worktree permutations
                                          └─────────────> live shadow ─> Go/No-Go B

    Housekeeping inventory ─> disposable worktree harness ─> Slice B permutations

Slices may be implemented separately after the shared comparison contract is approved. Authority switches are sequential Human decisions.

## 3. Tasks

| ID | Task | Owner | Verification |
|---|---|---|---|
| P-01 | Freeze baseline, normalized fields, and measurement protocol v1 fixtures | SA / QA | 36 expected fixtures and paired-run formula reviewed |
| P-02 | Record host-native token baseline and supported adapters | Documentation / QA | at least 36 paired observations per observable supported host; N/A blocks that host claim |
| A-01 | Add failing boot-manifest, stale-pack, and fallback tests | Developer | focused RED at intended seam |
| A-02 | Implement minimum context pack and adapter path | Developer | focused GREEN; scope review |
| A-03 | Run 36 scenarios and 20 historical replays | Reviewer / QA | 100% critical parity |
| A-04 | Run bounded live shadow and prepare Go/No-Go A | QA / Human | 10 items/14 days plus metrics |
| H-01 | Capture and safely disposition worktree inventory | Orchestrator / Human | pre/post dry-run; dirty evidence preserved |
| B-01 | Add schema, loader, duplicate, and stale RED tests | Developer | focused RED at intended seam |
| B-02 | Implement schema and shared loader | Developer | focused GREEN |
| B-03 | Migrate consumers vertically | Developer | checkpoint after every two consumers |
| B-04 | Add controlled renderer and freshness validation | Developer | stale projection rejected |
| B-05 | Build disposable real-Git test harness | Developer | cleanup after pass/failure |
| B-06 | Run Slice B's 36 compatibility cases plus all 10 merge/rebuild permutations | Reviewer / QA | critical parity plus exact union, zero loss/conflict |
| B-07 | Run 20 historical replays and bounded live shadow | QA | thresholds met; day-30 incomplete sample is BLOCKED |
| B-08 | Prepare Go/No-Go B and rollback rehearsal | QA / Human | legacy restoration without evidence loss |

## 4. Checkpoints

- CP-1 after P-01/P-02: approve measurable contracts before status:spec-ready.
- CP-2 after A-02 or B-02: focused tests plus full suite and independent review.
- CP-3 every two consumer migrations: focused matrix and project-state validators.
- CP-4 before live shadow: deterministic/historical gates and rollback rehearsal pass.
- CP-5 after live shadow: independent QA report and Human Go/No-Go.

## 5. Test strategy

Executable behavior follows TDD. Each slice runs its own 36-case normalized compatibility corpus. Required evidence also includes 20 historical replays, Slice B's 10 real-Git worktree permutations, at least 36 paired token observations per observable supported host for Slice A, and exact-commit full regression. Operational fallback rates exclude deliberate adversarial fixtures and are reported per host and overall. Security review is added only if implementation introduces trust, permission, secret, privacy, or security-control impact.

## 6. Minimum verification

    npm test
    npm run validate:contracts
    npm run validate:project-state
    npm run validate:context-budget
    npm run validate:skill-usage
    npm run adr:audit
    npm run housekeeping:worktrees
    git diff --check

Focused commands are finalized after file-level design. Record before/after counts; do not use a fixed historical count as acceptance.

## 7. Rollback / fallback

| Scenario | Action |
|---|---|
| Shadow comparator fails | Disable shadow; legacy remains authoritative |
| Context critical divergence | No-Go; keep full-context route |
| Day 30 with fewer than 10 qualifying live items | BLOCKED; remain non-default pending Human extension/termination |
| Status critical divergence | No-Go; restore legacy reads only after projection/shard freshness proof; otherwise BLOCKED for reconciliation |
| Projection stale/malformed | Fail closed; no dispatch, consumption, or state advance |
| Dirty/stale worktree | Preserve and route for owner disposition |
| Compatibility removal concern | Keep adapter and open separate approval work |

## 8. Risks

- Host loading may not be uniformly observable: record per-host method and honest N/A.
- Comparison may hide prose drift: compare versioned structured fields.
- Dual-write can split brain: one authoritative path per phase.
- A consumer may be missed: repository inventory plus explicit exception list.
- Test worktrees may accumulate: disposable harness and pre/post audit.
- Existing evidence may be lost: no force removal and manual disposition.

## 9. Handoff

Next Action: Dispatch SA Agent for CP-1. Human Maintainer approved the independently-reviewed specification. SA/QA must now freeze normalized fixtures, host-observation protocol/initial supported-host matrix, final Slice-B schema boundaries, projection trigger, and consumer inventory. Add status:spec-ready and dispatch Developer only after CP-1 evidence is reviewed.
