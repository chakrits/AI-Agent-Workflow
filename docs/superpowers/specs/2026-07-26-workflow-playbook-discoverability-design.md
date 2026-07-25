# Workflow Playbook Discoverability Design

## Goal

Fix the 7 of 12 `docs/workflows/*.md` playbooks that have zero inbound references from any process a human or agent would actually reach during normal work (README.md, AGENTS.md, `docs/workflow/dynamic-routing.md`, or a skill file) — reachable today only by browsing `PROJECT_INDEX.md` or `docs/vault/00-Index.md` directly. Add a permanent CI gate so this cannot silently regress again.

This does not change `docs/vault/00-Index.md` or `PROJECT_INDEX.md`'s respective roles — both stay as-is (vault as the human-facing Obsidian navigation layer, `PROJECT_INDEX.md` as the CI-enforced Documentation Agent checklist target). This spec is about wiring the playbooks themselves into the processes that select a workflow, not about the index files.

## Scope

### In scope

- Wire `stabilize-core.md` in as a real Change Type ("Framework / Meta Change") in the three places every other Change Type already lives: `docs/workflow/dynamic-routing.md`'s Change Types table, `AGENTS.md`'s Dynamic Routing Rules section, and README.md's "Choose a Workflow" table.
- Link `feature-discovery-to-plan.md` from `new-feature.md`'s "Use when" section (as the pre-discovery entry point for a still-vague request) and add it to README's routing table.
- Add a one-line backlink from `bug-fix.md` to `bug-debug-fix.md` (the fuller debugging methodology), without deciding whether to merge them.
- Add a one-line "See also" backlink in 4 skill `SKILL.md` files back to their playbook counterpart, mirrored across `.agents/skills/`, `.claude/skills/`, `.agent/skills/`:
  - `code-review-gate` skill → `docs/workflows/code-review-gate.md`
  - `functional-test-design` skill → `docs/workflows/functional-test-design.md`
  - `tdd-implementation` skill → `docs/workflows/tdd-implementation-flow.md`
  - `engineering-postmortem` skill → `docs/workflows/validated-bug-postmortem.md`
- Add a regression test to `test/validate-workflow-playbooks.test.mjs` asserting every file in `docs/workflows/` has at least one inbound reference from README.md, AGENTS.md, `docs/workflow/dynamic-routing.md`, or a skill `SKILL.md` — turning this session's manual grep audit into a permanent CI gate.

### Out of scope

- Deciding whether to merge `bug-fix.md` and `bug-debug-fix.md` into one file. This spec resolves `bug-debug-fix.md`'s orphan status with a non-destructive backlink instead; the merge-or-keep-separate question is a bigger architectural call that reverses an explicit "not recommended" decision from Issue #95's spec, and needs a separate Boss decision before any file is deleted or restructured.
- Any change to `docs/vault/00-Index.md` or `PROJECT_INDEX.md` — both keep their current roles per the prior conversation (vault = human-facing Obsidian layer, `PROJECT_INDEX.md` = CI-enforced, kept as-is).
- Any change to skill *content* beyond the one-line backlink — this spec does not touch the operational instructions inside `code-review-gate`, `functional-test-design`, `tdd-implementation`, or `engineering-postmortem`.
- Building real agent-facing retrieval (embeddings/RAG). Raised and explicitly deferred in the prior conversation — Obsidian wiki-links are a human-navigation feature only, not agent retrieval, and building real vector search is a separate, much larger project.

## Current State (verified)

Audited every one of the 12 `docs/workflows/*.md` files against README.md, AGENTS.md, `docs/workflow/dynamic-routing.md`, `test/*.mjs`, `scripts/*.mjs`, `.github/workflows/*.yml`, and every `.agents/skills/*/SKILL.md`:

- 2 files have a real state-machine contract + CI enforcement: `new-feature.md` (`docs/contracts/new-feature-workflow.yaml`), `bug-fix.md` (`docs/contracts/bug-fix-workflow.yaml`).
- 3 more files are named in README.md's "Choose a Workflow" table but have no contract: `ci-failure-debug.md`, `config-change.md`, `data-change.md`.
- 7 files have **zero** inbound references from README.md, AGENTS.md, `docs/workflow/dynamic-routing.md`, any script, any CI workflow, or any skill: `bug-debug-fix.md`, `code-review-gate.md`, `feature-discovery-to-plan.md`, `functional-test-design.md`, `stabilize-core.md`, `tdd-implementation-flow.md`, `validated-bug-postmortem.md`. `PROJECT_INDEX.md` and `docs/vault/00-Index.md` list all 12 as navigation entries, but neither is a routing decision point an agent or human passes through while selecting a workflow.
- 4 of the 7 orphans (`code-review-gate.md`, `functional-test-design.md`, `tdd-implementation-flow.md`, `validated-bug-postmortem.md`) closely parallel an existing, actually-used skill of a near-identical name (`code-review-gate`, `functional-test-design`, `tdd-implementation`, `engineering-postmortem`) — the skill is what `AGENTS.md`'s Routing Summary and Engineering Execution Rules actually route to; the playbook appears to predate the skill system and was never connected to it.
- `bug-debug-fix.md` (75 lines: debugging-discipline + engineering-postmortem + full handoff structure) is a strictly fuller version of the same territory `bug-fix.md` (20 lines, the one README/AGENTS.md/the contract-test actually reference) covers.
- `feature-discovery-to-plan.md` covers exactly the PM/BA discovery-to-plan handoff that happens *before* `new-feature.md`'s flow starts, but nothing links the two.
- `stabilize-core.md`'s own "Trigger" section ("Adding or revising operating model rules... Updating `AGENTS.md`... Clarifying role boundaries or routing behavior") is a precise description of the work this session did for Issue #95, #76, and #83 — yet no Change Type in `docs/workflow/dynamic-routing.md` or `AGENTS.md` routes to it.

