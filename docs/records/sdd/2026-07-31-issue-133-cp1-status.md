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

Canonical serialization is UTF-8 YAML parsed into the restricted JSON domain and serialized by the normative JCS algorithm below; record and set digests use SHA-256. The archive is a flat set of immutable peer revisions, not recursively embedded records.

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
| `active` | Boolean revision state. Exactly one current file per identity may exist in the active store; a historical `active: true` predecessor is permitted only in that identity's archive directory. |
| `createdAt`, `updatedAt` | RFC 3339 UTC; `updatedAt >= createdAt` and monotonic across accepted revisions |
| `archivedAt`, `archiveReason`, `supersedesDigest` | Closure/correction revisions require non-null values; an active revision uses `null`. The predecessor named by `supersedesDigest` must exist as a peer file in the same identity's archive bundle. |
| `recordDigest` | SHA-256 of canonical record excluding this field |

Unknown keys are rejected in v1. Empty owner/evidence identifiers, malformed timestamps/URLs, illegal phase/task-state combinations, digest mismatch, unsupported schema, and active records carrying archive fields are malformed. A missing expected shard is an explicit error, not an empty set inference.

### Raw-input, parser, and resource boundary

Validation is iterative; recursive descent over attacker-controlled YAML or objects is forbidden. Limits are measured over raw file bytes before UTF-8 decoding or YAML parsing:

- one status file: at most 98,304 raw bytes;
- active mode: at most 1,000 files and 4,194,304 aggregate raw bytes;
- one identity's archive bundle: at most 1,024 files and 8,388,608 aggregate raw bytes;
- explicit whole-archive mode: at most 10,000 files and 67,108,864 aggregate raw bytes;
- loader resident-memory budget: 134,217,728 bytes; normalized active output: 262,144 UTF-8 bytes; generated root projection: 131,072 UTF-8 bytes.

The default loader mode enumerates and parses only `docs/status/active/`; it must not enumerate, read, parse, or deserialize `docs/status/archive/`. Archive modes are explicit and identity-scoped by default. A limit failure occurs before parsing the offending set and produces no accepted set/projection.

Input must be strict UTF-8 without BOM. Before conversion to JavaScript values, inspect the YAML document node graph iteratively and reject anchors, aliases, merge keys (`<<`), explicit/custom tags, directives, duplicate keys, non-string mapping keys, multiple documents, cyclic node identity, and any node not representable as JSON null/boolean/string/safe integer/array/object. Use the YAML 1.2 core schema with merge disabled, no custom tags, unique keys, and alias expansion disabled; parser options are defense in depth, not a substitute for node inspection. Maximum parsed container depth is 16, where the root object is depth 1; maximum total nodes is 10,000 per file.

### Normative cross-runtime canonicalization

No JCS dependency is currently declared. V1 normatively implements RFC 8785 over a narrower domain:

1. Validate the restricted JSON domain iteratively. Numbers must be integers in `[-9007199254740991, 9007199254740991]`; reject negative zero, fractions, exponents that resolve outside the safe-integer domain, NaN, and infinities before canonicalization.
2. Remove only the top-level `recordDigest` member. Its bytes are excluded from both digest preimage size and digest computation; all other members remain.
3. Sort `evidence` by unsigned UTF-8 byte lexicographic comparison of `(kind, url, digest-or-empty, commit-or-empty, observedAt)`. Do not use locale collation or Unicode normalization.
4. Serialize object names in RFC 8785 UTF-16 code-unit order, strings with RFC 8785/ECMAScript escaping, integers in shortest decimal form, and arrays in retained order. Hash the exact UTF-8 result with SHA-256 and encode lowercase hexadecimal.
5. The canonical preimage must not exceed 65,536 bytes. Raw-file size includes `recordDigest` and YAML syntax; canonical-preimage size excludes only `recordDigest` as stated above.

