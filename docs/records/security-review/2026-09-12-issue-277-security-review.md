# SECURITY_REVIEW.md: Control-Plane State Integrity & Architecture Remediation

## Metadata

- Work Item ID: Issue #277
- Title: Control-Plane State Integrity & Architecture Remediation (Package 1)
- Owner: Security Reviewer (`security-review`)
- Date: 2026-09-12
- Status: Security Approved (Round 9 — SEC-004 remediated in design; implementation evidence pending)
- Target Branch: `feat/control-plane-state-integrity`
- Governing SDD: `docs/records/sdd/2026-09-12-control-plane-state-integrity-sdd.md` (Round 9 append-only archive ledger, Draft)
- Governing Requirements: `docs/records/requirements/2026-09-12-control-plane-state-integrity-discovery.md`

---

## Scope

- **Change under review:** Control-plane architectural design hardening the task state machine, concurrency CAS verification, fail-closed shard locking with maintenance-only operator recovery, and status projection compilation. *Atomic stale-lock takeover was withdrawn in Round 4 and is no longer part of this change (ADR-0027).*
- **Trust boundaries touched:**
  1. Actor authorization and role policy enforcement during state transitions.
  2. Local-first file concurrency (multi-process race conditions, lost updates, TOCTOU/ABA lock risks) at two levels: the per-shard lock at `docs/records/work-items/.locks/{task_id}.lock` and the repository-wide projection lock.
  6. The operator lock-recovery surface (`unlock`) as a privileged, destructive maintenance boundary distinct from the engine's ordinary acquire/release paths.
  3. Task envelope cryptographic state hashing (RFC 8785 JCS SHA-256 integrity vs authenticity).
  4. Filesystem crash durability and atomic write operations (`wx` temp files, temp cleanup, `fsync`, directory sync).
  5. Shard archival lifecycle, exception rollback, and preflight drift reconciliation.

- **Scope narrowed during Round 5 (ADR-0031).** The durable envelope's `workflow_id` is reduced to
  `bug-fix` for Package 1. Only `bug-fix` shards reach the hardened control plane; the other four
  workflow types have no durable shard and hit the fail-closed unknown-`workflow_id` path. This shrinks
  the reviewed attack surface to the two live shards and their successors, and defers the other
  vocabularies to a later package under their own review.

---

## Scan Checklist

| Item | Status | Notes | Evidence |
|---|---|---|---|
| Hardcoded secret / insecure env fallback | Pass | No credentials, API tokens, or secrets involved in state machine control plane. | Clean repository scan across all touched files. |
| `DEBUG = True` in production settings | Pass | N/A (Node.js ESM architecture). | N/A |
| Raw SQL / ORM bypass | Pass | N/A (Local-first, Git-native JSON/Markdown storage; no SQL engine). | N/A |
| CORS allowlist (no wildcard) | Pass | N/A (Local CLI and script execution; no HTTP endpoint). | N/A |
| DRF `permission_classes` / `authentication_classes` present | Pass | N/A (Non-Django architecture). | N/A |
| Sensitive data in logs or URLs | Pass | Error objects emit error codes, task IDs, SHA-256 digests, and lock holder `pid`/`nonce`/`created_at`; no PII or sensitive system data leaked. | SDD Components 4 and 9 (reject codes and lock diagnostics). |
| Rate limiting on auth-sensitive endpoints | N/A | Lockfiles provide mutual exclusion against race conditions, not rate limiting. | Architecture review. |

---

## Threat Modeling & Security Analysis

### 1. Actor Authorization & Role Policy Boundary
- **Threat:** Rogue agents or compromised subagents attempting to bypass workflow stages (e.g. Developer self-certifying QA verification `verifying -> handoff`, or skipping human approval gates).
- **Planned Control:** `scripts/lib/task-state-machine.mjs` will enforce actor authorization strictly against `TRANSITION_MATRIX.actors`. Actor strings will be canonicalized to lowercase kebab-case against `ROLE_REGISTRY`. Unauthorized transitions will abort fail-closed with `UNAUTHORIZED_ACTOR`, leaving state untouched.
- **Residual Risk (Accepted & Documented):** Actor policy validation operates on caller-declared role identity without process authentication. Local callers can pass `--actor qa-agent`. Cryptographic agent signatures (e.g. Ed25519 payload signing) are out of scope for Package 1.

