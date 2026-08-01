# CP-1 Software Design — Issue #133 Worktree-Scoped Status Compatibility

## Metadata

- Work Item ID: GitHub Issue #133
- Title: Worktree-scoped status — CP-1 schema, projection, and consumer contract
- Owner: SA Agent
- Status: CP-1 architecture rework candidate; Human approval required before implementation resumes
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

Canonical serialization is UTF-8 YAML parsed into the JSON data model and serialized under RFC 8785 as defined below; record and set digests use SHA-256.

| Field | Type / constraint |
|---|---|
| `schemaVersion` | Required literal `work-item-status/v1` |
| `issue.repository`, `issue.number` | Required canonical repository slug and positive integer; compound identity is globally unique in the set |
| `issue.url` | Required canonical HTTPS URL; must agree with identity |
| `changeType`, `risk` | Required canonical enums |
| `phase` | Exactly one canonical current `phase:` value when lifecycle contract applies; exact sentinel `phase:not_applicable` plus governing contract otherwise. The bare string `not_applicable` is invalid. |
| `taskState`, `governingContract`, `contractVersion` | Required; state must be legal for the named contract/version |
| `owner.kind`, `owner.id` | Required; kind `agent` or `human`, stable identifier |
| `evidence[]` | Ordered by `(kind, url, digest-or-empty, commit-or-empty, observedAt)`; each item has kind, immutable URL/path, optional commit/digest, observed timestamp |
| `active` | Boolean; exactly one active record per issue identity or zero after archival |
| `createdAt`, `updatedAt` | RFC 3339 UTC; `updatedAt >= createdAt` and monotonic across accepted revisions |
| `archivedAt`, `archiveReason`, `supersedesDigest`, `supersedesPreimage` | Required only when inactive/archive; active records use `null`. `supersedesPreimage` is the complete canonical predecessor record, including its `recordDigest`, exactly as accepted before the transition. |
| `recordDigest` | SHA-256 of canonical record excluding this field |

Unknown keys are rejected in v1. Empty owner/evidence identifiers, malformed timestamps/URLs, illegal phase/task-state combinations, digest mismatch, unsupported schema, and active records carrying archive fields are malformed. A missing expected shard is an explicit error, not an empty set inference.

### Canonical digest preimage

For every record, including a nested predecessor snapshot, the digest preimage is the RFC 8785 JSON Canonicalization Scheme serialization of the parsed JSON data model after:

1. removing only that record object's own `recordDigest` member;
2. sorting `evidence` by the total tuple `(kind, url, digest-or-empty, commit-or-empty, observedAt)`; and
3. preserving every other member and array value exactly, including archive metadata and `supersedesPreimage` when present.

The digest is lowercase hexadecimal SHA-256 over the UTF-8 bytes of that serialization. YAML spelling, key order, comments, anchors, and whitespace never enter the preimage. Numbers outside the schema are rejected before canonicalization. A predecessor snapshot is self-contained: its stored `recordDigest` must equal the digest recomputed from its own canonical preimage. Implementations must use an RFC 8785 implementation or prove byte-for-byte equivalence with the frozen vectors; the earlier informal `canonical JSON` wording is superseded by this definition.

`supersedesPreimage` is not flattened or pruned. For an archive-to-archive correction, it contains the immediately preceding archive record with that record's own `supersedesPreimage` retained, because those bytes are part of the predecessor digest. V1 therefore permits a linear nested chain. Implementations enforce the archive-size limit below and route an exceeded limit to Human review; they never truncate the chain silently.

### Exact active and archive shapes

- Active record: `active: true`; `archivedAt`, `archiveReason`, `supersedesDigest`, and `supersedesPreimage` are all `null`.
- Archive record: `active: false`; `archivedAt` is a valid UTC timestamp; `archiveReason` is non-empty; `supersedesDigest` is a SHA-256 digest; and `supersedesPreimage` is a complete valid `work-item-status/v1` record whose recomputed `recordDigest` equals `supersedesDigest`.
- The archive may set closure `taskState`, `phase`, `owner`, `evidence`, and `updatedAt` independently of the predecessor, subject to the same contract legality and timestamp rules. This is why the predecessor snapshot is retained.
- `createdAt` and issue identity are invariant across the lineage. `updatedAt` is greater than or equal to the predecessor's `updatedAt`; `archivedAt` is greater than or equal to the archive's `updatedAt`. A successor's identity must equal its predecessor's identity.
- Every non-lifecycle governing contract uses only `phase:not_applicable`; this literal applies equally to active, archived, fixture, projection, and migration output.

## Loader, archive, ordering, and conflict rules

