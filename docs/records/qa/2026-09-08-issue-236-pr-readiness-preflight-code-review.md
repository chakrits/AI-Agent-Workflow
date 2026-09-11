# Code Review Findings

Scope: adds `scripts/setup-hooks.mjs` (`npm run setup:hooks`, activating the `.githooks` layer
that had never run because `core.hooksPath` was unset since 2026-07-20) and
`scripts/validate-pr-readiness.mjs` (`npm run validate:pr-readiness`, a local pull-request body
pre-flight importing `validateReadiness()` and `findLinkedIssueNumber()` rather than
re-implementing them), wires both as thin callers from `.githooks/pre-push` and a new
`.claude/settings.json` `PreToolUse` hook, and adds `test/setup-hooks.test.mjs` and
`test/validate-pr-readiness.test.mjs`. Work item:
[Issue #236](https://github.com/chakrits/AI-Agent-Workflow/issues/236) (IMP-007), AC-02 through
AC-05. Design authority: `DECISIONS.md` ADR-0022, plus three Human Maintainer decisions recorded
on the Issue 2026-09-08 (fail-closed on an unreadable body; degrade rather than fail offline;
GitHub-scoped, leaving `findLinkedIssueNumber()` untouched).

This record covers three rework cycles and four independent QA rounds. It is written after the
fact by the parent session rather than by the implementing agent, because the dispatch packets
placed `docs/records/` out of scope — an error in those packets, since `validate:review-gate`
requires this file whenever a `.mjs` changes. Recorded here rather than silently corrected.

## Self-review findings

- **The gate refused legitimate work three times, each time in a different shape.** Round 1's
  Blocker denied any command whose text contained the create verb after `;`, `&` or `|` — heredoc
  content included, because `\s` matches newlines. Dogfooding then showed the gate refused
  partial-progress pull requests, a class this repository opens routinely. Round 3's Blocker
  showed a valid partial-progress marker also suppressed a closing keyword naming a different
  Issue. The recurring lesson is that a gate written against fixtures does not meet the shapes real
  bodies and real commands take; every one of the three was found by running the wired path or a
  real body, never by the unit tests.
- **Two defects were found by the implementer only after wiring, not by its own tests.** The hook
  resolved `package.json` from the current working directory, so invoking it from `/tmp` produced
  a silent allow that defeated the only blocking gate in the Issue; and a merged closeout pull
  request's real body was refused because closeout bodies carry no closing keyword by design.
- **One existing test encoded a defect as correct behaviour** and was inverted in cycle 3. It had
  asserted that a valid marker suppresses a wrong-Issue closing keyword — the exact behaviour the
  Human Maintainer subsequently confirmed as a defect. Inverting it is the single assertion
  reversal in this work; nothing was deleted, relaxed, or made vacuous.
- **A test claiming to pin `--draft` detection had a vacuous assertion** — the detection could be
  deleted and the test stayed green. Fixed in cycle 3, and its ten neighbours were inspected for
  the same fault.
- **The closing-keyword rule exists only in this validator.** It is absent from
  `work-item-readiness.mjs`, all six GitHub workflows, and `.gitlab-ci.yml`. The local gate is
  therefore strictly stricter than CI, which is why the "CI re-derives it" mitigation that covers
  other residuals did not apply to round 3's Blocker.

## Acceptance Criteria verification (AC-02 through AC-05 only — AC-06 through AC-14 are out of this dispatch's scope by design)

- **AC-02** — `npm run setup:hooks` sets `core.hooksPath` to `.githooks`, is idempotent, and is
  documented in `README.md`. Verified by QA in a fresh clone, including `post-merge` firing on a
  real merge to `main`.
- **AC-03** — the validator imports rather than re-implements; both protected scripts are
  byte-identical to `main`. All three Human Maintainer decisions are implemented as decided.
- **AC-04** — wired as a blocking `PreToolUse` hook and as `.githooks/pre-push`, both thin callers
  of the same npm script, so ADR-0022's invariant holds: `.claude/settings.json` originates no
  rule. No commit-time gate exists at any hook point, per ADR-0022's withdrawal of AC-10.
- **AC-05** — `WORK_ITEM_CONTRACT` documents the shape both producers must satisfy and is tested
  against the real `buildReadinessCheck()`, with the `isSameRepository` divergence between the CI
  and local paths pinned rather than hidden.

## TDD and mutation verification

Test count 565 → 666. Every fix in cycles 1 through 3 was confirmed by applying the mutant to the
shipped code and observing a test die, not by counting tests. QA rebuilt its mutation map in round
2 after the Blocker fix replaced a regex with a lexer, since the earlier map no longer described
the code, and fuzzed that lexer with 200,000 shell-metacharacter inputs (0 throws, 0 hangs, worst
case 1ms) — which established that the implementer's `catch` was dead code and the load-bearing
fail-open lay elsewhere.

## Verification

`npm test` 666 pass / 0 fail. `validate:contracts`, `validate:ci-parity`, `validate:project-state`,
`validate:context-budget` (29534/30000, unchanged), `validate:skill-parity` (39),
`validate:adapter-parity` (11) all PASS.

QA evidence, four rounds:
<https://github.com/chakrits/AI-Agent-Workflow/issues/236#issuecomment-5586276405>

## Deviations from the dispatch packet

- Cycle 3 was authorised past the two-cycle rework ceiling by explicit Human Maintainer decision,
  following the Issue #210 precedent.
- The packets placed `PROJECT_STATUS.md`, `TASK_LOG.md` and `docs/records/` out of scope for the
  implementing agent, so the parent session wrote them. For `docs/records/` this was an error in
  the packet rather than a deliberate split, as noted above.

## Known limitations carried forward, not fixed

- The marker parser scrubs fenced and inline-backtick regions but not four-space indented blocks,
  HTML `<code>`/`<pre>`, fences indented more than three spaces inside lists or blockquotes, or
  spans straddling a newline. QA classified the residual Minor: the documented `issue-N` form does
  not match those shapes, and a silent waiver additionally requires a forgotten closing keyword.
- `isCloseout` reads the body unscrubbed, so a fenced closeout marker still flips the closeout
  branch. Bounded by the authorized-file rule to exactly the residual round 2 accepted.
- Shell variables in a `--body-file` path reach the hook unexpanded and are refused, because a
  `PreToolUse` hook sees the command before the shell expands it.
- `validate:pr-readiness` is deliberately in no CI file: it validates a local draft no CI job
  possesses, and CI already enforces the equivalent rules server-side. This is input to AC-12.

## Review Decision

Approved for merge with the limitations above recorded. Independent QA round 4 returned
PASS_WITH_FINDINGS with no Blocker and no Major.
