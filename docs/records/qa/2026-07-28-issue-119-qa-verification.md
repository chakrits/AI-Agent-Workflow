# QA Verification: PR #124 — Dispatch receipt lifecycle anti-forgery controls (Issue #119)

## Scope

Independent re-derivation against `729e720` (implementation commit),
covering ADR-0013's 5 controls per the Security-approved-conditionally
SDD, with Boss's confirmation of Option A and Control 3.3 tightened now.

## Verified

- `npm test`: 241/241 (223 → 241, +18 new tests covering all 10 required
  adversarial cases from the SDD, exceeding the minimum: added 2 extra
  cases — a same-value no-op edit after a terminal state must NOT be
  flagged, and cross-repo comment URLs must not trigger a network call).
- **One real bug caught by the tests, not by inspection**:
  `parseTerminalResultId`'s comment-URL regex capture-group index was off
  by one — `commentId: Number(match[3])` captured the `(issues|pull)`
  group instead of the digit group, which would have made every live
  Control 3.3 check request `GET .../issues/comments/NaN`, silently
  rejecting every legitimately-consumed receipt with a comment-URL
  evidence form. Fixed to `match[4]`.
- **Independently re-verified Control 1 against a real git repository**,
  not only the injected-fake-history unit tests: built a scratch git repo,
  committed a receipt through a genuine `registered → consumed` history,
  confirmed `defaultGetRevisions` correctly walks it via `git log --follow`
  + `git show` and reports zero errors; then committed a second receipt
  that was `consumed` from its very first commit (the exact forgery
  Control 1.1 exists to catch) and confirmed it is rejected with the
  correct message. This exercises the real `git` subprocess calls, not a
  mock.
- Confirmed `.github/workflows/validate-contracts.yml` passes
  `secrets.GITHUB_TOKEN` as `GITHUB_TOKEN` env to the
  `validate:dispatch-receipts` step, so Control 3.3's live check has a
  token in the real CI run (public-repo comment reads work unauthenticated
  too, but an authenticated call avoids the 60/hr unauthenticated rate
  limit).
- Confirmed the schema's new `$comment` (Control 4) is present and Ajv
  ignores it for validation (schema still compiles; existing fixture still
  passes).
- Confirmed Control 5 never appears in `validateDispatchReceipts`'s return
  value (grep: `checkExpiryWarnings` is called only in the CLI's `main()`,
  printed via `console.warn`, never pushed into `errors`) — satisfies
  "never blocks CI, never auto-mutates state."

## Acceptance Criteria (from the v3 Issue #116 spec)

| AC | Result | Evidence |
|---|---|---|
| AC-1: SDD or ADR documents the full lifecycle | PASS | `docs/superpowers/specs/2026-07-28-dispatch-receipt-lifecycle-security-revision.md`; ADR-0013 |
| AC-2: anti-forgery controls defined | PASS | Controls 1-5 implemented and tested |
| AC-3: SA Agent approves design | PASS | SDD authored by SA Agent session |
| AC-4: Security Reviewer approves design | PASS | `docs/records/qa/2026-07-28-issue-119-security-review.md`, conditional approval satisfied by Boss's Control 3.3 decision |
| AC-5: schema fields mapped to generation source | PASS | Control 2 (identity allow-list), Control 3 (evidence existence per shape) |

## Verdict

PASS. No blocking findings. Ready for Human Approval / merge.

`npm test`: 241/241. `validate:dispatch-receipts`, `validate:contracts`,
`adr-audit`: all pass.