- Load all active files and requested archives through one library/API. Normalize issue identity; reject duplicate active identity even if filenames differ.
- Active ordering is `(issue.repository ASC, issue.number ASC)`. Archive ordering is `(archivedAt ASC, recordDigest ASC)` within identity. Evidence ordering is defined by schema above.
- An archive transition is one atomic logical operation: validate current active digest and set digest, retain the exact accepted active record as `supersedesPreimage`, create and validate the closure archive, durably write the immutable archive, remove the active identity, then derive the new set digest. Never overwrite archive history.
- Optimistic concurrency requires expected prior `recordDigest` and expected authoritative set digest. Mismatch is stale and rejected; merge/retry starts from the latest set.
- Unsupported versions fail closed. Migration is explicit version-to-version transformation with retained source digest; readers do not silently coerce.
- A malformed, stale, duplicate, unsupported, or missing record produces no accepted set and no projection.

### Archive transition algorithm

Given identity `I`, expected active digest `D`, expected authoritative set digest `S`, and requested closure values:

1. Load and validate the complete authoritative set. Reject unless its set digest is `S` and it contains exactly one active record for `I` with recomputed and stored digest `D`.
2. Copy the accepted active record as the parsed `supersedesPreimage`; do not synthesize it from requested closure values.
3. Build the inactive closure record. Preserve issue identity and `createdAt`; set `supersedesDigest = D` and `supersedesPreimage` to the copied predecessor; apply the requested legal closure state/phase/owner/evidence/timestamps.
4. Recompute and set the archive `recordDigest`, then run schema, semantic, predecessor, chronology, linearity, and size validation over the candidate archive and complete candidate set.
5. Commit archive creation and active deletion as one repository change. If either path is absent, duplicated, or partially changed, reject the candidate set and emit no projection.
6. Recompute the authoritative set digest and render only after the committed set validates. Retrying uses the latest active and set digests; it never reuses a stale closure candidate.

The loader does not prove who authored a transition. It proves that the archive is internally bound to a retained predecessor preimage and that the supplied set is structurally and cryptographically connected. Git commit review remains the repository's authorship/change-control boundary.

### Archived-only offline verification

For each archive identity, without consulting an active file, Git history, network service, transition API log, or projection:

1. Validate the outer archive record and recompute its `recordDigest`.
2. Require `supersedesPreimage`; validate it recursively as `work-item-status/v1`.
3. Recompute the immediate predecessor digest and require equality with both its stored `recordDigest` and the outer `supersedesDigest`.
4. Require invariant issue identity and `createdAt`, legal state/phase combinations (including exact `phase:not_applicable`), and monotonic timestamps.
5. Follow nested `supersedesPreimage` values until an active root is reached. Reject a cycle, repeated digest, branch, missing preimage, depth over 64, or an outer archive whose RFC 8785 UTF-8 serialization exceeds 1,048,576 bytes.
6. When multiple top-level archives for one identity are supplied, require one linear chain: exactly one root, at most one successor per digest, and no disconnected archive. Duplicate digests or competing successors reject the entire set.

No fallback may reconstruct a predecessor by changing `active`, clearing archive fields, or copying closure state. A hash without its preimage is not lineage proof.

### Failure modes and limits

`MISSING_PREIMAGE`, `PREIMAGE_DIGEST_MISMATCH`, `IDENTITY_MISMATCH`, `CREATED_AT_MISMATCH`, `NON_MONOTONIC_TIME`, `DISCONNECTED_LINEAGE`, `BRANCHED_LINEAGE`, `CYCLIC_LINEAGE`, `ARCHIVE_DEPTH_EXCEEDED`, and `ARCHIVE_SIZE_EXCEEDED` are fail-closed validation classes. Any one rejects the complete candidate set, suppresses projection, and leaves the last accepted authoritative set unchanged. Depth and size failures require Human disposition: retain v1 history or approve a future compacting schema; v1 has no pruning operation.

## Alternatives evaluated

| Option | Single authority / context | Archive size | Tamper and offline proof | Projection / rollback | Migration / testability | Decision |
|---|---|---|---|---|---|---|
| A. Embedded canonical predecessor snapshot | One archive store and one loader; no runtime context dependency | Duplicates one predecessor and nests corrections; bounded by 64 levels / 1 MiB | Self-contained digest-preimage binding; works offline | Archive alone restores the exact predecessor; projection remains derived | One schema addition and deterministic vectors; straightforward adversarial tests | **Selected: minimum sound model** |
| B. Transition API validates active before deletion and persists transition evidence | API becomes a required write boundary; an independent evidence authority is needed | Small only if evidence omits the preimage | A digest/log assertion alone cannot prove a deleted preimage. Including it reduces to A; trusted signatures/transparency add unapproved infrastructure | Rollback still needs predecessor bytes from elsewhere | Requires API durability, issuer trust, replay, key rotation, and outage tests | Rejected for v1 |
| C. Content-addressed predecessor object store keyed by digest | Adds a second authoritative namespace and lookup dependency | Deduplicates repeated preimages, but this workload rarely repeats them | Sound offline only when the object bundle is complete | Rollback is possible, but missing-object and GC rules become critical | Adds object migration, reachability, GC, bundling, and orphan tests | Deferred; complexity is not justified for v1 |

Encryption, signatures, Merkle trees, and Git-history-only proof do not recover absent predecessor bytes and are not simpler alternatives. Git history may corroborate an archive but is not required for archived-only validation.