Implementers may either code this normative subset directly or propose exactly one reviewed, lockfile-pinned JCS package in a separate dependency change. Node 22 has no native JCS API; the current lockfile pins AJV 8.20.0 and YAML 2.9.0 only. YAML 2.9.0 exposes a document node graph, alias nodes, merge/custom-tag controls, unique-key handling, and alias-expansion limits, so pre-conversion inspection is feasible without a new parser. A no-JCS-dependency implementation is feasible because v1 forbids floating-point values and supplies fixed vectors. A package proposal requires license, maintenance, transitive-dependency, and cross-runtime vector review before adoption.

Frozen vectors (text after `bytes=` is the exact UTF-8 preimage):

| ID | bytes length | UTF-8 hex | bytes | SHA-256 |
|---|---:|---|---|---|
| `JCS-U01` | 27 | `7b226e223a302c2273223a22c3a9222c2275223a22f09f9880227d` | `{"n":0,"s":"é","u":"😀"}` | `903bf2f2ba8236df38cea14ea59fa43b0d0d564a3d97a6065f45f783e5ecac0b` |
| `JCS-N01` | 48 | `7b226d6178223a393030373139393235343734303939312c226d696e223a2d393030373139393235343734303939317d` | `{"max":9007199254740991,"min":-9007199254740991}` | `63546eb60913dcb1cdd5118f7bf4885beed344af930c8a9d5f38fad243fd4819` |
| `JCS-E01` | 181 | `7b2265766964656e6365223a5b7b22636f6d6d6974223a22222c22646967657374223a22222c226b696e64223a2261222c226f627365727665644174223a22323032362d30382d30315430303a30303a30305a222c2275726c223a227a227d2c7b22636f6d6d6974223a22222c22646967657374223a22222c226b696e64223a22c3a9222c226f627365727665644174223a22323032362d30382d30315430303a30303a30305a222c2275726c223a2261227d5d7d` | `{"evidence":[{"commit":"","digest":"","kind":"a","observedAt":"2026-08-01T00:00:00Z","url":"z"},{"commit":"","digest":"","kind":"é","observedAt":"2026-08-01T00:00:00Z","url":"a"}]}` | `e5ac81d780e5c913b183400fb612c8d81ce280ca7121ed0ea694ebeb6492cf56` |

Negative vectors require `-0`, `1.5`, `1e400`, lone UTF-16 surrogates, invalid UTF-8, and locale-sensitive evidence ordering to fail without a digest.

### Status data and security policy

Status files are public workflow metadata, not a payload or secret store. They must not contain credentials, tokens, cookies, private keys, authorization headers, personal data beyond already-public GitHub identities, customer/business data, source excerpts, logs, request/response bodies, or arbitrary evidence content. `archiveReason`, owner IDs, states, and evidence kinds are short metadata values; evidence carries references and digests only.

- `issue.url` must be the exact canonical `https://github.com/<owner>/<repo>/issues/<number>` form.
- An evidence `url` is either a normalized repository-relative path with no `..`, control character, backslash, leading slash, or percent-encoded separator, or an allow-listed `https` URL. All URLs reject userinfo, query, fragment, non-default port, IP-literal host, and credential-like patterns including `token`, `secret`, `password`, `passwd`, `api_key`, `apikey`, `access_key`, `authorization`, and `bearer` (ASCII case-insensitive) in any component.
- Evidence immutability comes from an optional commit/digest; URLs never carry credentials or mutable payload data. A remote reference without commit/digest is presentation-only and cannot satisfy an immutable-evidence gate.
- Normal v1 retention is the repository lifetime; routine deletion, pruning, and garbage collection are forbidden. Archive limits block new corrections and require Human disposition rather than deleting history.
- Suspected sensitive data is `DATA_POLICY_ERROR` and a mandatory Security Reviewer stop. If sensitive data was committed, stop distribution, rotate/revoke exposed credentials first, preserve incident evidence outside the contaminated bundle, and require Security Reviewer plus Human approval for any history purge/redaction and downstream clone/remote coordination. A purge necessarily changes digests and anchors; it is a security-incident migration, never ordinary archive correction or rollback.