## Design

### Fix 1: Wire `stabilize-core.md` as a new Change Type

**`docs/workflow/dynamic-routing.md`** — add a row to the Change Types table, immediately before the Security-sensitive Change row:

```diff
 | Documentation-only Change | Documentation -> Reviewer | PM, BA, SA, Dev, QA |
+| Framework / Meta Change | Orchestrator -> Documentation -> Reviewer/QA -> Human Approval | PM, BA, SA, Dev (unless the change itself alters their routing rules) |
 | Security-sensitive Change | Relevant Agent -> Security -> QA -> Human Approval | Never skip Security |
```

**`AGENTS.md`** — add a matching subsection in the "## Dynamic Routing Rules" section, immediately before "### Security-sensitive Change":

```markdown
### Framework / Meta Change

Recommended flow:

```text
Orchestrator -> Documentation Agent -> Reviewer / QA Agent -> Human Approval
```

Use when the request adds or revises operating-model rules, updates `AGENTS.md`, adds a skill catalog entry, defines a quality gate or evaluation checklist, clarifies role boundaries or routing behavior, or improves cross-platform agent structure — see `docs/workflows/stabilize-core.md` for the full flow and quality gate.

For security-sensitive process changes, route through Security Reviewer before Human Approval instead.
```

**`README.md`** — add a row to the "Choose a Workflow" table, after Documentation-only change:

```diff
 | Documentation-only change | Documentation → Reviewer | [post-merge review template](./docs/templates/POST_MERGE_DOCUMENTATION_REVIEW.md) |
+| Framework / meta change (routing rules, skill boundaries, operating model) | Orchestrator → Documentation → Reviewer/QA → Human Approval | [stabilize-core.md](./docs/workflows/stabilize-core.md) |
```

### Fix 2: Link `feature-discovery-to-plan.md`

**`docs/workflows/new-feature.md`** — add one line to the existing "## Use when" section:

```diff
 ## Use when

 - A new user-facing capability is being added.
 - A new API endpoint or integration is being introduced.
 - The change adds behavior the system does not have today, rather than fixing
   or adjusting existing behavior.
+- If the request is still a vague idea without user stories or acceptance
+  criteria yet, start at [[feature-discovery-to-plan.md]] first.
```

**`README.md`** — add a row to the "Choose a Workflow" table, before the New feature row:

```diff
 | Work type | Default route | Start here |
 |---|---|---|
+| Vague idea / early-stage feature request | requirement-brainstorming → BA → SA → implementation-planning | [feature-discovery-to-plan.md](./docs/workflows/feature-discovery-to-plan.md) |
 | New feature | PM/BA → SA → Developer → QA → Release | [new-feature.md](./docs/workflows/new-feature.md) |
```

### Fix 3: Backlink `bug-debug-fix.md` from `bug-fix.md`

**`docs/workflows/bug-fix.md`** — add a section after "## Backward Routing":

```diff
 ## Backward Routing

 - Expected behavior unclear -> BA
 - Contract/design issue -> SA
 - Auth/security issue -> Security Reviewer
+
+## Full Debugging Methodology
+
+For the complete failure-intake-to-postmortem flow (debugging-discipline skill,
+required-agents-per-step table, and full handoff structure), see
+[[bug-debug-fix.md]].
```

### Fix 4: Backlink 4 skills to their playbook counterpart (mirrored across 3 platforms)

Each of these 4 skills gets one line added right after its "## When to use" / "## Trigger" section, in all three mirrors (`.agents/skills/`, `.claude/skills/`, `.agent/skills/` — 12 file edits total):

```markdown
See also: `docs/workflows/<file>.md` for this skill's place in the end-to-end workflow (who hands off to whom, and what happens before/after).
```

