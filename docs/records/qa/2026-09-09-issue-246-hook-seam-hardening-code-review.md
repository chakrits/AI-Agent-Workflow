# Code Review Findings

Scope: Issue [#246](https://github.com/chakrits/AI-Agent-Workflow/issues/246) AC-02 through AC-08,
implementing the Human Maintainer decisions recorded as `DECISIONS.md` ADR-0024. Changes
`scripts/work-item-readiness.mjs`, `scripts/work-item-readiness-check.mjs`,
`scripts/validate-pr-readiness.mjs`, their tests, and `README.md`. Design authority: ADR-0022
(hook layer invariant) and ADR-0024 (decisions D1–D5). AC-01 was closed before this work.

Two commits, deliberately separated because they are different kinds of change:

1. AC-07 — relocates a rule into the shared readiness core that CI runs.
2. AC-02/AC-03/AC-08 — alters local `PreToolUse` hook behaviour at the command-string seam.

## Self-review findings

- **The relocated rule lands in a live gate.** `scripts/work-item-readiness.mjs` and
  `scripts/work-item-readiness-check.mjs` are executed by the `work-item-readiness-freshness`
  check that gates every pull request here. The change is additive: `validateReadiness()` gained an
  optional `linkedIssueNumber`, and every caller that omits it gets byte-identical behaviour —
  pinned by a test that asserts exactly that. `buildReadinessCheck()` is the only new supplier.
  `work-item-readiness-refresh.yml` checks out the *default branch's* copy of the module, so the
  new rule cannot evaluate this branch's own pull request before it merges.
- **Three fixture bodies in `test/work-item-readiness-check.test.mjs` had no closing keyword.**
  They failed once the rule moved. The bodies were corrected (a ready pull request must close its
  linked Issue); no assertion was removed or relaxed.
- **Two existing assertions encoded behaviour ADR-0024 overturns.** `N1/AC-04: an unreadable
  --body-file is denied, not allowed` asserted the exact rule D1 scopes away. It was **replaced,
  not deleted**, by an equivalent assertion: the hook must still tell the author the body went
  unchecked — it may stop being destructive, it may not fall silent. A second test used a relative
  `--body-file` incidentally; its own claim (the flag is read from the matched segment, not the
  whole command string) is unchanged, only its paths are now absolute.
- **Ordering is the load-bearing detail of AC-08, not the refusal itself.** `$S/body.md` and
  `~/body.md` are not absolute literals. A naive "does not start with `/`" test would refuse them
  and re-create shape 5 of the refuses-legitimate-work table while fixing shape 7. Shell-syntax
  paths are therefore classified as *unresolvable and allowed* before the relative-path refusal is
  ever reached, and a test pins that order.
- **The no-flag deny is still whole-call destructive.** ADR-0024 leaves that open deliberately; it
  is a property of the hook point, not of D1. Reproduced during this work (see below) and not
  changed.

## Acceptance Criteria verification

- **AC-02** — an absolute `--body-file` that cannot yet be read is allowed with a warning naming
  what went unchecked. Fail-closed is retained unchanged for the no-flag case, `--body-file -`, and
  any readable body failing a rule. Proof is the destructive shape itself, run through the live
  hook in this session, not a unit test: see "Destructive-shape evidence".
- **AC-03** — declined, with the reasoning recorded in `scripts/validate-pr-readiness.mjs` beside
  the classification and in `README.md`'s new `--body-file` shape table. The symptom is removed by
  the allow-with-warning path; the root cause (the hook sees text, not resolved state) is recorded,
  not fixed.
- **AC-04** — `runHookMode()`'s paths verified by mutation, not by count: six mutants, six killed
  (M1 non-Bash guard, M2 `--help` guard, M3 error-shape deny, M4 unresolvable-path branch,
  M5 relative-path refusal, M6 allow-with-warning on an unreadable file).
- **AC-05** — verified against real bodies retrieved with `gh pr view <N> --json body` for PRs
  #232, #234, #242, #243 and #245, with changed-file sets reconstructed from each merge commit
  rather than derived from the branch under work. Results are identical to the pre-change scripts
  at `b69d5b2` for every one of the five.
- **AC-06** — 683 tests pass; no assertion removed without an equivalent replacement (see above).
  All named validators PASS.
- **AC-07** — the closing-keyword rule, the `advances-only` marker semantics and the code-span
  scrubber now live in `scripts/work-item-readiness.mjs` and are enforced by
  `work-item-readiness-refresh.yml`'s check. `.claude/settings.json` originates no rule, so
  ADR-0022's invariant holds again. No open pull requests existed when this landed, so the
  relocation turns nothing red retroactively.
- **AC-08** — a relative `--body-file` is refused rather than resolved against a guessed working
  directory. Verified with the two-`decoy.md` reproduction from D4.

## Destructive-shape evidence (AC-02)

The same command string, one payload, against the pre-change script and the post-change script:

```
$ node <b69d5b2 copy> --hook < payload.json
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny",
 "permissionDecisionReason":"PR readiness pre-flight could not read --body-file .../body.md."},...}

$ node scripts/validate-pr-readiness.mjs --hook < payload.json
{"systemMessage":"PR readiness pre-flight did NOT validate the pull request body: --body-file
 .../body.md does not exist yet at hook time — ..."}
```

End-to-end through the **live** hook in the implementing session, with a side effect before the
create verb in the same command string:

```
$ touch $S/canary.txt && gh pr create --title t --body-file $S/body.md --definitely-not-a-flag
unknown flag: --definitely-not-a-flag
exit=1
$ ls -l $S/canary.txt
-rw-r--r--  1 maclab  wheel  0 Sep  9 10:33 .../canary.txt
```

The canary ran; the tool call was not intercepted. That the hook was live for that call was proved
immediately afterwards by a probe of a shape that must still deny:

```
$ gh pr create --title "hook-liveness-probe" --definitely-not-a-flag
PR readiness pre-flight cannot read the pull request body: neither --body nor --body-file was
supplied, ...
```

That refusal is decision 1 working as designed and is reported, not routed around.

## TDD and mutation verification

- AC-07: 6 tests failing before the change, 0 after.
- AC-02/AC-03/AC-08: 5 tests failing before the change, 0 after (three further tests assert
  unchanged shapes and passed both ways by design).
- Mutation: 6 mutants introduced into `runHookMode()` and the `--body-file` classifier; all 6
  killed by the suite.

## Verification

`npm test` 683 pass / 0 fail (666 at `b69d5b2`) · `validate:contracts` PASS ·
`validate:ci-parity` PASS · `validate:project-state` PASS · `validate:context-budget` PASS ·
`validate:review-gate` PASS.

## Known limitations carried forward, not fixed

- The no-flag and `--body-file -` denials still discard the entire tool call. Out of scope per
  ADR-0024.
- `--body "$(cat x.md)"` remains a deny. D1 speaks about `--body-file`; extending it to `--body`
  substitutions was not decided and was not assumed.
- A body file whose absolute path is correct but unreadable for a *different* reason (permissions,
  a typo naming a file that never appears) is now allowed with a warning too. The hook cannot
  distinguish "not yet" from "never" without running the command; CI covers the difference.

## Review Decision

Implementation complete for AC-02 through AC-08; independent QA has not run. No QA sign-off is
claimed here.
