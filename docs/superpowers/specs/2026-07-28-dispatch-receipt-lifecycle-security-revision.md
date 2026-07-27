# SDD Revision: Dispatch Receipt Lifecycle Anti-Forgery Controls (Issue #119)

**Date:** 2026-07-28
**Author:** SA Agent (session), responding to a Security Reviewer BLOCKED finding
**Status:** Proposed — awaiting Boss decision on assurance model before Security re-review
**Issue:** #119 (child of #116)

## Why this exists

Security review of the original Issue #116 Fix 3 plan returned **BLOCKED**
(recorded in `TASK_LOG.md`, 2026-07-27): the existing
`docs/contracts/schemas/dispatch-receipt.schema.json` requires a non-empty
`terminal_result_id` string for a `consumed` receipt, but nothing in the
schema or `scripts/validate-dispatch-receipts.mjs` proves that ID
corresponds to real completed work by the named `target_agent`, or that the
receipt ever passed through `registered` before claiming `consumed`. A
receipt is just a YAML file added by a PR; today, nothing stops that PR from
introducing a brand-new file that is `consumed` from birth, with a
self-declared `terminal_result_id` pointing at nothing checkable.

This document proposes the control set the Security Reviewer asked for,
without writing any code — that happens only after SA + Security approve
this revision and Boss picks an assurance model (Decision 1 below).

## What the current validator already does (do not re-litigate)

`scripts/validate-dispatch-receipts.mjs` already enforces, and these stay as-is:
- Filename stem must equal `handoff_event_id` (no filename/content drift).
- `dispatch_depth` is derived from ledger position within a `work_item_url`
  group ordered by `registered_at`, not trusted as free input
  (`validateDispatchDepth`) — this closes the "trusted `dispatch_depth`"
  gap already.
- A same-role-pair round-trip bound with a mandatory `escalated: true` +
  `notes` override (`validateEscalationBound`).
- A handoff's declared `Dispatch` must match a receipt whose `target_agent`
  equals the handoff's `Next Owner` and whose `state` is still live
  (`registered`/`consumed`) (`validateMatching`).

The gap is narrower than "the whole lifecycle is unguarded": it is
specifically **state-transition provenance** and **terminal-evidence
verifiability**. The four controls below close that gap.

## Decision 1 (Boss must choose): assurance model

