# Final Independent Architecture Review — Issue #133

## Metadata

- Work Item: GitHub Issue #133 — Worktree-Scoped Status Engine
- Reviewed design commit: `d65706828bb782994f7dbf584cd6f573fb9a7f20`
- Security evidence: PASS record commit `5e904c6b4a8acb0701d63a6cecd51961b727d244`
- Compared history: `404b1ddf3381ed5b17b8ac2a15227a1a44ca4acc`, `46ffe7f66bc74971c54a893a4ad2180ea07959f8`, and `28329f3`
- Role: Independent Architecture Reviewer
- Date: 2026-08-01
- Verdict: **PASS for Human architecture decision**
- Boundary: This review does not approve implementation, `status:spec-ready`, authority switch, release, rollback execution, or Go.

## Decision

The amended flat immutable peer archive and authoritative manifest/default-ref CAS design passes architecture review. Both Major findings from the `404b1dd` review are closed, all six earlier Major findings remain closed, and no new blocking architecture contradiction was found.

The design is feasible in the repository's Node 22/AJV 8.20.0/YAML 2.9.0 environment. Existing schema, loader, and tests remain superseded migration evidence rather than proof that the new controls are implemented.

## Reproduction of prior Major findings

### 1. Two independent corrections from one identity/head

Result: **Closed**.

The final model explicitly permits proposals A and B from the same `C/M/S/H` to validate locally. Local validation, local path allocation, and local commits do not reserve a sequence or establish acceptance. The controlled writer rebuilds each reviewed transaction on the current protected default tip and revalidates:

- `C`: expected protected default-branch commit;
- `M`: expected manifest digest;
- `S`: expected authoritative set digest, which includes every identity's active and lineage-head digest;
- `H`: expected identity lineage-head digest.

The digest-covered manifest also binds generation, previous set digest, identity active/head digests, and per-identity `nextArchiveSequence`. Sequence/path allocation occurs only in the controlled writer. Records, manifest, and projection are committed together as one child of `C`; an ordinary non-force protected-ref update from expected `C` is the authoritative serialization point.

Therefore, when A wins, `C/M/S/H`, generation, and sequence advance. B's update from the old `C` cannot become authoritative. B must receive a named stale failure, discard its candidate allocation, reload current state, obtain fresh approval bound to the rebased semantic correction and new `C/M/S/H`, and receive a new sequence/path. Automatic replay, semantic merge, force update, and feature-worktree writer credentials are forbidden. The required A→B/B→A fixtures test initial/correction and correction/correction races, one winner, stale loser, explicit reapproval/retry, and exact final union.

Evidence: SDD lines 40–44, 129–163, 179, 203, 211, and 355; ADR-0018 lines 8–12; implementation plan tasks B-00 through B-05 and test strategy.

### 2. Phase, readiness, and Developer authorization consistency

Result: **Closed**.

The SDD, ADR-0018, Work Item, and implementation plan consistently state that:

- Security design review passed at `5e904c6` for Human architecture review only;
- amended ADR-0018 remains Proposed;
- Issue #133 is `phase:blocked`;
- prior specification readiness and Developer authorization applied only to the superseded pre-rework design;
- Slice B implementation is paused pending fresh Human architecture approval;
- no current artifact authorizes implementation, `status:spec-ready`, authority switch, release, or Go.

The Work Item's authority-history section preserves the 2026-07-31 authorization and commits `0063792` through `28329f3` honestly as historical evidence while explicitly withdrawing their authority over the amended model.

Evidence: SDD lines 8, 27–29, 378–385; ADR-0018 lines 8–12; Work Item classification, authority history, and final status; implementation plan authorization, B-00 gate, paused B tasks, and handoff.

## Earlier finding closure matrix

| Finding | Result | Architecture evidence |
|---|---|---|
| Parser/resource limits were enforced too late | Closed | Raw-byte and aggregate limits precede decode/parse; aliases, anchors, merge keys, tags, directives, duplicate/non-string keys, multiple documents, cycles, non-JSON values, excessive nodes, and excessive depth fail closed under iterative inspection. |
| Archive correction lacked an authoritative operation | Closed | Digest-covered manifest plus protected non-force default-ref CAS distinguishes locally valid proposals from one authoritative acceptance and defines stale reapproval/retry. |
| Aggregate growth/context budget was absent | Closed | Each flat peer is stored once, so archive storage is Θ(n). Per-file, identity, whole-archive, memory, normalized-output, and projection budgets are frozen. Manifest overhead is one bounded entry per identity and does not reintroduce nested Θ(n²) archive storage. |
| Sensitive-data duplication/retention policy was absent | Closed at architecture gate | Metadata-only policy, URL/path restrictions, logging prohibition, repository-lifetime retention, incident stop, credential rotation, and Security+Human purge governance are explicit. Security PASS `5e904c6` supplies the separate design-security evidence. |
| JCS/runtime contract was insufficient | Closed | Restricted RFC 8785 domain, safe integers, UTF-8 evidence ordering, UTF-16 object-key ordering, digest exclusion, dependency boundary, exact positive/negative vectors, and Node/Python runtime matrix are frozen. |
| Acceptance tests were descriptive rather than executable | Closed | Versioned fixture manifest requires exact raw bytes, canonical bytes, digests, normalized output, primary/secondary errors, filesystem side effects, budgets, stdout/stderr, runtime matrix, race orders, TOCTOU, migration, and rollback evidence. |