| Skill | Playbook file |
|---|---|
| `code-review-gate` | `docs/workflows/code-review-gate.md` |
| `functional-test-design` | `docs/workflows/functional-test-design.md` |
| `tdd-implementation` | `docs/workflows/tdd-implementation-flow.md` |
| `engineering-postmortem` | `docs/workflows/validated-bug-postmortem.md` |

### Fix 5: Regression test — orphan-playbook CI gate

Add to `test/validate-workflow-playbooks.test.mjs`:

```javascript
test('every playbook in docs/workflows/ has at least one inbound reference from a routing surface', async () => {
  const playbooks = await listPlaybooks();
  const consumerFiles = [
    'README.md',
    'AGENTS.md',
    'docs/workflow/dynamic-routing.md'
  ];
  const skillDirs = ['.agents/skills'];
  const skillFiles = [];
  for (const dir of skillDirs) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        skillFiles.push(path.join(dir, entry.name, 'SKILL.md'));
      }
    }
  }

  const consumerContents = await Promise.all(
    [...consumerFiles, ...skillFiles].map(async (file) => {
      try {
        return await readFile(file, 'utf8');
      } catch {
        return '';
      }
    })
  );
  const haystack = consumerContents.join('\n');

  for (const playbook of playbooks) {
    const basename = path.basename(playbook);
    assert.ok(
      haystack.includes(basename),
      `${playbook} has no inbound reference from README.md, AGENTS.md, dynamic-routing.md, or any skill SKILL.md`
    );
  }
});
```

This only checks `.agents/skills/` (the canonical copy) rather than all three platform mirrors — skill-parity is already independently enforced by `scripts/validate-skill-parity.mjs`, so checking one copy is sufficient here and avoids a redundant triple-check.

### Test plan

| Step | Before fix | After fix |
|------|-----------|-----------|
| `grep -rln "stabilize-core.md" README.md AGENTS.md docs/workflow/dynamic-routing.md` | empty | 3 matches |
| `grep -rln "feature-discovery-to-plan.md" README.md docs/workflows/new-feature.md` | empty | 2 matches |
| `grep -rln "bug-debug-fix.md" docs/workflows/bug-fix.md` | empty | 1 match |
| `grep -rln "code-review-gate.md\|functional-test-design.md\|tdd-implementation-flow.md\|validated-bug-postmortem.md" .agents/skills/*/SKILL.md` | empty | 4 matches (one per skill) |
| `npm test` | 206 pass | 207 pass (new orphan-detection test) |
| `npm run validate:contracts` | pass | pass |
| `npm run validate:skill-parity` | pass | pass (12 mirrored edits stay in sync) |

## Acceptance Criteria

- [ ] `docs/workflow/dynamic-routing.md`'s Change Types table has a "Framework / Meta Change" row pointing to the `stabilize-core.md` flow.
- [ ] `AGENTS.md`'s Dynamic Routing Rules section has a matching "### Framework / Meta Change" subsection.
- [ ] README.md's "Choose a Workflow" table has rows for both "Framework / meta change" and "Vague idea / early-stage feature request".
- [ ] `new-feature.md`'s "Use when" section links to `feature-discovery-to-plan.md` for still-vague requests.
- [ ] `bug-fix.md` links to `bug-debug-fix.md` for the full debugging methodology.
- [ ] All 4 target skills (`code-review-gate`, `functional-test-design`, `tdd-implementation`, `engineering-postmortem`) have a "See also" backlink to their playbook counterpart, mirrored byte-identically across `.agents/skills/`, `.claude/skills/`, `.agent/skills/`.
- [ ] All 12 `docs/workflows/*.md` files pass the new orphan-detection regression test.
- [ ] `npm test`, `npm run validate:contracts`, and `npm run validate:skill-parity` all pass.
- [ ] No change to `docs/vault/00-Index.md`, `PROJECT_INDEX.md`, or any skill's operational content beyond the one-line backlink.

## Risks and Constraints

- **Risk**: the new orphan-detection test does a simple filename substring match against every consumer file's raw text — it cannot tell a real routing reference from an incidental mention (e.g., this spec document itself, once merged, would contain every filename). Mitigation: the test only scans README.md, AGENTS.md, `docs/workflow/dynamic-routing.md`, and skill `SKILL.md` files — none of which mention playbook filenames incidentally today — not the whole repository, keeping false-positive risk low.
- **Risk**: mirroring the 4 skill backlinks across 3 platforms (12 edits) is mechanical but easy to miss one copy. Mitigation: `scripts/validate-skill-parity.mjs` already fails CI on any drift between the three platform copies, so a missed mirror is caught automatically, not just by review.
- **Constraint**: this spec deliberately does not resolve `bug-fix.md` vs `bug-debug-fix.md`'s long-term relationship (merge vs. keep separate) — flagged as a follow-up decision for Boss, not blocking this spec's scope.
