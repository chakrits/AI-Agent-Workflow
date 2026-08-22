# Task Brief

| Field | Value |
|---|---|
| Work Item / Task ID | GitHub Issue #133 / IMP-003-T2 — controlled CAS/writer-boundary foundation |
| Packet | v1 |
| Role | Documentation Agent |
| Objective | Define the pure CAS decision contract, closed transition/correction records, and a local-CLI writer-intent/TOCTOU test seam without activating a production writer or changing status authority. |
| Base SHA | `a97a4e4` (`origin/main` at worktree creation; includes merged IMP-003-T1) |
| Dependencies | Merged T1 status-audit/v1 foundation; T1 helper/schema/loader contracts; approved ADR-0018/personal single-maintainer Issue #133 direction; SA T2 result `NEEDS_REVISION` at [Issue comment](https://github.com/chakrits/AI-Agent-Workflow/issues/133#issuecomment-5358974075) |
| Required reviewer mode | Independent SA re-review of this exact revision, then Security review, then independent QA/task review with pinned base/head SHAs |
| Human decision evidence (addressable URL) | Required before `status:spec-ready`; no approval is recorded by this artifact |

## Change classification and gates

- Change type: Framework / Meta planning artifact for a bounded future code slice.
- Risk: High. The future seam covers Git-ref/CAS, path/write-boundary, approval, and atomic-publication controls.
- Current phase: planning. `status:spec-ready` is deliberately withheld.
- Required route: SA re-review → Human specification review → Developer implementation → independent code review → Security review → independent QA → Human merge review.
- This brief is a specification package only. It authorizes no implementation, label change, dispatch, writer activation, authority switch, release, or Go decision.

## Allowed scope

The future T2 implementation may add or change only the pure decision/record contract, disposable harness, and their fixtures/tests:

- Pure CAS request/observed/decision/result types binding expected and observed default-ref commit `C`, manifest digest `M`, set digest `S`, and identity head digest `H`.
- Result fields for observed and resulting manifest, set, head, projection, and content-tree digests; reuse T1 canonical/JCS/SHA-256 helpers and preserve T1 behavior.
- Closed transition-record and distinct correction-record schemas with operation, identity, authenticated predecessor, proposal/successor binding, expected CAS tuple, changed paths, approval binding, and canonical digest.
- Separate correction and approval events. Same-identity approval is allowed only as `independent: false` and never collapses the two events.
- `local-cli` writer intent with explicit identity and tool version, plus a disposable TOCTOU/atomic-publication harness that re-reads `C/M/S/H` immediately before publication and models one winner.
- Deterministic fail-closed error contracts, fixtures, and no-side-effect assertions.

### Explicitly out of scope

- Production/default-ref authority switch, protected-branch writer activation, workflow credentials, hosted credentials, or production publication.
- Consumer migration, live/history shadow, projection or rollback activation, release/Go decision, and final authority selection.
- Dispatch/terminal-result relay, orchestration redesign, lifecycle-label mutation, and Issue/PR approval-state changes.
- Any change to T1 loader/audit/JCS/lineage/resource semantics except tests proving they are reused and unchanged.

## Acceptance criteria

| ID | Required outcome and evidence |
|---|---|
| T2-01 | A pure request/observed/accepted/error decision contract takes data only, performs no filesystem/Git/approval/dispatch I/O, and returns deterministic success or failure. |
| T2-02 | The accepted decision binds the complete expected and observed CAS tuple: default-ref commit `C`, manifest digest `M`, set digest `S`, and identity head digest `H`. Each missing, malformed, stale, or mismatched member has a named deterministic error and is never accepted. |
| T2-03 | Successful results expose both observed and resulting manifest/set/head/projection/content-tree digests; digest calculation/preimages reuse T1 helpers and have fixed vectors. |
| T2-04 | The closed transition-record schema requires operation, identity, authenticated predecessor, successor/proposal binding, expected CAS tuple, changed paths, approval binding, and canonical record digest; unknown fields are rejected. |
| T2-05 | The correction-record schema is distinct from transition records, requires an authenticated predecessor snapshot/digest, and cannot be represented as an ordinary transition with an ambiguous flag. |
| T2-06 | Approval binds the exact proposal, predecessor, and resulting record/digest. Same-identity approval is accepted only with `independent: false`, and correction and approval remain separate authenticated events. |
| T2-07 | Writer intent is closed to `kind: local-cli` and records explicit identity and tool version; no hosted or production writer identity is accepted. |
| T2-08 | The disposable harness re-reads `C/M/S/H` immediately before publication, demonstrates exactly one winner for competing candidates, and proves a stale candidate produces no publication-side mutation. |
| T2-09 | Harness publication is atomic across candidate record, immutable archive peer, manifest, projection, and Git commit/ref model; archive collisions and interrupted publication fail closed without partial publication. |
| T2-10 | Unsupported, malformed, stale, unauthorized, ambiguous, and TOCTOU-invalid requests return stable code-only errors before mutation; no error leaks paths, credentials, or arbitrary input values. |
| T2-11 | T1 loader/audit/JCS/lineage/resource behavior is reused and regression-tested unchanged; T2 mode handling does not activate `transition`, `correction`, or `authoritative-integration` in production. |
| T2-12 | Fixtures cover all four CAS mismatches, malformed tuples, predecessor/approval failures, same-identity separate events, archive collision, competing writers, interrupted publication, unsupported modes, and no-side-effect assertions. Full repository gates, Security review, fresh QA, and Human review remain required. |