## Additional architecture assessment

- Default active loading performs zero archive enumeration/read/parse and uses the manifest's active bindings without recursively loading archive history.
- Identity-scoped offline validation remains iterative and requires one root, one head, complete visitation, digest/path agreement, invariant identity/creation time, monotonic timestamps, and no branch, cycle, duplicate, or disconnected peer.
- An unanchored bundle proves internal consistency only. Wholesale replacement detection requires an independently retained commit/set/manifest/head digest.
- Migration accepts only genuine predecessor bytes, flattens recoverable unactivated embedded candidates, and fails closed with `MISSING_PREIMAGE` when evidence is unavailable.
- Rollback restores the exact retained historical active peer only after manifest/set/projection validation. Archive peers remain immutable, and rollback/authority decisions remain Human-owned.
- The controlled writer and protected-branch policy preserve ADR-0017's one-authority-per-phase rule; feature worktrees cannot reserve paths, publish authority, or regenerate the authoritative projection.

## Verification evidence

| Check | Result |
|---|---|
| Exact HEAD | `d65706828bb782994f7dbf584cd6f573fb9a7f20` |
| Commit ancestry | PASS: `5e904c6`, `404b1dd`, `46ffe7f`, and `28329f3` are ancestors; `d657068` directly follows `5e904c6` |
| `npm test` | PASS: 327/327 |
| `npm run validate:contracts` | PASS |
| `npm run validate:project-state` | PASS |
| `npm run validate:context-budget` | PASS: 26,020/30,000 tokens |
| `npm run validate:skill-usage` | PASS: 0 missing entries |
| `npm run adr:audit` | PASS: 2.47:1, threshold ≤ 10:1 |
| `git diff --check` | PASS |
| Published JCS vectors | PASS: all three byte lengths and SHA-256 values independently reproduced under Node `v22.22.3` during the prior review and remain unchanged |

These checks validate the repository and design artifacts at the reviewed commit. They do not claim that the proposed loader, manifest, CAS writer, fixtures, migration, or runtime matrix has been implemented or executed.

## Explicit Human decisions

The Human Architecture Approver must now explicitly approve or reject:

1. amended ADR-0018's flat immutable peer archive and digest-covered manifest/default-ref CAS;
2. two-party correction governance, approver allowlists, approval expiry/reapproval rules, and the prohibition on automatic replay/merge;
3. protected default-branch rules, ordinary non-force CAS publication, controlled trigger, least-privilege writer identity/credential ownership, rotation, and revocation;
4. the external commit/digest anchor and its custodian;
5. raw, aggregate, file-count, memory, canonical-output, normalized-output, and projection limits;
6. Node 22 Linux/macOS/Windows and Python 3.12 reference coverage, or a narrower explicit supported-host matrix;
7. repository-lifetime retention and the Security Reviewer + Human incident-only purge exception;
8. migration disposition for records lacking a genuine predecessor preimage; and
9. authority-switch and rollback owner/procedure.

If those decisions are accepted and recorded, the Human may restore specification readiness and separately authorize the planned Developer TDD work. This PASS itself does not do so.

## Handoff

- Next Action: Human review
- Next Owner: Human Maintainer / Architecture Approver
- Lifecycle Phase: `phase:blocked`
- Specification Readiness: Not ready pending Human decision
- Stop Reason: `human_review_required`
- Security Evidence: PASS at `5e904c6`; implementation and activation Security reviews remain required
- New Architecture Findings: None

## Completion check

| Item | Status | Notes |
|---|---|---|
| Scope match | Pass | Final independent architecture review of exact commit `d657068`. |
| Source grounding | Pass | SDD, ADR-0017/0018, Work Item, implementation plan, Security PASS, current repository feasibility, and historical implementation evidence inspected. |
| Quality gate | Passed | Architecture design may advance to the mandatory Human decision. |
| Tests/checks | Passed | 327 tests and all listed validators/checks passed. |
| Minimal change | Pass | Only this review record is added. |
| Risks/limitations | Pass | Implementation, hosted branch protection, writer credentials, runtime matrix, migration, rollback, and activation remain unverified future gates. |
| Unsafe action | None | No design/code/test/state/GitHub edit, push, implementation authorization, Security review, authority switch, or release action was performed. |
