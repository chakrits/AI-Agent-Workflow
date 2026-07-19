# Software Design Document: Durable Event-Driven Agent Dispatcher (Phase A + Phase B v1)

## Metadata

| Field | Value |
|---|---|
| Work Item ID | GitHub Issue #35 |
| Title | Durable event-driven agent dispatcher — Phase A (dispatch-receipt ledger + CI enforcement) and Phase B v1 (notify + assign) |
| Owner | SA Agent |
| Status | Proposed — pending Security Reviewer threat model and human maintainer approval before implementation |
| Scope | Phase A (in-repo receipt ledger + CI enforcement) and Phase B v1 (GitHub Actions notify + assign) only. Phase C (GitLab parity) and any Phase B capability that executes/invokes an agent session are explicitly out of scope and deferred. |

## Context

Issue #33 established an in-turn-only supervision contract (`docs/records/SDD-ORCHESTRATOR-DISPATCH-VISIBILITY-2026-07-18.md`, mirrored in `docs/workflow/handoff-contract.md` rules 13–15 and `docs/workflow/role-definitions.md` "Terminal Dispatch and Boss Visibility"): a parent Orchestrator may declare `Next Action: Dispatch` only when it invokes the child and consumes its terminal receipt within the same active turn. That contract explicitly deferred cross-turn/event-driven dispatch — the case where a terminal handoff names a next agent but no active turn exists to invoke it (e.g. a PR merges, or an Issue's terminal comment is posted, and the session that produced it has already ended) — to a "separately approved durable control-plane design (GitHub Issue #35)."

Issue #35 proposes that durable control plane, phased. Boss (human maintainer, issue #35 comment `5014418124`) sponsored SA design intake for Phase A and Phase B v1 only, and resolved the four open questions from the original proposal:

1. Receipt representation is **in-repo files only** — auditable, merge-gated. Structured Issue comments are rejected as the receipt store because they are not merge-gated and are weaker to validate.
2. No host API currently invokes a Codex/Claude session from GitHub Actions. **Phase B v1 is reduced to "notify + assign"** (comment + label + mention) rather than executing a session. Session invocation is deferred until such an API exists.
3. Loop safety reuses the existing Issue #33 routing circuit breaker (`docs/workflow/role-definitions.md` "Routing Circuit Breaker"). No new dispatcher-owned budget is authorized in this phase.
4. Phase A CI enforcement is required: a PR whose terminal handoff declares `Next Action: Dispatch` with no matching receipt in the ledger must fail validation.

This SDD is the required design input for the Security Reviewer's threat model (Issue #35 "Required before implementation" item 2) and for a subsequent human maintainer approval gate before any Developer Agent implementation work is authorized.

## Goals / Non-goals

### Goals