### 2. Concurrency, Lost Updates & Lock Identity
- **Threat:** Two concurrent processes interleaving mutations on one shard; two reclaimers racing over a stale lock such that one removes a replacement owner's live lock (TOCTOU/ABA); and, separately, a slow projection compiler overwriting a newer post-archive `PROJECT_STATUS.md` with its own atomically-complete but stale content.
- **Round 3 control withdrawn.** The previous review accepted an atomic-rename takeover and concluded "true atomic CAS under atomic-takeover lock will guarantee zero lost updates." **That verdict is withdrawn.** Maintainer review #5644452415 demonstrated a valid interleaving in which the second reclaimer's `renameSync` succeeds by moving the *replacement* lock, and no `fs`-level primitive available here makes removal conditional on the lock that was observed. The guarantee was unsupported as written.
- **Revised control (ADR-0027, amended Round 5).** The **engine** never removes a lock it does not own: no automatic reclaim code path exists, so the property "a live lock is never removed by another *engine* process" holds by construction. That is the whole of what fail-closed acquisition buys.
- **Race-safety claim for `unlock` — withdrawn (Round 5 Blocker 4).** Round 4 asserted that `unlock` "cannot remove a replacement lock" because it re-reads under "its own `wx` sentinel". **My analysis does not support that claim and it is withdrawn, not softened.** Two independent defects: (a) the sentinel was never given a pathname and no acquire or release path was ever required to honour it, so it constrains nothing; (b) even with the nonce compared correctly, read-nonce-then-unlink is a TOCTOU — a holder may release and a new holder acquire between the comparison and the `unlink`, and `unlink` is unconditional on the bytes observed. `unlock` **is** a reclaim path, and it is not race-safe. What replaces the claim: *`unlock` is a maintenance-only operation requiring explicit operator quiescence (`--quiesced`); nonce verification is retained as an operator-mistake filter, not a safety property.*
- **Classification predicate — the exposure is in the predicate itself, not only in the unlink window.** The Round 4 predicate classified a lock abandoned when it was older than 30 s **or** its PID was dead, which routed a **live, slow holder** into a destructive recovery path on age alone. That is a distinct defect from the TOCTOU and is fixed separately: abandonment is now classified by `ESRCH` only, and age becomes a diagnostic tier (`LOCK_ACQUISITION_TIMEOUT` carrying `LOCK_HELD_LONG` and holder details). The asymmetry is conservative — a live PID is not proof the original holder lives (PID reuse), but treating "live PID" as "not abandoned" can only withhold recovery, never authorize a wrong removal, so it cannot introduce a new integrity case. The residual cost is availability, recorded under SEC-003.
- **One-shot CAS does not fence a dispossessed writer.** A wrong quiescence assertion admits this valid
  shard interleaving: (1) A owns lock A, reads `S0`/`D0`, passes CAS, and pauses before write; (2) the
  operator removes A's lock; (3) B acquires lock B, reads the still-current `S0`, also passes CAS against
  `D0`, and pauses; (4) A writes `SA` and B writes `SB` (or the reverse). The later rename silently
  overwrites the earlier history event. Projection recovery admits the analogous four steps and has no
  shard-digest CAS backstop. The prior claim that wrong unlock necessarily degrades to `CAS_CONFLICT` is
  withdrawn. Quiescence is an external safety precondition, not something this protocol verifies.
- **Rejected route (recorded).** The alternative permitted by Blocker 4 was a lock-management sentinel honoured by every `acquire`, `release` and `unlock` path, with an interleaving test forcing replacement between check and unlink. Rejected because the sentinel has the identical abandonment problem as the lock it protects (a SIGKILL between sentinel acquire and release wedges the recovery path itself, with no non-recursive recovery command), it taxes every ordinary transition with a second mandatory `wx` round-trip to protect a rare manual operation, and it enlarges the concurrency implementation surface at precisely the point Round 4 proved `fs`-interleaving reasoning to be error-prone. Removing the claim is sounder than narrowing the window.
- **Revised control (ADR-0030).** Writer atomicity does not serialize read-compile-write, so `PROJECT_STATUS.md` gets its own mutation lock; active shards are recompiled only after it is held; the total lock order is shard lock -> projection lock and may not be inverted.
- **Deterministic test seam (OQ-2 resolved).** The design uses a narrow injected filesystem adapter
  through `createStateIo`; production callers receive Node defaults and tests inject one delegating
  adapter across lock unlink plus state/projection write and rename operations. No production test-only
  branch or timing sleep is permitted. This can reproduce both four-step counterexamples, including both
  shard writers passing CAS before either write.
