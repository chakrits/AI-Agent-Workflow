# CP-1 Software Design — Issue #133 Worktree-Scoped Status Compatibility

## Metadata

- Work Item ID: GitHub Issue #133
- Title: Worktree-scoped status — CP-1 schema, projection, and consumer contract
- Owner: SA Agent
- Status: CP-1 architecture evidence; Human review required before specification readiness
- Change type / risk: Framework / Meta; Medium
- Contract version: `status-compatibility/v1`; shard schema `work-item-status/v1`
- Evidence commit: `786df83` on `132-feature-progressive-context-loading-strategy-worktree-scoped-status-architecture`

## Context and evidence boundary

The approved design forbids dual independent writes. During shadow, `PROJECT_STATUS.md` remains authoritative and shard output is read-only. After a separately approved switch, shards become the sole authority and any root view is a controlled, derived projection. Repository inventory below is observed at the evidence commit; proposed schema, archive, renderer, and migration treatments are future architecture, not proof of activation.

## Goals / non-goals

### Goals

- Freeze shard/schema/archive/projection/freshness/rollback boundaries.
- Freeze an independent 36-case status compatibility contract.
- Inventory current `PROJECT_STATUS.md` consumers with file:line evidence and migration treatment.

### Non-goals

- No code, tests, shards, renderer, migration, worktree operation, project-state edit, or GitHub change.
- No claim that the proposed controlled default-branch trigger exists.
- No `status:spec-ready`, implementation approval, or Go/No-Go decision.

## Authority and storage boundaries

### Shadow phase

`PROJECT_STATUS.md` is the sole authority. A shadow extractor may propose normalized `work-item-status/v1` records but cannot write active/archive stores or projections, dispatch, consume, or advance lifecycle. Comparator output is evidence only.

### Post-switch phase

- Sole authoritative active store: `docs/status/active/<issue-key>.yaml` (proposed path).
- Immutable archive store: `docs/status/archive/YYYY/<issue-key>/<archived-at>-<record-digest>.yaml` (proposed path).
- Generated compatibility projection: root `PROJECT_STATUS.md`, emitted only by a controlled default-branch renderer after validation and atomic authoritative update.
- Feature worktrees may author only their own proposed shard change. They never independently regenerate/commit a shared changing projection.
- A shared loader owns parsing, normalization, uniqueness, ordering, and digest creation. Consumers must not parse YAML shards independently.

Paths are frozen architecture boundaries, not currently activated repository facts. Changing them requires architecture review because it affects every consumer and rollback digest.

## Shard schema `work-item-status/v1`

Canonical serialization is UTF-8 YAML parsed into a canonical JSON model; the set digest uses lexicographically sorted object keys, deterministic arrays below, no insignificant whitespace, then SHA-256.

| Field | Type / constraint |
|---|---|
| `schemaVersion` | Required literal `work-item-status/v1` |
| `issue.repository`, `issue.number` | Required canonical repository slug and positive integer; compound identity is globally unique in the set |
| `issue.url` | Required canonical HTTPS URL; must agree with identity |
| `changeType`, `risk` | Required canonical enums |
| `phase` | Exactly one canonical current `phase:` value when lifecycle contract applies; explicit `not_applicable` plus governing contract otherwise |
| `taskState`, `governingContract`, `contractVersion` | Required; state must be legal for the named contract/version |
| `owner.kind`, `owner.id` | Required; kind `agent` or `human`, stable identifier |
| `evidence[]` | Ordered by `(kind, url, digest)`; each item has kind, immutable URL/path, optional commit/digest, observed timestamp |
| `active` | Boolean; exactly one active record per issue identity or zero after archival |
| `createdAt`, `updatedAt` | RFC 3339 UTC; `updatedAt >= createdAt` and monotonic across accepted revisions |
| `archivedAt`, `archiveReason`, `supersedesDigest` | Required only when inactive/archive; active records use `null` |
| `recordDigest` | SHA-256 of canonical record excluding this field |

