# Issue #277 Package 1 — Final QA Full Mode

| Field | Value |
|---|---|
| Work item | Issue #277 — Control-plane state integrity, Package 1 |
| Candidate | `df17d30` |
| Implementation | `87967f3` |
| Independent code review | `df17d30` — PASS |
| QA agent | QA Agent (GPT-5.6 Luna) |
| Date | 2026-09-21 |
| Verdict | **FUNCTIONAL PASS; PACKAGE BLOCKED FOR RUNTIME EVIDENCE** |

## Scope and method

This is an independent QA Full Mode rerun against the approved SA addendum, requirements,
SDD, QA plan and the independent code-review record. The prior Major QA-277-001 finding was
re-derived through the durable path. Test counts are execution evidence only; they are not an
acceptance criterion.

## Results

| Area | Result | Evidence |
|---|---|---|
| QA-277-001 policy-authoritative durable transition | **PASS** | `node --test --test-name-pattern='TC-007' test/task-state-machine.test.mjs` — policy evidence `{failure_description, repro}` succeeds; missing-key and matrix-only evidence reject before write with byte identity and guard cleanup. |
| Pure API compatibility | **PASS** | The same TC-007 run proves an attempted internal bypass on the exported pure transition wrapper still requires matrix evidence. |
| TC-024 strict destination intersection | **PASS** | Targeted `TC-021`, `TC-023`, `TC-024`, `TC-024b` run passed; an independent durable probe rejected policy-only fallback for `intake -> designing` with `ILLEGAL_TRANSITION_REJECTED`, unchanged bytes and cleaned guards. |
| CR-001–CR-015 regression | **PASS** | `node --test test/control-plane-state-integrity.test.mjs` — 18/18 in each of three independent runs; CR-015 journal/shard byte-identity barriers remain green. |
| Full repository regression | **PASS** | `npm test` — 785/785. |
| Named mutation: remove durable policy validation | **KILLED** | Temporary removal caused the TC-007 policy-evidence rejection test to fail; source restored and `git diff --check` passed. |
| Named mutation: reintroduce matrix evidence validation on durable path | **KILLED** | Temporary replacement with the exported matrix-validating constructor caused the TC-007 policy-only positive test to fail; source restored and `git diff --check` passed. |
| Required validators | **PASS** | `validate:contracts`, `validate:ci-parity`, `validate:project-state`, `validate:review-gate`, `validate:status-projection`, `validate:workflow-evidence`, `validate:risk-register`, `validate:skill-usage`, `validate:dispatch-receipts`, `validate:skill-parity`, `validate:adapter-parity`, `validate:edit-guards`, `validate:context-budget`, `validate:context-compatibility`, `validate:clearable-refs`, `validate:metrics`, `adr:audit`, and `git diff --check` passed. `validate:edit-guards` correctly exited 0 after reporting no valid hook payload on direct stdin invocation, so its payload-specific path was not exercised by that command. |
| Stryker/mutmut campaign | **BLOCKED** | No configured runner or dependency exists. `npm exec --offline -- stryker --version` returned `ENOTCACHED`; `mutmut` and `stryker` are not installed. |
| Process-kill/restart campaign | **BLOCKED** | No executable harness covers the required TC-040/TC-047 process-kill/restart boundaries. Existing `createStateIo` barriers and in-process tests do not prove restart convergence. |

## QA-277-001 disposition

The Major finding is closed for the implementation seam. `mutateTaskStateOnDisk()` validates
the policy row and uses a private policy-authoritative constructor for ordinary durable
transitions. The exported pure transition and resume wrappers force their historical matrix
evidence behavior. Actor authorization, matrix source/destination legality, policy lookup,
CAS/digest, resume approval, fencing, atomic write and rejection byte identity remain enforced.

The independent durable probe also confirms there is no policy-only destination fallback: a
policy-silent destination is rejected before any durable write.

## AC traceability

| AC | Status | QA basis |
|---|---|---|
| AC-001 | PASS (available scope) | Envelope and contract validators plus full regression pass. |
| AC-002 | PASS (available scope) | Existing backfill and workflow narrowing cases remain green. |
| AC-003 | PASS | Actor authorization and canonicalization regression remains green. |
| AC-004 | PASS | TC-007 policy-only success, missing-policy rejection, matrix-only rejection and byte identity pass. |
| AC-005 | PASS (available scope) | Pure/CLI CAS and state-machine regression pass; no new failure observed. |
| AC-006 | PARTIAL | Available fencing and stale-generation barriers pass; process-kill/restart campaign remains unavailable. |
| AC-007 | PASS (available scope) | Projection integrity and read-only validators pass. |
| AC-008 | PARTIAL/BLOCKED | Archive, journal and compensation barriers pass; complete crash/mutation campaign remains unavailable. |
| AC-009 | PASS (available scope) | Matrix, terminal and unknown-source regression cases pass. |
| AC-010 | PASS (available scope) | Read-only projection check passes with no working-tree change. |
| AC-011–AC-013 | PASS (available scope) | Adoption, compensation and terminal retry cases remain green; runtime crash evidence is still pending. |

## SEC-004 assessment

**Not runtime closed.** The available deterministic barriers and the two QA-277-001 mutations
pass, but the required complete mutation ledger and executable process-kill/restart campaign
are unavailable in this environment. Security Reviewer must assess the runtime evidence before
the Human merge gate.

## Handoff

**Next Action:** Dispatch

**Next Owner:** Security Reviewer

**Stop reason:** `runtime_evidence_required` — functional QA passed, but SEC-004 cannot close
without the missing mutation-runner/crash-restart evidence.

**Known limitations:** No Stryker/mutmut runner is installed or cached. No process-level
restart harness exercises TC-040/TC-047. `validate:edit-guards` was invoked without a hook
payload and therefore reported its documented skip path.

**No PR, push, merge, Issue mutation or production change was performed by QA.**

### Change summary

CHANGES MADE:
- Added this independent final QA record with functional verdict, named mutation results,
  validator output and SEC-004 assessment.
- Updated `PROJECT_STATUS.md` and `TASK_LOG.md` to route runtime evidence to Security Review.

NOTICED BUT NOT TOUCHING:
- Mutation-runner installation/configuration and process-kill/restart harness construction;
  these require environment or implementation changes outside this QA verification.
- Production code and Developer tests; QA only executed and temporarily mutated source for
  reversible verification.

CONCERNS:
- Do not mark Issue #277 complete or merge the branch until Security Reviewer evaluates
  SEC-004 runtime evidence and the Human Maintainer approves the merge.
