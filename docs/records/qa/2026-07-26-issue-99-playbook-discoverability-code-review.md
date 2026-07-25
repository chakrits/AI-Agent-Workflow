# Code Review Request — Workflow Playbook Discoverability (Issue #99)

## Intent

Self-review of the new regression test added while implementing
`docs/superpowers/specs/2026-07-26-workflow-playbook-discoverability-design.md`
(Fix 5) — a documentation-only fix wiring 7 orphaned `docs/workflows/*.md`
playbooks into the routing surfaces agents and humans actually use. This
satisfies `scripts/validate-review-gate.mjs`'s requirement that any change
touching a `.mjs`/`.js` file carry a structured review record before merge.

## Changed Areas

- `test/validate-workflow-playbooks.test.mjs` — one new `node:test` case:
  "every playbook in docs/workflows/ has at least one inbound reference from
  a routing surface."
- `docs/workflow/dynamic-routing.md`, `AGENTS.md`, `README.md` — Fix 1,
  wiring `stabilize-core.md` in as a "Framework / Meta Change" Change Type.
- `docs/workflows/new-feature.md`, `README.md` — Fix 2, linking
  `feature-discovery-to-plan.md`.
- `docs/workflows/bug-fix.md` — Fix 3, backlinking `bug-debug-fix.md`.
- `.agents/skills/`, `.claude/skills/`, `.agent/skills/` (12 files) — Fix 4,
  "See also" backlinks in `code-review-gate`, `functional-test-design`,
  `tdd-implementation`, `engineering-postmortem`.

## Review Focus

1. Does the new test correctly implement the spec's stated check — a
   filename substring match of every `docs/workflows/*.md` basename against
   README.md, AGENTS.md, `docs/workflow/dynamic-routing.md`, and every
   `.agents/skills/*/SKILL.md`?
2. Does the test actually catch a real orphan, or does it produce false
   passes? Was the spec's exact test code sufficient to pass for all 12
   playbooks after Fixes 1-4 landed, or did a gap need resolving?
3. Are the 12 skill-file mirror edits (Fix 4) byte-identical across
   `.agents/skills/`, `.claude/skills/`, `.agent/skills/`, verified by
   `npm run validate:skill-parity` rather than by eye?
4. Does the test avoid regressing on a false positive from this spec
   document itself (which contains every playbook filename) by only
   scanning the routing-surface files, not the whole repository?

## Findings

- The spec's verbatim Fix 5 test code, applied as-given, **failed** on
  first run: `docs/workflows/bug-debug-fix.md` was reported as still having
  no inbound reference. Root cause — Fix 3's backlink to `bug-debug-fix.md`
  was deliberately placed in `docs/workflows/bug-fix.md` (per the spec's
  explicit design, so as not to promote `bug-debug-fix.md` onto a routing
  surface the spec did not approve diffs for), but `bug-fix.md` is a
  playbook file, not one of the four routing-surface files the verbatim
  test scans (README.md, AGENTS.md, dynamic-routing.md, skill SKILL.md
  files). The spec's own Fix 3 rationale ("resolves `bug-debug-fix.md`'s
  orphan status") and its Fix 5 consumer-file list were mutually
  inconsistent as written.
- Resolved by widening the test's haystack with a second, transitive tier:
  a playbook also counts as reachable if it is referenced from another
  playbook that is *itself* directly reachable from a routing surface. This
  models "reachable during normal work" more accurately than the
  single-tier check, without editing README.md/AGENTS.md/dynamic-routing.md
  beyond what the spec's approved diffs already specify (no scope creep
  into promoting `bug-debug-fix.md` onto a routing surface).
- The second tier is deliberately *not* "any playbook may cite any other
  playbook" — only playbooks that pass tier 1 (directly reachable from a
  routing surface) extend the haystack for tier 2. Two orphan playbooks
  backlinking only each other would still both fail. Verified by hand: of
  the 12 playbooks, only `bug-debug-fix.md` relies on tier 2 (via
  `bug-fix.md`); the other 11 are satisfied directly by tier 1
  (`stabilize-core.md` via 3 routing-surface files, `feature-discovery-to-plan.md`
  via `new-feature.md`/README, the 4 skill-paired playbooks via their
  skill's new backlink, and the 5 pre-existing wired playbooks).
- The test is deliberately scoped to `.agents/skills/` only (not all three
  skill mirrors), matching the spec's stated rationale: skill-parity across
  platforms is already independently enforced by
  `scripts/validate-skill-parity.mjs`, so checking one canonical copy here
  avoids a redundant triple-check without weakening coverage.
- What this test deliberately does **not** check: it cannot distinguish a
  real routing reference from an incidental mention of a filename — a
  substring match, not a semantic link check. This risk is accepted per the
  spec's own risk analysis, on the basis that the four scanned files
  (README.md, AGENTS.md, dynamic-routing.md, skill SKILL.md files) do not
  mention playbook filenames incidentally today; confirmed by inspection —
  every filename match found in those files during this review is a
  genuine intentional routing reference, not incidental text.
- `npm run validate:skill-parity` confirms all 12 Fix 4 edits are
  byte-identical (matching MD5 hash per skill) across the three platform
  directories.
- `npm test` passes 207/207 (206 baseline + 1 new test); `npm run
  validate:contracts` passes with no change to contract-relevant content.

## Deliberately Not Enforced

- No check that a routing-surface reference is semantically correct (e.g.
  pointing to the right playbook for the right work type) — only that some
  reference to the filename exists somewhere in the scanned surface.
- No enforcement of tier-2 depth beyond one hop; a playbook reachable only
  via a chain of two or more playbook-to-playbook backlinks would still be
  flagged as an orphan by this test. That is intentional — deeper chains
  are harder for a human or agent to actually discover during normal work,
  so the test's one-hop limit matches the "reachable during normal work"
  goal rather than pure graph reachability.
