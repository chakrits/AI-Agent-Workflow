# Code Review Findings: IMP-002 Frontmatter-First PR Safety Gate

Scope: Implementation of IMP-002 (Frontmatter-First PR Safety Gate, Pillar 4) for [Issue #272](https://github.com/chakrits/AI-Agent-Workflow/issues/272), delivering `docs/contracts/schemas/pr-frontmatter.schema.json`, dual-compatibility AST frontmatter parser and closeout allowlist expansion in `scripts/work-item-readiness.mjs`, unit tests in `test/work-item-readiness.test.mjs` (covering TC-011..TC-019, TC-033), and QA code review record.

| Finding ID | Severity | File / Area | Finding | Recommendation | Blocks Progress? | Evidence |
|---|---|---|---|---|---|---|
| CR-IMP002-001 | None | `docs/contracts/schemas/pr-frontmatter.schema.json` | JSON Schema Draft 2020-12 conforming to SDD §479..§524. `additionalProperties: false`, required fields (`schema_version`, `work_item`, `governing_workflow`, `closing_action`), conditional rule enforcing `advances_issue` when `closing_action == "advances-only"`. Non-colliding schema name avoids mapping collision with `*-workflow.yaml`. | Maintain pinned filename and schema validation. | No | `npm run validate:contracts` passes; TC-013, TC-017, TC-018 pass. |
| CR-IMP002-002 | None | `scripts/work-item-readiness.mjs` | Implemented `extractFrontmatter()` using safe AST parser (`yaml` package) and Ajv compilation of `pr-frontmatter.schema.json`. Deterministically validates delimiters `---` on line 1 and closing line. | Fail closed with clear diagnostics if delimiters or YAML syntax are malformed. | No | TC-011, TC-016 pass. |
| CR-IMP002-003 | None | `scripts/work-item-readiness.mjs` | Dual-mode execution implemented in `validateReadiness()`. Mode A evaluates frontmatter metadata and ignores prose/code fences below frontmatter, eliminating regex collisions. Mode B emits non-fatal advisory and evaluates legacy regex rules, maintaining 100% backward compatibility. | Ensure Mode B fallback preserves legacy behavior for all 70+ existing test cases. | No | TC-012, TC-014, TC-015, TC-019 pass; full test suite passes. |
| CR-IMP002-004 | None | `scripts/work-item-readiness.mjs` | Expanded closeout allowlist to include `/^docs\/records\/work-items\/archive\/[^/]+\/task-state\.json$/` (Constraint 1, AC-009). | Authorizes post-merge closeout PRs that archive terminal shards. | No | TC-033 passes. |

## Verification Evidence

- `npm test`: 746/746 passed (baseline: 737 passed, +9 new tests for TC-011..TC-018, TC-033).
- `node --test test/work-item-readiness.test.mjs`: 38/38 tests PASS.
- `node --test test/validate-pr-readiness.test.mjs`: 121/121 tests PASS.
- Mode A fail-closed behavior verified: malformed YAML and schema violations fail closed with exit code 1 and structured diagnostics.
- Mode B advisory emission verified: PR body without frontmatter emits `[ADVISORY] PR body lacks YAML frontmatter; falling back to legacy regex parser.` and executes legacy regex logic.
- Closeout PR allowlist verified: PR changing `docs/records/work-items/archive/issue-249/task-state.json` passes without `closeout files are not authorized`.
- `npm run validate:contracts`: PASS.
- `npm run validate:ci-parity`: PASS.
- `npm run validate:project-state`: PASS.
- `npm run validate:context-budget`: PASS.
- `npm run validate:review-gate`: PASS.
- `git diff --check`: PASS.

## Review Decision

Approved for IMP-002 merge into feature branch. Ready for handoff to QA for independent verification.