Unknown keys are rejected in v1. Empty owner/evidence identifiers, malformed timestamps/URLs, illegal phase/task-state combinations, digest mismatch, unsupported schema, and active records carrying archive fields are malformed. A missing expected shard is an explicit error, not an empty set inference.

## Loader, archive, ordering, and conflict rules

- Load all active files and requested archives through one library/API. Normalize issue identity; reject duplicate active identity even if filenames differ.
- Active ordering is `(issue.repository ASC, issue.number ASC)`. Archive ordering is `(archivedAt ASC, recordDigest ASC)` within identity. Evidence ordering is defined by schema above.
- An archive transition is one atomic logical operation: validate current active digest, write immutable archive with closure evidence, remove active identity, derive the new set digest. Never overwrite archive history.
- Optimistic concurrency requires expected prior `recordDigest` and expected authoritative set digest. Mismatch is stale and rejected; merge/retry starts from the latest set.
- Unsupported versions fail closed. Migration is explicit version-to-version transformation with retained source digest; readers do not silently coerce.
- A malformed, stale, duplicate, unsupported, or missing record produces no accepted set and no projection.

## Projection and freshness contract

Projection metadata is embedded in the generated root view: schema version, authoritative set digest, renderer version, source commit, generated timestamp, and deterministic content digest. Human-readable rows follow active ordering; archives are summarized only when the legacy contract requires them.

The only proposed production trigger is a controlled default-branch operation immediately after an authoritative shard update has passed loader/schema/concurrency validation. Exact platform mechanism remains a Human-owned activation decision. Pull-request/worktree paths may render to stdout or a temporary ignored artifact for comparison, but must not author the root projection.

Freshness validation recomputes the authoritative set digest and expected projection content with the pinned renderer version. It rejects missing metadata, digest/version mismatch, nondeterministic output, a projection older than any accepted shard, or content mismatch. A stale projection cannot be accepted merely because it parses.

## Frozen independent 36-case fixture catalog

Each status fixture is versioned and executed independently from Slice A. The first 30 cover the same normalized behavior fields; the final six use status-specific failures. Expected equality includes change type, risk, workflow, roles, skills, artifacts, gates, phase, owner, stop/backward/rework result, dispatch fields, acknowledgement, terminal consumption, status set, and projection digest.