## Backward compatibility and migration

- The shard identifier remains `work-item-status/v1`, but the pre-activation archive draft is tightened incompatibly: every inactive v1 record now requires `supersedesPreimage`; active records require it as `null`. This frozen-architecture change requires Human approval before Developer work resumes.
- Existing active v1 fixtures migrate mechanically by adding `supersedesPreimage: null` and recomputing `recordDigest` and affected set/projection digests.
- Existing inactive fixtures or artifacts may migrate only when the exact predecessor record is available from the paired fixture or immutable repository evidence. Migration copies that record, verifies its old digest, adds `supersedesPreimage`, and recomputes archive/set/projection digests.
- An archived record whose predecessor bytes cannot be recovered is not grandfathered, guessed, or reconstructed from closure fields. Migration stops with `MISSING_PREIMAGE`; Human must restore evidence or exclude the artifact through a separately approved migration decision.
- During shadow, legacy `PROJECT_STATUS.md` remains authority and incompatible candidate shards are evidence only. Rollback before authority switch deletes/disables candidate v1 outputs and returns to the unchanged legacy path. After switch, rollback restores the exact retained active predecessor from `supersedesPreimage`, validates its digest and the resulting set, and regenerates the projection; archive evidence remains immutable.

## Acceptance tests for the reworked v1 boundary

1. An archived-only closure whose closure state, phase, owner, evidence, and `updatedAt` differ from the active predecessor validates when the exact predecessor preimage is retained.
2. Changing any predecessor field without updating its digest fails; changing both predecessor and digest still fails against outer `supersedesDigest`.
3. A fabricated `supersedesDigest`, missing/null/partial preimage, reconstructed-predecessor shortcut, disconnected chain, branch, cycle, duplicate digest, identity change, `createdAt` change, or non-monotonic timestamp fails closed with no projection.
4. Canonical vectors prove RFC 8785 bytes, total evidence ordering, nested archive hashing, YAML key/whitespace independence, and lowercase SHA-256 output.
5. Active, archive, fixture, migration, and projection cases accept `phase:not_applicable` for non-lifecycle contracts and reject bare `not_applicable` and every other phase.
6. Transition tests prove stale active/set digests and partial archive/delete changes preserve the prior accepted set; a valid transition retains the exact predecessor and produces deterministic record/set/projection digests.
7. Archived-only verification passes with no active path, Git history, network, API log, or projection available.
8. Migration tests cover active fixtures, recoverable archives, and unrecoverable archives; rollback restores byte-equivalent canonical predecessor data while retaining immutable closure evidence.
9. Depth 64 and canonical size exactly 1 MiB are accepted; depth 65 and size above 1 MiB fail with the named classes.
10. The existing 36-case Slice-B corpus, 20 historical replays, 10 real-Git permutations, full suite, contract validators, projection freshness checks, and independent Reviewer/QA gates remain required.

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

- Proposed decision (ADR-0018): retain the complete canonical immediate predecessor in `supersedesPreimage`; reject transition-log-only, reconstructed-predecessor, Git-history-only, and separate object-store models for v1.
- Decision unchanged from ADR-0017: retain active/archive paths, deterministic ordering, optimistic concurrency, one authoritative path per phase, and a single controlled renderer boundary.
- Decision: freeze the 36 `STS-*` fixtures independently from Slice A.
- Assumption: YAML is only a storage encoding; RFC 8785 JSON is the digest model. Implementation may select a conforming parser/canonicalizer but cannot change normalization silently.
- Unresolved Human decision: approve or reject ADR-0018's incompatible pre-activation v1 archive shape and frozen 64-level / 1,048,576-byte limits. Until approval, existing implementation is paused and neither the old reconstruction model nor this proposal is authorized for Go.
- Unresolved Human decision: disposition for any migration input whose genuine predecessor preimage cannot be recovered; the default is fail closed, not reconstruction or waiver.
- Unresolved Human decision: exact default-branch trigger/platform credentials and owner; this design permits no feature-branch projection writer.
- Resolved rework evidence: CP1-133-01 inventory reconciled to 61 unique files / 62 categorized surfaces at `786df83`; fresh independent Reviewer confirmation remains required before CP-1 acceptance.
- Unresolved evidence: executable migration implementation, 36-case run, 20 preselected historical replays, 10 real-Git cases, live shadow, rollback rehearsal, and Human Go/No-Go.
- Human gate: Human Maintainer owns ADR-0018 acceptance, trigger/authority switch/rollback decisions, and unrecoverable migration disposition. This record does not authorize implementation, `status:spec-ready`, or Go.

## Related artifacts

| Artifact | Purpose | Repository path |
|---|---|---|
| Approved compatibility design | Governing constraints | `docs/superpowers/specs/2026-07-31-progressive-context-and-worktree-status-compatibility-design.md` |
| Implementation plan | CP-1 and later checkpoints | `docs/records/implementation-plan/2026-07-31-progressive-context-and-worktree-status.md` |
