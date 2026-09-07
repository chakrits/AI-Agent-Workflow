# Code Review Findings

Scope: adds `scripts/validate-adapter-parity.mjs` (a role-adapter parity checker comparing
`.claude/agents/*.md`, `.agents/agents/*.md`, and `.agent/agents/*.md`: body-below-frontmatter
hash equality, `name:` frontmatter equality, fail-closed missing-file detection), seeds
`.agents/agents/` and `.agent/agents/` (previously non-existent) from `.claude/agents/`'s 11
adapters with host-neutral frontmatter (`name`/`description` only, `tools:` dropped for
non-Claude hosts), wires `npm run validate:adapter-parity` into `package.json`,
`.github/workflows/validate-contracts.yml`, and `.gitlab-ci.yml`, wires 5 previously-unwired
`.claude/agents/*.md` adapters (`ba-agent`, `config-agent`, `documentation-agent`,
`orchestrator-agent`, `pm-agent`) to their named skills, relocates
`docs/workflow/role-definitions.md`'s "Terminal Dispatch and Boss Visibility" section into
`docs/workflow/task-execution-mode.md` behind a short pointer, and updates 2 pre-existing
`test/validate-contracts.test.mjs` assertions that read the relocated content directly from
`role-definitions.md` alone. Work item: [Issue #212](https://github.com/chakrits/AI-Agent-Workflow/issues/212)
(IMP-006). Design authority: `DECISIONS.md` ADR-0021 (AC-01 Option B, AC-05 relocation target and
estimate), approved by Human Maintainer 2026-09-07.

## Self-review findings

| Finding ID | Severity | File / Area | Finding | Recommendation | Blocks Progress? | Evidence |
|---|---|---|---|---|---|---|
| CR-1301 | Question | AC-02/AC-03 enumeration | A canonical-only directory listing (mirroring `validate-skill-parity.mjs`'s `listCanonicalSkills`, which enumerates only `.agents/skills/`) would never see an adapter that exists in `.claude/agents/` or `.agent/agents/` but is absent from `.agents/agents/` — that adapter is simply never iterated, so "missing from the canonical tree" becomes undetectable, which is exactly the fail-open hole AC-03 exists to close | `listAllAdapters` enumerates the union of `.md` basenames across all three trees, not just `.agents/agents/`. A dedicated test (`checkAdapterParity fails closed (MISSING) when an adapter exists in .claude/ and .agent/ but is absent from the canonical .agents/ tree`) exercises exactly this case | No — resolved within scope | `scripts/validate-adapter-parity.mjs` `listAllAdapters`; `test/validate-adapter-parity.test.mjs` |
| CR-1302 | Question | AC-01/name-drift independence | If a `name:` mismatch were folded into the same branch as the body-hash `DRIFT` check, a reviewer could not tell whether the `name:` pin (ADR-0021's explicit requirement) is actually enforced independently of body content, or just coincidentally covered whenever a body also differs | Gave `name:` mismatch its own `NAME_DRIFT` status, checked before the body-hash comparison. A dedicated test (`checkAdapterParity reports NAME_DRIFT when name: differs across platforms even though bodies are identical`) uses identical bodies with only `name:` differing, and asserts all three body hashes are still equal — proving the check fires independently of the hash comparison | No | `scripts/validate-adapter-parity.mjs` `checkAdapterParity` status branch order; `test/validate-adapter-parity.test.mjs` |
| CR-1303 | Question | AC-02 non-Claude frontmatter convention | The Issue and dispatch packet flagged this as a possible BLOCKED item: no adapter existed yet under `.agents/agents/` or `.agent/agents/`, so no frontmatter precedent existed for that specific directory | Checked the existing skill-file convention instead (`.agents/skills/*/SKILL.md`, `.agent/skills/*/SKILL.md`): every skill file carries `name:`/`description:` only, byte-identical across all three trees, with no `tools:` field at all. Applied the same convention to the seeded adapters — `name:`/`description:` copied from `.claude/agents/*.md`, `tools:` dropped entirely for `.agents/agents/` and `.agent/agents/`. Not escalated as BLOCKED; resolved by direct precedent in the same repository | No | `.agents/skills/coding-standards/SKILL.md` (representative); `.agents/agents/*.md`, `.agent/agents/*.md` (all 11 seeded files) |
| CR-1304 | Minor | `test/validate-contracts.test.mjs` | Two pre-existing tests (`terminal handoffs require a receipt...` and `in-turn dispatch completion requires parent ownership...`) asserted the full Terminal Dispatch content directly against `role-definitions.md`. After the AC-05 relocation, `role-definitions.md` contains only a pointer sentence, so both tests broke (2 of 551 baseline tests went red) | Not a design flaw in the tests — they predate the relocation this Issue authorizes. Updated both tests to concatenate `role-definitions.md`'s content with `task-execution-mode.md`'s content before asserting content-presence, since the normative text now lives at the new location by design. No assertion was weakened or removed — the same phrases must still exist, just findable across the pointer + target rather than in one file | No — resolved within scope; documented so QA can verify the change is a location update, not a coverage reduction | `test/validate-contracts.test.mjs` diff; both tests pass after the update (`npm test` 565/565) |

No Major or Critical findings. All four items above are implementation-time judgment calls
recorded per the Developer Agent's Scope Discipline rule, not defects.

## Acceptance Criteria verification (AC-02 through AC-06 only — AC-01, AC-07, AC-08 are explicitly out of this dispatch's scope)

| AC | Requirement | Status | Evidence |
|---|---|---|---|
| AC-02 | A parity check fails when a role adapter drifts between trees, proven by a regression test that fails before the fix | PASS | `test/validate-adapter-parity.test.mjs` ("checkAdapterParity reports DRIFT...", "CLI exits 1 when an adapter drifts across platforms"); TDD/mutation section below; real induced-drift experiment below |
| AC-03 | The check fails closed when an adapter is missing from a tree, rather than skipping it | PASS | `test/validate-adapter-parity.test.mjs` ("checkAdapterParity reports MISSING...", and the union-enumeration test described in CR-1301) |
| AC-04 | The check runs on both GitHub and GitLab CI, and `validate:ci-parity` confirms it | PASS | `.github/workflows/validate-contracts.yml` (`npm run validate:adapter-parity` added to the `validate` job), `.gitlab-ci.yml` (`validate_adapter_parity` job added, mirroring `validate_skill_parity`'s shape); `npm run validate:ci-parity` PASSED (14 GitHub commands / 15 GitLab commands, 0 host-only exemptions) |
| AC-05 | Measured context-budget headroom after the `role-definitions.md` audit is recorded, and `TARGET` is unchanged | PASS | Before: `29985/30000` (615 headroom). After: `29384/30000` (616 headroom) — matches ADR-0021's estimate (≈29,385/≈615) within 1 token. `TARGET` (30000) unchanged in `scripts/validate-context-budget.mjs` — confirmed by inspection, not edited by this change |
| AC-06 | Every role adapter routes to at least one skill, or records why it does not | PASS | `.claude/agents/ba-agent.md` → `ba-requirement-analysis`, `.claude/agents/config-agent.md` → `data-config-change`, `.claude/agents/documentation-agent.md` → `documentation-closeout`, `.claude/agents/orchestrator-agent.md` → `dynamic-workflow`, `.claude/agents/pm-agent.md` → `management-status-update`, each with a new `## Skill Routing` section, mirrored into `.agents/agents/` and `.agent/agents/` via the seeding pass. Precedent for adapter-only routing (no `role-definitions.md` "Skill Routing" subsection needed) is Data Agent's existing adapter, confirmed unchanged in this diff |

## TDD and mutation verification

- TDD: `test/validate-adapter-parity.test.mjs` was written against `scripts/validate-adapter-parity.mjs` in the same change; both landed together. All 14 tests pass against the finished implementation (`node --test test/validate-adapter-parity.test.mjs`).
- Mutation (core comparison logic): replaced the entire `MISSING`/`NAME_DRIFT`/`DRIFT`/`OK` status-determination branch in `checkAdapterParity` with a hardcoded `status = 'OK'`. Result: 6 of 14 tests went red (all the MISSING/NAME_DRIFT/DRIFT-asserting tests, including both CLI exit-code tests for those cases), 8 stayed green (the `stripFrontmatter`/`extractName` unit tests and the all-OK cases, which are unaffected by this branch). Confirms the comparison logic is load-bearing, not incidentally satisfied. Restored via the pre-mutation backup; confirmed 14/14 pass again afterward.
- Real induced-drift experiment (not just synthetic fixtures): appended a line to `.agent/agents/developer-agent.md` in the actual worktree. `npm run validate:adapter-parity` reported `developer-agent.md` as `DRIFT`, `10 adapter(s) in sync, 1 adapter(s) drifted...`, and exited non-zero. Restored the file from a pre-experiment backup; re-ran the check — `11 adapter(s) in sync, 0 adapter(s) drifted...`, PASS. `git status --short` confirmed no residue from either experiment before the final suite run.

## Verification

- `npm test`: 565/565 (551 baseline before this change; +14 new tests for `validate-adapter-parity.mjs`; 2 pre-existing tests updated per CR-1304, no test count change from that update).
- `npm run validate:contracts` — PASS
- `npm run validate:adapter-parity` — PASS (11 adapters in sync across `.agents/agents/`, `.claude/agents/`, `.agent/agents/`)
- `npm run validate:skill-parity` — PASS (38 skills in sync; confirms the skill trees are untouched by this change)
- `npm run validate:ci-parity` — PASS (GitHub validate job: 14 commands; GitLab: 15 commands; 0 host-only exemptions)
- `npm run validate:context-budget` — PASS. Before: 29985/30000 (615 headroom). After: 29384/30000 (616 headroom).
- `npm run validate:context-compatibility` — PASS (`"valid": true` for both corpus and matrix)
- `npm run validate:risk-register` — PASS (0 open risk entries)
- `npm run validate:metrics` — PASS (exit 0; dashboard printed, no threshold breach)
- `npm run validate:skill-usage` — PASS (23/23 TASK_LOG entries on/after cutover carry skill notation)
- `npm run validate:workflow-evidence` — PASS
- `npm run validate:dispatch-receipts` — PASS
- `npm run validate:clearable-refs` — PASS (2 changed content files scanned, no cleared-document dependency)
- `npm run adr:audit` — PASS (ratio 3.00:1, within 10:1 threshold; unaffected by this change, no ADR added by Developer Agent)
- `npm run repin:source-matrix` — ran once, updated `sha256` for exactly the 2 edited pinned paths: `docs/workflow/role-definitions.md` and `docs/workflow/task-execution-mode.md`. A second run makes no further change (idempotent, per Issue #215's script).
- `git diff --check` — clean (no trailing whitespace conflicts)

## Deviations from the dispatch packet

None load-bearing. CR-1301 through CR-1304 above are the implementation-time judgment calls the
packet's Return contract asked to be recorded rather than left implicit; none required deviating
from the packet's Scope or Verify sections.

## Explicitly out of scope for this record (by dispatch-packet design, not oversight)

- **AC-01**: already decided and recorded in ADR-0021 before this dispatch; not re-verified here beyond confirming the implementation matches it (body-below-frontmatter comparison, `name:` pinned).
- **AC-07** (Release Agent skill or an ADR explaining why not): not attempted. Requires a further Human Maintainer decision the dispatch packet explicitly withheld from this scope. `release-agent.md` itself *was* seeded into `.agents/agents/` and `.agent/agents/` as part of AC-02/AC-03 (the adapter file, not a new skill) — its parity is covered, but it still routes to no skill.
- **AC-08** (full validator suite + independent QA + no human gate weakened): this record documents Developer-side self-review and verification evidence only. It is not a QA sign-off and does not certify AC-08; that remains QA Agent's and the Human Maintainer's gate.

## Review Decision

Self-review: approved for QA handoff. No Major/Critical findings; CR-1301 through CR-1304 are
implementation-time judgment calls recorded with rationale and evidence for QA/Human Maintainer
visibility rather than left implicit.