| ID | Group | Input focus | Expected normalized result |
|---|---|---|---|
| STS-R01 | Routing | Feature / low risk | Exact legacy route/status set |
| STS-R02 | Routing | Feature / high risk | High-risk gates/status preserved |
| STS-R03 | Routing | Bug Fix | Governing contract and state preserved |
| STS-R04 | Routing | Config | Config owner/state; no invented Developer |
| STS-R05 | Routing | Data/reference data | Data owner/artifacts/state preserved |
| STS-R06 | Routing | API contract | BA/SA/Dev/QA lifecycle preserved |
| STS-R07 | Routing | Test-only | QA → Reviewer state preserved |
| STS-R08 | Routing | Documentation-only | Documentation → Reviewer state preserved |
| STS-R09 | Routing | Framework/meta | Human gate and phase preserved |
| STS-R10 | Routing | Security-sensitive | Security route/status preserved |
| STS-R11 | Routing | Unclassified | Human block; no shard mutation |
| STS-R12 | Routing | Explicit ambiguity | Same backward owner/status as legacy |
| STS-D01 | Dispatch | Complete packet | All mandatory status/evidence fields equal |
| STS-D02 | Dispatch | Missing field | Rejected; set unchanged |
| STS-D03 | Dispatch | Invocation | `dispatched` distinct from acknowledgement |
| STS-D04 | Dispatch | Acknowledgement | Evidence reference preserved |
| STS-D05 | Dispatch | Terminal PASS | Exactly-once transition and projection digest |
| STS-D06 | Dispatch | Terminal BLOCKED | Block state/reason preserved |
| STS-D07 | Dispatch | Timeout | Terminal timeout; no late mutation |
| STS-D08 | Dispatch | Cancellation | Terminal cancellation; no late mutation |
| STS-D09 | Dispatch | Duplicate result | First result/set digest retained |
| STS-D10 | Dispatch | Late result | Rejected; set/projection unchanged |
| STS-S01 | Stop/backward/rework | Scope/architecture Human gate | No state advance beyond gate |
| STS-S02 | Stop/backward/rework | Security Human gate | Security/Human ownership preserved |
| STS-S03 | Stop/backward/rework | QA → BA | Backward phase/state exact |
| STS-S04 | Stop/backward/rework | Developer → SA | Backward phase/state exact |
| STS-S05 | Stop/backward/rework | QA → Developer | Rework state/count exact |
| STS-S06 | Stop/backward/rework | Security → SA/Developer | Receiving owner/state exact |
| STS-S07 | Stop/backward/rework | Retry exhaustion | Governed Human-review block exact |
| STS-S08 | Stop/backward/rework | Circuit/host unavailable | Fail closed; set unchanged |
| STS-E01 | Fallback/error | Malformed shard | Reject entire candidate set; legacy safe path |
| STS-E02 | Fallback/error | Duplicate active identity | Reject entire candidate set; no projection |
| STS-E03 | Fallback/error | Stale expected digest/timestamp | Reject update; current set retained |
| STS-E04 | Fallback/error | Unsupported schema version | Fail closed; owner-visible reason |
| STS-E05 | Fallback/error | Missing expected shard | Fail closed; never infer deletion/empty state |
| STS-E06 | Fallback/error | Projection mismatch | Reject projection as stale; no lifecycle use |

An N/A is allowed only for a field structurally inapplicable to this slice and must assert unchanged behavior. No fixture may use N/A to omit phase, state, set digest, projection digest, or no-side-effect evidence.

## Repository-derived consumer inventory

### Inventory method and exclusions

Commands run from repository root at evidence commit:

```text
git ls-files -z | xargs -0 rg -n 'PROJECT_STATUS\.md|PROJECT_STATUS'
git ls-files -z | xargs -0 rg -l 'PROJECT_STATUS\.md|PROJECT_STATUS' | sort
rg -n --hidden --glob '!.git/**' --glob '*.{mjs,js,cjs,ts,yml,yaml,sh,json}' 'PROJECT_STATUS\.md|PROJECT_STATUS' .
rg -l --hidden --glob '!.git/**' 'Read `PROJECT_STATUS\.md`|Read AGENTS\.md, PROJECT_STATUS\.md|Update `PROJECT_STATUS\.md`|PROJECT_STATUS\.md and TASK_LOG\.md when appropriate' .agents .agent .claude
rg -n --hidden --glob '!.git/**' 'PROJECT_STATUS\.md|PROJECT_STATUS' AGENTS.md CLAUDE.md README.md PROJECT_INDEX.md docs/workflow docs/operating-model docs/templates docs/vault .agents .agent .claude scripts test .github/workflows/documentation-sync.yml
```

Inclusion test, fixed before classification and counting: include a tracked file when its current executable behavior or instructions read, write, validate, authorize, generate, or direct an operator/agent to use current `PROJECT_STATUS`. Inspect every literal match, plus tests that exercise an included status branch even when the test file does not repeat the literal. Count mirrored host files separately. Deduplicate physical paths across categories except when a file has two explicitly different operational roles.

Excluded from the migration count: `PROJECT_STATUS.md` itself; `TASK_LOG.md`; `CHANGELOG.md`; completed work-item, handoff, QA, postmortem, lessons-learned, historical plan/spec records; index/link-only references; the two target SDDs; scoped packet examples that merely prohibit a status edit; and comments that merely narrate history. They remain discoverable by the broad tracked-file commands but do not independently read, write, validate, authorize, generate, or instruct operational use of current status. Generated/reset artifacts are categorized separately rather than hidden.

