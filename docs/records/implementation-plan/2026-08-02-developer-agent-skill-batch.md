# Implementation Plan

## 1. Plan Summary

| Item | Detail |
|---|---|
| Work Item | https://github.com/chakrits/AI-Agent-Workflow/issues/140 |
| Change Type | Framework / Meta Change (skill/catalog authoring, no target-app code) |
| Risk Level | Low — documentation/instruction content only |
| Owner | Documentation Agent (authoring) |
| Target Branch | `feature/api-skill-catalog-expansion` (continued) |

## 2. Background

Continuing this session's pattern (bring an external skill repo, screen with Boss, adapt without copying wholesale), this batch targets Developer Agent specifically, which had no dedicated skills beyond generic cross-role ones (`tdd-implementation`, `implementation-planning`, `git-workflow-and-versioning`). Three sources were explored:

1. [`affaan-m/ECC`](https://github.com/affaan-m/ECC) — `skills/coding-standards`, `skills/backend-patterns`, `skills/frontend-patterns`, and `rules/common/{coding-style,code-review,security,testing}.md`
2. [`anthropics/skills`](https://github.com/anthropics/skills/tree/main/skills/frontend-design) — aesthetic-direction skill

Boss's explicit instruction this round: prepare for a future target app on **TypeScript/React/Next.js/Supabase/Redis**, alongside this repo's existing Django/Python/PostgreSQL default — so `coding-standards` and `backend-patterns` are written dual-stack rather than stripped to pseudocode only.

### Findings during extraction

- **ECC's own two mirrored copies have drifted and contradict each other.** `skills/backend-patterns/SKILL.md` states rate limiting must use a shared store (Redis/gateway), never a per-process in-memory counter. `.agents/skills/backend-patterns/SKILL.md` — meant to be the same content — instead ships a "Simple In-Memory Rate Limiter" code example that violates its own sibling's stated rule. Used the `skills/` (correct) version; did not carry the contradiction forward.
- **`rules/common/testing.md` conflicts with a decision already made in this repo.** It mandates a hardcoded "Minimum Test Coverage: 80%". `mutation-testing`'s canonical text already states, deliberately: "There is no fixed pass/fail threshold mandated by this skill." Adopting `testing.md` wholesale would silently reverse that decision.
- **Retroactive gap found**: the Issue #139 batch (LambdaTest source, MIT) shipped without a `THIRD_PARTY_NOTICES.md` entry. Fixed in this batch alongside the 2 new attributions.
- **License check**: `anthropics/skills` is Apache License 2.0 (permissive, attribution required) — not blocking. `affaan-m/ECC` is MIT.

## 3. Screening Decisions (Boss-confirmed, this session)

| Source | Decision | Rationale |
|---|---|---|
| `coding-standards` | New skill, dual-stack (Python + TypeScript/React) | No existing skill covers general naming/immutability/error-handling/code-smell review |
| `backend-patterns` | New skill, dual-stack (Django/DRF + Node/Next.js+Supabase+Redis), used the non-contradictory `skills/` source copy | Fills a real Developer Agent gap: repository/service layering, N+1 prevention, caching, background jobs, structured logging |
| `frontend-patterns` | New skill `frontend-react-patterns`, distinct from `frontend-ui-engineering` | Different kind of content: `frontend-ui-engineering` is a delivery workflow (accessibility, responsive, design-system compliance); ECC's is a component-architecture reference (composition, hooks, state scope, memoization) — same split rationale as `api-test-design` vs `api-testing-tooling` from Issue #139 |
| `rules/common/code-review.md` | Skipped | Redundant with `code-review-gate` (severity scale, checklist, agent routing already covered, different label set but same concept) |
| `rules/common/security.md` | Took one nugget only: exposed-secret incident response | Rotate + codebase-sweep procedure was a genuine gap in `security-review`; the rest (secret checklist, SQLi/XSS/CSRF) already exists there |
| `rules/common/testing.md` | Skipped entirely | Conflicts with `mutation-testing`'s deliberate no-fixed-threshold decision; AAA pattern/TDD workflow already covered by `tdd-implementation`/`js-unit-testing`/`python-unit-testing` |
| `anthropics/skills/frontend-design` | New skill `frontend-visual-design` | Genuinely new territory — aesthetic/typography/motion/copywriting direction that neither `frontend-ui-engineering` nor the new `frontend-react-patterns` covers |

## 4. Task Breakdown

| Task ID | Task | Files | Verification |
|---|---|---|---|
| IMP-201 | Retroactive + new `THIRD_PARTY_NOTICES.md` entries (LambdaTest, ECC, Anthropic) | `THIRD_PARTY_NOTICES.md` | Regression test: all 3 source repos named |
| IMP-202 | Draft `coding-standards` (dual Python/TypeScript) | `.agents/skills/coding-standards/SKILL.md` | Content-assertion test |
| IMP-203 | Draft `backend-patterns` (dual Django/Node+Supabase+Redis, no contradictory in-memory example) | `.agents/skills/backend-patterns/SKILL.md` | Content-assertion test asserting the correct shared-store statement |
| IMP-204 | Draft `frontend-react-patterns` | `.agents/skills/frontend-react-patterns/SKILL.md` | Content-assertion test |
| IMP-205 | Draft `frontend-visual-design` (Apache 2.0 attributed, restated not copied) | `.agents/skills/frontend-visual-design/SKILL.md` | Content-assertion test; no verbatim upstream text |
| IMP-206 | Enrich `security-review` with Exposed-Secret Incident Response | `.agents/skills/security-review/SKILL.md` | Content-assertion test |
| IMP-207 | Mirror all 5 changed/new skill files byte-identical across `.claude/skills/`, `.agent/skills/` | 3 platform dirs | `npm run validate:skill-parity` → 36/36 |
| IMP-208 | Add Developer Agent `### Skill Routing` table (`role-definitions.md` + `.claude/agents/developer-agent.md`) | 2 files | Content-assertion test |
| IMP-209 | Update `SKILL_CATALOG.md` (4 new entries) | `docs/operating-model/SKILL_CATALOG.md` | Content-assertion test |
| IMP-210 | Update `docs/vault/00-Index.md` (32 → 36) | `docs/vault/00-Index.md` | Content-assertion test |
| IMP-211 | Regression tests for all of the above | `test/validate-contracts.test.mjs` | New tests fail before, pass after; `npm test` green |

## 5. Test Strategy

| Check | Result |
|---|---|
| `npm test` | 373 → 379 (6 new tests: 4-skill content assertions, security-review enrichment, 3-source attribution, byte-parity, role/adapter routing, catalog entries — plus 2 corrected count assertions from 32→36) |
| `npm run validate:skill-parity` | 36/36 skills in sync |
| `npm run validate:contracts` | Passed |
| `npm run validate:context-budget` | 28507/30000 — within budget, headroom shrinking (see Risks) |

## 6. Verification Commands

```bash
npm test
npm run validate:skill-parity
npm run validate:contracts
npm run validate:context-budget
```

## 7. Risks / Limitations

| Risk | Mitigation |
|---|---|
| Context budget headroom now ~5% (28507/30000) after 2 skill batches added Skill Routing tables to `role-definitions.md` in one session | Not a blocker now; flagged in the code review record and here for whoever does the next canonical-file addition |
| Dual-stack skills (`coding-standards`, `backend-patterns`) describe a TypeScript/React/Next.js/Supabase/Redis target app that doesn't exist in this meta-repo yet | Consistent with every other not-yet-wired skill in this catalog (e.g. `api-contract-testing` before any Django target existed); wiring deferred to when the real app needs it |
| `frontend-react-patterns` vs `frontend-ui-engineering` boundary could be mis-routed by a future agent | Both skills' `Do Not Use When` sections cross-reference each other explicitly |

## 8. Handoff

| To | Reason |
|---|---|
| Human Maintainer | Review and merge `feature/api-skill-catalog-expansion` (now covers both Issue #139 and #140) |
| Any agent using this catalog going forward | 4 new Developer Agent skills + 1 enrichment now available |
