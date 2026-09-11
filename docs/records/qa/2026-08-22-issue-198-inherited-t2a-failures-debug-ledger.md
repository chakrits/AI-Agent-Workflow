# Debug Ledger — Issue #198

| Item | Detail |
|---|---|
| Work Item / Ticket | Issue #198 — inherited T2-A full-suite failures |
| Owner | QA/BA investigation → Human Maintainer |
| Started | 2026-08-22 |
| Current Status | Documentation slice applied; Developer compatibility-owner slice remains |

## Confirmed Root Cause

- Eight failures reproduce on candidate `0dd52e2c69814b23a93dbefae32744bffc7adf1e` and parent `ef3aea52b7652de957d986d09e55893a9b1eb445`.
- The failures are baseline drift: stale `docs/workflow/handoff-contract.md` hashes in `test/fixtures/context-pack-v1/required-source-matrix.json` plus `AGENTS.md` vocabulary drift.
- Human approval on Issue #198 authorizes `Reviewed Candidate SHA` and `Handoff Record Commit SHA` as the canonical two-SHA vocabulary.

## Evidence Breadcrumb — Documentation Agent

| Run ID | Timestamp | Change / Command | Observation | Result |
|---|---|---|---|---|
| RUN-006 | 2026-08-22 | `sha256` over the actual bytes of `docs/workflow/handoff-contract.md` | Before matrix value: `8f4a90da8c2cd30a9187209f423a9a40bd676597864632885636b471b9da7752`; computed value: `467892846fd15250f820045a0aceb7701ea5e23796f99b84afd64d8aa45a892a` | Re-pinned all 11 matching matrix rows; canonical contract was not modified |
| RUN-007 | 2026-08-22 | Reconciled `AGENTS.md` and recorded `TASK_LOG.md` Skill Used entry | Replaced `Verified Commit SHA` with the exact two canonical fields; Developer-owned compatibility drift remains out of scope | Documentation slice complete; validate and hand off to Developer Agent |

## Remaining Handoff

Developer Agent owns compatibility validator/test-fixture parity for the approved two-SHA field set. Do not modify the canonical handoff contract/template, weaken tests, or change T2-A production logic in that slice. Re-run the original eight repros, `npm test`, and `npm run validate:context-compatibility` after the compatibility-owner changes.
