# Implementation Plan

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | https://github.com/chakrits/AI-Agent-Workflow/issues/129 |
| Change Type | Framework / Meta Change (tooling: `scripts/reset-to-template.mjs` + its tests + one new doc) |
| Risk Level | Low-Medium — no production code path, but the tool is intentionally destructive and human-invoked only |
| Owner | Developer Agent (implementation), Documentation Agent (new doc), Human Maintainer (scope decision + `--apply`) |
| Target Branch / Ticket | TBD at implementation start |

## 2. Background / Problem Statement

`scripts/reset-to-template.mjs` exists so a team can fork this repository and start their own project from a clean baseline instead of carrying this repo's own operational history forward. A pre-implementation impact review (this session, 2026-07-28) found the tool currently resets less than it should relative to that goal, and one of the fixes it needs would have broken CI if landed alone — that CI-breaking bug was found, TDD-fixed, and merged separately first (commit `8ef5245`, "fix: adr-audit.mjs treats a clean 0-ADR/0-decision slate as pass"). This plan covers the remaining, larger scope.

Gaps found against the stated goal:

1. `CLEARED_DIRECTORIES` in `scripts/reset-to-template.mjs` does not include `docs/records/work-items/` (20 files today) or `docs/records/lessons-learned/` (3 files today) — these two directories are this project's own issue-resolution history in the most literal sense, and are exactly what a forking team should not inherit.
2. `DECISIONS.md` (the ADR log) is not reset at all. It carries 15 real, project-specific ADRs today, several of which reference SDDs under `docs/superpowers/specs/` that the existing script already deletes — so even partial improvement here creates dead links unless handled together.
3. `PROJECT_INDEX.md` and `docs/vault/00-Index.md` link directly to specific historical documents (SDDs, work items) that Fix 1/Fix 2 remove. Neither index file is reconciled by the script today, so a reset repo ships with dead links in its own navigation aids.
4. The script only ever rewrites the working tree via a new commit. It does not touch `git log`, and does not say so. A team relying on `--apply` alone to "remove history" will still have every prior commit message, PR discussion, and file's old content fully present and retrievable via `git log` / `git show`.
5. No regression test currently asserts post-reset consistency (no dead links; other validators — `validate:risk-register`, `adr-audit`, `validate:project-state` — still pass against the reset state).

### IMP-000 decision (recorded 2026-07-28)

**Decided: Option A — wipe `DECISIONS.md` entirely to a blank stub**, matching the treatment already applied to `PROJECT_STATUS.md` / `TASK_LOG.md` / `CHANGELOG.md` / `RISKS.md`. Rejected alternative: hand-splitting "framework-reusable" ADRs from "project-specific" ones before wiping.

Rationale:

- **Merge/CI impact is zero either way, and stays zero under Option A.** `reset:template` is never invoked automatically anywhere in `.github/workflows/` or `.gitlab-ci.yml` — confirmed by direct inspection, not assumption. Landing IMP-001–IMP-004 only changes what `STUB_CONTENT`/`CLEARED_DIRECTORIES` *declare*; it does not run `--apply` against this repository. `main`'s real `DECISIONS.md` (15 ADRs), `docs/records/work-items/`, and `docs/records/lessons-learned/` remain fully intact after this plan's own PR merges. `adr:audit`, `validate:risk-register`, `validate:metrics`, and `validate:context-budget` all read the *real*, un-reset files on the PR branch, so none of them are affected by what the stub content declares.
- A hand-split approach (Option B) would carry the same zero merge-time impact, so it offered no CI-safety advantage — only extra ongoing maintenance risk (every future ADR needs manual "template-safe" tagging with no automated check that the tagging stays correct) for a benefit that's already available for free: git history is explicitly out of this tool's scope (see IMP-004/IMP-005 below), so any team that forks the repo can still `git log`/`git show` any ADR they want to keep, even after `--apply` wipes the *file*.
- The only way this change could ever actually affect `main`'s live `DECISIONS.md` is if someone ran `reset:template -- --apply` directly against this working tree (not a scratch clone) and committed the result. Section 7's verification commands explicitly require the scratch-clone-only pattern for exactly this reason.

## 3. Inputs Reviewed