Security Reviewer is mandatory before Human approval and before any implementation resumes because this design governs untrusted parsing, resource exhaustion, evidence URLs, retention, and sensitive-data response.

### Exact active and archive shapes

- Current active file: in `docs/status/active/`, `active: true` and all three archive fields are `null`.
- Historical predecessor file: the byte-for-byte accepted active revision moved to the identity archive directory. Its `active: true` describes that revision; archive location prevents it from becoming current.
- Closure/correction file: in the same archive directory, `active: false`, valid closure fields, and `supersedesDigest` naming the immediate peer predecessor. Closure state, phase, owner, evidence, and `updatedAt` may differ.
- Issue identity and `createdAt` are invariant. Successor `updatedAt` is not earlier than predecessor `updatedAt`; `archivedAt` is not earlier than successor `updatedAt`.
- Every non-lifecycle governing contract uses exactly `phase:not_applicable`; bare `not_applicable` is invalid everywhere.

## Loader, archive, ordering, and conflict rules

- Load all active files and requested archives through one library/API. Normalize issue identity; reject duplicate active identity even if filenames differ.
- Active ordering is `(issue.repository ASC, issue.number ASC)`. Archive path enumeration uses unsigned UTF-8 byte order; lineage order comes only from digest links, not timestamps or filenames. Evidence ordering is defined by schema above.
- Initial closure and later corrections are separate atomic operations defined below. Archive files are immutable and path collisions fail closed.
- Optimistic concurrency requires expected prior `recordDigest` and expected authoritative set digest. Mismatch is stale and rejected; merge/retry starts from the latest set.
- Unsupported versions fail closed. Migration is explicit version-to-version transformation with retained source digest; readers do not silently coerce.
- A malformed, stale, duplicate, unsupported, or missing record produces no accepted set and no projection.

### Initial archive transition

Given identity `I`, expected active digest `D`, expected authoritative set digest `S`, and requested closure values:

1. Load and validate the complete authoritative set. Reject unless its set digest is `S` and it contains exactly one active record for `I` with recomputed and stored digest `D`.
2. Allocate two absent immutable paths under `docs/status/archive/YYYY/<issue-key>/`: `<active-updatedAt>-<D>.yaml` for the exact predecessor and `<closure-archivedAt>-<closureDigest>.yaml` for the closure. UTC timestamps use filesystem-safe basic form. Any existing path, digest/path mismatch, or symlink is a conflict.
3. Move the accepted active bytes unchanged to the predecessor path. Build the inactive closure with `supersedesDigest = D`, invariant identity/`createdAt`, and requested legal closure values; compute and validate its digest.
4. Validate the candidate identity bundle, aggregate budgets, and candidate authoritative set.
5. Commit predecessor creation, closure creation, and active deletion in one Git tree/commit. A partial working-tree state is invalid and produces no projection.
6. Recompute the authoritative set digest and render only after the committed set validates. Retrying uses the latest active and set digests; it never reuses a stale closure candidate.

### Archive-to-archive correction

Input requires identity `I`, expected current lineage-head digest `H`, expected authoritative set digest `S`, and corrected closure values. Load the active set and only `I`'s bounded archive bundle; reject unless set digest equals `S`, the bundle has exactly one head, and its digest equals `H`. Create one new immutable closure/correction file at `<correction-archivedAt>-<newDigest>.yaml` with `supersedesDigest = H`; never rewrite, rename, or delete prior archive files. Validate the full candidate bundle and commit that one file atomically. Concurrent corrections from the same head would branch, so both cannot validate: a stale/racing writer receives `STALE_LINEAGE_HEAD` or `STALE_SET_DIGEST`, reloads the latest head/set, reapplies an explicitly confirmed correction, and allocates a new path. Automatic semantic merge is forbidden.

The loader proves internal digest/preimage connectivity, not authorship. Git review remains change control. Hashes also do not prevent wholesale replacement of an internally consistent but unanchored archive bundle. Detection requires an independently retained expected set/head digest, such as the verified projection metadata, prior reviewed commit, or signed release evidence; offline validation without such an anchor proves consistency only.