## No-side-effect proof boundary

For every rejected request and the stale losing candidate, the harness must assert unchanged bytes/digests and unchanged state for: active shards; immutable archive peers; manifest; projection; candidate record; Git commit and default ref; approval consumption; dispatch state; handoff event; and terminal-result/consumption state. A pure decision call must prove that none of these resources is even opened. A winning harness case may mutate only disposable harness state and must not touch repository status files, live Git refs, credentials, or orchestration records.

## Likely future files affected

These are implementation targets for the next approved Developer slice, not changes made by this planning task:

- `docs/contracts/schemas/status-cas-decision.schema.json` — closed pure decision input/output/error contract.
- `docs/contracts/schemas/status-transition-record.schema.json` — closed transition event/record contract.
- `docs/contracts/schemas/status-correction-record.schema.json` — distinct correction event/record contract.
- `scripts/lib/status-cas-decision.mjs` — pure tuple comparison, result projection, and deterministic errors using T1 helpers.
- `scripts/lib/status-writer-harness.mjs` — disposable local-only TOCTOU/atomic-publication model; no production writer activation.
- `test/status-cas-decision.test.mjs`, `test/status-writer-harness.test.mjs`, and `test/fixtures/status-cas/v1/**` — positive, negative, race, interruption, and no-side-effect evidence.
- Existing T1 paths (`scripts/lib/status-audit.mjs`, `scripts/lib/status-loader.mjs`, and T1 schemas) are read/reused and may be modified only if a narrowly justified compatibility seam is proven necessary; any such change must be called out in the Developer report.

## Test matrix

| Area | Minimum cases | Expected evidence |
|---|---|---|
| Pure CAS | valid tuple; missing/malformed `C`, `M`, `S`, `H`; each observed mismatch; all stale combinations | exact decision and stable error code; zero I/O |
| Digest/result binding | fixed preimages for all five result digests; observed/result mismatch; proposal/result digest mismatch | exact bytes and SHA-256; no inferred alternate preimage |
| Records | transition; correction; unknown fields; wrong operation; changed-path duplicates/non-canonical paths; authenticated predecessor mismatch | schema rejection and canonical digest failure before publication |
| Approval | missing/expired/wrong proposal/predecessor/result; same identity with `independent:false`; independent approval rejected for personal profile; separate event ordering | exact error/event shape; approval not consumed on rejection |
| Writer intent | `local-cli` accepted; hosted/unknown kind rejected; missing identity/tool version rejected | deterministic error; no production authority path |
| TOCTOU/race | immediate re-read stable; one winner/two candidates; stale loser after `C/M/S/H` changes; same-identity correction race | one disposable publication, zero stale mutation |
| Atomic publication | archive collision; interrupted candidate/archive/manifest/projection/Git step; immutable archive peer | all-or-nothing disposable state; no partial output |
| No side effects | every fail-closed branch and pure call | unchanged shard/archive/manifest/projection/Git/approval/dispatch/handoff/terminal snapshots |
| Regression | T1 status-audit, loader, JCS, lineage, resource, and existing full suite | exact prior behavior remains passing |

## Verification and stop conditions

Required commands after implementation (not run by this planning-only task):

```bash
npm test -- --test-name-pattern='status-(cas|writer|audit|loader)'
npm test
npm run validate:project-state
npm run validate:contracts
npm run validate:skill-usage
npm run validate:context-budget
npm run validate:review-gate
git diff --check
```

Required additional evidence: disposable TOCTOU/atomic-publication harness output, exact no-side-effect snapshot comparison, independent Security review before QA, fresh QA against pinned base/head SHAs, and Human review. No `status:spec-ready` may be added until Human approves this revised specification.

Stop and route back to SA for any contract/preimage ambiguity; to Security for a trust-boundary or write/approval control finding; to Human for scope, authority, credential, lifecycle, or release decisions; and to QA/Developer for implementation evidence failures. Do not self-approve or dispatch a successor from this artifact.

## Rollback and handoff

Rollback for this planning package is deleting/reverting the two documentation records before approval; no runtime state exists to restore. If implementation is later approved, rollback is to discard the disposable harness/candidate state and revert the implementation commit; never force-update a real ref, delete an archive peer, consume approval, or restore legacy authority from a stale projection.

Next action: **Human review of the revised specification.**
