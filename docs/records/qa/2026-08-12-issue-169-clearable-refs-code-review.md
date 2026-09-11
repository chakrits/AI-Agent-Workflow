# Code Review: Issue #169 clearable-refs validator + durable-vs-clearable boundary

- Date: 2026-08-12
- Reviewer: Developer Agent (self-review), pending independent QA
- Branch: `docs/issue-169-clearable-ref-boundary`
- Commit: `4029dec` (implementation) / `add6eb7` (spec refinement)
- Issue: https://github.com/chakrits/AI-Agent-Workflow/issues/169

## Scope of review

- `scripts/validate-clearable-refs.mjs` (new) — diff-scoped, meaning-aware validator.
- `test/validate-clearable-refs.test.mjs` (new) — 7 regression tests.
- `docs/workflow/dispatch-packet-contract.md` — 3 references made self-contained.
- `docs/contracts/schemas/dispatch-receipt.schema.json` — `$comment` rationale inlined.
- `package.json`, `.github/workflows/validate-contracts.yml` — CI wiring.
- `DECISIONS.md` — durable-vs-clearable decision note.

## Review questions

- CR-901: Is the validator truly diff-scoped so pre-existing historical refs cannot fail it?
  **Yes** — `resolveDiffRange` mirrors `validate-review-gate.mjs` and scans only changed files.
- CR-902: Does the meaning-aware rule distinguish a cleared-document dependency from an
  instruction/location mention? **Yes** — `MEANING_PREFIXES` (authoritative/design/see) plus a
  conservative "the rationale is in" probe; instruction context (`create|at|record|template`)
  is excluded. Verified against README.md:188 and SKILL.md:46 (must not flag).
- CR-903: Are code/mechanism files excluded? **Yes** — `isCodeFile` covers `.js/.mjs/.yml/.yaml`.
- CR-904: Are historical records excluded by rationale, not directory-exemption? **Yes** —
  `isHistoricalRecord` prefixes `docs/records/`, with the rationale in `${spec}`.
- CR-905: Is `CLEARED_DIRECTORIES` imported so the two cannot drift? **Yes** — imported from
  `reset-to-template.mjs`.
- CR-906: Does the suite pass? **Yes** — `npm test` 414/414 (7 new).
- CR-907: Context budget unchanged? **Yes** — PASS, TARGET 30000.
- CR-908: ADR audit passes with the new decision note? **Yes** — 6.00:1 ≤ 10:1.

## Findings

No Critical or Major finding. One Minor (informational): the validator's meaning-aware rule is
heuristic (prefix + probe matching) rather than a full parser; a future reference phrased
unusually might slip either way. This is acceptable for a forward guard and is covered by the
conservative "the rationale is in" probe.

## Verification evidence

- `npm test` → 414 pass / 0 fail
- `node scripts/validate-clearable-refs.mjs` → PASS (scanned 2 content files)
- `npm run validate:context-budget` → PASS (within 30000)
- `npm run validate:contracts` → PASS
- `npm run adr:audit` → PASS (6.00:1)
- `git diff HEAD~1 --check` → clean