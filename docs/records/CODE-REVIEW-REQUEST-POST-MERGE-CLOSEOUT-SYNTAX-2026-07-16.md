# Code Review Request: Post-Merge Closeout Syntax Fix

| Item | Detail |
|---|---|
| Work Item | GitHub Issue #12 |
| Change Type | Bug Fix |
| Branch | `codex/issue-12-post-merge-syntax` |
| Risk | Low–Medium; GitHub workflow automation only |

## Intent

Restore the successful-audit closeout handoff without changing failed-audit `documentation-sync` behavior.

## Changed Components

| Component | Review Focus |
|---|---|
| `.github/workflows/documentation-sync.yml` | Parse-safe comment construction; marker/source-PR interpolation; no change to idempotency or exception routing. |
| `test/validate-project-state.test.mjs` | Compiles the actual embedded GitHub Script and asserts completion instruction remains. |
| `docs/records/*POST-MERGE-CLOSEOUT-SYNTAX*` | Accurate RCA, TDD evidence, and QA/human follow-up. |

## Verification

- Focused regression: 6 passing after a documented RED failure.
- Full `npm test`: 45 passing.
- Contract and project-state validators, YAML parse, and diff check: passed.

## Reviewer / QA Focus

1. Confirm the comment body contains the exact `<!-- post-merge-closeout: complete; source-pr-N -->` instruction.
2. Confirm a successful main push can create one label/comment handoff, while failed validation remains the only path that creates `documentation-sync`.
3. After merge, verify hosted Actions and record evidence in Issue #12 before compensating PR #11's closeout.

## Limitations

The live GitHub API behavior requires post-merge hosted verification; local tests deliberately compile rather than call external APIs.
