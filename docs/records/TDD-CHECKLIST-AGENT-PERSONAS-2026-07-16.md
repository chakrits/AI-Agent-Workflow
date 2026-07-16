# TDD Checklist — Canonical Agent Personas

## 1. Target Behavior

| Item | Detail |
|---|---|
| Requirement / Bug Ref | GitHub Issue #16 |
| Expected Behavior | Every role discovers one canonical persona that improves collaboration without changing operating authority. |
| Current Behavior | No canonical persona source or portable/adapter discovery path exists. |
| Test Seam | Contract regression (`test/validate-contracts.test.mjs`) |

## 2. RED — Failing Test

| Item | Detail |
|---|---|
| Test Name / Path | `canonical agent personas cover every role without becoming operating policy`; `Claude, portable, and Antigravity adapters discover canonical agent personas` |
| Failure Before Fix | `npm test` failed: `ENOENT` for `docs/operating-model/AGENT_PERSONAS.md`, then missing adapter references. |
| Why It Fails for the Right Reason | The missing artefacts are exactly the required canonical source and discovery contracts. |

## 3. GREEN — Minimal Fix

| Item | Detail |
|---|---|
| Changed Files | Canonical persona document, 11 Claude agent adapters, portable/Antigravity dynamic-workflow adapters, contract tests. |
| Fix Summary | Added one distilled canonical persona per role and short non-override references from every adapter. |
| Why This Addresses the Behavior | All platforms reach the same source; persona guidance remains explicitly subordinate to policy and human gates. |

## 4. REFACTOR — Cleanup

| Item | Detail |
|---|---|
| Refactor Performed? | No |
| Reason | A new canonical source and minimal references are simpler than restructuring existing role policy. |
| Behavior Preserved By | Existing regression suite plus new parity tests. |

## 5. Verification

```bash
npm test
npm run validate:contracts
npm run validate:project-state
git diff --check
```

| Test / Check | Result | Notes |
|---|---|---|
| RED `npm test` | Fail as expected | 2 new tests failed before implementation. |
| GREEN `npm test` | Pass | 47 tests passed. |
| Contract validation | Pass | `Contract validation passed.` |
| Project-state validation | Pass | `Project state validation passed.` |
| Whitespace check | Pass | `git diff --check` exited 0. |

## 6. Known Gaps

- Hosted CI, human review, and real platform behaviour are not claimed by this local TDD evidence.

## 7. Handoff

| To | Reason | Evidence |
|---|---|---|
| security-reviewer | Validate trust/authority and persona-boundary language | Canonical document, adapter diff, local checks |
| qa-agent | Verify all Issue #16 acceptance criteria after security review | TDD record, full command output, PR diff |