Exhaustive result at evidence commit: **61 unique consumer files and 62 categorized surfaces**: 6 executable, 40 policy/adapters, 7 tests, and 9 reset-generated/onboarding/template surfaces. `scripts/reset-to-template.mjs` is deliberately counted as both an executable consumer and the reset-artifact source, so the surface total is one greater than the deduplicated file total. Mirrored files count separately because each host copy must be migrated or retained as an explicit compatibility exception. This result supersedes the prior 56/57 claim and includes all five CP1-133-01 omissions; no further operational consumer passed the inclusion test in the tracked-repository review.

### Executable consumers (6)

| Evidence | Current behavior | Migration treatment |
|---|---|---|
| `scripts/validate-project-state.mjs:7-17` | Reads root Markdown and scans `Status:` lines for stale markers. | Migrate to shared normalized loader; validate legal state plus freshness. During compatibility, compare loader result with root parser. |
| `scripts/validate-risk-register.mjs:36-61` | Parses first root `ID`/`Status` and idle marker to infer active work. | Migrate to `activeSet.length > 0` and normalized state; retain root parser only as temporary shadow comparator. |
| `scripts/reset-to-template.mjs:10-46` | Generates a root status stub. | See reset-generated category; post-switch generate empty shard directories/manifest and render compatibility view through controlled renderer. |
| `scripts/work-item-readiness.mjs:15-23` | Authorizes root status as a closeout-change path. | Replace authorization with shard/archive paths plus controlled projection evidence; temporary exception may allow generated root only when digest verifies. |
| `scripts/cleanup-stale-closeout-labels.mjs:82-115` | Accepts `PROJECT_STATUS.md` as project-state reconciliation evidence. | Change evidence to authoritative shard/set digest; compatibility root reference accepted only with freshness proof. |
| `.github/workflows/documentation-sync.yml:11-22,68-77` | Runs root project-state validator and routes success/failure closeout behavior. | Invoke shard/set + projection freshness validator; controlled default-branch renderer is a distinct gated step, not a branch writer. |

### Policy and host-adapter consumers (40)

| Evidence | Migration treatment |
|---|---|
| `AGENTS.md:120,449`; `CLAUDE.md:5-13` | Replace root-only read/update language with shared loader/authoritative shard commands; retain generated view as presentation. |
| `docs/workflow/dynamic-routing.md:10-19`; `docs/workflow/handoff-contract.md:61`; `docs/workflow/role-definitions.md:17,353`; `docs/operating-model/AGENT_OPERATING_MODEL.md:88,108`; `docs/operating-model/SKILL_CATALOG.md:23,248` | Canonical policy migration: authority is normalized set; writes are shard transitions; closeout consumes verified projection only as compatibility. |
| `.agents/workflows/dynamic-workflow.md:11-19` | Portable workflow adapter must call/read shared loader and stop on freshness/schema errors. |
| `.agents/skills/ba-requirement-analysis/SKILL.md:19,31`; `data-config-change/SKILL.md:39,51`; `dynamic-workflow/SKILL.md:14,19,37`; `qa-playwright-testing/SKILL.md:158,170`; `sa-architecture-design/SKILL.md:19,31`; `security-review/SKILL.md:45,57` | Six portable skills: replace direct root read/update with loader + scoped shard transition; keep no dual write. Paths after the first are relative to `.agents/skills/`. |
| `.agent/skills/ba-requirement-analysis/SKILL.md:19,31`; `data-config-change/SKILL.md:39,51`; `dynamic-workflow/SKILL.md:14,19,37`; `qa-playwright-testing/SKILL.md:158,170`; `sa-architecture-design/SKILL.md:19,31`; `security-review/SKILL.md:45,57` | Six Antigravity mirrors: same treatment; verify mirror parity. Paths after the first are relative to `.agent/skills/`. |
| `.claude/skills/ba-requirement-analysis/SKILL.md:19,31`; `data-config-change/SKILL.md:39,51`; `dynamic-workflow/SKILL.md:14,19,37`; `qa-playwright-testing/SKILL.md:158,170`; `sa-architecture-design/SKILL.md:19,31`; `security-review/SKILL.md:45,57` | Six Claude skill mirrors: same treatment; verify mirror parity. Paths after the first are relative to `.claude/skills/`. |
| `.agents/skills/documentation-closeout/SKILL.md:23-46,74-79`; `.agent/skills/documentation-closeout/SKILL.md:23-46,74-79`; `.claude/skills/documentation-closeout/SKILL.md:23-46,74-79` | Three closeout-skill mirrors write/reset the current pointer, prescribe merge-conflict treatment, and verify root status. Replace writes with archive/active shard transitions and verify the controlled projection; preserve mirror parity and the single-authority rule. |
| `.claude/agents/ba-agent.md:39,43`; `config-agent.md:42,46`; `data-agent.md:46,50`; `developer-agent.md:47,51`; `documentation-agent.md:31,60,64`; `orchestrator-agent.md:34,50,55`; `pm-agent.md:55,59`; `qa-agent.md:23,79,83`; `release-agent.md:42,46`; `sa-agent.md:43,47`; `security-reviewer.md:43,47` | Eleven agent adapters: read normalized active set and write only owned shard transition. Paths after the first are relative to `.claude/agents/`. |