- **Round 6 verdict superseded by the Human decision and ADR-0032.** The Maintainer rejected the
  maintenance residual. Round 7 therefore evaluates whether the fenced protocol closes every
  state-changing path; the result is recorded below.

### 2A. Round 7 ADR-0032 Adversarial Proof Review

ADR-0032 closes the original transition-writer and projection-writer counterexamples when every
commit participant uses the scope's non-reclaimable guard. The shared guard gives those operations a
total order: a recovery generation rename either precedes a writer's inside-guard generation check
(the writer fails `FENCING_TOKEN_STALE`) or follows the writer's state/projection rename (the writer
linearizes first). Crash boundaries around generation rename fail closed or leave a monotonic gap, and
an abandoned guard is an availability failure rather than permission for an online replacement owner.

The proof does **not** cover `archiveWorkItem()`. SDD Component 8 requires only the recoverable shard
admission lock before `renameSync(work-items/{id}, archive/{id})` (lines 625–637). It neither snapshots
the task generation nor acquires the task commit guard before either the forward archive rename or its
compensating rename. The implementation plan repeats that path at lines 398–411 and claims the admission
lock alone proves archive/mutation exclusion. That claim stops holding after false-quiescence recovery,
which ADR-0032 explicitly makes safe without trusting quiescence.

A valid counterexample is:

1. Archiver A acquires task T's admission lock at generation `g`, validates the terminal shard, and
   pauses immediately before the active-to-archive rename.
2. The operator incorrectly runs `unlock --task T ... --quiesced`. Recovery acquires T's commit guard,
   durably renames generation to `g + 1`, removes A's admission lock, and releases the guard.
3. A resumes without acquiring the commit guard or re-reading generation and renames the shard into
   `archive/T`. This is an old-generation state-changing commit after recovery's linearization point.
4. A can proceed into projection update, or a newly admitted B can race the now-missing active path.
   Either outcome violates the claimed invariant that false quiescence only revokes old work and that
   mutation/archive cannot overlap; the protocol has no named mechanism that rejects A.

The compensation path has the same defect: after a failed projection update, A may rename
`archive/T` back to `work-items/T` without task-guard serialization or generation validation. This can
restore a path after a newer generation has been admitted. The minimum owning-role correction is for
the SA to make archival a fenced task commit: snapshot task generation while admitted; acquire the task
commit guard before the forward rename; inside the guard re-read generation, envelope/digest, identity,
and terminal eligibility; perform and directory-sync the rename; then release the task guard before
acquiring the projection lock, preserving the declared order and the rule that commit guards are never
nested. The compensation operation also needs a named fenced protocol; it must not blindly rename after
releasing task serialization. The SDD and plan must supply a deadlock-free sequence or durable recovery
state for coordinating archive commit, projection commit, and compensation.

#### Required ordering/proof matrix

