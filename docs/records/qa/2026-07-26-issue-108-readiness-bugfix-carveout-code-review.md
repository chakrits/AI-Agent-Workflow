# Code Review Request — Issue #108 Bug Fix Readiness Carve-out

## Intent

Fix `scripts/work-item-readiness.mjs` so a PR linking a Bug Fix Issue (labeled `bug`) is
evaluated against Bug Fix contract evidence — QA evidence in the PR body — instead of the
Feature/Enhancement `phase:`/`status:` lifecycle label contract, which `AGENTS.md`
documents as not applying to Bug Fix work.

## Changed Areas

- `scripts/work-item-readiness.mjs` — `validateReadiness()` gains an early branch for
  `labels.includes('bug')` that checks only QA evidence (when not a draft) and returns,
  bypassing the phase-count and `status:*` checks entirely.
- `test/work-item-readiness.test.mjs` — 5 new regression cases.

## Review Focus

1. A Bug Fix Issue with no `status:*` labels and valid QA evidence passes.
2. A Bug Fix Issue with no QA evidence still fails — the carve-out narrows which labels are
   required, it does not remove QA evidence as a requirement.
3. A draft PR against a Bug Fix Issue does not require QA evidence, matching the existing
   draft exemption pattern used for Feature/Enhancement.
4. A Feature/Enhancement work item (no `bug` label) is unaffected — same behavior as before
   this change.
5. The phase-count check (`exactly one current phase`) is bypassed for Bug Fix work items
   too, not only the `status:*` labels — `AGENTS.md`'s lifecycle label contract section
   opens with "For Feature and Enhancement work items, use labels in two separate
   categories," scoping both label categories, phase and status, to that workflow.

## Findings

- Root cause confirmed: `validateReadiness()` had exactly one code path for a linked Issue
  and applied the Feature/Enhancement lifecycle label contract unconditionally, with no
  branch recognizing a Bug Fix work item.
- Chosen approach: label-based carve-out (`labels.includes('bug')`), matching Candidate
  Approach 1 in Issue #108. Simplest option that satisfies AC-01 through AC-03 without
  touching the PR template or introducing a second label vocabulary.
- Verified against Issue #106 directly as the real-world adversarial case: with labels
  `['bug', 'phase:requirements']` and a valid QA evidence line, `validateReadiness` returns
  `[]`.
- Regression coverage added for: ready Bug Fix passes; non-draft Bug Fix without QA
  evidence fails; draft Bug Fix without QA evidence passes; a Bug Fix Issue with no `phase:`
  label at all still passes (proving the phase-count check is genuinely bypassed, not
  incidentally satisfied); Feature/Enhancement path unchanged.
- Full `npm test` (207 → 212), `validate:contracts`, `validate:skill-parity`, and
  `validate:skill-usage` pass before handoff.

## Deliberately Not Enforced

- No new label vocabulary for Bug Fix state (Candidate Approach 3 in #108) — out of scope,
  more invasive than needed to unblock the readiness gate.
- No change to `scripts/work-item-readiness-check.mjs`'s linking/invocation plumbing —
  confirmed unchanged, per AC-05.