The grouped rows enumerate 1 AGENTS + 1 CLAUDE + 5 canonical workflow/model files + 1 portable workflow + 18 mirrored general-skill files + 3 mirrored closeout-skill files + 11 Claude agent files = 40 policy/adapter files.

### Test consumers (7)

| Evidence | Migration treatment |
|---|---|
| `test/validate-project-state.test.mjs:11,29-39` | Replace/add loader/schema/freshness cases; retain legacy parser comparison through shadow. |
| `test/validate-risk-register.test.mjs:10-19,76-280` | Convert active-work fixtures to shards; preserve missing/idle/active parity cases. |
| `test/reset-to-template.test.mjs:21,109-111` | Assert empty authoritative store plus deterministic generated view and no history leakage. |
| `test/work-item-readiness.test.mjs:246-254` | Assert shard/projection authorization and reject independently authored stale root view. |
| `test/work-item-readiness-check.test.mjs:95-108` | Update wrapper fixture changed-files evidence consistently. |
| `test/cleanup-stale-closeout-labels.test.mjs:13-395` (module coverage; status-path branch originates at script lines 82-115) | Add authoritative digest evidence and stale projection rejection. |
| `test/validate-contracts.test.mjs:413-458` | Update closeout contract expected files/policy and assert single authority/no dual write. |

### Reset-generated, onboarding, and template surfaces (9)

| Evidence | Migration treatment |
|---|---|
| `scripts/reset-to-template.mjs:10-46` | Source generator: empty authoritative set plus deterministic compatibility projection. Counted here for artifact ownership and above for executable impact; physical-file total counts it once in executable, so unique-file count is **61** while surface count is **62**. |
| `docs/workflow/reset-to-template.md:9`; `README.md:34,89,176,243`; `docs/vault/00-Index.md:20` | Document authoritative shard location/loader; link root as generated compatibility view. |
| `.agent/skills/verification-before-completion/templates/COMPLETION_CHECK.md:32`; `.agents/skills/verification-before-completion/templates/COMPLETION_CHECK.md:32`; `.claude/skills/verification-before-completion/templates/COMPLETION_CHECK.md:32` | Replace yes/no root update with authoritative set transition + projection freshness evidence. |
| `docs/templates/COMPLETION_CHECK.md:28-36` | Replace the root-status yes/no prompt with authoritative shard-transition and projection-freshness evidence fields. |
| `docs/templates/POST_MERGE_DOCUMENTATION_REVIEW.md:19-29` | Replace root-status impact review with authoritative active/archive transition impact plus generated-projection freshness treatment. |