| Attack or crash ordering | Outcome under `0a3997c` | Control / disposition |
|---|---|---|
| A pauses before task commit-guard acquisition; recovery increments; B gets `g+1` | Safe for transition writers | A checks generation inside the same task guard and fails stale. |
| A already owns task commit guard when recovery begins | Safe for transition writers | Recovery waits; A's rename linearizes first. |
| Recovery crashes before generation rename | Integrity fail closed | Old generation remains authoritative; stranded guard requires offline repair. |
| Recovery crashes after generation rename, before admission unlink | Integrity fail closed | New generation is durable; guard/admission may wedge; retry may create a gap. |
| Recovery crashes after unlink, before guard release | Integrity fail closed | New generation is durable; stranded guard blocks commits. |
| Writer crashes before state rename | Integrity fail closed | Old state remains; guard may wedge. |
| Writer crashes after state rename, before directory sync | No silent competing writer while guard is authoritative; crash durability still requires fault tests | Rename is the logical linearization point; restart may expose old or new durable state, then integrity validation must fail closed if malformed. |
| Projection compiler predates recovery | Safe | Inside-projection-guard generation check rejects the stale compiler. |
| Generation restart/archive/rollback/ABA | Safe as specified | Stable records survive archive/restart; reuse/reset/selective rollback forbidden; missing/corrupt/exhausted records fail closed. |
| Malformed guard/generation | Integrity fail closed | Guard is never online-reclaimed; generation strict parsing returns named errors. |
| Old owner unlinks replacement commit guard | Safe under the documented engine protocol | `wx` prevents replacement until owner unlink; F2 additionally requires owner-nonce release. Offline repair is outside online concurrency after writers stop/restart. |
| Path traversal through `task_id` | Bounded by schema/entry validation | `^[a-z0-9_-]+$` prevents separators and dot-leading IDs; implementation must apply validation before path derivation. Parent-component symlink replacement remains inside the trusted local-filesystem assumption and should receive a fail-closed test if that assumption changes. |
| Cross-scope lock order | Safe for transition/projection protocol; archive proof incomplete | Task admission → projection admission; applicable guards are not nested. Archive correction must retain this property. |
| Candidate re-tagging after stale refusal | Forbidden, evidence pending | Retry must release/reacquire/reread/recompute; F3 mutation must kill a re-tag mutant. |
| **Archive A pauses before rename; recovery increments and unlinks admission; A renames** | **Unsafe** | **No task commit-guard/generation check exists in Component 8; High blocker.** |
| Archive compensation after recovery/new admission | **Unsafe / unspecified** | **No fenced compensation protocol or durable archive transaction state is named.** |


### 2B. Round 8 Re-review of Journaled Fenced Archival (`35b0ab7`)

The forward and compensating renames now acquire the task commit guard and check generation, identity,
digest, journal transaction, and both physical paths inside the guard. This closes the Round 7 ordering:
if recovery increments before A enters the guard, A fails stale; if A already holds the guard, A's rename
linearizes first and recovery waits. Projection publication uses its own guard after the task guard is
released, so there is no nested-guard cycle and a stale projection compiler still fails its generation
check. The design also correctly avoids claiming cross-file atomicity.

Two journal-state gaps prevent approval:

1. **The terminal journal cannot identify its terminal outcome.** The declared record contains only
   `{schema_version, txid, task_id, generation, source_digest, phase}` and `phase: complete` is used after
   both a successful archive and a successful compensation (SDD lines 629–665). Yet reconciliation says
   `complete` must match its "declared final location" (line 671), although no field or distinct terminal
   phase declares whether the shard must be archive-only or active-only. After restart, `complete +
   active-only` can mean a valid compensated result or an invalid reversal of a completed archive. A
   reconciler cannot distinguish them from the documented record and therefore cannot safely validate
   or repair the projection.
2. **A generation bump strands an incomplete journal without an adoption/supersession transition.** A
   recovery may legitimately increment from `g` to `g+1` after the forward rename but before finalize,
   or after compensation rename but before its phase/finalize writes. The old executor correctly fails
   `ARCHIVE_FINALIZE_STALE`/`ARCHIVE_COMPENSATION_STALE`, but the only forward entry rule rejects every
   non-complete journal and journal records are never deleted or overwritten (lines 633–642). Lines
   653–654 promise that a latest-generation reconciler completes the `moved` journal, but no rule defines
   how it may bind generation `g+1` to a journal carrying `g` without violating the stale-generation and
   no-retag guarantees. `prepared + active-only` and `compensated + active-only` have the same hole.

These are fail-closed under a conservative implementation, so the original silent-overwrite exploit is
removed. They nevertheless create an indefinite task/projection recovery wedge and leave room for two
incompatible implementations, one of which could retag stale intent or select the wrong physical
outcome. The blueprint must define the state transition before QA can derive deterministic assertions.

Minimum SA correction:

- Give terminal journal states an unambiguous outcome, for example distinct `archive_complete` and
  `compensation_complete` phases, or an immutable `intended_outcome` plus a terminal `outcome` field.
- Define one guard-serialized adoption/supersession protocol for every non-complete phase when current
  generation exceeds journal generation. It must validate `txid`, exact digest/identity, active/archive
  path cardinality and the already-linearized direction; create a new immutable attempt/version rather
  than relabel a stale candidate; and state when a fresh archive may begin.
- Specify strict journal schema/errors, collision-resistant `txid` generation, exclusive initial create,
  conditional phase advancement under the task guard, and fail-closed handling for malformed/tampered or
  regressed phases.
