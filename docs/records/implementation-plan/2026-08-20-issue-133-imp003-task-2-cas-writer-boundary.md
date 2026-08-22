# IMP-003-T2 Controlled CAS/Writer-Boundary Foundation Implementation Plan

> **For agentic workers:** Implement only after Human approval and `status:spec-ready`. Use task-execution mode with pinned implementer/reviewer SHAs. This is a plan-only artifact; it contains no implementation authority.

**Goal:** Add a pure `C/M/S/H` CAS decision seam, closed transition/correction records, and a disposable local-CLI TOCTOU harness while preserving T1 behavior and keeping production status authority unchanged.

**Architecture:** T2 separates pure decision evaluation from publication. A pure evaluator compares expected and observed default-ref commit, manifest, set, and identity-head digests and returns deterministic data-only results/errors. A disposable harness then models immediate re-read, one-winner CAS, immutable archive peers, and atomic publication; it is not a production writer and cannot mutate real repository or orchestration state.

**Tech Stack:** Node.js ESM, JSON Schema, existing T1 JCS/SHA-256 helpers, Node test runner/npm scripts, disposable temporary fixtures, and local Git command/model probes only.

**Spec:** `docs/records/task-brief/2026-08-20-issue-133-task-2-cas-writer-boundary.md`; SA source: Issue #133 comment [5358974075](https://github.com/chakrits/AI-Agent-Workflow/issues/133#issuecomment-5358974075).

## Global constraints

- Bind the exact CAS tuple `(C, M, S, H)` for expected and observed state; mismatch is never accepted.
- Expose manifest/set/head/projection/content-tree digests in successful results and reuse T1 helpers/preimages.
- Keep transition and correction records distinct, closed, predecessor-authenticated, approval-bound, path-bound, and canonically digested.
- Same-identity approval is `independent: false` and remains a separate approval event from correction.
- Writer intent is `local-cli` only; the writer/TOCTOU harness is disposable and never activates production authority.
- Fail closed with deterministic errors and prove no side effects across shards, archives, manifest, projection, Git, approval, dispatch, handoff, and terminal-result state.
- Preserve T1 loader/audit/JCS/lineage/resource behavior and all existing tests.
- No consumer migration, authority switch, live/history shadow, projection/rollback activation, release/Go, hosted credentials, or dispatch/terminal relay redesign.

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | GitHub Issue #133 / IMP-003-T2 |
| Change Type | Framework / Meta; bounded code-contract and test slice |
| Risk Level | High — write-boundary, Git-ref, approval, and atomic-publication controls |
| Owner | Developer Agent after Human approval; Documentation Agent owns this plan |
| Target Branch / Ticket | Clean branch from approved `main`; Issue #133 |
| Current state | SA `NEEDS_REVISION`; `status:spec-ready` withheld |

## 2. Inputs Reviewed

| Artifact | Status | Notes |
|---|---|---|
| Task Brief | Revised | T2 AC T2-01..T2-12 and exact boundaries in the paired record |
| SA result | Available | Issue #133 comment `5358974075`; all five findings and twelve revised ACs incorporated |
| T1 brief | Available | `docs/records/task-brief/2026-08-16-issue-133-task-1-status-audit.md` |
| T1 helper/loader | Available | `scripts/lib/status-audit.mjs`, `scripts/lib/status-loader.mjs` |
| T1 schemas | Available | `status-audit.schema.json`, `work-item-status.schema.json` |
| Existing QA/review records | Available | `docs/records/qa/2026-08-01-issue-133-*`; preserve prior runtime and portability boundaries |
| ADR/design direction | Available | Approved personal single-maintainer/CAS direction in Issue #133 history; exact implementation readiness still requires this revision's Human gate |

## 3. Affected Areas