Independent arithmetic from the enumerated paths: 6 executable + 40 policy/adapters + 7 tests + 9 reset/onboarding/template surfaces = **62 surfaces**. Removing the one explicit cross-category duplicate, `scripts/reset-to-template.mjs`, yields **61 unique files**. All 61 included paths exist at the evidence commit, and each cited line records operational current-status behavior. No other path is double-counted.

## Migration checkpoints and temporary exceptions

- Migrate vertically, no more than two consumer surfaces before CP-3 validation.
- A temporary root compatibility exception must name owner, expiry/exit condition, legacy parser behavior, normalized replacement, and freshness check. It cannot write root independently.
- Mirrored adapters migrate in one parity-verified unit but remain individually inventoried.
- Historical/index-only files are not rewritten; onboarding docs are migrated because they direct current behavior.
- All 36 fixtures, project/risk validators, readiness/closeout, stale cleanup, reset, contracts, and 10 real-Git worktree cases must pass before live shadow.

## Worktree integration boundary

Use disposable real Git repositories. Run A→B and B→A for two worktrees; all six orders for three; one stale-base rebuild; one interrupted projection rebuild. Expected authoritative result is the exact union with zero duplicate active identity, lost update, status-artifact conflict, or stale accepted projection. Cleanup executes after pass or failure and never touches owner-unknown delivery worktrees.

## Rollback boundary

Before authority switch, disable shadow and keep root legacy authority. After switch, every accepted shard update must synchronously produce a verified legacy projection on the controlled path. Rollback recomputes set/projection digest and version first. If current, restore legacy reads without deleting shards or archive. If any shard is newer, metadata is missing, or digest differs, stop `BLOCKED` for Human Maintainer reconciliation; never expose stale root state as current and never rewrite lifecycle/evidence history.

## NFRs, security, and testability

- Reliability: 100% critical-field equivalence; zero lost update, duplicate active record, stale accepted projection, artifact conflict, weakened gate, or terminal-consumption defect.
- Determinism: same authoritative bytes + renderer version produce identical set and projection digests.
- Observability: log candidate/prior/result set digests, record digest, renderer version, trigger commit, rejection reason, and no-side-effect result; do not log secrets.
- Security: repository-relative allow-listed paths, symlink/path traversal rejection, strict schema, no executable shard content, immutable evidence references.
- Testability: exact normalized fixture assertions, no-side-effect probes, schema mutation cases, and real-Git permutations; independent Reviewer/QA owns execution evidence.

## Decisions, assumptions, and unresolved evidence

- Decision: freeze `work-item-status/v1`, active/archive paths, deterministic ordering, optimistic concurrency, and single controlled renderer boundary.
- Decision: freeze the 36 `STS-*` fixtures independently from Slice A.
- Assumption: YAML is a storage encoding and canonical JSON is the digest model; implementation may select a conforming parser but cannot change normalization silently.
- Unresolved Human decision: exact default-branch trigger/platform credentials and owner; this design permits no feature-branch projection writer.
- Resolved rework evidence: CP1-133-01 inventory reconciled to 61 unique files / 62 categorized surfaces at `786df83`; fresh independent Reviewer confirmation remains required before CP-1 acceptance.
- Unresolved evidence: executable migration implementation, 36-case run, 20 preselected historical replays, 10 real-Git cases, live shadow, rollback rehearsal, and Human Go/No-Go.
- Human gate: Human Maintainer owns trigger/authority switch/rollback decisions. This record does not authorize `status:spec-ready`.

## Related artifacts

| Artifact | Purpose | Repository path |
|---|---|---|
| Approved compatibility design | Governing constraints | `docs/superpowers/specs/2026-07-31-progressive-context-and-worktree-status-compatibility-design.md` |
| Implementation plan | CP-1 and later checkpoints | `docs/records/implementation-plan/2026-07-31-progressive-context-and-worktree-status.md` |