- Expand crash outcomes before directory sync to include every allowed post-restart physical state; map
  `prepared + both/neither` and every phase/path/outcome combination explicitly to adopt, retry, conflict,
  or offline inspection.

#### Round 8 evidence matrix

| Ordering / fault | Result at `35b0ab7` | Verdict |
|---|---|---|
| Old archiver pauses before forward guard; recovery bumps/unlinks; A resumes | Inside-guard generation mismatch rejects A before rename | Safe in design |
| A holds forward guard; recovery starts | A rename linearizes first; recovery waits | Safe in design |
| Stale compensator after recovery or newer admission | Generation/txid/digest/path predicates reject rename | Safe in design |
| Forward/compensation rename followed by crash before phase write | Journal plus exact one-path/digest can identify the rename direction | Safe only when generation is unchanged; bumped-generation adoption is unspecified |
| Crash before/after either parent-directory sync | Post-restart path set is not exhaustively enumerated for `prepared` | Incomplete fail-closed mapping |
| Projection publish between task phases | Guards do not overlap; fresh projection compile is serialized | Safe in design |
| Recovery bump while journal is `moved`, before finalize | Old finalize fails, but no defined latest-generation journal adoption | **Blocking gap** |
| Recovery bump after compensation rename, before `compensated`/finalize | Physical active-only proves a rename, but no generation supersession rule exists | **Blocking gap** |
| `complete + active-only` after restart | Could be valid compensation or invalid reversal; journal has no outcome discriminator | **Blocking ambiguity** |
| Duplicate destination / both paths / neither path | Named conflict for `moved`; other phase combinations are not exhaustive | Partial; expand matrix |
| Malformed/tampered journal or duplicate `txid` | Plan names tests, but SDD defines no strict schema, error codes, initial-create or conditional phase-write rule | Incomplete contract |
| Task/projection commit-guard ordering | Guards are explicitly non-nested | Safe; availability may still wedge on abandoned guard |
| Generation restart/archive/rollback/reuse/exhaustion | Stable monotonic generation and fail-closed errors retained | Safe as specified |
| Candidate re-tagging | Still forbidden for state candidates; journal generation adoption is undefined | Must distinguish safe transaction adoption from forbidden candidate retagging |



### 2C. Final Round 9 Review of Append-Only Ledger (`4e12be0`)

The second SA rework resolves both Round 8 blockers. Immutable `intent.intended_outcome` plus distinct
`terminal_archived`/`terminal_compensated` phases and constrained `terminal_outcome` remove restart
ambiguity. Generation advancement no longer retags a stale attempt: adoption conditionally appends a
fresh, generation-bound attempt under the task guard, preserves the original intent and source binding,
and requires reread/recompute before any rename or projection publish.

The 24 phase/path cells, each split by equal/greater/lower generation, admit automatic action only when
one exact source location exists with the journal-bound identity and digest. `B`, `N`, terminal/location
mismatch, generation regression, malformed/tampered ledger, and every unlisted adoption fail closed.
The two post-rename/pre-ledger-update single-path states prove which directional rename already
linearized; adoption records that fact under a new attempt rather than inferring intent from an ambiguous
location. This closes the old archiver and stale compensator attacks without trusting `--quiesced`.

#### Final adversarial evidence matrix