- Give a terminal `Dispatch` outcome a durable, in-repo, machine-readable record (a "receipt") that survives past the end of the Orchestrator turn that produced it, so cross-turn/cross-session continuity of a named next agent is observable and auditable.
- Make a `Dispatch`-with-no-receipt terminal handoff a structural CI failure, not a silent prose claim, extending the same enforcement posture the P0.5/Issue #33 work already established for in-turn dispatch.
- Provide a minimal, notify-only GitHub Actions mechanism (Phase B v1) that surfaces a `registered` receipt to the correct human/agent surface (comment + label + mention), without executing or starting any agent session.
- Reuse existing security posture (least-privilege GitHub App token pattern from Issue #29/PR #31 and `work-item-readiness-refresh.yml`), existing exactly-once key `(Handoff Event ID, Terminal Result ID)` from P0.5, and the existing Issue #33 routing circuit breaker, rather than inventing new mechanisms.

### Non-goals

- Do not invoke, start, or resume a Codex/Claude/Antigravity agent session. Phase B v1 notifies and assigns only; a human or agent picks up the work manually, exactly as today.
- Do not change or relax the Issue #33 in-turn-only supervision rule for a single active Root turn. Phase A/B are additive, cross-turn continuity aids, not a replacement.
- Do not build a webhook, queue, scheduler, persistent worker, or bot beyond the GitHub Actions triggers described here.
- Do not add a new dispatcher-owned loop-safety budget; reuse the existing routing circuit breaker per Boss decision #3 (see Threat Surface Summary for the sufficiency argument and one flagged gap).
- Do not implement GitLab parity (Phase C) or structured Issue-comment receipts (rejected representation).
- Do not let the ledger or the notify workflow judge QA, merge, approve, or bypass any human gate.

## Architecture Overview

```text
Terminal handoff declares `Next Action: Dispatch`, `Next Owner: <agent>`
  -> Author (human or agent, in the same commit/PR as the handoff) writes a
     receipt file into the Phase A ledger, state = registered
  -> PR merges to main (receipt file is merge-gated: it only becomes
     canonical ledger state once it lands on main via normal review)
  -> Phase A CI (PR-time): validate-dispatch-receipts.mjs fails the PR if
     any terminal handoff in the PR body/linked Issue declares
     `Next Action: Dispatch` with no matching `registered` (or later-state)
     receipt file in the ledger
  -> Phase B v1 (push-to-main trigger on ledger path): GitHub Actions
     workflow reads the new/changed receipt file(s), and for each file
     newly in `registered` state, posts one notification (Issue comment +
     label + mention) assigning Next Owner on the linked Work Item
  -> Receipt state transitions to `consumed` / `expired` / `cancelled` by
     the same human/agent-authored-file-plus-merge mechanism, never by the
     notify workflow itself
```

The ledger is the single source of truth; it is a set of version-controlled files, not a comment stream. Every state transition is a normal git-reviewed change (PR merge), which is what "merge-gated" means operationally (see Threat Surface Summary). The Phase B v1 workflow is a read-only-to-the-repo, write-only-to-GitHub-Issues notifier: it never writes back to the ledger, so it cannot itself forge or advance receipt state.

## Component Design

### 1. Phase A: Dispatch-Receipt Ledger

**Location and naming convention.** `docs/records/dispatch-receipts/<handoff-event-id>.yaml`, one file per `Handoff Event ID`. `Handoff Event ID` is already a required handoff-contract field (`docs/workflow/handoff-contract.md`); this reuses it unchanged as the filename key, so the ledger requires no new ID scheme. `<handoff-event-id>` must match `^[a-z0-9][a-z0-9-]{3,63}$` (lowercase, hyphenated, matching the ID format already used elsewhere in this repo for stable identifiers) to keep filenames predictable and diffable. This follows the existing `docs/contracts/examples/*.yaml` convention (structured YAML data files under `docs/`, validated by a Node script) rather than inventing a new records subsystem.

**Why files, not a database or Issue comment:** matches Boss decision #1 exactly — files are reviewed and merge-gated through normal PR review, are diffable, are queryable by any tooling that can read the repo (including a future Phase C GitLab equivalent), and require no new storage/credential surface. A structured Issue comment is mutable post-hoc by anyone with comment-edit rights and is not blocked by branch protection; a file is.

**Receipt schema** (`docs/contracts/schemas/dispatch-receipt.schema.json`, JSON Schema, validated the same way `docs/contracts/schemas/task-state.schema.json` already validates `bug-fix-workflow.yaml` state files):

| Field | Type | Required | Meaning |
|---|---|---|---|
| `handoff_event_id` | string | yes | Must equal the filename stem. Stable identity for one parent-to-target dispatch, reused unchanged from the handoff contract. |
| `terminal_result_id` | string | on `consumed` | Immutable child terminal-result identity once delivered. Together with `handoff_event_id` this is the P0.5 exactly-once key `(Handoff Event ID, Terminal Result ID)`, reused unchanged per Boss decision. |
| `work_item_url` | string (URL) | yes | The GitHub Issue/PR this dispatch concerns. |
| `source_agent` | string | yes | Agent role that produced the terminal handoff (e.g. `SA Agent`). |
| `target_agent` | string | yes | `Next Owner` from the terminal handoff (e.g. `Security Reviewer`). |
| `state` | enum | yes | `registered`, `consumed`, `expired`, `cancelled` (see State Model). |
| `registered_at` | string (ISO 8601) | yes | Timestamp the receipt entered `registered`. |
| `registered_by` | string | yes | Who wrote the file: a human (`Boss` / GitHub handle) or a named agent role. Phase A has no runtime, so this is always a human-in-the-loop or an agent authoring a file inside its own turn — never an automated writer. |
| `state_changed_at` | string (ISO 8601) | on non-`registered` state | Timestamp of the last state transition. |
| `state_changed_by` | string | on non-`registered` state | Who made the transition (same authorship model as `registered_by`). |
| `dispatch_depth` | integer | yes | **Added by this amendment (Boss approval, Issue #35 comment, 2026-07-19: "ไอเดียน่าสนใจ เอาที่ SA เสนอเข้ามาด้วย" — incorporate SA's own flagged recommendation).** The cross-turn dispatch chain position for this Work Item, as derived by the receipt author from prior ledger entries — see "Receipt-authorship duty: prior-ledger check" below. `1` for the first receipt ever filed against a given `work_item_url`; each subsequent receipt filed for the same `work_item_url` records `previous_max(dispatch_depth) + 1`, regardless of which role pair is involved (depth counts *all* dispatches for the Work Item, not just same-role-pair round trips — see rationale below). |
| `escalated` | boolean | on `dispatch_depth` exceeding the reused bound | **Added by this amendment.** `true` only if the receipt author is deliberately filing a receipt beyond the reused Issue #33 breaker bound (Component Design §2 defines the bound and when this is permitted). Absent/`false` for all normal receipts. A `registered` receipt with `dispatch_depth` past the bound and no `escalated: true` is invalid (see CI Enforcement). |
| `notes` | string | no | Free-text context (e.g. why `expired`/`cancelled`, or the human-escalation reference when `escalated: true`). |

**Who writes/updates a receipt file, and when (no runtime in Phase A):** Phase A has no automation that creates receipts. The agent or human closing out a terminal handoff that declares `Next Action: Dispatch` is responsible for adding the receipt file (state `registered`) in the same PR as the terminal handoff, exactly as they are already responsible for the handoff's other required fields. This is a documentation/contract discipline, not new tooling — the same way `docs/records/HANDOFF-*.md` files are already authored by the agent that produces the handoff. State advances (`registered` -> `consumed`/`expired`/`cancelled`) are made by whichever agent or human later has the evidence for that transition (e.g. the target agent, on producing its own terminal handoff, updates the receipt to `consumed` and records `terminal_result_id`; a human declares `cancelled` when abandoning a route; anyone with ledger write access declares `expired` after a documented staleness window — this SDD does not set an automatic expiry timer, since Phase A has no runtime to enforce one; expiry is a manually-declared, evidenced state).

**Receipt-authorship duty: prior-ledger check (added by this amendment).** Before creating a new `registered` receipt file for a Work Item, the authoring agent or human MUST first read the existing receipt files for that Work Item — located by the shared `work_item_url` field embedded in each receipt under `docs/records/dispatch-receipts/` — and:

1. Compute `dispatch_depth` as one more than the highest `dispatch_depth` already recorded across all existing receipts (of any state) sharing that `work_item_url`; if none exist, `dispatch_depth = 1`.
2. Record that computed value in the new receipt's `dispatch_depth` field. This is a mandatory field as of this amendment; a receipt omitting it is invalid (see CI Enforcement below).
3. Apply the reused Issue #33 routing-circuit-breaker bound to the resulting count (Component Design §2) and, if the bound is exceeded without an explicit human escalation decision already on record, stop and route to Human per the breaker's existing stop/escalation semantics rather than filing the receipt silently.

This closes the gap SA flagged in the original version of this SDD (see Threat Surface Summary §4, updated below): it gives the reused breaker a durable, cross-turn-visible history to count against, by making the receipt ledger itself — rather than a single session's local memory — the source of truth the authorship duty reads before acting. This is a documentation/contract discipline identical in kind to the existing "who writes a receipt file" duty above; it introduces no new runtime, script, or automated enforcement beyond the CI check in §2.

**Why depth counts all dispatches for the Work Item, not just same-role-pair round trips:** the original Issue #33 breaker counts round trips between the *same two roles* (A dispatches B, B dispatches back to A). This amendment's `dispatch_depth` is intentionally broader — it counts every dispatch in the Work Item's cross-turn chain, because a chain that cycles through three or more roles (A -> B -> C -> A -> B -> C ...) would never trip a same-role-pair breaker at all, yet is exactly the kind of unbounded cross-turn chain the original gap flagged. Component Design §2 defines how the same-role-pair sub-count is still derived from this depth for breaker-bound purposes, so the amendment extends the existing breaker rather than replacing its semantics.

**Receipt states:**

- `registered`: a `Dispatch` terminal handoff exists and its receipt has been filed; the target has not yet produced or consumed a matching terminal result.
- `consumed`: the target agent (or whoever picked up the notify-only assignment) produced its own terminal outcome and `terminal_result_id` is recorded, matching the exactly-once key.
- `expired`: the receipt was never consumed within a documented staleness window and a human/agent has declared it stale (manually — no automated timer exists in Phase A).
- `cancelled`: the dispatch was explicitly abandoned (e.g. superseded by a new route decision) before consumption.

State transition rule: `registered -> consumed`, `registered -> expired`, `registered -> cancelled` are the only valid transitions; `consumed`/`expired`/`cancelled` are terminal ledger states and must not be reopened (a new dispatch gets a new `Handoff Event ID` and a new file).

### 2. Phase A: CI Enforcement

**Design (script + workflow rule).** A new script, `scripts/validate-dispatch-receipts.mjs`, follows the existing `scripts/work-item-readiness-check.mjs` / `scripts/validate-contracts.mjs` style: pure functions taking already-fetched PR/Issue data plus the repo's own ledger files, returning an error list; no direct GitHub API calls inside the pure function so it stays unit-testable the same way `buildReadinessCheck`/`validateReadiness` are today.

- Input 1: the terminal handoff text for the PR (PR body, and/or the linked Issue's latest handoff comment — reuse the same `findLinkedIssueNumber`-style resolution `work-item-readiness-check.mjs` already uses to locate the Work Item from the PR body).
- Input 2: the set of receipt files present in `docs/records/dispatch-receipts/` at the PR's head commit (read via `git show`/`fs.readdir` in CI, the same way other validators read repo-local YAML today).
- Rule: parse the terminal handoff text for `Next Action: Dispatch` plus its paired `Handoff Event ID` and `Next Owner` fields (already required by `docs/workflow/handoff-contract.md`). For each such declaration found, require exactly one receipt file `docs/records/dispatch-receipts/<handoff-event-id>.yaml` to exist, with `state` in `{registered, consumed}` (an `expired`/`cancelled` receipt does not satisfy a still-declared live `Dispatch`), and with `target_agent` equal to the handoff's `Next Owner`. **"Matching" is defined as: `handoff_event_id` (filename and field) exactly equals the handoff's `Handoff Event ID`, and `target_agent` exactly equals `Next Owner`.** No fuzzy matching; a mismatch on either field fails the same as a missing file.
- Failure mode: if a `Next Action: Dispatch` is declared with no matching receipt file, or the matching file has `target_agent` != `Next Owner`, or the file's `state` is `expired`/`cancelled`, the check fails with a message naming the missing/mismatched `Handoff Event ID` — mirroring the existing `buildReadinessCheck` pattern of a `success`/`failure` GitHub Check with a human-readable summary.
- Plug-in point: add a job to `.github/workflows/validate-contracts.yml` (existing workflow already runs `npm run validate:contracts` on PRs) — either extend that workflow's script list or add `npm run validate:dispatch-receipts` as a new script + new step in the same workflow, run on `pull_request` (not `pull_request_target`, since this only reads the PR's own content/ledger files, no elevated token needed — same posture as `validate-contracts.yml` today). Add a corresponding `npm run validate:dispatch-receipts` entry to `package.json` alongside `validate:contracts` / `validate:project-state`.
- This enforcement makes Boss decision #4 concrete: a PR cannot silently merge a terminal `Dispatch` handoff without a corresponding ledger file, closing the gap the P0.5 in-turn contract already closes for the same-turn case, but for the cross-turn/merged-PR case.

**Cross-turn dispatch-depth validation (added by this amendment, Boss approval Issue #35 comment 2026-07-19).** In addition to the matching rule above, `validate-dispatch-receipts.mjs` validates the receipt-authorship duty defined in Component Design §1:

- Input 3: all other receipt files in `docs/records/dispatch-receipts/` sharing the new/changed receipt's `work_item_url` (the script already reads the full ledger directory for Input 2, so this is a filter over already-read data, not a new I/O source).
- Rule (missing field): a new `registered` receipt with no `dispatch_depth` field fails the check — "receipt omits required depth field."
- Rule (depth correctness): `dispatch_depth` must equal `max(dispatch_depth across existing receipts with the same work_item_url) + 1`, or `1` if no prior receipt exists for that `work_item_url`. A receipt that understates the count (e.g. reuses a stale depth, or restarts at `1` when prior receipts exist) fails the check — this is the concrete enforcement of "the author must have read prior ledger entries," since the only way to produce the correct value is to have read them.
- Rule (reused breaker bound): the script derives the same-role-pair sub-count the original Issue #33 breaker (`docs/workflow/role-definitions.md` "Routing Circuit Breaker") already defines — "the same two roles route a work item back and forth more than twice" — by walking the `work_item_url`'s receipt chain in `dispatch_depth` order and counting consecutive `source_agent`/`target_agent` alternations between the same two roles. When that sub-count would exceed two round trips (i.e. a third round trip between the same two roles is being filed), the new receipt is invalid unless it sets `escalated: true` and its `notes` field references the human escalation decision (mirroring the breaker's existing "stop the loop and escalate to Human with the routing history" behavior — this is the same stop condition, applied at the ledger level instead of a single session's local routing-history view). This is a direct extension of the existing breaker, not a new independently-tunable budget: the bound value ("more than twice") is read from the same rule, not redefined here.
- Failure mode: each of the above is reported the same way as the existing matching-rule failures — a named `Handoff Event ID`/receipt filename plus a human-readable reason ("missing `dispatch_depth`", "`dispatch_depth` does not match prior ledger state (expected N, got M)", "same-role-pair bound exceeded without `escalated: true`").

### 3. Phase B v1: Notify + Assign

**Trigger design.** A new workflow, `.github/workflows/dispatch-receipt-notify.yml`, triggered on `push` to `main` filtered to `paths: ["docs/records/dispatch-receipts/**"]`. Trigger-on-`main`-after-merge (not PR-opened) is the deliberate choice: Boss decision #1 requires the receipt store to be merge-gated, i.e. a receipt is only canonical once it has passed normal PR review and landed on `main`. Triggering notification before merge (e.g. on `pull_request`) would let an unreviewed, unmerged receipt file post a real GitHub notification/assignment — a stronger action than the file's own review state justifies. Triggering after merge means the notify action only ever acts on ledger state that has already passed the same review gate as any other repo change.

- Job reads the diff of the triggering push, filters to `docs/records/dispatch-receipts/*.yaml` files that are newly added or whose `state` field changed to `registered` (a genuinely new dispatch, not a `consumed`/`expired`/`cancelled` transition, which needs no notify action).
- For each such file: parse `work_item_url`, `target_agent`, `handoff_event_id`; post one Issue/PR comment on `work_item_url` naming the assignment (`Next Owner: <target_agent>`, `Handoff Event ID: <id>`, receipt file link), apply/ensure a label identifying the target role (reusing whatever role-label taxonomy the repo already has, e.g. `agent:<role>` — confirm/extend the existing label set rather than inventing a parallel one), and mention (`@`) the appropriate human/team surface if one is configured for that role (optional — a repo with no per-role human owner mapped yet simply posts the comment + label with no mention).
- **Explicitly does not**: call any agent-session API, trigger `workflow_dispatch` into an agent-runner job, or otherwise start work. This is the direct implementation of Boss decision #2 — "notify + assign" only, because no supported API to invoke a Codex/Claude hosted session from Actions currently exists. A human or agent picks up the assigned work manually, the same as today's baseline (a Boss-relayed handoff).
- **Security posture — reuse, not reinvent** (mirrors `work-item-readiness-refresh.yml` / Issue #29 / PR #31 pattern exactly):
  - `permissions: contents: read` at the job level; no `contents: write`.
  - A GitHub App token scoped to only what notify+assign needs: `issues: write` (comment + label) and `pull-requests: write` only if the Work Item can be a PR; no `contents: write`, no `actions: write`, no `checks: write` (checks-write is the readiness-refresh app's scope, not this one — this workflow does not publish a Check).
  - `actions/checkout` pinned to a full SHA at `ref: ${{ github.event.repository.default_branch }}` with `persist-credentials: false`, exactly as `work-item-readiness-refresh.yml` does — this workflow never checks out or executes a PR head; it only reads the already-merged ledger file from `main`.
  - `actions/create-github-app-token` pinned to a full SHA, client-id/private-key from repo `vars`/`secrets`, `environment:` scoping the same way `work-item-readiness-refresh.yml` uses the `work-item-refresh` environment — this workflow gets its own environment (e.g. `dispatch-receipt-notify`) with its own narrower App/credential, not a shared one, so a compromise of one notify surface does not widen the other's scope.
  - `actions/github-script` pinned to a full SHA, script content is a new pure module under `scripts/` (e.g. `scripts/dispatch-receipt-notify.mjs`) imported the same way `work-item-readiness-check.mjs` is imported today, keeping the inline `script:` block a thin caller.
  - No execution of PR-head or receipt-file *content* as code — the receipt YAML is parsed as data only (via the `yaml` package already a dependency, same as `docs/contracts/*.yaml` parsing), never `eval`'d or shelled out.

**Explicit non-execution statement:** Phase B v1 has no code path that starts, resumes, or invokes any agent session, Codex/Claude/Antigravity turn, or `workflow_dispatch` into an agent-runner. Its only side effects are a GitHub Issue/PR comment, a label, and (optionally) a mention. If a future host API to invoke a session becomes available, that is a new Phase B capability requiring its own SDD/threat model — it is out of scope here.

## Interaction with the Issue #33 In-Turn-Only Contract

Phase A and Phase B v1 are additive and cross-turn/cross-session only; they do not change, weaken, or replace the in-turn-only rule in `docs/workflow/handoff-contract.md` rules 9/13–15 and `docs/workflow/role-definitions.md` "Terminal Dispatch and Boss Visibility". Concretely:

- Within a single active Root Orchestrator turn, `Dispatch` still requires the parent to invoke the target child and consume its terminal receipt in that same turn (rule 9). The Phase A ledger does not substitute for that in-turn invoke-and-await; an Orchestrator must not skip the in-turn wait on the theory that "a receipt file will cover it."
- The ledger receipt is a *durable record* of a dispatch decision, useful once a turn has ended (a PR merged, a session closed) and no active turn exists to relay the next step. It is not a mechanism for a still-active turn to avoid the in-turn wait it is otherwise required to perform.
- Phase B v1's notify action fires only after a receipt lands on `main`, i.e. only after whatever turn produced it has already ended (or chose to defer cross-turn continuity to the ledger). It never fires inside an active turn and has no interaction with `collaboration.wait_agent` or any in-turn primitive.
- A future Orchestrator turn that later picks up a `registered` receipt (human-notified or self-directed) must itself follow the in-turn-only rule for whatever it dispatches next; the ledger only carries information across the turn boundary, it does not carry supervision authority across it.

## Data / Integration Impact

- New directory: `docs/records/dispatch-receipts/` (YAML data files, git-tracked, no runtime storage).
- New schema: `docs/contracts/schemas/dispatch-receipt.schema.json`.
- New script (design only; implementation is Developer Agent's task from this SDD): `scripts/validate-dispatch-receipts.mjs`, `scripts/dispatch-receipt-notify.mjs`.
- New `package.json` script: `validate:dispatch-receipts`.
- Extend `.github/workflows/validate-contracts.yml` with a new step, or add a sibling workflow — SA recommends extending the existing workflow to keep one PR-time validation entry point, consistent with how `validate:contracts` and `validate:project-state` are already colocated.
- New workflow: `.github/workflows/dispatch-receipt-notify.yml`.
- New GitHub App (or reused/extended App) + new `environment:` (e.g. `dispatch-receipt-notify`) with its own narrowly scoped client-id/private-key `vars`/`secrets`, provisioned by a human maintainer outside this repo's git history (same operational pattern as `WORK_ITEM_REFRESH_APP_CLIENT_ID`/`WORK_ITEM_REFRESH_APP_PRIVATE_KEY`).
- No database, no new persistent runtime, no third-party service.

## Error Handling

| Failure | Required response |
|---|---|
| Terminal handoff declares `Next Action: Dispatch` with no matching receipt file | CI check fails (`validate:dispatch-receipts`); PR cannot merge until a receipt is added or the handoff is corrected. |
| Receipt file exists but `target_agent` != handoff's `Next Owner`, or `handoff_event_id` mismatch | CI check fails with the specific mismatch named. |
| Receipt file is malformed / fails JSON Schema | CI check fails; treated the same as a missing receipt (fail closed). |
| Notify workflow cannot resolve `work_item_url` (deleted Issue/PR, malformed URL) | Job logs the failure and does not silently succeed; no partial comment/label is posted for that entry, and the job surfaces a non-zero exit / workflow failure for maintainer visibility. |
| GitHub App token/permission insufficient at notify time | Workflow step fails visibly (not swallowed); no fallback privilege escalation. |
| Receipt file's `state` transitions in a way not on the allowed edge list (e.g. `consumed -> registered`) | Schema/validator rejects the file as invalid at PR time, same CI gate as the missing-receipt case. |
| Duplicate `registered` receipts for the same `handoff_event_id` (two files, or a re-added file) | Filename collision at the file-system level prevents two files sharing a stem; a duplicate PR adding the same filename is a normal merge conflict, not a runtime failure. |

## Security Considerations

See the Threat Surface Summary section below for the full analysis this SDD hands to Security Reviewer. Summary of constraints already designed in:

- No secret, credential, or token is stored in the repo; App credentials live in GitHub `vars`/`secrets` scoped to a dedicated `environment:`, following the existing Issue #29/PR #31 pattern.
- Phase B v1 never checks out or executes PR-head content, and never executes receipt-file content as code — YAML is parsed as data only.
- The notify workflow has no write path back into the ledger; it cannot forge or advance receipt state, which stays entirely under normal PR-review git control.
- Phase A/B introduce no new execution endpoint; the only side effects are read (repo files) and write (Issue comment/label) operations scoped to GitHub's own API surface via a least-privilege App token.

## NFRs

| Area | Target |
|---|---|
| Auditability | Every receipt state transition is a reviewed git commit; `git log` on a receipt file is the full audit trail. No mutable external state store. |
| Reliability | A `Dispatch` terminal handoff cannot merge without a receipt (CI-enforced); Phase A has no partial-failure mode because it has no runtime — it is pure repo state. |
| Notification latency | Best-effort, bounded by GitHub Actions `push` trigger latency (typically seconds); no SLA is claimed, matching the Issue #33 SDD's stance that dispatch latency SLAs are a non-goal. |
| Least privilege | Notify workflow's App token has no `contents: write`, no `actions: write`, no PR-head checkout — narrower than the readiness-refresh App where the two roles diverge (issues/PRs write vs. checks write). |
| Portability | Ledger file format and schema are platform-agnostic YAML; a future Phase C GitLab notifier can read the same ledger without a GitHub-specific data model. |
| Maintainability | One receipt schema, one state vocabulary (`registered`/`consumed`/`expired`/`cancelled`), reused unchanged from the Issue #35 proposal and Boss's decisions — no parallel taxonomy introduced. |

## Alternatives Considered

| Alternative | Decision |
|---|---|
| Structured Issue comments as the receipt store | Rejected per Boss decision #1: not merge-gated, mutable post-hoc, weaker to validate deterministically in CI. |
| Trigger Phase B notify on `pull_request` (pre-merge) | Rejected: would let an unreviewed receipt file trigger a real notification/assignment before the ledger entry has passed review — violates the "merge-gated" property Boss required for the store itself. |
| Phase B v1 invokes a Codex/Claude session directly (`workflow_dispatch` into an agent-runner) | Rejected per Boss decision #2: no supported host API exists yet; deferred to a future Phase B capability with its own SDD/threat model once such an API exists. |
| New dispatcher-owned loop-safety budget (e.g. max receipts per Work Item per day) | Considered and not adopted in this phase per Boss decision #3, reusing the existing routing circuit breaker instead. The one gap this originally left open (no cross-turn counting mechanism) is closed by the receipt-authorship prior-ledger-check amendment (Component Design §1–§2; Boss approval, Issue #35 comment, 2026-07-19) rather than by adding a new budget — see Threat Surface Summary §4. |
| One combined workflow for both PR-time validation and post-merge notify | Rejected: different trigger semantics (`pull_request` vs. `push`) and different token scopes (read-only validation vs. issues-write notify) are cleaner as two workflows, consistent with how `validate-contracts.yml` and `work-item-readiness-refresh.yml` are already separate today. |
| Automatic timer-based `expired` transition (e.g. a scheduled workflow that expires stale receipts) | Deferred: would require a new scheduled runtime and its own write-back-to-ledger permission (`contents: write`) — a larger privilege surface than Phase A's "no new runtime" goal allows. Phase A leaves `expired` as a manually-declared, evidenced state; an automatic expiry sweep is a candidate for a later phase if staleness proves to be an operational problem in practice. |

## Decision

Adopt the file-based dispatch-receipt ledger under `docs/records/dispatch-receipts/` with the schema and state model above, enforced at PR time by a new `validate:dispatch-receipts` CI check, plus a post-merge, `push`-triggered, least-privilege GitHub Actions notify-only workflow (`dispatch-receipt-notify.yml`) implementing Phase B v1's "notify + assign" scope exactly as Boss's decision #2 defined it. No session-invocation capability, no new loop-safety budget, and no GitLab parity are included in this phase.

## Testability Notes

- Unit tests for `scripts/validate-dispatch-receipts.mjs`'s pure matching function: missing receipt, mismatched `target_agent`, mismatched `handoff_event_id`, `expired`/`cancelled` receipt for a still-live `Dispatch`, and the passing case — mirroring the existing `work-item-readiness.mjs`/`validateReadiness` unit-test style.
- Schema tests for `dispatch-receipt.schema.json` (valid/invalid fixtures under a new `docs/contracts/examples/dispatch-receipts/` directory), mirroring `docs/contracts/examples/bug-fix-*.yaml`.
- A negative test proving a receipt file cannot skip straight to `consumed` without ever being `registered` (state-machine edge validation).
- A negative test proving two receipt files cannot claim the same `handoff_event_id` with divergent content (filename-as-key invariant).
- For Phase B v1: an integration-style test/dry-run harness (following the same pattern QA used for the Issue #33 live-transcript proof) demonstrating the notify workflow posts exactly one comment/label per newly `registered` receipt and takes no action on `consumed`/`expired`/`cancelled` transitions or already-notified receipts (idempotency — do not re-notify on an unrelated push that happens to touch the same path without a new `registered` entry).
- A test proving the notify workflow performs zero writes to any path under `docs/records/dispatch-receipts/` (enforces "no write path back into the ledger" from Security Considerations).
- **Added by this amendment:** unit tests for the `dispatch_depth` validation rule in `scripts/validate-dispatch-receipts.mjs`: missing `dispatch_depth` on a new receipt, `dispatch_depth` that understates the prior-ledger max, `dispatch_depth` correctly computed as `1` for a Work Item's first receipt, `dispatch_depth` correctly computed as `max + 1` for a Work Item with multiple prior receipts across mixed states, a same-role-pair third-round-trip receipt missing `escalated: true` (must fail), and the same case with `escalated: true` present (must pass) — mirroring the existing missing-receipt/mismatch test style above.

## Threat Surface Summary (for Security Reviewer)

This section is the required design input for Issue #35's Security Reviewer threat model. SA does not attempt the threat model itself; SA surfaces the concrete surfaces and one flagged gap Security Reviewer should focus on first.

### 1. Token scope

Two distinct App tokens are in play, and they must remain distinct (not shared with each other or with the existing `work-item-refresh` App/environment):

- **Phase A CI validation** (`validate-dispatch-receipts.mjs` inside `validate-contracts.yml`): runs on `pull_request` (not `pull_request_target`), reading only the PR's own content and the repo's own already-checked-out files. It needs no elevated token beyond the default `GITHUB_TOKEN` read scope, and should not be granted `issues: write` or `pull-requests: write` — it only produces a pass/fail CI result, not a comment.
- **Phase B v1 notify** (`dispatch-receipt-notify.yml`): runs on `push` to `main`, needs `issues: write` (comment + label) and possibly `pull-requests: write` if a Work Item is a PR. Security Reviewer should confirm the minimum actual scope needed (e.g. can label-application and comment-posting be done with `issues: write` alone, without `pull-requests: write`, if PR-as-Work-Item cases route through the Issues API surface for comments) and should confirm the App is provisioned with exactly that, in its own `environment:`, separate from the `work-item-refresh` App's `checks: write` scope.

### 2. Receipt file forgery/tampering

Mitigated structurally by Boss decision #1's "merge-gated" requirement: a receipt file only becomes canonical ledger state once it has passed the repo's PR-gated merge process on `main` and lands on `main`. **Actual live configuration of the "Protect main" ruleset (id `18992836`), stated plainly rather than assumed:** a PR is required before merge, `required_approving_review_count: 0` (no human approval is currently required), one required status check (`work-item-readiness-freshness`), `strict_required_status_checks_policy: true` (a PR's branch must be up to date with `main` before it can merge; enabled 2026-07-19 — confirmed live via `gh api repos/chakrits/AI-Agent-Workflow/rulesets/18992836 --jq '.rules[] | select(.type=="required_status_checks") | .parameters.strict_required_status_checks_policy'` returning `true`), and no bypass actors configured. Concretely: (a) an attacker cannot single-handedly create a `registered` receipt that triggers Phase B's notify workflow without getting a PR merged to `main`, which requires passing the required status check above (not human review, since `required_approving_review_count` is `0`); (b) the Phase A CI check itself runs on the PR *before* merge and therefore cannot be bypassed by a forged receipt that only appears after merge; (c) Phase B's notify workflow trusts the `main` branch content unconditionally once merged — **Security Reviewer should weigh whether `required_approving_review_count: 0` (i.e. a passing required status check, with no human approval, is sufficient to merge) is an acceptable trust boundary for this ledger, since Phase B has no independent authenticity check on the receipt file's content beyond "it is on `main`."** This is the same trust model every other automation in this repo already uses (e.g. `work-item-readiness-refresh.yml` also trusts the default-branch checkout unconditionally), so it is a consistent, not novel, exposure — but the `0`-required-approvals fact is stated here explicitly rather than glossed over, since it is a real gap Security Reviewer may want tracked separately from this amendment's scope.

### 3. Event spoofing

- The `push`-to-`main` trigger only fires on an actual push to `main`, which (given the merge-gate above) only happens via a merged, reviewed PR — an external actor cannot spoof this trigger without push access to `main`, which should be restricted to the merge mechanism itself (no direct pushes).
- `pull_request` (not `pull_request_target`) is used for the Phase A CI check specifically because `pull_request_target` runs with base-branch permissions against attacker-controlled head content — a known GitHub Actions spoofing vector. Since Phase A validation only needs to read the PR body/diff and the base ledger, `pull_request` with default read-only permissions is the correct, lower-privilege trigger, and Security Reviewer should confirm no future change accidentally upgrades this to `pull_request_target` to gain elevated permissions.
- The notify workflow's `github.event` payload (`push`) is standard GitHub-issued event data for an authenticated push to a protected branch; there is no user-controllable "which Issue/PR gets notified" input outside of what is already inside the merged, reviewed receipt file content — i.e. the same merge-gate again bounds this vector.

### 4. Routing-circuit-breaker sufficiency (Boss decision #3)

Boss's decision reuses the existing "same two roles route a work item back and forth more than twice" circuit breaker (`docs/workflow/role-definitions.md` "Routing Circuit Breaker") as sufficient loop safety for the dispatcher, with no new dispatcher-owned budget. SA's assessment, and the one gap being surfaced rather than silently deferred to Boss's answer:

- **Where it is sufficient:** the existing breaker already covers the *turn-based* oscillation pattern (Agent A dispatches Agent B, which dispatches back to Agent A, repeatedly) because it counts routing transitions between roles regardless of which mechanism (in-turn `collaboration.wait_agent` or a Phase A/B receipt) produced the route. A receipt-driven A->B->A->B loop is still, at the routing-history level, the same pattern the breaker already detects and escalates to Human after two unresolved round trips.
- **Gap closed by this amendment (Boss approval, Issue #35 comment, 2026-07-19: "ไอเดียน่าสนใจ เอาที่ SA เสนอเข้ามาด้วย").** The original version of this SDD flagged that the existing breaker's counting mechanism (`Rework Count`, routing history in `TASK_LOG.md`/handoff records) is designed around a *single continuous session or a chain of sessions a human/Orchestrator is actively tracking*, and that nothing required a receipt author to check prior ledger entries before filing a new one — so an unbounded cross-turn dispatch chain had no counting mechanism at all. This is now closed: Component Design §1 ("Receipt-authorship duty: prior-ledger check") makes reading prior ledger entries for the Work Item, and recording the resulting `dispatch_depth`, a mandatory part of filing any receipt; Component Design §2 makes this CI-enforced (a receipt cannot merge without a correct `dispatch_depth`, and cannot silently exceed the reused breaker bound without `escalated: true`). The ledger itself is now the durable, cross-turn-visible history the breaker's sufficiency argument requires — no single session needs to hold the full history locally, because each new receipt author is required to (and CI-verified to have) read it from the ledger. Security Reviewer should verify the CI rule in §2 (depth-correctness check, bound-exceeded-requires-`escalated`) is sufficient to make this a hard gate rather than an honor-system convention, given it is enforced the same way the existing receipt-matching rule is (merge-gated CI check, fail-closed).
- **New residual risk introduced by this amendment: concurrent receipt authorship race.** Two receipts for the same `work_item_url` authored concurrently in two different open PRs will independently compute the same `dispatch_depth` (each reads the same pre-merge ledger state and derives `max(...) + 1`), because neither PR can see the other's not-yet-merged receipt. Whichever PR merges first is fine; whichever merges second now has a `dispatch_depth` that collides with (does not increment past) the first PR's now-merged receipt, and CI's depth-correctness check (§2) would fail it at that point *if re-run against the updated base* — but if the second PR's CI check ran and passed *before* the first PR merged, GitHub does not automatically re-run checks against the new base unless the repository's branch protection requires branches to be up to date before merging. **This is the same "PR base can go stale before merge" race every other content-based merge-gate in this repo already has (e.g. two PRs editing the same file); it is not a new class of race this amendment introduces, but the depth check makes a stale-base merge *silently wrong* (a duplicate/incorrect `dispatch_depth` lands on `main`) rather than a normal git merge conflict, because two differently-named receipt files (different `handoff_event_id` filenames) do not collide at the filesystem level the way the existing duplicate-filename protection (Error Handling table) relies on.** SA's judgment: this precondition is now **satisfied and confirmed live** — the "Protect main" ruleset (id `18992836`) has `strict_required_status_checks_policy: true` (confirmed 2026-07-19 via `gh api repos/chakrits/AI-Agent-Workflow/rulesets/18992836 --jq '.rules[] | select(.type=="required_status_checks") | .parameters.strict_required_status_checks_policy'` returning `true`). The race is therefore closed as designed: a PR carrying a stale, pre-merge view of `dispatch_depth` cannot merge until its branch is brought up to date with the current `main` tip and its required status check (`work-item-readiness-freshness`) is re-run and passes against that updated base, at which point Phase A's depth-correctness check (§2) would catch a now-stale/colliding `dispatch_depth` before merge. **Operational note (per SA's prior impact analysis already posted to Issue #35):** the required check is published by a third-party GitHub App, not a first-party workflow this repo controls; under high dispatch cadence, merge-time latency while PRs queue to pick up an up-to-date base and re-run that third-party check is an accepted operational tail risk, not a design gap — SA is not proposing any additional mitigation for it in this amendment.

### 5. Additional surfaces for Security Reviewer to weigh

- **Label/mention surface as a notification channel**: a label or `@mention` applied by an automated App could itself be a low-severity spam/DoS vector if receipt creation is cheap (any PR author can add a receipt file). Since receipt creation itself goes through the same PR review gate as any other file, this is bounded by the same merge-gate, but Security Reviewer should confirm the notify workflow rate-limits or dedupes repeated notification for the same `handoff_event_id` (Testability Notes above already requires this as an idempotency test).
- **Supply chain**: all new/changed workflow steps must use SHA-pinned actions, matching this repo's existing convention (`work-item-readiness-refresh.yml`'s pinned `actions/checkout`, `actions/create-github-app-token`, `actions/github-script`) — Security Reviewer should confirm the actual pinned SHAs chosen at implementation time are current, non-deprecated releases, not just that pinning-by-SHA is used.
