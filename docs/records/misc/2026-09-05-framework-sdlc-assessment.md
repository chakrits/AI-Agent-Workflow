# Framework Assessment — SDLC Roles, Skills, and Host Neutrality

Date: 2026-09-05 · Baseline: `main` @ `34198d5` (blank-template baseline after PR #205/#207)
Scope: re-derive the state of the open improvement backlog from measured repository evidence, and
identify what is actually improvable now for a **single-user** SDLC workflow across GitHub and GitLab.

Every number below was measured on this baseline, not carried over from an earlier record.

## 0. Health baseline

| Signal | Measured |
|---|---|
| `npm test` | 503 / 503 pass |
| Validator suite | all pass (contracts, project-state, skill-parity 38/38, adr:audit, risk-register, review-gate, skill-usage, metrics, context-budget, clearable-refs, workflow-evidence, dispatch-receipts) |
| Skills | 38, mirrored across `.agents/`, `.claude/`, `.agent/`, hash-parity enforced |
| Role adapters | 11, in `.claude/agents/` only |
| Canonical context budget | **29,985 / 30,000 — 15 tokens headroom** |
| Open issues | 8 |
| Worktrees | 12 (6 stale/detached/prunable) |

The framework is healthy as a policy-and-validation toolkit. Nothing below is a defect in what
exists; the findings are about what the structure cannot currently express.

---

## F-0 — CRITICAL: `reset-to-template` has destroyed the architectural decision log twice

Found while investigating PR #204's pending closeout label. `scripts/reset-to-template.mjs` stubs
`DECISIONS.md` as if it were a clearable record. It is not — it holds live architectural decisions
that govern still-open work items.

Measured ADR count in `DECISIONS.md` across the two resets:

| Commit | Date | ADRs | Event |
|---|---|---|---|
| `afe8091` | 2026-08-02 | **17** | last state before the first reset |
| `93203e2` | 2026-08-12 | **0** | reset to template baseline (#162) |
| `eeb731f` / `abdd511` | 2026-08-12 | 1 | ADR-0014 re-added by Issue #166 |
| `3f28e77` | 2026-08-22 | 2 | ADR-0019 (T2-B no-go freeze) added by PR #204 |
| `aa2a871` | 2026-08-22 | **0** | blank-template reset (#205) |

Current `DECISIONS.md` reads `No decisions recorded yet.`

**This is not merely lost history — it broke live work.** Open Issues **#132 and #133 both cite
ADR-0017** ("Use One Authoritative Path During Progressive Context and Status Migration"). Both are
`phase:blocked`. ADR-0017 was destroyed by the first reset on 2026-08-12 and never restored, so two
blocked work items are governed by a decision that no longer exists in the canonical log. Likewise
Issue #203 is blocked on the T2-B no-go freeze recorded as ADR-0019, destroyed nine days after it
was written.

**No validator can see this.** `scripts/adr-audit.mjs` compares ADR count against decision keywords
in `TASK_LOG.md`. A reset blanks both files at once, so the ratio becomes `0 / 0 = 0.00:1` and the
audit reports PASS. The control that exists to protect decision-recording discipline is structurally
blind to total loss of the thing it protects.

Everything is recoverable — `git show afe8091:DECISIONS.md` holds all 18 ADR-0002 through ADR-0018 —
but recovery has not happened, and nothing will prompt it.

**Correction, in order:**

1. Restore the still-governing ADRs to `DECISIONS.md`, ADR-0017 first since two open issues depend on it.
2. Remove `DECISIONS.md` from `STUB_CONTENT` in `scripts/reset-to-template.mjs`, or reduce the stub to
   a header that preserves existing ADR bodies. `RISKS.md` is the same class and needs the same call.
3. Make `adr-audit.mjs` fail closed when the ADR count drops relative to the previous commit, so a
   future regression is caught rather than reported as PASS.

## F-1 — CRITICAL: the framework has no room left to describe new roles or skills

`scripts/validate-context-budget.mjs` enforces a 30,000-token ceiling over eight canonical files.
Current total is **29,985**. Fifteen tokens is roughly sixty characters.

Two of those eight files are exactly where new role and skill definitions must go:

| Canonical file | Tokens |
|---|---|
| `docs/workflow/role-definitions.md` | 9,365 |
| `docs/operating-model/SKILL_CATALOG.md` | 7,121 |

**Consequence.** Every goal in this request — role-split agents, SDLC work-instruction skills,
GitLab parity — needs text in one of those two files. None of it can land until the budget is
resolved. This is the binding constraint, not a side issue.

**Three levers, and a conflict the Human Maintainer owns.**

1. Relocate prose into uncounted files with a compact canonical pointer. Proven and budget-neutral:
   Issue #166 did exactly this with `docs/workflow/task-execution-mode.md`, since `CANONICAL_FILES`
   is a fixed eight-entry array, not a directory glob.
2. Reduce what is already there — `role-definitions.md` at 9,365 tokens is the largest single item
   and has never been audited for duplication against `AGENTS.md`.
3. Raise `TARGET`. `validate-context-budget.mjs:9` requires this be deliberate and documented — but
   **Issue #178's own scope rules forbid it**: *"Do not raise the 30,000-token context target to make
   validation pass."*

Lever 3 is therefore blocked by approved policy. If the SDLC expansion this request describes cannot
fit under levers 1 and 2, that policy has to be revisited explicitly, by a human, on the record.

---

## F-2 — MAJOR: role adapters have neither host neutrality nor a drift gate

The 38 skills are mirrored across three trees and hash-checked by `validate:skill-parity`.
The 11 role adapters are not:

| Path | Contents |
|---|---|
| `.claude/agents/` | 11 role adapters, 621 lines |
| `.agents/agents/` | **does not exist** |
| `.agent/agents/` | **does not exist** |

`scripts/validate-skill-parity.mjs:7-9` enumerates only `*/skills`. Nothing checks agent adapters for
drift, and no non-Claude host has role adapters at all.

This is the exact layer the request wants to strengthen, and it is the least protected one.

**This is IMP-006.** Issue #178 lists six workstreams; IMP-006 is *"canonical-source consolidation and
adapter conformance"*. IMP-001 (#179) closed, IMP-002 (#132) and IMP-003 (#133) are blocked, IMP-004
(#192) and IMP-005 (#193) are at `phase:planning` — **IMP-006 was never opened as an issue**. This
finding and the roadmap's own missing workstream are the same thing, which makes fixing it a
resumption of approved work rather than a new proposal.

---

## F-3 — MAJOR: six of eleven roles have no skill routing, and one role has no skill at all

Re-derived by matching bare skill names inside each adapter file:

| Role adapter | Skills it routes to |
|---|---|
| `qa-agent` | 15 |
| `sa-agent` | 5 |
| `developer-agent` | 4 |
| `security-reviewer` | 3 |
| `data-agent` | 1 |
| `ba-agent`, `config-agent`, `documentation-agent`, `orchestrator-agent`, `pm-agent`, `release-agent` | **0** |

Two different problems are hiding in that last row:

- **Adapter gap (five roles).** The skills exist and are simply not wired: `ba-requirement-analysis`
  and `requirement-brainstorming` for BA, `documentation-closeout` for Documentation,
  `dynamic-workflow` for Orchestrator, `management-status-update` for PM, `data-config-change` for
  Config. Cheap to close.
- **Genuine skill gap (one role).** No skill among the 38 matches release or deployment. Checked in
  all three places: the skill list, `SKILL_CATALOG.md` (Release Agent appears in 5 rows, always as a
  downstream *"Next Skill / Agent"* target, never as an owner), and `role-definitions.md`. **The
  Release Agent is a routing destination that owns no work instruction.**

Skill distribution is also lopsided against SDLC phases: 9 of 38 skills are API-specific and 3 are
frontend-specific, while release, deployment, and operational readiness have none.

---

## F-4 — MAJOR: GitLab support splits into two very different tiers

`docs/workflow/platform-readiness.md` is honest about this — it states plainly that GitLab CI performs
no API readiness enforcement and that a GitLab API bot needs its own approved security work item. So
this is not a documentation gap. It is two separate gaps of very different cost:

**Tier 1 — three portable validators simply missing from `.gitlab-ci.yml`.** No design work, no
credentials, testable immediately:

- `validate:dispatch-receipts`
- `validate:workflow-evidence`
- `validate:clearable-refs`

GitHub's `validate-contracts.yml` runs 12 validators; `.gitlab-ci.yml` runs 9 of them. The three above
are pure Node scripts with no host API dependency — there is no reason for their absence beyond
having been added to one file and not the other. This is a drift class that will recur.

**Tier 2 — five GitHub API-driven gates with no GitLab analogue.** `work-item-readiness-refresh`,
`documentation-impact-gate`, `documentation-sync`, `dispatch-receipt-notify`, `status-runtime-matrix`.
Closing this needs GitLab credentials, a token-scope decision, and the security review the repository
has already fenced off. It is a work item with a human gate, not a task.

Eight scripts carry GitHub coupling (`validate-dispatch-receipts.mjs` most heavily, 7 references).

**Single-user note.** Tier 2 buys least for a solo user: its value is enforcing gates against a
*second* person's work. Tier 1 buys the same protection on both hosts today. Sequence accordingly.

---

## F-5 — MINOR: backlog hygiene distorts the picture

- **#206** is open with `phase:human-review` + `status:development-done` + `status:verification-done`,
  but both its PRs (#205, #207) merged. It is done and should be closed.
- **PR #204** still carries `post-merge-closeout`. Every other merged PR was closed out; this one was
  missed, so the label-driven closeout workflow reads as permanently pending.
- **#136** (Windows portability) carries no lifecycle label at all, so no routing mechanism will ever
  select it. Last touched 2026-08-01.
- **6 of 12 worktrees** are stale, detached, or prunable — one under `/private/tmp` marked `prunable`,
  five pinned at `349c09d`. They pollute repository-wide `find`/`grep`: an inventory of 11 agent files
  returned 50 paths.
- One QA record, `docs/records/qa/2026-08-16-issue-132-imp002-task5-qa.md` (Issue #132 / IMP-002 Task 5,
  terminal result **BLOCKED**), has never been committed anywhere. Because `docs/records/qa/` is not in
  `CLEARED_DIRECTORIES`, it was never wiped by a reset — it was simply never saved. It is the stated
  evidence for why #132 is blocked.

---

## Recommended sequence

Ordered by *provable today* first, and pruned for a single user with no team.

| # | Work | Gate needed | Why this order |
|---|---|---|---|
| 1 | Commit the orphaned #132 QA record; close #206; close out PR #204; prune stale worktrees | none | Removes the only permanent-loss risk and stops the backlog lying about itself |
| 2 | Add the three missing validators to `.gitlab-ci.yml` | none | Real GitLab parity gain, no design, immediately testable |
| 3 | Extend `validate:skill-parity` to cover `*/agents`, and seed `.agents/agents/` + `.agent/agents/` | none | Closes F-2's drift hole with the same TDD pattern used on #168 |
| 4 | Audit `role-definitions.md` (9,365 tokens) for duplication against `AGENTS.md`; relocate under the #166 pointer pattern | none | Buys the headroom that F-1 says everything else needs |
| 5 | Wire the five unwired adapters to their existing skills | needs step 4's headroom | Cheap once there is budget |
| 6 | Author a release/deployment work-instruction skill | needs step 4's headroom | Closes the one genuine skill gap |
| 7 | Open IMP-006 as an issue for adapter conformance | human decision | Formalises steps 3–5 as the roadmap's own missing workstream |
| 8 | GitLab Tier 2 API parity | human + security review | Explicitly fenced by `platform-readiness.md`; lowest value for a solo user |

Steps 1–4 need no human gate beyond a merge decision and are independently verifiable.
Steps 5–6 are blocked on step 4 by arithmetic, not by policy.
Steps 7–8 are decisions, not tasks.

## What this assessment does not claim

- It does not audit whether #132/#133 are correctly blocked. Both carry `phase:blocked` with prior
  independent QA; re-litigating them is separate work.
- It does not evaluate skill *content* quality, only coverage and routing.
- Token figures come from `validate-context-budget.mjs`'s own accounting (`chars / 4`), which is a
  heuristic, not a tokenizer.