| Attack / boundary | Derived result | Design verdict |
|---|---|---|
| Old archiver pauses before task guard; recovery bumps generation | Inside-guard generation check rejects old executor; zero rename | Closed |
| Archiver holds task guard when recovery begins | Archive rename and ledger advance precede recovery bump; recovery waits | Closed |
| Stale compensator after recovery/new executor | Old attempt/generation/revision mismatch; zero reverse rename | Closed |
| `prepared/A`, equal or greater generation | Validate exact digest; equal resumes, greater appends attempt and recomputes before forward rename | Closed |
| `prepared/R`, equal or greater generation | Physical state proves forward rename linearized; guarded phase advance/adoption records it | Closed |
| `archive_moved/R`, including generation adoption | Fresh projection compilation/publish precedes archived terminal | Closed |
| `compensation_requested/R` | Only this directional phase authorizes reverse rename | Closed |
| `compensation_requested/A` after crash | Exact active digest proves reverse rename linearized; guarded phase advance/adoption records it | Closed |
| `compensation_moved/A`, including generation adoption | Fresh active projection precedes compensated terminal | Closed |
| Any transitional `B` or `N` | No adoption or repair; Human/offline inspection | Integrity fail closed; availability residual |
| Terminal archived at A/B/N or terminal compensated at R/B/N | Terminal/location mismatch or ambiguity; no mutation | Integrity fail closed |
| Current generation lower than attempt | `FENCE_GENERATION_REGRESSION`; no mutation | Closed |
| Missing/malformed generation or exhausted safe integer | Existing fence errors stop all mutation; no reset/reuse | Closed |
| Restart/archive/compensation/offline guard repair | Generation and ledger retained; selective rollback/deletion/task-ID reuse/raw `mv` forbidden | Closed under documented operational boundary |
| Crash before initial journal completion | Malformed `wx` artifact; no inferred intent, offline inspection | Integrity fail closed; availability residual |
| Crash before/after rename, parent sync, ledger phase persist | Restart is one exact single-path pre/post state or fails into B/N; matrix resumes only exact cells | Closed; runtime fault evidence pending |
| Duplicate executor or stale journal update | Task guard plus exact txid/revision/attempt/generation/phase/outcome CAS rejects stale update | Closed |
| Duplicate txid/attempt or immutable-intent mutation | Strict validation and whole-ledger digest reject; UUID source is injected cryptographic UUID | Closed for accidental/protocol corruption |
| Candidate/projection reuse after adoption | New attempt requires reread and fresh recomputation; mutants must kill retag/reuse | Closed in design; implementation evidence pending |
| Projection compiler predates projection recovery | Inside-projection-guard generation check rejects stale publish | Closed |
| Projection succeeds then crash before task terminal | Matrix recompiles and idempotently republishes before finalizing | Closed |
| Projection fails/crashes before compensation request | Remains archive-moved and retries projection; reverse direction is not inferred | Closed |
| Task/projection lock ordering | Admissions retain shard→projection order; commit guards never overlap or wait while nested | No guard deadlock cycle |
| Path traversal/symlink | Task ID validation prevents separators/dot-leading paths; parent replacement is outside the declared trusted local-workspace boundary | No new in-scope path traversal |
| Hostile local writer recomputes ledger digest | SHA-256 is integrity, not authenticity, as already recorded in SEC-002 | Accepted existing residual; no claim of a cryptographic digest chain |

`journal_digest` protects the complete canonical ledger and conditional revision checks protect protocol
updates; it is not a cryptographically authenticated hash chain. That distinction is acceptable only
under the documented local-workspace trust boundary and SEC-002. Planned tests and mutants remain
mandatory and are not treated as executed evidence here.


### 3. State Tampering vs State Integrity (Integrity without Authenticity)
- **Threat:** Accidental, stale, or concurrent disk modifications; manual tampering with task state history or sequence numbers.
- **Planned Control:** ADR-0028 specifies `digestTaskEnvelope(envelope)` which excludes top-level `state_digest` and computes canonical RFC 8785 JCS SHA-256. `validateEnvelopeSchema` will enforce `data.state_digest === digestTaskEnvelope(data)` on load, transition, and resume.
- **Security Scope Clarification:** SHA-256 provides deterministic **state integrity and accidental corruption detection**, not **malicious tamper authentication** (an attacker with local filesystem write access can recompute the hash). Full authentication requires HMAC or digital signatures (deferred).

### 4. Mid-Write Corruption & Lock Abandonment
- **Threat:** System crash or power loss mid-write leaving truncated JSON, or abandoned locks blocking progress indefinitely. `openSync(lockPath, 'wx')` followed by payload write also has a crash window that can leave an empty or partial lock with no usable nonce.
- **Planned Control:** POSIX atomic state writing uses `wx` temp files, cleanup, data sync, rename, and directory sync. Lock acquisition strictly parses holder records. Empty, truncated, invalid-JSON, or schema-invalid records raise `LOCK_MALFORMED`, remain untouched by automatic paths, and name a quiescence-gated malformed recovery command that does not require an unavailable nonce. Recovery re-reads before unlink and refuses `LOCK_BECAME_VALID` when the current record is valid; it remains non-race-safe and inherits SEC-004.

---

## Findings

