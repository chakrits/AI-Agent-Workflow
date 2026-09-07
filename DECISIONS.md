# DECISIONS.md

## Decision Log

Restored on 2026-09-05 under Issue #208. The blank-template resets of 2026-08-12 (PR #162) and
2026-08-22 (PR #205) each blanked this file. Restoration is deliberately limited to the two ADRs
that currently-open issues cite; ADR-0002 through ADR-0016 and ADR-0018 remain recoverable via
`git show afe8091:DECISIONS.md` and were left out by Human Maintainer decision.

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
