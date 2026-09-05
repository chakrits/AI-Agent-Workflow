# Code Review Findings

Scope: adds `scripts/repin-source-matrix.mjs` (a mutator script that recomputes and rewrites stale sha256 entries in `test/fixtures/context-pack-v1/required-source-matrix.json`), exports the existing `sha256(bytes)` helper from `scripts/lib/context-compatibility-v1.mjs` for reuse, wires `npm run repin:source-matrix`, adds a discoverable documentation pointer, and adds tests for the new script. Work item: [Issue #215](https://github.com/chakrits/AI-Agent-Workflow/issues/215). Design authority: [SA Agent's mechanism spec](https://github.com/chakrits/AI-Agent-Workflow/issues/215#issuecomment-5551976451), approved by [Human Maintainer](https://github.com/chakrits/AI-Agent-Workflow/issues/215#issuecomment-5551995470).

## Self-review findings

| Finding ID | Severity | File / Area | Finding | Recommendation | Blocks Progress? | Evidence |
|---|---|---|---|---|---|---|
| CR-1201 | Question | AC-04 doc target | The Issue's suggested doc target (`docs/workflow/platform-readiness.md`) is itself one of the 25 sha256-pinned paths, and the Developer packet's Scope explicitly forbids editing the real fixture outside a test's own temp copy. Editing a pinned doc to document the tool would require re-pinning the fixture as a side effect of an otherwise-unrelated documentation change | Used `docs/operating-model/CONTEXT_BUDGET.md` instead — verified NOT one of the 25 pinned paths (`node` check against `matrix.rows[].requiredSources[].path`), already the canonical place agents are told to "check this budget first" before editing a canonical file, so it satisfies AC-04's "discoverable to an agent editing a canonical/skill file" bar without touching the fixture | No — resolved within scope | `docs/operating-model/CONTEXT_BUDGET.md` new section "After Editing a Canonical or Skill File"; fixture untouched by this PR (verified below) |
| CR-1202 | Minor | `scripts/repin-source-matrix.mjs` | Output/exit contract is not specified anywhere except SA's comment (plain-text list to stdout, exit 0 even when changes were written, non-zero only on the fail-closed guard, round-trip guard, or missing-source-path errors) | Implemented per SA's spec exactly; not a validator, so a successful re-pin (with or without changes) exits 0 | No | `scripts/repin-source-matrix.mjs` `main()` |

No Major or Critical findings in this self-review; the mechanism was implementation-ready from SA's comment and did not require any deviation.

## Acceptance Criteria verification

| AC | Requirement | Status | Evidence |
|---|---|---|---|
| AC-01 | A script recomputes sha256 for every path in the matrix and rewrites only entries whose hash actually changed | PASS | `scripts/repin-source-matrix.mjs`; test "updates the sha256 for a path whose content changed" |
| AC-02 | Idempotent — a run against unchanged content makes no change at all (byte-identical, mtime unchanged) | PASS | Test "a run against unchanged content performs no filesystem write at all (AC-02)" asserts both `Buffer.equals` and identical `mtimeMs`; real-repository manual run below shows the same |
| AC-03 (corrected) | Editing a pinned file, then running the script, touches only that path's `sha256` field(s) — every occurrence when redundantly pinned — and previously-failing tests pass afterward | PASS | Synthetic test "updates every occurrence of a redundantly-pinned path, not just the first match" (5 rows, all 5 updated); real-repository manual run against `AGENTS.md` (pinned 22×) below, all 22 occurrences updated, confirmed via `git diff` line count |
| AC-04 | Wired to an `npm run` command and documented where an agent editing a canonical/skill file would find it | PASS | `package.json` `repin:source-matrix`; `docs/operating-model/CONTEXT_BUDGET.md` new section (see CR-1201 for why this target and not `platform-readiness.md`) |
| AC-05 | `npm test` and the full validator suite pass | PASS | See Verification section |

## Fail-closed guard verification (BA/SA-mandated, not itself a numbered AC)

- Non-uniform pinned hashes for the same path: script throws, names the offending path, writes nothing (bytes and mtime unchanged). Test: "fails closed and writes nothing when a path is pinned with non-uniform hashes across rows".
- Round-trip formatting invariant (`JSON.stringify(JSON.parse(raw), null, 2) + '\n' === raw`) is asserted at runtime before any mutation, as SA required defensively rather than assumed. Test: "fails closed when the fixture does not round-trip byte-identically...".
- Missing/unreadable pinned source path: script throws naming the path, writes nothing. Test: "fails closed with a clear message when a pinned source path is missing from disk".
- Confirmed the real fixture currently satisfies the round-trip invariant (the script ran against it without tripping the guard, in both the synthetic and real-repository verification below).

## TDD and mutation verification

- TDD: `test/repin-source-matrix.test.mjs` was written before `scripts/repin-source-matrix.mjs` existed. First run failed with `ERR_MODULE_NOT_FOUND` (no implementation) — recorded here as a structural RED, not claimed as a behavioural one. All 9 tests pass against the finished implementation.
- Mutation 1 (every-occurrence claim): changed the "update every occurrence" loop to `occurrences[0].sha256 = freshHash` (first-match only). Result: 2 of 9 tests went red (`updates every occurrence...` and the dedicated mutation-documentation test), 7 stayed green. Confirms the claim is load-bearing, not incidentally satisfied.
- Mutation 2 (fail-closed guard): deleted the non-uniform-hash guard block entirely. Result: 1 of 9 tests went red (`fails closed and writes nothing when a path is pinned with non-uniform hashes across rows`), 8 stayed green. Confirms the guard is exercised, not dead code.
- Mutation 3 (round-trip invariant guard): deleted the round-trip check block. Result: 1 of 9 tests went red (`fails closed when the fixture does not round-trip byte-identically...`), 8 stayed green. Confirms SA's defensive assertion is real, not decorative.
- All three mutations were reverted (verified via `diff` against the pre-mutation backup) before the final suite run.

## Real documented failure scenario (not just synthetic fixtures)

Reproduced the Issue's own evidence, in the actual worktree, against the real fixture and a real pinned file:

1. Appended a blank line to `docs/workflow/platform-readiness.md`. `npm test` failed with exactly the Issue's named tests: `not ok 60, 62, 63, 64, 65, 66` and one context-pack row test (`263` here vs. the Issue's `254`, because this branch's suite has 9 more tests ahead of it — same test by name: "context-pack/v1 accepts exact boot and cumulative on-demand rows"). `# fail 7`, matching the Issue exactly.
2. `npm run repin:source-matrix` → `Updated sha256 for 1 path(s): docs/workflow/platform-readiness.md`.
3. `npm test` → `541/541` pass, all 7 previously-failing tests green.
4. `git diff -- test/fixtures/context-pack-v1/required-source-matrix.json` showed exactly one changed line (platform-readiness.md is pinned once, in the Release Agent row only — not a redundantly-pinned path).
5. `git checkout -- docs/workflow/platform-readiness.md test/fixtures/context-pack-v1/required-source-matrix.json` to fully revert the experiment. `git status --short` confirmed no residue from steps 1–4; only this PR's real changes remained.

Repeated the same sequence against `AGENTS.md` (pinned 22× across the real fixture, per the Issue's own count) to verify the every-occurrence claim against real data, not only the synthetic 5-row test fixture: appended a blank line, ran the script (`Updated sha256 for 1 path(s): AGENTS.md`), confirmed via `git diff | grep -c` that exactly 22 `sha256` lines changed (matching the 22 occurrences), then reverted both files and confirmed `git status --short` showed no residue.

## Verification

- `npm test`: 541/541 (532 baseline on `main` before this change; +9 new tests for `repin-source-matrix.mjs`).
- `npm run validate:contracts` — PASS
- `npm run validate:project-state` — PASS
- `npm run validate:skill-parity` — PASS (38 skills in sync)
- `npm run validate:risk-register` — PASS
- `npm run adr:audit` — PASS (ratio 3.00:1, within 10:1 threshold)
- `npm run validate:skill-usage` — PASS
- `npm run validate:metrics` — PASS
- `npm run validate:context-budget` — PASS (29,985/30,000; unaffected — `CONTEXT_BUDGET.md` is not one of the 8 canonical files this gate measures)
- `npm run validate:review-gate` — PASS
- `npm run validate:ci-parity` — PASS
- `npm run validate:clearable-refs` — PASS
- `npm run validate:workflow-evidence` — PASS
- `npm run validate:dispatch-receipts` — PASS
- `npm run validate:context-compatibility` — PASS (`"valid": true` for both corpus and matrix)
- `git diff --check` — clean (no trailing whitespace conflicts)

## Deviations from SA's spec

None. Path discovery walks `matrix.rows[].requiredSources[]` directly (no `CANONICAL_SOURCE_PATHS` reuse); the fail-closed guard, every-occurrence update, byte-identical idempotency, and parse/mutate/stringify write strategy with a runtime round-trip assertion are all implemented exactly as specified. The one open design question BA/SA left unresolved for Developer's judgment — where to put the AC-04 documentation pointer, since the Issue's suggested target is itself a pinned path — is resolved and recorded as CR-1201 above rather than silently decided.

## Review Decision

Self-review: approved for QA handoff. No Major/Critical findings; CR-1201 (doc-target substitution) is the one implementation-time judgment call, recorded with rationale for QA/Human Maintainer visibility rather than left implicit.