| ID | Severity | Description | Fix-Before-Merge? | Status | Evidence |
|---|---|---|---|---|---|
| SEC-001 | Medium | Caller-declared actor parameter is not cryptographically signed. | No | Documented / Accepted | SDD NG-001; scoped as transition policy validation; cryptographic identity deferred. |
| SEC-002 | Medium | SHA-256 provides integrity against accidental mutation, not cryptographic authenticity against malicious local attackers. | No | Documented / Clarified | SDD Component 3; integrity verification enforced; authentication deferred. |
| SEC-003 | Medium | Fail-closed locking converts a liveness risk into an availability risk: an abandoned shard lock wedges one work item, and an abandoned projection lock wedges every status update including CI, until an operator intervenes. **Widened by the Round 5 predicate change:** narrowing abandonment to dead-PID-only means fewer locks are auto-classified, so an old-but-live lock, and a lock whose writer died off-host while its PID number is coincidentally live locally, now wedge until an operator establishes quiescence and runs `unlock --quiesced` — a slower, more deliberate intervention than before. | No | Accepted / Documented | ADR-0027 (Round 5 amendment), ADR-0030, Requirement R-006. Accepted deliberately: this is availability traded for integrity. An automatic clear is the same unsound primitive Round 4 rejected, a wrong clear on the projection lock corrupts repository-wide state, and admitting a live slow holder to the recovery path was itself the Round 5 Blocker 4 exposure. Critical sections are short; every refusal names its recovery command and its holder. |
| SEC-004 | High | False-quiescence admission recovery previously permitted old-generation transition, projection, archive, or compensation commits. ADR-0032 now serializes each rename/publish with its scope guard and durable generation; append-only ledger attempts fence archive adoption and require fresh recomputation. | Yes until implementation evidence | **Remediated in design / Evidence pending** | Round 9 §2C and the SDD 24-cell matrix. No reviewed cell permits an old-generation rename or stale projection publish; ambiguous cells fail closed. |
| SEC-005 | Medium | A repairing `--check` would mutate the repository from inside a read-only governance gate and could mask the drift it exists to detect. | Yes | Design corrected | ADR-0029: detection is pure, repair is explicit; TC-028 asserts whole-tree byte equality. |
| SEC-006 | Medium | The Round 4 abandonment predicate (`age > 30 s` **or** dead PID) admitted a live, slow holder into a destructive operator-recovery path on age alone; the predicate, not merely the unlink window, was part of the exposure. | Yes | Design corrected | SDD Component 4 Acquisition; ADR-0027 Round 5 amendment (a). Abandonment is now dead-PID-only; age is a diagnostic tier. Evidence: TC-014c. |
| SEC-007 | Medium | A crash after exclusive lock creation but before payload completion leaves an empty/partial lock that cannot supply a nonce. | Yes | Design corrected; evidence pending | Strict parsing returns `LOCK_MALFORMED`; explicit `--malformed --quiesced` recovery requires no nonce, re-reads before unlink, and refuses if the record became valid. QA must cover shard and projection locks with empty, truncated, invalid-JSON, and schema-invalid payloads. |

---

## Assumptions

- Operating environment is POSIX-compliant filesystem supporting atomic directory rename, `wx` flags, and `fsync`.
- Local agents operate within designated workspace boundaries.

---

## Security Verdict

- **Reviewer:** Security Reviewer (`security-review`)
- **Decision:** **PASS at blueprint/design level — proceed to QA Full Mode**
- **SEC-004 status:** **Remediated in design; implementation and mutation evidence pending.** Every reviewed
  transition, projection, forward archive, compensation, adoption, crash and generation ordering either
  serializes at the applicable non-reclaimable guard or fails closed without a state-changing commit.
- **Residuals:** Abandoned/malformed commit guards or ambiguous `B`/`N` ledger states sacrifice
  availability and require offline Human recovery. Ledger/state digests detect accidental/protocol
  corruption but do not authenticate a hostile local filesystem writer (SEC-002).
- **Required QA evidence:** Execute all phase × paths × generation cells; barrier every ledger persist,
  rename, parent sync, projection outcome, adoption and terminal write; kill mutants for collapsed
  terminal outcomes, retagged attempts/candidates, skipped CAS predicates, ambiguous auto-repair and
  overlapping commit guards.
- **Next owner:** `qa-agent` using `functional-test-design` in Full Mode. Implementation remains blocked
  until QA reconciles the plan and approves the blueprint; this review does not claim production code or
  tests exist.
- This verdict reviews blueprint commit `4e12be0` only.
