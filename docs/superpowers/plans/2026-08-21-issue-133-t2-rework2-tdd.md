# IMP-003-T2 Rework 2 TDD Checklist

## 1. Target Behavior

| Item | Detail |
|---|---|
| Requirement / Bug Ref | Issue #133 T2 findings 1–10; AC T2-01..T2-12 |
| Expected Behavior | Every public boundary is closed, total, fail-closed, and data-bound; rejected operations preserve all harness state. |
| Current Behavior | Unknown fields and unsafe identities/paths can pass; result digests are shape-only; malformed digest derivation throws; race evidence is sequential; snapshots omit orchestration resources. |
| Test Seam | Node unit tests with disposable in-memory harness. |

## 2. RED — Failing Tests

Tests are added to `test/status-cas-decision.test.mjs` and `test/status-writer-harness.test.mjs` before the corresponding runtime/schema changes. They target each reported finding and assert exact code-only errors or unchanged snapshots.

## 3. GREEN — Minimal Fix

Implement only the contract and disposable-harness seams named by T2. Reuse T1 digest helpers. No production writer, real ref, credentials, authority switch, orchestration, or dispatch relay is introduced.

## 4. Verification

The focused tests, full suite, contract/project-state/skill/context validators, review-gate check, and `git diff --check` are required before handoff.

## 5. Handoff

Fresh independent Code/Security re-review is the next action; unresolved blockers after this final rework require human review.
