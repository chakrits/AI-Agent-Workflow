# Code Review Findings

Scope: adds 4 new Developer Agent skills (`coding-standards`, `backend-patterns`, `frontend-react-patterns`, `frontend-visual-design`), enriches `security-review` with an exposed-secret incident-response procedure, adds a Developer Agent Skill Routing table (mirrors the SA/QA/Security pattern), updates `SKILL_CATALOG.md`/`docs/vault/00-Index.md`, and adds retroactive + new `THIRD_PARTY_NOTICES.md` entries for 3 external sources (LambdaTest, ECC, Anthropic).

| Finding ID | Severity | File / Area | Finding | Recommendation | Blocks Progress? | Evidence |
|---|---|---|---|---|---|---|
| CR-101 | Major | `THIRD_PARTY_NOTICES.md` | The prior Issue #139 batch (7 API skills, MIT-licensed `LambdaTest/agent-skills` source) shipped without a `THIRD_PARTY_NOTICES.md` entry — an attribution gap, not caught until this round's license check for the new ECC/Anthropic sources prompted checking the earlier one too | Added the missing LambdaTest entry retroactively, plus new entries for `affaan-m/ECC` (MIT) and `anthropics/skills` `frontend-design` (Apache 2.0) | No (fixed before merge) | `THIRD_PARTY_NOTICES.md` now has 4 entries; regression test asserts all 3 source repos are named |
| CR-102 | Major | Source repo `affaan-m/ECC` | The source's own two mirrored copies of `backend-patterns` have drifted and contradict each other: `skills/backend-patterns/SKILL.md` states rate limiting must use a shared store (Redis/gateway), never a per-process in-memory counter; `.agents/skills/backend-patterns/SKILL.md` instead ships a "Simple In-Memory Rate Limiter" code example that violates its own sibling's stated rule | Used the `skills/` (correct, non-contradictory) version as the adaptation source; our own `backend-patterns` explicitly states the shared-store constraint and cross-references `performance-testing` rather than embedding a contradictory example | No — not carried over | Regression test asserts `never a per-process in-memory counter` is present |
| CR-103 | Question | `rules/common/testing.md` (ECC) | Source mandates a hardcoded "Minimum Test Coverage: 80%" — this directly conflicts with this repo's own prior, deliberate design decision in `mutation-testing`: "There is no fixed pass/fail threshold mandated by this skill" | Skipped `testing.md` and `code-review.md` entirely (redundant with `tdd-implementation`/`test-quality-discipline`/`code-review-gate`); took one genuinely new nugget from `security.md` instead (secret-rotation + codebase sweep) that doesn't conflict with any existing decision | No | `security-review`'s new Exposed-Secret Incident Response section, regression-tested |
| CR-104 | Minor | `docs/operating-model/CONTEXT_BUDGET.md`-tracked files | `role-definitions.md` (a canonical/budgeted file) gained a new Developer Agent Skill Routing table on top of this session's earlier SA Agent table addition | Verified `validate:context-budget` still passes (28507/30000) before merge; flagged in the plan as a budget headroom risk for future skill batches, not a blocker now | No | `npm run validate:context-budget` output |

## Review Decision

Approved with comments (CR-101 and CR-102 fixed inline before merge; CR-103 resolved by scope decision, not a code fix; CR-104 is informational — budget still has headroom but is shrinking)

## Required Follow-up

| Item | Owner | Tracking | Evidence |
|---|---|---|---|
| Context budget headroom (28507/30000, ~5% remaining) should be watched before the next skill/rule addition to `role-definitions.md` or `AGENTS.md` | Documentation Agent | No Issue yet — note in this record and the implementation plan | `npm run validate:context-budget` |
