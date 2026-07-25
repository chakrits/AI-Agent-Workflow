# Improvement Plan: Workflow Playbooks Quality Upgrade

**Date:** 2026-07-25
**Author:** Orchestrator Agent (Valentine); revised after BA Agent requirement analysis
**Status:** Draft — awaiting Boss review
**Scope:** Documentation-only improvement to 12 playbook files in `docs/workflows/` — add canonical contract references, outbound wiki links, and expand 5 thin playbooks without duplicating canonical policy.

**Revision note (2026-07-25):** BA Agent analysis (`docs/records/work-items/2026-07-25-issue-95-ba-requirement-analysis.md`) closed two review-flagged requirement gaps and found one correctness bug in this spec's own example:

1. **Relative-path depth bug fixed** — the original Fix A example used `../../contracts/...`, which is one level too deep from `docs/workflows/` and would 404 every contract wiki link. Corrected to `../contracts/...` throughout this spec (see Fix A).
2. **Explicit per-playbook wiki-link mapping added** — all 12 files now have a verified target table (Fix A), replacing the earlier generic pattern-only description.
3. **Test-file placement decided** — new regression coverage goes into a new `test/validate-workflow-playbooks.test.mjs`, not `test/validate-contracts.test.mjs` (see Fix B/A/C regression sections and rationale below).
4. **Implementation order changed from B → A → C to B → C → A** — `config-change.md`, `data-change.md`, `code-review-gate.md`, and `ci-failure-debug.md` have no natural Fix A link target until Fix C's Gate/Handoff content exists; authoring links after that content avoids a double edit.

## Change Classification

- Change type: Documentation-only
- Risk level: Low–Medium — documentation and additive regression tests; no runtime behavior change
- Required route: Documentation Agent → Reviewer → Human Review/Merge
- SDD: Not required; this approved lightweight plan is sufficient

## Problem Statement

12 playbook files in `docs/workflows/` have 3 gaps verified against real code:

