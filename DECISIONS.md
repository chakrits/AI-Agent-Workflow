# DECISIONS.md

## Decision Log

Restored on 2026-09-05 under Issue #208. The blank-template resets of 2026-08-12 (PR #162) and
2026-08-22 (PR #205) each blanked this file. Restoration is deliberately limited to the two ADRs
that currently-open issues cite; ADR-0002 through ADR-0016 and ADR-0018 remain recoverable via
`git show afe8091:DECISIONS.md` and were left out by Human Maintainer decision.

### ADR-0021: Role-adapter parity via body comparison (Option B); relocate role-definitions.md's Terminal Dispatch section for headroom

- Date: 2026-09-07
- Work Items: [Issue #212](https://github.com/chakrits/AI-Agent-Workflow/issues/212) (IMP-006)
- Status: Accepted

#### Context

Issue #212 (IMP-006 — canonical-source consolidation and adapter conformance) requires AC-01
to decide, before implementation, which of three candidate mechanisms closes the gap that role
adapters under `.claude/agents/` have no drift gate across hosts, unlike the 38 skills which do.
It also requires AC-05: a measured `docs/workflow/role-definitions.md` context-budget audit,
since the canonical reading budget sat at 29,985/30,000 tokens, leaving no room to land AC-06/
AC-07 (wiring 5 unwired adapters, adding a Release Agent skill). SA Agent was dispatched twice:
once producing the Issue's own preliminary options table, and once (2026-09-07) to verify or
challenge that table against the actual current code and files, not the Issue's abstract example.

#### Decision

**AC-01: Option B — body-below-frontmatter comparison across `.claude/agents/`,
`.agents/agents/`, `.agent/agents/`.** Each tree keeps its own frontmatter; the parity check
compares only the content below it. SA's code-level check found every current adapter's
frontmatter is exactly three fields (`name`, `description`, `tools`) — not just `tools:` as the
Issue's illustrative example showed — and that adapter bodies contain no host-specific syntax.
**`name:` is pinned equal across all three trees even though `description` and `tools` are
allowed to diverge**, so a renamed adapter cannot drift invisibly past the check. Body content
is free to differ per host only in what `tools:` and `description:` legitimately require.

Option C (generated adapters, one canonical definition rendering per-host copies) was
considered and explicitly declined for this Issue's scope. SA found a real gap B does not
close: `.claude/agents/sa-agent.md`'s body is a condensed paraphrase of
`docs/workflow/role-definitions.md:104-138`, not a copy, so B's tree-to-tree comparison will
not catch an adapter silently diverging from the canonical role description — only C would.
The Human Maintainer weighed this and accepted it as an accepted residual gap for now: B
matches the guarantee the skill-parity mechanism already provides (copies agree with each
other), and C's cost (generation tooling, a staleness gate of its own, per Issue #212's own
cost table) is not justified for a single-user setup at this time. Revisiting C remains
possible if canonical-vs-adapter fidelity becomes a demonstrated problem.

**AC-05: relocate `docs/workflow/role-definitions.md`'s "Terminal Dispatch and Boss
Visibility" section (lines 36-44, measured 674 tokens) into the existing
`docs/workflow/task-execution-mode.md`, leaving a short pointer.** SA's sentence-level
similarity scan found the Issue's originally proposed lever — auditing `role-definitions.md`
against `AGENTS.md` for duplication — does not deliver: measured overlap is ~20-30 tokens, not
meaningful. The lever that does work is relocation under the pattern Issue #166 already
proved with `task-execution-mode.md`: `task-execution-mode.md` already states part of the
Terminal Dispatch content (the acknowledgement-pending rule, the Issue #35 cross-turn
resumption deferral, the `host_completion_unavailable` stop condition), so merging the rest
there and leaving a ~70-token pointer is a real relocation, not a token-shaving rewrite.
Measured resulting budget: **≈29,385/30,000 (≈615 tokens headroom)**, verifiable by running
`npm run validate:context-budget` after the edit.

SA also proposed a second, optional relocation — QA Agent's "Cross-Platform Acceptance
Criteria Gate" (`role-definitions.md:217-230`, 575 tokens) — which would recover a further
~505 tokens. **Declined for now.** It is a live gate QA reads on every handoff; the usability
cost of putting it behind a link was judged not worth it when the Terminal Dispatch move alone
already produces sufficient headroom for AC-06/AC-07 (SA's cost estimate: ≈150-300 tokens
combined, against ≈615 recovered). May be revisited later if more headroom is needed.

#### Alternatives Considered

- **Option A (byte parity, reuse the skill mechanism unchanged)** — rejected. Would force
  Claude-specific frontmatter (`tools:`, `description:`) to be mirrored byte-for-byte into
  every other host's tree, which is wrong in substance even though it makes a hash check pass.
- **Option C (generated adapters)** — rejected for now, not permanently. Strongest guarantee
  (closes the canonical-vs-adapter fidelity gap B leaves open) but the largest change: needs
  generation tooling and its own staleness gate across three trees. See Decision above.
- **Auditing `role-definitions.md` against `AGENTS.md` for duplication (the Issue's original
  AC-05 lever)** — rejected; SA's measurement found negligible overlap (~20-30 tokens), so
  this does not recover meaningful headroom.
- **Relocating QA's Cross-Platform Acceptance Criteria Gate alongside Terminal Dispatch** —
  deferred, not rejected outright. Recovers a further ~505 tokens but at a live-gate usability
  cost; unnecessary given the Terminal Dispatch move alone is sufficient for AC-06/AC-07.

#### Consequences

- AC-01 is closed: implementation may proceed under Option B once dispatched to Developer
  Agent, with tests for tree-parity-on-match, drift, missing-file, and `name:` mismatch
  (mirroring `test/validate-skill-parity.test.mjs`'s existing shape).
- AC-05's Terminal Dispatch relocation is approved and becomes a required implementation step
  before AC-06/AC-07 can land. It touches `docs/workflow/role-definitions.md`, which is pinned
  by sha256 11 times in `test/fixtures/context-pack-v1/required-source-matrix.json` — the
  implementing agent must run `npm run repin:source-matrix` as part of the same change, per
  the pattern Issue #215 built for exactly this class of edit.
- The QA Cross-Platform Acceptance Criteria Gate relocation is not authorized by this decision.
  A future ADR is needed if it is revisited.
- `.agents/agents/` and `.agent/agents/` do not exist yet and must be seeded as part of AC-02
  implementation; a parity check naively mirroring `validate-skill-parity.mjs`'s directory
  listing would throw `ENOENT` before seeding.
- Owner: Human Maintainer / SA Agent / Developer Agent (implementation not yet dispatched by
  this ADR).

### ADR-0020: Keep `validate-ci-parity.mjs`'s zero-command guard as-is; defer the `normaliseCommand` multi-line gap

- Date: 2026-09-07
- Work Items: [Issue #210](https://github.com/chakrits/AI-Agent-Workflow/issues/210), [Issue #212](https://github.com/chakrits/AI-Agent-Workflow/issues/212)
- Status: Accepted

#### Context

Issue #210's round-3 QA left open a design Question: `scripts/validate-ci-parity.mjs`'s
`githubJobCommands` throws when the named job's extracted command set is empty, and each of
the three QA rounds had found one more shape (missing job, empty steps, composite-action-only)
that reached this outcome. The QA framed this as "enumerating shapes that yield zero commands"
and asked whether the pattern is inherently unbounded — always one more shape away from a gap —
versus whether a positive-assertion approach would close the whole class at once. SA Agent was
dispatched to evaluate, analysis-only, no code change.

#### Decision

Keep the current `githubJobCommands` zero-command guard as-is. SA Agent's rereading of the
function found it is not a per-shape enumeration: it computes the command set with one loop,
then asserts a single shape-independent postcondition (`commands.size === 0` → throw). Round
3's own adversarial probe tried four further shapes specifically looking for a gap and found
none — under a genuinely per-shape enumeration a new shape should have slipped through, and it
did not. The Human Maintainer accepted this recommendation on 2026-09-07 without further review.

#### Alternatives Considered

- **Positive-assertion allowlist** (require the extracted set to contain at least one
  known-required command, e.g. `npm run validate:contracts`) — rejected. Strictly less
  detection power than the current guard for the case that matters (total silent failure,
  already caught), no power against partial silent failure (most commands dropped, one
  sentinel survives), and adds a new staleness/maintenance burden: the allowlist itself needs
  updating on every legitimate script rename, turning a routine rename into a confusing parity
  failure.
- **Snapshot/fixture pattern** (compare the extracted command set against a checked-in
  known-good snapshot) — rejected for this specific gap. This repo already has direct cost
  evidence against this shape: `test/fixtures/context-pack-v1/required-source-matrix.json`
  required a dedicated maintenance tool (`scripts/repin-source-matrix.mjs`, Issue #215) to stay
  usable, and a snapshot is defeatable by regenerating it in the same PR that introduces the
  regression it should catch.
- **Merge-base/branch-walk count comparison** (the pattern `adr-audit.mjs` and
  `validate-risk-register.mjs` already use for "did coverage silently shrink") — named as the
  architecturally consistent choice if a future decision determines the partial-drop class
  below needs closing, but not adopted here since `githubJobCommands` itself was found to have
  no residual gap.

#### Separate, Deferred Finding

While verifying the option above, SA Agent found a different, structurally unrelated risk one
level down, in `normaliseCommand`/`IGNORED_COMMAND_RE` (not `githubJobCommands`): a `run: |`
multi-line step's non-global `.match()` only extracts the first recognized command, and a block
whose first line matches `IGNORED_COMMAND_RE` (e.g. `npm ci`) is discarded whole, silently
dropping any real commands on later lines. Confirmed **not currently live** — every `run:` step
in `.github/workflows/validate-contracts.yml` is single-line. The Human Maintainer decided on
2026-09-07 to defer this rather than fix it now, since it is latent, not active.

#### Consequences

- No code change to `scripts/validate-ci-parity.mjs` from this decision.
- The Issue #210 round-3 design Question is closed; no further QA round is owed on it.
- The `normaliseCommand` multi-line gap remains latent and undecided-as-a-priority. It should
  be revisited if a `run: |` multi-line block is ever introduced into
  `.github/workflows/validate-contracts.yml`, or sooner at the Human Maintainer's discretion.
- Owner: Human Maintainer.

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