### Archived-only offline verification

For each explicitly supplied, resource-bounded identity archive bundle, without consulting an active file, network service, transition API log, or projection:

1. Validate every peer record and recompute each `recordDigest`.
2. Index peer records by recomputed digest; reject duplicate digests or digest/path mismatch.
3. Iteratively follow `supersedesDigest` from the unique head to the historical `active: true` root, requiring each named predecessor peer, invariant identity/`createdAt`, legal state/phase, and monotonic timestamps.
4. Require exactly one root, one head, at most one successor per digest, and visitation of every supplied peer; reject cycles, branches, or disconnected records.
5. If an external expected head/set digest is supplied, require equality. Otherwise report `UNANCHORED_BUNDLE` as assurance metadata, not a validation failure.

No fallback may reconstruct a predecessor by changing closure fields. A digest without its peer preimage file is not lineage proof.

### Failure modes and limits

Named error precedence is deterministic: (1) `RAW_FILE_LIMIT` / `AGGREGATE_LIMIT` / `FILE_COUNT_LIMIT`; (2) `INVALID_UTF8`; (3) `FORBIDDEN_YAML_FEATURE`; (4) `YAML_PARSE_ERROR`; (5) `JSON_DOMAIN_ERROR` / `NODE_LIMIT` / `CONTAINER_DEPTH_LIMIT`; (6) `SCHEMA_ERROR`; (7) `DATA_POLICY_ERROR` / `SEMANTIC_ERROR`; (8) `CANONICAL_SIZE_LIMIT` / `RECORD_DIGEST_MISMATCH`; (9) `PATH_DIGEST_MISMATCH`; (10) `STALE_SET_DIGEST` / `STALE_LINEAGE_HEAD`; (11) `MISSING_PREIMAGE` / `IDENTITY_MISMATCH` / `CREATED_AT_MISMATCH` / `NON_MONOTONIC_TIME`; (12) `DUPLICATE_DIGEST` / `BRANCHED_LINEAGE` / `CYCLIC_LINEAGE` / `DISCONNECTED_LINEAGE`; (13) `MEMORY_BUDGET_EXCEEDED`. Within a class, report the lexicographically first repository-relative path under unsigned UTF-8 byte ordering. The first applicable class is the primary error; later errors may be diagnostics only. Every failure rejects the complete candidate set, suppresses projection, and preserves the last accepted set.

## Alternatives evaluated

| Option | Single authority / context | Archive size | Tamper and offline proof | Projection / rollback | Migration / testability | Decision |
|---|---|---|---|---|---|---|
| A. Embedded canonical predecessor snapshot | One archive store | Full nested copies cost Θ(n²) aggregate bytes over n corrections and repeatedly copy sensitive mistakes | Self-contained, but expensive to parse and retain | Rollback works | Recursive limits and privacy deletion are difficult | Rejected after rework |
| B. Transition API validates active before deletion and persists transition evidence | API becomes a required write boundary; an independent evidence authority is needed | Small only if evidence omits the preimage | A digest/log assertion alone cannot prove a deleted preimage. Including it reduces to A; trusted signatures/transparency add unapproved infrastructure | Rollback still needs predecessor bytes from elsewhere | Requires API durability, issuer trust, replay, key rotation, and outage tests | Rejected for v1 |
| C. Flat peer revisions in the existing archive namespace | Preserves one archive namespace; active loading is independent | Θ(n) aggregate bytes; each revision stored once | Sound offline when the bounded peer bundle is complete; optional external anchor detects wholesale replacement | Exact predecessor bytes remain available; projection remains derived | Iterative graph validation and immutable-path race tests | **Selected: minimum sound and bounded model** |

Encryption, signatures, Merkle trees, and Git-history-only proof do not recover absent predecessor bytes and are not simpler alternatives. Git history may corroborate an archive but is not required for archived-only validation.

## Backward compatibility and migration

