# Implementation Plan — Compatibility-First Context and Status Migration

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Items | #132 Progressive Context; #133 Worktree-Scoped Status |
| Change Type | Framework / Meta Change |
| Risk Level | Medium |
| Current Owner | Developer Agent for Slice B bounded foundation; Slice A ownership unchanged |
| Target Branch | 132-feature-progressive-context-loading-strategy-worktree-scoped-status-architecture |
| Authorization | Slice A/#132 authorization is unchanged. Human accepted ADR-0018 after reviews `ddcf373`/`16c3ecf`; Slice B bounded foundation B-01/B-02/B-05 is implementation-authorized. B-03/B-04/B-06 through B-08, hosted writer activation, authority switch, rollback activation, release, and Go remain gated. |

## 2. Dependency graph

    Baseline + normalized contract
      ├─> Slice A shadow adapter ─> historical replay ─> live shadow ─> Go/No-Go A
      └─> Slice B schema/loader ─> consumer migration ─> worktree permutations
                                          └─────────────> live shadow ─> Go/No-Go B

    Housekeeping inventory ─> disposable worktree harness ─> Slice B permutations

Slices may be implemented separately. Slice B may execute only the bounded foundation; consumer migration, hosted acceptance, shadow/cutover, and rollback activation remain behind later checkpoints. Authority switches remain sequential Human decisions.

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
| B-00 | Human approval of amended ADR-0018/CAS defaults | Human Architecture Approver | **Complete — this approval record; ADR-0018 Accepted** |
| B-01 | Replace superseded schema/loader through failing manifest/parser/CAS tests | Developer — authorized foundation | focused RED at intended seams; no authoritative fallback to superseded loader |
| B-02 | Implement strict schema/shared loader, digest-covered status manifest, and flat-peer transition logic without hosted activation | Developer — authorized foundation | focused GREEN plus local-vs-authoritative acceptance distinction |
| B-03 | Migrate consumers vertically | Developer — **not authorized yet** | later checkpoint after foundation review |
| B-04 | Add production controlled renderer and hosted freshness integration | Developer — **not authorized yet** | later checkpoint; stale projection rejected |
| B-05 | Build versioned fixtures and disposable real-Git CAS/TOCTOU harness | Developer — authorized foundation | A→B/B→A winner-stale-retry permutations; no live credentials; cleanup after pass/failure |
| B-06 | Run Slice B's 36 compatibility cases plus all 10 merge/rebuild permutations | Reviewer / QA — **not authorized yet** | later checkpoint; critical parity plus exact union, zero loss/conflict |
| B-07 | Run 20 historical replays and bounded live shadow | QA — **not authorized yet** | later checkpoint; thresholds met; day-30 incomplete sample is BLOCKED |
| B-08 | Prepare Go/No-Go B and rollback rehearsal | QA / Human — **not authorized yet** | separate Human checkpoint; legacy restoration without evidence loss |

## 4. Checkpoints

- CP-1: **passed for bounded Slice B foundation** after P-01/P-02, reviews `ddcf373`/`16c3ecf`, and Human B-00 approval. This does not pass activation checkpoints.
- CP-2 after A-02 or B-02: focused tests plus full suite and independent review.
- CP-3 every two consumer migrations: focused matrix and project-state validators.
- CP-4 before live shadow: deterministic/historical gates and rollback rehearsal pass.
- CP-5 after live shadow: independent QA report and Human Go/No-Go.

## 5. Test strategy

Authorized B-01/B-02/B-05 behavior follows TDD. The foundation must run the versioned fixture manifest, Slice B's 36-case corpus, digest-covered manifest logic, and disposable A→B/B→A race/TOCTOU permutations with no live writer credentials. Twenty historical replays, consumer migration, hosted GitHub Actions mutation, live shadow, rollback rehearsal, and Go remain later evidence. Independent code review, QA, and Security implementation review are mandatory before any next authorization.

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

Next Action: Dispatch Developer for B-01/B-02/B-05 only, using TDD and small commits; then independent Reviewer, QA, and Security implementation review. Keep B-03/B-04/B-06–B-08 and every hosted/activation/cutover/rollback/Go action blocked pending shadow compatibility evidence and a separate Human checkpoint. Slice A history/authorization is unchanged.