| Area | Files / Components | Expected Change |
|---|---|---|
| Contract | `docs/contracts/schemas/status-cas-decision.schema.json` | New closed pure decision input/output/error contract for `C/M/S/H` and five result digests |
| Contract | `docs/contracts/schemas/status-transition-record.schema.json`; `status-correction-record.schema.json` | New distinct closed records with authenticated predecessor, proposal/successor, paths, approval, and canonical digest |
| Pure library | `scripts/lib/status-cas-decision.mjs` | New side-effect-free evaluator using T1 canonical helpers; deterministic errors only |
| Disposable harness | `scripts/lib/status-writer-harness.mjs` | Local temporary model of immediate re-read, one winner, immutable archive, and atomic publication; no real ref/authority writes |
| Tests/fixtures | `test/status-cas-decision.test.mjs`, `test/status-writer-harness.test.mjs`, `test/fixtures/status-cas/v1/**` | Frozen vectors, negative corpus, race/interruption, and no-side-effect snapshots |
| T1 regression | Existing T1 tests and helpers | Read-only compatibility proof; modify only if a reviewed compatibility seam is unavoidable |
| Project state | `PROJECT_STATUS.md`, `TASK_LOG.md` | Planning/handoff evidence only; never runtime status authority |

## 4. Dependency graph and task breakdown

| Task ID | Task | Owner | Files / Components | Verification |
|---|---|---|---|---|
| T2-PLAN-01 | Freeze the JSON field sets, exact digest preimages, error-code table, and AC traceability against the approved Task Brief. | SA + Human | Task Brief and schemas | SA re-review records exact revision and no design blocker; Human approval is addressable. |
| T2-DEV-01 | Add failing schema/fixture tests for the pure CAS tuple, five result digests, malformed/stale outcomes, and closed-field rejection. | Developer | CAS schema, CAS fixtures/tests | Focused tests fail for missing implementation and identify exact expected errors. |
| T2-DEV-02 | Implement the pure evaluator and minimal contract schemas using T1 helpers; do not open files, invoke Git, consume approval, or dispatch. | Developer | CAS schema/library | Focused CAS tests pass; a spy/no-I/O probe proves no side effects. |
| T2-CP-01 | Checkpoint pure decision outputs, fixed vectors, error determinism, and T1 regression before adding publication modeling. | Developer + Reviewer | CAS tests and existing T1 suite | Focused + T1 tests pass; `validate:contracts` passes; no forbidden paths changed. |
| T2-DEV-03 | Add failing tests and closed schemas for separate transition/correction records, authenticated predecessor, proposal/successor, changed paths, approval binding, and canonical digest. | Developer | Record schemas, fixtures/tests | Negative tests fail on unknown fields, wrong predecessor/proposal/approval, and collapsed correction shape. |
| T2-DEV-04 | Implement record validation and same-identity separate correction/approval event binding with `independent:false`. | Developer | Record validators/library | Record tests pass; event ordering and exact bindings are asserted. |
| T2-DEV-05 | Add the `local-cli` intent contract and disposable harness for immediate re-read of `C/M/S/H`, one-winner stale rejection, immutable archives, and atomic publication. | Developer | Harness/library, harness tests/fixtures | Race/interruption/collision tests prove one winner and zero stale/partial mutation in disposable state. |
| T2-CP-02 | Run a full checkpoint over all T2 fixtures, no-side-effect snapshots, and T1 behavior. | Developer + independent Reviewer | All T2/T1 tests | `npm test`, contracts, diff, and review-gate evidence pass; scope report is exact. |
| T2-SEC-01 | Review path, Git-ref, approval, publication atomicity, fail-closed behavior, and secret/credential boundaries. | Security Reviewer | Exact implementation diff and harness evidence | Security review PASS or findings routed back; Security must finish before QA. |
| T2-QA-01 | Independently verify T2-01..T2-12 against pinned base/head SHAs, including no-side-effect and T1 regression evidence. | QA Agent | Exact review range and records | Fresh `task_review` returns `spec_verdict` and `quality_verdict`; failures route to Developer/SA/Security. |
| T2-HUMAN-01 | Review exact evidence and decide merge/next action. | Human Maintainer | Review, Security, QA records | Human approval only; no autonomous merge, release, authority switch, or Go claim. |

### Parallelization decision

T2-DEV-01 and T2-DEV-03 may be drafted as independent test/schema slices after T2-PLAN-01, but implementation must remain sequential at T2-DEV-02 → T2-DEV-04 because both record bindings depend on the pure digest/error vocabulary. T2-DEV-05 must follow the pure contract and record schemas because the harness consumes them. Checkpoints T2-CP-01 and T2-CP-02 are mandatory. Security review cannot run before the exact implementation diff exists and must complete before QA; QA and Security are not parallel gates for this slice.

