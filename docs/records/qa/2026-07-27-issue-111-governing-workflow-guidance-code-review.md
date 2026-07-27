# Code Review Request — Issue #111 Governing-Workflow Guidance

## Intent

Fix two gaps found while verifying Issue #108: the GitHub PR template's guidance
backtick-wraps the required `Governing workflow: Bug Fix` declaration (inviting a
good-faith author to copy the backticks too, which then fails the anchored regex — a false
negative that blocks a legitimate Bug Fix PR), and the GitLab MR template has no equivalent
guidance at all.

## Changed Areas

- `.github/pull_request_template.md` — the declaration phrase is no longer backtick-wrapped
  in the guidance sentence; it is stated as plain prose inside the existing blockquote,
  with explicit "no backticks, no quote marker" instruction.
- `.gitlab/merge_request_templates/Default.md` — gains the same Bug Fix carve-out guidance
  the GitHub template documents, worded identically apart from "PR" → "MR".
- `test/work-item-readiness.test.mjs` — 3 new regression cases.

## Review Focus

1. The GitHub template no longer contains the exact backtick-wrapped string
   `` `Governing workflow: Bug Fix` `` while still documenting the phrase.
2. The GitLab template now documents the same requirement.
3. Neither template's guidance, taken verbatim and unedited, itself satisfies the anchored
   declaration regex — the zero-effort-bypass property Issue #108 established must not
   regress.

## Findings

- Root cause: the original guidance sentence styled the required phrase as inline code
  (backtick-wrapped), which is the standard Markdown convention for "type this literally" —
  but literal copying, backticks included, produces a line that starts with a backtick
  character, not the letter G, so it fails `/^Governing workflow:\s*Bug Fix\b/im`'s anchor.
  This is the opposite failure direction from Issue #108's finding (that issue closed a
  bypass; this one closes an over-block).
- Chosen approach: reword rather than loosen the regex (Candidate Approach 1, not 3, from
  Issue #111 — Human Maintainer's explicit choice). The guidance sentence now states the
  phrase as plain prose with no backtick styling and an explicit negative instruction ("no
  backticks, no quote marker"). Because the sentence lives inside the existing `>`-prefixed
  blockquote, it still does not itself satisfy the line-start anchor — verified directly,
  not assumed.
- Approach 2 (GitLab parity) applied without debate — it was a flat gap, not a tradeoff.
  Worded identically to the GitHub template's corrected guidance.
- Approach 3 (loosen the regex to tolerate a wrapping backtick) deliberately not applied.
  It would fix only the one transcription shape already found (backtick-wrap) and not the
  general problem; the reworded guidance instead removes the backtick styling that
  motivated a literal copy-paste error in the first place, addressing the root cause rather
  than one symptom.
- Verified with a full repository sweep (same method as Issue #108's Pass 4): zero tracked
  files satisfy the anchored regex unedited, after this change — the zero-effort-bypass
  property is not regressed.
- Full `npm test` (219 → 222), `validate:contracts`, `validate:skill-parity`,
  `validate:skill-usage` pass before handoff.

## Deliberately Not Enforced

- No regex change (Candidate Approach 3) — see Findings above for why.
- No enforcement that an author actually reads and follows the corrected wording; this
  closes a specific, reproduced false-negative shape, not every possible transcription
  error.
