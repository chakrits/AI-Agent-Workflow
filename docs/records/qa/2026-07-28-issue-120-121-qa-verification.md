# QA Verification: PR #127 — Config Change and Data Change contracts (Issues #120, #121)

## Scope

Independent re-derivation against `93defc5`, covering both ADR-0014
(Config Change) and ADR-0015 (Data Change) and the shared `when`-clause
validator extension.

## Verified

- `npm test`: 271/271 (266 → 271: single-value `when` rejection,
  set-membership `when` rejection, rework-source-state generalization,
  and both new contracts' example-acceptance tests).
- `npm run validate:contracts`, `node scripts/adr-audit.mjs`: both pass.
- **Regression check on the two existing contracts** (bug-fix, new-feature):
  full suite still 271/271 after the `reworkSourceStates()` generalization —
  the two existing contracts each have exactly one state feeding `rework`
  ("verifying"), so the generalized derivation produces the identical set
  the old hardcoded check used; no behavior change for them.
- **Independently probed an edge case not covered by the existing test
  suite**: constructed a scratch fixture with `risk_tier: high` (not in the
  schema's `[low, medium]` enum) — confirmed the schema correctly rejects it
  ("must be equal to one of the allowed values"), verifying the schema-level
  guard backs up the workflow-engine-level `when` clause rather than relying
  on the `when` clause alone.
- Spot-checked both contracts' `when` clauses against their design docs'
  classification tables — Config's risk-tier branch and Data's
  PII/destructive/migration branches match the approved designs exactly
  (no drift between design and implementation).
- Confirmed the 3 issues the developer found and fixed during this build
  (boolean-`false`-evidence quirk, premature schema `allOf` conditionals,
  hardcoded `"verifying"` state name) are each genuine, and each fix is
  covered by a regression test or an existing/new example fixture that
  would have failed without it.

## Acceptance Criteria

### Issue #120 (Config Change)

| AC | Result | Evidence |
|---|---|---|
| AC-1: ADR documents design | PASS | ADR-0014, Accepted |
| AC-2: distinguishes low-risk vs medium-risk | PASS | `risk_tier` branch at `owner-review`, both examples exercise a different tier |
| AC-3: rollback/rollout semantics | PASS | `rollback_plan` required at classifying; `rework -> rollout` re-entry path |
| AC-4: BA/Config Agent approves design | PASS | Boss approval, in-session 2026-07-28 |
| AC-5: SA Agent approves design | PASS | Boss approval covers the `when`-clause validator extension |

### Issue #121 (Data Change)

| AC | Result | Evidence |
|---|---|---|
| AC-1: classification (reference-data/backfill/migration/destructive) | PASS | 4 combinable subtypes, schema `data_change_kind` array |
| AC-2: workflow design per subtype | PASS | `schema-design` only for migration; branches per the classification table |
| AC-3: rollback/validation semantics per subtype | PASS | `rollback_sql`, `rollback_idempotency_confirmed`, row-count-delta validation pair; blocked example's `rollback_sql: "NONE — irreversible"` demonstrates the honest-answer requirement for destructive ops with no reverse |
| AC-4: BA/Data Agent approves classification | PASS | Boss approval, in-session 2026-07-28 |
| AC-5: SA Agent approves design | PASS | Boss approval covers the shared validator extension |

## Verdict

PASS on all 10 ACs across both issues. No blocking findings.

`npm test`: 271/271. `validate:contracts`, `adr-audit`: pass.