## 5. Test strategy

| Test Type | Required? | Scope | Owner |
|---|---|---|---|
| Unit/contract | Yes | Pure CAS, fixed vectors, closed schemas, deterministic errors | Developer; independently reviewed |
| Harness/integration | Yes | Disposable immediate re-read, one-winner CAS, immutable archive, atomic interruption | Developer; Security and QA verify |
| No-side-effect | Yes | Snapshots for shards/archive/manifest/projection/Git/approval/dispatch/handoff/terminal state | Developer evidence; QA independently re-runs |
| T1 regression | Yes | Existing status-audit, loader, JCS, lineage, resource and full suite | QA |
| Security review | Yes | Write boundary, path/ref controls, approval binding, credential non-use, fail-closed behavior | Security Reviewer before QA |
| E2E/hosted | No | Production writer/hosted credentials are explicitly out of scope | N/A; document boundary |

## 6. Verification commands

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

Also require exact fixed-vector output, disposable race/interruption output, no-side-effect snapshot output, Security review record, and fresh QA record pinned to the candidate range. For this planning package itself, run the same repository validators plus a markdown/diff check; do not run or claim T2 implementation tests.

## 7. Rollback / Fallback Plan

| Scenario | Rollback / Fallback Action | Owner |
|---|---|---|
| Planning review rejects this revision | Revert the two documentation records or apply a bounded SA-directed documentation correction; keep `status:spec-ready` absent. | Human / Documentation |
| Pure contract mismatch | Stop before harness work; return to SA with exact failing vector and no mutation evidence. | Developer / SA |
| Security finding | Stop before QA; route exact finding to Security → SA/Developer; no credentials or production refs are added. | Security Reviewer |
| Harness race/atomicity failure | Discard disposable candidate state; fix only within approved T2 scope and re-run checkpoint. Never repair by force-updating a real ref. | Developer |
| QA failure | Route to Developer, SA, or Security by root cause; pin a new range and preserve the rework limit. | QA / Human |
| Human does not approve | Remain in planning; no label, dispatch, merge, release, authority switch, or Go action. | Human Maintainer |

## 8. Risks / Blockers

| Risk / Blocker | Impact | Mitigation / Next Action |
|---|---|---|
| CAS tuple omission or alternate digest preimage | False acceptance or unverifiable provenance | Closed field tables, fixed vectors, exact `C/M/S/H` mismatch cases, SA review |
| Harness mistaken for production authority | Unauthorized status mutation | Disposable temp root, no real ref credentials, structural forbidden-path checks, explicit non-activation tests |
| TOCTOU race leaves partial state | Split-brain or stale publication | Immediate re-read, one-winner cases, immutable archive, interruption rollback assertions |
| Approval/predecessor ambiguity | Correction forgery or replay | Separate record/event schemas and exact proposal/predecessor/result binding |
| Sensitive write-boundary exposure | Credential/path/ref compromise | Security review before QA; code-only errors and no hosted credentials |
| T1 regression | Existing status evidence changes | T1 helper reuse and full regression gate |
| Lifecycle milestone confusion | Premature readiness/dispatch | Keep `status:spec-ready` withheld and record SA NEEDS_REVISION/Human gate explicitly |

## 9. Handoff gates

1. **SA re-review:** exact revised brief/plan, all T2-01..T2-12 mapped, no unresolved Major/Minor design gap.
2. **Human specification review:** explicit approval URL for this exact revision; only then may `status:spec-ready` be considered.
3. **Developer:** clean isolated worktree, failing-test evidence before implementation, exact write set, implementer report, and no production writer activation.
4. **Independent code review:** pinned base/head, scope and digest/preimage review.
5. **Security before QA:** Security evidence covers path/ref/approval/write-boundary controls; unresolved findings block QA.
6. **Independent QA:** pinned range, AC traceability, T1 regression, deterministic negative evidence, and no-side-effect proof.
7. **Human review:** decide merge/next action; no self-approval, release, authority switch, or Go decision.

Next action: **Human review of the revised specification.**
