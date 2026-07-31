# Compatibility Design: Progressive Context and Worktree-Scoped Status

**Issues:** [#132](https://github.com/chakrits/AI-Agent-Workflow/issues/132), [#133](https://github.com/chakrits/AI-Agent-Workflow/issues/133)

**Change type:** Framework / Meta

**Risk:** Medium

**Status:** Approved — CP-1 evidence pending before implementation readiness

## 1. Evidence boundary

The large canonical context corpus does not prove every host loads it all at boot. An extractor does not prove host activation or preserved decisions. A committed generated status projection does not eliminate parallel conflicts and can create lost updates. This design therefore separates observed host evidence from file-size estimates, retrieval from behavioral compatibility, authoritative status from presentation, and deterministic tests from live shadow evidence.

The original claims of about 85% reduction, Tier 1 at most 4,000 tokens, skill at most 500 tokens, and conflict-free committed root projection are not acceptance criteria.

## 2. Decisions

### D1 — Separate delivery slices

- #132 owns progressive context loading.
- #133 owns worktree-scoped status.
- Each slice receives its own implementation and Go/No-Go decision.

### D2 — Compare normalized behavior

Comparison records contain structured fields: change type, risk, workflow, roles, skills, artifacts, gates, lifecycle phase, next owner, stop/backward/rework result, dispatch mandatory fields, acknowledgement, terminal consumption, status set, and projection digest. Textual explanation may differ.

### D3 — Legacy-authoritative shadow first

During shadow, the legacy path remains authoritative and the new path is read-only. The comparator records normalized differences. Shadow output cannot advance lifecycle, dispatch, consume a result, or mutate project status.

### D4 — One writer after authority switch

After an approved switch, context packs remain derived from versioned canonical sources and status shards become the only authoritative status source. Any PROJECT_STATUS.md compatibility view is generated from that source on a controlled path. Feature branches do not independently author a changing shared projection. Dual independent writes are forbidden.

### D5 — Fail closed

Unknown role/skill, missing source, stale hash, malformed or duplicate shard, incompatible schema, or comparator error must report the reason, avoid mutation/dispatch/consumption, use the approved legacy read path when safe, or stop for the owner.

### D6 — Bound the migration

- 20 historical replays.
- 10 consecutive live work items or 14 days, whichever is later.
- Human Go/No-Go by day 30.
- Compatibility removal only after 10 additional fallback-free live work items and separate approval.
- If fewer than 10 qualifying live work items exist on day 30, the result is BLOCKED, not Go or No-Go. The new path remains non-default until Human Maintainer approves a time-boxed extension or ends the migration.

### D7 — Context measurement protocol v1

Every comparison is a paired run against the same repository commit, task fixture, host, model/configuration, and adapter version.

- Primary unit: host-native input tokens loaded before the first task-specific tool/action. Source chars/4 is diagnostic only and cannot satisfy Go.
- Per-pair reduction: 1 - (progressive input tokens / full-context input tokens).
- Minimum population: all 36 deterministic scenarios per observable supported host. Historical/live observations are reported separately and do not replace this minimum.
- Aggregation: each host must independently have median reduction at least 50% and 5th-percentile reduction at least 40%. Results are never pooled to hide a failing host.
- Unsupported/unobservable host: mark N/A with evidence and exclude it from the supported activation claim. It blocks Go for that host but does not block a separately approved per-host rollout.
- Operational fallback: a non-adversarial progressive activation cannot produce a valid manifest/normalized decision and invokes legacy. Denominator is all non-adversarial progressive activation attempts, reported per host and overall. Deliberate negative/fallback fixtures are excluded from this rate.
- Safe fallback must preserve the normalized legacy result and create no dispatch, consumption, lifecycle, or status mutation before fallback completes.

## 3. Slice A contract

A context manifest records source path, source hash/version, approximate tokens, trigger reason, and load result. Actual host behavior must be measured before claiming reduction. Stop conditions and Human gates stay boot-safe. Role/skill material loads only on trigger. Unknown/stale packs fail closed. Full and progressive routes are compared through the normalized contract.

## 4. Slice B contract

The implementation design must define a versioned shard schema with Issue identity, phase/task state, owner, risk/change type, evidence references, timestamps, active/archive transition, uniqueness, deterministic ordering, and malformed/stale/duplicate/unsupported-version behavior.

All current consumers must be inventoried and migrated or recorded as explicit temporary compatibility exceptions. At minimum inspect project-state and risk validators, reset-to-template, stale-closeout cleanup, readiness/closeout logic, documentation-closeout and mirrored adapters, and tests that parse root status. The inventory—not this minimum list—determines completeness.

The shared loader produces a deterministic normalized set. A renderer may emit PROJECT_STATUS.md or stdout but cannot become a second source of truth. Projection freshness is validated against the authoritative set.

## 5. Verification matrix

| Group | Count | Coverage |
|---|---:|---|
| Routing | 12 | Feature, Bug, Config, Data, API, Test-only, Documentation, Meta, security, unclassified, low/high risk |
| Dispatch/handoff | 10 | packet shape, acknowledgement, pass/block/timeout/cancel, exactly-once, duplicate/late result |
| Stop/backward/rework | 8 | Human gates, BA/SA/Dev/Security routes, retry exhaustion, circuit breaker |
| Fallback/error | 6 | unknown role/skill, stale hash, missing pack, malformed/duplicate/unsupported shard |

Each slice runs its own 36 cases. The first 30 exercise the same routing, dispatch/handoff, and stop/backward/rework contract. Slice A's six error cases cover unknown role/skill, stale hash, missing pack, and context-manifest failures. Slice B's six error cases cover malformed, duplicate, stale, unsupported-version, missing, and projection-mismatch status inputs. An evidence-backed N/A is allowed only when a field cannot apply to that slice and the expected unchanged behavior is still asserted.

Twenty historical work items are selected before execution to avoid cherry-picking and must include major change types, backward routing, and security-sensitive work.

Worktree integration has 10 real-Git cases: A→B and B→A for two worktrees, all six orders for three worktrees, one stale-base rebuild, and one interrupted projection rebuild. Expected result is the exact union, and cleanup runs after pass or failure.

## 6. Go/No-Go

### Go

- 100% critical-field equivalence.
- Zero lost update, duplicate active record, stale accepted projection, status-artifact conflict, weakened gate, or terminal-consumption defect.
- Per observable supported host, context median reduction at least 50% and 5th-percentile reduction at least 40% under measurement protocol v1.
- Safe fallback at most 5%.
- Exact-commit gates, independent Reviewer, independent QA, and Human approval.

### Conditional Go

Safe fallback above 5% through 10%, or an unexplained non-critical difference. The new path remains non-default.

### No-Go

Any critical divergence or fallback above 10%. Restore legacy authority and retain comparison evidence.

## 7. Housekeeping

Inventory path, branch/HEAD, dirty state, linked Issue/PR, host owner, and activity. Run dry-run audit. Remove only exact clean merged targets after review. Preserve dirty, detached, host-managed, and owner-unknown worktrees. Re-run audit and prove no evidence loss. Experiment worktrees are disposable per scenario; merged delivery worktrees are removed within 24 hours.

Current evidence: seven prunable worktrees; six clean; .worktrees/pr-122 contains untracked QA evidence; closed-Issue trees #7/#33/#116 and the Codex-managed detached tree require manual ownership checks.

## 8. Rollback

Before authority switch, disable shadow and leave legacy unchanged. After switch, the controlled path keeps a verified legacy projection synchronized with every accepted authoritative shard update. Rollback first compares projection digest/version with the shard set; if current, restore legacy reads without discarding shards. If any shard is newer or the digest differs, stop as BLOCKED for reconciliation—never expose stale legacy state as current. Rollback cannot rewrite lifecycle/evidence history. Compatibility removal is a separate Human-approved change.

## 9. Open decisions before status:spec-ready

- Concrete host-native telemetry adapters and initial supported-host matrix implementing measurement protocol v1.
- Final shard schema and archive layout.
- Controlled projection trigger on the default branch.
- Complete repository-derived consumer list.
- Ownership and disposition of stale/dirty worktrees.

Developer implementation must not begin from this Review-status design.
