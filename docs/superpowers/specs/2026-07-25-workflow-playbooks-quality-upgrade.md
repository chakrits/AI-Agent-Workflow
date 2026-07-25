# Improvement Plan: Workflow Playbooks Quality Upgrade

**Date:** 2026-07-25
**Author:** Orchestrator Agent (Valentine)
**Status:** Draft — awaiting Boss review
**Scope:** Improve 12 playbook files in `docs/workflows/` — add contract references, bidirectional wiki links, and expand 5 thin playbooks.

## Problem Statement

12 playbook files in `docs/workflows/` have 3 gaps verified against real code:

1. **0 wiki links** — `grep -l "[[" docs/workflows/*.md` returns empty. Vault index links TO playbooks (1-way), but playbooks don't link BACK to contracts, skills, templates, or canonical docs. Obsidian graph shows 1-way arrows.
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

- Requirement gap discovered during implementation → BA
- Architecture/API contract gap → SA
- Verification failure → rework (max 1 rework before blocked)
```

### Regression test
Add to `test/validate-contracts.test.mjs`:

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
| `npm test` | 190 pass | 191 pass (new test) |
| `npm run validate:contracts` | pass | pass |

### Risk: Low
- Adds content only — no existing file modified
- New test is additive — doesn't change existing assertions
- `bug-fix.md` already has the same pattern — no new convention

### Effort: 1 commit

---

## Fix A: Add bidirectional wiki links to all 12 playbooks

### What
Convert plain-text path references in all 12 `docs/workflows/*.md` files to Obsidian wiki links `[[...|...]]` so the vault graph shows 2-way connections.

### Why
Vault index (`docs/vault/00-Index.md`) links TO playbooks, but playbooks don't link BACK. Obsidian graph shows 1-way arrows. Playbooks should link to:
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

### Change pattern
```diff
- Use `docs/contracts/bug-fix-workflow.yaml` as the canonical Bug Fix policy.
+ Use [[../../contracts/bug-fix-workflow.yaml|bug-fix-workflow.yaml]] as the canonical Bug Fix policy.

- `debugging-discipline` skill
+ [[../../.agents/skills/debugging-discipline/SKILL.md|debugging-discipline]] skill

- `REQUIREMENT_DISCOVERY.md`
+ [[../templates/REQUIREMENT_DISCOVERY.md|REQUIREMENT_DISCOVERY.md]]
```

### Critical constraint
**Do NOT remove the plain-text path** — `test/validate-contracts.test.mjs` line 107 asserts:
```javascript
assert.match(bugFix, /docs\/contracts\/bug-fix-workflow\.yaml/);
```
Wiki link `[[../../contracts/bug-fix-workflow.yaml|bug-fix-workflow.yaml]]` still contains `docs/contracts/bug-fix-workflow.yaml` inside `[[../../...]]` — but wait, wiki links use relative paths from the file, not `docs/` prefix. So `[[../../contracts/...]]` does NOT contain the string `docs/contracts/`.

**Mitigation:** Keep a plain-text path reference alongside the wiki link, OR update the test regex to match the wiki link path. Preferred: keep plain-text path in a comment or code block, use wiki link in prose.

Example safe pattern:
```markdown
Use [[../../contracts/bug-fix-workflow.yaml|bug-fix-workflow.yaml]] (`docs/contracts/bug-fix-workflow.yaml`) as the canonical Bug Fix policy.
```

### Test plan
| Step | Before fix | After fix |
|------|-----------|-----------|
| `grep -c "\[\[" docs/workflows/*.md` | 0 per file | ≥1 per file |
| `npm test` | 190 pass | 190 pass (test regex still matches plain-text path) |
| `npm run validate:contracts` | pass | pass |
| Obsidian graph view | 1-way arrows | 2-way arrows |
| `grep "docs/contracts/bug-fix-workflow.yaml" docs/workflows/bug-fix.md` | 1 match | 1 match (plain-text path preserved) |

### Risk: Low–Medium
- **Low:** Adding wiki links doesn't break parsers or tests
- **Medium:** If plain-text path is accidentally removed, test breaks — mitigation: keep plain-text path alongside wiki link
- 12 files touched but changes are mechanical (find-replace pattern)

### Effort: 1 commit (all 12 files in one commit — mechanical change)

---

## Fix C: Expand 5 thin playbooks

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
| `npm test` | 190 pass | 190 pass (no test checks playbook structure) |
| `npm run validate:contracts` | pass | pass |
| Manual: read each expanded playbook — all sections present and meaningful |

### Risk: Medium
- Content must be accurate — not copy-pasted from `bug-debug-fix.md` but adapted to each workflow's actual behavior
- `config-change.md` and `data-change.md` are simple workflows — don't over-expand them
- `new-feature.md` depends on Fix B being merged first (contract reference)
- No test enforces playbook structure — changes are review-based, not CI-enforced

### Effort: 1 commit per file × 5 = 5 commits (or 1 batch commit)

---

## Implementation Order

```
Fix B: new-feature.md contract reference + regression test
  ↓ (new-feature.md now has contract section for Fix C to build on)
Fix A: wiki links in all 12 playbooks
  ↓ (mechanical change, independent of content)
Fix C: expand 5 thin playbooks
  ↓ (content expansion, uses structure from Fix B)
```

### Total deliverables

| Fix | Files created | Files modified | Tests added | Effort |
|-----|--------------|---------------|-------------|--------|
| B | 0 | 2 (`new-feature.md` + `validate-contracts.test.mjs`) | 1 | 1 commit |
| A | 0 | 12 (all playbooks) | 0 | 1 commit |
| C | 0 | 5 (thin playbooks) | 0 | 1–5 commits |
| **Total** | 0 | 19 max | 1 | 3–7 commits |

### What is NOT included (deliberately)

- **Fix D (merge bug-fix.md + bug-debug-fix.md):** Risk high (touches 4 files + test), benefit low (duplication doesn't confuse agents — both reference same contract). Not recommended.
- **New CI check for playbook structure:** Would require defining a schema for playbooks. Too early — let content stabilize first.
- **Mermaid diagrams in playbooks:** `bug-debug-fix.md` uses ASCII art which is simpler and matches existing convention.

## References

- Problem evidence: `grep -l "[[" docs/workflows/*.md` → empty
- Contract existence: `ls docs/contracts/*.yaml` → bug-fix + new-feature
- Test that constrains Fix A: `test/validate-contracts.test.mjs:107` — `assert.match(bugFix, /docs\/contracts\/bug-fix-workflow\.yaml/)`
- Consumers: `PROJECT_INDEX.md` (12 links), `README.md` (4 links), `docs/vault/00-Index.md` (12 links), `AGENTS.md` (1 ref), `test/validate-contracts.test.mjs` (1 test)
- Structural template: `docs/workflows/bug-debug-fix.md` (75 lines, all sections)