1. **0 wiki links** — `grep -F -l '[[' docs/workflows/*.md` returns empty. The vault index links TO playbooks, but playbooks don't link OUT to their related contracts, skills, templates, or canonical docs. Obsidian graph therefore lacks those playbook-to-source edges.
2. **`new-feature.md` missing contract reference** — `docs/contracts/new-feature-workflow.yaml` exists (PR #61) but `docs/workflows/new-feature.md` never mentions it. `bug-fix.md` references its contract; `new-feature.md` does not.
3. **5 playbooks too thin** — `config-change.md` (8 lines), `data-change.md` (13 lines), `new-feature.md` (15 lines), `code-review-gate.md` (25 lines), `tdd-implementation-flow.md` (28 lines) lack Use-When, Gate, and Handoff sections. Detailed playbooks like `bug-debug-fix.md` (75 lines) and `ci-failure-debug.md` (49 lines) have all sections.

## Consumers (who reads these playbooks)

Checked against real code — 6 files reference `docs/workflows/`:

| Consumer | References | What it does with them |
|----------|-----------|----------------------|
| `PROJECT_INDEX.md` | 12 links | Linked map — every playbook listed |
| `README.md` | 4 links | Routing table — new-feature, bug-fix, ci-failure-debug, config/data-change |
| `docs/vault/00-Index.md` | 12 links | Obsidian vault index — every playbook listed (added PR #94) |
| `AGENTS.md` | 1 directory reference | Tells agents to read "Relevant workflow/playbook under `docs/workflows/`" |
| `docs/workflow/role-definitions.md` | 1 directory reference | Mentions `docs/workflows/` for diagram convention |
| `test/validate-contracts.test.mjs` | 1 test | Reads `bug-fix.md`, asserts it contains `docs/contracts/bug-fix-workflow.yaml` |

---

## Fix B: Add contract reference to `new-feature.md`

### What
Add 3 lines to `docs/workflows/new-feature.md` referencing `docs/contracts/new-feature-workflow.yaml`, matching the pattern already in `bug-fix.md`.

### Why
`new-feature-workflow.yaml` was created in PR #61 but the playbook never mentions it. An agent reading `new-feature.md` won't know a contract exists to validate against.

### Target file
`docs/workflows/new-feature.md` (currently 15 lines)

### Change
After the flow diagram, add:

```markdown
## Canonical Contract

Use `docs/contracts/new-feature-workflow.yaml` as the canonical New Feature policy.
Before each handoff, validate the work item's `task-state`; the contract defines
the allowed states, transitions, evidence requirements, and rework budget (1 rework).

## Backward Routing

Use `docs/contracts/new-feature-workflow.yaml` as the source of truth for the
complete transition/evidence matrix. The playbook should summarize only these
common routes:

- Requirement gap → BA / discovery
- Architecture or API contract gap → SA / designing
- Plan gap → planning
- Verification failure → rework, with the contract's one-rework limit before blocked
```

### Regression test
Add to new file `test/validate-workflow-playbooks.test.mjs` (see rationale in "Test-File Placement" below Fix C):

```javascript
test('new-feature playbook references its contract', async () => {
  const newFeature = await readFile('docs/workflows/new-feature.md', 'utf8');
  assert.match(newFeature, /docs\/contracts\/new-feature-workflow\.yaml/);
});
```

### Test plan
| Step | Before fix | After fix |
|------|-----------|-----------|
| `grep "new-feature-workflow.yaml" docs/workflows/new-feature.md` | empty | 1 match |
| `npm test` | 201 pass | 202 pass (new test) |
| `npm run validate:contracts` | pass | pass |

### Risk: Low
- Adds content only — no existing file modified
- New test is additive — doesn't change existing assertions
- `bug-fix.md` already has the same pattern — no new convention

### Effort: 1 commit

---

## Fix A: Add outbound canonical wiki links to all 12 playbooks

### What
Add outbound Obsidian wiki links `[[...|...]]` from all 12 playbooks to their
related canonical contracts, skills, templates, and workflow documents. Keep
plain-text canonical paths where existing tests or external readers depend on
them.

### Why
Vault index (`docs/vault/00-Index.md`) links TO playbooks, but playbooks don't
link OUT to their source documents. Playbooks should link to:
- Contracts (`docs/contracts/*.yaml`)
- Skills (`.agents/skills/*/SKILL.md`)
- Templates (`docs/templates/*.md`)
- Canonical docs (`docs/workflow/*.md`)
- Root docs (`AGENTS.md`, `DECISIONS.md`, etc.)

### Target files (all 12)
```
docs/workflows/bug-debug-fix.md
docs/workflows/bug-fix.md
docs/workflows/ci-failure-debug.md
docs/workflows/code-review-gate.md
docs/workflows/config-change.md
docs/workflows/data-change.md
docs/workflows/feature-discovery-to-plan.md
docs/workflows/functional-test-design.md
docs/workflows/new-feature.md
docs/workflows/stabilize-core.md
docs/workflows/tdd-implementation-flow.md
docs/workflows/validated-bug-postmortem.md
```

### Relative-path prefix table (from any file in `docs/workflows/*.md`)

`docs/workflows/` and `docs/contracts/` are siblings under `docs/` — the correct prefix to a contract is `../contracts/`, **not** `../../contracts/` (an earlier draft of this spec had this wrong; corrected here after BA Agent verification against `docs/vault/00-Index.md`'s own depth convention and direct path normalization).

| Target category | Correct prefix | Example |
|---|---|---|
| Contract (`docs/contracts/*.yaml`) | `../contracts/` | `[[../contracts/bug-fix-workflow.yaml\|bug-fix-workflow.yaml]]` |
| Template (`docs/templates/*.md`) | `../templates/` | `[[../templates/SDD.md\|SDD.md]]` |
| Canonical workflow doc (`docs/workflow/*.md`) | `../workflow/` | `[[../workflow/quality-gates.md\|quality-gates.md]]` |
| Operating-model doc (`docs/operating-model/*.md`) | `../operating-model/` | `[[../operating-model/SKILL_CATALOG.md\|SKILL_CATALOG.md]]` |
| Skill (`.agents/skills/*/SKILL.md`) | `../../.agents/skills/` | `[[../../.agents/skills/debugging-discipline/SKILL.md\|debugging-discipline]]` |
| Root doc (`AGENTS.md`, `TASK_LOG.md`, etc.) | `../../` | `[[../../AGENTS.md\|AGENTS.md]]` |

### Change pattern
```diff
- Use `docs/contracts/bug-fix-workflow.yaml` as the canonical Bug Fix policy.
+ Use [[../contracts/bug-fix-workflow.yaml|bug-fix-workflow.yaml]] (`docs/contracts/bug-fix-workflow.yaml`) as the canonical Bug Fix policy.

- `debugging-discipline` skill
+ [[../../.agents/skills/debugging-discipline/SKILL.md|debugging-discipline]] skill

- `REQUIREMENT_DISCOVERY.md`
+ [[../templates/REQUIREMENT_DISCOVERY.md|REQUIREMENT_DISCOVERY.md]]
```

### Explicit per-playbook mapping (all 12 files, BA-verified)

Every target below was confirmed to exist on disk (`test -f`) during BA analysis. Full detail, including which targets are already named in current prose (mechanical find-replace) vs. require new/reworded prose, is in `docs/records/work-items/2026-07-25-issue-95-ba-requirement-analysis.md` (Part A.1). Summary:

| Playbook | Targets (corrected relative path) |
|---|---|
| `bug-debug-fix.md` | `../contracts/bug-fix-workflow.yaml`; `../../.agents/skills/debugging-discipline/SKILL.md`; `../../.agents/skills/engineering-postmortem/SKILL.md` |
| `bug-fix.md` | `../contracts/bug-fix-workflow.yaml` |
| `ci-failure-debug.md` | `../../.agents/skills/debugging-discipline/SKILL.md` (needs minor prose rewording — currently named as prose, not backticked) |
| `code-review-gate.md` | `../../.agents/skills/verification-before-completion/SKILL.md`; `../../.agents/skills/code-review-gate/SKILL.md`; `../templates/CODE_REVIEW_REQUEST.md`, `../templates/CODE_REVIEW_FINDINGS.md` (the templates are natural only once Fix C's Handoff section exists — this is why Fix C now runs before Fix A) |
| `config-change.md` | `../../.agents/skills/data-config-change/SKILL.md`; `../templates/CONFIG_CHANGE_PLAN.md` (both inferred — this 8-line file names neither today; natural only once Fix C adds Required Outputs/Handoff) |
| `data-change.md` | `../templates/DATA_CHANGE_PLAN.md`; `../templates/TEST_REPORT.md`; `../templates/RELEASE_PLAN.md`; `../../.agents/skills/data-config-change/SKILL.md` (skill link inferred, needs new prose) |
| `feature-discovery-to-plan.md` | `../../.agents/skills/requirement-brainstorming/SKILL.md`; `../../.agents/skills/implementation-planning/SKILL.md`; `../templates/REQUIREMENT_DISCOVERY.md`; `../templates/SDD.md`; `../templates/TECHNICAL_DESIGN.md`; `../templates/IMPLEMENTATION_PLAN.md` |
| `functional-test-design.md` | `../../.agents/skills/functional-test-design/SKILL.md`; `../templates/FUNCTION_TEST_REPORT.md`; `../templates/FOCUSED_FUNCTIONAL_TEST_PACK.md` (last two need minor rewording — named descriptively, not by filename) |
| `new-feature.md` | `../contracts/new-feature-workflow.yaml` (added by Fix B); `../templates/PROJECT_BRIEF.md`; `../templates/REQUIREMENT_DISCOVERY.md`; `../templates/SDD.md`; `../templates/TECHNICAL_DESIGN.md`; `../templates/TEST_PLAN.md`; `../templates/TEST_REPORT.md`; `../templates/RELEASE_PLAN.md` |
| `stabilize-core.md` | `../operating-model/AGENT_OPERATING_MODEL.md`; `../operating-model/SKILL_CATALOG.md`; `../operating-model/AGENT_EVALUATION_CHECKLIST.md`; `../../AGENTS.md`; `../../TASK_LOG.md`; `../templates/COMPLETION_CHECK.md` |
| `tdd-implementation-flow.md` | `../../.agents/skills/tdd-implementation/SKILL.md`; `../../.agents/skills/verification-before-completion/SKILL.md`; `../../.agents/skills/code-review-gate/SKILL.md` |
| `validated-bug-postmortem.md` | `../../.agents/skills/engineering-postmortem/SKILL.md` (needs minor rewording); `../../TASK_LOG.md`; `../templates/BUG_POSTMORTEM.md` (inferred — confirm with Documentation Agent at implementation time; low materiality if dropped) |

### Critical constraint
**Do NOT remove the plain-text path** — `test/validate-contracts.test.mjs` line 107 asserts:
```javascript
assert.match(bugFix, /docs\/contracts\/bug-fix-workflow\.yaml/);
```
A wiki link like `[[../contracts/bug-fix-workflow.yaml|bug-fix-workflow.yaml]]` does **not** contain the string `docs/contracts/bug-fix-workflow.yaml` (wiki links use relative paths from the file, not the `docs/`-prefixed repo-root path the test asserts).

**This is a mandatory constraint on the implementation, not an optional mitigation:** every playbook must keep the plain-text canonical path (in backticks) directly alongside its wiki link. Updating the test regex to match the wiki-link path instead is explicitly rejected — it would silently weaken the existing contract-path verification that other tooling (and future readers) rely on.

Required pattern for every wiki link added in Fix A:
```markdown
Use [[../contracts/bug-fix-workflow.yaml|bug-fix-workflow.yaml]] (`docs/contracts/bug-fix-workflow.yaml`) as the canonical Bug Fix policy.
```

### Test plan
| Step | Before fix | After fix |
|------|-----------|-----------|
| `grep -F -c '[[' docs/workflows/*.md` | 0 per file | ≥1 per file |
| Wiki-link target resolution | not checked | every added target exists |
| `npm test` | 202 pass (after Fix B) | 203 pass (wiki-link target regression added — see revised order: Fix C runs before Fix A) |
| `npm run validate:contracts` | pass | pass |
| Obsidian graph view | missing playbook-to-source edges | outbound playbook-to-source edges |
| `grep "docs/contracts/bug-fix-workflow.yaml" docs/workflows/bug-fix.md` | 1 match | 1 match (plain-text path preserved) |

### Risk: Low–Medium
- **Low:** Adding wiki links doesn't break parsers or tests
- **Medium:** If plain-text path is accidentally removed, test breaks — mitigation: keep plain-text path alongside wiki link
- 12 files touched but changes are mechanical (find-replace pattern)

### Effort: 1 commit (all 12 files in one commit — mechanical change)

---

## Fix C: Expand 5 thin playbooks

**Note: Fix C now runs before Fix A** (revised order — see Revision note at top). `code-review-gate.md` and `config-change.md`'s most natural Fix A link targets (Handoff-section templates) don't exist until this fix adds them; running Fix C first avoids editing those 2 files twice.

### What
Add Use-When, Gate, and Handoff sections to 5 playbooks that lack them, using `bug-debug-fix.md` as the structural template.

### Why
Agents reading `config-change.md` (8 lines) don't know:
- When to use this workflow vs another
- What gate to check before marking complete
- What handoff format to use when routing to QA

### Target files + current state

| File | Lines | Has Use-When? | Has Gate? | Has Handoff? | Has Contract? |
|------|-------|--------------|----------|-------------|--------------|
| `config-change.md` | 8 | ❌ | ❌ | ❌ | ❌ |
| `data-change.md` | 13 | ❌ | ❌ | ❌ | ❌ |
| `new-feature.md` | 15 | ❌ | ❌ | ❌ | ❌ (fixed in Fix B) |
| `code-review-gate.md` | 25 | ✅ | ❌ | ❌ | ❌ |
| `tdd-implementation-flow.md` | 28 | ✅ | ❌ | ❌ | ❌ |

### Structural template (from `bug-debug-fix.md`)
Each playbook should have:
1. `# Workflow: <name>` — title
2. `## Use when` — trigger conditions
3. `## Flow` — ASCII flow diagram
4. `## Required Agents` or `## Required Outputs` — who/what is needed
5. `## Gate Rules` or `## Quality Gate` — what must be true before completion
6. `## Handoff` — what to include when routing to next agent
7. `## Backward Routing` — when to route back (if applicable)

### Changes per file

#### `config-change.md` (8 → ~30 lines)
Add:
- `## Use when` — config flag, system parameter, business config, CI YAML change
- `## Gate Rules` — verify no code change required, verify rollback path exists
- `## Handoff` — changed config file, old value, new value, validation command

#### `data-change.md` (13 → ~35 lines)
Add:
- `## Use when` — DB migration, reference data, seed data change
- `## Gate Rules` — rollback query tested, validation query passes, data backup confirmed
- `## Handoff` — migration script, rollback script, validation query result

#### `new-feature.md` (15 → ~40 lines, after Fix B adds contract ref)
Add:
- `## Use when` — new user-facing capability, new API endpoint, new integration
- `## Gate Rules` — SDD approved, acceptance criteria testable, implementation plan has verification steps
- `## Handoff` — PR/commit/branch, changed files, test evidence, regression focus

#### `code-review-gate.md` (25 → ~40 lines)
Add:
- `## Gate Rules` — critical correctness, security-sensitive, tests run, AC match, rollback plan
- `## Handoff` — review findings, severity, blocking vs non-blocking, re-review scope

#### `tdd-implementation-flow.md` (28 → ~45 lines)
Add:
- `## Gate Rules` — failing test exists before implementation, smallest fix applied, tests pass after fix, no tests weakened
- `## Handoff` — PR/commit, test before/after count, changed files, validation evidence

### Test plan
| Step | Before fix | After fix |
|------|-----------|-----------|
| `grep -c "## Use When\|## Use when" docs/workflows/config-change.md` | 0 | 1 |
| `grep -c "## Gate\|## Quality Gate" docs/workflows/config-change.md` | 0 | 1 |
| `grep -c "## Handoff" docs/workflows/config-change.md` | 0 | 1 |
| (repeat for all 5 files) | 0 each | 1 each |
| `npm test` | 202 pass (after Fix B) | 203 pass (five-playbook structure regression added) |
| `npm run validate:contracts` | pass | pass |
| Manual: read each expanded playbook — all sections present and meaningful | required | required |

Add focused regression coverage for the five expanded playbooks to new file
`test/validate-workflow-playbooks.test.mjs` (same file as Fix B/Fix A's
regression tests — see "Test-File Placement" below). The test must
check the required headings only for these five files; it must not impose a new
repository-wide playbook schema.

### Test-File Placement (applies to Fix B, Fix A, and this fix)

All three fixes' regression tests go into one new file: **`test/validate-workflow-playbooks.test.mjs`** — not `test/validate-contracts.test.mjs`. Decided by BA Agent analysis (`docs/records/work-items/2026-07-25-issue-95-ba-requirement-analysis.md`, Part B):

- The repo already has 8 of 17 `test/` files dedicated to a single governance/documentation concern (e.g. `validate-context-budget`, `validate-skill-parity`) — a new file for playbook structure/links follows that dominant convention.
- `test/validate-contracts.test.mjs` is already 1,353 lines and already a grab-bag of unrelated documentation checks, not a pure contract-YAML file — adding a 4th unrelated concern compounds an existing size problem rather than fitting a clean theme.
- `package.json`'s `test` script is `node --test` with no file enumeration, so Node's test runner auto-discovers the new file with zero config changes.
- No companion `scripts/validate-*.mjs` script is required — `validate-contracts.test.mjs` already contains prose/content-assertion tests with no backing script, so this is consistent with existing precedent.

### Risk: Medium
- Content must be accurate — not copy-pasted from `bug-debug-fix.md` but adapted to each workflow's actual behavior
- `config-change.md` and `data-change.md` are simple workflows — don't over-expand them
- `new-feature.md` depends on Fix B being merged first (contract reference)
- No test enforces playbook structure — changes are review-based, not CI-enforced

### Effort: 1 commit per file × 5 = 5 commits (or 1 batch commit)

---

## Implementation Order

**Revised (was B → A → C): B → C → A.** `config-change.md`, `data-change.md`, `code-review-gate.md`, and `ci-failure-debug.md` have no natural Fix A link target until Fix C's Gate/Handoff content exists (see the per-playbook mapping in Fix A). Running Fix C before Fix A means those 4 files are edited once, not twice.

```
Fix B: new-feature.md contract reference + regression test
  ↓ (new-feature.md now has contract section for Fix C and Fix A to build on)
Fix C: expand 5 thin playbooks
  ↓ (Gate/Handoff content now exists as natural Fix A link targets for config-change.md, code-review-gate.md, etc.)
Fix A: wiki links in all 12 playbooks, using the explicit per-playbook mapping
  ↓ (last, since every playbook's final content — including Fix C's additions — now exists to link from)
```

### Total deliverables

| Fix | Files created | Files modified | Tests added | Effort |
|-----|--------------|---------------|-------------|--------|
| B | 1 (`test/validate-workflow-playbooks.test.mjs`) | 1 (`new-feature.md`) | 1 | 1 commit |
| C | 0 | 5 (thin playbooks) | 1 | 1–5 commits |
| A | 0 | 12 (all playbooks) | 1 | 1 commit |
| **Total** | 1 | 18 max | 3 | 3–7 commits |

### What is NOT included (deliberately)

- **Fix D (merge bug-fix.md + bug-debug-fix.md):** Risk high (touches 4 files + test), benefit low (duplication doesn't confuse agents — both reference same contract). Not recommended.
- **Repository-wide CI schema for playbooks:** Not included. A focused regression test for the five files in this Issue is included to prevent immediate regression without introducing a repository-wide schema.
- **Mermaid diagrams in playbooks:** `bug-debug-fix.md` uses ASCII art which is simpler and matches existing convention.

## References

- Problem evidence: `grep -F -l '[[' docs/workflows/*.md` → empty
- Contract existence: `ls docs/contracts/*.yaml` → bug-fix + new-feature
- Test that constrains Fix A: `test/validate-contracts.test.mjs:107` — `assert.match(bugFix, /docs\/contracts\/bug-fix-workflow\.yaml/)`
- Consumers: `PROJECT_INDEX.md` (12 links), `README.md` (4 links), `docs/vault/00-Index.md` (12 links), `AGENTS.md` (1 ref), `test/validate-contracts.test.mjs` (1 test)
- Structural template: `docs/workflows/bug-debug-fix.md` (75 lines, all sections)
- BA requirement analysis (relative-path bug, per-playbook mapping, test-file placement, order revision): `docs/records/work-items/2026-07-25-issue-95-ba-requirement-analysis.md`