- The identifier remains `work-item-status/v1`, but the pre-activation archive layout changes incompatibly from embedded preimages to flat immutable peer revisions. Human and Security Reviewer approval are required before Developer work resumes.
- Existing active fixtures are revalidated against raw/parser/data/JCS limits and their digests/set/projection digests are recomputed only when canonical bytes differ.
- Existing inactive fixtures/artifacts migrate only when the exact predecessor record is available. Store that predecessor once as a peer file, link closure/corrections by digest, validate the complete bundle, then discard only the unactivated embedded candidate representation.
- An archived record whose predecessor bytes cannot be recovered is not grandfathered, guessed, or reconstructed from closure fields. Migration stops with `MISSING_PREIMAGE`; Human must restore evidence or exclude the artifact through a separately approved migration decision.
- During shadow, legacy `PROJECT_STATUS.md` remains authority. Rollback before switch disables candidate outputs. After switch, rollback copies the exact historical active peer back to the active path, validates its digest/set, and regenerates the projection; archive peers remain immutable.

## Acceptance tests for the reworked v1 boundary

1. An archived-only closure whose closure state, phase, owner, evidence, and `updatedAt` differ validates against the exact peer predecessor; missing or altered peer bytes fail.
2. Initial closure atomically moves exact active bytes, creates closure, removes active, and rejects partial/path-collision/symlink states. Correction requires expected head/set, appends one peer, and rejects stale/racing writers without semantic auto-merge.
3. Fabricated/missing predecessor, disconnected chain, branch, cycle, duplicate digest, identity/`createdAt` change, non-monotonic time, and unanchored-bundle assurance are covered with exact expected outcomes.
4. Raw/aggregate/count/memory boundaries; aliases/anchors/merge/custom tags/directives/cycles/non-JSON values; iterative depth/node limits; and exact primary-error precedence have below/at/above and multi-fault tests.
5. Active, archive, fixture, migration, and projection cases accept `phase:not_applicable` for non-lifecycle contracts and reject bare `not_applicable` and every other phase.
6. JCS vectors prove Unicode/numeric bytes, digest exclusion, locale-independent evidence order, YAML key/whitespace independence, and all negative-number/string cases on every runtime in the manifest.
7. Data-policy tests reject userinfo/query/fragment/ports/IP literals/traversal/credential patterns and sensitive payload fixtures; safe repository paths and immutable HTTPS references pass.
8. Default active loading proves zero archive enumeration/read/parse calls and stays within active output/projection budgets; identity and whole-archive modes enforce their separate budgets.
9. Migration covers active, recoverable flat/embedded candidates, and unrecoverable archives; rollback restores byte-equivalent canonical predecessor data while retaining archive evidence.
10. The existing 36-case Slice-B corpus, 20 historical replays, 10 real-Git permutations, full suite, contract validators, projection freshness checks, independent Reviewer/QA, and mandatory Security Review remain required.

## Versioned executable fixture manifest

The implementation must add `test/fixtures/work-item-status/v1/manifest.json` with literal `fixtureManifestVersion: work-item-status-fixtures/v1`. The manifest is executable contract data, not prose. Each case declares a stable ID; mode (`active`, `archive-identity`, `archive-all`, `transition`, or `correction`); ordered input paths; exact raw input bytes as checked-in files plus SHA-256; expected canonical UTF-8 bytes and record/set/head/projection digests where applicable; expected normalized JSON; expected primary error code and ordered secondary diagnostics; exact filesystem side effects (`create`, `move`, `delete`, `unchanged`) with before/after digests; expected stdout/stderr; and maximum observed file-count/raw-byte/node/depth/memory/output budgets.

Boundary semantics are fixed: `<=` each numeric limit passes and `limit + 1` fails; root container depth is 1; scalar children do not increment container depth; each mapping, sequence, key, and scalar counts as one node; raw aggregate is the sum of regular-file byte lengths after deterministic path enumeration and before any read/parse; canonical size is UTF-8 bytes after top-level `recordDigest` removal; memory is peak `process.memoryUsage().rss - baselineRss` in an isolated process with 20% measurement tolerance, while deterministic allocation-counter assertions remain exact. Error precedence is the numbered list in this SDD.