| Artifact | Status | Notes |
|---|---|---|
| `scripts/reset-to-template.mjs` (current) | Available | Read in full; `STUB_CONTENT` / `CLEARED_DIRECTORIES` are the two extension points |
| `test/reset-to-template.test.mjs` (current) | Available | Fixture-driven, loops over `CLEARED_DIRECTORIES` — most new coverage is close to free |
| `scripts/adr-audit.mjs` | Available | Its 0-ADR/0-decision bug already fixed in commit `8ef5245`, prerequisite for Task 2 |
| `scripts/validate-risk-register.mjs`, `validate-project-state.mjs`, `validate-metrics.mjs` | Reviewed | Confirmed all three already pass cleanly against a reset (idle, zero-risk) state — no change needed |
| `PROJECT_INDEX.md`, `docs/vault/00-Index.md` | Reviewed | Both link directly to per-issue historical docs; format for a template-safe stub not yet designed |
| SDD / ADR for this change | Missing | Not written yet — Task 0 below |

## 4. Affected Areas

| Area | Files / Components | Expected Change |
|---|---|---|
| Reset tool | `scripts/reset-to-template.mjs` | Add `docs/records/work-items`, `docs/records/lessons-learned` to `CLEARED_DIRECTORIES`; add `DECISIONS.md`, `PROJECT_INDEX.md`, `docs/vault/00-Index.md` to `STUB_CONTENT`; print a git-history scope warning on `--apply` |
| Docs | New `docs/workflow/reset-to-template.md` | Documents the two-phase reset (file-content vs git-history) and the manual git-history commands a human must run separately |
| Docs | `README.md` | One-line pointer to the new doc from the existing scripts section |
| Tests | `test/reset-to-template.test.mjs` | Extend fixture coverage for the 2 new cleared dirs and 3 new stub files; add a dead-link consistency check; add a cross-validator pass-after-reset check |
| CI | `.github/workflows/*.yml`, `.gitlab-ci.yml` | No new job added; new regression test (IMP-008) asserts neither file ever invokes `reset:template` / `reset-to-template.mjs -- --apply`, so `reset:template` stays permanently manual-only |

## 5. Task Breakdown

| Task ID | Task | Agent / Owner | Files / Components | Verification |
|---|---|---|---|---|
| IMP-000 | ~~Human scope decision: wipe `DECISIONS.md` entirely vs. hand-split reusable-framework ADRs~~ — **Decided: Option A, full wipe** (see Section 2) | Human Maintainer | `DECISIONS.md` | Decision recorded 2026-07-28 — no longer blocking |
| IMP-001 | Add `docs/records/work-items` and `docs/records/lessons-learned` to `CLEARED_DIRECTORIES` | Developer Agent | `scripts/reset-to-template.mjs` | `npm run reset:template` dry-run lists both dirs with correct file counts |
| IMP-002 | Add `DECISIONS.md` to `STUB_CONTENT` — blank ADR log stub, same pattern as `PROJECT_STATUS.md`/`TASK_LOG.md`/`CHANGELOG.md`/`RISKS.md`, no partial retention | Developer Agent | `scripts/reset-to-template.mjs` | Dry-run lists `DECISIONS.md` as would-change; `npm run adr:audit` passes against the resulting stub (regression-proof via commit `8ef5245`) |
| IMP-003 | Add `PROJECT_INDEX.md` and `docs/vault/00-Index.md` to `STUB_CONTENT` as structural-skeleton-only stubs (Skills / Roles / Workflow doc sections, no history links) | Developer Agent | `scripts/reset-to-template.mjs` | Dry-run lists both; manual diff confirms no dangling links remain in the stub content itself |
| IMP-004 | Print an explicit git-history-scope warning at the end of `--apply` output | Developer Agent | `scripts/reset-to-template.mjs` (`main()`) | `npm run reset:template -- --apply` output includes the warning text |
| IMP-005 | Write `docs/workflow/reset-to-template.md` (two-phase reset: file content vs. git history; exact manual commands for the history step; explicit note that no agent should run the git-history step autonomously) | Documentation Agent | `docs/workflow/reset-to-template.md` | Linked from `README.md`; reviewed for accuracy against IMP-001–004's actual final file/dir list |
| IMP-006 | Regression tests: extend existing fixture loops for the 2 new dirs; add stub-content test for the 3 new files (mostly covered by existing generic `Object.entries(STUB_CONTENT)` loop); add a consistency test that scans post-reset stub files for dead relative links into any cleared directory; add a test running `runRiskValidation`, `runAudit`, `validateProjectState` against the reset fixture and asserting all pass | Developer Agent (TDD) | `test/reset-to-template.test.mjs` | New tests fail against pre-fix code, pass after; `npm test` green |
| IMP-007 | Update `SKILL_CATALOG.md` / `PROJECT_INDEX.md` (the *real*, non-reset copies on `main`) only if this plan's own new doc needs cataloguing | Documentation Agent | `PROJECT_INDEX.md` | Entry present and resolves |
| IMP-008 | Add a permanent CI-safety regression test asserting `reset:template` / `reset-to-template.mjs` is never invoked with `--apply` (or at all) from any `.github/workflows/*.yml` step or `.gitlab-ci.yml` job | Developer Agent (TDD) | `test/reset-to-template.test.mjs` (or a new `test/validate-ci-workflows.test.mjs`) | Test fails if a future edit adds the script to a CI file; passes today since neither file references it |

