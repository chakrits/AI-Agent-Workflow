# Code Review Request — Issue #108 Bug Fix Readiness Carve-out

## Intent

Fix `scripts/work-item-readiness.mjs` so a PR linking a Bug Fix Issue (labeled `bug`) is
evaluated against Bug Fix contract evidence — QA evidence in the PR body — instead of the
Feature/Enhancement `phase:`/`status:` lifecycle label contract, which `AGENTS.md`
documents as not applying to Bug Fix work.

## Changed Areas

- `scripts/work-item-readiness.mjs` — `validateReadiness()` gains an early branch requiring
  **both** `labels.includes('bug')` **and** a `Governing workflow: Bug Fix` declaration in
  the PR body. When both hold, it checks only QA evidence (when not a draft) and returns,
  bypassing the phase-count and `status:*` checks. When only one holds, it falls through to
  the strict Feature/Enhancement path.
- `test/work-item-readiness.test.mjs` — 7 regression cases covering the carve-out and its
  fallback.
- `.github/pull_request_template.md` — documents the `Governing workflow: Bug Fix` field
  under Lifecycle Readiness so authors of future Bug Fix PRs know it exists.

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
6. A `bug` label alone does not trigger the carve-out — the PR body must also declare
   `Governing workflow: Bug Fix`. A mislabeled Feature/Enhancement Issue is caught by the
   strict path rather than silently skipping the whole gate.
7. A declared `Governing workflow: Bug Fix` line alone, on an Issue that isn't labeled
   `bug`, also does not trigger the carve-out — both signals are required, neither is
   sufficient alone.

## Findings

- Root cause confirmed: `validateReadiness()` had exactly one code path for a linked Issue
  and applied the Feature/Enhancement lifecycle label contract unconditionally, with no
  branch recognizing a Bug Fix work item.
- Chosen approach: two-signal carve-out — `labels.includes('bug')` **and** a
  `Governing workflow: Bug Fix` line in the PR body — combining Candidate Approaches 1 and
  2 from Issue #108, per Human Maintainer decision after independent QA flagged that
  Approach 1 alone let any Issue mislabeled `bug` silently bypass the entire lifecycle gate
  on a required merge check.
- Verified against Issue #106 / PR #107 directly as the real-world adversarial case: with
  labels `['bug', 'phase:requirements']` and a body carrying both the governing-workflow
  declaration and a valid QA evidence line, `validateReadiness` returns `[]`; with the
  declaration missing, the same labels correctly fall through to the strict path and fail.
- Regression coverage (7 cases): ready Bug Fix passes; non-draft Bug Fix without QA
  evidence fails; draft Bug Fix without QA evidence passes; a Bug Fix Issue with no `phase:`
  label at all still passes once its workflow is declared; a `bug`-labeled Issue with no
  governing-workflow declaration falls through to the strict path; a governing-workflow
  declaration on a non-`bug`-labeled Issue does not trigger the carve-out;
  Feature/Enhancement path unchanged including its non-draft shape.
- `.github/pull_request_template.md` documents the required `Governing workflow: Bug Fix`
  line under Lifecycle Readiness, so the field is discoverable rather than tribal
  knowledge.
- Full `npm test` (207 → 214), `validate:contracts`, `validate:skill-parity`, and
  `validate:skill-usage` pass before handoff.

## Deliberately Not Enforced

- No new label vocabulary for Bug Fix state (Candidate Approach 3 in #108) — out of scope,
  more invasive than needed to unblock the readiness gate.
- No change to `scripts/work-item-readiness-check.mjs`'s linking/invocation plumbing —
  confirmed unchanged, per AC-05.
- No enforcement that the declared governing workflow matches reality beyond the two-signal
  check itself — a PR author could still declare `Governing workflow: Bug Fix` on a
  work item that isn't one. This raises the bar (both a label and a body declaration must
  now be wrong together) but does not eliminate the possibility; treated as acceptable
  residual risk rather than a gap requiring further work.

## QA Findings and Response

Independent QA verification (PASS on all 5 original ACs) flagged two items:

1. **Test-effectiveness gap**: the original "Feature/Enhancement work item is unaffected"
   test was byte-for-byte identical to a pre-existing test and added zero coverage toward
   AC-02, and no test exercised a non-draft Feature/Enhancement PR. Fixed: replaced with a
   non-draft case asserting all four errors.
2. **Headline finding**: the bare `labels.includes('bug')` signal let any mislabeled Issue
   bypass the entire lifecycle gate. Human Maintainer decided to require the
   `Governing workflow: Bug Fix` declaration alongside the label (Candidate Approach 2).

## Second QA Re-verification — Finding and Response

The first two-signal implementation (commit `6b6c1c4`) used an unanchored
`/Governing workflow:\s*Bug Fix\b/i` regex. Re-verification found this reintroduced the
exact same class of defect one level down: `.github/pull_request_template.md`'s own
instructional guidance text ("Instead, include this line in the PR body: `Governing
workflow: Bug Fix`.") **contains the literal matchable phrase**, and the regex had no
anchoring or code-span exclusion to distinguish a real authored declaration from
boilerplate prose mentioning it. Any PR retaining that unedited blockquote plus a `bug`
label would pass without an author ever typing a genuine declaration — arithmetically the
same failure as the original single-signal defect: a conjunctive gate where one operand
ships pre-satisfied.

Fixed by anchoring the regex to line start: `/^Governing workflow:\s*Bug Fix\b/im`.
Reproduced via node before the fix (unedited template matched: `true`) and after (matched:
`false`), and confirmed the legitimate declaration shape still matches at any position in
the body (multiline `^`). Added 3 regression cases: the unedited template itself as an
adversarial fixture (mirroring the pattern from Issue #106's fix, which used the real
`docs/records/qa/` directory rather than a synthetic one), a blockquoted copy of the
declaration line, and a genuine mid-body declaration to confirm the anchor doesn't over-
restrict to only the first line. `npm test` 214 → 217; all gates re-run and pass.
