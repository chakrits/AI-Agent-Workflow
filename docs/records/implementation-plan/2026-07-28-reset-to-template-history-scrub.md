# Implementation Plan

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | [GitHub Issue #129](https://github.com/chakrits/AI-Agent-Workflow/issues/129) |
| Governing decision | Owner decision comment `5140591557` (2026-07-31) and ADR-0016 |
| Change Type | Framework / Meta Change — destructive local reset tool, tests, and operator documentation |
| Risk Level | Medium — human-invoked and non-production, but `--apply` recursively deletes tracked and untracked content in targeted paths |
| Lifecycle Phase | `phase:planning`; no implementation-readiness claim is made by this document |
| Owners | Developer Agent (code/tests), Documentation Agent (operator docs and targeted navigation updates), independent Reviewer/QA Agent, Human Maintainer (approval and any destructive/manual history action) |
| Target Branch / Ticket | A Developer branch for Issue #129, created only after Human Maintainer accepts this revised plan and records specification readiness |

## 2. Objective and Owner-Approved Scope

Create a reusable working-tree baseline for a new project without carrying this repository's work-item, lessons-learned, or ADR history forward. The reset remains dry-run by default. Destructive application requires an explicit second confirmation and refuses to proceed when a targeted path is dirty.

The optional history phase creates a new root/orphan baseline for a new project. It is human-only and explicitly is not a security-grade purge: it does not guarantee removal from hosted Issues, pull requests, Actions artifacts, releases, caches, clones, or forks.

### In scope

- Clear `docs/records/work-items/` and `docs/records/lessons-learned/`, recreating their `.gitkeep` files.
- Replace `DECISIONS.md` with a blank structural stub.
- Preserve all content under `docs/records/qa/`.
- Preserve `README.md`, `PROJECT_INDEX.md`, and `docs/vault/00-Index.md`; make only evidence-backed targeted updates required by the final reset behavior or new operator guide.
- Add a pre-mutation inventory, explicit second confirmation, and dirty-target guard.
- Document the human-only optional new-root/orphan procedure and its limits.
- Require a post-reset full test suite and required validators to pass.
- Block destructive `--apply` invocation from CI while allowing harmless dry-run use.

### Out of scope

- Deleting or stubbing `docs/records/qa/`.
- Whole-file replacement of `README.md`, `PROJECT_INDEX.md`, or `docs/vault/00-Index.md`.
- Selective history rewriting or security/secret purge claims.
- Autonomous execution of `--apply`, orphan/new-root commands, force-push, remote deletion, or hosted-artifact cleanup.
- Changing unrelated validators, workflow policy, or project history.

## 3. Confirmed Evidence and Corrected Facts

| Evidence | Confirmed state |
|---|---|
| Issue #129 Owner decision | Preserve QA records; accept full post-reset tests/validators, targeted README/index updates, second confirmation plus dirty guard, human-only new-root path, and destructive-apply-only CI blocking |
| `npm run adr:audit` at plan reconciliation | 14 real ADRs and 41 decision keywords; the earlier claim of 15 ADRs was stale |
| `.github/workflows/` | Five workflow files exist; the earlier claim that the directory was absent was false |
| Historical record counts at plan reconciliation | 20 work-item files, 3 lessons-learned files, and 37 QA files |
| Disposable-clone reset evidence in Issue #129 | Required validators passed, but `npm test` failed 3 of 291 tests because two tests depended on live historical `TASK_LOG.md`/QA records |
| Index evidence | No direct historical-file links were found in `PROJECT_INDEX.md` or `docs/vault/00-Index.md`; cleared directories are recreated with `.gitkeep`, so whole-index stubs are unsupported |
| CI evidence | Reset is not currently invoked by GitHub or GitLab CI; the permanent guard needs to reject destructive apply only |

## 4. Design Decisions

### D1 — Reset contents

Add `docs/records/work-items/` and `docs/records/lessons-learned/` to `CLEARED_DIRECTORIES`. Add only `DECISIONS.md` to `STUB_CONTENT`. The decision-log stub must contain the document title and empty decision-log structure expected by `adr:audit`.

`docs/records/qa/` is not a cleared directory. A regression test must seed a sentinel QA record and prove it remains byte-identical after apply.

### D2 — Preserve navigation files

Do not add `README.md`, `PROJECT_INDEX.md`, or `docs/vault/00-Index.md` to `STUB_CONTENT`. Update only:

- the existing README reset section when counts, invocation, safety behavior, or the operator-guide link require correction;
- an index only when the new operator guide needs one discoverability link or a post-reset link check proves a specific target broken.

No speculative whole-file stubs or unsupported dead-link claims are permitted.

### D3 — Destructive apply contract

Dry-run remains the default. `--apply` alone must not mutate.

Before mutation the command must:

1. resolve the repository root and the exact targeted files/directories;
2. display the targets and the number of entries that would be deleted or replaced;
3. inspect git status for tracked modifications, staged changes, and untracked entries inside those targets;
4. refuse when any target is dirty, with the affected paths listed and no mutation performed;
5. require a separate explicit confirmation token in addition to `--apply`.

The implementation may choose a non-interactive token such as `--confirm-reset`, but the final spelling must be consistent across code, tests, README, and the operator guide. No dirty-state override is in the approved scope. This makes the guard deterministic and avoids silently authorizing loss of uncommitted content.

### D4 — History boundary

The operator guide may document an optional new-root/orphan baseline after the working-tree reset. It must:

- label every command human-only;
- require the human to inspect the reset diff and commit the clean baseline first;
- explain remote coordination and the irreversibility of replacing published history;
- state that this is not a security-grade purge and does not erase hosted or copied artifacts;
- direct suspected secret/sensitive-data removal to a separately approved security incident/purge process.

The reset script does not execute git-history commands.

### D5 — CI boundary

The CI regression scans `.github/workflows/*.yml`, `.github/workflows/*.yaml`, and `.gitlab-ci.yml`. It fails only when CI invokes the reset command/script with the destructive apply flag. A dry-run reference is allowed.

## 5. Affected Areas and Dependencies

| Area | Files / Components | Expected Change |
|---|---|---|
| Reset tool | `scripts/reset-to-template.mjs` | New cleared directories, `DECISIONS.md` stub, target inventory, dirty-target guard, second confirmation, and clear history-boundary output |
| Reset tests | `test/reset-to-template.test.mjs` | TDD coverage for scope, QA preservation, no-mutation guards, confirmation, idempotency, and post-reset behavior |
| Historical-data tests | `test/backfill-work-item-records.test.mjs` | Move assumptions about a populated live `TASK_LOG.md` to deterministic fixture data |
| Review-gate tests | `test/validate-review-gate.test.mjs` | Move historical QA-record assumptions, including Issue #106 evidence, to deterministic fixtures while preserving the original adversarial intent |
| Optional fixture support | `test/fixtures/` | Stable historical records only if the two affected tests cannot express them inline clearly |
| CI-safety test | Existing reset test or a focused new test file | Reject destructive apply in GitHub/GitLab CI; permit dry-run |
| Operator docs | New `docs/workflow/reset-to-template.md` | Exact current reset scope, guard behavior, post-reset checks, human-only new-root path, and non-purge limitation |
| Targeted navigation | `README.md`; `PROJECT_INDEX.md` and/or `docs/vault/00-Index.md` only if evidence requires | Correct reset counts/invocation and add minimal discoverability links |

Dependency order:

```text
Guard/test contract
  -> reset implementation
  -> historical-test fixture isolation
  -> post-reset full-suite proof
  -> operator documentation and targeted links
  -> independent review/QA
  -> human merge decision
```

## 6. Small Implementation Tasks

| Task ID | Task | Owner | Verification |
|---|---|---|---|
| IMP-001 | Add failing tests for clearing work items/lessons, stubbing decisions, and preserving a seeded QA sentinel | Developer Agent (TDD) | Focused tests fail for the intended missing behavior |
| IMP-002 | Implement the reset-scope declarations without touching README/index content | Developer Agent | Focused tests pass; dry-run lists the two added directories and `DECISIONS.md`, never QA |
| IMP-003 | Add failing tests for target inventory, `--apply` without second confirmation, and dirty tracked/staged/untracked targets; assert every refusal leaves the fixture unchanged | Developer Agent (TDD) | Each new negative case fails before implementation |
| IMP-004 | Implement preflight inventory, dirty-target refusal, and explicit second confirmation; keep dry-run default | Developer Agent | Focused guard tests pass; idempotency remains green |
| Checkpoint A | Review the IMP-001–004 diff and rerun the focused reset tests | Developer + Reviewer | No destructive path can run with only `--apply`; QA sentinel remains unchanged |
| IMP-005 | Refactor the two live-history-dependent test files to deterministic fixtures without weakening their assertions | Developer Agent (TDD) | Each test still fails when its guarded behavior is deliberately violated; focused files pass on both populated repo and reset fixture |
| IMP-006 | Add post-reset integration coverage that runs the full suite and required validators in a disposable fixture/clone | Developer Agent | All commands in Section 8 pass after apply |
| IMP-007 | Add CI regression coverage that rejects destructive `--apply` in GitHub/GitLab CI but explicitly accepts dry-run references | Developer Agent (TDD) | Positive and negative fixture cases pass |
| Checkpoint B | Run `npm test` and the required validators on the normal branch and after reset in a disposable clone | Developer + Reviewer | Both environments pass; the real working tree is never reset |
| IMP-008 | Write `docs/workflow/reset-to-template.md` and make only targeted evidence-backed README/index updates | Documentation Agent | Links resolve; wording matches the implemented flag and final scope |
| IMP-009 | Produce code-review evidence because `.mjs` changes trigger `validate:review-gate` | Independent Reviewer | Review record is added by the reviewer route and the gate passes |
| IMP-010 | Independently verify Issue #129 acceptance criteria against the exact commit; do not reuse Developer claims as QA evidence | QA Agent | AC-by-AC evidence and full post-reset command output |

Tasks are sequential through Checkpoint A because they share the reset contract. IMP-005 and IMP-007 may proceed in parallel after the guard contract stabilizes. IMP-008 must follow implementation so documentation records the final interface rather than predicting it.

## 7. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-01 | Dry-run is still the default and mutates nothing. |
| AC-02 | Reset clears `docs/records/work-items/` and `docs/records/lessons-learned/`, recreates their `.gitkeep`, and replaces `DECISIONS.md` with its approved blank stub. |
| AC-03 | Reset preserves all content under `docs/records/qa/`; a seeded sentinel proves byte-for-byte preservation. |
| AC-04 | `README.md`, `PROJECT_INDEX.md`, and `docs/vault/00-Index.md` are preserved except for targeted, evidence-backed updates; none is registered in `STUB_CONTENT`. |
| AC-05 | `--apply` without the explicit second confirmation exits non-zero before mutation. |
| AC-06 | Any tracked modification, staged change, or untracked entry in a target causes a non-zero refusal that lists dirty targets and performs no mutation. |
| AC-07 | A clean disposable clone with both destructive confirmations applies successfully and is idempotent. |
| AC-08 | After reset, full `npm test` and every required validator in Section 8 pass. |
| AC-09 | Historical assumptions in backfill/review-gate tests use deterministic fixtures without weakening the original assertions or deleting Issue #106 adversarial coverage. |
| AC-10 | CI regression coverage fails for destructive apply in GitHub or GitLab CI and passes for harmless dry-run invocation. |
| AC-11 | Operator documentation describes the exact reset scope, guard behavior, recovery limitations, and human-only optional new-root/orphan path, explicitly stating it is not a security-grade purge. |
| AC-12 | No agent autonomously runs destructive reset/history commands; independent Reviewer and QA evidence precede human merge approval. |

## 8. Verification Strategy and Commands

### Normal branch

```bash
npm test
npm run validate:contracts
npm run validate:project-state
npm run validate:skill-parity
npm run adr:audit
npm run validate:risk-register
npm run validate:review-gate
npm run validate:skill-usage
npm run validate:metrics
npm run validate:context-budget
git diff --check
```

### Post-reset disposable clone

The Developer/Reviewer creates an isolated disposable clone, seeds the QA-preservation sentinel, proves dirty-target refusal and no mutation, restores a clean state, then invokes apply with both approved confirmations. The exact second-confirmation flag comes from IMP-004 and must be copied from the implemented `--help`/documentation.

After apply, run:

```bash
npm test
npm run validate:contracts
npm run validate:project-state
npm run validate:skill-parity
npm run adr:audit
npm run validate:risk-register
npm run validate:review-gate
npm run validate:skill-usage
npm run validate:metrics
npm run validate:context-budget
git diff --check
```

Do not run destructive apply in the real Issue #129 worktree.

## 9. Rollback / Fallback

| Scenario | Action | Owner |
|---|---|---|
| Guard or reset test fails before merge | Revert the implementation commit(s) in the feature branch; no external state has changed | Developer Agent |
| Disposable-clone apply exposes an omitted target or failing validator | Stop, record evidence, and route back to Documentation/Developer planning; do not narrow the full-suite contract | Reviewer / Developer |
| Dirty-target handling is ambiguous | Fail closed with no mutation and return to Human Maintainer; do not invent an override |
| Human-only history procedure is questioned | Omit/defer the optional history phase and retain working-tree reset only; record the exclusion in a new ADR if accepted |
| Suspected secret or sensitive-data purge is requested | Stop and route to Security Reviewer plus Human Maintainer under a separate approved work item |

## 10. Risks and Controls

| Risk | Control |
|---|---|
| Loss of untracked or uncommitted target content | Exact preflight inventory, dirty-target refusal, explicit second confirmation, dry-run default |
| False confidence that history is erased | Human-only new-root wording and explicit non-security-purge limitation |
| Fresh template starts with a red suite | Full post-reset `npm test` plus required validators; fixture isolation for historical assumptions |
| QA evidence is erased by the template reset | Remove QA from reset scope and regression-test a sentinel |
| Navigation is damaged by speculative stubbing | Preserve README/indexes and require evidence for each targeted update |
| CI accidentally performs destructive reset | Regression test rejects only destructive apply invocations |

## 11. Planning Gate and Handoff

All Owner-raised scope ambiguities are resolved in this revision. However, this Documentation Agent does not self-approve specification readiness, change GitHub labels, or authorize Developer work.

| Field | Value |
|---|---|
| Current stage | Specification planning |
| Lifecycle phase | `phase:planning` in local project state |
| Specification readiness | Candidate revised plan; Human Maintainer review required before `status:spec-ready` |
| Next Action | Human review |
| Next Owner | Human Maintainer |
| After approval | Orchestrator may dispatch Developer Agent using `implementation-planning` output and `tdd-implementation`; independent Reviewer/QA remain mandatory |