### Merge checklist for this plan's own PR (repo convention, not specific to the IMP-000 decision)

These are required regardless of which IMP-000 option was chosen, because they read the *real* files on the PR branch, not any reset output:

| Required check | What it needs |
|---|---|
| `validate:review-gate` | This PR touches `.mjs` — needs a `docs/records/qa/*-code-review.md` record added in the same diff |
| `validate:skill-usage` | New `TASK_LOG.md` row's Notes column needs `Skill Used:` or `No matching skill —` |
| `work-item-readiness-freshness` | Issue #129 needs lifecycle labels progressed to `status:spec-ready` (currently only carries `enhancement`) before a Developer begins IMP-001+ |
| `adr:audit`, `validate:risk-register`, `validate:metrics`, `validate:context-budget` | No action needed — all read the real, un-reset files on the branch and are unaffected by `STUB_CONTENT`/`CLEARED_DIRECTORIES` declarations |

## 6. Test Strategy

| Test Type | Required? | Scope | Owner |
|---|---|---|---|
| Unit Test | Yes | `test/reset-to-template.test.mjs` — new dirs, new stub files, idempotency (existing pattern already covers this generically) | Developer Agent |
| Regression / Consistency | Yes | New: dead-link scan across reset output; new: downstream validators (`adr-audit`, `validate-risk-register`, `validate-project-state`) pass against reset fixture | Developer Agent |
| CI-safety Regression | Yes | IMP-008 — `reset:template`/`--apply` never referenced in any CI workflow file | Developer Agent |
| Manual Verification | Yes | `npm run reset:template` dry-run against this real repo; `--apply` against a scratch clone, then `npm test` + full validator suite in that scratch clone | Human Maintainer / Developer Agent |
| Security Review | No | No auth/secrets/production-data surface touched | — |

## 7. Verification Commands

```bash
npm test
npm run reset:template
npm run adr:audit
npm run validate:risk-register
npm run validate:project-state

# Manual --apply verification (run in a disposable scratch clone, never this working tree):
git clone . /tmp/reset-template-scratch
cd /tmp/reset-template-scratch
npm run reset:template -- --apply
npm test
npm run adr:audit
npm run validate:risk-register
```

## 8. Rollback / Fallback Plan

| Scenario | Rollback / Fallback Action | Owner |
|---|---|---|
| IMP-001–004 land but a downstream validator turns out to fail against the new reset state | Revert the single commit; no migration or state to unwind since `reset:template` is never auto-run | Developer Agent |
| Human Maintainer later wants to revisit the IMP-000 decision (e.g., partial ADR retention instead of full wipe) | Re-scope IMP-002 only; IMP-001/003/004/005/006/008 are independent of that decision | Human Maintainer |

## 9. Risks / Blockers

| Risk / Blocker | Impact | Mitigation / Next Action |
|---|---|---|
| Git-history scope is out of this tool's reach entirely | A team could still misread `--apply` as "history-free" | IMP-004 (runtime warning) + IMP-005 (doc) close this gap without expanding the script into git-history territory, which stays a manual, human-run operation per this repo's Never/Ask-First boundaries |
| Index-file stub content (IMP-003) could itself go stale if `docs/workflow/`, `.agents/skills/`, etc. structure changes later | Low — same staleness risk as any hand-written template, not unique to this change | No action needed beyond normal doc maintenance |
| A future CI edit accidentally wires `reset:template -- --apply` into a workflow | Would silently wipe project state on every push/PR | IMP-008's regression test fails the build the moment that happens |
| This plan's own PR is blocked on repo-standard required checks unrelated to the IMP-000 decision | PR cannot merge without them regardless | See "Merge checklist for this plan's own PR" in Section 5 — code review record, skill-usage note, Issue #129 lifecycle labels |

## 10. Handoff

| To | Reason | Required Evidence |
|---|---|---|
| Human Maintainer | Apply lifecycle labels to Issue #129 (`status:spec-ready`) so Developer Agent can begin | This plan document |
| Developer Agent | Implement IMP-001–004, IMP-006, IMP-008 — no longer blocked, IMP-000 decided | This plan document, `tdd-implementation` skill |
| Documentation Agent | IMP-005, IMP-007 | This plan document |
| QA Agent | Independent verification once implemented, including the merge-checklist items in Section 5 | Task Breakdown verification column, Section 7 commands |