| Option | What it proves | Cost |
|---|---|---|
| **A. Repository-audited (recommended)** | The receipt's state history is consistent with append-only transitions as recorded in this repo's own git history, and any terminal result points at an artifact that verifiably exists (a real commit SHA, a real QA record file, a real GitHub comment URL). Does **not** cryptographically prove the target agent actually ran — it proves the paper trail is internally consistent and checkable, the same assurance level as every other claim in this framework (TASK_LOG entries, QA records). | Implementable now with existing tooling (`git log`, file existence, URL shape checks in CI). No new infrastructure. |
| B. Runtime-attested | An independent, tamper-evident signal (e.g., a signed token from the actual dispatch runtime, or a required CI job that only the real target agent's execution could produce) proves execution occurred. | Requires new infrastructure (signing keys, a trusted issuer, key rotation/revocation) this repo does not have today. Out of scope until that infrastructure exists. |

**Recommendation: Option A**, with the schema/validator explicitly documented
as repository-audited, not runtime-attested (Control 4 below) so no future
reader overclaims what a receipt proves. Option B is recorded as a deferred
follow-up, not designed further here.

## Control 1 — Append-only state transitions, checked via git history

**Problem:** a receipt file can be introduced already in a terminal state.

**Design:** `validate-dispatch-receipts.mjs` gains a check that, for every
receipt file, walks its git history (`git log --follow --diff-filter=A
--format=%H -- <path>` for the add-commit, then the sequence of content
states at each commit touching that path) and asserts:
1. The **first** commit that adds the file must have `state: registered`.
   A file whose first-ever committed content is `consumed`, `expired`, or
   `cancelled` fails validation.
2. States across successive commits to the same path may only move forward
   through `registered → consumed | expired | cancelled`. Any transition
   that revisits `registered` after leaving it, or moves between two
   terminal states, fails.
3. Every non-`registered` revision must set `state_changed_at` and
   `state_changed_by` to values that did not exist in the prior revision
   (a real transition happened, not just a state-field edit with stale
   metadata) — this is already a schema `required`-when-not-registered rule;
   this control adds that the *value* changed between revisions, not just
   that the fields are present.

**CI scoping:** like the existing PR-diff scoping for handoff files
(`resolveChangedHandoffPaths`), only receipts touched in the current PR need
full git-history replay; a push-triggered full scan re-validates everything,
which is already the existing pattern for these validators.

## Control 2 — Identity binding for `registered_by` / `state_changed_by`

**Problem:** these fields are free-text strings today; anything is accepted.

**Design:** both fields must match one of the enumerated agent identities
already canonical to this repo (`AGENTS.md` role names — Orchestrator, BA,
SA, Developer, QA, Security Reviewer, Documentation, Config, Data, Release,
PM, Human Maintainer, Boss), optionally suffixed with a parenthetical
session/tool qualifier (matching the existing TASK_LOG convention, e.g.
`Developer Agent (Codex)`). A free-form string that matches none of the
canonical role names fails validation. This does not prove *who* ran the
agent (no auth infrastructure exists for that — see Decision 1) — it proves
the claim is at least drawn from the closed set of roles this framework
recognizes, rejecting arbitrary impersonation strings.

## Control 3 — Evidence-bound terminal consumption

**Problem:** `terminal_result_id` is an unconstrained non-empty string.

**Design:** the schema's free-text `terminal_result_id` is restricted (via
an additional validator check, not a schema `pattern`, so the check can
verify *existence* and not just *shape*) to one of three verifiable forms,
and the receipt fails unless the referenced artifact actually exists at
validation time:
1. **Git commit SHA** — `^[0-9a-f]{7,40}$`, verified with `git cat-file -e
   <sha>` (must resolve in this repository's history).
2. **QA/review record path** — `^docs/records/(qa|work-items)/.+\.md$`,
   verified to exist on disk at validation time.
3. **GitHub comment URL** — `^https://github\.com/[^/]+/[^/]+/(issues|pull)/\d+#issuecomment-\d+$`,
   verified only for shape in CI (no network egress from the validator);
   a Security-reviewed follow-up may add an optional live-fetch check for
   human/local runs where network access is acceptable.

A `terminal_result_id` that matches none of these three shapes, or claims a
commit SHA / file path that does not exist, fails validation — this is the
literal fix for the Security Reviewer's finding ("accepts a non-empty
terminal result ID without proving ... evidence").

## Control 4 — Assurance wording in the schema and validator output

**Design:** add a schema-adjacent `README` note (or a `$comment` at the
schema root, which Ajv ignores for validation but preserves for readers)
stating: *"A `consumed` state and its `terminal_result_id` are
repository-audited: they prove the paper trail is internally consistent and
the referenced artifact exists. They are not runtime-attested and do not
cryptographically prove the named `target_agent` executed the work."* The
validator's passing/failing console output should not use language stronger
than "consistent" / "resolves" to avoid implying a guarantee Control 1–3
cannot provide.

## Control 5 — Bounded expiry (design only; not enforced automatically)

**Design:** add an optional schema field `expires_at` (ISO 8601), and a
**warning-only** (non-blocking) validator check that flags any `registered`
receipt whose `registered_at` is older than a configurable TTL (proposed
default: 14 days) as "should transition to `expired`". The validator does
not auto-transition state — per Issue #118's own lesson, automation should
never silently mutate audit-relevant state; a human or the dispatching
agent must author the `expired` transition explicitly, same as any other
state change under Control 1.

## Required adversarial regression tests (before this is implementation-ready)

1. A receipt file whose first git revision is already `state: consumed` →
   rejected (Control 1.1).
2. A receipt that transitions `consumed → registered` in a later revision →
   rejected (Control 1.2).
3. A `state_changed_at`/`state_changed_by` pair identical to the prior
   revision on a revision that changed `state` → rejected (Control 1.3).
4. `registered_by: "definitely-not-an-agent"` → rejected (Control 2).
5. `terminal_result_id` shaped like a commit SHA that does not exist in the
   repository → rejected (Control 3.1).
6. `terminal_result_id` pointing at a `docs/records/qa/*.md` path that does
   not exist → rejected (Control 3.2).
7. `terminal_result_id` that matches none of the three permitted shapes →
   rejected (Control 3.3).
8. The existing valid fixtures (`docs/contracts/examples/dispatch-receipts/`)
   continue to pass unmodified, or are updated with real, resolvable
   evidence values as part of the implementation PR.

## What happens next

This document is the artifact Issue #119's AC-1/AC-2 require ("SDD or ADR
documents the full dispatch receipt lifecycle", "Anti-forgery controls
defined"). Per the approved route (`Orchestrator → SA (design) → Security
Reviewer → Developer → QA → Human Approval`), it now needs:
1. **Boss decision on Decision 1** (Option A recommended).
2. **Security Reviewer re-review** against this revision specifically (AC-4).
3. Only after both, Developer implementation begins — schema `$comment`
   addition, `validate-dispatch-receipts.mjs` control additions, and the
   8 adversarial tests above.

No schema, validator, or CLI code changes are included in this document or
its accompanying PR.
