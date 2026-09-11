# Code Review Request — Canonical Agent Personas

## 1. Change Summary

| Item | Detail |
|---|---|
| Work Item | GitHub Issue #16 — Add personality for agents |
| Change Type | New feature — agent-instruction behaviour and contract regression |
| PR / Branch | `codex/issue-16-agent-personas` |
| Owner | Developer Agent |

## 2. Intent

Add one project-specific canonical persona for every role and make it discoverable from Claude, portable, and Antigravity adapters without redefining operating policy or human authority.

## 3. Changed Files / Components

| File / Component | Change Summary | Risk |
|---|---|---|
| `docs/operating-model/AGENT_PERSONAS.md` | New canonical 11-role persona source and shared authority boundary | Medium |
| `.claude/agents/*.md` | Short role-matched canonical references | Low |
| Dynamic-workflow adapters | Portable/Antigravity persona discovery | Low |
| `test/validate-contracts.test.mjs` | Canonical role/boundary and adapter-discovery regression coverage | Medium |
| Project records | Requirements, plan, TDD evidence, index, status, history, changelog | Low |

## 4. Review Focus

| Area | Why It Matters |
|---|---|
| Correctness | All 11 roles must be covered and linked to the shared canonical source. |
| Authority boundary | Persona must not change policy, evidence ownership, or human gates. |
| Cross-platform parity | Claude, portable, and Antigravity discovery must carry the same non-override rule. |
| Tests | New tests must fail without the source/references and pass with them. |
| Maintainability | Persona content should remain concise, role-specific, and free of duplicated policy. |

## 5. Verification Performed

| Check | Result | Notes |
|---|---|---|
| RED regression | Pass | Two new tests failed for the intended missing artefacts before implementation. |
| Full regression | Pass | `npm test` passed 47 tests locally. |
| Contract validation | Pass | `npm run validate:contracts` reported the canonical Bug Fix contract unaffected. |
| Project-state validation | Pass | `npm run validate:project-state` passed with the active Issue #16 state. |
| Whitespace | Pass | `git diff --check` passed. |
| Security review | Pass | Focused trust/authority review found no blocker. |

## 6. Known Risks / Limitations

- Hosted CI and human review remain pending.
- No runtime or application UI behaviour was exercised because none changed.

## 7. Reviewer Questions

- Does any persona wording accidentally duplicate operational policy rather than describe collaboration behaviour?
- Is the clear boundary against invented identity/personhood retained across future edits?