The required runtime matrix is Node 22.x on Linux, macOS, and Windows plus an independent Python 3.12 reference verifier for JCS vectors only. Every runtime must match exact canonical bytes/digests/errors; filesystem side-effect cases run on Node across all three OSes. If CI cannot provide one matrix cell, specification readiness remains blocked unless Human explicitly narrows supported hosts. Manifest schema, fixture files, and runner are versioned together; changing expected bytes/digests/errors requires architecture review and a manifest-version changelog.

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
- Performance/context: default active mode performs zero archive I/O and obeys the 4 MiB raw, 128 MiB resident-memory, 256 KiB normalized-output, and 128 KiB projection budgets; flat archive storage is Θ(n), not embedded-chain Θ(n²).
- Observability: log candidate/prior/result set/head/record digests, renderer version, trigger commit, primary error code, and no-side-effect result; never log rejected raw values, URLs, or secrets.
- Security: pre-parse resource bounds, iterative graph checks, repository-relative allow-listed paths, symlink/path-traversal rejection, strict schema, no executable shard content, safe immutable evidence references, mandatory Security Reviewer.
- Testability: executable manifest with exact bytes/digests/errors/side effects/runtime matrix, no-side-effect probes, schema mutations, and real-Git permutations; independent Reviewer/QA/Security own evidence.

## Decisions, assumptions, and unresolved evidence

- Proposed decision (amended ADR-0018): retain each complete predecessor once as a flat immutable peer revision in the existing archive namespace; reject embedded recursive chains, transition-log-only, reconstructed-predecessor, and Git-history-only models for v1.
- Decision unchanged from ADR-0017: retain active/archive paths, deterministic ordering, optimistic concurrency, one authoritative path per phase, and a single controlled renderer boundary.
- Decision: freeze the 36 `STS-*` fixtures independently from Slice A.
- Assumption: YAML is only a storage encoding; RFC 8785 JSON is the digest model. Implementation may select a conforming parser/canonicalizer but cannot change normalization silently.
- Unresolved Human decision: approve or reject amended ADR-0018's flat peer archive and all frozen raw/aggregate/file-count/memory/output/JCS limits. Until Human and Security review approve it, existing implementation is paused and neither the old reconstruction model nor this proposal is authorized for Go.
- Unresolved Human decision: disposition for any migration input whose genuine predecessor preimage cannot be recovered; the default is fail closed, not reconstruction or waiver.
- Unresolved Human decision: confirm Node 22 on Linux/macOS/Windows and Python 3.12 JCS-reference coverage, or explicitly narrow the supported runtime matrix before specification readiness.
- Unresolved Human decision: approve repository-lifetime retention and the Security Reviewer + Human incident-only purge exception.
- Unresolved Human decision: exact default-branch trigger/platform credentials and owner; this design permits no feature-branch projection writer.
- Resolved rework evidence: CP1-133-01 inventory reconciled to 61 unique files / 62 categorized surfaces at `786df83`; fresh independent Reviewer confirmation remains required before CP-1 acceptance.
- Unresolved evidence: executable migration implementation, 36-case run, 20 preselected historical replays, 10 real-Git cases, live shadow, rollback rehearsal, and Human Go/No-Go.
- Human gate: Security Reviewer must review this design first. Human Maintainer then owns ADR-0018 acceptance, limits/runtime/retention decisions, trigger/authority switch/rollback, and unrecoverable migration disposition. This record does not authorize implementation, `status:spec-ready`, or Go.

## Related artifacts

| Artifact | Purpose | Repository path |
|---|---|---|
| Approved compatibility design | Governing constraints | `docs/superpowers/specs/2026-07-31-progressive-context-and-worktree-status-compatibility-design.md` |
| Implementation plan | CP-1 and later checkpoints | `docs/records/implementation-plan/2026-07-31-progressive-context-and-worktree-status.md` |
